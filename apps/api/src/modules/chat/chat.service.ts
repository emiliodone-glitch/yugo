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
import { StorageService } from '../media/storage.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: TextModerationService,
    private readonly sanctions: SanctionsService,
    private readonly notifications: NotificationsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly gateway: ChatGateway,
    private readonly storage: StorageService,
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
        userA: {
          include: {
            profile: { include: { church: true } },
            verifications: { where: { status: 'APPROVED' }, include: { church: true } },
            photos: {
              where: { moderationStatus: 'APPROVED' },
              orderBy: { position: 'asc' },
              take: 1,
            },
          },
        },
        userB: {
          include: {
            profile: { include: { church: true } },
            verifications: { where: { status: 'APPROVED' }, include: { church: true } },
            photos: {
              where: { moderationStatus: 'APPROVED' },
              orderBy: { position: 'asc' },
              take: 1,
            },
          },
        },
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
            photoUrl: other.photos[0]
              ? await this.storage.signDownload(other.photos[0].storageKey)
              : undefined,
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
          stage: match.stage,
          // A proposal the other person left waiting deserves to be visible
          // from the list, not only once you open the conversation.
          stageProposalPending: !!match.proposedStage && match.proposedById !== userId,
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

  /**
   * RF-CON-10: share an event from the chat so they can attend together. The
   * invitation is a normal moderated message, so it follows the same rules.
   */
  async inviteToEvent(conversationId: string, senderId: string, eventId: string) {
    await this.assertParticipant(conversationId, senderId);
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { church: { select: { name: true } } },
    });
    if (!event || event.status !== 'PUBLISHED') throw new NotFoundException('event_not_available');

    const when = new Intl.DateTimeFormat('es-DO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Santo_Domingo',
    }).format(event.startsAt);

    const body = `¿Vamos juntos? "${event.title}" · ${when} · ${event.church.name}`;
    const message = await this.sendMessage(conversationId, senderId, body);
    return { message, event: { id: event.id, title: event.title, startsAt: event.startsAt } };
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

  /**
   * RF-CON-09: connections with no activity for 30 days get one gentle
   * reminder. Runs daily; the notification itself is the marker, so nobody
   * gets nudged twice for the same connection.
   */
  async remindInactiveConnections() {
    const cutoff = new Date(Date.now() - 30 * 86400000);
    const stale = await this.prisma.match.findMany({
      where: {
        status: 'ACTIVE',
        createdAt: { lte: cutoff },
        conversation: { messages: { none: { sentAt: { gt: cutoff } } } },
      },
      include: {
        userA: { include: { profile: { select: { displayName: true } } } },
        userB: { include: { profile: { select: { displayName: true } } } },
      },
      take: 200,
    });

    let sent = 0;
    for (const match of stale) {
      for (const [user, other] of [
        [match.userA, match.userB],
        [match.userB, match.userA],
      ] as const) {
        const already = await this.prisma.notification.findFirst({
          where: {
            userId: user.id,
            category: 'CONNECTION',
            title: 'Conexión sin actividad',
            data: { path: ['matchId'], equals: match.id },
          },
        });
        if (already) continue;
        await this.notifications.notify(
          user.id,
          'CONNECTION',
          'Conexión sin actividad',
          `Hace un mes que no conversas con ${other.profile?.displayName ?? 'tu conexión'}. Un saludo sencillo basta para retomar.`,
          { matchId: match.id },
        );
        sent += 1;
      }
    }
    return { reminded: sent };
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
