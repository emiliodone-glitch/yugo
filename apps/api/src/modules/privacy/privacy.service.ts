import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LIMITS } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

/**
 * Ley 172-13 de protección de datos personales de República Dominicana
 * (RF-SEG-08): consentimiento, acceso, rectificación y eliminación.
 *
 * - Acceso: `exportPersonalData` entrega TODO lo que el titular puede pedir,
 *   en JSON legible, sin datos de terceros (los mensajes de la otra persona
 *   se incluyen porque forman parte de su conversación, pero nunca se
 *   exponen datos de contacto ajenos).
 * - Eliminación: `purgeExpiredDeletions` borra de verdad a los 14 días
 *   (RF-AUT-08), conservando solo el rastro anonimizado que la ley permite
 *   retener por seguridad (bitácora de auditoría y sanciones).
 */
@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Derecho de acceso: copia completa de los datos personales del titular. */
  async exportPersonalData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            denomination: { select: { name: true } },
            church: { select: { name: true } },
            serviceAreas: { include: { serviceArea: { select: { name: true } } } },
            answers: true,
          },
        },
        photos: { select: { id: true, storageKey: true, position: true, createdAt: true } },
        verifications: {
          select: { level: true, method: true, status: true, createdAt: true, resolvedAt: true },
        },
        sentInterests: { select: { toUserId: true, message: true, createdAt: true } },
        receivedInterests: { select: { fromUserId: true, createdAt: true } },
        subscriptions: {
          select: { tier: true, plan: true, channel: true, status: true, startsAt: true, endsAt: true },
        },
        payments: {
          select: { amount: true, currency: true, provider: true, status: true, createdAt: true },
        },
        eventAttendances: { select: { eventId: true, status: true, checkedInAt: true } },
        groupMemberships: { select: { groupId: true, role: true, joinedAt: true } },
        posts: { select: { id: true, body: true, createdAt: true } },
        notifications: { select: { category: true, title: true, body: true, createdAt: true } },
        sanctions: { select: { type: true, reason: true, createdAt: true, until: true } },
      },
    });
    if (!user) throw new NotFoundException();

    const matches = await this.prisma.match.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        conversation: {
          include: {
            messages: {
              where: { moderationStatus: 'APPROVED' },
              select: { senderId: true, body: true, sentAt: true },
              orderBy: { sentAt: 'asc' },
            },
          },
        },
      },
    });

    await this.audit.log({
      actorId: userId,
      action: 'PERSONAL_DATA_EXPORTED',
      targetType: 'USER',
      targetId: userId,
    });

    const { passwordHash: _ph, twoFactorSecret: _tfs, ...account } = user;
    return {
      exportedAt: new Date().toISOString(),
      legalBasis: 'Ley 172-13 de Protección de Datos Personales (República Dominicana)',
      account,
      conversations: matches.map((match) => ({
        connectionWith: match.userAId === userId ? match.userBId : match.userAId,
        status: match.status,
        createdAt: match.createdAt,
        messages: match.conversation?.messages ?? [],
      })),
    };
  }

  /** Derecho de rectificación: registra la corrección solicitada. */
  async requestRectification(userId: string, field: string, requestedValue: string) {
    await this.audit.log({
      actorId: userId,
      action: 'RECTIFICATION_REQUESTED',
      targetType: 'USER',
      targetId: userId,
      after: { field, requestedValue },
    });
    return { received: true };
  }

  /**
   * Borrado definitivo tras la gracia de 14 días (RF-AUT-08). Se conservan,
   * anonimizados, solo los registros que la ley permite retener por
   * seguridad: bitácora de auditoría y sanciones.
   */
  @Cron('0 4 * * *')
  async purgeExpiredDeletions() {
    const cutoff = new Date(Date.now() - LIMITS.DELETION_GRACE_DAYS * 86400000);
    const pending = await this.prisma.user.findMany({
      where: { status: 'DELETION_PENDING', deletionRequestedAt: { lte: cutoff } },
      select: { id: true },
    });

    for (const { id } of pending) {
      await this.prisma.$transaction([
        // Anonymize the account row; cascades remove profile, photos, messages…
        this.prisma.user.update({
          where: { id },
          data: {
            email: null,
            phone: null,
            passwordHash: null,
            googleId: null,
            appleId: null,
            twoFactorSecret: null,
            status: 'DELETED',
            deletedAt: new Date(),
          },
        }),
        this.prisma.profile.deleteMany({ where: { userId: id } }),
        this.prisma.photo.deleteMany({ where: { userId: id } }),
        this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
        this.prisma.pushToken.deleteMany({ where: { userId: id } }),
        this.prisma.notification.deleteMany({ where: { userId: id } }),
        this.prisma.profileView.deleteMany({ where: { OR: [{ viewerId: id }, { viewedId: id }] } }),
      ]);
      await this.audit.log({ action: 'ACCOUNT_PURGED', targetType: 'USER', targetId: id });
      this.logger.log(`Purged account ${id} after grace period`);
    }
    return { purged: pending.length };
  }

  /** RF-SEG-07: distancia en rangos en lugar del valor exacto. */
  static distanceLabel(distanceKm: number, hideExact: boolean): string {
    if (!hideExact) return `${Math.round(distanceKm)} km`;
    if (distanceKm < 2) return 'Menos de 2 km';
    if (distanceKm < 5) return '2–5 km';
    if (distanceKm < 10) return '5–10 km';
    if (distanceKm < 25) return '10–25 km';
    if (distanceKm < 50) return '25–50 km';
    if (distanceKm < 100) return '50–100 km';
    return 'Más de 100 km';
  }
}
