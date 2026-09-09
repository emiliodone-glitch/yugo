import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IntroductionForMember, IntroductionForMentor } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { TextModerationService } from '../moderation/text-moderation.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Días que una presentación espera respuesta antes de caducar sola. */
export const INTRODUCTION_TTL_DAYS = 14;

type Status = 'PENDING' | 'ACCEPTED' | 'DECLINED';

/**
 * Presentación por padrino (RF-ACO-05).
 *
 * Un matrimonio que acompaña (perfil de padrino activo, respaldado por su
 * iglesia) propone presentar a dos personas que conoce. Las reglas que la
 * hacen defendible:
 *
 * - Ninguna de las dos ve a la otra hasta que las dos aceptan. Antes solo ven
 *   quién las presenta, su nota y la iglesia de la otra persona.
 * - Cualquiera puede decir que no, y el padrino no sabe quién dijo que no:
 *   se le dice que «no se concretó».
 * - Solo cuando ambas aceptan nace la conexión, exactamente igual que un
 *   interés mutuo: mismo vínculo, misma conversación, mismas reglas.
 */
@Injectable()
export class IntroductionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly moderation: TextModerationService,
  ) {}

  private async resolvePerson(identifier: string) {
    const value = identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [{ email: value.toLowerCase() }, { phone: value.replace(/[\s-]/g, '') }],
      },
      include: { profile: { include: { church: true } } },
    });
    return user && user.profile ? user : null;
  }

  async propose(mentorId: string, input: { a: string; b: string; note: string }) {
    const mentor = await this.prisma.mentorProfile.findUnique({ where: { userId: mentorId } });
    if (!mentor || !mentor.active) throw new ForbiddenException('needs_mentor_profile');

    const note = input.note.trim();
    if (note.length < 20) throw new BadRequestException('note_too_short');
    const verdict = await this.moderation.moderate(note, 'introduction note');
    if (verdict.decision !== 'APPROVE') throw new BadRequestException('note_rejected');

    const [a, b] = await Promise.all([this.resolvePerson(input.a), this.resolvePerson(input.b)]);
    // La misma respuesta para «no existe» y «no está activa»: un padrino no
    // debe poder averiguar desde aquí quién tiene cuenta en Yugo.
    if (!a || !b) throw new BadRequestException('person_not_found');
    if (a.id === b.id) throw new BadRequestException('same_person');
    if (a.id === mentorId || b.id === mentorId)
      throw new BadRequestException('cannot_include_self');
    if (a.gender === b.gender) throw new BadRequestException('incompatible_people');

    const [userAId, userBId] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
    });
    if (blocked) throw new BadRequestException('person_not_found');

    const match = await this.prisma.match.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
    if (match?.status === 'ACTIVE') throw new BadRequestException('already_connected');

    const open = await this.prisma.introduction.findFirst({
      where: { userAId, userBId, status: 'PENDING', expiresAt: { gt: new Date() } },
    });
    if (open) throw new BadRequestException('introduction_pending');

    const row = await this.prisma.introduction.create({
      data: {
        proposerId: mentorId,
        userAId,
        userBId,
        note,
        expiresAt: new Date(Date.now() + INTRODUCTION_TTL_DAYS * 86_400_000),
      },
    });

    const mentorName = await this.nameOf(mentorId);
    await Promise.all(
      [userAId, userBId].map((userId) =>
        this.notifications.notify(
          userId,
          'CONNECTION',
          `${mentorName} quiere presentarte a alguien`,
          note.slice(0, 120),
          { introductionId: row.id },
        ),
      ),
    );
    return this.describeForMentor(row.id);
  }

  /** Lo que ve una de las dos personas: quién presenta, la nota, la iglesia. */
  async mine(userId: string): Promise<IntroductionForMember[]> {
    const rows = await this.prisma.introduction.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        proposer: { include: { profile: { include: { church: true } } } },
        userA: { include: { profile: { include: { church: true } } } },
        userB: { include: { profile: { include: { church: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => {
      const iAmA = row.userAId === userId;
      const other = iAmA ? row.userB : row.userA;
      return {
        id: row.id,
        proposer: {
          displayName: row.proposer.profile?.displayName ?? 'Un padrino',
          churchName: row.proposer.profile?.church?.name,
        },
        note: row.note,
        // Nada que identifique: la iglesia y la ciudad, no el nombre ni la foto.
        otherHint: {
          churchName: other.profile?.church?.name,
          city: other.profile?.city ?? undefined,
        },
        myStatus: (iAmA ? row.statusA : row.statusB) as Status,
        theyAnswered: (iAmA ? row.statusB : row.statusA) !== 'PENDING',
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
      };
    });
  }

  async respond(id: string, userId: string, accept: boolean) {
    const row = await this.prisma.introduction.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('introduction_not_found');
    if (row.userAId !== userId && row.userBId !== userId) throw new ForbiddenException();
    if (row.status !== 'PENDING') throw new BadRequestException('introduction_closed');
    if (row.expiresAt < new Date()) {
      await this.prisma.introduction.update({ where: { id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('introduction_expired');
    }

    const iAmA = row.userAId === userId;
    const mine: Status = accept ? 'ACCEPTED' : 'DECLINED';
    const theirs = (iAmA ? row.statusB : row.statusA) as Status;

    if (!accept) {
      await this.prisma.introduction.update({
        where: { id },
        data: { [iAmA ? 'statusA' : 'statusB']: mine, status: 'DECLINED', resolvedAt: new Date() },
      });
      // Al padrino no se le dice quién dijo que no.
      await this.notifications.notify(
        row.proposerId,
        'CONNECTION',
        'La presentación no se concretó',
        'Una de las dos personas prefirió no seguir. Gracias por intentarlo; a veces el tiempo no es este.',
        { introductionId: id },
      );
      return { status: 'DECLINED' as const, matched: false };
    }

    if (theirs !== 'ACCEPTED') {
      await this.prisma.introduction.update({
        where: { id },
        data: { [iAmA ? 'statusA' : 'statusB']: mine },
      });
      return { status: 'PENDING' as const, matched: false };
    }

    // Las dos dijeron que sí: nace la conexión igual que con un interés mutuo.
    const match = await this.prisma.match.upsert({
      where: { userAId_userBId: { userAId: row.userAId, userBId: row.userBId } },
      update: { status: 'ACTIVE', endedAt: null, endedById: null },
      create: { userAId: row.userAId, userBId: row.userBId, conversation: { create: {} } },
      include: { conversation: true },
    });
    await this.prisma.introduction.update({
      where: { id },
      data: {
        [iAmA ? 'statusA' : 'statusB']: mine,
        status: 'MATCHED',
        matchId: match.id,
        resolvedAt: new Date(),
      },
    });
    const conversationData = match.conversation
      ? { conversationId: match.conversation.id }
      : undefined;
    const mentorName = await this.nameOf(row.proposerId);
    await Promise.all([
      ...[row.userAId, row.userBId].map((memberId) =>
        this.notifications.notify(
          memberId,
          'CONNECTION',
          'Presentación aceptada',
          `${mentorName} los presentó y los dos dijeron que sí. Ya pueden conversar.`,
          conversationData,
        ),
      ),
      this.notifications.notify(
        row.proposerId,
        'CONNECTION',
        'Se saludaron',
        'Las dos personas aceptaron la presentación. Lo que hablen es de ellas; tú ya hiciste tu parte.',
        { introductionId: id },
      ),
    ]);
    return { status: 'MATCHED' as const, matched: true, conversationId: match.conversation?.id };
  }

  /** Lo que ve el padrino: a quiénes presentó y en qué quedó cada una. */
  async proposed(mentorId: string): Promise<IntroductionForMentor[]> {
    const rows = await this.prisma.introduction.findMany({
      where: { proposerId: mentorId },
      include: {
        userA: { include: { profile: { select: { displayName: true } } } },
        userB: { include: { profile: { select: { displayName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return rows.map((row) => this.toMentorView(row));
  }

  private async describeForMentor(id: string): Promise<IntroductionForMentor> {
    const row = await this.prisma.introduction.findUniqueOrThrow({
      where: { id },
      include: {
        userA: { include: { profile: { select: { displayName: true } } } },
        userB: { include: { profile: { select: { displayName: true } } } },
      },
    });
    return this.toMentorView(row);
  }

  private toMentorView(row: {
    id: string;
    note: string;
    status: string;
    createdAt: Date;
    expiresAt: Date;
    userA: { profile: { displayName: string } | null };
    userB: { profile: { displayName: string } | null };
  }): IntroductionForMentor {
    const expired = row.status === 'PENDING' && row.expiresAt < new Date();
    return {
      id: row.id,
      names: [
        row.userA.profile?.displayName ?? 'Miembro',
        row.userB.profile?.displayName ?? 'Miembro',
      ],
      note: row.note,
      // El padrino ve el resultado, nunca quién dijo que no ni cuándo.
      status: (expired ? 'EXPIRED' : row.status) as IntroductionForMentor['status'],
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  private async nameOf(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { displayName: true },
    });
    return profile?.displayName ?? 'Un padrino';
  }
}
