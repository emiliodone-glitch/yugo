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
  return (
    <div className={`flex rounded-field p-[3px] ${dark ? 'bg-white/10' : 'bg-linen-2'}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
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

/** Photo placeholder gradient with a person silhouette, as in the mockups. */
export function PhotoPlaceholder({
  className = '',
  children,
  gradient = 'linear-gradient(160deg,#C9C1B1,#8E8A80)',
  photoUrl,
  alt = '',
}: {
  className?: string;
  children?: React.ReactNode;
  gradient?: string;
  /** Approved photo. Without one the surface keeps the neutral gradient. */
  photoUrl?: string;
  alt?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: gradient }}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,.35), transparent 50%)',
          }}
        />
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
