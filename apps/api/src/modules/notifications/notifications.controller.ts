import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { NotificationsService } from './notifications.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const tokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(['ios', 'android', 'web']),
});
// Every category of the Prisma enum: the clients iterate the full list, so a
// category missing here turned a toggle into a 400.
const prefSchema = z.object({
  category: z.enum([
    'CONNECTION',
    'RELATIONSHIP',
    'ACCOMPANIMENT',
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
const quietHoursSchema = z.object({
  enabled: z.boolean(),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
});
const digestSchema = z.object({ enabled: z.boolean() });

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user.id);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.id);
  }

  @Put('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
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

  @Delete('push-token')
  unregister(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(z.object({ token: z.string().min(10) }))) body: { token: string },
  ) {
    return this.notifications.removePushToken(user.id, body.token);
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

  /** RF-NOT-02: quiet hours, in America/Santo_Domingo. */
  @Get('quiet-hours')
  quietHours(@CurrentUser() user: AuthUser) {
    return this.notifications.quietHours(user.id);
  }

  @Put('quiet-hours')
  setQuietHours(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(quietHoursSchema)) body: z.infer<typeof quietHoursSchema>,
  ) {
    return this.notifications.setQuietHours(user.id, body);
  }

  /** Resumen semanal por correo (sin rachas): activado por defecto. */
  @Get('digest')
  digest(@CurrentUser() user: AuthUser) {
    return this.notifications.digestSetting(user.id);
  }

  @Put('digest')
  setDigest(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(digestSchema)) body: { enabled: boolean },
  ) {
    return this.notifications.setDigest(user.id, body.enabled);
  }
}
