import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { AccompanimentService } from './accompaniment.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const mentorProfileSchema = z.object({
  spouseName: z.string().min(2).max(80).optional(),
  marriedSince: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  bio: z.string().max(400).optional(),
});
const respondSchema = z.object({ accept: z.boolean() });

/**
 * Lo que ve quien acompaña.
 *
 * Deliberately a separate controller from ChatController: everything about
 * messages lives there, and nothing here reaches it. A mentor calling the chat
 * endpoints is refused like any other stranger, because those check that the
 * caller is one of the two people in the match.
 */
@Controller('acompanamiento')
export class AccompanimentController {
  constructor(private readonly accompaniment: AccompanimentService) {}

  /** Offer to accompany couples. Requires a level-3 endorsement (RF-VER-02). */
  @Put('perfil')
  enable(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(mentorProfileSchema))
    body: { spouseName?: string; marriedSince?: number; bio?: string },
  ) {
    return this.accompaniment.enableMentor(user.id, body);
  }

  @Get('perfil')
  myProfile(@CurrentUser() user: AuthUser) {
    return this.accompaniment.myMentorProfile(user.id);
  }

  @Delete('perfil')
  disable(@CurrentUser() user: AuthUser) {
    return this.accompaniment.disableMentor(user.id);
  }

  /** The bonds this mentor walks with, and the invitations still pending. */
  @Get()
  mine(@CurrentUser() user: AuthUser) {
    return this.accompaniment.forMentor(user.id);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accompaniment.detailForMentor(id, user.id);
  }

  @Post(':id/respond')
  respond(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(respondSchema)) body: { accept: boolean },
  ) {
    return this.accompaniment.mentorRespond(id, user.id, body.accept);
  }

  /** Any of the three can end it, without a reason. */
  @Delete(':id')
  end(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accompaniment.end(id, user.id);
  }
}
