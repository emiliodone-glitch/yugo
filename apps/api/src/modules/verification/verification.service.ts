import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { StorageService } from '../media/storage.service';
import {
  createFaceComparator,
  FaceComparator,
  resolveAutoApproveThreshold,
  shouldAutoApprove,
} from './face-match';

/** Random gesture instructions for the guided live selfie (RF-VER-01). */
const GESTURES = ['SMILE', 'TURN_LEFT', 'TURN_RIGHT', 'BLINK_TWICE', 'LOOK_UP'] as const;

@Injectable()
export class VerificationService {
  /**
   * Real vendor when one is configured (Rekognition or FACE_MATCH_URL), stub
   * otherwise. The stub never reaches the auto-approval threshold, so an
   * unconfigured deployment queues every selfie for a person to review
   * instead of approving identities on a fabricated score.
   */
  private readonly comparator: FaceComparator = createFaceComparator();
  /** FACE_MATCH_AUTO_APPROVE when valid, 0.93 otherwise. */
  private readonly autoApproveThreshold = resolveAutoApproveThreshold();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly storage: StorageService,
  ) {}

  async status(userId: string) {
    const verifications = await this.prisma.verification.findMany({
      where: { userId },
      include: { church: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const byLevel = (level: number) =>
      verifications.find((v) => v.level === level && v.status === 'APPROVED') ??
      verifications.find((v) => v.level === level);
    // La última solicitud a un líder (RF-VER-03), para que «solicitud
    // enviada» sobreviva a recargar la pantalla.
    const leaderRequest = await this.prisma.endorsementRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { church: { select: { name: true } } },
    });
    return {
      level1: byLevel(1),
      level2: byLevel(2),
      level3: byLevel(3),
      leaderRequest: leaderRequest
        ? {
            id: leaderRequest.id,
            status: leaderRequest.status,
            churchName: leaderRequest.church.name,
            leaderName: leaderRequest.leaderName,
            createdAt: leaderRequest.createdAt,
            resolvedAt: leaderRequest.resolvedAt,
          }
        : null,
    };
  }

  /** Step 1 of the selfie flow: random gesture challenge + upload URL. */
  async startSelfie(userId: string) {
    const gestures = [...GESTURES].sort(() => randomInt(3) - 1).slice(0, 2);
    const upload = await this.storage.signUpload(`selfies/${userId}`, 'image/jpeg');
    return { gestures, uploadKey: upload.key, uploadUrl: upload.uploadUrl };
  }

  /**
   * Step 2: submit the selfie. Automatic comparison against the main photo;
   * clear cases resolve automatically, the grey zone goes to the review
   * queue. Oro members get the priority flag (<4 h SLA — 6.9).
   */
  async submitSelfie(userId: string, evidenceKey: string, livenessPassed: boolean) {
    const mainPhoto = await this.prisma.photo.findFirst({
      where: { userId, moderationStatus: 'APPROVED' },
      orderBy: { position: 'asc' },
    });
    // A comparison that fails is not a pass: it leaves the similarity unknown
    // and the case goes to review, like any other doubtful one.
    let similarity: number | null = null;
    if (mainPhoto) {
      try {
        similarity = await this.comparator.compare(evidenceKey, mainPhoto.storageKey);
      } catch {
        similarity = null;
      }
    }

    const tier = await this.subscriptions.tierOf(userId);
    const autoApprove = shouldAutoApprove(livenessPassed, similarity, this.autoApproveThreshold);

    const verification = await this.prisma.verification.create({
      data: {
        userId,
        level: 2,
        method: 'SELFIE',
        evidenceKey,
        similarity: similarity ?? undefined,
        livenessPassed,
        priority: tier === 'ORO',
        status: autoApprove ? 'APPROVED' : 'PENDING',
        resolvedAt: autoApprove ? new Date() : undefined,
      },
    });

    if (autoApprove) {
      await this.notifications.send(userId, 'VERIFICATION', 'identity.approved');
    }
    return verification;
  }

  /** RF-VER-02: redeem a single-use church code (30-day expiry). */
  async redeemChurchCode(userId: string, code: string) {
    const record = await this.prisma.endorsementCode.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { church: true },
    });
    if (!record || record.revokedAt) throw new BadRequestException('invalid_code');
    if (record.usedAt) throw new BadRequestException('code_already_used');
    if (record.expiresAt < new Date()) throw new BadRequestException('code_expired');
    if (record.church.status !== 'APPROVED') throw new BadRequestException('church_not_approved');

    await this.prisma.$transaction([
      this.prisma.endorsementCode.update({
        where: { id: record.id },
        data: { usedAt: new Date(), usedById: userId },
      }),
      this.prisma.verification.create({
        data: {
          userId,
          level: 3,
          method: 'CHURCH_CODE',
          status: 'APPROVED',
          churchId: record.churchId,
          resolvedAt: new Date(),
        },
      }),
    ]);

    await this.notifications.send(userId, 'VERIFICATION', 'endorsement.confirmed', {
      church: record.church.name,
    });
    return { endorsedBy: record.church.name };
  }

  /** RF-VER-03: ask a leader for endorsement. */
  async requestLeaderEndorsement(
    userId: string,
    input: { churchId: string; leaderEmail?: string; leaderName?: string; attendsSince?: number },
  ) {
    const church = await this.prisma.church.findUnique({ where: { id: input.churchId } });
    if (!church || church.status !== 'APPROVED') throw new NotFoundException('church_not_found');
    const pending = await this.prisma.endorsementRequest.findFirst({
      where: { userId, churchId: input.churchId, status: 'PENDING' },
    });
    if (pending) throw new BadRequestException('request_already_pending');

    return this.prisma.endorsementRequest.create({
      data: {
        userId,
        churchId: input.churchId,
        leaderEmail: input.leaderEmail,
        leaderName: input.leaderName,
        attendsSince: input.attendsSince,
      },
    });
    // The church confirms/declines from the portal (ChurchesService).
  }
}
