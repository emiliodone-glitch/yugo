import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { DigestService } from './digest.service';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [QueuesModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, DigestService],
  exports: [NotificationsService, DigestService],
})
export class NotificationsModule {}
