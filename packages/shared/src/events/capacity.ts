/**
 * Cupo de un encuentro.
 *
 * A church that convokes an encuentro has a room with a real number of chairs.
 * The rule here exists because the previous one did not respect that: when an
 * event filled up, an Oro subscription simply walked past the limit. The
 * comment in the code promised "a small reserved buffer" that was never
 * implemented, so in practice money bought a seat that did not exist.
 *
 * The honest rule, and the one below: **capacity is never exceeded.** Oro's
 * priority is a reserved share *inside* the capacity, held back so that
 * someone who pays is not beaten to every seat within minutes — and the
 * reserve dissolves shortly before the event, so an empty held seat becomes a
 * seat anyone can take rather than an empty chair.
 *
 * Everyone else who wants to come joins a waitlist, in order, and moves up
 * when somebody cancels. Telling a person "no" and forgetting them is how you
 * lose them; telling them "you are third" is how a congregation fills a room.
 */

/** Share of the seats held for Oro until the reserve dissolves. */
export const ORO_RESERVED_SHARE = 0.1;

/** Hours before the start when held seats open to everyone. */
export const RESERVE_RELEASE_HOURS = 48;

export type SeatOutcome = 'seat' | 'waitlist' | 'unlimited';

export interface SeatRequest {
  /** Null means the church set no limit. */
  capacity: number | null;
  /** People already holding a confirmed seat. */
  taken: number;
  tier: 'FREE' | 'PLUS' | 'ORO' | null;
  /** Hours from now until the event starts. */
  hoursUntilStart: number;
}

/**
 * How many seats are held back for Oro right now.
 *
 * Always at least one below capacity: a reserve that swallowed the last seat
 * would turn "priority" into "exclusivity", which is not what anybody bought.
 */
export function reservedSeats(capacity: number, hoursUntilStart: number): number {
  if (hoursUntilStart <= RESERVE_RELEASE_HOURS) return 0;
  return Math.min(Math.floor(capacity * ORO_RESERVED_SHARE), Math.max(capacity - 1, 0));
}

/**
 * Whether this person gets a seat or a place in the queue.
 *
 * Note what cannot happen: no tier, no combination of arguments, returns
 * 'seat' once `taken >= capacity`. A paid plan changes who gets a seat first,
 * never how many seats the room has.
 */
export function seatFor(request: SeatRequest): SeatOutcome {
  const { capacity, taken, tier, hoursUntilStart } = request;
  if (capacity === null) return 'unlimited';
  if (taken >= capacity) return 'waitlist';

  if (tier === 'ORO') return 'seat';

  const held = reservedSeats(capacity, hoursUntilStart);
  return taken < capacity - held ? 'seat' : 'waitlist';
}

/** Seats a non-Oro member can still take right now, for the interface to show. */
export function openSeats(
  capacity: number | null,
  taken: number,
  hoursUntilStart: number,
): number | null {
  if (capacity === null) return null;
  const held = reservedSeats(capacity, hoursUntilStart);
  return Math.max(0, capacity - held - taken);
}
