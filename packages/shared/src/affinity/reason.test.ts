import { describe, expect, it } from 'vitest';
import { affinityReason } from './reason';
import type { AffinityBreakdown } from '../types/domain';

const affinity = (total: number, note?: string): AffinityBreakdown => ({
  total,
  components: [
    { key: 'denomination', score: 80, note },
    { key: 'practices', score: 60 },
    { key: 'distance', score: 40 },
  ],
});

describe('motivo de la sugerencia (RF-DES-02/03)', () => {
  it('nombra lo que de verdad comparten', () => {
    expect(
      affinityReason({
        affinity: affinity(84),
        inCommon: ['Alabanza', 'Estudio bíblico'],
      }),
    ).toBe('Coinciden en alabanza y estudio bíblico.');
  });

  it('la misma iglesia pesa más que la misma denominación', () => {
    const reason = affinityReason({
      affinity: affinity(84),
      inCommon: ['Alabanza'],
      sameChurch: true,
      sameDenomination: true,
    });
    expect(reason).toContain('la misma iglesia');
    expect(reason).not.toContain('comparten denominación');
  });

  it('se queda en dos ideas, no enumera todo', () => {
    const reason = affinityReason({
      affinity: affinity(90),
      inCommon: ['Alabanza', 'Misiones', 'Niños', 'Intercesión'],
      sameDenomination: true,
      bothSeekMarriage: true,
    });
    expect(reason.split(' y ').length).toBeLessThanOrEqual(3);
    expect(reason).not.toContain('Intercesión');
  });

  it('usa la intención cuando no hay prácticas en común', () => {
    expect(
      affinityReason({ affinity: affinity(70), bothSeekMarriage: true, sameDenomination: true }),
    ).toBe('Comparten denominación y ambos buscan una relación con propósito de matrimonio.');
  });

  it('sin nada específico, no inventa una conexión', () => {
    // Cae a la nota del componente más fuerte, que sí es cierta.
    expect(affinityReason({ affinity: affinity(55, 'Denominaciones afines') })).toBe(
      'Denominaciones afines',
    );
  });

  it('sin nada que decir, dice el puntaje y ya', () => {
    expect(affinityReason({ affinity: affinity(48) })).toBe('Afinidad de fe 48 de 100');
  });

  it('ignora entradas vacías en lo compartido', () => {
    expect(affinityReason({ affinity: affinity(60), inCommon: ['', 'Misiones'] })).toBe(
      'Coinciden en misiones.',
    );
  });
});

describe('coincidir en un evento', () => {
  const base = {
    affinity: { total: 70, components: [{ key: 'denomination' as const, score: 70 }] },
  };

  it('gana a cualquier otra razón', () => {
    // Compartir denominación es una etiqueta; estar en la misma sala el
    // viernes es un hecho comprobable, y es lo que hace posible una
    // presentación entre gente conocida en vez de una cita a ciegas.
    const reason = affinityReason({
      ...base,
      inCommon: ['Alabanza', 'Oración'],
      sameChurch: true,
      bothSeekMarriage: true,
      sharedEvent: { title: 'Vigilia de jóvenes', whenLabel: 'el viernes' },
    });
    expect(reason).toBe('Los dos van a «Vigilia de jóvenes» el viernes.');
  });

  it('sin evento compartido, todo sigue igual', () => {
    expect(affinityReason({ ...base, sameChurch: true })).toBe(
      'Se congregan en la misma iglesia.',
    );
  });
});
