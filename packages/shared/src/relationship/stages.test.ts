import { describe, expect, it } from 'vitest';
import {
  hasAdvanced,
  isExclusive,
  isMarried,
  nextStage,
  RELATIONSHIP_STAGES,
  validateStageProposal,
} from './stages';

describe('etapas del vínculo', () => {
  it('avanza de una en una', () => {
    expect(validateStageProposal('KNOWING', 'INTENTIONAL_FRIENDSHIP')).toEqual({ ok: true });
    expect(validateStageProposal('INTENTIONAL_FRIENDSHIP', 'COURTSHIP')).toEqual({ ok: true });
  });

  it('no permite saltarse etapas', () => {
    // Un vínculo que salta de conociéndonos a comprometidos no ocurrió dentro
    // de la app, y admitirlo vaciaría de sentido el historial.
    expect(validateStageProposal('KNOWING', 'ENGAGED')).toEqual({
      ok: false,
      error: 'cannot_skip_stages',
    });
    expect(validateStageProposal('KNOWING', 'COURTSHIP')).toEqual({
      ok: false,
      error: 'cannot_skip_stages',
    });
  });

  it('no permite retroceder ni proponer la misma etapa', () => {
    expect(validateStageProposal('COURTSHIP', 'KNOWING')).toEqual({
      ok: false,
      error: 'cannot_go_back',
    });
    expect(validateStageProposal('COURTSHIP', 'COURTSHIP')).toEqual({
      ok: false,
      error: 'same_stage',
    });
  });

  it('rechaza una etapa que no existe', () => {
    expect(validateStageProposal('KNOWING', 'CASADOS' as never)).toEqual({
      ok: false,
      error: 'unknown_stage',
    });
  });

  it('el noviazgo hace exclusivo el vínculo', () => {
    // Esta es la consecuencia que sostiene el respaldo de una iglesia: al
    // declarar noviazgo, ambos salen de Descubrir.
    expect(isExclusive('KNOWING')).toBe(false);
    expect(isExclusive('INTENTIONAL_FRIENDSHIP')).toBe(false);
    expect(isExclusive('COURTSHIP')).toBe(true);
    expect(isExclusive('ENGAGED')).toBe(true);
  });

  it('sabe cuál es la única etapa proponible, y cuándo ya no hay', () => {
    expect(nextStage('KNOWING')).toBe('INTENTIONAL_FRIENDSHIP');
    expect(nextStage('COURTSHIP')).toBe('ENGAGED');
    expect(nextStage('ENGAGED')).toBe('MARRIED');
    expect(nextStage('MARRIED')).toBeNull();
  });

  it('la escalera termina en el matrimonio, que es lo que el producto promete', () => {
    // Si la última etapa que la app sabe nombrar fuera el compromiso, no
    // podría medir si cumplió su promesa — y lo que no se mide termina
    // reemplazado por lo que sí.
    expect(RELATIONSHIP_STAGES.at(-1)).toBe('MARRIED');
    expect(isMarried('MARRIED')).toBe(true);
    expect(isMarried('ENGAGED')).toBe(false);
    expect(isExclusive('MARRIED')).toBe(true);
    expect(validateStageProposal('ENGAGED', 'MARRIED')).toEqual({ ok: true });
    expect(validateStageProposal('COURTSHIP', 'MARRIED')).toEqual({
      ok: false,
      error: 'cannot_skip_stages',
    });
  });

  it('un vínculo avanzó cuando pasó de la primera etapa', () => {
    // Dos personas que coincidieron y nunca hablaron no son un resultado.
    expect(hasAdvanced('KNOWING')).toBe(false);
    expect(hasAdvanced('INTENTIONAL_FRIENDSHIP')).toBe(true);
    expect(hasAdvanced('ENGAGED')).toBe(true);
  });

  it('cada etapa tiene sucesora salvo la última, y ninguna se repite', () => {
    expect(new Set(RELATIONSHIP_STAGES).size).toBe(RELATIONSHIP_STAGES.length);
    for (const stage of RELATIONSHIP_STAGES.slice(0, -1)) {
      const next = nextStage(stage);
      expect(next).not.toBeNull();
      expect(validateStageProposal(stage, next!)).toEqual({ ok: true });
    }
  });
});
