import { Module } from '@nestjs/common';
import { TextModerationService } from './text-moderation.service';
import { ImageModerationService } from './image-moderation.service';
import { SanctionsService } from './sanctions.service';

@Module({
  providers: [TextModerationService, ImageModerationService, SanctionsService],
  exports: [TextModerationService, ImageModerationService, SanctionsService],
})
export class ModerationModule {}
