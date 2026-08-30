/**
 * Typography tokens. Fraunces for display/titles (editorial personality),
 * DM Sans for interface and body. Mobile loads them with expo-font.
 */
export const fontFamilies = {
  display: "'Fraunces', Georgia, serif",
  body: "'DM Sans', system-ui, -apple-system, sans-serif",
} as const;

/** Font family names as registered with expo-font on mobile. */
export const nativeFontFamilies = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
} as const;

export const fontSizes = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 17,
  h3: 15,
  h2: 19,
  h1: 26,
  display: 34,
  count: 30,
} as const;

export const lineHeights = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.45,
  relaxed: 1.5,
} as const;
