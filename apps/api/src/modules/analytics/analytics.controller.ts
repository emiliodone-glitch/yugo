import { Body, Controller, Headers, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';
import { AnalyticsService } from './analytics.service';
import { Public } from '../../common/decorators';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { ZodPipe } from '../../common/zod.pipe';

const batchSchema = z.object({
  anonymousId: z.string().min(8).max(64),
  platform: z.enum(['web', 'ios', 'android']).optional(),
  events: z
    .array(
      z.object({
        name: z.string().regex(/^[a-z][a-z0-9_]{2,47}$/),
        props: z.record(z.unknown()).optional(),
        at: z.string().datetime().optional(),
      }),
    )
    .min(1)
    .max(50),
});

/**
 * Ingesta de eventos de producto. Pública porque el embudo empieza antes de
 * tener cuenta (bienvenida, registro); si viene un token válido, el evento
 * lleva el hash del usuario para unir el antes y el después.
 */
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @RateLimit({ limit: 120, windowSeconds: 60 })
  @Post('events')
  async ingest(
    @Body(new ZodPipe(batchSchema)) body: z.infer<typeof batchSchema>,
    @Headers('authorization') authorization?: string,
  ) {
    let userId: string | null = null;
    if (authorization?.startsWith('Bearer ')) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string }>(authorization.slice(7));
        userId = payload.sub;
      } catch {
        userId = null;
      }
    }
    return this.analytics.ingest(body.anonymousId, body.platform, userId, body.events);
  }
}
