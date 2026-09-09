import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SettingsService } from '../../common/settings.service';
import { TextModerationService } from '../moderation/text-moderation.service';
import { ProfilesService } from './profiles.service';

/**
 * RF-PER-09: short answers to conversation questions. They feed the
 * icebreakers (RF-CON-04) and count toward profile completeness, so every
 * answer is moderated like any other user text (RF-SEG-02). The catalog is
 * administrable from the panel (SETTING_KEYS.PROFILE_QUESTIONS).
 */
@Injectable()
export class AnswersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: TextModerationService,
    private readonly profiles: ProfilesService,
    private readonly settings: SettingsService,
  ) {}

  catalog() {
    return this.settings.getProfileQuestions();
  }

  async list(userId: string) {
    return this.prisma.profileAnswer.findMany({ where: { profileId: userId } });
  }

  /**
   * Answers with the question text resolved, for cards and detail screens.
   * Answers to questions no longer in the catalog are kept but not shown.
   */
  async publicAnswers(userId: string, limit = 3) {
    const [catalog, rows] = await Promise.all([this.catalog(), this.list(userId)]);
    const byKey = new Map(catalog.map((q) => [q.key, q.question]));
    return rows
      .filter((row) => byKey.has(row.question))
      .slice(0, limit)
      .map((row) => ({ question: byKey.get(row.question) as string, answer: row.answer }));
  }

  async upsert(userId: string, key: string, answer: string) {
    const definition = (await this.catalog()).find((q) => q.key === key);
    if (!definition) throw new BadRequestException('unknown_question');
    const trimmed = answer.trim();
    if (trimmed.length > definition.maxLength) throw new BadRequestException('answer_too_long');

    const verdict = await this.moderation.moderate(trimmed, 'profile conversation answer');
    if (verdict.decision === 'REJECT') throw new BadRequestException('answer_rejected');

    const record = await this.prisma.profileAnswer.upsert({
      where: { profileId_question: { profileId: userId, question: key } },
      update: { answer: trimmed },
      create: { profileId: userId, question: key, answer: trimmed },
    });
    await this.profiles.recomputeCompleteness(userId);
    return record;
  }

  async remove(userId: string, key: string) {
    await this.prisma.profileAnswer.deleteMany({ where: { profileId: userId, question: key } });
    await this.profiles.recomputeCompleteness(userId);
    return { removed: true };
  }
}
