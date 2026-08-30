import { Injectable } from '@nestjs/common';
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

/**
 * Real-time chat transport (RF-CON-03): one Socket.IO room per conversation,
 * delivered/read receipts and typing indicator. Message PERSISTENCE and
 * moderation happen in ChatService over HTTP; the gateway only fans out.
 */
@Injectable()
@WebSocketGateway({ namespace: '/chat', cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

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
    } catch {
      client.disconnect(true);
    }
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
  typing(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string; typing: boolean }) {
    client.to(`conversation:${body.conversationId}`).emit('typing', {
      userId: client.data.userId,
      typing: body.typing,
    });
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.server?.to(`conversation:${conversationId}`).emit(event, payload);
  }
}
