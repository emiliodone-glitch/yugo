/**
 * RNF-06: the MVP ships in Spanish (Dominican Republic) with the structure
 * ready for English and Portuguese.
 *
 * `es-DO` is the reference dictionary and its shape *is* the contract: a new
 * locale is one file typed as `Dictionary`, and TypeScript then refuses to
 * compile it until every key — including the interpolating functions and their
 * exact signatures — is translated. There is no runtime "missing key" path
 * because a missing key cannot be built.
 */
import { es } from './locales/es-DO';

export { es };

/**
 * Widens the literal types `as const` gives the reference dictionary. Without
 * this, `Dictionary` would demand the literal string "Continuar" and no
 * translation could ever satisfy it. Arrays stay readonly so the frozen
 * reference is assignable and a translation written as a plain array is too.
 */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => Widen<R>
        : T extends readonly (infer U)[]
          ? readonly Widen<U>[]
          : { -readonly [K in keyof T]: Widen<T[K]> };

/** The shape every locale must satisfy, derived from the reference. */
export type Dictionary = Widen<typeof es>;

export const SUPPORTED_LOCALES = ['es-DO'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es-DO';

/**
 * Registry of the dictionaries that are actually translated. Adding English
 * means writing `locales/en.ts` exporting a `Dictionary`, listing `'en'` in
 * SUPPORTED_LOCALES and adding the entry here — nothing else in web or mobile
 * changes, because every screen reads its strings from this module.
 */
const DICTIONARIES: Record<Locale, Dictionary> = {
  'es-DO': es,
};

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Picks the best available dictionary for a browser's or device's language
 * list, falling back to es-DO. Matches by exact tag first ("es-DO"), then by
 * primary subtag ("es"), so `navigator.languages` or Expo's locale array can
 * be passed straight in.
 */
export function resolveLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const exact = SUPPORTED_LOCALES.find(
      (locale) => locale.toLowerCase() === tag.toLowerCase(),
    );
    if (exact) return exact;

    const primary = tag.split('-')[0].toLowerCase();
    const byPrimary = SUPPORTED_LOCALES.find(
      (locale) => locale.split('-')[0].toLowerCase() === primary,
    );
    if (byPrimary) return byPrimary;
  }
  return DEFAULT_LOCALE;
}
