/**
 * Profile completeness (RF-PER-10). Profiles under 60% do not appear in
 * Discover. Weights favor the faith dimension — it is the product's core.
 */
export interface CompletenessInput {
  displayName?: string | null;
  city?: string | null;
  occupation?: string | null;
  education?: string | null;
  photosApproved: number;
  denominationId?: string | null;
  churchId?: string | null;
  churchFreeText?: string | null;
  yearsInFaith?: number | null;
  attendance?: string | null;
  intention?: string | null;
  openness?: string | null;
  testimony?: string | null;
  verse?: string | null;
  practiceCount: number;
  answersCount: number;
  /** Testimonio en la propia voz aprobado por moderación (RF-PER-12). */
  voiceApproved?: boolean;
}

interface Rule {
  points: number;
  done: (p: CompletenessInput) => boolean;
  /** i18n key of what to add next, surfaced as a suggestion. */
  suggestionKey: string;
}

/**
 * Suma 100. Las últimas tres reglas son «la voz propia» (RF-PER-09/12): sin
 * tres respuestas y el audio, el perfil se queda en 85 como máximo. Es lo que
 * separa una ficha de una persona, así que pesa.
 */
const RULES: Rule[] = [
  { points: 5, done: (p) => !!p.displayName, suggestionKey: 'displayName' },
  { points: 5, done: (p) => !!p.city, suggestionKey: 'city' },
  { points: 5, done: (p) => !!p.occupation, suggestionKey: 'occupation' },
  { points: 15, done: (p) => p.photosApproved >= 2, suggestionKey: 'photos' },
  { points: 10, done: (p) => !!p.denominationId, suggestionKey: 'denomination' },
  { points: 5, done: (p) => !!p.churchId || !!p.churchFreeText, suggestionKey: 'church' },
  { points: 5, done: (p) => p.yearsInFaith != null, suggestionKey: 'yearsInFaith' },
  { points: 5, done: (p) => !!p.attendance, suggestionKey: 'attendance' },
  { points: 10, done: (p) => !!p.intention, suggestionKey: 'intention' },
  { points: 5, done: (p) => !!p.openness, suggestionKey: 'openness' },
  {
    points: 10,
    done: (p) => !!p.testimony && p.testimony.length >= 40,
    suggestionKey: 'testimony',
  },
  { points: 5, done: (p) => p.practiceCount >= 2, suggestionKey: 'practices' },
  { points: 5, done: (p) => p.answersCount >= 1, suggestionKey: 'answers' },
  { points: 5, done: (p) => p.answersCount >= 3, suggestionKey: 'answersThree' },
  { points: 5, done: (p) => !!p.voiceApproved, suggestionKey: 'voice' },
];

export function computeCompleteness(input: CompletenessInput): {
  completeness: number;
  nextSuggestion: { key: string; targetPct: number } | null;
} {
  let total = 0;
  let firstMissing: Rule | null = null;
  for (const rule of RULES) {
    if (rule.done(input)) total += rule.points;
    else if (!firstMissing) firstMissing = rule;
  }
  return {
    completeness: total,
    nextSuggestion: firstMissing
      ? { key: firstMissing.suggestionKey, targetPct: total + firstMissing.points }
      : null,
  };
}
