/**
 * Cuándo es, dicho como lo diría una persona.
 *
 * "el viernes" is a reason to say hello today; "el 4 de septiembre" is a date
 * you have to work out. The distinction matters because this label is what
 * turns a suggestion into an introduction that can actually happen.
 *
 * Everything is in America/Santo_Domingo, which is where the product lives.
 */
const TZ = 'America/Santo_Domingo';

/** Local calendar day as YYYY-MM-DD, so "tomorrow" means the day, not 24 h. */
function localDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function relativeDayLabel(when: Date, now = new Date()): string {
  const today = localDay(now);
  const target = localDay(when);
  if (target === today) return 'hoy';

  const tomorrow = localDay(new Date(now.getTime() + 86_400_000));
  if (target === tomorrow) return 'mañana';

  const daysAway = Math.round(
    (Date.parse(`${target}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000,
  );

  // Inside the coming week a weekday is unambiguous and reads naturally.
  if (daysAway > 0 && daysAway < 7) {
    const weekday = new Intl.DateTimeFormat('es-DO', { timeZone: TZ, weekday: 'long' }).format(when);
    return `el ${weekday}`;
  }

  // Beyond that a weekday would be ambiguous ("el viernes" — which one?), so
  // it becomes a date.
  const label = new Intl.DateTimeFormat('es-DO', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
  }).format(when);
  return `el ${label}`;
}
