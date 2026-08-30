import { Injectable } from '@nestjs/common';
import { APP_TIMEZONE } from '@yugo/shared';
import { CacheService } from '../../common/cache.service';
import { SettingsService } from '../../common/settings.service';

/**
 * Daily counters in Redis, resetting at 00:00 America/Santo_Domingo
 * (RF-DES-05, 7.2). Keys carry the local date so the TTL only needs to be
 * approximate; the date in the key is what truly resets the counter.
 */
@Injectable()
export class DailyLimitsService {
  constructor(
    private readonly cache: CacheService,
    private readonly settings: SettingsService,
  ) {}

  /** Local calendar date (YYYY-MM-DD) in Santo Domingo. */
  localDateKey(now: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(now);
  }

  /** Seconds until the next local midnight in Santo Domingo (UTC−4, no DST). */
  secondsUntilLocalMidnight(now: Date = new Date()): number {
    const tzOffsetMs = 4 * 3600_000; // America/Santo_Domingo is UTC-4 year-round
    const local = new Date(now.getTime() - tzOffsetMs);
    const nextMidnightLocal = Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate() + 1,
    );
    return Math.max(60, Math.ceil((nextMidnightLocal + tzOffsetMs - now.getTime()) / 1000));
  }

  private key(kind: string, userId: string): string {
    return `daily:${kind}:${userId}:${this.localDateKey()}`;
  }

  async interestsUsed(userId: string): Promise<number> {
    return Number((await this.cache.get(this.key('interests', userId))) ?? '0');
  }

  /**
   * Consumes one interest. Returns remaining (null = unlimited for
   * Plus/Oro — RF-DES-05) or throws-like result when exhausted.
   */
  async consumeInterest(
    userId: string,
    tier: 'FREE' | 'PLUS' | 'ORO',
  ): Promise<{ allowed: boolean; used: number; limit: number | null }> {
    const limits = await this.settings.getLimits();
    if (tier !== 'FREE') {
      const used = await this.cache.incr(this.key('interests', userId), this.secondsUntilLocalMidnight());
      return { allowed: true, used, limit: null };
    }
    const limit = limits.dailyInterestsFree;
    const used = await this.cache.incr(this.key('interests', userId), this.secondsUntilLocalMidnight());
    if (used > limit) {
      await this.cache.decr(this.key('interests', userId));
      return { allowed: false, used: limit, limit };
    }
    return { allowed: true, used, limit };
  }

  async refundInterest(userId: string): Promise<void> {
    await this.cache.decr(this.key('interests', userId));
  }

  /** Oro: undo "Pasar" up to N times per day (RF-DES-13). */
  async consumeUndo(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
    const limits = await this.settings.getLimits();
    const used = await this.cache.incr(this.key('undo', userId), this.secondsUntilLocalMidnight());
    if (used > limits.undoPassPerDayOro) {
      await this.cache.decr(this.key('undo', userId));
      return { allowed: false, used: limits.undoPassPerDayOro, limit: limits.undoPassPerDayOro };
    }
    return { allowed: true, used, limit: limits.undoPassPerDayOro };
  }
}
