import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { profileUpdateSchema, searchPreferencesSchema } from '@yugo/shared';
import type { ProfileUpdateInput, SearchPreferencesInput } from '@yugo/shared';
import { ProfilesService } from './profiles.service';
import { AnswersService } from './answers.service';
import { VoiceService } from './voice.service';
import { CurrentUser, Public, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const answerSchema = z.object({
  key: z.string().min(1),
  answer: z.string().trim().min(1).max(400),
});
const voiceSignSchema = z.object({ contentType: z.string().min(3).max(60) });
const voiceConfirmSchema = z.object({
  key: z.string().min(1),
  durationMs: z.number().int().min(1).max(120_000),
  contentType: z.string().min(3).max(60),
});

@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly answers: AnswersService,
    private readonly voice: VoiceService,
  ) {}

  /** RF-PER-09: conversation questions catalog and the member's answers. */
  @Public()
  @Get('questions')
  questions() {
    return this.answers.catalog();
  }

  @Get('me/answers')
  myAnswers(@CurrentUser() user: AuthUser) {
    return this.answers.list(user.id);
  }

  @Put('me/answers')
  saveAnswer(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(answerSchema)) body: { key: string; answer: string },
  ) {
    return this.answers.upsert(user.id, body.key, body.answer);
  }

  @Delete('me/answers/:key')
  removeAnswer(@CurrentUser() user: AuthUser, @Param('key') key: string) {
    return this.answers.remove(user.id, key);
  }

  @Get('me')
  async getMine(@CurrentUser() user: AuthUser) {
    const [profile, voiceNote] = await Promise.all([
      this.profiles.getMine(user.id),
      this.voice.mine(user.id),
    ]);
    return profile ? { ...profile, voiceNote } : null;
  }

  /** RF-PER-12: testimonio en la propia voz, moderado antes de publicarse. */
  @Post('me/voice/sign-upload')
  voiceSignUpload(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(voiceSignSchema)) body: { contentType: string },
  ) {
    return this.voice.signUpload(user.id, body.contentType);
  }

  @Post('me/voice/confirm')
  voiceConfirm(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(voiceConfirmSchema))
    body: { key: string; durationMs: number; contentType: string },
  ) {
    return this.voice.confirm(user.id, body.key, body.durationMs, body.contentType);
  }

  @Delete('me/voice')
  voiceRemove(@CurrentUser() user: AuthUser) {
    return this.voice.remove(user.id);
  }

  @Put('me')
  update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(profileUpdateSchema)) body: ProfileUpdateInput,
  ) {
    return this.profiles.upsert(user.id, body);
  }

  @Put('me/preferences')
  updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(searchPreferencesSchema)) body: SearchPreferencesInput,
  ) {
    return this.profiles.updateSearchPreferences(user.id, body);
  }

  @Get('me/preview')
  preview(@CurrentUser() user: AuthUser) {
    return this.profiles.preview(user.id);
  }
}
