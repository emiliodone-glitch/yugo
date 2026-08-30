/**
 * Icon set traced from the mockups' SVG symbols — line icons, 1.8 stroke,
 * plus the Yugo mark: two rings joined by the wheat arc.
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function YugoMark({ arcColor = '#E0B25A', ...props }: IconProps & { arcColor?: string }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" {...props}>
      <circle cx="14" cy="27" r="8" stroke="currentColor" strokeWidth="3" />
      <circle cx="30" cy="27" r="8" stroke="currentColor" strokeWidth="3" />
      <path d="M6 20c4-11 28-11 32 0" stroke={arcColor} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M3 11l9-8 9 8v10H3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function DiscoverIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 9l-2 6-4 2 2-6z" fill="currentColor" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 5h16v11H9l-5 4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function GroupIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3 20c0-4 3-6 6-6s6 2 6 6M15 19c0-3 2-5 5-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PersonSilhouette(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="8" r="5" fill="currentColor" />
      <path d="M2 24c0-6 5-9 10-9s10 3 10 9z" fill="currentColor" />
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 22s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2L3 9.5l6.3-.7z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChevronLeft(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
