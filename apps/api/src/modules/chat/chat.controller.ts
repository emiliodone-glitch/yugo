import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { z } from 'zod';
import {
  RELATIONSHIP_STAGES,
  reportSchema,
  sendMessageSchema,
  type RelationshipStage,
  type ReportInput,
} from '@yugo/shared';
import { ChatService } from './chat.service';
import { IcebreakersService } from './icebreakers.service';
import { RelationshipService } from './relationship.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const blockSchema = z.object({ userId: z.string().min(1) });
const archiveSchema = z.object({ archived: z.boolean() });
const inviteSchema = z.object({ eventId: z.string().min(1) });
const stageProposalSchema = z.object({ stage: z.enum(RELATIONSHIP_STAGES) });

@Controller('connections')
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly icebreakers: IcebreakersService,
    private readonly relationship: RelationshipService,
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

  // --- Etapas del vínculo -----------------------------------------------
  // Una etapa la declaran los dos: uno propone y el otro acepta.

  @Get(':matchId/stage')
  stage(@CurrentUser() user: AuthUser, @Param('matchId') matchId: string) {
    return this.relationship.state(matchId, user.id);
  }

  @Post(':matchId/stage/propose')
  proposeStage(
    @CurrentUser() user: AuthUser,
    @Param('matchId') matchId: string,
    @Body(new ZodPipe(stageProposalSchema)) body: { stage: RelationshipStage },
  ) {
    return this.relationship.propose(matchId, user.id, body.stage);
  }

  @Post(':matchId/stage/accept')
  acceptStage(@CurrentUser() user: AuthUser, @Param('matchId') matchId: string) {
    return this.relationship.accept(matchId, user.id);
  }

  @Post(':matchId/stage/decline')
  declineStage(@CurrentUser() user: AuthUser, @Param('matchId') matchId: string) {
    return this.relationship.decline(matchId, user.id);
  }
}
