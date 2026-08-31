import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LIMITS } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { SettingsService } from '../../common/settings.service';
import { DailyLimitsService } from '../discover/daily-limits.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InterestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly limits: DailyLimitsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * RF-DES-04/05/07 + RF-CON-01: mark interest. Consumes the daily counter
   * (free tier), validates the optional message length per tier, and creates
   * the Match + Conversation when the interest is mutual.
   */
  async markInterest(fromUserId: string, toUserId: string, message?: string) {
    if (fromUserId === toUserId) throw new BadRequestException('cannot_interest_self');

    const tier = await this.subscriptions.tierOf(fromUserId);

    if (message) {
      if (tier === 'FREE') throw new ForbiddenException('interest_message_requires_plus');
      const max = tier === 'ORO' ? LIMITS.INTEREST_MESSAGE_MAX_ORO : LIMITS.INTEREST_MESSAGE_MAX_PLUS;
      if (message.length > max) throw new BadRequestException('interest_message_too_long');
    }

    const existing = await this.prisma.interest.findUnique({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
    });
    if (existing) throw new BadRequestException('already_interested');

    const target = await this.prisma.user.findUnique({ where: { id: toUserId } });
    if (!target || target.status !== 'ACTIVE') throw new NotFoundException('member_not_available');

    const quota = await this.limits.consumeInterest(fromUserId, tier);
    if (!quota.allowed) throw new ForbiddenException('daily_interests_used');

    try {
      const interest = await this.prisma.interest.create({
        data: { fromUserId, toUserId, message },
      });

      // Mutual? → connection (RF-CON-01)
      const reciprocal = await this.prisma.interest.findUnique({
        where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: fromUserId } },
      });

      if (reciprocal) {
        const [userAId, userBId] = fromUserId < toUserId ? [fromUserId, toUserId] : [toUserId, fromUserId];
        const match = await this.prisma.match.upsert({
          where: { userAId_userBId: { userAId, userBId } },
          update: { status: 'ACTIVE', endedAt: null, endedById: null },
          create: { userAId, userBId, conversation: { create: {} } },
          include: { conversation: true },
        });
        // Con el id de la conversación, tocar la notificación abre el chat.
        const conversationData = match.conversation
          ? { conversationId: match.conversation.id }
          : undefined;
        await Promise.all([
          this.notifications.notify(
            fromUserId,
            'CONNECTION',
            'Nueva conexión',
            'Se marcaron interés mutuamente. ¡Ya pueden conversar!',
            conversationData,
          ),
          this.notifications.notify(
            toUserId,
            'CONNECTION',
            'Nueva conexión',
            'Se marcaron interés mutuamente. ¡Ya pueden conversar!',
            conversationData,
          ),
        ]);
        return { interest, match, remaining: quota.limit === null ? null : quota.limit - quota.used };
      }

      await this.notifications.notify(
        toUserId,
        'INTEREST',
        'Alguien te marcó interés',
        'Descubre quién en Yugo Plus, o sigue marcando interés para coincidir.',
      );
      return { interest, match: null, remaining: quota.limit === null ? null : quota.limit - quota.used };
    } catch (error) {
      await this.limits.refundInterest(fromUserId);
      throw error;
    }
  }

  /** RF-DES-04: pass hides the profile for 30 days (7.2). */
  async pass(fromUserId: string, toUserId: string) {
    const limits = await this.settings.getLimits();
    const expiresAt = new Date(Date.now() + limits.passHideDays * 86400000);
    const pass = await this.prisma.pass.upsert({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
      update: { expiresAt, undoneAt: null, createdAt: new Date() },
      create: { fromUserId, toUserId, expiresAt },
    });
    return pass;
  }

  /** RF-DES-13 (Oro): undo the most recent pass, max N/day. */
  async undoPass(userId: string) {
    const tier = await this.subscriptions.tierOf(userId);
    if (tier !== 'ORO') throw new ForbiddenException('oro_required');

    const lastPass = await this.prisma.pass.findFirst({
      where: { fromUserId: userId, undoneAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!lastPass) throw new NotFoundException('nothing_to_undo');

    const quota = await this.limits.consumeUndo(userId);
    if (!quota.allowed) throw new ForbiddenException('undo_limit_reached');

    await this.prisma.pass.update({ where: { id: lastPass.id }, data: { undoneAt: new Date() } });
    return { undoneUserId: lastPass.toUserId, remaining: quota.limit - quota.used };
  }

  async save(fromUserId: string, toUserId: string) {
    return this.prisma.savedProfile.upsert({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
      update: {},
      create: { fromUserId, toUserId },
    });
  }

  async saved(userId: string) {
    return this.prisma.savedProfile.findMany({
      where: { fromUserId: userId },
      include: { to: { include: { profile: { include: { denomination: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * RF-DES-09: "Te interesa a…" — free sees the count; Plus/Oro see who,
   * including the optional interest message.
   */
  async whoMarkedMe(userId: string) {
    const tier = await this.subscriptions.tierOf(userId);
    const interests = await this.prisma.interest.findMany({
      where: {
        toUserId: userId,
        from: { status: 'ACTIVE' },
        // exclude already-matched pairs
        NOT: {
          from: {
            OR: [
              { matchesA: { some: { userBId: userId, status: 'ACTIVE' } } },
              { matchesB: { some: { userAId: userId, status: 'ACTIVE' } } },
            ],
          },
        },
      },
      include: { from: { include: { profile: { include: { denomination: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    if (tier === 'FREE') return { count: interests.length, profiles: null };
    return {
      count: interests.length,
      profiles: interests.map((i) => ({
        userId: i.fromUserId,
        displayName: i.from.profile?.displayName ?? 'Miembro',
        denomination: i.from.profile?.denomination?.name,
        city: i.from.profile?.city,
        message: i.message,
        createdAt: i.createdAt,
      })),
    };
  }
}
