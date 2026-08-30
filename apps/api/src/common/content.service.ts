import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SAFETY_TIPS_V1 } from '@yugo/shared';
import { PrismaService } from './prisma.service';
import { CacheService } from './cache.service';
import { AuditService } from './audit.service';

export interface HomeBanner {
  id: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  tone: 'ink' | 'olive' | 'wheat' | 'wine';
  activeFrom?: string;
  activeUntil?: string;
}

export interface IcebreakerTemplates {
  /** Templates keyed by service-area slug, plus generic fallbacks. */
  byPractice: Record<string, string>;
  generic: string[];
}

const CONTENT_KEYS = {
  BANNERS: 'content.banners',
  ICEBREAKERS: 'content.icebreakers',
  SAFETY_TIPS: 'content.safetyTips',
} as const;

const DEFAULT_ICEBREAKERS: IcebreakerTemplates = {
  byPractice: {
    alabanza: 'Vi que sirves en alabanza, ¿cómo llegaste ahí?',
    ninos: 'Vi que sirves con niños, ¿cómo llegaste ahí?',
    jovenes: 'Vi que sirves con jóvenes, ¿qué es lo que más disfrutas de eso?',
    misiones: '¿Cuál ha sido el viaje misionero que más te marcó?',
    'servicio-social': 'Vi que te mueve el servicio social, ¿en qué proyecto andas ahora?',
    'estudio-biblico': '¿Qué libro de la Biblia estás estudiando en este tiempo?',
    medios: 'Vi que sirves en medios, ¿consola o cámara?',
    intercesion: '¿Cómo empezaste en el ministerio de intercesión?',
    oracion: '¿Cómo es tu tiempo de oración ideal?',
  },
  generic: [
    '¿Qué es lo que más agradeces a Dios este año?',
    '¿Cuál es tu plan perfecto para un sábado libre?',
    '¿Qué canción no falta en tu playlist de adoración?',
  ],
};

/**
 * RF-ADM-10: editorial content the team can change without a deploy —
 * home banners, icebreaker templates and safety tips. Stored in `Setting`
 * with a short cache, and every change is audited.
 */
@Injectable()
export class ContentService {
  private static CACHE_TTL_S = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
  ) {}

  private async read<T>(key: string, fallback: T): Promise<T> {
    const cached = await this.cache.getJson<T>(`content:${key}`);
    if (cached !== null) return cached;
    try {
      const row = await this.prisma.setting.findUnique({ where: { key } });
      const value = (row?.value as T) ?? fallback;
      await this.cache.setJson(`content:${key}`, value, ContentService.CACHE_TTL_S);
      return value;
    } catch {
      return fallback;
    }
  }

  private async write(actorId: string, key: string, value: unknown, action: string) {
    const before = await this.prisma.setting.findUnique({ where: { key } });
    await this.prisma.setting.upsert({
      where: { key },
      update: { value: value as Prisma.InputJsonValue, updatedBy: actorId },
      create: { key, value: value as Prisma.InputJsonValue, updatedBy: actorId },
    });
    await this.cache.del(`content:${key}`);
    await this.audit.log({
      actorId,
      action,
      targetType: 'SETTING',
      targetId: key,
      before: before?.value,
      after: value,
    });
    return { saved: true };
  }

  /** Banners for the app home screen; only the currently active ones. */
  async activeBanners(): Promise<HomeBanner[]> {
    const banners = await this.read<HomeBanner[]>(CONTENT_KEYS.BANNERS, []);
    const now = Date.now();
    return banners.filter((banner) => {
      const from = banner.activeFrom ? Date.parse(banner.activeFrom) : null;
      const until = banner.activeUntil ? Date.parse(banner.activeUntil) : null;
      if (from && now < from) return false;
      if (until && now > until) return false;
      return true;
    });
  }

  async allBanners(): Promise<HomeBanner[]> {
    return this.read<HomeBanner[]>(CONTENT_KEYS.BANNERS, []);
  }

  async saveBanners(actorId: string, banners: HomeBanner[]) {
    return this.write(actorId, CONTENT_KEYS.BANNERS, banners, 'CONTENT_BANNERS_UPDATED');
  }

  async icebreakers(): Promise<IcebreakerTemplates> {
    return this.read<IcebreakerTemplates>(CONTENT_KEYS.ICEBREAKERS, DEFAULT_ICEBREAKERS);
  }

  async saveIcebreakers(actorId: string, templates: IcebreakerTemplates) {
    return this.write(actorId, CONTENT_KEYS.ICEBREAKERS, templates, 'CONTENT_ICEBREAKERS_UPDATED');
  }

  async safetyTips() {
    return this.read(CONTENT_KEYS.SAFETY_TIPS, {
      firstConnection: SAFETY_TIPS_V1.firstConnection,
      scamWarning: SAFETY_TIPS_V1.scamWarning,
    });
  }

  async saveSafetyTips(actorId: string, tips: unknown) {
    return this.write(actorId, CONTENT_KEYS.SAFETY_TIPS, tips, 'CONTENT_SAFETY_TIPS_UPDATED');
  }
}
