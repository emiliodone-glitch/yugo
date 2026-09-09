import QRCode from 'qrcode';

export interface QrMatrix {
  /** Modules per side, including no quiet zone. */
  size: number;
  /** `true` where the module is dark, row by row. */
  modules: boolean[][];
}

/**
 * La matriz de un QR de verdad (RF-EVE-06), lista para dibujarse con
 * rectángulos SVG. Antes la app pintaba una cuadrícula decorativa que ningún
 * lector entendía; esto codifica el código de la entrada con corrección «M»,
 * la misma que imprime el portal, así el escáner de la puerta lo lee igual.
 */
export function qrMatrix(text: string): QrMatrix {
  const created = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const { size } = created.modules;
  const modules: boolean[][] = [];
  for (let row = 0; row < size; row += 1) {
    const cells: boolean[] = [];
    for (let col = 0; col < size; col += 1) {
      cells.push(created.modules.get(row, col) === 1);
    }
    modules.push(cells);
  }
  return { size, modules };
}

export interface QrRect {
  x: number;
  y: number;
  size: number;
}

/**
 * Los rectángulos oscuros para un lienzo de `canvas` puntos, con una zona
 * silenciosa de `quiet` módulos alrededor (la norma pide cuatro; con dos se
 * lee bien en pantalla y el código queda más grande al ojo).
 */
export function qrRects(matrix: QrMatrix, canvas: number, quiet = 2): QrRect[] {
  const total = matrix.size + quiet * 2;
  const cell = canvas / total;
  const rects: QrRect[] = [];
  matrix.modules.forEach((row, rowIndex) => {
    row.forEach((dark, colIndex) => {
      if (!dark) return;
      rects.push({ x: (colIndex + quiet) * cell, y: (rowIndex + quiet) * cell, size: cell });
    });
  });
  return rects;
}
