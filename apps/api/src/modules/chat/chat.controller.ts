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
import { AccompanimentService } from './accompaniment.service';
import { MeetingPlanService } from './meeting-plan.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const blockSchema = z.object({ userId: z.string().min(1) });
const archiveSchema = z.object({ archived: z.boolean() });
const inviteSchema = z.object({ eventId: z.string().min(1) });
const stageProposalSchema = z.object({ stage: z.enum(RELATIONSHIP_STAGES) });
const mentorCodeSchema = z.object({ code: z.string().min(4).max(40) });
const consentSchema = z.object({ agree: z.boolean() });
const meetingPlanSchema = z.object({
  place: z.string().trim().min(3).max(200),
  meetsAt: z.coerce.date(),
  notes: z.string().trim().max(300).optional(),
  trustedContactLabel: z.string().trim().max(80).optional(),
});

@Controller('connections')
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly icebreakers: IcebreakersService,
    private readonly relationship: RelationshipService,
    private readonly accompaniment: AccompanimentService,
    private readonly meetingPlan: MeetingPlanService,
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

  // --- Acompañamiento ----------------------------------------------------
  // Lo que ve quien acompaña vive en /acompanamiento y no toca este
  // controlador: aquí están los mensajes, y un padrino no entra aquí.

  @Get(':matchId/accompaniment')
  myAccompaniment(@CurrentUser() user: AuthUser, @Param('matchId') matchId: string) {
    return this.accompaniment.forCouple(matchId, user.id);
  }

  @Post(':matchId/accompaniment/invite')
  inviteMentor(
    @CurrentUser() user: AuthUser,
    @Param('matchId') matchId: string,
    @Body(new ZodPipe(mentorCodeSchema)) body: { code: string },
  ) {
    return this.accompaniment.invite(matchId, user.id, body.code);
  }

  @Post(':matchId/accompaniment/consent')
  consentToMentor(
    @CurrentUser() user: AuthUser,
    @Param('matchId') matchId: string,
    @Body(new ZodPipe(consentSchema)) body: { agree: boolean },
  ) {
    return this.accompaniment.consent(matchId, user.id, body.agree);
  }

  // --- Plan del primer encuentro (RF-SEG-06) ------------------------------
  // Cada plan es de quien lo escribe. La otra persona nunca lo ve ni se
  // entera de que existe.

  @Get(':matchId/plan')
  myMeetingPlan(@CurrentUser() user: AuthUser, @Param('matchId') matchId: string) {
    return this.meetingPlan.mine(matchId, user.id);
  }

  @Post(':matchId/plan')
  createMeetingPlan(
    @CurrentUser() user: AuthUser,
    @Param('matchId') matchId: string,
    @Body(new ZodPipe(meetingPlanSchema))
    body: { place: string; meetsAt: Date; notes?: string; trustedContactLabel?: string },
  ) {
    return this.meetingPlan.create(matchId, user.id, body);
  }

  @Post('plan/:planId/shared')
  markPlanShared(@CurrentUser() user: AuthUser, @Param('planId') planId: string) {
    return this.meetingPlan.markShared(planId, user.id);
  }

  @Post('plan/:planId/check-in')
  planCheckIn(@CurrentUser() user: AuthUser, @Param('planId') planId: string) {
    return this.meetingPlan.checkIn(planId, user.id);
  }

  @Delete('plan/:planId')
  cancelPlan(@CurrentUser() user: AuthUser, @Param('planId') planId: string) {
    return this.meetingPlan.cancel(planId, user.id);
  }
}
