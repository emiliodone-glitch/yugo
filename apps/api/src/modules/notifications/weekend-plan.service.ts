import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma.service';
import { MailerService } from '../queues/mailer.service';
import { NotificationsService } from './notifications.service';

/** Lo que el plan de domingo le propone a una persona. Todo opcional. */
export interface WeekendPlanData {
  event: { id: string; title: string; churchName: string; startsAt: Date } | null;
  devotional: { reference: string; title: string } | null;
  quietConnection: { conversationId: string; displayName: string; days: number } | null;
}

/** Días sin mensajes a partir de los cuales una conexión se sugiere retomar. */
export const QUIET_DAYS = 3;

/**
 * Plan de domingo (RF-NOT-04): los sábados a las 10:00 de Santo Domingo.
 *
 * Una razón para volver a la semana, sin racha ni penalización: el evento de
 * tu iglesia este fin de semana, el devocional de mañana y una conexión con
 * la que llevas días sin hablar. Si no hay nada de eso, no se manda nada.
 * Cuenta lo que hay alrededor de la persona, nunca lo que dejó de hacer.
 */
@Injectable()
export class WeekendPlanService {
  private readonly logger = new Logger(WeekendPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly notifications: NotificationsService,
  ) {}

  // 14:00 UTC = 10:00 en America/Santo_Domingo (sin horario de verano).
  @Cron('0 14 * * 6')
  async sendWeekendPlans() {
    const sent = await this.run();
    this.logger.log(`weekend plan: ${sent} personas avisadas`);
  }

  /** Runs one pass; returns how many plans went out. Exposed for tests and ops. */
  async run(now = new Date()): Promise<number> {
    const recipients = await this.prisma.user.findMany({
      where: {
        role: 'MEMBER',
        status: 'ACTIVE',
        deletedAt: null,
        weeklyDigestOptOutAt: null,
      },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        profile: { select: { displayName: true, city: true, churchId: true } },
      },
    });

    let sent = 0;
    for (const user of recipients) {
      if (!user.profile) continue;
      const plan = await this.collect(user.id, user.profile.city, user.profile.churchId, now);
      if (!plan.event && !plan.devotional && !plan.quietConnection) continue;

      const lines = this.lines(plan);
      await this.notifications.notify(
        user.id,
        'EVENT',
        'Tu plan de domingo',
        lines.join(' · '),
        plan.event
          ? { eventId: plan.event.id }
          : plan.quietConnection
            ? { conversationId: plan.quietConnection.conversationId }
            : undefined,
      );
      if (user.email && user.emailVerifiedAt) {
        await this.mailer.send(user.email, 'WEEKEND_PLAN', {
          displayName: user.profile.displayName,
          lines,
          eventTitle: plan.event?.title,
          eventChurch: plan.event?.churchName,
          eventWhen: plan.event ? formatWhen(plan.event.startsAt) : undefined,
          devotionalReference: plan.devotional?.reference,
          devotionalTitle: plan.devotional?.title,
          quietName: plan.quietConnection?.displayName,
          quietDays: plan.quietConnection?.days,
        });
      }
      sent += 1;
    }
    return sent;
  }

  async collect(
    userId: string,
    city: string | null,
    churchId: string | null,
    now: Date,
  ): Promise<WeekendPlanData> {
    const weekendEnd = new Date(now.getTime() + 2 * 86_400_000);
    const tomorrow = new Date(now.getTime() + 86_400_000);
    const tomorrowKey = tomorrow.toISOString().slice(0, 10);
    const quietSince = new Date(now.getTime() - QUIET_DAYS * 86_400_000);

    const [event, devotional, matches] = await Promise.all([
      this.prisma.event.findFirst({
        where: {
          status: 'PUBLISHED',
          startsAt: { gte: now, lte: weekendEnd },
          OR: [...(churchId ? [{ churchId }] : []), ...(city ? [{ city }] : [])],
        },
        // La propia iglesia primero; si no, la más próxima en el tiempo.
        orderBy: [{ startsAt: 'asc' }],
        include: { church: { select: { name: true } } },
      }),
      this.prisma.devotional.findFirst({
        where: { publishOn: new Date(`${tomorrowKey}T00:00:00.000Z`) },
        select: { reference: true, title: true },
      }),
      this.prisma.match.findMany({
        where: {
          status: 'ACTIVE',
          createdAt: { lt: quietSince },
          OR: [{ userAId: userId }, { userBId: userId }],
        },
        include: {
          conversation: {
            include: { messages: { orderBy: { sentAt: 'desc' }, take: 1 } },
          },
          userA: { select: { profile: { select: { displayName: true } } } },
          userB: { select: { profile: { select: { displayName: true } } } },
        },
        take: 20,
      }),
    ]);

    let quiet: WeekendPlanData['quietConnection'] = null;
    for (const match of matches) {
      const conversation = match.conversation;
      if (!conversation) continue;
      const last = conversation.messages[0]?.sentAt ?? match.createdAt;
      if (last > quietSince) continue;
      const days = Math.floor((now.getTime() - last.getTime()) / 86_400_000);
      const other = match.userAId === userId ? match.userB : match.userA;
      if (!quiet || days > quiet.days) {
        quiet = {
          conversationId: conversation.id,
          displayName: other.profile?.displayName ?? 'tu conexión',
          days,
        };
      }
    }

    return {
      event: event
        ? {
            id: event.id,
            title: event.title,
            churchName: event.church.name,
            startsAt: event.startsAt,
          }
        : null,
      devotional,
      quietConnection: quiet,
    };
  }

  /** Frases cortas, en el orden en que ayudan: el plan, la Palabra, la persona. */
  lines(plan: WeekendPlanData): string[] {
    const lines: string[] = [];
    if (plan.event) {
      lines.push(
        `${plan.event.title} (${plan.event.churchName}) ${formatWhen(plan.event.startsAt)}`,
      );
    }
    if (plan.devotional) {
      lines.push(`Mañana: ${plan.devotional.reference}, «${plan.devotional.title}»`);
    }
    if (plan.quietConnection) {
      lines.push(
        `${plan.quietConnection.displayName} lleva ${plan.quietConnection.days} días sin saber de ti`,
      );
    }
    return lines;
  }
}

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: process.env.APP_TIMEZONE ?? 'America/Santo_Domingo',
  }).format(date);
}
