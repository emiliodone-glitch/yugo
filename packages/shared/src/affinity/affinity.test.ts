import { describe, expect, it } from 'vitest';
import {
  AffinityProfileInput,
  agesMutuallyCompatible,
  ageScore,
  computeAffinity,
  denominationScore,
  distanceScore,
  intentionScore,
  jaccard,
  validateWeights,
} from './affinity';
import { DEFAULT_AFFINITY_WEIGHTS } from '../constants/limits';

const matrix: Record<string, number> = {
  'evangelica|bautista': 80,
  'evangelica|catolica': 40,
};
const lookup = (a: string, b: string) =>
  a === b ? 100 : (matrix[`${a}|${b}`] ?? matrix[`${b}|${a}`] ?? 50);

function profile(overrides: Partial<AffinityProfileInput> = {}): AffinityProfileInput {
  return {
    age: 30,
    ageMin: 25,
    ageMax: 38,
    denominationSlug: 'evangelica',
    openness: 'AFFINE',
    intention: 'MARRIAGE',
    practiceSlugs: ['oracion', 'estudio-biblico', 'servicio-social'],
    attendance: 'WEEKLY',
    maxDistanceKm: 50,
    ...overrides,
  };
}

describe('agesMutuallyCompatible (RF-DES-11)', () => {
  it('requires BOTH directions to match', () => {
    const a = profile({ age: 30, ageMin: 25, ageMax: 35 });
    const b = profile({ age: 33, ageMin: 28, ageMax: 40 });
    expect(agesMutuallyCompatible(a, b)).toBe(true);

    // B accepts A, but A does not accept B's age → excluded.
    const young = profile({ age: 24, ageMin: 20, ageMax: 40 });
    const strict = profile({ age: 36, ageMin: 30, ageMax: 40 });
    expect(agesMutuallyCompatible(strict, young)).toBe(false);
    expect(agesMutuallyCompatible(young, strict)).toBe(false);
  });

  it('is symmetric in its verdict', () => {
    const a = profile({ age: 26, ageMin: 24, ageMax: 30 });
    const b = profile({ age: 40, ageMin: 25, ageMax: 45 });
    expect(agesMutuallyCompatible(a, b)).toBe(agesMutuallyCompatible(b, a));
  });
});

describe('intentionScore (7.1)', () => {
  it('exact match = 100', () => {
    expect(intentionScore('MARRIAGE', 'MARRIAGE')).toBe(100);
  });
  it('"BOTH" with anything = 70', () => {
    expect(intentionScore('BOTH', 'MARRIAGE')).toBe(70);
    expect(intentionScore('FRIENDSHIP', 'BOTH')).toBe(70);
  });
  it('marriage vs friendship excludes the pair', () => {
    expect(intentionScore('MARRIAGE', 'FRIENDSHIP')).toBeNull();
  });
});

describe('denominationScore', () => {
  it('same denomination = 100 even with openness ALL', () => {
    expect(
      denominationScore(
        { denominationSlug: 'evangelica', openness: 'ALL' },
        { denominationSlug: 'evangelica' },
        lookup,
      ),
    ).toBe(100);
  });
  it('openness ALL fixes different denominations at 80', () => {
    expect(
      denominationScore(
        { denominationSlug: 'evangelica', openness: 'ALL' },
        { denominationSlug: 'catolica' },
        lookup,
      ),
    ).toBe(80);
  });
  it('otherwise reads the matrix', () => {
    expect(
      denominationScore(
        { denominationSlug: 'evangelica', openness: 'AFFINE' },
        { denominationSlug: 'bautista' },
        lookup,
      ),
    ).toBe(80);
  });
});

describe('distanceScore', () => {
  it('decays linearly to 0 at max distance', () => {
    expect(distanceScore(0, 50)).toBe(100);
    expect(distanceScore(25, 50)).toBe(50);
    expect(distanceScore(50, 50)).toBe(0);
    expect(distanceScore(80, 50)).toBe(0);
  });
});

describe('ageScore', () => {
  it('100 inside both ranges, −10 per year outside', () => {
    const a = profile({ age: 30, ageMin: 25, ageMax: 35 });
    const inRange = profile({ age: 33, ageMin: 26, ageMax: 38 });
    expect(ageScore(a, inRange)).toBe(100);

    const twoOut = profile({ age: 37, ageMin: 26, ageMax: 38 }); // 2 years above a.ageMax
    expect(ageScore(a, twoOut)).toBe(80);
  });
});

describe('jaccard', () => {
  it('computes intersection over union as 0–100', () => {
    expect(jaccard(['a', 'b', 'c'], ['b', 'c', 'd'])).toBe(50);
    expect(jaccard([], [])).toBe(0);
    expect(jaccard(['a'], ['a'])).toBe(100);
  });
});

describe('computeAffinity', () => {
  it('returns null for incompatible intentions', () => {
    const viewer = profile({ intention: 'MARRIAGE' });
    const candidate = profile({ intention: 'FRIENDSHIP' });
    expect(computeAffinity(viewer, candidate, { denominationAffinity: lookup, distanceKm: 5 })).toBeNull();
  });

  it('weights the five components into a 0–100 total', () => {
    const viewer = profile();
    const candidate = profile({ denominationSlug: 'bautista' });
    const result = computeAffinity(viewer, candidate, {
      denominationAffinity: lookup,
      distanceKm: 6,
    });
    expect(result).not.toBeNull();
    expect(result!.total).toBeGreaterThan(0);
    expect(result!.total).toBeLessThanOrEqual(100);
    expect(result!.components).toHaveLength(5);
    const den = result!.components.find((c) => c.key === 'denomination');
    expect(den!.score).toBe(80);
  });

  it('perfect twins nearby score close to 100', () => {
    const viewer = profile();
    const candidate = profile();
    const result = computeAffinity(viewer, candidate, {
      denominationAffinity: lookup,
      distanceKm: 0,
    })!;
    expect(result.total).toBe(100);
  });
});

describe('validateWeights (RF-ADM-08)', () => {
  it('accepts the defaults', () => {
    expect(validateWeights(DEFAULT_AFFINITY_WEIGHTS)).toBe(true);
  });
  it('rejects weights not summing 100', () => {
    expect(
      validateWeights({ denomination: 30, intention: 30, practices: 30, distance: 10, age: 10 }),
    ).toBe(false);
  });
});
