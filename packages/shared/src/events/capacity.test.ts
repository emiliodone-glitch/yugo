import { describe, expect, it } from 'vitest';
import { openSeats, reservedSeats, seatFor } from './capacity';

const request = (over: Partial<Parameters<typeof seatFor>[0]> = {}) =>
  seatFor({ capacity: 100, taken: 0, tier: 'FREE', hoursUntilStart: 200, ...over });

describe('cupo de un encuentro', () => {
  it('sin cupo declarado, cabe todo el mundo', () => {
    expect(request({ capacity: null, taken: 5000 })).toBe('unlimited');
  });

  it('nadie pasa del cupo, ni pagando', () => {
    // La regla anterior dejaba a Oro entrar por encima del límite: una silla
    // que no existe en el salón. Esto es lo que no puede volver a pasar.
    for (const tier of ['FREE', 'PLUS', 'ORO', null] as const) {
      expect(request({ taken: 100, tier })).toBe('waitlist');
      expect(request({ taken: 143, tier })).toBe('waitlist');
    }
  });

  it('Oro entra en las plazas reservadas, no por encima del cupo', () => {
    // 100 plazas, 10 reservadas: quien no paga se queda fuera en la 90.
    expect(request({ taken: 90, tier: 'FREE' })).toBe('waitlist');
    expect(request({ taken: 90, tier: 'PLUS' })).toBe('waitlist');
    expect(request({ taken: 90, tier: 'ORO' })).toBe('seat');
    expect(request({ taken: 99, tier: 'ORO' })).toBe('seat');
  });

  it('cerca del encuentro la reserva se disuelve', () => {
    // Una silla guardada y vacía es peor que una silla ocupada por cualquiera.
    expect(request({ taken: 90, tier: 'FREE', hoursUntilStart: 200 })).toBe('waitlist');
    expect(request({ taken: 90, tier: 'FREE', hoursUntilStart: 47 })).toBe('seat');
    expect(reservedSeats(100, 48)).toBe(0);
    expect(reservedSeats(100, 49)).toBe(10);
  });

  it('la reserva nunca se queda con la última plaza', () => {
    // En un encuentro de 3 personas, reservar el 10% no puede significar que
    // quien no paga no entre nunca.
    expect(reservedSeats(1, 200)).toBe(0);
    expect(reservedSeats(3, 200)).toBe(0);
    expect(reservedSeats(20, 200)).toBe(2);
    expect(request({ capacity: 1, taken: 0, tier: 'FREE' })).toBe('seat');
  });

  it('un encuentro vacío admite a cualquiera', () => {
    for (const tier of ['FREE', 'PLUS', 'ORO', null] as const) {
      expect(request({ taken: 0, tier })).toBe('seat');
    }
  });

  it('las plazas abiertas que muestra la pantalla descuentan la reserva', () => {
    expect(openSeats(100, 0, 200)).toBe(90);
    expect(openSeats(100, 0, 10)).toBe(100);
    expect(openSeats(100, 95, 200)).toBe(0);
    expect(openSeats(null, 95, 200)).toBeNull();
  });

  it('las plazas abiertas nunca son negativas', () => {
    expect(openSeats(100, 200, 200)).toBe(0);
  });
});
