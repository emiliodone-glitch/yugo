import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES, LIMITS } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  private typeName(slug: string): string {
    return EVENT_TYPES.find((t) => t.slug === slug)?.name ?? slug;
  }

  /** RF-EVE-03: agenda with distance and connection presence (RF-EVE-05). */
  async agenda(
    userId: string,
    filters: { type?: string; maxKm?: number; from?: Date; to?: Date } = {},
  ) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    const events = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startsAt: { gte: filters.from ?? new Date(), ...(filters.to ? { lte: filters.to } : {}) },
        ...(filters.type ? { type: filters.type as never } : {}),
      },
      orderBy: { startsAt: 'asc' },
      include: {
        church: { select: { name: true } },
        attendances: { include: { user: { include: { profile: { select: { displayName: true, allowEventPresenceVisible: true } } } } } },
      },
      take: 60,
    });

    // Connections of the viewer, to show "N de tus conexiones asistirán".
    const matches = await this.prisma.match.findMany({
      where: { status: 'ACTIVE', OR: [{ userAId: userId }, { userBId: userId }] },
    });
    const connectionIds = new Set(
      matches.map((m) => (m.userAId === userId ? m.userBId : m.userAId)),
    );

    return events
      .map((event) => {
        const distanceKm =
          profile?.lat != null && event.lat != null
            ? Math.round(haversineKm(profile.lat, profile.lng!, event.lat, event.lng!))
            : undefined;
        if (filters.maxKm && distanceKm !== undefined && distanceKm > filters.maxKm) return null;
        const going = event.attendances.filter((a) => a.status === 'GOING');
        const interested = event.attendances.filter((a) => a.status === 'INTERESTED');
        const mine = event.attendances.find((a) => a.userId === userId);
        // RF-EVE-05: only connections who allow presence visibility.
        const connectionsGoing = going
          .filter(
            (a) =>
              connectionIds.has(a.userId) && a.user.profile?.allowEventPresenceVisible !== false,
          )
          .map((a) => ({ userId: a.userId, displayName: a.user.profile?.displayName ?? 'Miembro' }));
        return {
          id: event.id,
          title: event.title,
          type: event.type,
          typeName: this.typeName(event.type),
          startsAt: event.startsAt,
          endsAt: event.endsAt ?? undefined,
          churchName: event.church.name,
          city: event.city ?? '',
          address: event.address ?? undefined,
          distanceKm,
          costLabel: event.costAmount
            ? `${event.costCurrency === 'USD' ? 'US$' : 'RD$'}${Number(event.costAmount).toLocaleString('es-DO')}`
            : 'Gratis',
          goingCount: going.length,
          interestedCount: interested.length,
          myStatus: mine?.status,
          connectionsGoing,
          lat: event.lat ?? undefined,
          lng: event.lng ?? undefined,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }

  /** RF-EVE-04: mark attendance; Oro gets priority reservation with capacity (6.9). */
  async setAttendance(userId: string, eventId: string, status: 'GOING' | 'INTERESTED' | null) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { _count: { select: { attendances: { where: { status: 'GOING' } } } } },
    });
    if (!event || event.status !== 'PUBLISHED') throw new NotFoundException();

    if (status === null) {
      await this.prisma.eventAttendance.deleteMany({ where: { eventId, userId } });
      return { status: null };
    }

    if (status === 'GOING' && event.capacity && event._count.attendances >= event.capacity) {
      const tier = await this.subscriptions.tierOf(userId);
      if (tier !== 'ORO') throw new BadRequestException('event_full');
      // Oro priority reservation: allowed into a small reserved buffer.
    }

    await this.prisma.eventAttendance.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status },
      create: { eventId, userId, status },
    });
    return { status };
  }

  /** RF-EVE-06: QR check-in; feeds portal metrics. */
  async checkIn(userId: string, qrToken: string) {
    const event = await this.prisma.event.findUnique({ where: { qrToken } });
    if (!event) throw new NotFoundException('invalid_qr');
    await this.prisma.eventAttendance.upsert({
      where: { eventId_userId: { eventId: event.id, userId } },
      update: { checkedInAt: new Date() },
      create: { eventId: event.id, userId, status: 'GOING', checkedInAt: new Date() },
    });
    return { checkedIn: true, eventTitle: event.title };
  }

  /** Daily reminder sweep (RF-EVE-04): push 24 h before start. */
  async sendReminders() {
    const windowStart = new Date(Date.now() + (LIMITS.EVENT_REMINDER_HOURS - 1) * 3600_000);
    const windowEnd = new Date(Date.now() + LIMITS.EVENT_REMINDER_HOURS * 3600_000);
    const attendances = await this.prisma.eventAttendance.findMany({
      where: {
        status: 'GOING',
        reminderSentAt: null,
        event: { status: 'PUBLISHED', startsAt: { gte: windowStart, lte: windowEnd } },
      },
      include: { event: true },
    });
    for (const attendance of attendances) {
      await this.notifications.notify(
        attendance.userId,
        'EVENT',
        'Recordatorio de evento',
        `${attendance.event.title} es mañana.`,
        { eventId: attendance.eventId },
      );
      await this.prisma.eventAttendance.update({
        where: { eventId_userId: { eventId: attendance.eventId, userId: attendance.userId } },
        data: { reminderSentAt: new Date() },
      });
    }
    return attendances.length;
  }

  async featured() {
    return this.prisma.event.findMany({
      where: { status: 'PUBLISHED', featured: true, startsAt: { gt: new Date() } },
      include: { church: { select: { name: true } } },
      orderBy: { startsAt: 'asc' },
      take: 5,
    });
  }
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
