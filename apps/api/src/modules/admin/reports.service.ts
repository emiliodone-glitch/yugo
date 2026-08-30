import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export type ReportKind = 'growth' | 'retention' | 'funnel' | 'province' | 'denomination';

interface ReportRow {
  [column: string]: string | number;
}

/**
 * RF-ADM-12: exportable reports — growth, cohort retention, free→Plus funnel,
 * activity by province and by denomination. Each returns rows plus a CSV
 * rendering that Excel opens directly (BOM + semicolon separator, which is
 * what Excel in es-DO expects).
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async build(kind: ReportKind, weeks = 12): Promise<{ title: string; rows: ReportRow[] }> {
    switch (kind) {
      case 'growth':
        return { title: 'Crecimiento semanal', rows: await this.growth(weeks) };
      case 'retention':
        return { title: 'Retención por cohorte', rows: await this.retention() };
      case 'funnel':
        return { title: 'Embudo gratuito → Plus', rows: await this.funnel() };
      case 'province':
        return { title: 'Actividad por provincia', rows: await this.byProvince() };
      case 'denomination':
        return { title: 'Actividad por denominación', rows: await this.byDenomination() };
    }
  }

  private async growth(weeks: number): Promise<ReportRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ week: Date; registrations: bigint; connections: bigint; subscriptions: bigint }>
    >`
      WITH semanas AS (
        SELECT generate_series(
          date_trunc('week', now() - make_interval(weeks => ${weeks})),
          date_trunc('week', now()),
          '1 week'
        ) AS week
      )
      SELECT
        s.week,
        (SELECT count(*) FROM "User" u
           WHERE u.role = 'MEMBER' AND date_trunc('week', u."createdAt") = s.week) AS registrations,
        (SELECT count(*) FROM "Match" m
           WHERE date_trunc('week', m."createdAt") = s.week) AS connections,
        (SELECT count(*) FROM "Subscription" sub
           WHERE date_trunc('week', sub."createdAt") = s.week) AS subscriptions
      FROM semanas s
      ORDER BY s.week
    `;
    return rows.map((row) => ({
      Semana: row.week.toISOString().slice(0, 10),
      Registros: Number(row.registrations),
      Conexiones: Number(row.connections),
      Suscripciones: Number(row.subscriptions),
    }));
  }

  /** Cohort retention: share of each month's signups still active later. */
  private async retention(): Promise<ReportRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ cohort: Date; total: bigint; active_7: bigint; active_30: bigint; active_90: bigint }>
    >`
      SELECT
        date_trunc('month', u."createdAt") AS cohort,
        count(*) AS total,
        count(*) FILTER (WHERE u."lastActiveAt" >= u."createdAt" + interval '7 days')  AS active_7,
        count(*) FILTER (WHERE u."lastActiveAt" >= u."createdAt" + interval '30 days') AS active_30,
        count(*) FILTER (WHERE u."lastActiveAt" >= u."createdAt" + interval '90 days') AS active_90
      FROM "User" u
      WHERE u.role = 'MEMBER' AND u."deletedAt" IS NULL
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 12
    `;
    const pct = (part: bigint, total: bigint) =>
      Number(total) === 0 ? 0 : Math.round((Number(part) / Number(total)) * 1000) / 10;
    return rows.map((row) => ({
      Cohorte: row.cohort.toISOString().slice(0, 7),
      Miembros: Number(row.total),
      'Retención 7 días (%)': pct(row.active_7, row.total),
      'Retención 30 días (%)': pct(row.active_30, row.total),
      'Retención 90 días (%)': pct(row.active_90, row.total),
    }));
  }

  /** Free → Plus funnel, following the success metrics in section 14. */
  private async funnel(): Promise<ReportRow[]> {
    const [registered, completed, verified, connected, plus, oro] = await Promise.all([
      this.prisma.user.count({ where: { role: 'MEMBER', deletedAt: null } }),
      this.prisma.profile.count({ where: { completeness: { gte: 60 } } }),
      this.prisma.user.count({
        where: { role: 'MEMBER', verifications: { some: { level: { gte: 2 }, status: 'APPROVED' } } },
      }),
      this.prisma.user.count({
        where: {
          role: 'MEMBER',
          OR: [{ matchesA: { some: {} } }, { matchesB: { some: {} } }],
        },
      }),
      this.prisma.subscription.count({ where: { tier: 'PLUS' } }),
      this.prisma.subscription.count({ where: { tier: 'ORO' } }),
    ]);
    const pct = (part: number) => (registered === 0 ? 0 : Math.round((part / registered) * 1000) / 10);
    return [
      { Etapa: 'Registrados', Miembros: registered, 'Del total (%)': 100 },
      { Etapa: 'Perfil completo (≥60%)', Miembros: completed, 'Del total (%)': pct(completed) },
      { Etapa: 'Verificados nivel 2+', Miembros: verified, 'Del total (%)': pct(verified) },
      { Etapa: 'Con al menos una conexión', Miembros: connected, 'Del total (%)': pct(connected) },
      { Etapa: 'Suscritos a Plus', Miembros: plus, 'Del total (%)': pct(plus) },
      { Etapa: 'Suscritos a Oro', Miembros: oro, 'Del total (%)': pct(oro) },
    ];
  }

  private async byProvince(): Promise<ReportRow[]> {
    const rows = await this.prisma.profile.groupBy({
      by: ['province'],
      _count: true,
      orderBy: { _count: { province: 'desc' } },
      take: 40,
    });
    const total = rows.reduce((sum, row) => sum + row._count, 0);
    return rows.map((row) => ({
      Provincia: row.province ?? 'Sin declarar',
      Miembros: row._count,
      'Del total (%)': total === 0 ? 0 : Math.round((row._count / total) * 1000) / 10,
    }));
  }

  private async byDenomination(): Promise<ReportRow[]> {
    const rows = await this.prisma.profile.groupBy({
      by: ['denominationId'],
      _count: true,
      orderBy: { _count: { denominationId: 'desc' } },
    });
    const denominations = await this.prisma.denomination.findMany({
      select: { id: true, name: true },
    });
    const nameById = new Map(denominations.map((d) => [d.id, d.name]));
    const total = rows.reduce((sum, row) => sum + row._count, 0);
    return rows.map((row) => ({
      Denominación: row.denominationId ? (nameById.get(row.denominationId) ?? '—') : 'Sin declarar',
      Miembros: row._count,
      'Del total (%)': total === 0 ? 0 : Math.round((row._count / total) * 1000) / 10,
    }));
  }
}

/**
 * CSV that Excel in es-DO opens without an import wizard: UTF-8 BOM and
 * semicolon separators (the comma is the decimal mark in this locale).
 */
/** UTF-8 byte order mark; written as an escape so linters do not flag it. */
const BOM = '\uFEFF';

export function toCsv(rows: ReportRow[]): string {
  if (rows.length === 0) return BOM;
  const columns = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const text = String(value);
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [
    columns.map(escape).join(';'),
    ...rows.map((row) => columns.map((column) => escape(row[column] ?? '')).join(';')),
  ];
  return `${BOM}${lines.join('\r\n')}`;
}
