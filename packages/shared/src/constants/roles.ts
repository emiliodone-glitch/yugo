/**
 * Who lands where after signing in.
 *
 * Staff roles work in the admin panel; an account that only holds church
 * portal seats (no member profile) works in the church portal. Everyone
 * else is a member and goes home. Kept in shared so web and mobile agree.
 */
export const STAFF_ROLES = new Set([
  'MODERATOR',
  'COMMUNITY_MANAGER',
  'SUPPORT',
  'FINANCE',
  'SUPERADMIN',
]);

export interface HomeRouteInput {
  role: string;
  profile: unknown | null;
  churchMemberships?: Array<{ churchId: string; role?: string }> | null;
}

/**
 * Staff → panel. A church administrator → portal even with a member profile
 * (running the church's presence is why that account exists; the portal
 * links back to the app). An event editor who is also a member → home; an
 * event editor without a profile → portal. Everyone else → home.
 */
export function homeRouteFor(me: HomeRouteInput): '/admin' | '/iglesias' | '/inicio' {
  if (STAFF_ROLES.has(me.role)) return '/admin';
  const seats = me.churchMemberships ?? [];
  if (seats.some((seat) => seat.role === 'ADMIN')) return '/iglesias';
  if (!me.profile && seats.length > 0) return '/iglesias';
  return '/inicio';
}
