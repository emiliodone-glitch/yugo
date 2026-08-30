import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { CacheService } from './cache.service';
import { AuditService } from './audit.service';
import { SettingsService } from './settings.service';
import { ContentService } from './content.service';

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      signOptions: { expiresIn: process.env.JWT_ACCESS_TTL ?? '900s' },
    }),
  ],
  providers: [PrismaService, CacheService, AuditService, SettingsService, ContentService],
  exports: [PrismaService, CacheService, AuditService, SettingsService, ContentService],
})
export class CommonModule {}
