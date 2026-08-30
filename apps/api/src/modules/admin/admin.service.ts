import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { validateWeights, type AffinityWeights, SETTING_KEYS } from '@yugo/shared';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { SettingsService } from '../../common/settings.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------- Dashboard
  /** RF-ADM-01: KPIs + operational alerts. */
  async dashboard() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const [
      activeMembers,
      newRegistrations,
      connections,
      totalMembers,
      level2Plus,
      pendingVerifications,
      openReports,
      heldMessages,
      pendingChurches,
      revenue,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'MEMBER', lastActiveAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { role: 'MEMBER', createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.match.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { role: 'MEMBER', status: { not: 'DELETED' } } }),
      this.prisma.user.count({
        where: {
          role: 'MEMBER',
          verifications: { some: { level: { gte: 2 }, status: 'APPROVED' } },
        },
      }),
      this.prisma.verification.count({ where: { status: 'PENDING', level: 2 } }),
      this.prisma.moderationCase.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] }, kind: 'REPORT' } }),
      this.prisma.message.count({ where: { moderationStatus: 'HELD' } }),
      this.prisma.church.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCEEDED', createdAt: { gte: thirtyDaysAgo }, currency: 'DOP' },
        _sum: { amount: true },
      }),
    ]);

    const criticalUnassigned = await this.prisma.moderationCase.count({
      where: { priority: 'CRITICAL', assigneeId: null, status: 'OPEN' },
    });
    const staleVerifications = await this.prisma.verification.count({
      where: { status: 'PENDING', level: 2, createdAt: { lt: new Date(Date.now() - 24 * 3600_000) } },
    });

    return {
      kpis: {
        activeMembers30d: activeMembers,
        newRegistrations30d: newRegistrations,
        connectionsCreated30d: connections,
        verifiedLevel2Pct: totalMembers ? Math.round((level2Plus / totalMembers) * 100) : 0,
        revenueDop30d: Number(revenue._sum.amount ?? 0),
      },
      attention: [
        criticalUnassigned > 0 && {
          priority: 'CRITICAL',
          text: `${criticalUnassigned} casos críticos sin asignar`,
        },
        staleVerifications > 0 && {
          priority: 'HIGH',
          text: `${staleVerifications} verificaciones esperan más de 24 h`,
        },
        pendingChurches > 0 && {
          priority: 'NORMAL',
          text: `${pendingChurches} iglesias pendientes de aprobación`,
        },
        heldMessages > 0 && {
          priority: 'NORMAL',
          text: `Cola de moderación IA: ${heldMessages} mensajes retenidos`,
        },
      ].filter(Boolean),
      queues: { pendingVerifications, openReports, heldMessages, pendingChurches },
    };
  }

  // ---------------------------------------------------------------- Members
  /** RF-ADM-02: member management. */
  async members(query?: string, page = 1) {
    const where: Prisma.UserWhereInput = {
      role: 'MEMBER',
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { profile: { displayName: { contains: query, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          profile: { select: { displayName: true, city: true, completeness: true } },
          verifications: { where: { status: 'APPROVED' }, select: { level: true } },
          subscriptions: { where: { status: 'ACTIVE' }, select: { tier: true } },
          _count: { select: { reportsReceived: true, sanctions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 25,
        take: 25,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page };
  }

  async memberDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: { include: { denomination: true, church: true } },
        verifications: { orderBy: { createdAt: 'desc' } },
        sanctions: { orderBy: { createdAt: 'desc' } },
        reportsReceived: { orderBy: { createdAt: 'desc' }, take: 20 },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!user) throw new NotFoundException();
    const { passwordHash: _ph, twoFactorSecret: _tfs, ...safe } = user;
    return safe;
  }

  async memberAction(
    actorId: string,
    userId: string,
    action: 'WARN' | 'SUSPEND' | 'BAN' | 'REINSTATE',
    reason: string,
    days?: number,
  ) {
    const before = await this.prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!before) throw new NotFoundException();

    switch (action) {
      case 'WARN':
        await this.prisma.sanction.create({
          data: { userId, type: 'WARNING', reason, createdById: actorId },
        });
        break;
      case 'SUSPEND': {
        const suspensionDays = days ?? 7;
        await this.prisma.$transaction([
          this.prisma.sanction.create({
            data: {
              userId,
              type: 'SUSPENSION',
              days: suspensionDays,
              until: new Date(Date.now() + suspensionDays * 86400000),
              reason,
              createdById: actorId,
            },
          }),
          this.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } }),
        ]);
        break;
      }
      case 'BAN':
        await this.prisma.$transaction([
          this.prisma.sanction.create({ data: { userId, type: 'BAN', reason, createdById: actorId } }),
          this.prisma.user.update({ where: { id: userId }, data: { status: 'BANNED' } }),
        ]);
        break;
      case 'REINSTATE':
        await this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
        break;
    }

    await this.notifications.notify(userId, 'MODERATION', 'Actualización de tu cuenta', reason);
    await this.audit.log({
      actorId,
      action: `MEMBER_${action}`,
      targetType: 'USER',
      targetId: userId,
      before,
      after: { reason, days },
    });
    return { done: true };
  }

  // ---------------------------------------------------------------- Verification queue
  /** RF-ADM-03: level-2 queue, priority (Oro) first, then FIFO. */
  async verificationQueue() {
    const items = await this.prisma.verification.findMany({
      where: { level: 2, status: 'PENDING' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 50,
      include: {
        user: {
          include: {
            profile: { select: { displayName: true, city: true } },
            photos: { where: { moderationStatus: 'APPROVED' }, orderBy: { position: 'asc' }, take: 1 },
            _count: { select: { reportsReceived: true, sanctions: true } },
          },
        },
      },
    });
    return items;
  }

  async decideVerification(
    actorId: string,
    verificationId: string,
    decision: 'APPROVE' | 'REJECT' | 'ESCALATE',
    note?: string,
  ) {
    const verification = await this.prisma.verification.findUnique({ where: { id: verificationId } });
    if (!verification) throw new NotFoundException();

    if (decision === 'ESCALATE') {
      await this.prisma.moderationCase.create({
        data: {
          kind: 'REPORT',
          priority: 'CRITICAL',
          subjectUserId: verification.userId,
          internalNotes: [{ by: actorId, note: note ?? 'Escalado por posible menor', at: new Date() }] as never,
          slaDueAt: new Date(Date.now() + 12 * 3600_000),
        },
      });
      await this.prisma.user.update({
        where: { id: verification.userId },
        data: { status: 'PAUSED' },
      });
    } else {
      await this.prisma.verification.update({
        where: { id: verificationId },
        data: {
          status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          reviewedById: actorId,
          reviewNote: note,
          resolvedAt: new Date(),
        },
      });
      await this.notifications.notify(
        verification.userId,
        'VERIFICATION',
        decision === 'APPROVE' ? 'Identidad verificada' : 'Selfie rechazada',
        decision === 'APPROVE'
          ? 'Tu selfie fue aprobada. Tu perfil ahora muestra la insignia de identidad.'
          : 'Tu selfie no pudo validarse. Intenta de nuevo con buena luz y sin lentes.',
      );
    }

    await this.audit.log({
      actorId,
      action: `VERIFICATION_${decision}`,
      targetType: 'VERIFICATION',
      targetId: verificationId,
      after: { note },
    });
    return { done: true };
  }

  /** RF-VER-05: revoke with reason; the member is notified. */
  async revokeVerification(actorId: string, verificationId: string, reason: string) {
    const verification = await this.prisma.verification.update({
      where: { id: verificationId },
      data: { status: 'REVOKED', revokeReason: reason, reviewedById: actorId },
    });
    await this.notifications.notify(
      verification.userId,
      'VERIFICATION',
      'Verificación revocada',
      `Tu verificación fue revocada: ${reason}`,
    );
    await this.audit.log({
      actorId,
      action: 'VERIFICATION_REVOKED',
      targetType: 'VERIFICATION',
      targetId: verificationId,
      after: { reason },
    });
    return { done: true };
  }

  // ---------------------------------------------------------------- Moderation queue
  /** RF-ADM-04: unified queue — reports, AI-held, appeals — priority + SLA. */
  async moderationQueue(kind?: 'REPORT' | 'AI_HELD' | 'APPEAL') {
    const [items, counts] = await Promise.all([
      this.prisma.moderationCase.findMany({
        where: { status: { in: ['OPEN', 'IN_REVIEW'] }, ...(kind ? { kind } : {}) },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        take: 50,
        include: {
          report: { include: { reporter: { select: { id: true } } } },
          assignee: { select: { id: true, email: true } },
        },
      }),
      this.prisma.moderationCase.groupBy({
        by: ['kind'],
        where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
        _count: true,
      }),
    ]);
    return {
      items,
      counts: Object.fromEntries(counts.map((c) => [c.kind, c._count])),
    };
  }

  async takeNextCase(actorId: string) {
    const next = await this.prisma.moderationCase.findFirst({
      where: { status: 'OPEN', assigneeId: null },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    if (!next) return null;
    return this.prisma.moderationCase.update({
      where: { id: next.id },
      data: { assigneeId: actorId, status: 'IN_REVIEW' },
    });
  }

  /** Decisions with templates; each requires a reason and is audited. */
  async decideCase(
    actorId: string,
    caseId: string,
    decision:
      | 'NO_ACTION'
      | 'WARNING'
      | 'SUSPEND_3'
      | 'SUSPEND_7'
      | 'SUSPEND_30'
      | 'BAN'
      | 'REMOVE_CONTENT'
      | 'REVOKE_VERIFICATION'
      | 'ESCALATE',
    reason: string,
  ) {
    const moderationCase = await this.prisma.moderationCase.findUnique({
      where: { id: caseId },
      include: { report: true },
    });
    if (!moderationCase) throw new NotFoundException();
    const subjectId = moderationCase.subjectUserId ?? moderationCase.report?.targetUserId;

    if (decision.startsWith('SUSPEND_') && subjectId) {
      const days = Number(decision.split('_')[1]);
      await this.memberAction(actorId, subjectId, 'SUSPEND', reason, days);
    } else if (decision === 'WARNING' && subjectId) {
      await this.memberAction(actorId, subjectId, 'WARN', reason);
    } else if (decision === 'BAN' && subjectId) {
      await this.memberAction(actorId, subjectId, 'BAN', reason);
    } else if (decision === 'REMOVE_CONTENT') {
      if (moderationCase.messageId) {
        await this.prisma.message.update({
          where: { id: moderationCase.messageId },
          data: { moderationStatus: 'REJECTED' },
        });
      }
      if (moderationCase.postId) {
        await this.prisma.post.update({
          where: { id: moderationCase.postId },
          data: { moderationStatus: 'REJECTED' },
        });
      }
      if (moderationCase.photoId) {
        await this.prisma.photo.update({
          where: { id: moderationCase.photoId },
          data: { moderationStatus: 'REJECTED' },
        });
      }
    }

    await this.prisma.moderationCase.update({
      where: { id: caseId },
      data: {
        status: decision === 'ESCALATE' ? 'ESCALATED' : 'RESOLVED',
        decision,
        decisionReason: reason,
        resolvedAt: decision === 'ESCALATE' ? null : new Date(),
      },
    });
    await this.audit.log({
      actorId,
      action: `CASE_${decision}`,
      targetType: 'MODERATION_CASE',
      targetId: caseId,
      after: { reason },
    });
    return { done: true };
  }

  /** Approve or deliver an AI-held message after human review. */
  async resolveHeldMessage(actorId: string, messageId: string, approve: boolean) {
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        moderationStatus: approve ? 'APPROVED' : 'REJECTED',
        deliveredAt: approve ? new Date() : null,
      },
    });
    await this.audit.log({
      actorId,
      action: approve ? 'HELD_MESSAGE_APPROVED' : 'HELD_MESSAGE_REJECTED',
      targetType: 'MESSAGE',
      targetId: messageId,
    });
    if (!approve) {
      await this.notifications.notify(
        message.senderId,
        'MODERATION',
        'Mensaje no entregado',
        'Tu mensaje no se entregó porque incumple el Pacto de conducta.',
      );
    }
    return { done: true };
  }

  // ---------------------------------------------------------------- Organizations & content
  /** RF-ADM-05: church approval. */
  async pendingChurches() {
    return this.prisma.church.findMany({
      where: { status: 'PENDING' },
      include: { denomination: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decideChurch(actorId: string, churchId: string, approve: boolean, note?: string) {
    const church = await this.prisma.church.update({
      where: { id: churchId },
      data: approve ? { status: 'APPROVED', approvedAt: new Date() } : { status: 'REJECTED' },
    });
    if (approve) {
      // Official group is created with the church (RF-COM-03).
      const existing = await this.prisma.group.findUnique({ where: { churchId } });
      if (!existing) {
        await this.prisma.group.create({
          data: {
            name: church.name,
            description: `Grupo oficial de ${church.name}.`,
            type: 'OFFICIAL',
            status: 'ACTIVE',
            churchId,
            city: church.city,
          },
        });
      }
    }
    await this.audit.log({
      actorId,
      action: approve ? 'CHURCH_APPROVED' : 'CHURCH_REJECTED',
      targetType: 'CHURCH',
      targetId: churchId,
      after: { note },
    });
    return { done: true };
  }

  /** RF-ADM-06 / RF-EVE-02: event review queue. */
  async eventsInReview() {
    return this.prisma.event.findMany({
      where: { status: 'IN_REVIEW' },
      include: { church: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decideEvent(actorId: string, eventId: string, approve: boolean, note?: string) {
    await this.prisma.event.update({
      where: { id: eventId },
      data: approve
        ? {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            reviewNote: note,
            qrToken: randomBytes(12).toString('hex'),
          }
        : { status: 'REJECTED', reviewNote: note },
    });
    await this.audit.log({
      actorId,
      action: approve ? 'EVENT_APPROVED' : 'EVENT_REJECTED',
      targetType: 'EVENT',
      targetId: eventId,
      after: { note },
    });
    return { done: true };
  }

  async setEventFeatured(actorId: string, eventId: string, featured: boolean) {
    await this.prisma.event.update({ where: { id: eventId }, data: { featured } });
    await this.audit.log({ actorId, action: 'EVENT_FEATURED', targetType: 'EVENT', targetId: eventId, after: { featured } });
    return { done: true };
  }

  async pendingGroups() {
    return this.prisma.group.findMany({
      where: { status: 'PENDING' },
      include: { category: true, _count: { select: { members: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decideGroup(actorId: string, groupId: string, approve: boolean) {
    await this.prisma.group.update({
      where: { id: groupId },
      data: { status: approve ? 'ACTIVE' : 'CLOSED' },
    });
    await this.audit.log({
      actorId,
      action: approve ? 'GROUP_APPROVED' : 'GROUP_REJECTED',
      targetType: 'GROUP',
      targetId: groupId,
    });
    return { done: true };
  }

  // ---------------------------------------------------------------- Settings & audit
  /** RF-ADM-08: algorithm weights — must sum exactly 100. */
  async updateAffinityWeights(actorId: string, weights: AffinityWeights) {
    if (!validateWeights(weights)) throw new BadRequestException('weights_must_sum_100');
    const before = await this.settings.getAffinityWeights();
    await this.settings.update(SETTING_KEYS.AFFINITY_WEIGHTS, weights, actorId);
    await this.audit.log({
      actorId,
      action: 'SETTINGS_AFFINITY_WEIGHTS',
      targetType: 'SETTING',
      before,
      after: weights,
    });
    return { saved: true };
  }

  async updateSetting(actorId: string, key: string, value: unknown) {
    const allowed = Object.values(SETTING_KEYS) as string[];
    if (!allowed.includes(key)) throw new BadRequestException('unknown_setting');
    await this.settings.update(key, value, actorId);
    await this.audit.log({ actorId, action: 'SETTINGS_UPDATED', targetType: 'SETTING', targetId: key, after: value });
    return { saved: true };
  }

  async getSettings() {
    const [weights, limits, thresholds, covenantVersion, prices] = await Promise.all([
      this.settings.getAffinityWeights(),
      this.settings.getLimits(),
      this.settings.getModerationThresholds(),
      this.settings.getCovenantVersion(),
      this.settings.getPrices(),
    ]);
    return { weights, limits, thresholds, covenantVersion, prices };
  }

  /** Denomination affinity matrix editor (RF-ADM-07). */
  async denominationMatrix() {
    const [denominations, affinities] = await Promise.all([
      this.prisma.denomination.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      this.prisma.denominationAffinity.findMany(),
    ]);
    return { denominations, affinities };
  }

  async updateMatrixCell(actorId: string, aId: string, bId: string, value: number) {
    if (value < 0 || value > 100) throw new BadRequestException('value_out_of_range');
    const [lo, hi] = aId < bId ? [aId, bId] : [bId, aId];
    await this.prisma.denominationAffinity.upsert({
      where: { aId_bId: { aId: lo, bId: hi } },
      update: { value },
      create: { aId: lo, bId: hi, value },
    });
    await this.audit.log({
      actorId,
      action: 'DENOMINATION_MATRIX_UPDATED',
      targetType: 'DENOMINATION_AFFINITY',
      targetId: `${lo}:${hi}`,
      after: { value },
    });
    return { saved: true };
  }

  /** RF-ADM-11: read-only audit access with filters. */
  async auditLog(filters: { actorId?: string; action?: string; page?: number }) {
    const page = filters.page ?? 1;
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.actorId ? { actorId: filters.actorId } : {}),
        ...(filters.action ? { action: { contains: filters.action } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 50,
      take: 50,
    });
  }

  // ---------------------------------------------------------------- Payments (RF-ADM-09)
  async payments(page = 1) {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 50,
      take: 50,
      include: { user: { select: { email: true } }, subscription: { select: { tier: true, plan: true } } },
    });
  }

  /** Refunds require double approval (RF-ADM-09). */
  async approveRefund(actorId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException();
    if (payment.status !== 'REFUND_REQUESTED' && payment.status !== 'SUCCEEDED') {
      throw new BadRequestException('not_refundable');
    }
    if (!payment.refundApprovedById) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'REFUND_REQUESTED', refundApprovedById: actorId },
      });
      await this.audit.log({ actorId, action: 'REFUND_FIRST_APPROVAL', targetType: 'PAYMENT', targetId: paymentId });
      return { status: 'awaiting_second_approval' };
    }
    if (payment.refundApprovedById === actorId) {
      throw new BadRequestException('second_approver_must_differ');
    }
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED', refundSecondApprovedById: actorId },
    });
    await this.audit.log({ actorId, action: 'REFUND_COMPLETED', targetType: 'PAYMENT', targetId: paymentId });
    return { status: 'refunded' };
  }
}
