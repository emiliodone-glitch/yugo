import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ageFromBirthDate, DiscoverFilters, ProfileCard } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { CacheService } from '../../common/cache.service';
import { SettingsService } from '../../common/settings.service';
import { AffinityService, ScorableProfile } from './affinity.service';
import { DailyLimitsService } from './daily-limits.service';
import { rankCandidates } from './rank';
import { StorageService } from '../media/storage.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PrivacyService } from '../privacy/privacy.service';
import { createHash } from 'crypto';

interface CandidateRow {
  id: string;
  distance_km: number | null;
  age: number;
}

@Injectable()
export class DiscoverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly settings: SettingsService,
    private readonly affinity: AffinityService,
    private readonly limits: DailyLimitsService,
    private readonly storage: StorageService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /**
   * Daily curated list (RF-DES-01): generated once per day per member,
   * cached in Redis until local midnight. Regenerates when search
   * preferences change because the cache key hashes them (7.2).
   */
  async getDaily(userId: string, filters: DiscoverFilters = {}): Promise<{
    items: ProfileCard[];
    total: number;
  }> {
    const viewer = await this.loadViewer(userId);
    const tier = await this.subscriptions.tierOf(userId);
    const domainLimits = await this.settings.getLimits();
    const listSize = tier === 'ORO' ? domainLimits.discoverPerDayOro : domainLimits.discoverPerDayFree;

    const prefsHash = createHash('sha1')
      .update(
        JSON.stringify({
          f: filters,
          a: [viewer.profile.ageMin, viewer.profile.ageMax],
          d: viewer.profile.maxDistanceKm,
          t: viewer.travel ? [viewer.travel.lat, viewer.travel.lng] : null,
        }),
      )
      .digest('hex')
      .slice(0, 12);
    const cacheKey = `discover:${userId}:${this.limits.localDateKey()}:${prefsHash}`;

    const cached = await this.cache.getJson<ProfileCard[]>(cacheKey);
    const cards = cached ?? (await this.generate(viewer, tier, filters, listSize));
    if (!cached) {
      await this.cache.setJson(cacheKey, cards, this.limits.secondsUntilLocalMidnight());
    }

    // The day's list is fixed on purpose — no infinite feed — but it has to
    // shrink as the member works through it. The cached list is generated once
    // and would keep showing people already marked or passed until midnight,
    // so the exclusion is applied again when serving.
    const settled = await this.settledUserIds(
      userId,
      cards.map((card) => card.userId),
    );
    const items = cards.filter((card) => !settled.has(card.userId));
    return { items, total: items.length };
  }

  /** Members of `candidateIds` this viewer already marked, passed or connected with. */
  private async settledUserIds(userId: string, candidateIds: string[]): Promise<Set<string>> {
    if (candidateIds.length === 0) return new Set();

    const [interests, passes, matches] = await Promise.all([
      this.prisma.interest.findMany({
        where: { fromUserId: userId, toUserId: { in: candidateIds } },
        select: { toUserId: true },
      }),
      this.prisma.pass.findMany({
        where: {
          fromUserId: userId,
          toUserId: { in: candidateIds },
          undoneAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { toUserId: true },
      }),
      this.prisma.match.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { userAId: userId, userBId: { in: candidateIds } },
            { userBId: userId, userAId: { in: candidateIds } },
          ],
        },
        select: { userAId: true, userBId: true },
      }),
    ]);

    const settled = new Set<string>();
    for (const row of interests) settled.add(row.toUserId);
    for (const row of passes) settled.add(row.toUserId);
    for (const row of matches) {
      settled.add(row.userAId === userId ? row.userBId : row.userAId);
    }
    return settled;
  }

  private async loadViewer(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            denomination: true,
            serviceAreas: { include: { serviceArea: true } },
          },
        },
        travelLocations: { where: { activeUntil: { gt: new Date() } }, take: 1 },
      },
    });
    if (!user?.profile) throw new NotFoundException('profile_required');
    return {
      user,
      profile: user.profile,
      age: ageFromBirthDate(user.birthDate),
      travel: user.travelLocations[0] ?? null,
    };
  }

  private async generate(
    viewer: Awaited<ReturnType<DiscoverService['loadViewer']>>,
    tier: 'FREE' | 'PLUS' | 'ORO',
    filters: DiscoverFilters,
    listSize: number,
  ): Promise<ProfileCard[]> {
    const domainLimits = await this.settings.getLimits();
    const profile = viewer.profile;
    // Travel mode (RF-DES-14) swaps the search origin.
    const origin = viewer.travel
      ? { lat: viewer.travel.lat, lng: viewer.travel.lng }
      : { lat: profile.lat, lng: profile.lng };
    const targetGender = viewer.user.gender === 'MALE' ? 'FEMALE' : 'MALE';
    const maxKm = filters.maxDistanceKm ?? profile.maxDistanceKm;

    /**
     * Candidate query. RF-DES-11 lives HERE, in SQL, in both directions:
     *   1) candidate age BETWEEN viewer.ageMin AND viewer.ageMax
     *   2) viewer age BETWEEN candidate.ageMin AND candidate.ageMax
     * No tier ever bypasses it (RF-PLU-09). Invisible profiles are excluded
     * unless they marked interest in the viewer (RF-DES-12).
     */
    const rows = await this.prisma.$queryRaw<CandidateRow[]>(Prisma.sql`
      SELECT
        u.id,
        date_part('year', age(u."birthDate"))::int AS age,
        CASE
          WHEN p.lat IS NULL OR ${origin.lat}::float8 IS NULL THEN NULL
          ELSE ST_DistanceSphere(
            ST_MakePoint(p.lng, p.lat),
            ST_MakePoint(${origin.lng}::float8, ${origin.lat}::float8)
          ) / 1000.0
        END AS distance_km
      FROM "User" u
      JOIN "Profile" p ON p."userId" = u.id
      WHERE u.id <> ${viewer.user.id}
        AND u.role = 'MEMBER'
        AND u.status = 'ACTIVE'
        AND u."deletedAt" IS NULL
        AND u.gender::text = ${targetGender}
        AND u."lastActiveAt" > now() - make_interval(days => ${domainLimits.inactivityHideDays}::int)
        AND p.completeness >= ${domainLimits.minCompleteness}
        -- RF-DES-11: strict mutual age rule (both directions, in the query)
        AND date_part('year', age(u."birthDate"))::int BETWEEN ${profile.ageMin}::int AND ${profile.ageMax}::int
        AND ${viewer.age}::int BETWEEN p."ageMin" AND p."ageMax"
        -- RF-DES-12: invisible unless they marked interest in the viewer
        AND (
          p."invisibleMode" = false
          OR EXISTS (
            SELECT 1 FROM "Interest" i
            WHERE i."fromUserId" = u.id AND i."toUserId" = ${viewer.user.id}
          )
        )
        -- Exclusions (RF-DES-08)
        AND NOT EXISTS (
          SELECT 1 FROM "Block" b
          WHERE (b."blockerId" = ${viewer.user.id} AND b."blockedId" = u.id)
             OR (b."blockerId" = u.id AND b."blockedId" = ${viewer.user.id})
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Interest" i2
          WHERE i2."fromUserId" = ${viewer.user.id} AND i2."toUserId" = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Match" m
          WHERE ((m."userAId" = ${viewer.user.id} AND m."userBId" = u.id)
              OR (m."userAId" = u.id AND m."userBId" = ${viewer.user.id}))
            AND (m.status = 'ACTIVE' OR m."endedAt" > now() - make_interval(days => ${domainLimits.reconnectCooldownDays}::int))
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Pass" ps
          WHERE ps."fromUserId" = ${viewer.user.id} AND ps."toUserId" = u.id
            AND ps."undoneAt" IS NULL AND ps."expiresAt" > now()
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Report" r
          WHERE r."reporterId" = ${viewer.user.id} AND r."targetUserId" = u.id
        )
        AND (
          p.lat IS NULL OR ${origin.lat}::float8 IS NULL
          OR ST_DistanceSphere(
               ST_MakePoint(p.lng, p.lat),
               ST_MakePoint(${origin.lng}::float8, ${origin.lat}::float8)
             ) <= ${maxKm} * 1000.0
        )
      LIMIT 400
    `);

    if (rows.length === 0) return [];

    const distanceById = new Map(rows.map((r) => [r.id, r.distance_km ?? 9999]));
    const candidates = await this.prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      include: {
        profile: {
          include: { denomination: true, church: true, serviceAreas: { include: { serviceArea: true } } },
        },
        photos: { where: { moderationStatus: 'APPROVED' }, orderBy: { position: 'asc' }, take: 1 },
        verifications: { where: { status: 'APPROVED' }, include: { church: true } },
        subscriptions: { where: { status: { in: ['ACTIVE', 'TRIAL'] }, endsAt: { gt: new Date() } } },
      },
    });

    const viewerScorable = this.toScorable(
      viewer.user.id,
      viewer.age,
      viewer.profile,
      filters.maxDistanceKm ?? viewer.profile.maxDistanceKm,
    );

    const scored: Array<{
      card: ProfileCard;
      affinityTotal: number;
      level3Verified: boolean;
      isOro: boolean;
      isFeatured: boolean;
      lastActiveAt: Date;
      userId: string;
    }> = [];

    for (const candidate of candidates) {
      if (!candidate.profile) continue;
      if (!this.applyFilters(candidate, filters, tier)) continue;

      const candidateAge = ageFromBirthDate(candidate.birthDate);
      const distanceKm = Math.round(distanceById.get(candidate.id) ?? 9999);
      const candidateScorable = this.toScorable(
        candidate.id,
        candidateAge,
        candidate.profile,
        candidate.profile.maxDistanceKm,
      );
      const breakdown = await this.affinity.score(viewerScorable, candidateScorable, distanceKm);
      if (!breakdown) continue; // incompatible intention → excluded (7.1)

      const level3 = candidate.verifications.find((v) => v.level === 3);
      const identity = candidate.verifications.some((v) => v.level === 2);
      const isOro = candidate.subscriptions.some((s) => s.tier === 'ORO');

      const viewerPractices = new Set(viewerScorable.practiceSlugs);
      const inCommon = candidate.profile.serviceAreas
        .filter((sa) => viewerPractices.has(sa.serviceArea.slug))
        .map((sa) => sa.serviceArea.name);

      scored.push({
        userId: candidate.id,
        affinityTotal: breakdown.total,
        level3Verified: !!level3,
        isOro,
        isFeatured: !!candidate.profile.featuredUntil && candidate.profile.featuredUntil > new Date(),
        lastActiveAt: candidate.lastActiveAt,
        card: {
          userId: candidate.id,
          displayName: candidate.profile.displayName,
          age: candidateAge,
          gender: candidate.gender,
          city: candidate.profile.city ?? '',
          distanceKm,
          // The candidate's own privacy setting decides what viewers read.
          distanceLabel: PrivacyService.distanceLabel(
            distanceKm,
            candidate.profile.hideExactDistance,
          ),
          occupation: candidate.profile.occupation ?? undefined,
          denomination: candidate.profile.denomination?.name ?? '',
          churchName: candidate.profile.church?.name ?? candidate.profile.churchFreeText ?? undefined,
          intention: candidate.profile.intention,
          testimony: candidate.profile.testimony ?? undefined,
          verse: candidate.profile.verse ?? undefined,
          practices: candidate.profile.serviceAreas.map((sa) => sa.serviceArea.name),
          photoUrl: candidate.photos[0]
            ? await this.storage.signDownload(candidate.photos[0].storageKey)
            : undefined,
          affinity: breakdown,
          badges: {
            contact: true,
            identity,
            endorsedBy: level3?.church?.name,
          },
          oroBadge: isOro && candidate.profile.showOroBadge,
          inCommon,
        },
      });
    }

    const domainLimits2 = await this.settings.getLimits();
    const ranked = rankCandidates(scored, domainLimits2.level3PositionBonus);
    return ranked.slice(0, listSize).map((r) => r.card);
  }

  private toScorable(
    userId: string,
    age: number,
    profile: {
      ageMin: number;
      ageMax: number;
      denomination: { slug: string; name: string } | null;
      openness: 'SAME' | 'AFFINE' | 'ALL';
      intention: 'MARRIAGE' | 'FRIENDSHIP' | 'BOTH';
      attendance: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'OCCASIONAL' | null;
      serviceAreas: Array<{ serviceArea: { slug: string } }>;
    },
    maxDistanceKm: number,
  ): ScorableProfile {
    return {
      userId,
      age,
      ageMin: profile.ageMin,
      ageMax: profile.ageMax,
      denominationSlug: profile.denomination?.slug ?? 'otra',
      denominationName: profile.denomination?.name ?? 'Otra',
      openness: profile.openness,
      intention: profile.intention,
      practiceSlugs: profile.serviceAreas.map((sa) => sa.serviceArea.slug),
      attendance: profile.attendance ?? 'OCCASIONAL',
      maxDistanceKm,
    };
  }

  /** RF-DES-06: basic filters free; advanced Plus; church filter Oro. */
  private applyFilters(
    candidate: {
      profile: {
        denominationId: string | null;
        churchId: string | null;
        hasChildren: boolean | null;
        city: string | null;
        education: string | null;
        serviceAreas: Array<{ serviceArea: { slug: string } }>;
      } | null;
      verifications: Array<{ level: number }>;
    },
    filters: DiscoverFilters,
    tier: 'FREE' | 'PLUS' | 'ORO',
  ): boolean {
    const p = candidate.profile!;
    if (filters.denominationIds?.length && (!p.denominationId || !filters.denominationIds.includes(p.denominationId))) {
      return false;
    }
    if (filters.minVerificationLevel) {
      const max = Math.max(1, ...candidate.verifications.map((v) => v.level));
      if (max < filters.minVerificationLevel) return false;
    }
    if (filters.withChildren === 'WITH' && p.hasChildren !== true) return false;
    if (filters.withChildren === 'WITHOUT' && p.hasChildren === true) return false;
    if (filters.city && p.city?.toLowerCase() !== filters.city.toLowerCase()) return false;

    // Advanced filters (Plus)
    if (tier !== 'FREE') {
      if (filters.serviceAreaSlugs?.length) {
        const slugs = new Set(p.serviceAreas.map((sa) => sa.serviceArea.slug));
        if (!filters.serviceAreaSlugs.some((s) => slugs.has(s))) return false;
      }
      if (filters.education && p.education !== filters.education) return false;
    }
    // Church/ministry filter (Oro only, 6.9)
    if (tier === 'ORO' && filters.churchId && p.churchId !== filters.churchId) return false;

    return true;
  }

  /** Profile detail + affinity breakdown; records the view for Oro (RF-DES-15). */
  async profileDetail(viewerId: string, targetId: string): Promise<ProfileCard> {
    const { items } = await this.getDaily(viewerId);
    let card = items.find((c) => c.userId === targetId);
    if (!card) {
      // Not in today's list (e.g. connection or saved profile) — build ad hoc.
      const viewer = await this.loadViewer(viewerId);
      const tier = await this.subscriptions.tierOf(viewerId);
      const single = await this.generateSingle(viewer, targetId, tier);
      if (!single) throw new NotFoundException('profile_not_visible');
      card = single;
    }
    await this.prisma.profileView.create({ data: { viewerId, viewedId: targetId } });
    return card;
  }

  private async generateSingle(
    viewer: Awaited<ReturnType<DiscoverService['loadViewer']>>,
    targetId: string,
    tier: 'FREE' | 'PLUS' | 'ORO',
  ): Promise<ProfileCard | null> {
    const cards = await this.generate(viewer, tier, {}, 1000);
    return cards.find((c) => c.userId === targetId) ?? null;
  }

  /** Oro: who viewed my profile in the last 30 days (RF-DES-15). */
  async whoViewedMe(userId: string) {
    const tier = await this.subscriptions.tierOf(userId);
    if (tier !== 'ORO') return { available: false as const, count: 0, viewers: [] };
    const since = new Date(Date.now() - 30 * 86400000);
    const views = await this.prisma.profileView.findMany({
      where: { viewedId: userId, viewedAt: { gte: since } },
      orderBy: { viewedAt: 'desc' },
      distinct: ['viewerId'],
      take: 100,
      include: { viewer: { include: { profile: true } } },
    });
    return {
      available: true as const,
      count: views.length,
      viewers: views.map((v) => ({
        userId: v.viewerId,
        displayName: v.viewer.profile?.displayName ?? 'Miembro',
        viewedAt: v.viewedAt,
      })),
    };
  }
}
