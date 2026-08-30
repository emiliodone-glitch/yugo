import { decideFromThresholds, StubClassifier } from './text-moderation.service';

describe('decideFromThresholds (RF-SEG-02, 7.3)', () => {
  const thresholds = { hold: 0.7, reject: 0.92 };

  it('approves low risk', () => {
    expect(decideFromThresholds(0.1, thresholds)).toBe('APPROVE');
    expect(decideFromThresholds(0.69, thresholds)).toBe('APPROVE');
  });

  it('holds medium risk for human review', () => {
    expect(decideFromThresholds(0.7, thresholds)).toBe('HOLD');
    expect(decideFromThresholds(0.91, thresholds)).toBe('HOLD');
  });

  it('rejects high risk automatically', () => {
    expect(decideFromThresholds(0.92, thresholds)).toBe('REJECT');
    expect(decideFromThresholds(1, thresholds)).toBe('REJECT');
  });

  it('thresholds are administrable — tighter settings shift decisions', () => {
    expect(decideFromThresholds(0.5, { hold: 0.4, reject: 0.6 })).toBe('HOLD');
    expect(decideFromThresholds(0.65, { hold: 0.4, reject: 0.6 })).toBe('REJECT');
  });
});

describe('StubClassifier (RF-SEG-05 scam patterns)', () => {
  const classifier = new StubClassifier();

  it('flags money requests as scam risk', async () => {
    const result = await classifier.classify('Necesito que me deposites dinero para el pasaje');
    expect(result.risk).toBeGreaterThanOrEqual(0.92);
    expect(result.categories).toContain('scam_or_money');
  });

  it('flags early attempts to move to another app', async () => {
    const result = await classifier.classify('Mejor hablemos por WhatsApp');
    expect(result.risk).toBeGreaterThanOrEqual(0.7);
  });

  it('passes normal faith conversation', async () => {
    const result = await classifier.classify('¿Qué es lo que más te ha hablado de Rut esta vez?');
    expect(result.risk).toBeLessThan(0.1);
    expect(result.categories).toHaveLength(0);
  });
});
