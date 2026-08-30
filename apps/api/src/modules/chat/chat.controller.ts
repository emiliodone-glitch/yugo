import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { z } from 'zod';
import { reportSchema, sendMessageSchema, type ReportInput } from '@yugo/shared';
import { ChatService } from './chat.service';
import { IcebreakersService } from './icebreakers.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const blockSchema = z.object({ userId: z.string().min(1) });
const archiveSchema = z.object({ archived: z.boolean() });
const inviteSchema = z.object({ eventId: z.string().min(1) });

@Controller('connections')
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly icebreakers: IcebreakersService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.chat.myConnections(user.id);
  }

  @Get('conversations/:id/messages')
  messages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.messages(id, user.id);
  }

  @Post('conversations/:id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(sendMessageSchema.omit({ conversationId: true }))) body: { body: string },
  ) {
    return this.chat.sendMessage(id, user.id, body.body);
  }

  @Get('conversations/:id/icebreakers')
  icebreakersFor(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.icebreakers.forConversation(id, user.id);
  }

  /** RF-CON-10: invitar a la otra persona a un evento de la agenda. */
  @Post('conversations/:id/invite-event')
  inviteToEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(inviteSchema)) body: { eventId: string },
  ) {
    return this.chat.inviteToEvent(id, user.id, body.eventId);
  }

  @Put('conversations/:id/archive')
  archive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(archiveSchema)) body: { archived: boolean },
  ) {
    return this.chat.archive(id, user.id, body.archived);
  }

  @Delete(':matchId')
  disconnect(@CurrentUser() user: AuthUser, @Param('matchId') matchId: string) {
    return this.chat.disconnect(matchId, user.id);
  }

  @Post('report')
  report(@CurrentUser() user: AuthUser, @Body(new ZodPipe(reportSchema)) body: ReportInput) {
    return this.chat.report(user.id, body);
  }

  @Post('block')
  block(@CurrentUser() user: AuthUser, @Body(new ZodPipe(blockSchema)) body: { userId: string }) {
    return this.chat.block(user.id, body.userId);
  }

  /** RF-CON-09: recordatorio suave para conexiones inactivas por 30 días. */
  @Cron('0 15 * * *')
  remindInactive() {
    return this.chat.remindInactiveConnections();
  }
}
