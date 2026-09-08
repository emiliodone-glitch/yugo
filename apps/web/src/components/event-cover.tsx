import { CalendarIcon } from './icons';

/**
 * Portada de un encuentro cuando no hay imagen.
 *
 * Antes era un icono de calendario sobre un degradado igual para todos, y
 * la agenda parecía una lista de trámites. Cada tipo tiene ahora su paleta
 * y un motivo propio (velas para la vigilia, montañas para el retiro, ondas
 * para el concierto…), dibujado en SVG para que pese nada y se vea nítido a
 * cualquier ancho. Con `imageUrl` se usa la foto real y esto queda detrás.
 */
type Motif = 'candles' | 'mountains' | 'waves' | 'hands' | 'arches' | 'rays' | 'dots';

const STYLES: Record<string, { gradient: string; motif: Motif }> = {
  VIGILIA: {
    gradient: 'linear-gradient(160deg,#4A1F35 0%,#7B2D4B 55%,#22315C 100%)',
    motif: 'candles',
  },
  RETIRO: {
    gradient: 'linear-gradient(160deg,#3F4A2A 0%,#7A8450 60%,#B7B48C 100%)',
    motif: 'mountains',
  },
  CONCIERTO: {
    gradient: 'linear-gradient(160deg,#22315C 0%,#3E4C82 55%,#D9A441 130%)',
    motif: 'waves',
  },
  SERVICIO_COMUNITARIO: {
    gradient: 'linear-gradient(160deg,#5F6A3A 0%,#7A8450 60%,#C9C1B1 130%)',
    motif: 'hands',
  },
  CONGRESO: {
    gradient: 'linear-gradient(160deg,#161F3D 0%,#22315C 60%,#4A5A8F 100%)',
    motif: 'arches',
  },
  CULTO_ESPECIAL: {
    gradient: 'linear-gradient(160deg,#9A6B1C 0%,#D9A441 60%,#F1DDA6 130%)',
    motif: 'rays',
  },
  ACTIVIDAD_SOCIAL: {
    gradient: 'linear-gradient(160deg,#7B2D4B 0%,#B0567A 60%,#F0C9D6 130%)',
    motif: 'dots',
  },
};

const FALLBACK = { gradient: 'linear-gradient(160deg,#7B2D4B,#22315C)', motif: 'dots' as Motif };

export function eventCoverStyle(type: string | undefined): { gradient: string; motif: Motif } {
  return (type && STYLES[type]) || FALLBACK;
}

function MotifSvg({ motif }: { motif: Motif }) {
  const stroke = 'rgba(255,255,255,0.28)';
  const fill = 'rgba(255,255,255,0.14)';
  switch (motif) {
    case 'candles':
      return (
        <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
          {[60, 130, 200, 270, 340].map((x, index) => (
            <g key={x}>
              <rect x={x - 9} y={70 + (index % 2) * 14} width={18} height={90} rx={3} fill={fill} />
              <ellipse
                cx={x}
                cy={58 + (index % 2) * 14}
                rx={7}
                ry={12}
                fill="rgba(255,236,170,0.55)"
              />
            </g>
          ))}
        </svg>
      );
    case 'mountains':
      return (
        <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
          <path d="M0 160 L90 60 L150 120 L230 30 L320 130 L400 70 L400 160 Z" fill={fill} />
          <path d="M0 160 L60 110 L130 150 L210 90 L300 160 Z" fill="rgba(255,255,255,0.10)" />
          <circle cx={330} cy={36} r={16} fill="rgba(255,236,170,0.45)" />
        </svg>
      );
    case 'waves':
      return (
        <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="h-full w-full">
          {[40, 70, 100, 130].map((y, index) => (
            <path
              key={y}
              d={`M0 ${y} C 50 ${y - 25}, 100 ${y + 25}, 150 ${y} S 250 ${y - 25}, 300 ${y} S 380 ${y + 20}, 400 ${y}`}
              stroke={stroke}
              strokeWidth={2 + index}
              fill="none"
            />
          ))}
        </svg>
      );
    case 'hands':
      return (
        <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
          <circle cx={120} cy={90} r={60} fill={fill} />
          <circle cx={280} cy={90} r={60} fill={fill} />
          <circle cx={200} cy={80} r={44} fill="rgba(255,255,255,0.18)" />
        </svg>
      );
    case 'arches':
      return (
        <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
          {[40, 120, 200, 280, 360].map((x) => (
            <path key={x} d={`M${x - 36} 160 V 80 A 36 36 0 0 1 ${x + 36} 80 V 160`} fill={fill} />
          ))}
        </svg>
      );
    case 'rays':
      return (
        <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
          {Array.from({ length: 9 }, (_, index) => {
            const angle = -90 + (index - 4) * 18;
            const rad = (angle * Math.PI) / 180;
            return (
              <line
                key={index}
                x1={200}
                y1={170}
                x2={200 + Math.cos(rad) * 260}
                y2={170 + Math.sin(rad) * 260}
                stroke={stroke}
                strokeWidth={10}
              />
            );
          })}
        </svg>
      );
    case 'dots':
    default:
      return (
        <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
          {Array.from({ length: 24 }, (_, index) => (
            <circle
              key={index}
              cx={(index % 8) * 52 + 26}
              cy={Math.floor(index / 8) * 52 + 30}
              r={6 + ((index * 7) % 9)}
              fill={fill}
            />
          ))}
        </svg>
      );
  }
}

export function EventCover({
  type,
  imageUrl,
  className = 'h-28',
  children,
}: {
  type: string | undefined;
  imageUrl?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const style = eventCoverStyle(type);
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: style.gradient }}
      aria-hidden={!imageUrl}
    >
      {imageUrl ? (
        // Portada subida por la iglesia; nuestro almacenamiento, sin next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <div className="absolute inset-0 opacity-90">
            <MotifSvg motif={style.motif} />
          </div>
          <CalendarIcon className="absolute right-3 top-3 h-6 w-6 text-white/50" />
        </>
      )}
      {children ? <div className="absolute inset-0">{children}</div> : null}
    </div>
  );
}
