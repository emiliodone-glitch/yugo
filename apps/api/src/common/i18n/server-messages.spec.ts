import { renderTemplate } from '../../modules/queues/mailer.service';
import { formatWhen, serverLocale, serverMessage } from './server-messages';

/**
 * RNF-06: lo que el servidor le dice a una persona sale en el idioma de su
 * cuenta. Cada clave existe en los dos idiomas, los nombres viajan tal cual y
 * el tono no cambia: nada de rachas ni de «te perdiste» en ninguno de los dos.
 */
describe('serverMessage (RNF-06)', () => {
  it('resuelve la misma clave en español y en inglés', () => {
    expect(serverMessage('es-DO', 'connection.new').title).toBe('Nueva conexión');
    expect(serverMessage('en-US', 'connection.new').title).toBe('New connection');
  });

  it('cualquier valor desconocido de idioma cae en español', () => {
    expect(serverLocale(null)).toBe('es-DO');
    expect(serverLocale('fr-FR')).toBe('es-DO');
    expect(serverLocale('en-US')).toBe('en-US');
  });

  it('los nombres propios y las notas viajan tal cual', () => {
    const es = serverMessage('es-DO', 'intro.received', {
      mentor: 'Pastor Luis',
      note: 'Se van a caer bien.',
    });
    const en = serverMessage('en-US', 'intro.received', {
      mentor: 'Pastor Luis',
      note: 'Se van a caer bien.',
    });
    expect(es.title).toContain('Pastor Luis');
    expect(en.title).toContain('Pastor Luis');
    expect(es.body).toBe('Se van a caer bien.');
    expect(en.body).toBe('Se van a caer bien.');
  });

  it('cuando falta el nombre no queda un hueco', () => {
    expect(serverMessage('es-DO', 'stage.proposed', { name: '' }).body).toMatch(/^Tu conexión/);
    expect(serverMessage('en-US', 'stage.proposed', { name: '' }).body).toMatch(/^Your connection/);
  });

  it('las fechas salen en el idioma y en la hora de Santo Domingo', () => {
    const when = new Date('2026-09-12T18:30:00.000Z'); // sábado 14:30 en Santo Domingo
    expect(formatWhen(when, 'es-DO')).toMatch(/sábado/);
    expect(formatWhen(when, 'en-US')).toMatch(/Saturday/);
    expect(serverMessage('en-US', 'video.proposed', { name: 'Ana', when }).body).toMatch(
      /Saturday/,
    );
  });

  it('el plan de domingo no menciona rachas en ningún idioma', () => {
    const params = {
      event: { title: 'Vigilia', churchName: 'IBC', startsAt: new Date('2026-09-12T23:00:00Z') },
      devotional: { reference: 'Rut 1:16', title: 'Donde tú vayas' },
      quiet: { displayName: 'Caleb', days: 5 },
    };
    for (const locale of ['es-DO', 'en-US'] as const) {
      const { body } = serverMessage(locale, 'weekend.plan', params);
      expect(body).toContain('Vigilia');
      expect(body).toContain('Rut 1:16');
      expect(body).toContain('Caleb');
      expect(body).not.toMatch(/racha|perdiste|streak|missed/i);
    }
  });

  it('nunca imprime un cero junto a una petición de oración', () => {
    for (const locale of ['es-DO', 'en-US'] as const) {
      expect(serverMessage(locale, 'prayer.praying', { count: 1 }).body).not.toMatch(/\b0\b/);
      expect(serverMessage(locale, 'prayer.praying', { count: 3 }).body).toContain('3');
    }
  });
});

describe('renderTemplate en inglés (RF-NOT-03, RNF-06)', () => {
  it('el correo de bienvenida cambia de idioma con la cuenta', () => {
    const es = renderTemplate('WELCOME', { displayName: 'Emilio' }, 'es-DO');
    const en = renderTemplate('WELCOME', { displayName: 'Emilio' }, 'en-US');
    expect(es.subject).toBe('Bienvenido a Yugo');
    expect(en.subject).toBe('Welcome to Yugo');
    expect(en.html).toContain('lang="en"');
    expect(en.html).toContain('United in the same faith');
    expect(en.text).toContain('Emilio');
  });

  it('el recibo en inglés conserva la política de cancelación (RF-PLU-05)', () => {
    const { text } = renderTemplate(
      'PAYMENT_RECEIPT',
      { tier: 'Plus', plan: 'monthly', amount: '9.99', currency: 'USD', renewsAt: '10/9/2026' },
      'en-US',
    );
    expect(text).toContain('Yugo Plus');
    expect(renderTemplate('PAYMENT_RECEIPT', {}, 'en-US').html).toContain('cancel anytime');
  });

  it('el aviso de notificación reutiliza el título y cuerpo resueltos', () => {
    const { title, body } = serverMessage('en-US', 'interest.received');
    const mail = renderTemplate('NOTIFICATION', { title, body }, 'en-US');
    expect(mail.subject).toBe(title);
    expect(mail.html).toContain('Open the app to respond.');
  });

  it('sin idioma explícito sigue siendo español', () => {
    expect(renderTemplate('DATA_EXPORT_READY', {}).subject).toBe('Tu descarga de datos está lista');
    expect(renderTemplate('DATA_EXPORT_READY', {}, 'en-US').html).toContain('Law 172-13');
  });
});
