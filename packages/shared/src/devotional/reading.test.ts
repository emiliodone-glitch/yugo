import { describe, expect, it } from 'vitest';
import {
  CONSTANCY_WINDOW_DAYS,
  constancyLabel,
  readingConstancy,
  reflectionIsPublic,
} from './reading';

/** Mediodía en Santo Domingo, para que la prueba no dependa de la hora. */
const noon = (day: string) => new Date(`${day}T16:00:00Z`);

describe('readingConstancy', () => {
  it('cuenta días distintos dentro de la ventana', () => {
    const result = readingConstancy(['2026-08-29', '2026-08-30', '2026-08-31'], noon('2026-08-31'));

    expect(result.daysRead).toBe(3);
    expect(result.readToday).toBe(true);
    expect(result.windowDays).toBe(CONSTANCY_WINDOW_DAYS);
  });

  it('no cuenta dos veces el mismo día', () => {
    const result = readingConstancy(['2026-08-31', '2026-08-31'], noon('2026-08-31'));

    expect(result.daysRead).toBe(1);
  });

  it('la ventana incluye hoy y los 29 anteriores', () => {
    // Con hoy = 31 de agosto, el primer día que cuenta es el 2 de agosto.
    // El 1 queda fuera por uno, que es el borde que hay que fijar para que
    // nadie lo mueva sin querer.
    expect(readingConstancy(['2026-08-02'], noon('2026-08-31')).daysRead).toBe(1);
    expect(readingConstancy(['2026-08-01'], noon('2026-08-31')).daysRead).toBe(0);
    expect(readingConstancy(['2026-07-01'], noon('2026-08-31')).daysRead).toBe(0);
  });

  it('ignora un día futuro', () => {
    expect(readingConstancy(['2026-09-05'], noon('2026-08-31')).daysRead).toBe(0);
  });

  it('cuenta como del martes lo que se leyó el martes a las once y media de la noche', () => {
    // 2026-09-01T03:20:00Z son las 11:20 p.m. del 31 de agosto en la RD. Con
    // un corte en UTC este día se perdería y la persona vería en blanco un día
    // que sí cumplió.
    const lateTuesday = new Date('2026-09-01T03:20:00Z');
    const result = readingConstancy(['2026-08-31'], lateTuesday);

    expect(result.readToday).toBe(true);
  });

  it('no sabe de rachas: faltar en el medio no borra lo anterior', () => {
    const result = readingConstancy(
      ['2026-08-10', '2026-08-11', '2026-08-30', '2026-08-31'],
      noon('2026-08-31'),
    );

    expect(result.daysRead).toBe(4);
  });
});

describe('constancyLabel', () => {
  it('invita en vez de reprochar cuando no hay nada', () => {
    const label = constancyLabel({ daysRead: 0, windowDays: 30, readToday: false });

    expect(label).toBe('Hoy puede ser el primero.');
  });

  it('nunca menciona los días que faltó', () => {
    for (const daysRead of [1, 2, 15, 30]) {
      const label = constancyLabel({ daysRead, windowDays: 30, readToday: true });
      expect(label).not.toMatch(/racha|seguid|perdi|falt/i);
    }
  });

  it('cuadra el singular', () => {
    expect(constancyLabel({ daysRead: 1, windowDays: 30, readToday: true })).toBe(
      'Leíste un día este mes.',
    );
  });
});

describe('reflectionIsPublic', () => {
  it('solo lo aprobado se le muestra a la congregación', () => {
    expect(reflectionIsPublic('APPROVED')).toBe(true);
    expect(reflectionIsPublic('PENDING')).toBe(false);
    expect(reflectionIsPublic('REJECTED')).toBe(false);
    expect(reflectionIsPublic(null)).toBe(false);
    expect(reflectionIsPublic(undefined)).toBe(false);
  });
});
