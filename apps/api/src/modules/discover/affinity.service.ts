import { Injectable } from '@nestjs/common';
import {
  AffinityBreakdown,
  AffinityProfileInput,
  computeAffinity,
  es,
} from '@yugo/shared';
import { SettingsService } from '../../common/settings.service';
import { CatalogService } from '../catalog/catalog.service';

export interface ScorableProfile extends AffinityProfileInput {
  userId: string;
  denominationName: string;
}

/**
 * AffinityService (RF-DES-02/03): weights come from `Setting`, the
 * denomination matrix from the catalog; the maths live in @yugo/shared so
 * they are unit-tested once and reused everywhere.
 */
@Injectable()
export class AffinityService {
  constructor(
    private readonly settings: SettingsService,
    private readonly catalog: CatalogService,
  ) {}

  async score(
    viewer: ScorableProfile,
    candidate: ScorableProfile,
    distanceKm: number,
  ): Promise<AffinityBreakdown | null> {
    const [weights, matrix] = await Promise.all([
      this.settings.getAffinityWeights(),
      this.catalog.denominationAffinityMap(),
    ]);
    const breakdown = computeAffinity(viewer, candidate, {
      weights,
      distanceKm,
      denominationAffinity: (a, b) => (a === b ? 100 : (matrix[`${a}|${b}`] ?? 50)),
    });
    if (!breakdown) return null;
    return this.annotate(breakdown, viewer, candidate);
  }

  /** Spanish explanations for the breakdown screen (RF-DES-03). */
  private annotate(
    breakdown: AffinityBreakdown,
    viewer: ScorableProfile,
    candidate: ScorableProfile,
  ): AffinityBreakdown {
    const components = breakdown.components.map((c) => {
      if (c.key === 'denomination') {
        const note =
          viewer.denominationSlug === candidate.denominationSlug
            ? es.affinity.noteSameDenomination
            : c.score >= 60
              ? es.affinity.noteAffine(candidate.denominationName, viewer.denominationName)
              : undefined;
        return { ...c, note };
      }
      if (c.key === 'intention' && viewer.intention === 'MARRIAGE' && candidate.intention === 'MARRIAGE') {
        return { ...c, note: es.affinity.noteIntentionBoth };
      }
      return c;
    });
    return { ...breakdown, components };
  }
}
