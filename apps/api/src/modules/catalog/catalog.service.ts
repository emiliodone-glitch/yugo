import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CacheService } from '../../common/cache.service';

/**
 * Read side of the administrable catalogs (RF-ADM-07): denominations and
 * their affinity matrix, service areas, group categories, approved churches.
 */
@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async denominations() {
    return this.prisma.denomination.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }

  async serviceAreas() {
    return this.prisma.serviceArea.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }

  async groupCategories() {
    return this.prisma.groupCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }

  async churches(query?: string) {
    return this.prisma.church.findMany({
      where: {
        status: 'APPROVED',
        ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
      },
      select: { id: true, name: true, city: true, denomination: { select: { name: true } } },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  /**
   * Denomination affinity lookup used by AffinityService. Cached as a flat
   * map `slugA|slugB -> value` (symmetric).
   */
  async denominationAffinityMap(): Promise<Record<string, number>> {
    const cached = await this.cache.getJson<Record<string, number>>('catalog:denom-affinity');
    if (cached) return cached;
    const rows = await this.prisma.denominationAffinity.findMany({
      include: { a: { select: { slug: true } }, b: { select: { slug: true } } },
    });
    const map: Record<string, number> = {};
    for (const row of rows) {
      map[`${row.a.slug}|${row.b.slug}`] = row.value;
      map[`${row.b.slug}|${row.a.slug}`] = row.value;
    }
    await this.cache.setJson('catalog:denom-affinity', map, 300);
    return map;
  }

  async covenant() {
    return this.prisma.legalDocument.findFirst({
      where: { kind: 'COVENANT' },
      orderBy: { activeFrom: 'desc' },
    });
  }
}
