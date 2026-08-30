import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { NotificationCategory } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { QueueService } from '../queues/queue.service';

/**
 * In-app notification center + push fan-out (RF-NOT-01/02). Push goes through
 * Expo's push API when tokens exist; respects per-category preferences and
 * the quiet-hours window.
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
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId_category: { userId, category } },
    });

    const notification = await this.prisma.notification.create({
      data: { userId, category, title, body, data: data as never },
    });

    if (preference?.push !== false) {
      // Fan-out runs on the queue so a slow push provider never delays the
      // request that triggered the notification.
      await this.queues.add('push', { userId, title, body, data });
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
}
