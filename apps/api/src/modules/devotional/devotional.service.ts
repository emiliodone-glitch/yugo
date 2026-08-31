import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  localDay,
  readingConstancy,
  reflectionIsPublic,
  REFLECTION_MAX_LENGTH,
} from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { TextModerationService } from '../moderation/text-moderation.service';

/**
 * Devocional del día.
 *
 * Lo que este servicio existe para producir no es el texto —ese lo escribe una
 * persona y viene sembrado—, sino **la compañía**: quien lo lee ve cuánta gente
 * de su propia congregación lo leyó hoy y qué escribieron. Eso es lo que
 * convierte una lectura solitaria en algo de lo que se puede hablar el domingo.
 *
 * Por eso el número de la iglesia se calcula aquí y no en la pantalla: si
 * llegara una lista de lectores al cliente, ese dato estaría fuera del
 * servidor aunque nadie lo pintara.
 */
@Injectable()
export class DevotionalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: TextModerationService,
  ) {}

  /**
   * El devocional de hoy, con lo que la persona ya hizo con él.
   *
   * Si hoy no hay ninguno publicado devuelve el último anterior, no un vacío:
   * un hueco en la programación no debería castigar a quien sí abrió la app.
   */
  async today(userId: string, now = new Date()) {
    const today = localDay(now);
    const devotional = await this.prisma.devotional.findFirst({
      where: { publishOn: { lte: new Date(`${today}T00:00:00.000Z`) } },
      orderBy: { publishOn: 'desc' },
    });
    if (!devotional) return null;

    const churchId = await this.churchOf(userId);

    const [mine, reads, myHistory] = await Promise.all([
      this.prisma.devotionalRead.findUnique({
        where: { devotionalId_userId: { devotionalId: devotional.id, userId } },
      }),
      this.prisma.devotionalRead.findMany({
        where: { devotionalId: devotional.id },
        include: {
          user: {
            select: {
              id: true,
              profile: { select: { displayName: true, churchId: true } },
              churchMemberships: { select: { churchId: true } },
            },
          },
        },
      }),
      this.prisma.devotionalRead.findMany({
        where: { userId },
        select: { readAt: true },
        orderBy: { readAt: 'desc' },
        take: 120,
      }),
    ]);

    const sameChurch = churchId
      ? reads.filter((read) => this.churchOfRead(read) === churchId)
      : [];

    // Solo reflexiones aprobadas, y solo de la propia congregación: una
    // reflexión es una confidencia, y leerla es distinto si el que la escribió
    // se sienta tres bancas más allá.
    const reflections = sameChurch
      .filter((read) => read.reflection && reflectionIsPublic(read.reflectionStatus))
      .sort((a, b) => b.readAt.getTime() - a.readAt.getTime())
      .slice(0, 12)
      .map((read) => ({
        userId: read.userId,
        name: read.user.profile?.displayName ?? 'Alguien de tu iglesia',
        reflection: read.reflection as string,
        readAt: read.readAt.toISOString(),
      }));

    return {
      id: devotional.id,
      publishOn: localDay(devotional.publishOn),
      /** Si el de hoy todavía no existe, la pantalla lo dice en vez de mentir. */
      isToday: localDay(devotional.publishOn) === today,
      reference: devotional.reference,
      title: devotional.title,
      body: devotional.body,
      question: devotional.question,
      myReflection: mine?.reflection ?? null,
      myReflectionStatus: mine?.reflectionStatus ?? null,
      readByMe: !!mine,
      readCount: reads.length,
      churchReadCount: sameChurch.length,
      reflections,
      constancy: readingConstancy(
        myHistory.map((read) => localDay(read.readAt)),
        now,
      ),
    };
  }

  /**
   * Marcar leído y, si quiso, dejar una reflexión.
   *
   * La reflexión pasa por moderación previa como todo el texto de este
   * producto. Marcar leído no espera por eso: son dos cosas distintas y una no
   * debería quedarse trabada por la otra.
   */
  async read(userId: string, devotionalId: string, reflection?: string) {
    const devotional = await this.prisma.devotional.findUnique({ where: { id: devotionalId } });
    if (!devotional) throw new NotFoundException('devotional_not_found');

    const text = reflection?.trim();
    if (text && text.length > REFLECTION_MAX_LENGTH) {
      throw new BadRequestException('reflection_too_long');
    }

    let status: 'PENDING' | 'APPROVED' | 'HELD' | 'REJECTED' | null = null;
    if (text) {
      const verdict = await this.moderation.moderate(text, 'reflexión sobre el devocional');
      status =
        verdict.decision === 'APPROVE'
          ? 'APPROVED'
          : verdict.decision === 'HOLD'
            ? 'HELD'
            : 'REJECTED';
    }

    const read = await this.prisma.devotionalRead.upsert({
      where: { devotionalId_userId: { devotionalId, userId } },
      // Volver a marcar leído no reescribe la fecha: el día que lo leyó fue
      // el día que lo leyó, y la constancia cuenta días, no visitas.
      update: text ? { reflection: text, reflectionStatus: status } : {},
      create: { devotionalId, userId, reflection: text ?? null, reflectionStatus: status },
    });

    if (text && status !== 'APPROVED') {
      await this.prisma.moderationCase.create({
        data: { kind: 'AI_HELD', priority: 'NORMAL', subjectUserId: userId },
      });
    }

    return {
      readByMe: true,
      reflection: read.reflection,
      reflectionStatus: read.reflectionStatus,
      /** Honesto: si quedó retenida, la persona tiene que saberlo. */
      published: reflectionIsPublic(read.reflectionStatus),
    };
  }

  /** La congregación de alguien: la de su perfil, o la que administra. */
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

  private churchOfRead(read: {
    user: {
      profile: { churchId: string | null } | null;
      churchMemberships: { churchId: string }[];
    };
  }): string | null {
    return read.user.profile?.churchId ?? read.user.churchMemberships[0]?.churchId ?? null;
  }
}
