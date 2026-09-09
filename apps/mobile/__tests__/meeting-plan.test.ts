/**
 * El día y la hora del primer encuentro (RF-SEG-06): se eligen, no se
 * escriben, y lo incompleto se dice en vez de callarse.
 */
import { combineDayHour, dayKey, upcomingDays, validateMeetingPlan } from '../lib/meeting-plan';

describe('upcomingDays', () => {
  it('devuelve catorce días consecutivos empezando hoy', () => {
    const from = new Date(2026, 8, 9, 15, 0);
    const days = upcomingDays(14, from);
    expect(days).toHaveLength(14);
    expect(days[0]).toBe('2026-09-09');
    expect(days[13]).toBe('2026-09-22');
    expect(new Set(days).size).toBe(14);
  });

  it('cruza el cambio de mes sin saltarse días', () => {
    const days = upcomingDays(3, new Date(2026, 8, 29));
    expect(days).toEqual(['2026-09-29', '2026-09-30', '2026-10-01']);
  });
});

describe('combineDayHour', () => {
  it('arma la fecha local con la hora en punto', () => {
    const when = combineDayHour('2026-09-12', 19);
    expect(when).not.toBeNull();
    expect(dayKey(when as Date)).toBe('2026-09-12');
    expect((when as Date).getHours()).toBe(19);
    expect((when as Date).getMinutes()).toBe(0);
  });

  it('rechaza días mal formados y horas fuera de rango', () => {
    expect(combineDayHour('12/09/2026', 19)).toBeNull();
    expect(combineDayHour('2026-09-12', 24)).toBeNull();
    expect(combineDayHour('2026-09-12', -1)).toBeNull();
  });
});

describe('validateMeetingPlan', () => {
  const now = new Date(2026, 8, 9, 10, 0);

  it('pide el lugar antes que nada', () => {
    expect(validateMeetingPlan({ place: '', day: '2026-09-12', hour: 19 }, now)).toEqual({
      issue: 'place',
    });
  });

  it('dice que falta la fecha cuando no se eligió día u hora', () => {
    expect(validateMeetingPlan({ place: 'Café Mamá Chila', day: null, hour: 19 }, now)).toEqual({
      issue: 'when',
    });
    expect(
      validateMeetingPlan({ place: 'Café Mamá Chila', day: '2026-09-12', hour: null }, now),
    ).toEqual({ issue: 'when' });
  });

  it('no acepta un encuentro en el pasado', () => {
    expect(
      validateMeetingPlan({ place: 'Café Mamá Chila', day: '2026-09-08', hour: 19 }, now),
    ).toEqual({ issue: 'past' });
  });

  it('devuelve la fecha ISO cuando todo está', () => {
    const result = validateMeetingPlan(
      { place: 'Café Mamá Chila', day: '2026-09-12', hour: 19 },
      now,
    );
    expect('meetsAt' in result).toBe(true);
    if ('meetsAt' in result) {
      expect(new Date(result.meetsAt).getTime()).toBe(new Date(2026, 8, 12, 19, 0).getTime());
    }
  });
});
