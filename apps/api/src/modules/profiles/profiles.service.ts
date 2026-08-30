import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ProfileUpdateInput, SearchPreferencesInput } from '@yugo/shared';
import { ageFromBirthDate, LIMITS } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { SettingsService } from '../../common/settings.service';
import { computeCompleteness } from './completeness';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async getMine(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        denomination: true,
        church: true,
        serviceAreas: { include: { serviceArea: true } },
        answers: true,
        user: { select: { birthDate: true, photos: { orderBy: { position: 'asc' } } } },
      },
    });
    if (!profile) return null;
    const { user, ...rest } = profile;
    return { ...rest, age: ageFromBirthDate(user.birthDate), photos: user.photos };
  }

  /** Creates or updates the profile; recomputes completeness (RF-PER-10). */
  async upsert(userId: string, input: ProfileUpdateInput) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();

    const existing = await this.prisma.profile.findUnique({ where: { userId } });

    const { practiceSlugs, ...fields } = input;

    // Default mandatory age range from own age (RF-PER-08).
    const age = ageFromBirthDate(user.birthDate);
    const limits = await this.settings.getLimits();
    const defaults = existing
      ? {}
      : {
          displayName: fields.displayName ?? 'Miembro',
          ageMin: Math.max(LIMITS.ADULT_AGE, age + limits.ageRangeDefaultOffsets[0]),
          ageMax: age + limits.ageRangeDefaultOffsets[1],
        };

    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update: fields,
      create: { userId, ...defaults, ...fields } as never,
    });

    if (practiceSlugs) {
      const areas = await this.prisma.serviceArea.findMany({
        where: { slug: { in: practiceSlugs } },
      });
      await this.prisma.profileServiceArea.deleteMany({ where: { profileId: userId } });
      await this.prisma.profileServiceArea.createMany({
        data: areas.map((a) => ({ profileId: userId, serviceAreaId: a.id })),
      });
    }

    await this.recomputeCompleteness(userId);
    return this.getMine(userId);
  }

  /**
   * RF-PER-08 + RF-DES-11: mandatory mutual age range. Span >= 3 years,
   * never under 18 — validated in zod AND here (defense in depth).
   */
  async updateSearchPreferences(userId: string, prefs: SearchPreferencesInput) {
    const limits = await this.settings.getLimits();
    if (prefs.ageMin < LIMITS.ADULT_AGE) throw new BadRequestException('age_min_below_adult');
    if (prefs.ageMax - prefs.ageMin < limits.ageRangeMinSpan) {
      throw new BadRequestException('age_range_too_narrow');
    }

    await this.prisma.profile.update({
      where: { userId },
      data: {
        ageMin: prefs.ageMin,
        ageMax: prefs.ageMax,
        maxDistanceKm: prefs.maxDistanceKm,
        prefIntention: prefs.intention,
        prefWithChildren: prefs.withChildren,
        prefMinVerification: prefs.minVerificationLevel,
      },
    });
    // Discover regenerates on next fetch: the cached daily list is keyed by
    // preferences hash (see DiscoverService), so a range change regenerates it (7.2).
    return this.getMine(userId);
  }

  async recomputeCompleteness(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        serviceAreas: true,
        answers: true,
        user: { select: { photos: { where: { moderationStatus: 'APPROVED' } } } },
      },
    });
    if (!profile) return;
    const { completeness } = computeCompleteness({
      ...profile,
      photosApproved: profile.user.photos.length,
      practiceCount: profile.serviceAreas.length,
      answersCount: profile.answers.length,
    });
    await this.prisma.profile.update({ where: { userId }, data: { completeness } });
  }

  /** RF-PER-11: preview "how others see me" — same card Discover would show. */
  async preview(userId: string) {
    const profile = await this.getMine(userId);
    if (!profile) throw new NotFoundException('profile_missing');
    const suggestion = computeCompleteness({
      ...profile,
      photosApproved: profile.photos.filter((p) => p.moderationStatus === 'APPROVED').length,
      practiceCount: profile.serviceAreas.length,
      answersCount: profile.answers.length,
    });
    return { profile, completeness: suggestion };
  }
}
