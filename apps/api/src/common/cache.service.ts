import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Thin cache/counter abstraction over Redis. Falls back to an in-process map
 * when REDIS_URL is not reachable so local development and unit tests work
 * without infrastructure. Daily counters (interests, undo-pass) and the
 * Discover list cache live here.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private memory = new Map<string, { value: string; expiresAt: number | null }>();

  constructor() {
    const url = process.env.REDIS_URL;
    if (url && process.env.NODE_ENV !== 'test') {
      this.redis = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      this.redis.connect().catch(() => {
        this.logger.warn('Redis not reachable — using in-memory cache fallback');
        this.redis = null;
      });
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.redis) return this.redis.get(key);
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.redis) {
      if (ttlSeconds) await this.redis.set(key, value, 'EX', ttlSeconds);
      else await this.redis.set(key, value);
      return;
    }
    this.memory.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
      return;
    }
    this.memory.delete(key);
  }

  /** Atomic increment; sets TTL when the key is created. */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (this.redis) {
      const value = await this.redis.incr(key);
      if (value === 1 && ttlSeconds) await this.redis.expire(key, ttlSeconds);
      return value;
    }
    const current = Number((await this.get(key)) ?? '0') + 1;
    const existing = this.memory.get(key);
    this.memory.set(key, {
      value: String(current),
      expiresAt:
        existing?.expiresAt ?? (ttlSeconds ? Date.now() + ttlSeconds * 1000 : null),
    });
    return current;
  }

  async decr(key: string): Promise<number> {
    if (this.redis) return this.redis.decr(key);
    const current = Number((await this.get(key)) ?? '0') - 1;
    const existing = this.memory.get(key);
    this.memory.set(key, { value: String(current), expiresAt: existing?.expiresAt ?? null });
    return current;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }
}
