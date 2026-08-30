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
