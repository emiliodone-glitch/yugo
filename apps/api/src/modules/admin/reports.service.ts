import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export type ReportKind =
  | 'growth'
  | 'retention'
  | 'funnel'
  | 'subscriptions'
  | 'province'
  | 'denomination';

interface ReportRow {
  [column: string]: string | number;
}

/**
 * RF-ADM-12: exportable reports — growth, cohort retention, the funnel from
 * sign-up to a bond that advanced, subscriptions, and activity by province and
 * denomination. Each returns rows plus a CSV rendering that Excel opens
 * directly (BOM + semicolon separator, which is what Excel in es-DO expects).
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
        return { title: 'Del registro al vínculo', rows: await this.funnel() };
      case 'subscriptions':
        return { title: 'Suscripciones activas', rows: await this.subscriptions() };
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
          date_trunc('week', now() - make_interval(weeks => ${weeks}::int)),
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

  /**
   * The funnel ends where the product's purpose ends: in bonds that advanced,
   * not in subscriptions.
   *
   * It used to close with "Suscritos a Plus" and "Suscritos a Oro", which made
   * the system define its own success as revenue. Money is still measured —
   * see subscriptions() — but as its own report, never as the last step of
   * what Yugo is for. Two people who matched and never spoke are not a result.
   */
  private async funnel(): Promise<ReportRow[]> {
    const inStage = (stages: Array<'INTENTIONAL_FRIENDSHIP' | 'COURTSHIP' | 'ENGAGED'>) =>
      this.prisma.user.count({
        where: {
          role: 'MEMBER',
          deletedAt: null,
          OR: [
            { matchesA: { some: { status: 'ACTIVE', stage: { in: stages } } } },
            { matchesB: { some: { status: 'ACTIVE', stage: { in: stages } } } },
          ],
        },
      });

    const [registered, completed, verified, connected, talking, advanced, settled] =
      await Promise.all([
        this.prisma.user.count({ where: { role: 'MEMBER', deletedAt: null } }),
        this.prisma.profile.count({ where: { completeness: { gte: 60 } } }),
        this.prisma.user.count({
          where: {
            role: 'MEMBER',
            verifications: { some: { level: { gte: 2 }, status: 'APPROVED' } },
          },
        }),
        this.prisma.user.count({
          where: {
            role: 'MEMBER',
            OR: [{ matchesA: { some: {} } }, { matchesB: { some: {} } }],
          },
        }),
        // Both people in a conversation that actually carries messages: the
        // first sign a connection became something instead of sitting in a
        // list. Counting only senders would put this stage below the ones
        // after it, since the person who answered nothing still advanced.
        this.prisma.user.count({
          where: {
            role: 'MEMBER',
            deletedAt: null,
            OR: [
              {
                matchesA: {
                  some: {
                    conversation: { messages: { some: { moderationStatus: 'APPROVED' } } },
                  },
                },
              },
              {
                matchesB: {
                  some: {
                    conversation: { messages: { some: { moderationStatus: 'APPROVED' } } },
                  },
                },
              },
            ],
          },
        }),
        inStage(['INTENTIONAL_FRIENDSHIP', 'COURTSHIP', 'ENGAGED']),
        inStage(['COURTSHIP', 'ENGAGED']),
      ]);

    const pct = (part: number) =>
      registered === 0 ? 0 : Math.round((part / registered) * 1000) / 10;
    return [
      { Etapa: 'Registrados', Miembros: registered, 'Del total (%)': 100 },
      { Etapa: 'Perfil completo (≥60%)', Miembros: completed, 'Del total (%)': pct(completed) },
      { Etapa: 'Verificados nivel 2+', Miembros: verified, 'Del total (%)': pct(verified) },
      { Etapa: 'Con al menos una conexión', Miembros: connected, 'Del total (%)': pct(connected) },
      { Etapa: 'Conversando', Miembros: talking, 'Del total (%)': pct(talking) },
      { Etapa: 'En un vínculo que avanzó', Miembros: advanced, 'Del total (%)': pct(advanced) },
      { Etapa: 'En noviazgo o compromiso', Miembros: settled, 'Del total (%)': pct(settled) },
    ];
  }

  /**
   * Revenue, kept honestly and kept separate. Sustaining the platform matters;
   * it is simply not the outcome the product is measured by.
   */
  private async subscriptions(): Promise<ReportRow[]> {
    const [members, plus, oro] = await Promise.all([
      this.prisma.user.count({ where: { role: 'MEMBER', deletedAt: null } }),
      this.prisma.subscription.count({ where: { tier: 'PLUS', status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { tier: 'ORO', status: 'ACTIVE' } }),
    ]);
    const pct = (part: number) => (members === 0 ? 0 : Math.round((part / members) * 1000) / 10);
    return [
      { Plan: 'Gratuito', Miembros: members - plus - oro, 'Del total (%)': pct(members - plus - oro) },
      { Plan: 'Plus', Miembros: plus, 'Del total (%)': pct(plus) },
      { Plan: 'Oro', Miembros: oro, 'Del total (%)': pct(oro) },
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
