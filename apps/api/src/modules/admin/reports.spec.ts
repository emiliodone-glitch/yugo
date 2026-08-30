import { toCsv } from './reports.service';

describe('toCsv (RF-ADM-12)', () => {
  it('starts with a BOM so Excel detects UTF-8', () => {
    expect(toCsv([{ Provincia: 'Santiago', Miembros: 3 }]).charCodeAt(0)).toBe(0xfeff);
  });

  it('uses semicolons, the separator Excel expects in es-DO', () => {
    const csv = toCsv([{ Provincia: 'Santiago', Miembros: 3 }]);
    expect(csv).toContain('Provincia;Miembros');
    expect(csv).toContain('Santiago;3');
  });

  it('quotes values containing the separator or quotes', () => {
    const csv = toCsv([{ Nota: 'Santo Domingo; Este', Cita: 'Dijo "amén"' }]);
    expect(csv).toContain('"Santo Domingo; Este"');
    expect(csv).toContain('"Dijo ""amén"""');
  });

  it('renders one header plus one line per row with CRLF', () => {
    const csv = toCsv([
      { A: 1, B: 2 },
      { A: 3, B: 4 },
    ]);
    expect(csv.split('\r\n')).toHaveLength(3);
  });

  it('returns just the BOM for an empty report', () => {
    expect(toCsv([])).toBe('\uFEFF');
  });
});
