import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { z } from 'zod';
import { profileUpdateSchema, searchPreferencesSchema } from '@yugo/shared';
import type { ProfileUpdateInput, SearchPreferencesInput } from '@yugo/shared';
import { ProfilesService } from './profiles.service';
import { AnswersService } from './answers.service';
import { CurrentUser, Public, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const answerSchema = z.object({ key: z.string().min(1), answer: z.string().trim().min(1).max(200) });

@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly answers: AnswersService,
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
  getMine(@CurrentUser() user: AuthUser) {
    return this.profiles.getMine(user.id);
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
