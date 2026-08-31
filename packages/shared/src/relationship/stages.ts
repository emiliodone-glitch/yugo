/**
 * Etapas del vínculo.
 *
 * Una conexión que solo puede estar activa o terminada no expresa lo que el
 * producto promete: una relación con propósito de matrimonio. Las etapas dan
 * ese lenguaje, y son de los dos — una persona propone, la otra acepta, y
 * ninguna avanza sola.
 *
 * La consecuencia que más importa: al declarar noviazgo, ambos salen de
 * Descubrir. Ninguna app de citas lo hace porque va contra su métrica; aquí es
 * la señal de confianza que sostiene el respaldo de una iglesia.
 */
export const RELATIONSHIP_STAGES = [
  'KNOWING',
  'INTENTIONAL_FRIENDSHIP',
  'COURTSHIP',
  'ENGAGED',
] as const;

export type RelationshipStage = (typeof RELATIONSHIP_STAGES)[number];

export const STAGE_ORDER: Record<RelationshipStage, number> = {
  KNOWING: 0,
  INTENTIONAL_FRIENDSHIP: 1,
  COURTSHIP: 2,
  ENGAGED: 3,
};

/** From this stage on, both people stop appearing in anyone's Descubrir. */
export const EXCLUSIVE_FROM: RelationshipStage = 'COURTSHIP';

export function isExclusive(stage: RelationshipStage): boolean {
  return STAGE_ORDER[stage] >= STAGE_ORDER[EXCLUSIVE_FROM];
}

export type StageProposalError =
  | 'same_stage'
  | 'cannot_skip_stages'
  | 'cannot_go_back'
  | 'unknown_stage';

/**
 * Whether a proposal is valid.
 *
 * Only one step forward at a time: a bond that jumps from "conociéndonos" to
 * "comprometidos" has not happened inside the app, and letting it would make
 * the history meaningless. Going back is not a proposal either — that is
 * ending or redefining the bond, which has its own path.
 */
export function validateStageProposal(
  current: RelationshipStage,
  proposed: RelationshipStage,
): { ok: true } | { ok: false; error: StageProposalError } {
  if (!RELATIONSHIP_STAGES.includes(proposed)) return { ok: false, error: 'unknown_stage' };
  if (proposed === current) return { ok: false, error: 'same_stage' };

  const distance = STAGE_ORDER[proposed] - STAGE_ORDER[current];
  if (distance < 0) return { ok: false, error: 'cannot_go_back' };
  if (distance > 1) return { ok: false, error: 'cannot_skip_stages' };
  return { ok: true };
}

/** The only stage that can be proposed from here, or null at the end. */
export function nextStage(current: RelationshipStage): RelationshipStage | null {
  const index = STAGE_ORDER[current];
  return index >= RELATIONSHIP_STAGES.length - 1 ? null : RELATIONSHIP_STAGES[index + 1];
}

/**
 * A bond counts as advanced once both people agreed to move past the first
 * stage. It is the honest denominator for "did Yugo work", far better than
 * counting connections — two people who matched and never spoke are not a
 * result.
 */
export function hasAdvanced(stage: RelationshipStage): boolean {
  return STAGE_ORDER[stage] > STAGE_ORDER.KNOWING;
}
