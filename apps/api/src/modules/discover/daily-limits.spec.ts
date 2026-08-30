import { DailyLimitsService } from './daily-limits.service';
import { CacheService } from '../../common/cache.service';

const settingsStub = {
  getLimits: async () => ({
    dailyInterestsFree: 8,
    discoverPerDayFree: 30,
    discoverPerDayOro: 60,
    undoPassPerDayOro: 5,
    passHideDays: 30,
    reconnectCooldownDays: 90,
    inactivityHideDays: 60,
    minCompleteness: 60,
    ageRangeDefaultOffsets: [-5, 7] as [number, number],
    ageRangeMinSpan: 3,
    level3PositionBonus: 5,
  }),
};

function makeService(): DailyLimitsService {
  // CacheService falls back to in-memory when REDIS_URL is unset (test env).
  const cache = new CacheService();
  return new DailyLimitsService(cache, settingsStub as never);
}

describe('DailyLimitsService (RF-DES-05, 7.2)', () => {
  const originalEnv = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });
  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('free tier allows exactly 8 interests, then blocks', async () => {
    const service = makeService();
    for (let i = 1; i <= 8; i += 1) {
      const result = await service.consumeInterest('u1', 'FREE');
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(i);
      expect(result.limit).toBe(8);
    }
    const ninth = await service.consumeInterest('u1', 'FREE');
    expect(ninth.allowed).toBe(false);
    expect(ninth.used).toBe(8);
  });

  it('Plus and Oro are unlimited (limit null)', async () => {
    const service = makeService();
    for (let i = 0; i < 20; i += 1) {
      const result = await service.consumeInterest('u2', 'ORO');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
    }
  });

  it('refund restores a consumed interest', async () => {
    const service = makeService();
    for (let i = 0; i < 8; i += 1) await service.consumeInterest('u3', 'FREE');
    await service.refundInterest('u3');
    const again = await service.consumeInterest('u3', 'FREE');
    expect(again.allowed).toBe(true);
  });

  it('undo pass is capped at 5/day for Oro (RF-DES-13)', async () => {
    const service = makeService();
    for (let i = 1; i <= 5; i += 1) {
      const result = await service.consumeUndo('u4');
      expect(result.allowed).toBe(true);
    }
    const sixth = await service.consumeUndo('u4');
    expect(sixth.allowed).toBe(false);
  });

  it('counters reset at midnight America/Santo_Domingo: TTL is till local midnight', () => {
    const service = makeService();
    // 2026-08-30 03:59:00Z is 23:59 in Santo Domingo (UTC-4) → 60 s to reset.
    const almostMidnight = new Date('2026-08-30T03:59:00Z');
    const seconds = service.secondsUntilLocalMidnight(almostMidnight);
    expect(seconds).toBe(60);
    // Noon local → 12 hours to midnight.
    const noon = new Date('2026-08-30T16:00:00Z');
    expect(service.secondsUntilLocalMidnight(noon)).toBe(12 * 3600);
  });

  it('the key date matches the Santo Domingo calendar day', () => {
    const service = makeService();
    // 03:00Z on Aug 30 is still Aug 29 in Santo Domingo.
    expect(service.localDateKey(new Date('2026-08-30T03:00:00Z'))).toBe('2026-08-29');
    expect(service.localDateKey(new Date('2026-08-30T05:00:00Z'))).toBe('2026-08-30');
  });
});
