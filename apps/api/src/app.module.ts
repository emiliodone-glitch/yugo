import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { CovenantGuard } from './common/guards/covenant.guard';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { MediaModule } from './modules/media/media.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { DiscoverModule } from './modules/discover/discover.module';
import { InterestsModule } from './modules/interests/interests.module';
import { ChatModule } from './modules/chat/chat.module';
import { CommunityModule } from './modules/community/community.module';
import { EventsModule } from './modules/events/events.module';
import { VerificationModule } from './modules/verification/verification.module';
import { ChurchesModule } from './modules/churches/churches.module';
import { AdminModule } from './modules/admin/admin.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { QueuesModule } from './modules/queues/queues.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    CommonModule,
    QueuesModule,
    HealthModule,
    AuthModule,
    ProfilesModule,
    CatalogModule,
    MediaModule,
    ModerationModule,
    DiscoverModule,
    InterestsModule,
    ChatModule,
    CommunityModule,
    EventsModule,
    VerificationModule,
    ChurchesModule,
    AdminModule,
    SubscriptionsModule,
    NotificationsModule,
    PrivacyModule,
  ],
  providers: [
    // Order matters: rate limit → auth → roles → covenant re-acceptance.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    // JWT auth is the default; use @Public() to opt out. Roles via @Roles().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CovenantGuard },
  ],
})
export class AppModule {}
