/**
 * Muro de oración.
 *
 * Las peticiones ya existían, pero enterradas dentro de un grupo: solo oraba
 * por ellas quien ya estaba en ese grupo, que casi siempre es quien menos
 * necesitaba que le contaran. Aquí son de toda la comunidad.
 *
 * El detalle que decide si esto sirve o no es el orden. Un muro ordenado por
 * fecha deja la petición del tímido —el que escribió a las 3 a.m. y no la
 * compartió con nadie— en cero personas orando, que es peor que no haberla
 * escrito. Por eso el orden empuja hacia arriba lo que nadie ha visto todavía.
 */

export type PrayerScope = 'church' | 'community';

export interface PrayerRequestItem {
  id: string;
  body: string;
  anonymous: boolean;
  /** Null cuando es anónima: el nombre no llega al cliente, no se oculta ahí. */
  authorName: string | null;
  authorId: string | null;
  churchName: string | null;
  /** Si es de la misma congregación de quien mira. */
  sameChurch: boolean;
  intercessions: number;
  /** Si quien mira ya dijo «estoy orando». */
  iPrayed: boolean;
  answeredAt: string | null;
  answeredNote: string | null;
  createdAt: string;
}

/** Cuánto tiempo una petición se considera «nueva» para el orden. */
export const FRESH_HOURS = 72;

/**
 * El orden del muro.
 *
 * Cuatro criterios, en este orden y por esta razón:
 *
 * 1. **Las contestadas primero, si son recientes.** Son la única prueba de que
 *    orar aquí sirve para algo; un muro donde solo se pide se vuelve una lista
 *    de desgracias y la gente deja de abrirlo.
 * 2. **Las que nadie ha acompañado.** Cero es el número que hay que eliminar.
 * 3. **La congregación de uno.** Orar por alguien que uno puede saludar el
 *    domingo es distinto de orar por un desconocido.
 * 4. **Lo más reciente.**
 */
export function rankPrayerRequests<T extends PrayerRequestItem>(
  items: T[],
  now = new Date(),
): T[] {
  const freshFloor = now.getTime() - FRESH_HOURS * 3_600_000;

  const rank = (item: T): number[] => {
    const answeredRecently =
      item.answeredAt !== null && Date.parse(item.answeredAt) >= freshFloor ? 0 : 1;
    const unaccompanied = item.intercessions === 0 ? 0 : 1;
    const mine = item.sameChurch ? 0 : 1;
    return [answeredRecently, unaccompanied, mine, -Date.parse(item.createdAt)];
  };

  return [...items].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i += 1) {
      if (ra[i] !== rb[i]) return ra[i] - rb[i];
    }
    return 0;
  });
}

/**
 * Cómo se firma una petición.
 *
 * El anonimato es lo que hace que existan las peticiones que más falta hacen
 * —una enfermedad, una deuda, una vergüenza de familia—: nadie las escribe si
 * hay que ponerles nombre. Quien la escribió sí ve que es suya, para poder
 * volver y marcarla contestada.
 */
export function prayerAuthorLabel(item: PrayerRequestItem, viewerId: string | null): string {
  const isMine = item.authorId !== null && item.authorId === viewerId;
  if (item.anonymous) return isMine ? 'Tu petición (anónima)' : 'Alguien de la comunidad';
  if (isMine) return 'Tu petición';
  return item.authorName ?? 'Alguien de la comunidad';
}

/**
 * Cómo se dice cuánta gente está orando.
 *
 * Sin número cuando es cero: «0 personas orando» es una humillación impresa,
 * y quien la lee es exactamente la persona que peor la está pasando.
 */
export function intercessionLabel(count: number): string {
  if (count === 0) return 'Sé el primero en acompañar';
  if (count === 1) return '1 persona está orando';
  return `${count} personas están orando`;
}

/** Solo quien la escribió puede decir que fue contestada. */
export function canMarkAnswered(item: PrayerRequestItem, viewerId: string | null): boolean {
  return item.authorId !== null && item.authorId === viewerId && item.answeredAt === null;
}

export const PRAYER_BODY_MIN = 10;
export const PRAYER_BODY_MAX = 600;
/** Peticiones por día. Suficiente para lo que pasa de verdad en una semana. */
export const PRAYER_DAILY_LIMIT = 3;
