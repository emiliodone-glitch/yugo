import type { Config } from 'tailwindcss';
import { colors } from '@yugo/ui-tokens';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: colors.ink,
        'ink-deep': colors.inkDeep,
        'ink-muted': colors.inkMuted,
        'ink-muted2': colors.inkMuted2,
        olive: colors.olive,
        'olive-soft': colors.oliveSoft,
        'olive-text': colors.oliveText,
        wheat: colors.wheat,
        'wheat-soft': colors.wheatSoft,
        'wheat-text': colors.wheatText,
        linen: colors.linen,
        'linen-2': colors.linen2,
        line: colors.line,
        wine: colors.wine,
        'wine-soft': colors.wineSoft,
        body: colors.text,
        muted: colors.muted,
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
        field: '12px',
        btn: '14px',
      },
      boxShadow: {
        raised: '0 20px 40px -20px rgba(22,31,61,.5)',
        segment: '0 1px 3px rgba(0,0,0,.08)',
      },
    },
  },
  plugins: [],
};

export default config;
