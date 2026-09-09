import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { DigestService } from './digest.service';
import { WeekendPlanService } from './weekend-plan.service';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [QueuesModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, DigestService, WeekendPlanService],
  exports: [NotificationsService, DigestService, WeekendPlanService],
})
export class NotificationsModule {}
