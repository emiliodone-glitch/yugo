import { describe, expect, it } from 'vitest';
import {
  COUPLE_MILESTONES,
  denominationSlug,
  journeyUnlocked,
  milestonesFor,
  PREMARITAL_RESOURCES,
  resourcesFor,
} from './journey';

/**
 * Ruta de pareja (RF-REL-05). Lo que protege: la ruta existe desde el
 * noviazgo y no antes; los pasos se abren por etapa; los recursos generales
 * llegan a todos y los específicos solo a quien es de esa tradición, en un
 * orden que no depende de la denominación.
 */
describe('ruta de pareja', () => {
  it('se abre con el noviazgo, no antes', () => {
    expect(journeyUnlocked('KNOWING')).toBe(false);
    expect(journeyUnlocked('INTENTIONAL_FRIENDSHIP')).toBe(false);
    expect(journeyUnlocked('COURTSHIP')).toBe(true);
    expect(journeyUnlocked('MARRIED')).toBe(true);
  });

  it('los pasos se abren por etapa y nunca se pierden al avanzar', () => {
    const courtship = milestonesFor('COURTSHIP');
    const engaged = milestonesFor('ENGAGED');
    expect(courtship.length).toBeGreaterThan(0);
    expect(courtship.every((m) => m.stage === 'COURTSHIP')).toBe(true);
    expect(engaged.length).toBeGreaterThan(courtship.length);
    for (const m of courtship) expect(engaged.map((e) => e.key)).toContain(m.key);
    expect(milestonesFor('MARRIED')).toHaveLength(COUPLE_MILESTONES.length);
  });

  it('cada paso tiene un porqué y ninguno habla de porcentaje ni de atraso', () => {
    for (const m of COUPLE_MILESTONES) {
      expect(m.why.length).toBeGreaterThan(10);
      expect(`${m.title} ${m.why}`).not.toMatch(/%|atras|racha|te falta/i);
    }
  });

  it('reconoce la denominación por nombre o por slug', () => {
    expect(denominationSlug('Católica')).toBe('catolica');
    expect(denominationSlug('bautista')).toBe('bautista');
    expect(denominationSlug('Iglesia de Dios')).toBe('iglesia-de-dios');
    expect(denominationSlug('Algo raro')).toBeNull();
    expect(denominationSlug(null)).toBeNull();
  });

  it('los generales van para todos; los específicos solo a su tradición', () => {
    const none = resourcesFor([null, undefined]);
    expect(none.forYou).toHaveLength(0);
    expect(none.general.length).toBeGreaterThan(0);
    expect(none.general.every((r) => r.denominations === 'all')).toBe(true);

    const catholic = resourcesFor(['Católica']);
    expect(catholic.forYou.map((r) => r.id)).toContain('pre-cana');
    expect(catholic.forYou.map((r) => r.id)).not.toContain('saving-marriage');
  });

  it('una pareja de dos tradiciones ve las dos, y el orden no depende de cuál va primero', () => {
    const a = resourcesFor(['Católica', 'Bautista']);
    const b = resourcesFor(['Bautista', 'Católica']);
    expect(a.forYou.map((r) => r.id)).toEqual(b.forYou.map((r) => r.id));
    expect(a.forYou.map((r) => r.id)).toEqual(
      expect.arrayContaining(['pre-cana', 'saving-marriage']),
    );
  });

  it('el catálogo no enlaza a tiendas y nombra a quién lo hace', () => {
    for (const r of PREMARITAL_RESOURCES) {
      expect(r.by.length).toBeGreaterThan(2);
      expect(r.url ?? '').not.toMatch(/amazon|mercadolibre|shop/i);
    }
  });
});
