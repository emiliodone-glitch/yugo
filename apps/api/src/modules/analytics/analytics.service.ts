import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma.service';

export interface IncomingEvent {
  name: string;
  props?: Record<string, unknown>;
  at?: string;
}

/** Claves que nunca se guardan aunque un cliente las mande por error. */
const FORBIDDEN_PROP_KEYS =
  /(email|phone|tel|name|nombre|apellido|address|direccion|token|password)/i;

/**
 * Eventos de producto para el embudo (RF-ADM-12).
 *
 * Sin PII por diseño: un identificador anónimo por instalación, un hash del
 * usuario que no se puede revertir y propiedades primitivas cortas. Sirve
 * para ver en qué paso se cae la gente, no para seguir a nadie.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  userHash(userId: string | null | undefined): string | null {
    if (!userId) return null;
    const salt = process.env.ANALYTICS_SALT ?? process.env.JWT_SECRET ?? 'yugo';
    return createHash('sha256').update(`${salt}:${userId}`).digest('hex').slice(0, 32);
  }

  private sanitize(props: Record<string, unknown> | undefined) {
    if (!props) return undefined;
    const clean: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(props).slice(0, 12)) {
      if (FORBIDDEN_PROP_KEYS.test(key)) continue;
      if (typeof value === 'string') clean[key] = value.slice(0, 120);
      else if (typeof value === 'number' || typeof value === 'boolean') clean[key] = value;
    }
    return Object.keys(clean).length > 0 ? clean : undefined;
  }

  async ingest(
    anonymousId: string,
    platform: string | undefined,
    userId: string | null,
    events: IncomingEvent[],
  ) {
    const userHash = this.userHash(userId);
    const now = Date.now();
    const rows = events.slice(0, 50).map((event) => {
      const at = event.at ? Date.parse(event.at) : NaN;
      // Un reloj de cliente desviado no debe mover el evento semanas: se
      // acepta como mucho una hora hacia atrás (cola sin red) y nada futuro.
      const createdAt =
        Number.isFinite(at) && at <= now && now - at < 3_600_000 ? new Date(at) : new Date(now);
      return {
        name: event.name,
        anonymousId,
        userHash,
        platform,
        props: this.sanitize(event.props) as never,
        createdAt,
      };
    });
    if (rows.length === 0) return { stored: 0 };
    await this.prisma.productEvent.createMany({ data: rows });
    return { stored: rows.length };
  }
}
