import { describe, expect, it } from 'vitest';
import { assessPurpose, earnsPurposeBadge, purposeSignals, type MemberActivity } from './signals';

/** Alguien normal: llegó hace un tiempo, habla con quien le interesa, avanzó. */
const healthy: MemberActivity = {
  accountAgeDays: 90,
  interestsSent: 14,
  activeConnections: 4,
  conversationsStarted: 9,
  conversationsWithReplies: 5,
  bondsAdvanced: 1,
  flaggedContactMessages: 0,
  misleadingReports: 0,
};

const member = (over: Partial<MemberActivity> = {}): MemberActivity => ({ ...healthy, ...over });

describe('validación de propósito', () => {
  describe('lo que NO puede señalar', () => {
    it('una cuenta nueva no dispara nada', () => {
      // Acusar de insinceridad a alguien que lleva tres días es la forma más
      // rápida de perder a una persona sincera — y de que lo cuente en su
      // iglesia.
      const nuevo = member({
        accountAgeDays: 3,
        interestsSent: 20,
        activeConnections: 6,
        conversationsStarted: 0,
        conversationsWithReplies: 0,
        bondsAdvanced: 0,
      });
      expect(purposeSignals(nuevo)).toEqual([]);
      expect(assessPurpose(nuevo).band).toBe('solid');
    });

    it('poco volumen tampoco: tres intereses no son una tendencia', () => {
      const tímido = member({
        interestsSent: 3,
        conversationsStarted: 0,
        activeConnections: 1,
        conversationsWithReplies: 0,
      });
      expect(purposeSignals(tímido)).toEqual([]);
    });

    it('alguien selectivo no es alguien sospechoso', () => {
      // Marcar pocos intereses y hablar con todos es lo contrario del patrón
      // que buscamos.
      const selectivo = member({ interestsSent: 13, conversationsStarted: 12 });
      expect(purposeSignals(selectivo)).toEqual([]);
      expect(assessPurpose(selectivo).band).toBe('solid');
    });

    it('a quien le va mal no es a quien le miente a nadie', () => {
      // Conexiones que no prosperan pasa; lo que señalamos es no intentarlo.
      const desafortunado = member({
        activeConnections: 6,
        conversationsStarted: 12,
        conversationsWithReplies: 5,
        bondsAdvanced: 0,
        accountAgeDays: 100,
      });
      expect(assessPurpose(desafortunado).band).toBe('solid');
    });

    it('sin historial suficiente, el resultado se marca como no usable', () => {
      const recién = member({ accountAgeDays: 2, interestsSent: 1, activeConnections: 0 });
      expect(assessPurpose(recién).hasEnoughHistory).toBe(false);
    });
  });

  describe('lo que sí señala', () => {
    it('marcar en masa y no escribirle a casi nadie', () => {
      const coleccionista = member({ interestsSent: 40, conversationsStarted: 2 });
      const signals = purposeSignals(coleccionista);
      expect(signals.map((s) => s.key)).toContain('interests_without_conversation');
      expect(signals[0].explain).toContain('40');
    });

    it('tener conexiones y que ninguna llegue a ser conversación', () => {
      const acumulador = member({
        activeConnections: 12,
        conversationsStarted: 11,
        conversationsWithReplies: 1,
      });
      expect(purposeSignals(acumulador).map((s) => s.key)).toContain('connections_without_depth');
    });

    it('meses y conexiones de sobra sin que ninguna avanzara', () => {
      const estancado = member({
        accountAgeDays: 200,
        activeConnections: 8,
        conversationsWithReplies: 6,
        conversationsStarted: 12,
        bondsAdvanced: 0,
      });
      expect(purposeSignals(estancado).map((s) => s.key)).toContain('no_bond_ever_advanced');
    });

    it('insistir en pedir dinero o sacar la conversación de la app', () => {
      // El patrón que comparten la estafa y quien no quiere dejar rastro.
      const fuga = member({ flaggedContactMessages: 4 });
      expect(purposeSignals(fuga).map((s) => s.key)).toContain('repeated_flagged_contact');
    });

    it('un intento aislado no, tres sí', () => {
      expect(purposeSignals(member({ flaggedContactMessages: 1 }))).toEqual([]);
      expect(purposeSignals(member({ flaggedContactMessages: 3 }))).toHaveLength(1);
    });
  });

  describe('las consecuencias son graduadas', () => {
    it('una sola señal deja en observación, no en revisión', () => {
      // Una racha rara no puede mandar a alguien a una cola de moderación.
      const uno = member({ interestsSent: 40, conversationsStarted: 2 });
      expect(assessPurpose(uno).band).toBe('watch');
    });

    it('varias señales juntas sí llegan a revisión humana', () => {
      const patrón = member({
        interestsSent: 60,
        conversationsStarted: 3,
        activeConnections: 15,
        conversationsWithReplies: 1,
        flaggedContactMessages: 5,
      });
      expect(assessPurpose(patrón).band).toBe('review');
    });

    it('que dos personas te reporten por eso basta para que lo mire alguien', () => {
      // Son testigos, no métricas: pesan más que cualquier conteo.
      const reportado = member({ misleadingReports: 2 });
      const assessment = assessPurpose(reportado);
      expect(assessment.band).toBe('review');
      expect(assessment.signals).toHaveLength(1);
    });

    it('el puntaje baja con el patrón, y nunca es negativo', () => {
      expect(assessPurpose(healthy).score).toBe(100);
      expect(assessPurpose(member({ interestsSent: 40, conversationsStarted: 1 })).score).toBe(70);
      const peor = member({
        interestsSent: 80,
        conversationsStarted: 1,
        activeConnections: 20,
        conversationsWithReplies: 0,
        flaggedContactMessages: 9,
        misleadingReports: 6,
        accountAgeDays: 300,
        bondsAdvanced: 0,
      });
      expect(assessPurpose(peor).score).toBe(0);
    });

    it('cada señal se explica en español, para quien tiene que decidir', () => {
      // Un puntaje sin explicación es una acusación sin pruebas.
      const patrón = member({ interestsSent: 40, conversationsStarted: 2, flaggedContactMessages: 4 });
      for (const signal of purposeSignals(patrón)) {
        expect(signal.explain.length).toBeGreaterThan(20);
        expect(signal.explain).toMatch(/[áéíóúñ¿]|[a-z]{4,}/i);
      }
    });
  });

  describe('la insignia «Perfil con propósito»', () => {
    it('se gana con evidencia positiva, no con ausencia de sospecha', () => {
      expect(earnsPurposeBadge(healthy)).toBe(true);
      // Sin señales, pero sin haber sostenido nunca una conversación real.
      expect(
        earnsPurposeBadge(
          member({ conversationsWithReplies: 0, bondsAdvanced: 0, interestsSent: 5 }),
        ),
      ).toBe(false);
    });

    it('no se otorga a quien está en observación', () => {
      expect(earnsPurposeBadge(member({ interestsSent: 40, conversationsStarted: 2 }))).toBe(false);
    });

    it('una cuenta nueva no la tiene todavía, por buena que se vea', () => {
      expect(earnsPurposeBadge(member({ accountAgeDays: 5 }))).toBe(false);
    });

    it('haber avanzado con alguien basta, aunque hables poco', () => {
      expect(
        earnsPurposeBadge(member({ conversationsWithReplies: 0, bondsAdvanced: 1 })),
      ).toBe(true);
    });
  });
});
