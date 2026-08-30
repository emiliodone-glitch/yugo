import type { AffinityBreakdown, AffinityComponent, Attendance, Intention, Openness } from '../types/domain';
import { AffinityWeights, DEFAULT_AFFINITY_WEIGHTS } from '../constants/limits';

/**
 * Pure affinity engine (business rule 7.1, RF-DES-02/03).
 * The API's AffinityService feeds it data from PostGIS + Settings; being pure
 * lets us unit-test the exact scoring rules and reuse the maths in demo mode.
 */

export interface AffinityProfileInput {
  age: number;
  ageMin: number;
  ageMax: number;
  denominationSlug: string;
  openness: Openness;
  intention: Intention;
  practiceSlugs: string[];
  attendance: Attendance;
  /** Preferred maximum distance in km for the *viewer* side. */
  maxDistanceKm: number;
}

export interface AffinityContext {
  /** Symmetric denomination matrix lookup, 0–100. Same slug should return 100. */
  denominationAffinity: (a: string, b: string) => number;
  distanceKm: number;
  weights?: AffinityWeights;
}

/**
 * RF-DES-11 — strict, mutual age rule. A is shown to B only when A's age
 * falls in B's declared range AND B's age falls in A's range. Enforced in the
 * Discover SQL query too; this helper keeps ordering/tests honest.
 */
export function agesMutuallyCompatible(
  a: Pick<AffinityProfileInput, 'age' | 'ageMin' | 'ageMax'>,
  b: Pick<AffinityProfileInput, 'age' | 'ageMin' | 'ageMax'>,
): boolean {
  return a.age >= b.ageMin && a.age <= b.ageMax && b.age >= a.ageMin && b.age <= a.ageMax;
}

/** Intention component (7.1). Returns null when profiles must be excluded. */
export function intentionScore(a: Intention, b: Intention): number | null {
  if (a === b) return 100;
  if (a === 'BOTH' || b === 'BOTH') return 70;
  // MARRIAGE vs FRIENDSHIP — incompatible: excluded from Discover.
  return null;
}

/** Jaccard index over practice/service-area sets, as 0–100. */
export function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) if (setB.has(item)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

export function denominationScore(
  viewer: Pick<AffinityProfileInput, 'denominationSlug' | 'openness'>,
  candidate: Pick<AffinityProfileInput, 'denominationSlug'>,
  lookup: AffinityContext['denominationAffinity'],
): number {
  // "Abierto a todas" fixes the component at 80 for everyone (7.1),
  // except an exact denomination match which stays 100.
  if (viewer.denominationSlug === candidate.denominationSlug) return 100;
  if (viewer.openness === 'ALL') return 80;
  return lookup(viewer.denominationSlug, candidate.denominationSlug);
}

/** Distance decays linearly to 0 at the viewer's configured max distance (7.1). */
export function distanceScore(distanceKm: number, maxDistanceKm: number): number {
  if (maxDistanceKm <= 0) return 0;
  if (distanceKm <= 0) return 100;
  if (distanceKm >= maxDistanceKm) return 0;
  return Math.round((1 - distanceKm / maxDistanceKm) * 100);
}

/** 100 inside both preferred ranges; −10 points per year outside (7.1). */
export function ageScore(
  viewer: Pick<AffinityProfileInput, 'age' | 'ageMin' | 'ageMax'>,
  candidate: Pick<AffinityProfileInput, 'age' | 'ageMin' | 'ageMax'>,
): number {
  const yearsOutside = (age: number, min: number, max: number) =>
    age < min ? min - age : age > max ? age - max : 0;
  const outside =
    yearsOutside(candidate.age, viewer.ageMin, viewer.ageMax) +
    yearsOutside(viewer.age, candidate.ageMin, candidate.ageMax);
  return Math.max(0, 100 - outside * 10);
}

export function practicesScore(viewer: AffinityProfileInput, candidate: AffinityProfileInput): number {
  const base = jaccard(viewer.practiceSlugs, candidate.practiceSlugs);
  // Attendance match sweetens the practices component (7.1 mentions
  // attendance/values as part of it): 70% Jaccard + 30% attendance proximity.
  const order: Attendance[] = ['OCCASIONAL', 'MONTHLY', 'BIWEEKLY', 'WEEKLY'];
  const gap = Math.abs(order.indexOf(viewer.attendance) - order.indexOf(candidate.attendance));
  const attendanceComponent = Math.max(0, 100 - gap * 33);
  return Math.round(base * 0.7 + attendanceComponent * 0.3);
}

/**
 * Full breakdown, or `null` when the pair must be excluded from Discover
 * (incompatible intention). Mutual age exclusion is enforced upstream in SQL;
 * this function still scores age so previews/tests can show the decay.
 */
export function computeAffinity(
  viewer: AffinityProfileInput,
  candidate: AffinityProfileInput,
  ctx: AffinityContext,
): AffinityBreakdown | null {
  const weights = ctx.weights ?? DEFAULT_AFFINITY_WEIGHTS;
  const intention = intentionScore(viewer.intention, candidate.intention);
  if (intention === null) return null;

  const components: AffinityComponent[] = [
    {
      key: 'denomination',
      score: denominationScore(viewer, candidate, ctx.denominationAffinity),
    },
    { key: 'intention', score: intention },
    { key: 'practices', score: practicesScore(viewer, candidate) },
    { key: 'distance', score: distanceScore(ctx.distanceKm, viewer.maxDistanceKm) },
    { key: 'age', score: ageScore(viewer, candidate) },
  ];

  const totalWeight =
    weights.denomination + weights.intention + weights.practices + weights.distance + weights.age;
  const weighted =
    components.reduce((sum, c) => sum + c.score * weights[c.key], 0) / (totalWeight || 100);

  return { total: Math.round(weighted), components };
}

/** Validates admin-configured weights: each 0–100 and total exactly 100 (RF-ADM-08). */
export function validateWeights(weights: AffinityWeights): boolean {
  const values = Object.values(weights);
  if (values.some((v) => v < 0 || v > 100 || !Number.isFinite(v))) return false;
  return values.reduce((a, b) => a + b, 0) === 100;
}
