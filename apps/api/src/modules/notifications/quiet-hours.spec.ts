import { DEFAULT_QUIET_HOURS, localTime, quietHoursDelayMs } from './notifications.service';

/**
 * RF-NOT-02. The window is expressed in America/Santo_Domingo (UTC-4, no DST),
 * so the tests pin instants in UTC and assert the local reading.
 */
const at = (utcHour: number, minute = 0) =>
  new Date(Date.UTC(2026, 7, 20, utcHour, minute, 0));

describe('quiet hours (RF-NOT-02)', () => {
  it('reads the local hour in Santo Domingo, not the server timezone', () => {
    // 02:00 UTC is 22:00 the previous day in Santo Domingo.
    expect(localTime(at(2))).toEqual({ hour: 22, minute: 0 });
  });

  it('lets a push through outside the window', () => {
    // 14:00 UTC → 10:00 local, well outside 22:00–07:00.
    expect(quietHoursDelayMs(DEFAULT_QUIET_HOURS, at(14))).toBe(0);
  });

  it('holds a push raised at night until the window closes', () => {
    // 02:30 UTC → 22:30 local: 8 h 30 min until 07:00.
    expect(quietHoursDelayMs(DEFAULT_QUIET_HOURS, at(2, 30))).toBe(8.5 * 3_600_000);
  });

  it('holds a push raised after midnight for the rest of the window', () => {
    // 07:00 UTC → 03:00 local: 4 h until 07:00.
    expect(quietHoursDelayMs(DEFAULT_QUIET_HOURS, at(7))).toBe(4 * 3_600_000);
  });

  it('releases a push exactly when the window ends', () => {
    // 11:00 UTC → 07:00 local, the first minute outside the window.
    expect(quietHoursDelayMs(DEFAULT_QUIET_HOURS, at(11))).toBe(0);
  });

  it('handles a window that does not wrap midnight', () => {
    const daytime = { enabled: true, startHour: 9, endHour: 17 };
    // 18:00 UTC → 14:00 local: inside, 3 h until 17:00.
    expect(quietHoursDelayMs(daytime, at(18))).toBe(3 * 3_600_000);
    // 02:00 UTC → 22:00 local: outside.
    expect(quietHoursDelayMs(daytime, at(2))).toBe(0);
  });

  it('never holds a push when quiet hours are off', () => {
    expect(quietHoursDelayMs({ ...DEFAULT_QUIET_HOURS, enabled: false }, at(2))).toBe(0);
  });

  it('treats an empty window (start === end) as no quiet hours', () => {
    expect(quietHoursDelayMs({ enabled: true, startHour: 7, endHour: 7 }, at(2))).toBe(0);
  });
});
