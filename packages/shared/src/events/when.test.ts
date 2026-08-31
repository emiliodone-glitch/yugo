import { describe, expect, it } from 'vitest';
import { relativeDayLabel } from './when';

// Un miércoles a las 10:00 en Santo Domingo (UTC-4).
const now = new Date('2026-09-02T14:00:00Z');
const at = (iso: string) => new Date(iso);

describe('cuándo es un encuentro', () => {
  it('hoy y mañana se dicen así', () => {
    expect(relativeDayLabel(at('2026-09-02T23:00:00Z'), now)).toBe('hoy');
    expect(relativeDayLabel(at('2026-09-03T23:00:00Z'), now)).toBe('mañana');
  });

  it('dentro de la semana usa el día', () => {
    expect(relativeDayLabel(at('2026-09-04T23:00:00Z'), now)).toBe('el viernes');
    expect(relativeDayLabel(at('2026-09-07T23:00:00Z'), now)).toBe('el lunes');
  });

  it('más allá de una semana usa la fecha, porque «el viernes» sería ambiguo', () => {
    expect(relativeDayLabel(at('2026-09-11T23:00:00Z'), now)).toBe('el 11 de septiembre');
    expect(relativeDayLabel(at('2026-10-20T23:00:00Z'), now)).toBe('el 20 de octubre');
  });

  it('«mañana» es el día siguiente, no 24 horas después', () => {
    // 22:00 de hoy hora local sigue siendo hoy aunque falten menos de 24 h
    // para un evento de mañana temprano.
    const lateToday = new Date('2026-09-03T01:00:00Z'); // 21:00 del 2 en RD
    expect(relativeDayLabel(at('2026-09-03T13:00:00Z'), lateToday)).toBe('mañana');
  });
});
