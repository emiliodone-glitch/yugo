import { describe, expect, it } from 'vitest';
import { calendarDataUrl, calendarIcs } from './calendar';

const event = {
  id: 'ev-vigilia',
  title: 'Noche de adoración; jóvenes, adultos',
  startsAt: '2026-10-10T19:00:00-04:00',
  address: 'Av. San Vicente de Paúl 45',
  city: 'Santo Domingo Este',
  churchName: 'Iglesia Monte de Sion',
};

describe('calendarIcs', () => {
  it('produce un VEVENT con fechas en UTC y texto escapado', () => {
    const ics = calendarIcs(event);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20261010T230000Z');
    // Sin endsAt, dos horas por defecto (igual que la API).
    expect(ics).toContain('DTEND:20261011T010000Z');
    expect(ics).toContain('SUMMARY:Noche de adoración\\; jóvenes\\, adultos');
    expect(ics).toContain('LOCATION:Av. San Vicente de Paúl 45\\, Santo Domingo Este');
    expect(ics).toContain('Organiza: Iglesia Monte de Sion');
    expect(ics).toContain('URL:https://yugo.do/e/ev-vigilia');
  });
});

describe('calendarDataUrl', () => {
  it('es una URL data: de texto/calendar que se decodifica al mismo .ics', () => {
    const url = calendarDataUrl(event);
    expect(url.startsWith('data:text/calendar;charset=utf-8,')).toBe(true);
    const decoded = decodeURIComponent(url.slice(url.indexOf(',') + 1));
    expect(decoded).toContain('BEGIN:VEVENT');
    expect(decoded).toContain('UID:ev-vigilia@yugo.do');
  });
});
