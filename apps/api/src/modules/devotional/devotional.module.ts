import { Module } from '@nestjs/common';
import { DevotionalAdminController, DevotionalController } from './devotional.controller';
import { DevotionalService } from './devotional.service';
import { PrayerController } from './prayer.controller';
import { PrayerService } from './prayer.service';
import { ModerationModule } from '../moderation/moderation.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Lo que le da a alguien una razón para abrir Yugo un martes cualquiera,
 * aunque no haya nadie nuevo que conocer: el devocional del día y el muro de
 * oración de la comunidad.
 */
@Module({
  imports: [ModerationModule, NotificationsModule],
  controllers: [DevotionalController, DevotionalAdminController, PrayerController],
  providers: [DevotionalService, PrayerService],
  exports: [DevotionalService, PrayerService],
})
export class DevotionalModule {}
