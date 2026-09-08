'use client';

import { avatarColor } from '@yugo/ui-tokens';
import { CheckIcon } from './icons';

/** Avatar with initial over the brand's muted palette (mockups a1..a6). */
export function Avatar({
  name,
  size = 'm',
  highlight,
  square,
  photoUrl,
}: {
  name: string;
  size?: 's' | 'm' | 'l' | 'xs';
  highlight?: boolean;
  square?: boolean;
  /** Approved photo, when the member has one. Falls back to the initial. */
  photoUrl?: string;
}) {
  const dimensions = {
    xs: 'h-[22px] w-[22px] text-[9px]',
    s: 'h-[34px] w-[34px] text-[13px]',
    m: 'h-[46px] w-[46px] text-[17px]',
    l: 'h-16 w-16 text-[22px]',
  }[size];
  const shape = `${square ? 'rounded-[10px]' : 'rounded-full'} ${
    highlight ? 'ring-[3px] ring-wheat' : ''
  }`;

  if (photoUrl) {
    return (
      // Signed URLs from our own storage; next/image would need the host
      // allow-listed and buys nothing for an avatar this small.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        aria-hidden
        loading="lazy"
        className={`flex-none object-cover ${dimensions} ${shape}`}
      />
    );
  }

  return (
    <span
      className={`flex flex-none items-center justify-center font-display font-semibold text-white ${dimensions} ${shape}`}
      style={{ backgroundColor: avatarColor(name) }}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Affinity ring: conic gradient with the score in the center (RF-DES-02). */
export function AffinityRing({ value, size = 52 }: { value: number; size?: number }) {
  const inner = size - 12;
  const fontSize = size >= 48 ? 13 : 9;
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#7A8450 ${value}%, #F1EDE3 0)`,
      }}
      role="img"
      aria-label={`Afinidad ${value} de 100`}
    >
      <span
        className="flex items-center justify-center rounded-full bg-white font-bold text-ink"
        style={{ width: inner, height: inner, fontSize }}
      >
        {value}
      </span>
    </span>
  );
}

/** Olive endorsement badge: "Respaldado por su iglesia" (RF-VER-04). */
export function EndorsedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-olive px-2 py-[3px] text-[10.5px] font-semibold text-white">
      <CheckIcon className="h-[11px] w-[11px]" />
      {label}
    </span>
  );
}

export function Toggle({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={`relative h-5 w-9 flex-none rounded-full transition-colors ${
        on ? 'bg-olive' : 'bg-[#D5D2C8]'
      } ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
          on ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export function Segment<T extends string>({
  options,
  value,
  onChange,
  dark,
}: {
  options: Array<{ value: T; label: string; activeClass?: string }>;
  value: T;
  onChange: (value: T) => void;
  dark?: boolean;
}) {
  // Roles de pestañas de verdad, como ya hace la app móvil: sin ellos un
  // lector de pantalla anuncia tres botones sueltos y no sabe cuál está activo.
  return (
    <div
      role="tablist"
      className={`flex rounded-field p-[3px] ${dark ? 'bg-white/10' : 'bg-linen-2'}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-[10px] px-2 py-[7px] text-xs font-semibold transition ${
              active
                ? (option.activeClass ?? 'bg-white text-ink shadow-segment')
                : dark
                  ? 'text-ink-muted'
                  : 'text-muted'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Labeled progress bar used by the affinity breakdown (RF-DES-03). */
export function ScoreBar({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex items-center justify-between text-[12.5px]">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="bar mt-1">
        <i style={{ width: `${value}%` }} />
      </div>
      {note ? <div className="mt-0.5 text-[11px] text-muted">{note}</div> : null}
    </div>
  );
}

/** Oscurece un color hexadecimal; si no es hex, lo devuelve tal cual. */
function shade(color: string, amount: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return color;
  const value = parseInt(match[1], 16);
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * (1 + amount))));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

/**
 * Superficie de foto de una persona. Con foto aprobada, la foto. Sin foto, un
 * degradado del color propio de esa persona (el mismo de su avatar) con su
 * inicial al fondo: la tarjeta sigue siendo suya y no una silueta gris igual
 * a todas las demás, que hacía que Descubrir pareciera un prototipo.
 */
export function PhotoPlaceholder({
  className = '',
  children,
  gradient,
  name,
  photoUrl,
  alt = '',
}: {
  className?: string;
  children?: React.ReactNode;
  /** Fondo explícito; si falta, se deriva de `name`. */
  gradient?: string;
  /** Nombre de la persona: decide el color y la inicial de respaldo. */
  name?: string;
  /** Approved photo. Without one the surface keeps the gradient. */
  photoUrl?: string;
  alt?: string;
}) {
  const base = name ? avatarColor(name) : '#8E8A80';
  const background =
    gradient ??
    `linear-gradient(160deg, ${shade(base, 0.18)} 0%, ${base} 45%, ${shade(base, -0.38)} 100%)`;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background }}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 25%, rgba(255,255,255,.30), transparent 55%)',
            }}
          />
          {name ? (
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-6 -right-2 select-none font-display text-[190px] font-semibold leading-none text-white/[0.14]"
            >
              {name.charAt(0).toUpperCase()}
            </span>
          ) : null}
          {/* Sombra inferior para que el nombre en blanco se lea sobre cualquier color. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
            style={{ background: 'linear-gradient(180deg, transparent, rgba(22,31,61,.55))' }}
          />
        </>
      )}
      {children}
    </div>
  );
}

/** Signature element: two avatars joined by the yoke arc (sección 11). */
export function YugoLink({ nameA, nameB }: { nameA: string; nameB: string }) {
  return (
    <div className="relative my-2 flex h-[88px] items-center justify-center">
      <div
        className="absolute left-1/2 top-1.5 h-[60px] w-[130px] -translate-x-1/2 rounded-t-[70px] border-[3px] border-b-0 border-wheat"
        aria-hidden
      />
      <span className="relative z-10 shadow-[0_0_0_4px_#FAF8F3] rounded-full">
        <Avatar name={nameA} size="l" />
      </span>
      <span className="relative z-10 ml-[50px] shadow-[0_0_0_4px_#FAF8F3] rounded-full">
        <Avatar name={nameB} size="l" />
      </span>
    </div>
  );
}
