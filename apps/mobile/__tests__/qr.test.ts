/**
 * La matriz del QR de la entrada (RF-EVE-06): un código de verdad, con los
 * tres patrones de posición donde un lector los espera.
 */
import { qrMatrix, qrRects } from '../lib/qr';

describe('qrMatrix', () => {
  it('codifica un código corto en la versión 1 (21 módulos)', () => {
    const matrix = qrMatrix('YUGO-DEMO-1');
    expect(matrix.size).toBe(21);
    expect(matrix.modules).toHaveLength(21);
    expect(matrix.modules.every((row) => row.length === 21)).toBe(true);
  });

  it('dibuja los patrones de posición en las tres esquinas', () => {
    const { modules, size } = qrMatrix('YUGO-DEMO-1');
    // Esquina de un patrón: borde oscuro, anillo claro, centro oscuro.
    const finder = (r0: number, c0: number) =>
      modules[r0][c0] && !modules[r0 + 1][c0 + 1] && modules[r0 + 3][c0 + 3];
    expect(finder(0, 0)).toBe(true);
    expect(finder(0, size - 7)).toBe(true);
    expect(finder(size - 7, 0)).toBe(true);
  });

  it('es determinista y cambia con el código', () => {
    expect(qrMatrix('YUGO-1').modules).toEqual(qrMatrix('YUGO-1').modules);
    expect(qrMatrix('YUGO-1').modules).not.toEqual(qrMatrix('YUGO-2').modules);
  });

  it('convierte los módulos oscuros en rectángulos dentro del lienzo', () => {
    const matrix = qrMatrix('YUGO-DEMO-1');
    const rects = qrRects(matrix, 200, 2);
    const dark = matrix.modules.flat().filter(Boolean).length;
    expect(rects).toHaveLength(dark);
    const cell = 200 / (matrix.size + 4);
    expect(rects[0].size).toBeCloseTo(cell);
    expect(
      rects.every((r) => r.x >= cell * 2 - 1e-9 && r.x + r.size <= 200 - cell * 2 + 1e-9),
    ).toBe(true);
  });
});
