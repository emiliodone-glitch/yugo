/**
 * Fecha y hora del primer encuentro (RF-SEG-06), sin escribir a mano.
 *
 * Antes el plan pedía teclear «2026-09-06 19:00» y, si el formato fallaba,
 * el botón no hacía nada. Ahora se elige un día de los próximos catorce y
 * una hora; estas funciones arman la fecha y dicen claramente qué falta.
 */

/** Un día como `YYYY-MM-DD` en la zona horaria del teléfono. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Los próximos `count` días a partir de `from` (hoy incluido). */
export function upcomingDays(count = 14, from = new Date()): string[] {
  const days: string[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);
    days.push(dayKey(date));
  }
  return days;
}

/** Día y hora en punto convertidos a ISO (hora local del teléfono). */
export function combineDayHour(day: string, hour: number): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match || !Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type MeetingPlanIssue = 'place' | 'when' | 'past';

/**
 * Qué le falta al plan para guardarse. Devuelve `null` cuando está completo;
 * un encuentro en el pasado tampoco vale (el botón antes lo aceptaba).
 */
export function validateMeetingPlan(
  input: { place: string; day: string | null; hour: number | null },
  now = new Date(),
): { issue: MeetingPlanIssue } | { meetsAt: string } {
  if (input.place.trim().length < 3) return { issue: 'place' };
  if (!input.day || input.hour === null) return { issue: 'when' };
  const when = combineDayHour(input.day, input.hour);
  if (!when) return { issue: 'when' };
  if (when.getTime() <= now.getTime()) return { issue: 'past' };
  return { meetsAt: when.toISOString() };
}
