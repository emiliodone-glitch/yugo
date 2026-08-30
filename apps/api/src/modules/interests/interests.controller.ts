import { Body, Controller, Get, Post } from '@nestjs/common';
import { markInterestSchema, passSchema, saveProfileSchema } from '@yugo/shared';
import type { MarkInterestInput } from '@yugo/shared';
import { InterestsService } from './interests.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

@Controller('interests')
export class InterestsController {
  constructor(private readonly interests: InterestsService) {}

  @Post()
  mark(@CurrentUser() user: AuthUser, @Body(new ZodPipe(markInterestSchema)) body: MarkInterestInput) {
    return this.interests.markInterest(user.id, body.toUserId, body.message);
  }

  @Post('pass')
  pass(@CurrentUser() user: AuthUser, @Body(new ZodPipe(passSchema)) body: { userId: string }) {
    return this.interests.pass(user.id, body.userId);
  }

  @Post('pass/undo')
  undo(@CurrentUser() user: AuthUser) {
    return this.interests.undoPass(user.id);
  }

  @Post('save')
  save(@CurrentUser() user: AuthUser, @Body(new ZodPipe(saveProfileSchema)) body: { userId: string }) {
    return this.interests.save(user.id, body.userId);
  }

  @Get('saved')
  saved(@CurrentUser() user: AuthUser) {
    return this.interests.saved(user.id);
  }

  @Get('who-marked-me')
  whoMarkedMe(@CurrentUser() user: AuthUser) {
    return this.interests.whoMarkedMe(user.id);
  }
}
