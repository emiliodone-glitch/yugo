/**
 * Pure ordering rules for the Discover list (7.1, RF-DES-01/10, 6.9):
 * - Base order: affinity total (desc), then recent activity as tiebreaker.
 * - Level-3 verified get +5 position bonus (ordering only, never shown).
 * - Featured profiles (RF-DES-10) surface in the first positions for 24 h.
 * - Oro members hold preferential position among compatible profiles.
 */
export interface RankableCandidate {
  userId: string;
  affinityTotal: number;
  level3Verified: boolean;
  isOro: boolean;
  isFeatured: boolean;
  lastActiveAt: Date;
}

/** Minimum affinity for the Oro/featured boost to apply ("entre los primeros compatibles"). */
const COMPATIBILITY_FLOOR = 55;

export function orderingScore(candidate: RankableCandidate, level3Bonus: number): number {
  let score = candidate.affinityTotal;
  if (candidate.level3Verified) score += level3Bonus;
  if (candidate.affinityTotal >= COMPATIBILITY_FLOOR) {
    if (candidate.isFeatured) score += 25;
    if (candidate.isOro) score += 15;
  }
  return score;
}

export function rankCandidates<T extends RankableCandidate>(
  candidates: T[],
  level3Bonus: number,
): T[] {
  return [...candidates].sort((a, b) => {
    const diff = orderingScore(b, level3Bonus) - orderingScore(a, level3Bonus);
    if (diff !== 0) return diff;
    return b.lastActiveAt.getTime() - a.lastActiveAt.getTime();
  });
}
