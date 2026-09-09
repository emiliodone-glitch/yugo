import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { AccompanimentService } from './accompaniment.service';
import { IntroductionsService } from './introductions.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const introductionSchema = z.object({
  a: z.string().trim().min(3).max(120),
  b: z.string().trim().min(3).max(120),
  note: z.string().trim().min(20).max(500),
});

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
  constructor(
    private readonly accompaniment: AccompanimentService,
    private readonly introductions: IntroductionsService,
  ) {}

  // Presentación por padrino (RF-ACO-05). Van antes de ':id' para que
  // «presentaciones» no se lea como un id.
  /** Las presentaciones que me hicieron y siguen esperando mi respuesta. */
  @Get('presentaciones')
  myIntroductions(@CurrentUser() user: AuthUser) {
    return this.introductions.mine(user.id);
  }

  /** Las que propuse como padrino, con su resultado. */
  @Get('presentaciones/propuestas')
  proposedIntroductions(@CurrentUser() user: AuthUser) {
    return this.introductions.proposed(user.id);
  }

  @Post('presentaciones')
  propose(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(introductionSchema)) body: { a: string; b: string; note: string },
  ) {
    return this.introductions.propose(user.id, body);
  }

  @Post('presentaciones/:id/respond')
  respondIntroduction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(respondSchema)) body: { accept: boolean },
  ) {
    return this.introductions.respond(id, user.id, body.accept);
  }

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
