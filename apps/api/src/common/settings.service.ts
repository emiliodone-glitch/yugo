import { Injectable } from '@nestjs/common';
import {
  AffinityWeights,
  CONVERSATION_QUESTIONS,
  DEFAULT_AFFINITY_WEIGHTS,
  DEFAULT_PRICES,
  LIMITS,
  PriceTable,
  ProfileQuestion,
  SETTING_KEYS,
} from '@yugo/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { CacheService } from './cache.service';

export interface DomainLimits {
  dailyInterestsFree: number;
  discoverPerDayFree: number;
  discoverPerDayOro: number;
  undoPassPerDayOro: number;
  passHideDays: number;
  reconnectCooldownDays: number;
  inactivityHideDays: number;
  minCompleteness: number;
  ageRangeDefaultOffsets: [number, number];
  ageRangeMinSpan: number;
  level3PositionBonus: number;
}

export interface ModerationThresholds {
  hold: number;
  reject: number;
  rejectionsForWarning: number;
  rejectionWindowDays: number;
}

const DEFAULT_LIMITS: DomainLimits = {
  dailyInterestsFree: LIMITS.DAILY_INTERESTS_FREE,
  discoverPerDayFree: LIMITS.DISCOVER_PER_DAY_FREE,
  discoverPerDayOro: LIMITS.DISCOVER_PER_DAY_ORO,
  undoPassPerDayOro: LIMITS.UNDO_PASS_PER_DAY_ORO,
  passHideDays: LIMITS.PASS_HIDE_DAYS,
  reconnectCooldownDays: LIMITS.RECONNECT_COOLDOWN_DAYS,
  inactivityHideDays: LIMITS.INACTIVITY_HIDE_DAYS,
  minCompleteness: LIMITS.MIN_COMPLETENESS_FOR_DISCOVER,
  ageRangeDefaultOffsets: [
    LIMITS.AGE_RANGE_DEFAULT_OFFSET_MIN,
    LIMITS.AGE_RANGE_DEFAULT_OFFSET_MAX,
  ],
  ageRangeMinSpan: LIMITS.AGE_RANGE_MIN_SPAN,
  level3PositionBonus: LIMITS.LEVEL3_POSITION_BONUS,
};

const DEFAULT_THRESHOLDS: ModerationThresholds = {
  hold: LIMITS.MODERATION_HOLD_THRESHOLD,
  reject: LIMITS.MODERATION_REJECT_THRESHOLD,
  rejectionsForWarning: LIMITS.REJECTIONS_FOR_WARNING,
  rejectionWindowDays: LIMITS.REJECTION_WINDOW_DAYS,
};

/**
 * Administrable settings (RF-ADM-08) read from the `Setting` table with a
 * short cache; falls back to compiled defaults so the API also runs before
 * seeding.
 */
@Injectable()
export class SettingsService {
  private static CACHE_TTL_S = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private async read<T>(key: string, fallback: T): Promise<T> {
    const cacheKey = `setting:${key}`;
    const cached = await this.cache.getJson<T>(cacheKey);
    if (cached !== null) return cached;
    try {
      const row = await this.prisma.setting.findUnique({ where: { key } });
      const value = (row?.value as T) ?? fallback;
      await this.cache.setJson(cacheKey, value, SettingsService.CACHE_TTL_S);
      return value;
    } catch {
      return fallback;
    }
  }

  async getAffinityWeights(): Promise<AffinityWeights> {
    return this.read<AffinityWeights>(SETTING_KEYS.AFFINITY_WEIGHTS, {
      ...DEFAULT_AFFINITY_WEIGHTS,
    });
  }

  async getLimits(): Promise<DomainLimits> {
    return this.read<DomainLimits>(SETTING_KEYS.LIMITS, DEFAULT_LIMITS);
  }

  async getModerationThresholds(): Promise<ModerationThresholds> {
    return this.read<ModerationThresholds>(SETTING_KEYS.MODERATION_THRESHOLDS, DEFAULT_THRESHOLDS);
  }

  async getCovenantVersion(): Promise<string> {
    return this.read<string>(SETTING_KEYS.COVENANT_VERSION, '1.0');
  }

  async getPrices(): Promise<PriceTable> {
    return this.read<PriceTable>(SETTING_KEYS.PRICES, DEFAULT_PRICES);
  }

  /**
   * Profile questions catalog (RF-PER-09). Editable from the panel; a broken
   * override (not an array, entries without key/question) falls back to the
   * compiled list so a typo in the admin never empties the screen.
   */
  async getProfileQuestions(): Promise<ProfileQuestion[]> {
    const stored = await this.read<unknown>(SETTING_KEYS.PROFILE_QUESTIONS, null);
    if (!Array.isArray(stored)) return CONVERSATION_QUESTIONS;
    const valid = stored.filter(
      (q): q is ProfileQuestion =>
        !!q &&
        typeof q === 'object' &&
        typeof (q as ProfileQuestion).key === 'string' &&
        /^[a-z0-9_]{2,40}$/.test((q as ProfileQuestion).key) &&
        typeof (q as ProfileQuestion).question === 'string' &&
        (q as ProfileQuestion).question.trim().length >= 5,
    );
    if (valid.length < 3) return CONVERSATION_QUESTIONS;
    return valid.map((q) => ({
      key: q.key,
      question: q.question.trim(),
      maxLength: Math.min(400, Math.max(60, Number(q.maxLength) || 200)),
    }));
  }

  async update(key: string, value: unknown, actorId: string): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key },
      update: { value: value as Prisma.InputJsonValue, updatedBy: actorId },
      create: { key, value: value as Prisma.InputJsonValue, updatedBy: actorId },
    });
    await this.cache.del(`setting:${key}`);
  }
}
