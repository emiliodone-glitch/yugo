import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { PRAYER_BODY_MAX, PRAYER_BODY_MIN } from '@yugo/shared';
import { PrayerService } from './prayer.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const createSchema = z.object({
  body: z.string().trim().min(PRAYER_BODY_MIN).max(PRAYER_BODY_MAX),
  anonymous: z.boolean().default(false),
});
const answeredSchema = z.object({ note: z.string().trim().max(600).optional() });

@Controller('oracion')
export class PrayerController {
  constructor(private readonly prayer: PrayerService) {}

  @Get()
  wall(@CurrentUser() user: AuthUser, @Query('scope') scope?: string) {
    return this.prayer.wall(user.id, scope === 'church' ? 'church' : 'community');
  }

  @Get('mias')
  mine(@CurrentUser() user: AuthUser) {
    return this.prayer.mine(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(createSchema)) body: z.infer<typeof createSchema>,
  ) {
    return this.prayer.create(user.id, body.body, body.anonymous);
  }

  @Post(':id/oro')
  intercede(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.prayer.intercede(user.id, id);
  }

  @Post(':id/contestada')
  markAnswered(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(answeredSchema)) body: z.infer<typeof answeredSchema>,
  ) {
    return this.prayer.markAnswered(user.id, id, body.note);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.prayer.remove(user.id, id);
  }
}
