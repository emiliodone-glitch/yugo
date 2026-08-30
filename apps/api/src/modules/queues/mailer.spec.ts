import { renderTemplate } from './mailer.service';

describe('renderTemplate (RF-NOT-03)', () => {
  it('greets by name and keeps the brand voice in Spanish', () => {
    const { subject, text, html } = renderTemplate('WELCOME', { displayName: 'Emilio' });
    expect(subject).toBe('Bienvenido a Yugo');
    expect(text).toContain('Bendiciones, Emilio');
    expect(html).toContain('Unidos en la misma fe');
  });

  it('puts the OTP code in the subject so it is visible in the notification', () => {
    const { subject, text } = renderTemplate('OTP', { code: '123456' });
    expect(subject).toBe('Tu código de Yugo: 123456');
    expect(text).toContain('123456');
  });

  it('renders both outcomes of a verification review', () => {
    expect(renderTemplate('VERIFICATION_RESULT', { approved: true }).subject).toBe(
      'Tu identidad fue verificada',
    );
    expect(renderTemplate('VERIFICATION_RESULT', { approved: false }).subject).toBe(
      'Necesitamos una nueva selfie',
    );
  });

  it('states the cancellation policy in the receipt (RF-PLU-05)', () => {
    const { text, html } = renderTemplate('PAYMENT_RECEIPT', {
      tier: 'ORO',
      plan: 'Anual',
      amount: '6,990',
      currency: 'DOP',
      renewsAt: '30 ago 2027',
    });
    expect(text).toContain('ORO');
    expect(html).toContain('hasta el fin del período pagado');
  });

  it('cites Ley 172-13 in the data export email', () => {
    expect(renderTemplate('DATA_EXPORT_READY', {}).html).toContain('Ley 172-13');
  });

  it('falls back to a neutral greeting without a name', () => {
    expect(renderTemplate('WELCOME', {}).text).toContain('hermano');
  });
});
