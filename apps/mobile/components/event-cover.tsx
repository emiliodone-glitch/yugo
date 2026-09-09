import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * Portada de un encuentro cuando no hay imagen.
 *
 * El mismo criterio que en la web: cada tipo tiene su paleta y un motivo
 * propio (velas para la vigilia, montañas para el retiro, ondas para el
 * concierto…), dibujado en SVG para que pese nada y se vea nítido en
 * cualquier pantalla. Con `imageUrl` se usa la foto real y esto queda detrás.
 */
type Motif = 'candles' | 'mountains' | 'waves' | 'hands' | 'arches' | 'rays' | 'dots';

interface CoverStyle {
  stops: Array<[string, number]>;
  motif: Motif;
}

const STYLES: Record<string, CoverStyle> = {
  VIGILIA: {
    stops: [
      ['#4A1F35', 0],
      ['#7B2D4B', 0.55],
      ['#22315C', 1],
    ],
    motif: 'candles',
  },
  RETIRO: {
    stops: [
      ['#3F4A2A', 0],
      ['#7A8450', 0.6],
      ['#B7B48C', 1],
    ],
    motif: 'mountains',
  },
  CONCIERTO: {
    stops: [
      ['#22315C', 0],
      ['#3E4C82', 0.55],
      ['#D9A441', 1],
    ],
    motif: 'waves',
  },
  SERVICIO_COMUNITARIO: {
    stops: [
      ['#5F6A3A', 0],
      ['#7A8450', 0.6],
      ['#C9C1B1', 1],
    ],
    motif: 'hands',
  },
  CONGRESO: {
    stops: [
      ['#161F3D', 0],
      ['#22315C', 0.6],
      ['#4A5A8F', 1],
    ],
    motif: 'arches',
  },
  CULTO_ESPECIAL: {
    stops: [
      ['#9A6B1C', 0],
      ['#D9A441', 0.6],
      ['#F1DDA6', 1],
    ],
    motif: 'rays',
  },
  ACTIVIDAD_SOCIAL: {
    stops: [
      ['#7B2D4B', 0],
      ['#B0567A', 0.6],
      ['#F0C9D6', 1],
    ],
    motif: 'dots',
  },
};

const FALLBACK: CoverStyle = {
  stops: [
    ['#7B2D4B', 0],
    ['#22315C', 1],
  ],
  motif: 'dots',
};

export function eventCoverStyle(type: string | undefined): CoverStyle {
  return (type && STYLES[type]) || FALLBACK;
}

const STROKE = 'rgba(255,255,255,0.28)';
const FILL = 'rgba(255,255,255,0.14)';

function Motif({ motif }: { motif: Motif }) {
  switch (motif) {
    case 'candles':
      return (
        <G>
          {[60, 130, 200, 270, 340].map((x, index) => (
            <G key={x}>
              <Rect x={x - 9} y={70 + (index % 2) * 14} width={18} height={90} rx={3} fill={FILL} />
              <Ellipse
                cx={x}
                cy={58 + (index % 2) * 14}
                rx={7}
                ry={12}
                fill="rgba(255,236,170,0.55)"
              />
            </G>
          ))}
        </G>
      );
    case 'mountains':
      return (
        <G>
          <Path d="M0 160 L90 60 L150 120 L230 30 L320 130 L400 70 L400 160 Z" fill={FILL} />
          <Path d="M0 160 L60 110 L130 150 L210 90 L300 160 Z" fill="rgba(255,255,255,0.10)" />
          <Circle cx={330} cy={36} r={16} fill="rgba(255,236,170,0.45)" />
        </G>
      );
    case 'waves':
      return (
        <G>
          {[40, 70, 100, 130].map((y, index) => (
            <Path
              key={y}
              d={`M0 ${y} C 50 ${y - 25}, 100 ${y + 25}, 150 ${y} S 250 ${y - 25}, 300 ${y} S 380 ${
                y + 20
              }, 400 ${y}`}
              stroke={STROKE}
              strokeWidth={2 + index}
              fill="none"
            />
          ))}
        </G>
      );
    case 'hands':
      return (
        <G>
          <Circle cx={120} cy={90} r={60} fill={FILL} />
          <Circle cx={280} cy={90} r={60} fill={FILL} />
          <Circle cx={200} cy={80} r={44} fill="rgba(255,255,255,0.18)" />
        </G>
      );
    case 'arches':
      return (
        <G>
          {[40, 120, 200, 280, 360].map((x) => (
            <Path key={x} d={`M${x - 36} 160 V 80 A 36 36 0 0 1 ${x + 36} 80 V 160`} fill={FILL} />
          ))}
        </G>
      );
    case 'rays':
      return (
        <G>
          {Array.from({ length: 9 }, (_, index) => {
            const angle = -90 + (index - 4) * 18;
            const rad = (angle * Math.PI) / 180;
            return (
              <Line
                key={index}
                x1={200}
                y1={170}
                x2={200 + Math.cos(rad) * 260}
                y2={170 + Math.sin(rad) * 260}
                stroke={STROKE}
                strokeWidth={10}
              />
            );
          })}
        </G>
      );
    case 'dots':
    default:
      return (
        <G>
          {Array.from({ length: 24 }, (_, index) => (
            <Circle
              key={index}
              cx={(index % 8) * 52 + 26}
              cy={Math.floor(index / 8) * 52 + 30}
              r={6 + ((index * 7) % 9)}
              fill={FILL}
            />
          ))}
        </G>
      );
  }
}

export function EventCover({
  type,
  imageUrl,
  height = 104,
  style,
  children,
}: {
  type: string | undefined;
  imageUrl?: string;
  height?: number;
  style?: ViewStyle;
  /** Se pinta encima de la portada (una etiqueta, un texto). */
  children?: React.ReactNode;
}) {
  const cover = eventCoverStyle(type);
  const gradientId = `cover-${cover.motif}`;
  return (
    <View
      style={[{ height, backgroundColor: cover.stops[0][0], overflow: 'hidden' }, style]}
      accessibilityElementsHidden={!imageUrl}
      importantForAccessibility={imageUrl ? 'auto' : 'no-hide-descendants'}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 400 160"
          preserveAspectRatio="xMidYMid slice"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              {cover.stops.map(([color, offset]) => (
                <Stop key={`${color}-${offset}`} offset={offset} stopColor={color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect width={400} height={160} fill={`url(#${gradientId})`} />
          <Motif motif={cover.motif} />
        </Svg>
      )}
      {children ? <View style={StyleSheet.absoluteFill}>{children}</View> : null}
    </View>
  );
}
