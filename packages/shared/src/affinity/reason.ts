/**
 * Why this person, today.
 *
 * The affinity score is the product's differentiator, but a bare number asks
 * for trust without earning it. This turns the breakdown into one short,
 * concrete sentence shown on the card itself — the thing that justifies a
 * curated list of a few people instead of an endless feed.
 *
 * Deliberately conservative: it names only real, shared ground. When two
 * people have nothing specific in common it says so plainly rather than
 * inventing a connection.
 */
import type { AffinityBreakdown } from '../types/domain';

export interface ReasonInput {
  affinity: AffinityBreakdown;
  /** Practices, values and traits both people share, strongest first. */
  inCommon?: string[];
  sameDenomination?: boolean;
  sameChurch?: boolean;
  /** Both explicitly look for a relationship with marriage in view. */
  bothSeekMarriage?: boolean;
  /** Set when the candidate is endorsed by their church (RF-VER-02). */
  endorsedBy?: string;
}

/** Joins in Spanish: "a, b y c". */
function joinEs(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

/**
 * One sentence, at most two clauses. Order is by how much the fact tells you
 * about a person: what they do with their faith beats where they attend, and
 * both beat a shared label.
 */
export function affinityReason(input: ReasonInput): string {
  const clauses: string[] = [];
  const shared = (input.inCommon ?? []).filter(Boolean);

  if (shared.length > 0) {
    clauses.push(`Coinciden en ${joinEs(shared.slice(0, 2)).toLowerCase()}`);
  }

  if (input.sameChurch) {
    clauses.push('se congregan en la misma iglesia');
  } else if (input.sameDenomination) {
    clauses.push('comparten denominación');
  }

  if (clauses.length < 2 && input.bothSeekMarriage) {
    clauses.push('ambos buscan una relación con propósito de matrimonio');
  }

  if (clauses.length === 0) {
    // Nothing specific to point at. Say what is actually true — the score —
    // instead of dressing up a coincidence.
    const strongest = [...input.affinity.components].sort((a, b) => b.score - a.score)[0];
    if (strongest && strongest.note) return strongest.note;
    return `Afinidad de fe ${input.affinity.total} de 100`;
  }

  const sentence = clauses.slice(0, 2).join(' y ');
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
