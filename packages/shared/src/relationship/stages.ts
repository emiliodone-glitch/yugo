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
 *
 * La escalera termina en «Casados» a propósito. El producto promete relación
 * con propósito de matrimonio: si la última etapa que sabe nombrar es el
 * compromiso, entonces no puede medir si cumplió su promesa, y lo que no se
 * mide termina reemplazado por lo que sí — ingresos, sesiones, tiempo en
 * pantalla. La boda ocurre fuera de la app; declararla dentro es de los dos,
 * como todas las demás.
 */
export const RELATIONSHIP_STAGES = [
  'KNOWING',
  'INTENTIONAL_FRIENDSHIP',
  'COURTSHIP',
  'ENGAGED',
  'MARRIED',
] as const;

export type RelationshipStage = (typeof RELATIONSHIP_STAGES)[number];

export const STAGE_ORDER: Record<RelationshipStage, number> = {
  KNOWING: 0,
  INTENTIONAL_FRIENDSHIP: 1,
  COURTSHIP: 2,
  ENGAGED: 3,
  MARRIED: 4,
};

/** From this stage on, both people stop appearing in anyone's Descubrir. */
export const EXCLUSIVE_FROM: RelationshipStage = 'COURTSHIP';

export function isExclusive(stage: RelationshipStage): boolean {
  return STAGE_ORDER[stage] >= STAGE_ORDER[EXCLUSIVE_FROM];
}

/**
 * Every stage that takes a couple out of Descubrir, derived rather than
 * written out.
 *
 * The list used to be spelled `['COURTSHIP', 'ENGAGED']` in four places —
 * an SQL string, a Prisma filter and two report queries. Adding MARRIED would
 * have silently missed some of them, and a married couple reappearing in
 * Descubrir is exactly the failure this whole feature exists to prevent.
 */
export const EXCLUSIVE_STAGES: RelationshipStage[] = RELATIONSHIP_STAGES.filter((stage) =>
  isExclusive(stage),
);

/** Stages that count as a bond having moved past the first one. */
export const ADVANCED_STAGES: RelationshipStage[] = RELATIONSHIP_STAGES.filter(
  (stage) => STAGE_ORDER[stage] > STAGE_ORDER.KNOWING,
);

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

/**
 * The outcome the product exists for. Everything else Yugo counts —
 * registrations, connections, subscriptions — is a step towards this or it is
 * a distraction.
 */
export function isMarried(stage: RelationshipStage): boolean {
  return stage === 'MARRIED';
}
