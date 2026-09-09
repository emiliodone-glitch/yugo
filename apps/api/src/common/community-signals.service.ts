import { Injectable } from '@nestjs/common';
import type { CommunitySignals } from '@yugo/shared';
import { PrismaService } from './prisma.service';

/**
 * Lo que dos personas ya hicieron juntas dentro de Yugo, fuera de las citas:
 * un grupo en común, orar por la misma petición, reflexionar sobre el mismo
 * devocional, coincidir en un evento. La comunidad alimentando a Descubrir y
 * a los rompehielos (RF-DES-02, RF-CON-04).
 *
 * Todo sale en lote para una lista de candidatos: cuatro consultas por
 * lista, no cuatro por tarjeta. Solo cuenta lo que la otra persona hizo en
 * público dentro de la app; una petición anónima no se atribuye a nadie.
 */
@Injectable()
export class CommunitySignalsService {
  constructor(private readonly prisma: PrismaService) {}

  async forCandidates(
    viewerId: string,
    candidateIds: string[],
  ): Promise<Map<string, CommunitySignals>> {
    const result = new Map<string, CommunitySignals>();
    if (candidateIds.length === 0) return result;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000);

    const set = (userId: string, patch: Partial<CommunitySignals>) => {
      result.set(userId, { ...(result.get(userId) ?? {}), ...patch });
    };

    // --- Grupos en común (solo activos, el nombre del primero) ------------
    const myGroups = await this.prisma.groupMember.findMany({
      where: { userId: viewerId, group: { status: 'ACTIVE' } },
      select: { groupId: true },
    });
    if (myGroups.length > 0) {
      const theirs = await this.prisma.groupMember.findMany({
        where: {
          userId: { in: candidateIds },
          groupId: { in: myGroups.map((row) => row.groupId) },
        },
        include: { group: { select: { name: true } } },
        orderBy: { joinedAt: 'asc' },
      });
      for (const row of theirs) {
        if (!result.get(row.userId)?.sharedGroup) set(row.userId, { sharedGroup: row.group.name });
      }
    }

    // --- Oraron por las mismas peticiones (30 días) -----------------------
    const myPrayers = await this.prisma.prayerIntercession.findMany({
      where: { userId: viewerId, createdAt: { gte: thirtyDaysAgo } },
      select: { requestId: true },
    });
    if (myPrayers.length > 0) {
      const shared = await this.prisma.prayerIntercession.groupBy({
        by: ['userId'],
        where: {
          userId: { in: candidateIds },
          requestId: { in: myPrayers.map((row) => row.requestId) },
        },
        _count: { requestId: true },
      });
      for (const row of shared) set(row.userId, { prayedTogether: row._count.requestId });
    }

    // --- Reflexionaron sobre el mismo devocional (30 días, ambas aprobadas) -
    const myReflections = await this.prisma.devotionalRead.findMany({
      where: {
        userId: viewerId,
        reflectionStatus: 'APPROVED',
        devotional: { publishOn: { gte: thirtyDaysAgo } },
      },
      select: { devotionalId: true },
    });
    if (myReflections.length > 0) {
      const theirs = await this.prisma.devotionalRead.findMany({
        where: {
          userId: { in: candidateIds },
          devotionalId: { in: myReflections.map((row) => row.devotionalId) },
          reflectionStatus: 'APPROVED',
        },
        include: { devotional: { select: { reference: true, publishOn: true } } },
        orderBy: { devotional: { publishOn: 'desc' } },
      });
      for (const row of theirs) {
        if (!result.get(row.userId)?.sharedDevotional) {
          set(row.userId, { sharedDevotional: row.devotional.reference });
        }
      }
    }

    // --- Coincidieron en un evento ya pasado (90 días) --------------------
    const myPast = await this.prisma.eventAttendance.findMany({
      where: {
        userId: viewerId,
        status: 'GOING',
        event: { startsAt: { lt: now, gte: ninetyDaysAgo } },
      },
      select: { eventId: true },
    });
    if (myPast.length > 0) {
      const theirs = await this.prisma.eventAttendance.findMany({
        where: {
          userId: { in: candidateIds },
          eventId: { in: myPast.map((row) => row.eventId) },
          status: 'GOING',
          user: { profile: { allowEventPresenceVisible: true } },
        },
        include: { event: { select: { title: true, startsAt: true } } },
        orderBy: { event: { startsAt: 'desc' } },
      });
      for (const row of theirs) {
        if (!result.get(row.userId)?.attendedTogether) {
          set(row.userId, { attendedTogether: row.event.title });
        }
      }
    }

    return result;
  }

  async forPair(viewerId: string, otherId: string): Promise<CommunitySignals> {
    return (await this.forCandidates(viewerId, [otherId])).get(otherId) ?? {};
  }
}
