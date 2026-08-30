import { Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { LegalService } from './legal.service';

@Module({
  controllers: [PrivacyController],
  providers: [PrivacyService, LegalService],
  exports: [PrivacyService, LegalService],
})
export class PrivacyModule {}
