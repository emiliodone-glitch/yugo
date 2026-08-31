import { describe, expect, it } from 'vitest';
import {
  canMarkAnswered,
  intercessionLabel,
  prayerAuthorLabel,
  rankPrayerRequests,
  type PrayerRequestItem,
} from './wall';

const now = new Date('2026-08-31T16:00:00Z');

function request(over: Partial<PrayerRequestItem> & { id: string }): PrayerRequestItem {
  return {
    body: 'Por mi mamá.',
    anonymous: false,
    authorName: 'Ana',
    authorId: 'u-ana',
    churchName: 'Iglesia Central',
    sameChurch: false,
    intercessions: 4,
    iPrayed: false,
    answeredAt: null,
    answeredNote: null,
    createdAt: '2026-08-30T16:00:00Z',
    ...over,
  };
}

describe('rankPrayerRequests', () => {
  it('sube la petición que nadie ha acompañado por encima de una más reciente', () => {
    // Esta es la razón de existir del orden: sin ella, la petición de las
    // 3 a.m. del que no la compartió con nadie se queda en cero.
    const items = [
      request({ id: 'acompanada', intercessions: 12, createdAt: '2026-08-31T15:00:00Z' }),
      request({ id: 'sola', intercessions: 0, createdAt: '2026-08-30T07:00:00Z' }),
    ];

    expect(rankPrayerRequests(items, now).map((i) => i.id)).toEqual(['sola', 'acompanada']);
  });

  it('pone primero lo que fue contestado hace poco', () => {
    const items = [
      request({ id: 'sola', intercessions: 0 }),
      request({ id: 'contestada', answeredAt: '2026-08-31T12:00:00Z', intercessions: 30 }),
    ];

    expect(rankPrayerRequests(items, now)[0]?.id).toBe('contestada');
  });

  it('una respuesta vieja ya no encabeza el muro', () => {
    const items = [
      request({ id: 'sola', intercessions: 0 }),
      request({ id: 'vieja', answeredAt: '2026-06-01T12:00:00Z', intercessions: 30 }),
    ];

    expect(rankPrayerRequests(items, now)[0]?.id).toBe('sola');
  });

  it('a igualdad de todo, la congregación de uno va antes', () => {
    const items = [
      request({ id: 'lejos', sameChurch: false }),
      request({ id: 'mi-iglesia', sameChurch: true }),
    ];

    expect(rankPrayerRequests(items, now)[0]?.id).toBe('mi-iglesia');
  });

  it('a igualdad de todo lo demás, lo más reciente', () => {
    const items = [
      request({ id: 'ayer', createdAt: '2026-08-29T16:00:00Z' }),
      request({ id: 'hoy', createdAt: '2026-08-31T09:00:00Z' }),
    ];

    expect(rankPrayerRequests(items, now)[0]?.id).toBe('hoy');
  });

  it('no muta la lista que recibe', () => {
    const items = [request({ id: 'a', intercessions: 5 }), request({ id: 'b', intercessions: 0 })];
    rankPrayerRequests(items, now);

    expect(items.map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('prayerAuthorLabel', () => {
  it('una petición anónima no revela el nombre a nadie más', () => {
    const item = request({ id: 'x', anonymous: true, authorName: 'Ana', authorId: 'u-ana' });

    expect(prayerAuthorLabel(item, 'u-otro')).toBe('Alguien de la comunidad');
    expect(prayerAuthorLabel(item, null)).toBe('Alguien de la comunidad');
  });

  it('quien la escribió sí sabe que es suya, para poder volver a ella', () => {
    const item = request({ id: 'x', anonymous: true, authorId: 'u-ana' });

    expect(prayerAuthorLabel(item, 'u-ana')).toBe('Tu petición (anónima)');
  });

  it('sin nombre y sin ser anónima, no inventa uno', () => {
    const item = request({ id: 'x', authorName: null, authorId: 'u-ana' });

    expect(prayerAuthorLabel(item, 'u-otro')).toBe('Alguien de la comunidad');
  });
});

describe('intercessionLabel', () => {
  it('nunca imprime un cero', () => {
    expect(intercessionLabel(0)).toBe('Sé el primero en acompañar');
    expect(intercessionLabel(0)).not.toMatch(/0/);
  });

  it('cuadra el singular', () => {
    expect(intercessionLabel(1)).toBe('1 persona está orando');
    expect(intercessionLabel(9)).toBe('9 personas están orando');
  });
});

describe('canMarkAnswered', () => {
  it('solo quien la escribió, y solo una vez', () => {
    const abierta = request({ id: 'x', authorId: 'u-ana' });

    expect(canMarkAnswered(abierta, 'u-ana')).toBe(true);
    expect(canMarkAnswered(abierta, 'u-otro')).toBe(false);
    expect(canMarkAnswered(abierta, null)).toBe(false);

    const cerrada = request({ id: 'x', authorId: 'u-ana', answeredAt: '2026-08-20T00:00:00Z' });
    expect(canMarkAnswered(cerrada, 'u-ana')).toBe(false);
  });

  it('sigue siendo de quien la escribió aunque sea anónima', () => {
    const item = request({ id: 'x', anonymous: true, authorId: 'u-ana' });

    expect(canMarkAnswered(item, 'u-ana')).toBe(true);
  });
});
