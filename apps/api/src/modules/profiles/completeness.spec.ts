import { computeCompleteness, CompletenessInput } from './completeness';

const empty: CompletenessInput = {
  photosApproved: 0,
  practiceCount: 0,
  answersCount: 0,
};

const full: CompletenessInput = {
  displayName: 'Emilio',
  city: 'Santo Domingo',
  occupation: 'QA Analyst',
  education: 'Universitaria',
  photosApproved: 3,
  denominationId: 'd1',
  churchId: 'c1',
  yearsInFaith: 12,
  attendance: 'WEEKLY',
  intention: 'MARRIAGE',
  openness: 'AFFINE',
  testimony: 'Sirvo en mi iglesia desde adolescente y creo que la fidelidad de Dios se ve en lo pequeño.',
  verse: 'Salmos 37:4',
  practiceCount: 3,
  answersCount: 2,
};

describe('computeCompleteness (RF-PER-10)', () => {
  it('empty profile scores 0 and suggests the first field', () => {
    const result = computeCompleteness(empty);
    expect(result.completeness).toBe(0);
    expect(result.nextSuggestion?.key).toBe('displayName');
  });

  it('full profile scores 100 with no suggestion', () => {
    const result = computeCompleteness(full);
    expect(result.completeness).toBe(100);
    expect(result.nextSuggestion).toBeNull();
  });

  it('suggestion targets current score plus the missing rule points', () => {
    const withoutVerse = { ...full, verse: null };
    const result = computeCompleteness(withoutVerse);
    expect(result.completeness).toBe(95);
    expect(result.nextSuggestion).toEqual({ key: 'verse', targetPct: 100 });
  });

  it('short testimony does not count', () => {
    const shortTestimony = { ...full, testimony: 'Amo a Dios' };
    expect(computeCompleteness(shortTestimony).completeness).toBe(90);
  });

  it('a profile can cross the 60% Discover threshold without photos approved yet', () => {
    const noPhotos = { ...full, photosApproved: 0 };
    expect(computeCompleteness(noPhotos).completeness).toBe(85);
  });
});
