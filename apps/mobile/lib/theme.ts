/**
 * Native theme bridge over @yugo/ui-tokens. Styling uses StyleSheet with
 * these tokens; NativeWind can be layered later without touching screens
 * (class names would map to the same values).
 */
import { colors, nativeFontFamilies } from '@yugo/ui-tokens';

export const theme = {
  colors,
  fonts: nativeFontFamilies,
  radii: { sm: 10, md: 12, lg: 14, xl: 18, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, base: 14, lg: 18, xl: 22 },
} as const;

export type Theme = typeof theme;
