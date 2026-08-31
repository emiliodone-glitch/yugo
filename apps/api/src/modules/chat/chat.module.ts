import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { IcebreakersService } from './icebreakers.service';
import { RelationshipService } from './relationship.service';
import { AccompanimentService } from './accompaniment.service';
import { MeetingPlanService } from './meeting-plan.service';
import { AccompanimentController } from './accompaniment.controller';
import { ModerationModule } from '../moderation/moderation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [ModerationModule, NotificationsModule, SubscriptionsModule, MediaModule],
  controllers: [ChatController, AccompanimentController],
  providers: [ChatService, ChatGateway, IcebreakersService, RelationshipService, AccompanimentService, MeetingPlanService],
  exports: [ChatService],
})
export class ChatModule {}
