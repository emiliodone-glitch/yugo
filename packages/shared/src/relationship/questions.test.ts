import { describe, expect, it } from 'vitest';
import {
  canReveal,
  nextUnanswered,
  questionsFor,
  questionsUnlockedAt,
  STAGE_QUESTIONS,
  TOPIC_LABELS,
} from './questions';

describe('conversaciones que importan', () => {
  it('no se pregunta por hijos en «conociéndonos»', () => {
    // Preguntarlo en el primer mensaje espanta; preguntarlo antes del
    // compromiso llega tarde. La etapa es lo que hace útil la pregunta.
    const abiertas = questionsFor('KNOWING');
    expect(abiertas).toHaveLength(0);
  });

  it('cada etapa abre lo que le toca, y conserva lo anterior', () => {
    const amistad = questionsFor('INTENTIONAL_FRIENDSHIP');
    const noviazgo = questionsFor('COURTSHIP');
    const compromiso = questionsFor('ENGAGED');

    expect(amistad.length).toBeGreaterThan(0);
    expect(noviazgo.length).toBeGreaterThan(amistad.length);
    expect(compromiso.length).toBeGreaterThan(noviazgo.length);
    // Lo abierto no se cierra al avanzar.
    for (const question of amistad) {
      expect(compromiso.map((q) => q.id)).toContain(question.id);
    }
  });

  it('el dinero y los hijos se abren en noviazgo, no antes', () => {
    const antes = questionsFor('INTENTIONAL_FRIENDSHIP').map((q) => q.topic);
    expect(antes).not.toContain('dinero');
    expect(antes).not.toContain('hijos');

    const noviazgo = questionsFor('COURTSHIP').map((q) => q.topic);
    expect(noviazgo).toContain('dinero');
    expect(noviazgo).toContain('hijos');
  });

  it('una respuesta no se ve hasta que existen las dos', () => {
    // Si el segundo ve la del primero, contesta a esa respuesta y no a la
    // pregunta.
    expect(canReveal('mi respuesta', null)).toBe(false);
    expect(canReveal(null, 'su respuesta')).toBe(false);
    expect(canReveal(null, null)).toBe(false);
    expect(canReveal('mi respuesta', 'su respuesta')).toBe(true);
  });

  it('sugiere una pregunta a la vez, no una lista', () => {
    const primera = nextUnanswered('COURTSHIP', []);
    expect(primera).not.toBeNull();

    const siguiente = nextUnanswered('COURTSHIP', [primera!.id]);
    expect(siguiente?.id).not.toBe(primera!.id);
  });

  it('cuando ya contestaron todo, no inventa más', () => {
    const todas = questionsFor('ENGAGED').map((q) => q.id);
    expect(nextUnanswered('ENGAGED', todas)).toBeNull();
  });

  describe('el banco de preguntas', () => {
    it('no repite identificadores', () => {
      const ids = STAGE_QUESTIONS.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('cada pregunta dice por qué está en la lista', () => {
      // Nadie contesta bien a ciegas: si no se explica para qué sirve, se
      // siente un interrogatorio.
      for (const question of STAGE_QUESTIONS) {
        expect(question.why.length).toBeGreaterThan(30);
        expect(question.text).toMatch(/\?$/);
        expect(TOPIC_LABELS[question.topic]).toBeTruthy();
      }
    });

    it('es corta a propósito', () => {
      // Una lista de cien se abandona en la tercera.
      expect(STAGE_QUESTIONS.length).toBeLessThanOrEqual(20);
    });

    it('cubre los temas por los que se rompen los matrimonios', () => {
      const temas = new Set(STAGE_QUESTIONS.map((q) => q.topic));
      for (const esperado of ['dinero', 'hijos', 'familia', 'conflicto', 'fe'] as const) {
        expect(temas).toContain(esperado);
      }
    });

    it('«casados» no abre preguntas nuevas: ya no es la app quien acompaña', () => {
      expect(questionsUnlockedAt('MARRIED')).toHaveLength(0);
    });
  });
});
