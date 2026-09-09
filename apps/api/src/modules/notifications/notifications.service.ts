import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Notification, NotificationCategory } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  serverLocale,
  serverMessage,
  type ServerMessageKey,
  type ServerMessageParams,
} from '../../common/i18n/server-messages';
import { QueueService } from '../queues/queue.service';
import { MailerService } from '../queues/mailer.service';

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

/** Called with every notification the moment it is stored (live badge). */
export type NotificationListener = (notification: Notification) => void;

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

/**
 * In-app notification center + push fan-out (RF-NOT-01/02). Push goes through
 * Expo's push API when tokens exist; it respects the per-category preferences
 * and holds anything raised inside the quiet-hours window until it closes —
 * the notification is always stored, only the push waits.
 *
 * Email follows the same per-category preference (`email: true`, off by
 * default), and every stored notification is announced to live listeners so
 * an open app can update its badge without polling.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly listeners = new Set<NotificationListener>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
    private readonly mailer: MailerService,
  ) {}

  onModuleInit() {
    this.queues.register('push', async (payload) => {
      await this.sendPush(
        payload.userId as string,
        payload.title as string,
        payload.body as string,
        payload.data,
        payload.notificationId as string | undefined,
      );
    });
  }

  /** Subscribes to new notifications; returns the unsubscribe. */
  onCreated(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Sends a catalogued message in the recipient's account language (RNF-06).
   * Prefer this over `notify` for anything a person reads: the same key gives
   * Spanish or English depending on `User.locale`, and the push, the bell
   * and the email all carry the same text.
   */
  async send<K extends ServerMessageKey>(
    userId: string,
    category: NotificationCategory,
    key: K,
    ...rest: ServerMessageParams<K> extends undefined
      ? [params?: undefined, data?: Record<string, unknown>]
      : [params: ServerMessageParams<K>, data?: Record<string, unknown>]
  ) {
    const [params, data] = rest;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { locale: true },
    });
    const locale = serverLocale(user?.locale);
    const { title, body } = serverMessage(
      locale,
      key,
      ...((params === undefined ? [] : [params]) as never),
    );
    return this.notify(userId, category, title, body, data, locale);
  }

  async notify(
    userId: string,
    category: NotificationCategory,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    locale?: 'es-DO' | 'en-US',
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

    for (const listener of this.listeners) {
      try {
        listener(notification);
      } catch (error) {
        this.logger.warn(`notification listener failed: ${String(error)}`);
      }
    }

    if (preference?.push !== false) {
      // Fan-out runs on the queue so a slow push provider never delays the
      // request that triggered the notification, and quiet hours postpone it
      // instead of losing it (RF-NOT-02).
      const delay = quietHoursDelayMs(quiet ?? DEFAULT_QUIET_HOURS, new Date());
      // The category always travels, so a tapped notification always has a
      // destination even when the caller passed no specific id (RF-NOT-03).
      await this.queues.add(
        'push',
        {
          userId,
          title,
          body,
          notificationId: notification.id,
          data: { ...(data ?? {}), category },
        },
        delay,
      );
    }

    if (preference?.email === true) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          emailVerifiedAt: true,
          locale: true,
          profile: { select: { displayName: true } },
        },
      });
      if (user?.email && user.emailVerifiedAt) {
        await this.mailer.send(
          user.email,
          'NOTIFICATION',
          {
            displayName: user.profile?.displayName ?? undefined,
            title,
            body,
          },
          locale ?? serverLocale(user.locale),
        );
      }
    }
    return notification;
  }

  private async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: unknown,
    notificationId?: string,
  ) {
    const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
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

    // Expo answers one ticket per token, in order. A device that uninstalled
    // the app comes back as DeviceNotRegistered: its token is dead and
    // keeping it only makes every future send slower.
    let tickets: ExpoTicket[] = [];
    try {
      const json = (await response.json()) as { data?: ExpoTicket[] };
      tickets = json.data ?? [];
    } catch {
      tickets = [];
    }
    const dead = tokens.filter(
      (_, index) => tickets[index]?.details?.error === 'DeviceNotRegistered',
    );
    if (dead.length > 0) {
      await this.prisma.pushToken.deleteMany({ where: { id: { in: dead.map((t) => t.id) } } });
    }
    const delivered = tickets.some((ticket) => ticket.status === 'ok');
    if (notificationId && (delivered || tickets.length === 0)) {
      await this.prisma.notification
        .update({ where: { id: notificationId }, data: { pushedAt: new Date() } })
        .catch(() => undefined);
    }
  }

  async list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Unread count for the badge; cheap enough to call on every wake. */
  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { count };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
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

  async removePushToken(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
    return { ok: true };
  }

  async preferences(userId: string) {
    return this.prisma.notificationPreference.findMany({ where: { userId } });
  }

  async setPreference(
    userId: string,
    category: NotificationCategory,
    push: boolean,
    email: boolean,
  ) {
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

  /** Resumen semanal por correo: activado por defecto, se apaga con un toque. */
  async digestSetting(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { weeklyDigestOptOutAt: true, email: true },
    });
    return { enabled: !user?.weeklyDigestOptOutAt, hasEmail: !!user?.email };
  }

  async setDigest(userId: string, enabled: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { weeklyDigestOptOutAt: enabled ? null : new Date() },
    });
    return { enabled };
  }
}
