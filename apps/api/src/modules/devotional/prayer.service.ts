import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  localDay,
  PRAYER_BODY_MAX,
  PRAYER_DAILY_LIMIT,
  rankPrayerRequests,
  type PrayerRequestItem,
  type PrayerScope,
} from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { TextModerationService } from '../moderation/text-moderation.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Muro de oración de la comunidad.
 *
 * Dos invariantes, y ninguna es cosmética:
 *
 * 1. **De una petición anónima no sale del servidor ni el nombre ni la
 *    iglesia.** No se pinta en gris ni se omite en la pantalla: no viaja. Si
 *    viajara, cualquiera con la pestaña de red abierta sabría quién tiene una
 *    deuda o una enfermedad, y esa filtración es irreparable.
 *
 *    La iglesia importa tanto como el nombre y por eso se guarda en null: en
 *    una congregación de cuarenta personas, «esto es de tu iglesia» reduce el
 *    anonimato a un puñado de candidatos, y la congregación es justamente ante
 *    quien alguien elige no firmar. El costo es que una petición anónima no
 *    aparece en la vista «mi iglesia»; el beneficio es que el anonimato es de
 *    verdad, y sin eso estas peticiones no se escriben.
 *
 * 2. **Nada se publica sin pasar por moderación.** Una petición de oración es
 *    el vehículo perfecto para una estafa («necesito para la operación de mi
 *    hija»), porque pedir ayuda es exactamente lo que se espera aquí.
 */
