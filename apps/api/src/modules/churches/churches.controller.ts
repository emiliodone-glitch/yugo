import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { createEventSchema, type CreateEventInput } from '@yugo/shared';
import { ChurchesService } from './churches.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const registerSchema = z.object({
  name: z.string().trim().min(3).max(120),
  denominationId: z.string().optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  contactName: z.string().max(80).optional(),
  contactEmail: z.string().email().optional(),
  socialLinks: z.record(z.string()).optional(),
});
const generateSchema = z.object({ count: z.number().int().min(1).max(100) });
const resolveSchema = z.object({ confirm: z.boolean() });
const revokeSchema = z.object({
  memberUserId: z.string().min(1),
  reason: z.string().min(3).max(300),
});
const counselingResponseSchema = z.object({
  accept: z.boolean(),
  message: z.string().trim().max(600).optional(),
});
const createEventBody = createEventSchema.extend({ submit: z.boolean().default(false) });
const ticketSchema = z.object({ code: z.string().trim().min(4).max(20) });
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'EVENT_EDITOR']).default('EVENT_EDITOR'),
});

@Controller('church-portal')
export class ChurchesController {
  constructor(private readonly churches: ChurchesService) {}

  @Post('register')
  register(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(registerSchema)) body: z.infer<typeof registerSchema>,
  ) {
    return this.churches.register(user.id, body);
  }

  @Get('me')
  myChurch(@CurrentUser() user: AuthUser) {
    return this.churches.myChurch(user.id);
  }

  @Get('events')
  myEvents(@CurrentUser() user: AuthUser) {
    return this.churches.myEvents(user.id);
  }

  @Post('events')
  createEvent(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(createEventBody)) body: CreateEventInput & { submit: boolean },
  ) {
    const { submit, ...input } = body;
    return this.churches.createEvent(user.id, input, submit);
  }

  @Put('events/:id/submit')
  submitEvent(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.churches.submitEvent(user.id, id);
  }

  /** QR de entrada de un evento publicado, para imprimir (RF-EVE-06). */
  @Get('events/:id/qr')
  eventQr(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.churches.eventQr(user.id, id);
  }

  /** Registrar en la puerta la entrada que enseña una persona (RF-EVE-06). */
  @Post('events/:id/check-in-ticket')
  checkInTicket(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(ticketSchema)) body: { code: string },
  ) {
    return this.churches.checkInTicket(user.id, id, body.code);
  }

  @Get('invitations')
  invitations(@CurrentUser() user: AuthUser) {
    return this.churches.listInvitations(user.id);
  }

  @Delete('invitations/:id')
  revokeInvitation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.churches.revokeInvitation(user.id, id);
  }

  @Post('invitations/accept')
  acceptInvitation(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(z.object({ token: z.string().min(16).max(128) }))) body: { token: string },
  ) {
    return this.churches.acceptInvitation(user.id, body.token);
  }

  @Get('codes')
  codes(@CurrentUser() user: AuthUser) {
    return this.churches.listCodes(user.id);
  }

  @Post('codes/generate')
  generate(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(generateSchema)) body: { count: number },
  ) {
    return this.churches.generateCodes(user.id, body.count);
  }

  @Get('endorsement-requests')
  requests(@CurrentUser() user: AuthUser) {
    return this.churches.endorsementRequests(user.id);
  }

  @Put('endorsement-requests/:id')
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(resolveSchema)) body: { confirm: boolean },
  ) {
    return this.churches.resolveEndorsementRequest(user.id, id, body.confirm);
  }

  @Post('endorsements/revoke')
  revoke(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(revokeSchema)) body: { memberUserId: string; reason: string },
  ) {
    return this.churches.revokeEndorsement(user.id, body.memberUserId, body.reason);
  }

  @Get('metrics')
  metrics(@CurrentUser() user: AuthUser) {
    return this.churches.metrics(user.id);
  }

  /** Grupo oficial de la iglesia con su muro reciente (RF-IGL-04). */
  @Get('group')
  officialGroup(@CurrentUser() user: AuthUser) {
    return this.churches.officialGroup(user.id);
  }

  /** Usuarios del portal (RF-IGL-02). */
  @Get('users')
  portalUsers(@CurrentUser() user: AuthUser) {
    return this.churches.portalUsers(user.id);
  }

  @Post('users/invite')
  invite(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(inviteSchema)) body: { email: string; role: 'ADMIN' | 'EVENT_EDITOR' },
  ) {
    return this.churches.inviteUser(user.id, body.email, body.role);
  }

  @Delete('users/:id')
  removeUser(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.churches.removePortalUser(user.id, id);
  }

  /** Ministerio de solteros: totales de los encuentros que convoca (RF-IGL-06). */
  @Get('singles-ministry')
  singlesMinistry(@CurrentUser() user: AuthUser) {
    return this.churches.singlesMinistry(user.id);
  }

  // Consejería prematrimonial pedida por parejas (RF-REL-05). Solo llegan
  // las que firmaron los dos; el servicio lo garantiza por consulta.
  @Get('counseling')
  counseling(@CurrentUser() user: AuthUser) {
    return this.churches.counselingRequests(user.id);
  }

  @Put('counseling/:id')
  respondCounseling(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(counselingResponseSchema)) body: { accept: boolean; message?: string },
  ) {
    return this.churches.respondCounseling(user.id, id, body);
  }
}
