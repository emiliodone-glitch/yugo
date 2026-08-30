import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { PhotosController } from './photos.controller';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [ModerationModule],
  controllers: [PhotosController],
  providers: [StorageService],
  exports: [StorageService],
})
export class MediaModule {}
