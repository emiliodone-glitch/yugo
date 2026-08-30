import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { NotificationsService } from './notifications.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const tokenSchema = z.object({ token: z.string().min(10), platform: z.enum(['ios', 'android', 'web']) });
const prefSchema = z.object({
  category: z.enum([
    'CONNECTION',
    'MESSAGE',
    'INTEREST',
    'EVENT',
    'GROUP',
    'VERIFICATION',
    'MODERATION',
    'SUBSCRIPTION',
  ]),
  push: z.boolean(),
  email: z.boolean(),
});

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user.id);
  }

  @Put(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('push-token')
  register(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(tokenSchema)) body: { token: string; platform: string },
  ) {
    return this.notifications.registerPushToken(user.id, body.token, body.platform);
  }

  @Get('preferences')
  preferences(@CurrentUser() user: AuthUser) {
    return this.notifications.preferences(user.id);
  }

  @Put('preferences')
  setPreference(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(prefSchema)) body: z.infer<typeof prefSchema>,
  ) {
    return this.notifications.setPreference(user.id, body.category, body.push, body.email);
  }
}
