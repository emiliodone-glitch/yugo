import { buildIcebreakers } from './icebreakers.service';

describe('buildIcebreakers (RF-CON-04)', () => {
  it('generates questions from the other profile facts', () => {
    const questions = buildIcebreakers({
      practices: ['Niños', 'Servicio social'],
      practiceSlugs: ['ninos', 'servicio-social'],
      verse: 'Rut 1:16',
      occupation: 'Contadora',
      churchName: 'Iglesia Bíblica Emanuel',
      yearsInFaith: 4,
      answers: [],
    });
    expect(questions).toHaveLength(3);
    expect(questions[0]).toBe('Vi que sirves con niños, ¿cómo llegaste ahí?');
    expect(questions.join(' ')).toContain('Rut');
  });

  it('always returns 3 questions even for sparse profiles', () => {
    const questions = buildIcebreakers({ practices: [], answers: [] });
    expect(questions).toHaveLength(3);
  });

  it('never repeats a question', () => {
    const questions = buildIcebreakers({
      practices: ['Alabanza', 'Alabanza'],
      practiceSlugs: ['alabanza', 'alabanza'],
      answers: [],
    });
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('uses the administrable templates when provided (RF-ADM-10)', () => {
    const questions = buildIcebreakers(
      { practices: ['Alabanza'], practiceSlugs: ['alabanza'], answers: [] },
      {
        byPractice: { alabanza: '¿Qué instrumento tocas en el equipo?' },
        generic: ['¿Cómo llegaste a tu iglesia?'],
      },
    );
    expect(questions[0]).toBe('¿Qué instrumento tocas en el equipo?');
    expect(questions).toContain('¿Cómo llegaste a tu iglesia?');
  });

  it('surfaces a conversation answer as context (RF-PER-09)', () => {
    const questions = buildIcebreakers({
      practices: [],
      answers: [{ question: 'gratitude', answer: 'La salud de mi mamá después de la cirugía' }],
    });
    expect(questions.join(' ')).toContain('La salud de mi mamá');
  });
});

describe('rompehielos desde el terreno común (RF-CON-04)', () => {
  const facts = {
    practices: ['Alabanza', 'Misiones'],
    practiceSlugs: ['alabanza', 'misiones'],
    churchName: 'Iglesia Monte de Sion',
    answers: [],
  };

  it('lo compartido va primero', () => {
    const [first] = buildIcebreakers(facts, undefined, { practices: ['Alabanza'] });
    expect(first).toBe('Los dos sirven en alabanza, ¿cómo llegaste tú?');
  });

  it('la misma iglesia da una pregunta concreta', () => {
    const questions = buildIcebreakers(facts, undefined, { sameChurch: true });
    expect(questions[0]).toContain('Iglesia Monte de Sion');
  });

  it('sin terreno común se comporta como antes', () => {
    // Nadie debe quedarse sin rompehielos por no compartir prácticas.
    const questions = buildIcebreakers(facts);
    expect(questions).toHaveLength(3);
    expect(questions[0]).toBe('Vi que sirves en alabanza, ¿cómo llegaste ahí?');
  });

  it('nunca repite una pregunta ni pasa de tres', () => {
    const questions = buildIcebreakers(facts, undefined, {
      practices: ['Alabanza'],
      sameChurch: true,
      sameDenomination: true,
    });
    expect(questions).toHaveLength(3);
    expect(new Set(questions).size).toBe(3);
  });
});

describe('coincidir en un evento (RF-EVE-05 / RF-CON-04)', () => {
  it('propone verse allá, y lo pone primero', () => {
    // No hay mejor rompehielos que uno que no hay que inventar: ya van a
    // estar en el mismo lugar.
    const questions = buildIcebreakers(
      { practices: ['Alabanza'], practiceSlugs: ['alabanza'], answers: [] },
      undefined,
      {
        practices: ['Alabanza'],
        sameChurch: true,
        event: { title: 'Vigilia de jóvenes', whenLabel: 'el viernes' },
      },
    );
    expect(questions[0]).toBe('Vi que vas a «Vigilia de jóvenes» el viernes, ¿nos saludamos allá?');
    expect(questions).toHaveLength(3);
  });

  it('sin evento compartido no lo menciona', () => {
    const questions = buildIcebreakers(
      { practices: ['Alabanza'], practiceSlugs: ['alabanza'], answers: [] },
      undefined,
      { practices: ['Alabanza'] },
    );
    expect(questions.join(' ')).not.toContain('nos saludamos allá');
  });
});
