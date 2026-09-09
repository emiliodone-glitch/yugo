/**
 * Why this person, today.
 *
 * The affinity score is the product's differentiator, but a bare number asks
 * for trust without earning it. This turns the breakdown into two or three
 * short, concrete sentences shown on the card itself — the thing that
 * justifies a curated list of a few people instead of an endless feed.
 *
 * Deliberately conservative: it names only real, shared ground. When two
 * people have nothing specific in common it says so plainly rather than
 * inventing a connection. Never a percentage: a reason you can check beats a
 * number you have to believe.
 */
import type { AffinityBreakdown } from '../types/domain';

/**
 * What the two people have already done together inside Yugo, outside of
 * dating: the community half of the product feeding the other half.
 */
export interface CommunitySignals {
  /** A group both belong to. */
  sharedGroup?: string;
  /** Prayer requests both interceded for in the last 30 days. */
  prayedTogether?: number;
  /** A devotional both reflected on recently (its reference, e.g. «Rut 1:16»). */
  sharedDevotional?: string;
  /** A past event both attended. */
  attendedTogether?: string;
}

export interface ReasonInput {
  affinity: AffinityBreakdown;
  /** Practices, values and traits both people share, strongest first. */
  inCommon?: string[];
  sameDenomination?: boolean;
  sameChurch?: boolean;
  /** Both explicitly look for a relationship with marriage in view. */
  bothSeekMarriage?: boolean;
  /** Both said they want children, or both said they already have them. */
  bothWantChildren?: boolean;
  /** Set when the candidate is endorsed by their church (RF-VER-02). */
  endorsedBy?: string;
  /** Straight-line distance, when the candidate lets it be shown. */
  distanceKm?: number;
  sameCity?: boolean;
  /**
   * An upcoming event both of them said they are going to.
   *
   * This outranks everything else on the card, and deliberately so: a shared
   * denomination is a label, but "they will both be in the same room on
   * Friday" is a real, checkable fact — and it turns a profile into a
   * introduction that can happen among people they know, which is safer than
   * any first date arranged from scratch.
   */
  sharedEvent?: { title: string; whenLabel: string };
  community?: CommunitySignals;
}

/** Joins in Spanish: "a, b y c". */
function joinEs(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/**
 * Up to three reasons, most telling first. Order is by how much the fact
 * tells you about a person: something they already did together beats what
 * they do with their faith, which beats where they attend, which beats a
 * shared label. Each reason is one sentence a person could verify.
 */
export function affinityReasons(input: ReasonInput, max = 3): string[] {
  const reasons: string[] = [];
  const push = (text: string) => {
    if (text && !reasons.includes(text) && reasons.length < max) reasons.push(text);
  };

  // Coincidir en un evento gana a cualquier otra razón: es lo único que
  // convierte una sugerencia en una presentación posible.
  if (input.sharedEvent) {
    push(`Los dos van a «${input.sharedEvent.title}» ${input.sharedEvent.whenLabel}.`);
  }

  // Lo que ya hicieron juntos en Yugo: la comunidad alimentando las citas.
  const community = input.community ?? {};
  if (community.attendedTogether) {
    push(`Coincidieron en «${community.attendedTogether}».`);
  }
  if (community.prayedTogether && community.prayedTogether > 0) {
    push(
      community.prayedTogether === 1
        ? 'Oraron por la misma petición este mes.'
        : `Oraron por ${community.prayedTogether} de las mismas peticiones este mes.`,
    );
  }
  if (community.sharedDevotional) {
    push(`Los dos reflexionaron sobre ${community.sharedDevotional}.`);
  }
  if (community.sharedGroup) {
    push(`Comparten el grupo «${community.sharedGroup}».`);
  }

  const shared = (input.inCommon ?? []).filter(Boolean);
  if (shared.length > 0) {
    push(`Coinciden en ${joinEs(shared.slice(0, 2)).toLowerCase()}.`);
  }

  if (input.sameChurch) {
    push('Se congregan en la misma iglesia.');
  } else if (input.sameDenomination) {
    push('Comparten denominación.');
  }

  if (input.bothSeekMarriage) {
    push('Ambos buscan una relación con propósito de matrimonio.');
  }
  if (input.bothWantChildren) {
    push('Los dos quieren formar familia con hijos.');
  }

  if (input.sameCity && input.distanceKm != null && input.distanceKm <= 10) {
    push(`Viven a ${Math.max(1, Math.round(input.distanceKm))} km.`);
  } else if (input.sameCity) {
    push('Viven en la misma ciudad.');
  }

  if (reasons.length === 0) {
    // Nothing specific to point at. Say what is actually true — the strongest
    // component of the score — instead of dressing up a coincidence.
    const strongest = [...input.affinity.components].sort((a, b) => b.score - a.score)[0];
    if (strongest && strongest.note) push(capitalize(strongest.note));
    else push(`Afinidad de fe ${input.affinity.total} de 100.`);
  }

  return reasons;
}

/**
 * One sentence, at most two clauses: the compact form for tight layouts. It
 * is the same ordering as `affinityReasons`, folded into a single line.
 */
export function affinityReason(input: ReasonInput): string {
  if (input.sharedEvent) {
    return `Los dos van a «${input.sharedEvent.title}» ${input.sharedEvent.whenLabel}.`;
  }

  const clauses: string[] = [];
  const community = input.community ?? {};
  if (community.attendedTogether) clauses.push(`coincidieron en «${community.attendedTogether}»`);
  else if (community.prayedTogether) clauses.push('oraron por la misma petición este mes');
  else if (community.sharedDevotional) {
    clauses.push(`reflexionaron sobre ${community.sharedDevotional}`);
  } else if (community.sharedGroup) clauses.push(`comparten el grupo «${community.sharedGroup}»`);

  const shared = (input.inCommon ?? []).filter(Boolean);
  if (shared.length > 0) {
    clauses.push(`coinciden en ${joinEs(shared.slice(0, 2)).toLowerCase()}`);
  }

  if (clauses.length < 2) {
    if (input.sameChurch) clauses.push('se congregan en la misma iglesia');
    else if (input.sameDenomination) clauses.push('comparten denominación');
  }

  if (clauses.length < 2 && input.bothSeekMarriage) {
    clauses.push('ambos buscan una relación con propósito de matrimonio');
  }

  if (clauses.length === 0) {
    const strongest = [...input.affinity.components].sort((a, b) => b.score - a.score)[0];
    if (strongest && strongest.note) return strongest.note;
    return `Afinidad de fe ${input.affinity.total} de 100`;
  }

  return `${capitalize(clauses.slice(0, 2).join(' y '))}.`;
}
