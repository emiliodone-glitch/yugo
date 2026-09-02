import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
/**
 * El día de una columna DATE.
 *
 * Postgres guarda `publishOn` sin hora y Prisma lo entrega como medianoche
 * UTC. Pasarlo por la zona de Santo Domingo (UTC-4) lo convierte en las 8 de
 * la noche del día anterior, y el devocional de hoy aparecería como el de
 * ayer. Un DATE no tiene zona: se lee tal cual.
 */
function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

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
      publishOn: dateOnly(devotional.publishOn),
      /** Si el de hoy todavía no existe, la pantalla lo dice en vez de mentir. */
      isToday: dateOnly(devotional.publishOn) === today,
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

    // Igual que las peticiones: nunca se rechaza sola. «Rechazar» del
    // clasificador se convierte en retenida con prioridad alta para una persona.
    let status: 'APPROVED' | 'HELD' | null = null;
    let priority: 'NORMAL' | 'HIGH' = 'NORMAL';
    if (text) {
      const verdict = await this.moderation.moderate(text, 'reflexión sobre el devocional');
      status = verdict.decision === 'APPROVE' ? 'APPROVED' : 'HELD';
      priority = verdict.decision === 'REJECT' ? 'HIGH' : 'NORMAL';
    }

    const read = await this.prisma.devotionalRead.upsert({
      where: { devotionalId_userId: { devotionalId, userId } },
      // Volver a marcar leído no reescribe la fecha: el día que lo leyó fue
      // el día que lo leyó, y la constancia cuenta días, no visitas.
      update: text ? { reflection: text, reflectionStatus: status } : {},
      create: { devotionalId, userId, reflection: text ?? null, reflectionStatus: status },
    });

    if (text && status !== 'APPROVED') {
      // La clave de DevotionalRead es compuesta, así que el caso guarda las
      // dos partes: sin ellas la cola no podría cargar el texto ni aprobarlo.
      await this.prisma.moderationCase.create({
        data: {
          kind: 'AI_HELD',
          priority,
          subjectUserId: userId,
          reflectionDevotionalId: devotionalId,
          reflectionUserId: userId,
        },
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

  // ---------------------------------------------------------------- Autoría

  /**
   * Cuántos días hay programados a partir de hoy, contando hoy.
   *
   * Es el número que el panel tiene que enseñar en grande: el día que llegue a
   * cero, la app empieza a repetir el último devocional y a decir «el de hoy
   * todavía no está publicado» para siempre. Construir la función y no
   * construir quién la alimenta fue el defecto; este número es el aviso.
   */
  async runwayDays(now = new Date()): Promise<number> {
    const today = localDay(now);
    const upcoming = await this.prisma.devotional.findMany({
      where: { publishOn: { gte: new Date(`${today}T00:00:00.000Z`) } },
      select: { publishOn: true },
      orderBy: { publishOn: 'asc' },
    });
    // Cuenta días consecutivos desde hoy: un hueco corta la reserva, porque
    // ese día ya sería un día sin devocional aunque haya más después.
    let days = 0;
    let cursor = Date.parse(`${today}T00:00:00.000Z`);
    for (const d of upcoming) {
      if (d.publishOn.getTime() !== cursor) break;
      days += 1;
      cursor += 86_400_000;
    }
    return days;
  }

  /** El calendario: la última semana y todo lo programado hacia adelante. */
  async schedule(now = new Date()) {
    const today = localDay(now);
    const from = new Date(Date.parse(`${today}T00:00:00.000Z`) - 7 * 86_400_000);
    const items = await this.prisma.devotional.findMany({
      where: { publishOn: { gte: from } },
      orderBy: { publishOn: 'asc' },
      include: { _count: { select: { reads: true } } },
    });
    return {
      today,
      runwayDays: await this.runwayDays(now),
      items: items.map((d) => ({
        id: d.id,
        publishOn: dateOnly(d.publishOn),
        reference: d.reference,
        title: d.title,
        body: d.body,
        question: d.question,
        reads: d._count.reads,
        isPast: dateOnly(d.publishOn) < today,
        isToday: dateOnly(d.publishOn) === today,
      })),
    };
  }

  /**
   * Crear o corregir el de una fecha.
   *
   * Un devocional ya leído por alguien no se reescribe: lo que esa persona leyó
   * fue lo que leyó, y «142 de tu iglesia lo leyeron hoy» tiene que seguir
   * significando que leyeron lo mismo. Se permite corregir el de hoy solo si
   * nadie lo ha abierto todavía.
   */
  async upsertForDate(
    publishOn: string,
    data: { reference: string; title: string; body: string; question: string },
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(publishOn)) throw new BadRequestException('bad_date');
    const date = new Date(`${publishOn}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('bad_date');

    const existing = await this.prisma.devotional.findUnique({
      where: { publishOn: date },
      include: { _count: { select: { reads: true } } },
    });
    if (existing && existing._count.reads > 0) {
      throw new ForbiddenException('devotional_already_read');
    }

    const saved = await this.prisma.devotional.upsert({
      where: { publishOn: date },
      update: data,
      create: { publishOn: date, ...data },
    });
    return { id: saved.id, publishOn, created: !existing };
  }

  /** Borrar uno futuro. Uno ya leído no se borra: la lectura de alguien lo ancla. */
  async remove(id: string) {
    const existing = await this.prisma.devotional.findUnique({
      where: { id },
      include: { _count: { select: { reads: true } } },
    });
    if (!existing) throw new NotFoundException('devotional_not_found');
    if (existing._count.reads > 0) throw new ForbiddenException('devotional_already_read');
    await this.prisma.devotional.delete({ where: { id } });
    return { deleted: true };
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