@Injectable()
export class PrayerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: TextModerationService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * El muro.
   *
   * `scope: 'church'` limita a la propia congregación; `'community'` es todo.
   * El orden lo decide `rankPrayerRequests`, compartido con el modo demo para
   * que la regla de «nadie en cero» sea una sola implementación.
   */
  async wall(userId: string, scope: PrayerScope = 'community', limit = 30) {
    const churchId = await this.churchOf(userId);

    const rows = await this.prisma.prayerRequest.findMany({
      where: {
        moderationStatus: 'APPROVED',
        ...(scope === 'church' && churchId ? { churchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit * 3, 120),
      include: {
        user: { select: { id: true, profile: { select: { displayName: true } } } },
        church: { select: { name: true } },
        intercessions: { select: { userId: true } },
      },
    });

    const items: PrayerRequestItem[] = rows.map((row) => {
      // Aquí es donde el anonimato se cumple: el nombre y el id no se leen
      // siquiera hacia el objeto que se serializa, salvo para quien la escribió.
      const isMine = row.userId === userId;
      const revealAuthor = !row.anonymous || isMine;
      return {
        id: row.id,
        body: row.body,
        anonymous: row.anonymous,
        authorName: revealAuthor ? (row.user.profile?.displayName ?? null) : null,
        authorId: revealAuthor ? row.userId : null,
        churchName: row.anonymous ? null : (row.church?.name ?? null),
        sameChurch: !!churchId && row.churchId === churchId,
        intercessions: row.intercessions.length,
        iPrayed: row.intercessions.some((i) => i.userId === userId),
        answeredAt: row.answeredAt?.toISOString() ?? null,
        answeredNote: row.answeredNote,
        createdAt: row.createdAt.toISOString(),
      };
    });

    return rankPrayerRequests(items).slice(0, limit);
  }

  /** Las mías, contestadas o no, para poder volver a ellas. */
  async mine(userId: string) {
    const rows = await this.prisma.prayerRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { intercessions: { select: { userId: true } } },
    });

    return rows.map((row) => ({
      id: row.id,
      body: row.body,
      anonymous: row.anonymous,
      moderationStatus: row.moderationStatus,
      intercessions: row.intercessions.length,
      answeredAt: row.answeredAt?.toISOString() ?? null,
      answeredNote: row.answeredNote,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async create(userId: string, body: string, anonymous: boolean, now = new Date()) {
    // Medianoche en la RD, no en UTC: el país está en UTC-4 todo el año y sin
    // el desfase el límite del día empezaría a las 8 de la noche anterior.
    const sinceMidnight = new Date(`${localDay(now)}T04:00:00.000Z`);
    // El límite diario no es de capacidad: es para que el muro no se convierta
    // en el diario de una sola persona, que es lo que lo vuelve ilegible.
    const todayCount = await this.prisma.prayerRequest.count({
      where: { userId, createdAt: { gte: sinceMidnight } },
    });
    if (todayCount >= PRAYER_DAILY_LIMIT) throw new BadRequestException('prayer_daily_limit');

    const text = body.trim();
    if (text.length > PRAYER_BODY_MAX) throw new BadRequestException('prayer_too_long');

    const verdict = await this.moderation.moderate(text, 'petición de oración');
    const status =
      verdict.decision === 'APPROVE'
        ? 'APPROVED'
        : verdict.decision === 'HOLD'
          ? 'HELD'
          : 'REJECTED';

    // Una petición anónima no guarda iglesia. Es la invariante 1 y se cumple
    // en el dato, no en la consulta: así ninguna consulta futura puede
    // filtrarla por congregación sin querer.
    const churchId = anonymous ? null : await this.churchOf(userId);
    const request = await this.prisma.prayerRequest.create({
      data: { userId, body: text, anonymous, churchId, moderationStatus: status },
    });

    if (status !== 'APPROVED') {
      await this.prisma.moderationCase.create({
        data: { kind: 'AI_HELD', priority: 'NORMAL', subjectUserId: userId },
      });
    }

    return {
      id: request.id,
      moderationStatus: status,
      /** Sin rodeos: si quedó en revisión, quien la escribió tiene que saberlo. */
      published: status === 'APPROVED',
    };
  }

  /**
   * «Estoy orando por ti».
   *
   * Se puede quitar, porque decir que uno ora cuando ya no lo hace es peor que
   * no haberlo dicho.
   */
  async intercede(userId: string, requestId: string) {
    const request = await this.prisma.prayerRequest.findUnique({ where: { id: requestId } });
    if (!request || request.moderationStatus !== 'APPROVED') {
      throw new NotFoundException('prayer_not_found');
    }

    const existing = await this.prisma.prayerIntercession.findUnique({
      where: { requestId_userId: { requestId, userId } },
    });
    if (existing) {
      await this.prisma.prayerIntercession.delete({
        where: { requestId_userId: { requestId, userId } },
      });
      const count = await this.prisma.prayerIntercession.count({ where: { requestId } });
      return { iPrayed: false, intercessions: count };
    }

    await this.prisma.prayerIntercession.create({ data: { requestId, userId } });
    const count = await this.prisma.prayerIntercession.count({ where: { requestId } });

    // El aviso llega sin nombre incluso cuando la petición no es anónima:
    // saber que alguien ora es lo que consuela; saber quién no añade nada y
    // convertiría el muro en una cuenta de quién le devolvió el gesto a quién.
    if (userId !== request.userId) {
      await this.notifications.notify(
        request.userId,
        'GROUP',
        'Alguien está orando por ti',
        count === 1
          ? 'Una persona de la comunidad está orando por tu petición.'
          : `${count} personas están orando por tu petición.`,
        { prayerRequestId: requestId },
      );
    }

    return { iPrayed: true, intercessions: count };
  }

  /**
   * Marcarla contestada.
   *
   * Es lo que sostiene el muro: sin respuestas visibles queda una lista de
   * desgracias, y de eso la gente se va.
   */
  async markAnswered(userId: string, requestId: string, note?: string) {
    const request = await this.prisma.prayerRequest.findUnique({
      where: { id: requestId },
      include: { intercessions: { select: { userId: true } } },
    });
    if (!request) throw new NotFoundException('prayer_not_found');
    if (request.userId !== userId) throw new ForbiddenException('not_author');
    if (request.answeredAt) throw new BadRequestException('already_answered');

    const text = note?.trim();
    let status: 'APPROVED' | 'HELD' | 'REJECTED' = 'APPROVED';
    if (text) {
      const verdict = await this.moderation.moderate(text, 'testimonio de oración contestada');
      status =
        verdict.decision === 'APPROVE'
          ? 'APPROVED'
          : verdict.decision === 'HOLD'
            ? 'HELD'
            : 'REJECTED';
    }

    const updated = await this.prisma.prayerRequest.update({
      where: { id: requestId },
      data: { answeredAt: new Date(), answeredNote: status === 'APPROVED' ? (text ?? null) : null },
    });

    // A quienes oraron se les dice cómo terminó. Es la única notificación de
    // este módulo que la gente agradece recibir.
    await Promise.all(
      request.intercessions
        .filter((i) => i.userId !== userId)
        .map((i) =>
          this.notifications.notify(
            i.userId,
            'GROUP',
            'Una petición por la que oraste fue contestada',
            text && status === 'APPROVED' ? text : 'Gracias por acompañar.',
            { prayerRequestId: requestId },
          ),
        ),
    );

    return {
      id: updated.id,
      answeredAt: updated.answeredAt?.toISOString() ?? null,
      answeredNote: updated.answeredNote,
      noteHeld: !!text && status !== 'APPROVED',
    };
  }

  /** Borrarla. Quien la escribió puede arrepentirse; nadie más puede quitarla. */
  async remove(userId: string, requestId: string) {
    const request = await this.prisma.prayerRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('prayer_not_found');
    if (request.userId !== userId) throw new ForbiddenException('not_author');
    await this.prisma.prayerRequest.delete({ where: { id: requestId } });
    return { deleted: true };
  }

  private async churchOf(userId: string): Promise<string | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { churchId: true },
    });
    if (profile?.churchId) return profile.churchId;
    const membership = await this.prisma.churchUser.findFirst({
      where: { userId },
      select: { churchId: true },
    });
    return membership?.churchId ?? null;
  }
}
