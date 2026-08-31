import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface StoryDraft {
  names: string;
  churchNames: string;
  city?: string;
  marriedAt: Date;
  body: string;
}

/**
 * Historias de parejas que se casaron.
 *
 * This is the only thing Yugo can publish that proves it did what it says,
 * and it is also the easiest thing in the product to fake. So the rules are
 * strict on purpose: both people consent, the congregation is named, and a
 * human reviews it before anyone sees it.
 *
 * A story nobody can check is marketing. A story a church stands behind is a
 * reason to trust the product — which is why `churchNames` is required and
 * why nothing here can be published on one person's say-so.
 */
@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** Published stories, newest first. Public: no session needed. */
  async published(limit = 20) {
    const rows = await this.prisma.story.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: Math.min(limit, 50),
    });
    return rows.map((row) => ({
      id: row.id,
      names: row.names,
      churchNames: row.churchNames,
      city: row.city,
      marriedAt: row.marriedAt,
      body: row.body,
      publishedAt: row.publishedAt,
    }));
  }

  private async loadMarriedMatch(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        userA: { include: { profile: { include: { church: true } } } },
        userB: { include: { profile: { include: { church: true } } } },
        story: true,
      },
    });
    if (!match) throw new NotFoundException('match_not_found');
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new NotFoundException('match_not_found');
    }
    // Only a couple who declared the marriage together can tell it. Anything
    // looser and the stories stop meaning anything.
    if (match.stage !== 'MARRIED') throw new BadRequestException('not_married_yet');
    return match;
  }

  /** What the couple sees: their story, if any, and whether they can write one. */
  async forCouple(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { story: true },
    });
    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      throw new NotFoundException('match_not_found');
    }

    const isA = match.userAId === userId;
    return {
      canSubmit: match.stage === 'MARRIED' && !match.story,
      whyNot: match.stage === 'MARRIED' ? null : 'not_married_yet',
      story: match.story
        ? {
            id: match.story.id,
            status: match.story.status,
            names: match.story.names,
            churchNames: match.story.churchNames,
            marriedAt: match.story.marriedAt,
            body: match.story.body,
            myConsent: isA ? match.story.consentAId : match.story.consentBId,
            theirConsent: isA ? match.story.consentBId : match.story.consentAId,
            reviewNote: match.story.reviewNote,
          }
        : null,
    };
  }

  /**
   * One of the couple writes it. Their consent is recorded by the act of
   * writing; the other still has to agree before it goes anywhere.
   */
  async submit(matchId: string, userId: string, draft: StoryDraft) {
    const match = await this.loadMarriedMatch(matchId, userId);
    if (match.story) throw new BadRequestException('story_already_exists');

    const churchNames =
      draft.churchNames.trim() ||
      [match.userA.profile?.church?.name, match.userB.profile?.church?.name]
        .filter(Boolean)
        .join(' y ');
    if (!churchNames) throw new BadRequestException('church_required');

    const story = await this.prisma.story.create({
      data: {
        matchId,
        names: draft.names.trim(),
        churchNames,
        city: draft.city?.trim() || null,
        marriedAt: draft.marriedAt,
        body: draft.body.trim(),
        submittedById: userId,
        consentAId: match.userAId === userId,
        consentBId: match.userBId === userId,
      },
    });

    const otherId = match.userAId === userId ? match.userBId : match.userAId;
    await this.notifications.notify(
      otherId,
      'RELATIONSHIP',
      'Escribieron la historia de ustedes',
      'Léela y dinos si estás de acuerdo en que se publique. Sin tu sí no se publica.',
      { matchId },
    );
    return { id: story.id, status: story.status };
  }

  /**
   * The other person agrees, and only then does it reach moderation.
   *
   * Saying no deletes the draft rather than parking it: a story one of the two
   * does not want told should not sit in a queue waiting for them to change
   * their mind.
   */
  async consent(matchId: string, userId: string, agree: boolean) {
    const match = await this.loadMarriedMatch(matchId, userId);
    if (!match.story) throw new NotFoundException('story_not_found');
    if (match.story.status !== 'DRAFT') throw new BadRequestException('already_submitted');

    if (!agree) {
      await this.prisma.story.delete({ where: { id: match.story.id } });
      return { deleted: true };
    }

    const updated = await this.prisma.story.update({
      where: { id: match.story.id },
      data: match.userAId === userId ? { consentAId: true } : { consentBId: true },
    });

    if (updated.consentAId && updated.consentBId) {
      // Both agreed: now, and not before, a human reads it.
      await this.prisma.story.update({
        where: { id: updated.id },
        data: { status: 'IN_REVIEW' },
      });
      return { status: 'IN_REVIEW' as const };
    }
    return { status: updated.status };
  }

  // -------------------------------------------------------------------------
  // Moderation
  // -------------------------------------------------------------------------

  async queue() {
    return this.prisma.story.findMany({
      where: { status: 'IN_REVIEW' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decide(storyId: string, moderatorId: string, approve: boolean, note?: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('story_not_found');
    if (story.status !== 'IN_REVIEW') throw new BadRequestException('not_in_review');
    // Belt and braces: the consent check already ran when it entered review,
    // but publishing is irreversible in practice, so it is checked again here.
    if (!story.consentAId || !story.consentBId) throw new ForbiddenException('missing_consent');

    const updated = await this.prisma.story.update({
      where: { id: storyId },
      data: {
        status: approve ? 'PUBLISHED' : 'REJECTED',
        publishedAt: approve ? new Date() : null,
        reviewedById: moderatorId,
        reviewNote: note ?? null,
      },
    });

    await this.audit.log({
      actorId: moderatorId,
      action: approve ? 'STORY_PUBLISHED' : 'STORY_REJECTED',
      targetType: 'STORY',
      targetId: storyId,
      after: { status: updated.status },
    });

    if (story.matchId) {
      const match = await this.prisma.match.findUnique({
        where: { id: story.matchId },
        select: { userAId: true, userBId: true },
      });
      if (match) {
        const title = approve ? 'Su historia ya está publicada' : 'Sobre su historia';
        const body = approve
          ? 'Gracias por contarla. Puede ser justo lo que alguien necesita leer hoy.'
          : note ?? 'No pudimos publicarla por ahora.';
        await Promise.all([
          this.notifications.notify(match.userAId, 'RELATIONSHIP', title, body),
          this.notifications.notify(match.userBId, 'RELATIONSHIP', title, body),
        ]);
      }
    }

    return { status: updated.status };
  }
}
