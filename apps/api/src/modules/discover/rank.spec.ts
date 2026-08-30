import { rankCandidates, RankableCandidate } from './rank';

function candidate(overrides: Partial<RankableCandidate> & { userId: string }): RankableCandidate {
  return {
    affinityTotal: 70,
    level3Verified: false,
    isOro: false,
    isFeatured: false,
    lastActiveAt: new Date('2026-08-29T10:00:00Z'),
    ...overrides,
  };
}

describe('rankCandidates (RF-DES-01/10, 7.1)', () => {
  it('orders by affinity by default', () => {
    const ranked = rankCandidates(
      [candidate({ userId: 'a', affinityTotal: 60 }), candidate({ userId: 'b', affinityTotal: 85 })],
      5,
    );
    expect(ranked.map((c) => c.userId)).toEqual(['b', 'a']);
  });

  it('level-3 endorsement adds the +5 position bonus (ordering, not the shown score)', () => {
    const ranked = rankCandidates(
      [
        candidate({ userId: 'plain', affinityTotal: 78 }),
        candidate({ userId: 'endorsed', affinityTotal: 75, level3Verified: true }),
      ],
      5,
    );
    expect(ranked[0].userId).toBe('endorsed'); // 75+5=80 > 78
  });

  it('Oro members take preferential position among compatible profiles', () => {
    const ranked = rankCandidates(
      [
        candidate({ userId: 'high', affinityTotal: 80 }),
        candidate({ userId: 'oro', affinityTotal: 70, isOro: true }),
      ],
      5,
    );
    expect(ranked[0].userId).toBe('oro'); // 70+15=85 > 80
  });

  it('Oro boost does NOT apply below the compatibility floor', () => {
    const ranked = rankCandidates(
      [
        candidate({ userId: 'ok', affinityTotal: 60 }),
        candidate({ userId: 'oro-low', affinityTotal: 40, isOro: true }),
      ],
      5,
    );
    expect(ranked[0].userId).toBe('ok');
  });

  it('featured beats oro boost (RF-DES-10 first positions)', () => {
    const ranked = rankCandidates(
      [
        candidate({ userId: 'oro', affinityTotal: 70, isOro: true }),
        candidate({ userId: 'featured', affinityTotal: 65, isFeatured: true }),
      ],
      5,
    );
    expect(ranked[0].userId).toBe('featured'); // 65+25=90 > 70+15=85
  });

  it('breaks ties by recent activity (frescura)', () => {
    const ranked = rankCandidates(
      [
        candidate({ userId: 'older', lastActiveAt: new Date('2026-08-01') }),
        candidate({ userId: 'fresh', lastActiveAt: new Date('2026-08-29') }),
      ],
      5,
    );
    expect(ranked[0].userId).toBe('fresh');
  });
});
