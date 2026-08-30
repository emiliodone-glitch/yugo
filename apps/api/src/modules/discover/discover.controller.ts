import { Controller, Get, Param, Query } from '@nestjs/common';
import { discoverFiltersSchema, type DiscoverFilters } from '@yugo/shared';
import { DiscoverService } from './discover.service';
import { DailyLimitsService } from './daily-limits.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SettingsService } from '../../common/settings.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';

@Controller('discover')
export class DiscoverController {
  constructor(
    private readonly discover: DiscoverService,
    private readonly limits: DailyLimitsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly settings: SettingsService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('filters') rawFilters?: string) {
    let filters: DiscoverFilters = {};
    if (rawFilters) {
      const parsed = discoverFiltersSchema.safeParse(JSON.parse(rawFilters));
      if (parsed.success) filters = parsed.data;
    }
    const [list, tier, used, domainLimits] = await Promise.all([
      this.discover.getDaily(user.id, filters),
      this.subscriptions.tierOf(user.id),
      this.limits.interestsUsed(user.id),
      this.settings.getLimits(),
    ]);
    return {
      ...list,
      interests: {
        used,
        limit: tier === 'FREE' ? domainLimits.dailyInterestsFree : null,
      },
    };
  }

  @Get('who-viewed-me')
  whoViewedMe(@CurrentUser() user: AuthUser) {
    return this.discover.whoViewedMe(user.id);
  }

  @Get(':userId')
  detail(@CurrentUser() user: AuthUser, @Param('userId') targetId: string) {
    return this.discover.profileDetail(user.id, targetId);
  }
}
