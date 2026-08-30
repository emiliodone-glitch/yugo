import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { AnswersService } from './answers.service';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [ModerationModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, AnswersService],
  exports: [ProfilesService, AnswersService],
})
export class ProfilesModule {}
