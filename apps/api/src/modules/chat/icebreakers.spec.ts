import { buildIcebreakers } from './icebreakers.service';

describe('buildIcebreakers (RF-CON-04)', () => {
  it('generates questions from the other profile facts', () => {
    const questions = buildIcebreakers({
      practices: ['Niños', 'Servicio social'],
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
      answers: [],
    });
    expect(new Set(questions).size).toBe(questions.length);
  });
});
