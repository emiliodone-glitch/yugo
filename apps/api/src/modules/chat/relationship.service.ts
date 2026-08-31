import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  hasAdvanced,
  isExclusive,
  nextStage,
  validateStageProposal,
  type RelationshipStage,
} from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Etapas del vínculo.
 *
 * A stage belongs to both people: one proposes, the other accepts, and nothing
 * moves until they agree. That is the whole point — the app should not be able
 * to say two people are novios because one of them tapped a button.
 *
 * Declaring noviazgo takes both of them out of Descubrir. It costs Yugo reach
 * and that is exactly why it is worth doing: it is the promise a church is
 * lending its name to.
 */
@Injectable()
export class RelationshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  private async loadMatch(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        userA: { include: { profile: { select: { displayName: true } } } },
        userB: { include: { profile: { select: { displayName: true } } } },
        conversation: { select: { id: true } },
      },
    });
    if (!match) throw new NotFoundException('match_not_found');
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new NotFoundException('match_not_found');
    }
    if (match.status !== 'ACTIVE') throw new BadRequestException('connection_ended');

    const otherId = match.userAId === userId ? match.userBId : match.userAId;
    const other = match.userAId === userId ? match.userB : match.userA;
    return { match, otherId, otherName: other.profile?.displayName ?? 'tu conexión' };
  }

  /** What the couple's screen needs: the stage, any proposal in flight, and history. */
  async state(matchId: string, userId: string) {
    const { match, otherName } = await this.loadMatch(matchId, userId);
    const history = await this.prisma.relationshipStageChange.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      stage: match.stage,
      stageChangedAt: match.stageChangedAt,
      nextStage: nextStage(match.stage as RelationshipStage),
      isExclusive: isExclusive(match.stage as RelationshipStage),
      otherName,
      proposal: match.proposedStage
        ? {
            stage: match.proposedStage,
            byMe: match.proposedById === userId,
            proposedAt: match.proposedAt,
          }
        : null,
      history: history.map((row) => ({
        toStage: row.toStage,
        createdAt: row.createdAt,
      })),
    };
  }

  /** One person suggests the next step. Nothing changes until the other agrees. */
  async propose(matchId: string, userId: string, stage: RelationshipStage) {
    const { match, otherId, otherName } = await this.loadMatch(matchId, userId);

    const validation = validateStageProposal(match.stage as RelationshipStage, stage);
    if (!validation.ok) throw new BadRequestException(validation.error);

    // A second proposal from the same person just replaces the first; one from
    // the other person while ours is pending means they are agreeing in
    // spirit, so treat it as an acceptance rather than a standoff.
    if (match.proposedStage === stage && match.proposedById === otherId) {
      return this.accept(matchId, userId);
    }

    await this.prisma.match.update({
      where: { id: matchId },
      data: { proposedStage: stage, proposedById: userId, proposedAt: new Date() },
    });

    await this.notifications.notify(
      otherId,
      'RELATIONSHIP',
      'Una propuesta sobre su vínculo',
      `${otherName === 'tu conexión' ? 'Tu conexión' : otherName} propone avanzar de etapa.`,
      match.conversation ? { conversationId: match.conversation.id } : undefined,
    );

    return { proposed: stage, awaiting: otherId };
  }

  /** The other person agrees: the stage changes and the history records it. */
  async accept(matchId: string, userId: string) {
    const { match, otherId } = await this.loadMatch(matchId, userId);
    if (!match.proposedStage) throw new BadRequestException('no_pending_proposal');
    if (match.proposedById === userId) throw new BadRequestException('cannot_accept_own_proposal');

    const stage = match.proposedStage as RelationshipStage;
    const validation = validateStageProposal(match.stage as RelationshipStage, stage);
    if (!validation.ok) throw new BadRequestException(validation.error);

    const [updated] = await this.prisma.$transaction([
      this.prisma.match.update({
        where: { id: matchId },
        data: {
          stage,
          stageChangedAt: new Date(),
          proposedStage: null,
          proposedById: null,
          proposedAt: null,
        },
      }),
      this.prisma.relationshipStageChange.create({
        data: {
          matchId,
          fromStage: match.stage,
          toStage: stage,
          proposedById: match.proposedById!,
          acceptedById: userId,
        },
      }),
    ]);

    // Leaving Descubrir is a real consequence, so it is auditable like any
    // other change of visibility.
    if (isExclusive(stage)) {
      await this.audit.log({
        action: 'RELATIONSHIP_EXCLUSIVE',
        targetType: 'MATCH',
        targetId: matchId,
        after: { stage, userAId: match.userAId, userBId: match.userBId },
      });
    }

    const body = isExclusive(stage)
      ? 'Ninguno de los dos aparece ya en Descubrir.'
      : 'Lo declararon los dos.';
    await Promise.all([
      this.notifications.notify(userId, 'RELATIONSHIP', 'Avanzaron de etapa', body),
      this.notifications.notify(otherId, 'RELATIONSHIP', 'Avanzaron de etapa', body),
    ]);

    return { stage: updated.stage, isExclusive: isExclusive(stage), advanced: hasAdvanced(stage) };
  }

  /**
   * "Todavía no." Declining is a normal answer, not a failure: it clears the
   * proposal and tells the other person plainly, without ending anything.
   */
  async decline(matchId: string, userId: string) {
    const { match, otherId } = await this.loadMatch(matchId, userId);
    if (!match.proposedStage) throw new BadRequestException('no_pending_proposal');
    if (match.proposedById === userId) throw new BadRequestException('cannot_decline_own_proposal');

    await this.prisma.match.update({
      where: { id: matchId },
      data: { proposedStage: null, proposedById: null, proposedAt: null },
    });

    await this.notifications.notify(
      otherId,
      'RELATIONSHIP',
      'Sobre la etapa que propusiste',
      'Prefiere esperar. Pueden volver a hablarlo cuando quieran.',
    );

    return { declined: true };
  }
}
