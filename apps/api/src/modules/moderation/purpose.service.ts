import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  assessPurpose,
  earnsPurposeBadge,
  type MemberActivity,
  type PurposeAssessment,
} from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Ventana de actividad reciente para las señales de volumen. */
const WINDOW_DAYS = 30;
/** Mensajes aprobados de cada lado para considerar que hubo conversación. */
const REPLIES_FOR_REAL_CONVERSATION = 2;

/**
 * Validación de propósito, contra la base real.
 *
 * La moderación de contenido lee mensajes. Esto lee el patrón de una persona:
 * si le escribe a quien dice que le interesa, si alguna de esas conversaciones
 * llega a algún lado, si en seis meses hubo un solo vínculo que avanzara.
 *
 * Alguien puede escribir cien mensajes impecables y estar usando Yugo para
 * coleccionar conexiones. El contenido no lo delata; el comportamiento sí.
 *
 * Las reglas de decisión viven en `@yugo/shared` como funciones puras, con sus
 * umbrales y sus pruebas. Aquí solo se reúnen los datos y se aplican las
 * consecuencias, que son deliberadamente suaves: la peor cosa automática es
 * fricción y una conversación privada.
 */
@Injectable()
export class PurposeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** Los números crudos de una persona. Sin juicio: eso lo hace shared. */
  async activityOf(userId: string): Promise<MemberActivity> {
    const since = new Date(Date.now() - WINDOW_DAYS * 86400_000);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { createdAt: true },
    });

    const [
      interestsSent,
      activeConnections,
      startedRows,
      bondsAdvanced,
      flaggedContactMessages,
      misleadingReports,
    ] = await Promise.all([
      this.prisma.interest.count({ where: { fromUserId: userId, createdAt: { gte: since } } }),
      this.prisma.match.count({
        where: { status: 'ACTIVE', OR: [{ userAId: userId }, { userBId: userId }] },
      }),
      this.prisma.message.groupBy({
        by: ['conversationId'],
        where: { senderId: userId, moderationStatus: 'APPROVED' },
      }),
      // Cuenta el historial y no la etapa actual: un vínculo que avanzó y
      // después terminó igual avanzó, y borrarlo del historial castigaría a
      // quien lo intentó de verdad.
      this.prisma.relationshipStageChange
        .findMany({
          where: {
            OR: [
              { match: { userAId: userId } },
              { match: { userBId: userId } },
            ],
          },
          select: { matchId: true },
          distinct: ['matchId'],
        })
        .then((rows) => rows.length),
      this.prisma.message.count({
        where: {
          senderId: userId,
          moderationStatus: { in: ['HELD', 'REJECTED'] },
          // El clasificador agrupa «pedir dinero» y «mover la charla fuera de
          // la app» bajo la misma categoría; la señal se nombra por eso.
          moderationCategories: { array_contains: ['scam_or_money'] },
        },
      }),
      this.prisma.report.count({
        where: { targetUserId: userId, category: { in: ['MISLEADING', 'FAKE_IDENTITY'] } },
      }),
    ]);

    return {
      accountAgeDays: Math.floor((Date.now() - user.createdAt.getTime()) / 86400_000),
      interestsSent,
      activeConnections,
      conversationsStarted: startedRows.length,
      conversationsWithReplies: await this.conversationsWithReplies(userId),
      bondsAdvanced,
      flaggedContactMessages,
      misleadingReports,
    };
  }

  /**
   * Conversaciones donde escribieron los dos, de verdad.
   *
   * «Hola» sin respuesta no es una conversación, y contarlo como tal dejaría
   * pasar exactamente el patrón que buscamos. Se pide un mínimo de mensajes
   * aprobados por cada lado.
   */
  private async conversationsWithReplies(userId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count FROM (
        SELECT m."conversationId"
        FROM "Message" m
        JOIN "Conversation" c ON c.id = m."conversationId"
        JOIN "Match" mt ON mt.id = c."matchId"
        WHERE m."moderationStatus" = 'APPROVED'
          AND (mt."userAId" = ${userId} OR mt."userBId" = ${userId})
        GROUP BY m."conversationId"
        HAVING count(*) FILTER (WHERE m."senderId" = ${userId}) >= ${REPLIES_FOR_REAL_CONVERSATION}
           AND count(*) FILTER (WHERE m."senderId" <> ${userId}) >= ${REPLIES_FOR_REAL_CONVERSATION}
      ) both_sides
    `;
    return Number(rows[0]?.count ?? 0);
  }

  /** El juicio completo sobre una persona, con sus explicaciones. */
  async assess(userId: string): Promise<PurposeAssessment & { badge: boolean }> {
    const activity = await this.activityOf(userId);
    return { ...assessPurpose(activity), badge: earnsPurposeBadge(activity) };
  }

  /**
   * Lo que ve la propia persona sobre sí misma.
   *
   * Nunca el puntaje ni las señales: un número visible se convierte en un
   * juego, y la gente aprende a moverlo en vez de a comportarse. Solo si ganó
   * la insignia, que es la parte que sí conviene que sepa.
   */
  async mine(userId: string) {
    const activity = await this.activityOf(userId);
    return {
      badge: earnsPurposeBadge(activity),
      /** Para explicar cómo se gana, no para presumir de números. */
      conversationsWithReplies: activity.conversationsWithReplies,
      bondsAdvanced: activity.bondsAdvanced,
    };
  }

  /**
   * Barrido diario.
   *
   * Reparte y retira la insignia, y llena la cola de revisión humana. Nadie es
   * suspendido ni expulsado por esto: lo más fuerte que ocurre solo es que
   * alguien del equipo mire el caso con el historial delante.
   */
  @Cron('0 4 * * *')
  async sweep() {
    const members = await this.prisma.user.findMany({
      where: { role: 'MEMBER', status: 'ACTIVE', deletedAt: null },
      select: { id: true },
      take: 5000,
    });

    let flagged = 0;
    let badges = 0;

    for (const member of members) {
      const activity = await this.activityOf(member.id);
      const assessment = assessPurpose(activity);
      const badge = earnsPurposeBadge(activity);

      const profile = await this.prisma.profile.findUnique({
        where: { userId: member.id },
        select: { purposeBadge: true },
      });
      if (profile && profile.purposeBadge !== badge) {
        await this.prisma.profile.update({
          where: { userId: member.id },
          data: { purposeBadge: badge },
        });
        if (badge) badges += 1;
      }

      if (!assessment.hasEnoughHistory) continue;

      if (assessment.band === 'review') {
        flagged += 1;
        await this.openCase(member.id, assessment);
      } else if (assessment.band === 'watch') {
        await this.nudge(member.id, assessment);
      }
    }

    return { reviewed: members.length, flagged, badges };
  }

  /**
   * Un caso para que lo mire una persona, con la evidencia escrita en español.
   *
   * Se abre uno solo: reabrirlo cada noche mientras el patrón siga sería
   * enterrar la cola de moderación bajo la misma persona.
   */
  private async openCase(userId: string, assessment: PurposeAssessment) {
    const open = await this.prisma.moderationCase.findFirst({
      where: { subjectUserId: userId, kind: 'PURPOSE', status: { in: ['OPEN', 'IN_REVIEW', 'ESCALATED'] } },
    });
    if (open) return;

    await this.prisma.moderationCase.create({
      data: {
        kind: 'PURPOSE',
        subjectUserId: userId,
        priority: 'NORMAL',
        // Lo que lee el moderador es la lista de hechos en español, no un
        // puntaje: un número sin explicación es una acusación sin pruebas.
        internalNotes: {
          score: assessment.score,
          signals: assessment.signals.map((signal) => ({
            key: signal.key,
            explain: signal.explain,
          })),
        },
      },
    });
    await this.audit.log({
      action: 'PURPOSE_CASE_OPENED',
      targetType: 'USER',
      targetId: userId,
      after: { score: assessment.score, signals: assessment.signals.map((s) => s.key) },
    });
  }

  /**
   * La conversación privada, antes de cualquier consecuencia.
   *
   * No acusa: recuerda lo que la persona aceptó al entrar y le pregunta. La
   * mayoría de la gente que dispara una señal no está actuando de mala fe, y
   * tratarla como culpable es la forma más rápida de perderla.
   *
   * Se envía una vez cada 30 días como máximo.
   */
  private async nudge(userId: string, assessment: PurposeAssessment) {
    const since = new Date(Date.now() - 30 * 86400_000);
    const recent = await this.prisma.notification.findFirst({
      where: { userId, category: 'MODERATION', title: NUDGE_TITLE, createdAt: { gte: since } },
    });
    if (recent) return;

    await this.notifications.notify(
      userId,
      'MODERATION',
      NUDGE_TITLE,
      'Notamos que marcas interés en mucha gente y conversas con pocas. No hay problema en tomarse su tiempo — solo queremos recordarte lo que aceptaste al entrar: aquí se busca conocer a alguien de verdad, no acumular conexiones.',
      { purposeScore: assessment.score },
    );
  }
}

const NUDGE_TITLE = 'Sobre cómo estás usando Yugo';
