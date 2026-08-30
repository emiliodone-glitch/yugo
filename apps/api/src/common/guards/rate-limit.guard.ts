import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { CacheService } from '../cache.service';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  /** Allowed requests inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/** Per-route override, e.g. @RateLimit({ limit: 5, windowSeconds: 3600 }). */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

const DEFAULT_LIMIT: RateLimitOptions = { limit: 120, windowSeconds: 60 };

/**
 * Global rate limiting (RNF-04, Hito 14). Counts per authenticated user when
 * available and per IP otherwise, in the shared cache so it holds across API
 * instances. Sensitive routes tighten it with @RateLimit.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly cache: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request?.method) return true; // non-HTTP contexts (websockets, cron)

    const options =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_LIMIT;

    const identity = request.user?.id ?? request.ip ?? 'anonymous';
    const route = `${request.method}:${context.getClass().name}.${context.getHandler().name}`;
    const bucket = Math.floor(Date.now() / (options.windowSeconds * 1000));
    const key = `ratelimit:${route}:${identity}:${bucket}`;

    const hits = await this.cache.incr(key, options.windowSeconds);
    if (hits > options.limit) {
      throw new HttpException(
        { message: 'rate_limited', retryAfterSeconds: options.windowSeconds },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
