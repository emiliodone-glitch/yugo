import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { AnswersService } from './answers.service';
import { VoiceService } from './voice.service';
import { ModerationModule } from '../moderation/moderation.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [ModerationModule, MediaModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, AnswersService, VoiceService],
  exports: [ProfilesService, AnswersService, VoiceService],
})
export class ProfilesModule {}
