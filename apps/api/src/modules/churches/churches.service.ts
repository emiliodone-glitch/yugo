import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { LIMITS, type CreateEventInput } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChurchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** RF-IGL-01: organization sign-up; community manager approves. */
  async register(
    userId: string,
    input: {
      name: string;
      denominationId?: string;
      address?: string;
      city?: string;
      contactName?: string;
      contactEmail?: string;
      socialLinks?: Record<string, string>;
    },
  ) {
    const church = await this.prisma.church.create({
      data: {
        ...input,
        socialLinks: input.socialLinks as Prisma.InputJsonValue,
        status: 'PENDING',
        users: { create: { userId, role: 'ADMIN' } },
      },
    });
    await this.audit.log({ actorId: userId, action: 'CHURCH_REGISTERED', targetType: 'CHURCH', targetId: church.id });
    return church;
  }

  /** Resolves the church the caller administers (portal context). */
  private async requireMembership(userId: string, minRole?: 'ADMIN') {
    const membership = await this.prisma.churchUser.findFirst({
      where: { userId },
      include: { church: true },
    });
    if (!membership) throw new ForbiddenException('not_church_user');
    if (minRole === 'ADMIN' && membership.role !== 'ADMIN') {
      throw new ForbiddenException('church_admin_required');
    }
    return membership;
  }

  async myChurch(userId: string) {
    const membership = await this.requireMembership(userId);
    const church = membership.church;
    const [endorsedMembers, activeCodes, pendingRequests] = await Promise.all([
      this.prisma.verification.count({ where: { churchId: church.id, level: 3, status: 'APPROVED' } }),
      this.prisma.endorsementCode.count({
        where: { churchId: church.id, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      }),
      this.prisma.endorsementRequest.count({ where: { churchId: church.id, status: 'PENDING' } }),
    ]);
    return { church, role: membership.role, stats: { endorsedMembers, activeCodes, pendingRequests } };
  }

  /** RF-IGL-03: event lifecycle draft → in review → published. */
  async createEvent(userId: string, input: CreateEventInput, submit: boolean) {
    const membership = await this.requireMembership(userId);
    if (membership.church.status !== 'APPROVED') throw new ForbiddenException('church_not_approved');

    // Churches with track record can publish directly (RF-EVE-02).
    const status = submit
      ? membership.church.directPublish
        ? 'PUBLISHED'
        : 'IN_REVIEW'
      : 'DRAFT';

    return this.prisma.event.create({
      data: {
        churchId: membership.churchId,
        title: input.title,
        description: input.description,
        type: input.type,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        address: input.address,
        city: input.city,
        lat: input.lat,
        lng: input.lng,
        capacity: input.capacity,
        costAmount: input.costAmount != null ? new Prisma.Decimal(input.costAmount) : null,
        costCurrency: input.costAmount != null ? (input.costCurrency ?? 'DOP') : null,
        externalUrl: input.externalUrl,
        imageKey: input.imageKey,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        qrToken: status === 'PUBLISHED' ? randomBytes(12).toString('hex') : null,
      },
    });
  }

  async myEvents(userId: string) {
    const membership = await this.requireMembership(userId);
    return this.prisma.event.findMany({
      where: { churchId: membership.churchId },
      orderBy: { startsAt: 'desc' },
      include: { _count: { select: { attendances: true } } },
    });
  }

  async submitEvent(userId: string, eventId: string) {
    const membership = await this.requireMembership(userId);
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, churchId: membership.churchId },
    });
    if (!event) throw new NotFoundException();
    if (event.status !== 'DRAFT') throw new BadRequestException('not_a_draft');
    return this.prisma.event.update({
      where: { id: eventId },
      data: membership.church.directPublish
        ? { status: 'PUBLISHED', publishedAt: new Date(), qrToken: randomBytes(12).toString('hex') }
        : { status: 'IN_REVIEW' },
    });
  }

  /** RF-IGL-05 / RF-VER-02: batch generation of single-use codes. */
  async generateCodes(userId: string, count: number) {
    const membership = await this.requireMembership(userId, 'ADMIN');
    if (count < 1 || count > 100) throw new BadRequestException('invalid_count');
    const prefix = membership.church.name
      .normalize('NFD')
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 4)
      .toUpperCase();
    const codes = Array.from({ length: count }, () => ({
      churchId: membership.churchId,
      code: `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`,
      expiresAt: new Date(Date.now() + LIMITS.ENDORSEMENT_CODE_TTL_DAYS * 86400000),
    }));
    await this.prisma.endorsementCode.createMany({ data: codes });
    await this.audit.log({
      actorId: userId,
      action: 'ENDORSEMENT_CODES_GENERATED',
      targetType: 'CHURCH',
      targetId: membership.churchId,
      after: { count },
    });
    return this.prisma.endorsementCode.findMany({
      where: { churchId: membership.churchId, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: count,
    });
  }

  async listCodes(userId: string) {
    const membership = await this.requireMembership(userId);
    return this.prisma.endorsementCode.findMany({
      where: { churchId: membership.churchId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /** Endorsement requests queue (RF-VER-03) with privacy: no dating activity shown. */
  async endorsementRequests(userId: string) {
    const membership = await this.requireMembership(userId);
    const requests = await this.prisma.endorsementRequest.findMany({
      where: { churchId: membership.churchId, status: 'PENDING' },
      include: { user: { include: { profile: { select: { displayName: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    return requests.map((r) => ({
      id: r.id,
      name: r.user.profile?.displayName ?? 'Miembro',
      attendsSince: r.attendsSince,
      leaderName: r.leaderName,
      createdAt: r.createdAt,
    }));
  }

  async resolveEndorsementRequest(userId: string, requestId: string, confirm: boolean) {
    const membership = await this.requireMembership(userId);
    const request = await this.prisma.endorsementRequest.findFirst({
      where: { id: requestId, churchId: membership.churchId, status: 'PENDING' },
    });
    if (!request) throw new NotFoundException();

    await this.prisma.endorsementRequest.update({
      where: { id: requestId },
      data: { status: confirm ? 'CONFIRMED' : 'DECLINED', resolvedAt: new Date() },
    });

    if (confirm) {
      await this.prisma.verification.create({
        data: {
          userId: request.userId,
          level: 3,
          method: 'LEADER_CONFIRMATION',
          status: 'APPROVED',
          churchId: membership.churchId,
          reviewedById: userId,
          resolvedAt: new Date(),
        },
      });
      await this.notifications.notify(
        request.userId,
        'VERIFICATION',
        'Respaldo de iglesia confirmado',
        `Tu perfil ahora muestra "Respaldado por ${membership.church.name}".`,
      );
    }
    return { resolved: true, confirmed: confirm };
  }

  /** Revoke an endorsement at any time (church side). */
  async revokeEndorsement(userId: string, memberUserId: string, reason: string) {
    const membership = await this.requireMembership(userId, 'ADMIN');
    await this.prisma.verification.updateMany({
      where: { userId: memberUserId, churchId: membership.churchId, level: 3, status: 'APPROVED' },
      data: { status: 'REVOKED', revokeReason: reason },
    });
    await this.notifications.notify(
      memberUserId,
      'VERIFICATION',
      'Respaldo de iglesia retirado',
      'Tu congregación retiró el respaldo de tu perfil.',
    );
    return { revoked: true };
  }

  /** RF-IGL-06: metrics — attendance, check-ins, group, event reach. */
  async metrics(userId: string) {
    const membership = await this.requireMembership(userId);
    const churchId = membership.churchId;
    const [events, going, checkIns, groupMembers, endorsed] = await Promise.all([
      this.prisma.event.count({ where: { churchId, status: 'PUBLISHED' } }),
      this.prisma.eventAttendance.count({ where: { event: { churchId }, status: 'GOING' } }),
      this.prisma.eventAttendance.count({ where: { event: { churchId }, checkedInAt: { not: null } } }),
      this.prisma.groupMember.count({ where: { group: { churchId } } }),
      this.prisma.verification.count({ where: { churchId, level: 3, status: 'APPROVED' } }),
    ]);
    return { events, going, checkIns, groupMembers, endorsed };
  }
}
