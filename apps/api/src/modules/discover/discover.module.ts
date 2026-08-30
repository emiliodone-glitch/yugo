import { Module } from '@nestjs/common';
import { DiscoverController } from './discover.controller';
import { DiscoverService } from './discover.service';
import { AffinityService } from './affinity.service';
import { DailyLimitsService } from './daily-limits.service';
import { BoostService } from './boost.service';
import { CatalogModule } from '../catalog/catalog.module';
import { MediaModule } from '../media/media.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [CatalogModule, MediaModule, SubscriptionsModule],
  controllers: [DiscoverController],
  providers: [DiscoverService, AffinityService, DailyLimitsService, BoostService],
  exports: [DiscoverService, AffinityService, DailyLimitsService, BoostService],
})
export class DiscoverModule {}
