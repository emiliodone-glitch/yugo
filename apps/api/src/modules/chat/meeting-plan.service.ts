import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface MeetingPlanInput {
  place: string;
  meetsAt: Date;
  notes?: string;
  trustedContactLabel?: string;
}

/** Hours after the meeting before the app asks whether they are alright. */
const CHECK_IN_AFTER_HOURS = 3;

/**
 * Plan del primer encuentro (RF-SEG-06).
 *
 * Two decisions carry this whole feature:
 *
 * 1. **The plan is private to the person who wrote it.** The other person in
 *    the bond never sees it and is never told it exists. Telling your sister
 *    where you are going is not something anyone should have to negotiate
 *    with their date.
 *
 * 2. **Yugo never stores or contacts the trusted person.** Keeping a third
 *    party's phone number would mean holding personal data about someone who
 *    never agreed to be here (Ley 172-13). Instead the app writes the message
 *    and the member sends it themselves, from their own phone. What we record
 *    is only that they did.
 *
 * The check-in afterwards is between the member and the app. If they do not
 * answer, we remind *them* — we do not alert anybody on their behalf, because
 * we have nobody to alert and no right to.
 */
@Injectable()
export class MeetingPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async assertParticipant(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('match_not_found');
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new NotFoundException('match_not_found');
    }
    return match;
  }

  /** My plan for this bond, if I made one. Never anybody else's. */
  async mine(matchId: string, userId: string) {
    await this.assertParticipant(matchId, userId);
    const plan = await this.prisma.meetingPlan.findFirst({
      where: { matchId, userId, status: { not: 'CANCELED' } },
      orderBy: { createdAt: 'desc' },
    });
    if (!plan) return { plan: null };
    return { plan: this.present(plan) };
  }

  async create(matchId: string, userId: string, input: MeetingPlanInput) {
    await this.assertParticipant(matchId, userId);
    if (input.meetsAt.getTime() < Date.now()) throw new BadRequestException('meets_at_in_the_past');

    const existing = await this.prisma.meetingPlan.findFirst({
      where: { matchId, userId, status: { in: ['PLANNED', 'SHARED'] } },
    });
    if (existing) {
      const updated = await this.prisma.meetingPlan.update({
        where: { id: existing.id },
        data: { ...input, notes: input.notes ?? null },
      });
      return this.present(updated);
    }

    const plan = await this.prisma.meetingPlan.create({
      data: { matchId, userId, ...input, notes: input.notes ?? null },
    });
    return this.present(plan);
  }

  /** They sent the message. We record that it happened, not who received it. */
  async markShared(planId: string, userId: string) {
    const plan = await this.load(planId, userId);
    const updated = await this.prisma.meetingPlan.update({
      where: { id: plan.id },
      data: { status: 'SHARED', sharedAt: new Date() },
    });
    return this.present(updated);
  }

  async checkIn(planId: string, userId: string) {
    const plan = await this.load(planId, userId);
    const updated = await this.prisma.meetingPlan.update({
      where: { id: plan.id },
      data: { status: 'CHECKED_IN', checkInAt: new Date() },
    });
    return this.present(updated);
  }

  async cancel(planId: string, userId: string) {
    const plan = await this.load(planId, userId);
    await this.prisma.meetingPlan.update({
      where: { id: plan.id },
      data: { status: 'CANCELED' },
    });
    return { canceled: true };
  }

  private async load(planId: string, userId: string) {
    const plan = await this.prisma.meetingPlan.findUnique({ where: { id: planId } });
    // Not "forbidden": a plan someone else wrote should not even be
    // acknowledged to exist.
    if (!plan || plan.userId !== userId) throw new NotFoundException('plan_not_found');
    return plan;
  }

  /**
   * The message the member sends from their own phone.
   *
   * Written here so it is one consistent, complete text rather than whatever
   * someone types while nervous — and so both apps say exactly the same thing.
   */
  private shareText(plan: {
    place: string;
    meetsAt: Date;
    notes: string | null;
  }): string {
    const when = new Intl.DateTimeFormat('es-DO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Santo_Domingo',
    }).format(plan.meetsAt);
    const lines = [
      'Voy a conocer en persona a alguien que conocí en Yugo.',
      `Dónde: ${plan.place}`,
      `Cuándo: ${when}`,
    ];
    if (plan.notes) lines.push(`Nota: ${plan.notes}`);
    lines.push('Te aviso cuando llegue a casa.');
    return lines.join('\n');
  }

  private present(plan: {
    id: string;
    place: string;
    meetsAt: Date;
    notes: string | null;
    trustedContactLabel: string | null;
    status: string;
    sharedAt: Date | null;
    checkInAt: Date | null;
  }) {
    return {
      id: plan.id,
      place: plan.place,
      meetsAt: plan.meetsAt,
      notes: plan.notes,
      trustedContactLabel: plan.trustedContactLabel,
      status: plan.status,
      sharedAt: plan.sharedAt,
      checkInAt: plan.checkInAt,
      shareText: this.shareText(plan),
      /** True once the meeting has passed and they have not said they are fine. */
      awaitingCheckIn:
        plan.status !== 'CHECKED_IN' &&
        plan.meetsAt.getTime() + CHECK_IN_AFTER_HOURS * 3600_000 < Date.now(),
    };
  }

  /**
   * "¿Todo bien?", a few hours after the meeting.
   *
   * Sent to the member and to nobody else. If the answer is that things went
   * badly, what they need is the report and block flows, which is where this
   * notification points them.
   */
  @Cron('0 * * * *')
  async askForCheckIns() {
    const due = await this.prisma.meetingPlan.findMany({
      where: {
        status: { in: ['PLANNED', 'SHARED'] },
        remindedAt: null,
        meetsAt: { lt: new Date(Date.now() - CHECK_IN_AFTER_HOURS * 3600_000) },
      },
      take: 200,
    });

    for (const plan of due) {
      await this.notifications.notify(
        plan.userId,
        'MODERATION',
        '¿Todo bien?',
        plan.trustedContactLabel
          ? `Cuéntanos cómo te fue, y no olvides avisarle a ${plan.trustedContactLabel}.`
          : 'Cuéntanos cómo te fue. Si algo no estuvo bien, puedes reportarlo desde la conversación.',
        { matchId: plan.matchId, planId: plan.id },
      );
      await this.prisma.meetingPlan.update({
        where: { id: plan.id },
        data: { remindedAt: new Date() },
      });
    }
    return { reminded: due.length };
  }
}
