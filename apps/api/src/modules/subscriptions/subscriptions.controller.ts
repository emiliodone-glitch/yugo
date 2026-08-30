import { Body, Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { z } from 'zod';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentUser, Public, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const purchaseSchema = z.object({
  tier: z.enum(['PLUS', 'ORO']),
  plan: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']),
  channel: z.enum(['STRIPE', 'AZUL', 'APP_STORE', 'GOOGLE_PLAY']),
  currency: z.enum(['DOP', 'USD']),
  token: z.string().optional(),
});
const invisibleSchema = z.object({ enabled: z.boolean() });
const badgeSchema = z.object({ show: z.boolean() });
const travelSchema = z
  .object({
    city: z.string().min(2),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    days: z.number().int().min(1).max(90),
  })
  .nullable();

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('me')
  state(@CurrentUser() user: AuthUser) {
    return this.subscriptions.state(user.id);
  }

  @Public()
  @Get('prices')
  prices() {
    return this.subscriptions.prices();
  }

  @Post('purchase')
  purchase(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(purchaseSchema))
    body: z.infer<typeof purchaseSchema>,
  ) {
    return this.subscriptions.purchase(
      user.id,
      body.tier,
      body.plan,
      body.channel,
      body.currency,
      body.token,
    );
  }

  @Delete('me')
  cancel(@CurrentUser() user: AuthUser) {
    return this.subscriptions.cancel(user.id);
  }

  @Put('invisible-mode')
  invisible(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(invisibleSchema)) body: { enabled: boolean },
  ) {
    return this.subscriptions.setInvisibleMode(user.id, body.enabled);
  }

  @Put('oro-badge')
  badge(@CurrentUser() user: AuthUser, @Body(new ZodPipe(badgeSchema)) body: { show: boolean }) {
    return this.subscriptions.setOroBadge(user.id, body.show);
  }

  @Put('travel-mode')
  travel(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(travelSchema)) body: z.infer<typeof travelSchema>,
  ) {
    return this.subscriptions.setTravelMode(user.id, body);
  }

  /** Daily 03:00 UTC: expiries, downgrades, invisible-mode warnings (RF-PLU-08). */
  @Cron('0 3 * * *')
  dailyMaintenance() {
    return this.subscriptions.runDailyMaintenance();
  }
}
