import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
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
const revokeSchema = z.object({ memberUserId: z.string().min(1), reason: z.string().min(3).max(300) });
const createEventBody = createEventSchema.extend({ submit: z.boolean().default(false) });

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

  @Get('codes')
  codes(@CurrentUser() user: AuthUser) {
    return this.churches.listCodes(user.id);
  }

  @Post('codes/generate')
  generate(@CurrentUser() user: AuthUser, @Body(new ZodPipe(generateSchema)) body: { count: number }) {
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
}
