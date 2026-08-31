import { randomBytes } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { hasAdvanced, type RelationshipStage } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Acompañamiento: a married couple from the church walks alongside a bond.
 *
 * The invariant this whole module exists to protect: **a mentor sees the bond
 * and its stage, never a message.** That is not a screen we chose to leave
 * out — this service has no path to a Conversation at all, and the chat
 * endpoints refuse anyone who is not one of the two people in the match. A
 * padrino who could read the chat would be surveillance, and nobody would use
 * it honestly.
 *
 * Consent is from all three and revocable by any of them at any time, without
 * a reason. A bond is not the property of whoever sent the invitation.
 */
@Injectable()
export class AccompanimentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  // -------------------------------------------------------------------------
  // Being a mentor
  // -------------------------------------------------------------------------

  /**
   * Offer to accompany couples. Requires a level-3 endorsement: the church
   * vouches for someone before a couple is asked to trust them.
   */
  async enableMentor(
    userId: string,
    input: { spouseName?: string; marriedSince?: number; bio?: string },
  ) {
    const endorsed = await this.prisma.verification.findFirst({
      where: { userId, level: 3, status: 'APPROVED' },
    });
    if (!endorsed) throw new ForbiddenException('needs_church_endorsement');

    const existing = await this.prisma.mentorProfile.findUnique({ where: { userId } });
    if (existing) {
      return this.prisma.mentorProfile.update({
        where: { userId },
        data: { ...input, active: true },
      });
    }

    const profile = await this.prisma.mentorProfile.create({
      data: { userId, code: await this.freshCode(), ...input },
    });
    await this.audit.log({ actorId: userId, action: 'MENTOR_ENABLED', targetType: 'USER', targetId: userId });
    return profile;
  }

  /** Stop accepting new couples. Bonds already accompanied are untouched. */
  async disableMentor(userId: string) {
    const profile = await this.prisma.mentorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('not_a_mentor');
    return this.prisma.mentorProfile.update({ where: { userId }, data: { active: false } });
  }

  async myMentorProfile(userId: string) {
    return this.prisma.mentorProfile.findUnique({ where: { userId } });
  }

  private async freshCode(): Promise<string> {
    // Collisions are vanishingly unlikely but a duplicate would fail the unique
    // constraint at insert time, which is a confusing error for the mentor.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `PADRINOS-${randomBytes(3).toString('hex').toUpperCase()}`;
      const taken = await this.prisma.mentorProfile.findUnique({ where: { code } });
      if (!taken) return code;
    }
    throw new BadRequestException('could_not_generate_code');
  }

  // -------------------------------------------------------------------------
  // The couple's side
  // -------------------------------------------------------------------------

  private async loadMatch(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('match_not_found');
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new NotFoundException('match_not_found');
    }
    if (match.status !== 'ACTIVE') throw new BadRequestException('connection_ended');
    return match;
  }

  /** What the couple sees: who accompanies them, or who is still pending. */
  async forCouple(matchId: string, userId: string) {
    const match = await this.loadMatch(matchId, userId);
    const rows = await this.prisma.accompaniment.findMany({
      where: { matchId, status: { in: ['INVITED', 'ACTIVE'] } },
      include: {
        mentor: {
          include: {
            profile: { select: { displayName: true, church: { select: { name: true } } } },
            mentorProfile: { select: { spouseName: true, marriedSince: true, bio: true } },
          },
        },
      },
    });

    const isA = match.userAId === userId;
    return {
      canInvite: hasAdvanced(match.stage as RelationshipStage),
      // Saying why the option is not there beats hiding it with no explanation.
      whyNot: hasAdvanced(match.stage as RelationshipStage) ? null : 'needs_intentional_friendship',
      items: rows.map((row) => ({
        id: row.id,
        status: row.status,
        mentorName: row.mentor.profile?.displayName ?? 'Un matrimonio',
        spouseName: row.mentor.mentorProfile?.spouseName ?? null,
        churchName: row.mentor.profile?.church?.name ?? null,
        marriedSince: row.mentor.mentorProfile?.marriedSince ?? null,
        bio: row.mentor.mentorProfile?.bio ?? null,
        invitedByMe: row.invitedById === userId,
        myConsent: isA ? row.consentAId : row.consentBId,
        theirConsent: isA ? row.consentBId : row.consentAId,
        mentorAccepted: !!row.mentorAcceptedAt,
      })),
    };
  }

  /** One of the couple invites a mentor with the code the mentor handed them. */
  async invite(matchId: string, userId: string, code: string) {
    const match = await this.loadMatch(matchId, userId);

    // A bond still at "conociéndonos" has nothing to accompany yet, and asking
    // a couple from church to walk alongside it would burn goodwill.
    if (!hasAdvanced(match.stage as RelationshipStage)) {
      throw new BadRequestException('needs_intentional_friendship');
    }

    const mentorProfile = await this.prisma.mentorProfile.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { user: { include: { profile: { select: { displayName: true } } } } },
    });
    if (!mentorProfile || !mentorProfile.active) throw new NotFoundException('mentor_code_not_found');
    if (mentorProfile.userId === match.userAId || mentorProfile.userId === match.userBId) {
      throw new BadRequestException('cannot_accompany_own_bond');
    }

    const already = await this.prisma.accompaniment.findFirst({
      where: { matchId, status: { in: ['INVITED', 'ACTIVE'] } },
    });
    if (already) throw new BadRequestException('already_accompanied');

    const accompaniment = await this.prisma.accompaniment.create({
      data: {
        matchId,
        mentorId: mentorProfile.userId,
        invitedById: userId,
        // Inviting is consenting; the other member still has to agree.
        consentAId: match.userAId === userId,
        consentBId: match.userBId === userId,
      },
    });

    const otherId = match.userAId === userId ? match.userBId : match.userAId;
    await Promise.all([
      this.notifications.notify(
        otherId,
        'ACCOMPANIMENT',
        'Los quieren acompañar',
        `Tu conexión invitó a ${mentorProfile.user.profile?.displayName ?? 'un matrimonio'} a acompañarlos. Hace falta que tú también estés de acuerdo.`,
        { matchId },
      ),
      this.notifications.notify(
        mentorProfile.userId,
        'ACCOMPANIMENT',
        'Una pareja pide acompañamiento',
        'Te invitaron a acompañar un vínculo. Verás su etapa, nunca sus conversaciones.',
        { accompanimentId: accompaniment.id },
      ),
    ]);

    return { id: accompaniment.id, status: accompaniment.status };
  }

  /** The other member agrees. Nobody can enrol their partner on their own. */
  async consent(matchId: string, userId: string, agree: boolean) {
    const match = await this.loadMatch(matchId, userId);
    const accompaniment = await this.prisma.accompaniment.findFirst({
      where: { matchId, status: 'INVITED' },
    });
    if (!accompaniment) throw new NotFoundException('no_pending_accompaniment');

    if (!agree) return this.end(accompaniment.id, userId, 'DECLINED');

    const updated = await this.prisma.accompaniment.update({
      where: { id: accompaniment.id },
      data: match.userAId === userId ? { consentAId: true } : { consentBId: true },
    });
    return this.activateIfReady(updated.id);
  }

  // -------------------------------------------------------------------------
  // The mentor's side
  // -------------------------------------------------------------------------

  /** Invitations waiting on this mentor, plus the bonds they already walk with. */
  async forMentor(mentorId: string) {
    const rows = await this.prisma.accompaniment.findMany({
      where: { mentorId, status: { in: ['INVITED', 'ACTIVE'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        match: {
          include: {
            userA: { include: { profile: { select: { displayName: true, church: { select: { name: true } } } } } },
            userB: { include: { profile: { select: { displayName: true, church: { select: { name: true } } } } } },
          },
        },
      },
    });

    // Note what is absent: no conversation, no last message, no unread count.
    // The mentor's list is deliberately thin.
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      stage: row.match.stage,
      stageChangedAt: row.match.stageChangedAt,
      since: row.activeAt,
      names: [
        row.match.userA.profile?.displayName ?? 'Miembro',
        row.match.userB.profile?.displayName ?? 'Miembro',
      ],
      churches: [
        row.match.userA.profile?.church?.name ?? null,
        row.match.userB.profile?.church?.name ?? null,
      ],
      bothConsented: row.consentAId && row.consentBId,
    }));
  }

  /**
   * One accompanied bond, in full — which is to say: its stage and how it got
   * there. There is no message in this response because there is no code here
   * that could fetch one.
   */
  async detailForMentor(accompanimentId: string, mentorId: string) {
    const row = await this.prisma.accompaniment.findUnique({
      where: { id: accompanimentId },
      include: {
        match: {
          include: {
            userA: { include: { profile: { select: { displayName: true, church: { select: { name: true } } } } } },
            userB: { include: { profile: { select: { displayName: true, church: { select: { name: true } } } } } },
            stageHistory: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });
    if (!row || row.mentorId !== mentorId) throw new NotFoundException('accompaniment_not_found');
    if (row.status !== 'ACTIVE') throw new ForbiddenException('accompaniment_not_active');

    return {
      id: row.id,
      since: row.activeAt,
      stage: row.match.stage,
      stageChangedAt: row.match.stageChangedAt,
      names: [
        row.match.userA.profile?.displayName ?? 'Miembro',
        row.match.userB.profile?.displayName ?? 'Miembro',
      ],
      churches: [
        row.match.userA.profile?.church?.name ?? null,
        row.match.userB.profile?.church?.name ?? null,
      ],
      history: row.match.stageHistory.map((entry) => ({
        toStage: entry.toStage,
        createdAt: entry.createdAt,
      })),
    };
  }

  async mentorRespond(accompanimentId: string, mentorId: string, accept: boolean) {
    const row = await this.prisma.accompaniment.findUnique({ where: { id: accompanimentId } });
    if (!row || row.mentorId !== mentorId) throw new NotFoundException('accompaniment_not_found');
    if (row.status !== 'INVITED') throw new BadRequestException('not_pending');

    if (!accept) return this.end(accompanimentId, mentorId, 'DECLINED');

    await this.prisma.accompaniment.update({
      where: { id: accompanimentId },
      data: { mentorAcceptedAt: new Date() },
    });
    return this.activateIfReady(accompanimentId);
  }

  // -------------------------------------------------------------------------
  // Shared
  // -------------------------------------------------------------------------

  /** Active only once all three said yes. Anything less stays INVITED. */
  private async activateIfReady(accompanimentId: string) {
    const row = await this.prisma.accompaniment.findUniqueOrThrow({
      where: { id: accompanimentId },
      include: { match: true },
    });
    if (row.status !== 'INVITED') return { id: row.id, status: row.status };
    if (!row.consentAId || !row.consentBId || !row.mentorAcceptedAt) {
      return { id: row.id, status: row.status };
    }

    const active = await this.prisma.accompaniment.update({
      where: { id: accompanimentId },
      data: { status: 'ACTIVE', activeAt: new Date() },
    });
    await this.audit.log({
      action: 'ACCOMPANIMENT_ACTIVE',
      targetType: 'MATCH',
      targetId: row.matchId,
      after: { mentorId: row.mentorId },
    });
    await Promise.all([
      this.notifyCouple(row.matchId, 'Ya los acompañan', 'El matrimonio aceptó. Verá en qué etapa están, nunca lo que se escriben.'),
      this.notifications.notify(
        row.mentorId,
        'ACCOMPANIMENT',
        'Empezaste a acompañar',
        'Verás en qué etapa está el vínculo. Las conversaciones son solo de ellos.',
        { accompanimentId: row.id },
      ),
    ]);
    return { id: active.id, status: active.status };
  }

  /**
   * Ending needs no reason and no agreement: any of the three can walk away.
   * Consent that cannot be withdrawn is not consent.
   */
  async end(accompanimentId: string, userId: string, as: 'ENDED' | 'DECLINED' = 'ENDED') {
    const row = await this.prisma.accompaniment.findUnique({
      where: { id: accompanimentId },
      include: { match: true },
    });
    if (!row) throw new NotFoundException('accompaniment_not_found');

    const involved =
      row.mentorId === userId ||
      row.match.userAId === userId ||
      row.match.userBId === userId;
    if (!involved) throw new NotFoundException('accompaniment_not_found');
    if (row.status === 'ENDED' || row.status === 'DECLINED') {
      return { id: row.id, status: row.status };
    }

    const updated = await this.prisma.accompaniment.update({
      where: { id: accompanimentId },
      data: { status: as, endedAt: new Date(), endedById: userId },
    });
    await this.audit.log({
      actorId: userId,
      action: 'ACCOMPANIMENT_ENDED',
      targetType: 'MATCH',
      targetId: row.matchId,
      after: { status: as },
    });
    return { id: updated.id, status: updated.status };
  }

  /**
   * Tell the mentors a bond advanced. Called by RelationshipService, because
   * knowing the couple reached noviazgo is the whole reason a padrino signed
   * up — and hearing it from the app beats hearing it from someone else.
   */
  async notifyStageAdvance(matchId: string, stageLabel: string) {
    const rows = await this.prisma.accompaniment.findMany({
      where: { matchId, status: 'ACTIVE' },
      select: { id: true, mentorId: true },
    });
    await Promise.all(
      rows.map((row) =>
        this.notifications.notify(
          row.mentorId,
          'ACCOMPANIMENT',
          'La pareja que acompañas avanzó',
          `Ahora están en «${stageLabel}».`,
          { accompanimentId: row.id },
        ),
      ),
    );
  }

  private async notifyCouple(matchId: string, title: string, body: string) {
    const match = await this.prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { userAId: true, userBId: true },
    });
    await Promise.all([
      this.notifications.notify(match.userAId, 'ACCOMPANIMENT', title, body, { matchId }),
      this.notifications.notify(match.userBId, 'ACCOMPANIMENT', title, body, { matchId }),
    ]);
  }
}
