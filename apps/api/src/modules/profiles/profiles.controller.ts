import { Body, Controller, Get, Put } from '@nestjs/common';
import { profileUpdateSchema, searchPreferencesSchema } from '@yugo/shared';
import type { ProfileUpdateInput, SearchPreferencesInput } from '@yugo/shared';
import { ProfilesService } from './profiles.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

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
