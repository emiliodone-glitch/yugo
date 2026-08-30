import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  getDictionary,
  resolveLocale,
  SUPPORTED_LOCALES,
  type Dictionary,
} from './index';

describe('i18n (RNF-06)', () => {
  it('serves es-DO by default', () => {
    expect(DEFAULT_LOCALE).toBe('es-DO');
    expect(getDictionary().common.appName).toBe('Yugo');
  });

  it('falls back to the default for a locale that is not translated yet', () => {
    // Cast: the point is precisely that an unsupported tag cannot be typed.
    expect(getDictionary('fr-FR' as never).common.continue).toBe('Continuar');
  });

  it('matches a device language list by exact tag and by primary subtag', () => {
    expect(resolveLocale(['es-DO'])).toBe('es-DO');
    expect(resolveLocale(['es-MX', 'en-US'])).toBe('es-DO');
    expect(resolveLocale(['ES'])).toBe('es-DO');
    expect(resolveLocale(['en-US', 'pt-BR'])).toBe(DEFAULT_LOCALE);
    expect(resolveLocale([])).toBe(DEFAULT_LOCALE);
  });

  it('every supported locale resolves to a dictionary', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(getDictionary(locale).common.appName).toBe('Yugo');
    }
  });

  /**
   * The real guarantee is at compile time: a translation is accepted only if
   * every key is present with the right shape. This partial English draft is
   * spread over the reference, so if `Dictionary` ever stopped widening the
   * literals from `as const` this file would fail to build.
   */
  it('accepts a translated dictionary with the same shape', () => {
    const spanish = getDictionary();
    const english: Dictionary = {
      ...spanish,
      common: {
        ...spanish.common,
        continue: 'Continue',
        back: 'Back',
        step: (n: number, total: number) => `STEP ${n} OF ${total}`,
      },
      discover: {
        ...spanish.discover,
        title: 'Discover',
        interested: "I'm interested",
        interestsLeft: (n: number) => `${n} interests`,
      },
    };

    expect(english.common.continue).toBe('Continue');
    expect(english.common.step(2, 8)).toBe('STEP 2 OF 8');
    expect(english.discover.interestsLeft(5)).toBe('5 interests');
    // Untranslated keys keep the reference value instead of breaking the UI.
    expect(english.covenant.commit).toBe(spanish.covenant.commit);
  });
});
