/**
 * Exportar un encuentro al calendario del dispositivo (RF-EVE-08) sin pasar
 * por la API: la demo no tiene servidor y el botón «Agregar al calendario»
 * tiene que funcionar igual. Mismo formato que `EventsService.icsFor`, para
 * que web y app produzcan un .ics que cualquier calendario abre.
 */
export interface CalendarEventLike {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  address?: string;
  city?: string;
  churchName?: string;
  description?: string | null;
}

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function calendarIcs(event: CalendarEventLike, webUrl = 'https://yugo.do'): string {
  const startsAt = new Date(event.startsAt);
  const endsAt = event.endsAt
    ? new Date(event.endsAt)
    : new Date(startsAt.getTime() + 2 * 3600_000);
  const description = [
    event.description ?? '',
    event.churchName ? `Organiza: ${event.churchName}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Yugo//Eventos//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@yugo.do`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(startsAt)}`,
    `DTEND:${stamp(endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText([event.address, event.city].filter(Boolean).join(', '))}`,
    `URL:${webUrl}/e/${event.id}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(event.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** URL `data:` lista para un `<a href download>`; sirve sin servidor. */
export function calendarDataUrl(event: CalendarEventLike, webUrl?: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(calendarIcs(event, webUrl))}`;
}
