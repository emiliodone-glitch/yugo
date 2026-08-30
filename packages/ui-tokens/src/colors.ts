/**
 * Yugo brand palette (identidad visual, sección 11 del documento de requerimientos).
 * Sober and warm materials: indigo ink, olive, golden wheat and linen.
 * No pinks, hearts or flames — the tone is serene and direct.
 */
export const colors = {
  /** Indigo — structure, primary buttons, headings */
  ink: '#22315C',
  /** Deep indigo — sidebars, dark surfaces */
  inkDeep: '#161F3D',
  /** Olive — positive actions, verification */
  olive: '#7A8450',
  oliveSoft: '#E9ECDD',
  /** Darker olive for text over oliveSoft (AA contrast) */
  oliveText: '#4E5630',
  /** Wheat — highlights, Plus/Oro */
  wheat: '#E0B25A',
  wheatSoft: '#FBF1D9',
  /** Darker wheat for text over wheatSoft (AA contrast) */
  wheatText: '#7A5A12',
  /** Linen — backgrounds */
  linen: '#FAF8F3',
  linen2: '#F1EDE3',
  line: '#E4E0D5',
  /** Wine — alerts, moderation */
  wine: '#7B2D4B',
  wineSoft: '#F3E3E9',
  /** Body text */
  text: '#1B1F2A',
  muted: '#6C7280',
  white: '#FFFFFF',
  /** Muted blue text over indigo surfaces */
  inkMuted: '#C9D0E3',
  inkMuted2: '#8F9AB8',
} as const;

export type ColorToken = keyof typeof colors;

/** Avatar background rotation used across surfaces (matches mockups a1..a6). */
export const avatarPalette = [
  '#8C6A9E',
  '#5B8C7E',
  '#B9694F',
  '#4F79B9',
  '#A67E3B',
  '#6B7A8C',
] as const;

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarPalette[hash % avatarPalette.length];
}
