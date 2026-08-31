import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { StoriesService } from './stories.service';
import { CurrentUser, Public, Roles, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const storySchema = z.object({
  names: z.string().trim().min(3).max(120),
  churchNames: z.string().trim().max(200).default(''),
  city: z.string().trim().max(80).optional(),
  marriedAt: z.coerce.date(),
  body: z.string().trim().min(80).max(3000),
});
const consentSchema = z.object({ agree: z.boolean() });
const decisionSchema = z.object({
  approve: z.boolean(),
  note: z.string().trim().max(500).optional(),
});

/**
 * Historias de parejas que se casaron.
 *
 * Reading is public — the whole point is that someone who has not signed up
 * can see what the product is actually for, without a paywall or an account
 * in the way.
 */
@Controller('historias')
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @Get()
  @Public()
  published(@Query('limit') limit?: string) {
    return this.stories.published(limit ? Number(limit) : 20);
  }

  @Get('conexion/:matchId')
  forCouple(@CurrentUser() user: AuthUser, @Param('matchId') matchId: string) {
    return this.stories.forCouple(matchId, user.id);
  }

  @Post('conexion/:matchId')
  submit(
    @CurrentUser() user: AuthUser,
    @Param('matchId') matchId: string,
    @Body(new ZodPipe(storySchema)) body: z.infer<typeof storySchema>,
  ) {
    return this.stories.submit(matchId, user.id, body);
  }

  @Post('conexion/:matchId/consent')
  consent(
    @CurrentUser() user: AuthUser,
    @Param('matchId') matchId: string,
    @Body(new ZodPipe(consentSchema)) body: { agree: boolean },
  ) {
    return this.stories.consent(matchId, user.id, body.agree);
  }

  // --- Moderación ---------------------------------------------------------

  @Get('revision')
  @Roles('MODERATOR', 'COMMUNITY_MANAGER', 'SUPERADMIN')
  queue() {
    return this.stories.queue();
  }

  @Post('revision/:id')
  @Roles('MODERATOR', 'COMMUNITY_MANAGER', 'SUPERADMIN')
  decide(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(decisionSchema)) body: { approve: boolean; note?: string },
  ) {
    return this.stories.decide(id, user.id, body.approve, body.note);
  }
}
