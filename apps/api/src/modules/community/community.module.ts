import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { ModerationModule } from '../moderation/moderation.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ModerationModule, NotificationsModule],
  controllers: [CommunityController, StoriesController],
  providers: [CommunityService, StoriesService],
  exports: [CommunityService],
})
export class CommunityModule {}
