import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Real-time transport (RF-CON-03, RF-NOT-01): one Socket.IO room per
 * conversation for messages, receipts and typing, plus one room per member
 * for notifications so an open app updates its badge without polling.
 * PERSISTENCE and moderation happen over HTTP; the gateway only fans out.
 */
@Injectable()
@WebSocketGateway({ namespace: '/chat', cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    // Every stored notification reaches the member's own room. The listener
    // lives here (and not in NotificationsService) to keep that module free
    // of a dependency on the chat transport.
    this.notifications.onCreated((notification) => {
      this.emitToUser(notification.userId, 'notification:new', {
        id: notification.id,
        category: notification.category,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        createdAt: notification.createdAt,
      });
    });
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.startsWith('Bearer ')
          ? client.handshake.headers.authorization.slice(7)
          : undefined);
      if (!token) throw new Error('missing token');
      const payload = await this.jwt.verifyAsync(token);
      client.data.userId = payload.sub as string;
      await client.join(`user:${client.data.userId}`);
    } catch {
      client.disconnect(true);
    }
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  @SubscribeMessage('conversation:join')
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }) {
    const userId = client.data.userId as string;
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: body.conversationId },
      include: { match: true },
    });
    if (!conversation) return { ok: false };
    if (conversation.match.userAId !== userId && conversation.match.userBId !== userId) {
      return { ok: false };
    }
    await client.join(`conversation:${body.conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; typing: boolean },
  ) {
    client.to(`conversation:${body.conversationId}`).emit('typing', {
      userId: client.data.userId,
      typing: body.typing,
    });
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.server?.to(`conversation:${conversationId}`).emit(event, payload);
  }
}
