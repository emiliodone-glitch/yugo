import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  COUPLE_MILESTONES,
  journeyUnlocked,
  JOURNEY_FROM,
  milestonesFor,
  resourcesFor,
  type CoupleJourney,
  type RelationshipStage,
} from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { TextModerationService } from '../moderation/text-moderation.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Ruta de pareja después del sí (RF-REL-05).
 *
 * Lo que una pareja hace entre el noviazgo y la boda, dentro de la app que
 * los presentó: pasos con fecha, recursos prematrimoniales neutrales entre
 * denominaciones y la consejería con su iglesia pedida con el sí de los dos.
 *
 * Tres invariantes:
 * - Nada existe antes del noviazgo. La ruta se abre con la etapa, no con el
 *   tiempo ni con la insistencia de la app.
 * - No hay puntaje. Un hito guarda cuándo y quién lo marcó; no se cuenta.
 * - La iglesia ve una petición de consejería solo cuando la firmaron los dos:
 *   `PENDING_PARTNER` es invisible para el portal por consulta, no por
 *   pantalla.
 */
@Injectable()
export class JourneyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly moderation: TextModerationService,
  ) {}

  private async loadMatch(matchId: string, userId: string) {
    const person = {
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            displayName: true,
            church: { select: { id: true, name: true } },
            denomination: { select: { slug: true } },
          },
        },
      },
    } as const;
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { userA: person, userB: person, conversation: { select: { id: true } } },
    });
    if (!match) throw new NotFoundException('match_not_found');
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new NotFoundException('match_not_found');
    }
    if (match.status !== 'ACTIVE') throw new BadRequestException('connection_ended');
    const me = match.userAId === userId ? match.userA : match.userB;
    const other = match.userAId === userId ? match.userB : match.userA;
    return {
      match,
      me,
      other,
      myName: me.profile?.displayName ?? 'Tu conexión',
      otherName: other.profile?.displayName ?? 'tu conexión',
      conversationId: match.conversation?.id,
    };
  }

  /** Todo lo que la tarjeta necesita, en una petición. */
  async state(matchId: string, userId: string): Promise<CoupleJourney> {
    const { match, me, other, otherName } = await this.loadMatch(matchId, userId);
    const stage = match.stage as RelationshipStage;
    const unlocked = journeyUnlocked(stage);

    const rows = unlocked ? await this.prisma.coupleMilestone.findMany({ where: { matchId } }) : [];
    const milestones = (unlocked ? COUPLE_MILESTONES : []).map((def) => {
      const row = rows.find((r) => r.key === def.key);
      return {
        ...def,
        doneAt: row ? row.doneAt.toISOString() : null,
        doneByMe: row?.doneById === userId,
        doneByName: row && row.doneById !== userId ? otherName : null,
      };
    });

    const churches = new Map<string, string>();
    for (const person of [me, other]) {
      if (person.profile?.church)
        churches.set(person.profile.church.id, person.profile.church.name);
    }

    const latest = unlocked
      ? await this.prisma.counselingRequest.findFirst({
          where: { matchId },
          orderBy: { createdAt: 'desc' },
          include: { church: { select: { name: true } } },
        })
      : null;

    return {
      stage,
      unlocked,
      opensAt: JOURNEY_FROM,
      milestones,
      resources: resourcesFor([me.profile?.denomination?.slug, other.profile?.denomination?.slug]),
      counseling: latest
        ? {
            id: latest.id,
            status: latest.status,
            churchName: latest.church.name,
            note: latest.note,
            requestedByMe: latest.requestedById === userId,
            createdAt: latest.createdAt.toISOString(),
            responseNote: latest.responseNote,
            respondedAt: latest.respondedAt ? latest.respondedAt.toISOString() : null,
          }
        : null,
      churches: [...churches].map(([id, name]) => ({ id, name })),
    };
  }

  /** Marcar o desmarcar un paso. Cualquiera de los dos puede; el otro se entera. */
  async setMilestone(matchId: string, userId: string, key: string, done: boolean, doneAt?: Date) {
    const { match, other, myName, conversationId } = await this.loadMatch(matchId, userId);
    const stage = match.stage as RelationshipStage;
    if (!journeyUnlocked(stage)) throw new BadRequestException('journey_locked');
    const def = milestonesFor(stage).find((m) => m.key === key);
    if (!def) throw new BadRequestException('milestone_locked');

    if (!done) {
      await this.prisma.coupleMilestone.deleteMany({ where: { matchId, key } });
      return { key, doneAt: null };
    }

    const when = doneAt ?? new Date();
    if (when.getTime() > Date.now() + 86_400_000) throw new BadRequestException('date_in_future');
    const row = await this.prisma.coupleMilestone.upsert({
      where: { matchId_key: { matchId, key } },
      create: { matchId, key, doneAt: when, doneById: userId },
      update: { doneAt: when, doneById: userId },
    });
    await this.notifications.send(
      other.id,
      'RELATIONSHIP',
      'journey.milestone',
      { name: myName, title: def.title },
      conversationId ? { conversationId } : undefined,
    );
    return { key, doneAt: row.doneAt.toISOString() };
  }

  /**
   * Pedir consejería a una de las iglesias de los dos. Queda esperando a la
   * otra persona: la iglesia no la ve todavía.
   */
  async requestCounseling(
    matchId: string,
    userId: string,
    input: { churchId: string; note: string },
  ) {
    const { match, me, other, myName, conversationId } = await this.loadMatch(matchId, userId);
    if (!journeyUnlocked(match.stage as RelationshipStage)) {
      throw new BadRequestException('journey_locked');
    }
    const church = [me, other]
      .map((p) => p.profile?.church)
      .find((c) => c && c.id === input.churchId);
    // Solo a la iglesia de alguno de los dos: no es un directorio de iglesias.
    if (!church) throw new BadRequestException('church_not_yours');

    const open = await this.prisma.counselingRequest.findFirst({
      where: { matchId, status: { in: ['PENDING_PARTNER', 'REQUESTED', 'ACCEPTED'] } },
    });
    if (open) throw new BadRequestException('counseling_already_requested');

    const note = input.note.trim();
    if (note.length < 10) throw new BadRequestException('note_too_short');
    const verdict = await this.moderation.moderate(note, 'counseling note');
    if (verdict.decision !== 'APPROVE') throw new BadRequestException('note_rejected');

    const created = await this.prisma.counselingRequest.create({
      data: { matchId, churchId: church.id, requestedById: userId, note },
    });
    await this.notifications.send(
      other.id,
      'RELATIONSHIP',
      'counseling.requestedPartner',
      { name: myName, church: church.name },
      conversationId ? { conversationId } : undefined,
    );
    return { id: created.id, status: created.status };
  }

  /**
   * La otra persona confirma o prefiere esperar. Con la confirmación, y solo
   * entonces, la petición pasa a REQUESTED y el portal de la iglesia la ve.
   */
  async respondCounseling(matchId: string, userId: string, accept: boolean) {
    const { match, me, other, conversationId } = await this.loadMatch(matchId, userId);
    const request = await this.prisma.counselingRequest.findFirst({
      where: { matchId, status: 'PENDING_PARTNER' },
      include: { church: { select: { id: true, name: true } } },
    });
    if (!request) throw new BadRequestException('no_pending_request');
    if (request.requestedById === userId) {
      throw new BadRequestException('cannot_confirm_own_request');
    }

    if (!accept) {
      await this.prisma.counselingRequest.update({
        where: { id: request.id },
        data: { status: 'DECLINED', respondedAt: new Date(), respondedById: userId },
      });
      await this.notifications.send(
        other.id,
        'RELATIONSHIP',
        'counseling.partnerDeclined',
        undefined,
        conversationId ? { conversationId } : undefined,
      );
      return { id: request.id, status: 'DECLINED' as const };
    }

    await this.prisma.counselingRequest.update({
      where: { id: request.id },
      data: { status: 'REQUESTED', partnerConsentAt: new Date() },
    });

    const seats = await this.prisma.churchUser.findMany({
      where: { churchId: request.church.id },
      select: { userId: true },
    });
    const names = [me, other].map((p) => p.profile?.displayName ?? 'Miembro');
    await Promise.all([
      this.notifications.send(
        me.id,
        'RELATIONSHIP',
        'counseling.waitingChurch',
        { church: request.church.name },
        { conversationId },
      ),
      this.notifications.send(
        other.id,
        'RELATIONSHIP',
        'counseling.waitingChurch',
        { church: request.church.name },
        { conversationId },
      ),
      ...seats.map((seat) =>
        this.notifications.send(
          seat.userId,
          'ACCOMPANIMENT',
          'counseling.churchNotice',
          { names: [names[0], names[1]], church: request.church.name },
          { counselingRequestId: request.id },
        ),
      ),
    ]);
    // La etapa de la pareja viaja con la petición para que la iglesia sepa
    // si están de novios o ya comprometidos; nada más del vínculo sale de aquí.
    return { id: request.id, status: 'REQUESTED' as const, stage: match.stage };
  }
}
