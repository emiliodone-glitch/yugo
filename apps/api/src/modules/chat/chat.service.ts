import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { TextModerationService } from '../moderation/text-moderation.service';
import { SanctionsService } from '../moderation/sanctions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: TextModerationService,
    private readonly sanctions: SanctionsService,
    private readonly notifications: NotificationsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly gateway: ChatGateway,
  ) {}

  /** RF-CON-02: connection list with last message, unread count, badges. */
  async myConnections(userId: string) {
    const matches = await this.prisma.match.findMany({
      where: { status: 'ACTIVE', OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        conversation: {
          include: {
            messages: {
              where: { OR: [{ moderationStatus: 'APPROVED' }, { senderId: userId }] },
              orderBy: { sentAt: 'desc' },
              take: 1,
            },
          },
        },
        userA: { include: { profile: { include: { church: true } }, verifications: { where: { status: 'APPROVED' }, include: { church: true } } } },
        userB: { include: { profile: { include: { church: true } }, verifications: { where: { status: 'APPROVED' }, include: { church: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      matches.map(async (match) => {
        const other = match.userAId === userId ? match.userB : match.userA;
        const conversation = match.conversation;
        const lastMessage = conversation?.messages[0];
        const unreadCount = conversation
          ? await this.prisma.message.count({
              where: {
                conversationId: conversation.id,
                senderId: other.id,
                moderationStatus: 'APPROVED',
                readAt: null,
              },
            })
          : 0;
        const level3 = other.verifications.find((v) => v.level === 3);
        return {
          matchId: match.id,
          conversationId: conversation?.id,
          otherUser: {
            userId: other.id,
            displayName: other.profile?.displayName ?? 'Miembro',
            churchName: other.profile?.church?.name ?? undefined,
            badges: {
              contact: true,
              identity: other.verifications.some((v) => v.level === 2),
              endorsedBy: level3?.church?.name,
            },
          },
          isNew: !lastMessage,
          lastMessage: lastMessage
            ? { body: lastMessage.body, sentAt: lastMessage.sentAt, mine: lastMessage.senderId === userId }
            : undefined,
          unreadCount,
        };
      }),
    );
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });
    if (!conversation) throw new NotFoundException('conversation_not_found');
    const { match } = conversation;
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException('not_participant');
    }
    if (match.status !== 'ACTIVE') throw new ForbiddenException('connection_ended');
    return conversation;
  }

  async messages(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    // The sender sees their own HELD messages ("en revisión"); the other side
    // only ever sees APPROVED content (RF-CON-06, 7.3).
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        OR: [{ moderationStatus: 'APPROVED' }, { senderId: userId, moderationStatus: { in: ['PENDING', 'HELD'] } }],
      },
      orderBy: { sentAt: 'asc' },
      take: 200,
    });

    // Mark incoming as read (RF-CON-03).
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null, moderationStatus: 'APPROVED' },
      data: { readAt: new Date() },
    });
    this.gateway.emitToConversation(conversationId, 'messages:read', { readerId: userId });
    return messages;
  }

  /**
   * RF-CON-05/06 + 7.3: text only; every message is classified BEFORE
   * delivery. APPROVE → deliver in real time; HOLD → sender sees "en
   * revisión" and a case opens; REJECT → educational notice + escalation.
   */
  async sendMessage(conversationId: string, senderId: string, body: string) {
    const conversation = await this.assertParticipant(conversationId, senderId);
    const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (sender?.status === 'SUSPENDED') throw new ForbiddenException('account_suspended');

    const verdict = await this.moderation.moderate(body, 'private chat message');
    const status =
      verdict.decision === 'APPROVE' ? 'APPROVED' : verdict.decision === 'HOLD' ? 'HELD' : 'REJECTED';

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        body,
        moderationStatus: status,
        moderationRisk: verdict.risk,
        moderationCategories: verdict.categories,
        deliveredAt: status === 'APPROVED' ? new Date() : null,
      },
    });

    if (status === 'APPROVED') {
      this.gateway.emitToConversation(conversationId, 'message:new', message);
      const recipientId =
        conversation.match.userAId === senderId
          ? conversation.match.userBId
          : conversation.match.userAId;
      await this.notifications.notify(recipientId, 'MESSAGE', 'Nuevo mensaje', body.slice(0, 80), {
        conversationId,
      });
    } else if (status === 'HELD') {
      await this.prisma.moderationCase.create({
        data: {
          kind: 'AI_HELD',
          priority: verdict.categories.includes('scam_or_money') ? 'HIGH' : 'NORMAL',
          messageId: message.id,
          subjectUserId: senderId,
          slaDueAt: new Date(Date.now() + 24 * 3600_000),
        },
      });
    } else {
      // Educational notice (7.3) + automatic escalation on repeat offenses.
      await this.notifications.notify(
        senderId,
        'MODERATION',
        'Mensaje no entregado',
        'Tu mensaje no se entregó porque incumple el Pacto de conducta. Cuida el respeto en la conversación.',
      );
      await this.sanctions.handleMessageRejected(senderId);
    }

    return message;
  }

  /** RF-CON-08: end the connection; conversation hidden for both, 90-day cooldown. */
  async disconnect(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException();
    if (match.userAId !== userId && match.userBId !== userId) throw new ForbiddenException();
    await this.prisma.match.update({
      where: { id: matchId },
      data: { status: 'ENDED', endedAt: new Date(), endedById: userId },
    });
    return { ended: true };
  }

  /** RF-CON-07: report from chat with automatic priority + evidence capture. */
  async report(
    reporterId: string,
    input: { targetType: string; targetId: string; category: string; details?: string },
  ) {
    let targetUserId: string | undefined;
    let evidence: unknown;

    if (input.targetType === 'MESSAGE') {
      const message = await this.prisma.message.findUnique({
        where: { id: input.targetId },
        include: { conversation: true },
      });
      if (!message) throw new BadRequestException('message_not_found');
      targetUserId = message.senderId;
      // Capture recent history as evidence (RF-SEG-03).
      const history = await this.prisma.message.findMany({
        where: { conversationId: message.conversationId },
        orderBy: { sentAt: 'desc' },
        take: 20,
      });
      evidence = history.map((m) => ({ senderId: m.senderId, body: m.body, sentAt: m.sentAt }));
    } else if (input.targetType === 'PROFILE') {
      targetUserId = input.targetId;
    }

    const critical = input.category === 'UNDERAGE' || input.category === 'HARASSMENT';
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: input.targetType as never,
        targetId: input.targetId,
        targetUserId,
        category: input.category as never,
        details: input.details,
        evidence: evidence as never,
        case: {
          create: {
            kind: 'REPORT',
            priority: critical ? 'CRITICAL' : input.category === 'SCAM' ? 'HIGH' : 'NORMAL',
            subjectUserId: targetUserId,
            // Critical reports: preventive hide + 12 h SLA (7.3).
            slaDueAt: new Date(Date.now() + (critical ? 12 : 24) * 3600_000),
          },
        },
      },
    });

    if (critical && targetUserId) {
      await this.prisma.user.updateMany({
        where: { id: targetUserId, status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });
    }
    return report;
  }

  async block(blockerId: string, blockedId: string) {
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
    // Also end any active connection.
    await this.prisma.match.updateMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { userAId: blockerId, userBId: blockedId },
          { userAId: blockedId, userBId: blockerId },
        ],
      },
      data: { status: 'ENDED', endedAt: new Date(), endedById: blockerId },
    });
    return { blocked: true };
  }

  /** RF-CON-09 (Plus): archive a conversation. */
  async archive(conversationId: string, userId: string, archived: boolean) {
    const tier = await this.subscriptions.tierOf(userId);
    if (tier === 'FREE') throw new ForbiddenException('plus_required');
    const conversation = await this.assertParticipant(conversationId, userId);
    const isA = conversation.match.userAId === userId;
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: isA ? { archivedByA: archived } : { archivedByB: archived },
    });
    return { archived };
  }
}
