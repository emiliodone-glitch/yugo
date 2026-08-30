import { PrivacyService } from './privacy.service';

describe('PrivacyService.distanceLabel (RF-SEG-07)', () => {
  it('shows the exact distance when the member allows it', () => {
    expect(PrivacyService.distanceLabel(6.4, false)).toBe('6 km');
  });

  it('buckets the distance into ranges when hiding the exact value', () => {
    expect(PrivacyService.distanceLabel(1.2, true)).toBe('Menos de 2 km');
    expect(PrivacyService.distanceLabel(4, true)).toBe('2–5 km');
    expect(PrivacyService.distanceLabel(9.9, true)).toBe('5–10 km');
    expect(PrivacyService.distanceLabel(24, true)).toBe('10–25 km');
    expect(PrivacyService.distanceLabel(49, true)).toBe('25–50 km');
    expect(PrivacyService.distanceLabel(99, true)).toBe('50–100 km');
    expect(PrivacyService.distanceLabel(150, true)).toBe('Más de 100 km');
  });

  it('never leaks a precise location through the bucket boundaries', () => {
    // Two members 5.0 km and 9.9 km apart must read the same, so the exact
    // position cannot be triangulated by moving around.
    expect(PrivacyService.distanceLabel(5, true)).toBe(PrivacyService.distanceLabel(9.9, true));
  });
});
