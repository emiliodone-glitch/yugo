import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma.service';
import { MailerService } from '../queues/mailer.service';

/** What one member's week looked like, in the numbers the digest shows. */
export interface WeeklyDigestData {
  newInterests: number;
  newConnections: number;
  unreadMessages: number;
  upcomingEvents: number;
  prayersReceived: number;
  devotionalTitle: string | null;
}

/**
 * Resumen semanal por correo (RF-NOT-03).
 *
 * Lunes a las 9:00 de Santo Domingo. Cuenta lo que pasó alrededor de la
 * persona, no lo que la persona dejó de hacer: nada de rachas ni de «te
 * perdiste», y si la semana estuvo vacía no se manda nada, porque un correo
 * que dice «0 y 0» solo sirve para que alguien se dé de baja.
 */
@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  // 13:00 UTC = 09:00 en America/Santo_Domingo (sin horario de verano).
  @Cron('0 13 * * 1')
  async sendWeeklyDigests() {
    const sent = await this.run();
    this.logger.log(`weekly digest: ${sent} correos encolados`);
  }

  /** Runs one pass; returns how many digests were queued. Exposed for tests and ops. */
  async run(now = new Date()): Promise<number> {
    const since = new Date(now.getTime() - 7 * 86_400_000);
    const recipients = await this.prisma.user.findMany({
      where: {
        role: 'MEMBER',
        status: 'ACTIVE',
        deletedAt: null,
        email: { not: null },
        emailVerifiedAt: { not: null },
        weeklyDigestOptOutAt: null,
      },
      select: { id: true, email: true, profile: { select: { displayName: true, city: true } } },
    });

    let sent = 0;
    for (const user of recipients) {
      const data = await this.collect(user.id, user.profile?.city ?? null, since, now);
      const total =
        data.newInterests +
        data.newConnections +
        data.unreadMessages +
        data.upcomingEvents +
        data.prayersReceived;
      if (total === 0 && !data.devotionalTitle) continue;
      await this.mailer.send(user.email as string, 'WEEKLY_DIGEST', {
        displayName: user.profile?.displayName ?? undefined,
        ...data,
      });
      sent += 1;
    }
    return sent;
  }

  async collect(
    userId: string,
    city: string | null,
    since: Date,
    now: Date,
  ): Promise<WeeklyDigestData> {
    const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
    const [
      newInterests,
      newConnections,
      unreadMessages,
      upcomingEvents,
      prayersReceived,
      devotional,
    ] = await Promise.all([
      this.prisma.interest.count({
        where: { toUserId: userId, createdAt: { gte: since } },
      }),
      this.prisma.match.count({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
          createdAt: { gte: since },
        },
      }),
      this.prisma.message.count({
        where: {
          senderId: { not: userId },
          moderationStatus: 'APPROVED',
          readAt: null,
          conversation: { match: { OR: [{ userAId: userId }, { userBId: userId }] } },
        },
      }),
      this.prisma.event.count({
        where: {
          status: 'PUBLISHED',
          startsAt: { gte: now, lte: weekAhead },
          ...(city ? { city } : {}),
        },
      }),
      this.prisma.prayerIntercession.count({
        where: { request: { userId }, userId: { not: userId }, createdAt: { gte: since } },
      }),
      this.prisma.devotional.findFirst({
        where: { publishOn: { lte: now } },
        orderBy: { publishOn: 'desc' },
        select: { title: true },
      }),
    ]);
    return {
      newInterests,
      newConnections,
      unreadMessages,
      upcomingEvents,
      prayersReceived,
      devotionalTitle: devotional?.title ?? null,
    };
  }
}
