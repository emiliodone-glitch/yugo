import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LIMITS, type CreateGroupInput } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { TextModerationService } from '../moderation/text-moderation.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: TextModerationService,
    private readonly notifications: NotificationsService,
  ) {}

  async myGroups(userId: string) {
    const groups = await this.prisma.group.findMany({
      where: { status: 'ACTIVE', members: { some: { userId } } },
      include: {
        category: true,
        church: { select: { name: true } },
        _count: { select: { members: true } },
      },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Promise.all(
      groups.map(async (g) => ({
        ...this.toSummary(g),
        joined: true,
        postsToday: await this.prisma.post.count({
          where: { groupId: g.id, createdAt: { gte: today }, moderationStatus: 'APPROVED' },
        }),
      })),
    );
  }

  /** RF-COM-09: suggestions by denomination, city and service areas. */
  async suggestedGroups(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { serviceAreas: { include: { serviceArea: true } } },
    });
    const groups = await this.prisma.group.findMany({
      where: { status: 'ACTIVE', members: { none: { userId } } },
      include: {
        category: true,
        church: { select: { name: true, denominationId: true } },
        _count: { select: { members: true } },
      },
      take: 30,
    });
    const areaNames = new Set(profile?.serviceAreas.map((sa) => sa.serviceArea.name.toLowerCase()));
    const scored = groups
      .map((g) => {
        let score = 0;
        if (g.city && profile?.city && g.city.toLowerCase().includes(profile.city.toLowerCase())) score += 2;
        if (g.church?.denominationId && g.church.denominationId === profile?.denominationId) score += 2;
        if (g.category && areaNames.has(g.category.name.toLowerCase())) score += 3;
        return { g, score };
      })
      .sort((a, b) => b.score - a.score);
    return scored.map(({ g }) => ({ ...this.toSummary(g), joined: false }));
  }

  private toSummary(group: {
    id: string;
    name: string;
    type: string;
    city: string | null;
    churchId: string | null;
    category: { name: string } | null;
    church: { name: string } | null;
    _count: { members: number };
  }) {
    return {
      id: group.id,
      name: group.name,
      category: group.category?.name ?? '',
      type: group.type,
      city: group.city ?? undefined,
      memberCount: group._count.members,
      isOfficial: group.type === 'OFFICIAL',
      churchName: group.church?.name,
    };
  }

  /** RF-COM-02: level-2 members create groups; community manager approves. */
  async createGroup(userId: string, input: CreateGroupInput) {
    const level2 = await this.prisma.verification.findFirst({
      where: { userId, level: 2, status: 'APPROVED' },
    });
    if (!level2) throw new ForbiddenException('level2_required');

    const administered = await this.prisma.groupMember.count({
      where: { userId, role: 'ADMIN', group: { status: { in: ['ACTIVE', 'PENDING'] } } },
    });
    if (administered >= LIMITS.MAX_GROUPS_ADMINISTERED) {
      throw new BadRequestException('max_groups_administered');
    }

    const category = await this.prisma.groupCategory.findUnique({
      where: { slug: input.categorySlug },
    });
    return this.prisma.group.create({
      data: {
        name: input.name,
        description: input.description,
        categoryId: category?.id,
        city: input.city,
        type: input.type,
        status: 'PENDING', // community manager approval (RF-COM-02)
        ownerId: userId,
        members: { create: { userId, role: 'ADMIN' } },
      },
    });
  }

  /**
   * RF-COM-02: open groups join immediately; groups "con aprobación" queue a
   * request for their admins. Official church groups are open to members too.
   */
  async joinGroup(userId: string, groupId: string, message?: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.status !== 'ACTIVE') throw new NotFoundException();

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (existing) return { joined: true, pending: false };

    if (group.type === 'APPROVAL') {
      const request = await this.prisma.groupJoinRequest.upsert({
        where: { groupId_userId: { groupId, userId } },
        update: { status: 'PENDING', message, resolvedAt: null },
        create: { groupId, userId, message },
      });
      return { joined: false, pending: true, requestId: request.id };
    }

    await this.prisma.groupMember.create({ data: { groupId, userId } });
    return { joined: true, pending: false };
  }

  /** Pending join requests for the admins of a group (RF-COM-02/07). */
  async joinRequests(actorId: string, groupId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: actorId } },
    });
    if (!membership || membership.role === 'MEMBER') throw new ForbiddenException('admin_required');

    const requests = await this.prisma.groupJoinRequest.findMany({
      where: { groupId, status: 'PENDING' },
      include: {
        user: {
          include: {
            profile: { select: { displayName: true, city: true } },
            verifications: { where: { status: 'APPROVED' }, select: { level: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return requests.map((request) => ({
      id: request.id,
      userId: request.userId,
      displayName: request.user.profile?.displayName ?? 'Miembro',
      city: request.user.profile?.city,
      verificationLevel: Math.max(1, ...request.user.verifications.map((v) => v.level)),
      message: request.message,
      createdAt: request.createdAt,
    }));
  }

  async resolveJoinRequest(actorId: string, requestId: string, accept: boolean) {
    const request = await this.prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException();

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: request.groupId, userId: actorId } },
    });
    if (!membership || membership.role === 'MEMBER') throw new ForbiddenException('admin_required');

    await this.prisma.groupJoinRequest.update({
      where: { id: requestId },
      data: {
        status: accept ? 'CONFIRMED' : 'DECLINED',
        resolvedAt: new Date(),
        resolvedById: actorId,
      },
    });
    if (accept) {
      await this.prisma.groupMember.upsert({
        where: { groupId_userId: { groupId: request.groupId, userId: request.userId } },
        update: {},
        create: { groupId: request.groupId, userId: request.userId },
      });
      await this.notifications.notify(
        request.userId,
        'GROUP',
        'Solicitud aprobada',
        'Ya eres parte del grupo. ¡Bienvenido!',
        { groupId: request.groupId },
      );
    }
    return { resolved: true, accepted: accept };
  }

  async groupDetail(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        category: true,
        church: { select: { name: true } },
        _count: { select: { members: true } },
        activities: {
          where: { startsAt: { gt: new Date() } },
          orderBy: { startsAt: 'asc' },
          include: { _count: { select: { attendances: true } } },
        },
      },
    });
    if (!group) throw new NotFoundException();
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    const posts = await this.prisma.post.findMany({
      where: { groupId, moderationStatus: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        author: { include: { profile: { select: { displayName: true } } } },
        reactions: true,
        _count: { select: { comments: true } },
      },
    });
    return {
      ...this.toSummary(group),
      description: group.description,
      joined: !!membership,
      myRole: membership?.role,
      activities: group.activities.map((a) => ({
        id: a.id,
        groupId,
        title: a.title,
        startsAt: a.startsAt,
        place: a.place ?? undefined,
        goingCount: a._count.attendances,
      })),
      posts: posts.map((p) => ({
        id: p.id,
        groupId,
        author: { userId: p.authorId, displayName: p.author.profile?.displayName ?? 'Miembro' },
        body: p.body,
        isPrayerRequest: p.isPrayerRequest,
        prayingCount: p.reactions.filter((r) => r.type === 'PRAYING').length,
        amenCount: p.reactions.filter((r) => r.type === 'AMEN').length,
        likeCount: p.reactions.filter((r) => r.type === 'LIKE').length,
        answered: !!p.answeredAt,
        commentCount: p._count.comments,
        createdAt: p.createdAt,
      })),
    };
  }

  /** RF-COM-04/08: posts are moderated before publishing. */
  async createPost(userId: string, groupId: string, body: string, isPrayerRequest: boolean, imageKey?: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new ForbiddenException('not_member');
    if (membership.mutedUntil && membership.mutedUntil > new Date()) {
      throw new ForbiddenException('muted');
    }

    const verdict = await this.moderation.moderate(body, 'community group post');
    const status =
      verdict.decision === 'APPROVE' ? 'APPROVED' : verdict.decision === 'HOLD' ? 'HELD' : 'REJECTED';

    const post = await this.prisma.post.create({
      data: {
        groupId,
        authorId: userId,
        body,
        imageKey,
        isPrayerRequest,
        moderationStatus: status,
        moderationRisk: verdict.risk,
      },
    });
    if (status !== 'APPROVED') {
      await this.prisma.moderationCase.create({
        data: { kind: 'AI_HELD', priority: 'NORMAL', postId: post.id, subjectUserId: userId },
      });
    }
    await this.prisma.group.update({ where: { id: groupId }, data: { lastPostAt: new Date() } });
    return post;
  }

  /** RF-COM-05: prayer reactions ("Estoy orando") and answered flag. */
  async react(userId: string, postId: string, type: 'AMEN' | 'PRAYING' | 'LIKE') {
    const existing = await this.prisma.reaction.findUnique({
      where: { postId_userId_type: { postId, userId, type } },
    });
    if (existing) {
      await this.prisma.reaction.delete({ where: { postId_userId_type: { postId, userId, type } } });
      return { reacted: false };
    }
    await this.prisma.reaction.create({ data: { postId, userId, type } });
    return { reacted: true };
  }

  async markPrayerAnswered(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post?.isPrayerRequest) throw new BadRequestException('not_prayer_request');
    if (post.authorId !== userId) throw new ForbiddenException();
    await this.prisma.post.update({ where: { id: postId }, data: { answeredAt: new Date() } });
    return { answered: true };
  }

  async comment(userId: string, postId: string, body: string) {
    const verdict = await this.moderation.moderate(body, 'community comment');
    if (verdict.decision === 'REJECT') throw new BadRequestException('comment_rejected');
    return this.prisma.comment.create({
      data: {
        postId,
        authorId: userId,
        body,
        moderationStatus: verdict.decision === 'APPROVE' ? 'APPROVED' : 'HELD',
      },
    });
  }

  /** RF-COM-06: light group activities with attendance. */
  async createActivity(userId: string, input: { groupId: string; title: string; startsAt: Date; place?: string }) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: input.groupId, userId } },
    });
    if (!membership || membership.role === 'MEMBER') throw new ForbiddenException('admin_required');
    return this.prisma.groupActivity.create({ data: input });
  }

  async attendActivity(userId: string, activityId: string) {
    const existing = await this.prisma.activityAttendance.findUnique({
      where: { activityId_userId: { activityId, userId } },
    });
    if (existing) {
      await this.prisma.activityAttendance.delete({
        where: { activityId_userId: { activityId, userId } },
      });
      return { going: false };
    }
    await this.prisma.activityAttendance.create({ data: { activityId, userId } });
    return { going: true };
  }

  /** RF-COM-07: group roles — expel or mute members. */
  async manageMember(
    actorId: string,
    groupId: string,
    targetId: string,
    action: 'EXPEL' | 'MUTE' | 'UNMUTE' | 'PROMOTE_MODERATOR',
  ) {
    const actor = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: actorId } },
    });
    if (!actor || actor.role === 'MEMBER') throw new ForbiddenException('admin_required');

    switch (action) {
      case 'EXPEL':
        await this.prisma.groupMember.delete({
          where: { groupId_userId: { groupId, userId: targetId } },
        });
        return { done: true };
      case 'MUTE':
        await this.prisma.groupMember.update({
          where: { groupId_userId: { groupId, userId: targetId } },
          data: { mutedUntil: new Date(Date.now() + 7 * 86400000) },
        });
        return { done: true };
      case 'UNMUTE':
        await this.prisma.groupMember.update({
          where: { groupId_userId: { groupId, userId: targetId } },
          data: { mutedUntil: null },
        });
        return { done: true };
      case 'PROMOTE_MODERATOR':
        if (actor.role !== 'ADMIN') throw new ForbiddenException('admin_required');
        await this.prisma.groupMember.update({
          where: { groupId_userId: { groupId, userId: targetId } },
          data: { role: 'MODERATOR' },
        });
        return { done: true };
    }
  }
}
