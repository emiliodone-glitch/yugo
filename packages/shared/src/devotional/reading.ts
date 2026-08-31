/**
 * Devocional diario.
 *
 * El problema que resuelve no es de contenido, es de razón para volver: cuando
 * alguien termina su lista de sugerencias del día, Yugo se queda sin nada que
 * ofrecerle hasta mañana. Un devocional le da un motivo para abrir la app que
 * no depende de que haya alguien nuevo — y, sobre todo, un motivo que le sirve
 * aunque nunca conozca a nadie aquí.
 *
 * Dos decisiones de diseño que sostienen todo lo demás:
 *
 * 1. **El mismo texto para todos, cada día.** Un plan personalizado por
 *    usuario daría mejores métricas de lectura y destruiría lo único que hace
 *    esto valioso: que «142 personas de tu iglesia lo leyeron hoy» signifique
 *    que leyeron *lo mismo* y puedan hablar de eso el domingo.
 *
 * 2. **Constancia, nunca racha.** Una racha que se pierde convierte una
 *    disciplina espiritual en un puntaje y añade culpa a quien faltó tres días
 *    —que es justo la persona que más falta hace que vuelva—. Se cuentan días
 *    leídos en una ventana, un número que sube y baja sin castigar y sin que
 *    exista nunca el momento «perdiste tu racha».
 */
import { localDay } from '../events/when';

/** Ventana de la constancia. 30 días es un mes de vida, no un trimestre. */
export const CONSTANCY_WINDOW_DAYS = 30;

/** Largo máximo de una reflexión. Corta a propósito: es una frase, no un post. */
export const REFLECTION_MAX_LENGTH = 280;

export interface ReadingConstancy {
  /** Días distintos con lectura dentro de la ventana. */
  daysRead: number;
  windowDays: number;
  /** Si ya lo leyó hoy, para no volver a invitarlo a lo mismo. */
  readToday: boolean;
}

/**
 * Cuántos de los últimos 30 días leyó.
 *
 * Recibe días locales (`YYYY-MM-DD`) y no fechas, porque leer a las 11:40 p.m.
 * del martes es leer el martes: si el corte fuera UTC, esa lectura contaría
 * como del miércoles y la persona vería un día en blanco que sí cumplió.
 */
export function readingConstancy(readDays: string[], now = new Date()): ReadingConstancy {
  const today = localDay(now);
  const floor = localDay(new Date(now.getTime() - (CONSTANCY_WINDOW_DAYS - 1) * 86_400_000));

  const inWindow = new Set(readDays.filter((day) => day >= floor && day <= today));

  return {
    daysRead: inWindow.size,
    windowDays: CONSTANCY_WINDOW_DAYS,
    readToday: inWindow.has(today),
  };
}

/**
 * Cómo se le dice a alguien cuánto ha leído, sin convertirlo en un marcador.
 *
 * Nunca dice «llevas X días seguidos» ni menciona los días que faltó: la frase
 * tiene que poder leerla igual quien leyó 28 días y quien leyó 2.
 */
export function constancyLabel(constancy: ReadingConstancy): string {
  if (constancy.daysRead === 0) return 'Hoy puede ser el primero.';
  if (constancy.daysRead === 1) return 'Leíste un día este mes.';
  return `Leíste ${constancy.daysRead} días de los últimos ${constancy.windowDays}.`;
}

/**
 * Si una reflexión se le puede mostrar a la congregación.
 *
 * Es texto escrito por una persona sobre su fe y lo va a leer su iglesia: pasa
 * por moderación previa como todo lo demás. `null` es «no escribió nada», que
 * no es lo mismo que «escribió y está pendiente».
 */
export function reflectionIsPublic(status: string | null | undefined): boolean {
  return status === 'APPROVED';
}
