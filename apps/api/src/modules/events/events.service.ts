import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES, LIMITS, openSeats, seatFor } from '@yugo/shared';
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
          audience: event.audience,
          capacity: event.capacity ?? undefined,
          // Cuántas plazas quedan realmente para quien no paga: decir "quedan
          // 10" cuando 10 están reservadas sería mentir con la verdad.
          openSeats:
            openSeats(
              event.capacity,
              going.length,
              (event.startsAt.getTime() - Date.now()) / 3600_000,
            ) ?? undefined,
          waitlistCount: event.attendances.filter((a) => a.status === 'WAITLIST').length,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }

  /**
   * RF-EVE-04: apuntarse a un encuentro.
   *
   * Capacity is a room with chairs in it, so nobody is ever seated past it —
   * not with any plan. Oro's priority is a reserved share *inside* the
   * capacity (see seatFor in @yugo/shared), and when the room is full the
   * person joins a waitlist instead of being told no and forgotten.
   */
  async setAttendance(userId: string, eventId: string, status: 'GOING' | 'INTERESTED' | null) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { _count: { select: { attendances: { where: { status: 'GOING' } } } } },
    });
    if (!event || event.status !== 'PUBLISHED') throw new NotFoundException();

    if (status === null) {
      const previous = await this.prisma.eventAttendance.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      await this.prisma.eventAttendance.deleteMany({ where: { eventId, userId } });
      // Cancelar libera una silla: la siguiente persona de la lista entra.
      if (previous?.status === 'GOING') await this.promoteFromWaitlist(eventId);
      return { status: null };
    }

    if (status === 'GOING') {
      // Someone already seated who taps again keeps their seat instead of
      // being re-evaluated against a capacity they are part of.
      const existing = await this.prisma.eventAttendance.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      if (existing?.status !== 'GOING') {
        const tier = await this.subscriptions.tierOf(userId);
        const outcome = seatFor({
          capacity: event.capacity,
          taken: event._count.attendances,
          tier: tier ?? 'FREE',
          hoursUntilStart: (event.startsAt.getTime() - Date.now()) / 3600_000,
        });
        if (outcome === 'waitlist') {
          await this.prisma.eventAttendance.upsert({
            where: { eventId_userId: { eventId, userId } },
            update: { status: 'WAITLIST' },
            create: { eventId, userId, status: 'WAITLIST' },
          });
          return { status: 'WAITLIST' as const, position: await this.waitlistPosition(eventId, userId) };
        }
      }
    }

    await this.prisma.eventAttendance.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status },
      create: { eventId, userId, status },
    });
    return { status };
  }

  /** Where someone stands in the queue, counting from 1. */
  private async waitlistPosition(eventId: string, userId: string): Promise<number> {
    const mine = await this.prisma.eventAttendance.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { createdAt: true },
    });
    if (!mine) return 0;
    const ahead = await this.prisma.eventAttendance.count({
      where: { eventId, status: 'WAITLIST', createdAt: { lt: mine.createdAt } },
    });
    return ahead + 1;
  }

  /**
   * A seat freed up: the person who has waited longest takes it and is told.
   *
   * Silence here would be the whole feature failing — a waitlist nobody is
   * called from is just a politer refusal.
   */
  private async promoteFromWaitlist(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { _count: { select: { attendances: { where: { status: 'GOING' } } } } },
    });
    if (!event?.capacity || event._count.attendances >= event.capacity) return;

    const next = await this.prisma.eventAttendance.findFirst({
      where: { eventId, status: 'WAITLIST' },
      orderBy: { createdAt: 'asc' },
    });
    if (!next) return;

    await this.prisma.eventAttendance.update({
      where: { eventId_userId: { eventId, userId: next.userId } },
      data: { status: 'GOING' },
    });
    await this.notifications.notify(
      next.userId,
      'EVENT',
      'Se liberó un cupo',
      `Ya tienes lugar en «${event.title}».`,
      { eventId },
    );
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

  /** RF-EVE-08: iCalendar export so the event lands in the device calendar. */
  async icsFor(eventId: string): Promise<string> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { church: { select: { name: true } } },
    });
    if (!event || event.status !== 'PUBLISHED') throw new NotFoundException();

    const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const escape = (text: string) =>
      text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const endsAt = event.endsAt ?? new Date(event.startsAt.getTime() + 2 * 3600_000);

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Yugo//Eventos//ES',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${event.id}@yugo.do`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(event.startsAt)}`,
      `DTEND:${stamp(endsAt)}`,
      `SUMMARY:${escape(event.title)}`,
      `DESCRIPTION:${escape(`${event.description ?? ''}\n\nOrganiza: ${event.church.name}`)}`,
      `LOCATION:${escape([event.address, event.city].filter(Boolean).join(', '))}`,
      `URL:${process.env.WEB_URL ?? 'https://yugo.do'}/e/${event.id}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escape(event.title)}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  /** RF-EVE-08: public payload for the shareable link (no member data). */
  async publicEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { church: { select: { name: true, city: true } }, _count: { select: { attendances: true } } },
    });
    if (!event || event.status !== 'PUBLISHED') throw new NotFoundException();
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      typeName: this.typeName(event.type),
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      address: event.address,
      city: event.city,
      lat: event.lat,
      lng: event.lng,
      churchName: event.church.name,
      costLabel: event.costAmount
        ? `${event.costCurrency === 'USD' ? 'US$' : 'RD$'}${Number(event.costAmount).toLocaleString('es-DO')}`
        : 'Gratis',
      externalUrl: event.externalUrl,
      interestedCount: event._count.attendances,
      shareUrl: `${process.env.WEB_URL ?? 'https://yugo.do'}/e/${event.id}`,
    };
  }

  /** RF-EVE-07: the events the community manager pinned to the home screen. */
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
