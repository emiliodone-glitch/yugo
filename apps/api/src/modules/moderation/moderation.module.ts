import { Module } from '@nestjs/common';
import { TextModerationService } from './text-moderation.service';
import { ImageModerationService } from './image-moderation.service';
import { SanctionsService } from './sanctions.service';
import { PurposeService } from './purpose.service';
import { PurposeController } from './purpose.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PurposeController],
  providers: [TextModerationService, ImageModerationService, SanctionsService, PurposeService],
  exports: [TextModerationService, ImageModerationService, SanctionsService, PurposeService],
})
export class ModerationModule {}
