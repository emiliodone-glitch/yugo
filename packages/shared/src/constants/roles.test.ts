import { describe, expect, it } from 'vitest';
import { homeRouteFor } from './roles';

describe('homeRouteFor', () => {
  it('sends staff to the admin panel even if they also have a profile', () => {
    expect(homeRouteFor({ role: 'SUPERADMIN', profile: null })).toBe('/admin');
    expect(homeRouteFor({ role: 'MODERATOR', profile: { displayName: 'Ana' } })).toBe('/admin');
  });

  it('sends a portal-only account to the church portal', () => {
    expect(
      homeRouteFor({
        role: 'MEMBER',
        profile: null,
        churchMemberships: [{ churchId: 'c1', role: 'EVENT_EDITOR' }],
      }),
    ).toBe('/iglesias');
  });

  it('sends a church administrator to the portal even with a member profile', () => {
    expect(
      homeRouteFor({
        role: 'MEMBER',
        profile: { displayName: 'Pastor Luis' },
        churchMemberships: [{ churchId: 'c1', role: 'ADMIN' }],
      }),
    ).toBe('/iglesias');
  });

  it('keeps a member with a profile at home, even as event editor', () => {
    expect(
      homeRouteFor({
        role: 'MEMBER',
        profile: { displayName: 'Samuel' },
        churchMemberships: [{ churchId: 'c1', role: 'EVENT_EDITOR' }],
      }),
    ).toBe('/inicio');
    expect(homeRouteFor({ role: 'MEMBER', profile: null })).toBe('/inicio');
  });
});
