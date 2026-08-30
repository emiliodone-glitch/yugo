import { ForbiddenException, Injectable } from '@nestjs/common';
import { LIMITS } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

const FEATURED_HOURS = 24;

/**
 * RF-DES-10 "Perfil destacado": the profile surfaces in the first positions
 * of compatible members' Discover for 24 h. Plus once a week, Oro three
 * times. The weekly allowance is counted from the audit trail so it survives
 * restarts and cannot be reset by clearing the cache.
 */
@Injectable()
export class BoostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  private allowanceFor(tier: 'FREE' | 'PLUS' | 'ORO'): number {
    if (tier === 'ORO') return LIMITS.FEATURED_PER_WEEK_ORO;
    if (tier === 'PLUS') return LIMITS.FEATURED_PER_WEEK_PLUS;
    return 0;
  }

  async status(userId: string) {
    const tier = await this.subscriptions.tierOf(userId);
    const allowance = this.allowanceFor(tier);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const used = await this.prisma.auditLog.count({
      where: { actorId: userId, action: 'PROFILE_FEATURED', createdAt: { gte: weekAgo } },
    });
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { featuredUntil: true },
    });
    const activeUntil =
      profile?.featuredUntil && profile.featuredUntil > new Date() ? profile.featuredUntil : null;
    return {
      tier,
      allowancePerWeek: allowance,
      usedThisWeek: used,
      remaining: Math.max(0, allowance - used),
      activeUntil,
    };
  }

  async activate(userId: string) {
    const status = await this.status(userId);
    if (status.allowancePerWeek === 0) throw new ForbiddenException('plus_required');
    if (status.activeUntil) throw new ForbiddenException('already_featured');
    if (status.remaining <= 0) throw new ForbiddenException('weekly_boost_used');

    const featuredUntil = new Date(Date.now() + FEATURED_HOURS * 3600_000);
    await this.prisma.profile.update({ where: { userId }, data: { featuredUntil } });
    await this.audit.log({
      actorId: userId,
      action: 'PROFILE_FEATURED',
      targetType: 'PROFILE',
      targetId: userId,
      after: { featuredUntil },
    });
    return { featuredUntil, remaining: status.remaining - 1 };
  }
}
