import { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';
import { theme } from '../lib/theme';
import { qrMatrix, qrRects } from '../lib/qr';

const { colors } = theme;

/**
 * Un QR de verdad dibujado con rectángulos SVG: nítido a cualquier tamaño y
 * legible por el escáner de la puerta. La matriz se calcula una vez por
 * código.
 */
export function QrCodeSvg({
  value,
  size = 200,
  label,
}: {
  value: string;
  size?: number;
  label?: string;
}) {
  const rects = useMemo(() => {
    try {
      return qrRects(qrMatrix(value), size);
    } catch {
      return [];
    }
  }, [value, size]);

  return (
    <Svg width={size} height={size} accessibilityRole="image" accessibilityLabel={label}>
      <Rect width={size} height={size} fill="#fff" />
      {rects.map((rect) => (
        <Rect
          key={`${rect.x}-${rect.y}`}
          x={rect.x}
          y={rect.y}
          // Un pelo más grande que la celda para que no queden líneas blancas
          // entre módulos al redondear.
          width={rect.size + 0.3}
          height={rect.size + 0.3}
          fill={colors.ink}
        />
      ))}
    </Svg>
  );
}
