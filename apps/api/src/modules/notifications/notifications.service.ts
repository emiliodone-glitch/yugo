import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { NotificationCategory } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { QueueService } from '../queues/queue.service';

const TIMEZONE = 'America/Santo_Domingo';

export interface QuietHours {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export const DEFAULT_QUIET_HOURS: QuietHours = { enabled: true, startHour: 22, endHour: 7 };

/** Local hour and minute in Santo Domingo, whatever the server's timezone is. */
export function localTime(now: Date, timeZone = TIMEZONE): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  // Midnight can come back as hour 24 in some ICU versions.
  return { hour: value('hour') % 24, minute: value('minute') };
}

/**
 * Milliseconds a push must wait for the quiet window to close, or 0 when it
 * can go out now. The window wraps midnight (22:00 → 07:00), which is why it
 * cannot be a simple `start <= hour < end`.
 */
export function quietHoursDelayMs(quiet: QuietHours, now: Date, timeZone = TIMEZONE): number {
  if (!quiet.enabled) return 0;
  if (quiet.startHour === quiet.endHour) return 0;

  const { hour, minute } = localTime(now, timeZone);
  const wraps = quiet.startHour > quiet.endHour;
  const inside = wraps
    ? hour >= quiet.startHour || hour < quiet.endHour
    : hour >= quiet.startHour && hour < quiet.endHour;
  if (!inside) return 0;

  const hoursUntilEnd = (quiet.endHour - hour + 24) % 24;
  return hoursUntilEnd * 3_600_000 - minute * 60_000;
}

/**
 * In-app notification center + push fan-out (RF-NOT-01/02). Push goes through
 * Expo's push API when tokens exist; it respects the per-category preferences
 * and holds anything raised inside the quiet-hours window until it closes —
 * the notification is always stored, only the push waits.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
  ) {}

  onModuleInit() {
    this.queues.register('push', async (payload) => {
      await this.sendPush(
        payload.userId as string,
        payload.title as string,
        payload.body as string,
        payload.data,
      );
    });
  }

  async notify(
    userId: string,
    category: NotificationCategory,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const [preference, quiet] = await Promise.all([
      this.prisma.notificationPreference.findUnique({
        where: { userId_category: { userId, category } },
      }),
      this.prisma.notificationQuietHours.findUnique({ where: { userId } }),
    ]);

    const notification = await this.prisma.notification.create({
      data: { userId, category, title, body, data: data as never },
    });

    if (preference?.push !== false) {
      // Fan-out runs on the queue so a slow push provider never delays the
      // request that triggered the notification, and quiet hours postpone it
      // instead of losing it (RF-NOT-02).
      const delay = quietHoursDelayMs(quiet ?? DEFAULT_QUIET_HOURS, new Date());
      await this.queues.add('push', { userId, title, body, data }, delay);
    }
    return notification;
  }

  private async sendPush(userId: string, title: string, body: string, data?: unknown) {
    const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.EXPO_ACCESS_TOKEN
          ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(
        tokens.map((t) => ({ to: t.token, title, body, data, sound: 'default' })),
      ),
    });
  }

  async list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async registerPushToken(userId: string, token: string, platform: string) {
    await this.prisma.pushToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
    return { ok: true };
  }

  async preferences(userId: string) {
    return this.prisma.notificationPreference.findMany({ where: { userId } });
  }

  async setPreference(userId: string, category: NotificationCategory, push: boolean, email: boolean) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_category: { userId, category } },
      update: { push, email },
      create: { userId, category, push, email },
    });
  }

  /** RF-NOT-02: the quiet-hours window, defaulted for members who never set it. */
  async quietHours(userId: string): Promise<QuietHours> {
    const stored = await this.prisma.notificationQuietHours.findUnique({ where: { userId } });
    return stored
      ? { enabled: stored.enabled, startHour: stored.startHour, endHour: stored.endHour }
      : DEFAULT_QUIET_HOURS;
  }

  async setQuietHours(userId: string, input: QuietHours): Promise<QuietHours> {
    const startHour = Math.min(23, Math.max(0, Math.trunc(input.startHour)));
    const endHour = Math.min(23, Math.max(0, Math.trunc(input.endHour)));
    const saved = await this.prisma.notificationQuietHours.upsert({
      where: { userId },
      update: { enabled: input.enabled, startHour, endHour },
      create: { userId, enabled: input.enabled, startHour, endHour },
    });
    return { enabled: saved.enabled, startHour: saved.startHour, endHour: saved.endHour };
  }
}
