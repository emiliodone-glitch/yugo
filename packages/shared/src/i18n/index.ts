/**
 * RNF-06: Spanish (Dominican Republic) is the reference; English (United
 * States) exists for the diaspora. The structure is ready for Portuguese.
 *
 * `es-DO` is the reference dictionary and its shape *is* the contract: a new
 * locale is one file typed as `Dictionary`, and TypeScript then refuses to
 * compile it until every key — including the interpolating functions and their
 * exact signatures — is translated. There is no runtime "missing key" path
 * because a missing key cannot be built.
 *
 * How screens switch language without touching 130 files: every screen reads
 * `es.section.key`. `es` is not the Spanish object any more — it is a proxy
 * with the Spanish object's *type* that resolves each read against the active
 * dictionary. `setLocale('en-US')` and the next render is in English.
 */
import { es as esDO } from './locales/es-DO';
import { en } from './locales/en-US';

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
export type Dictionary = Widen<typeof esDO>;

export const SUPPORTED_LOCALES = ['es-DO', 'en-US'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es-DO';

/** Cómo se llama cada idioma, en su propio idioma: nadie busca «Inglés». */
export const LOCALE_NAMES: Record<Locale, string> = {
  'es-DO': 'Español',
  'en-US': 'English',
};

/**
 * Registry of the dictionaries that are actually translated. Adding Portuguese
 * means writing `locales/pt-BR.ts` exporting a `Dictionary`, listing it in
 * SUPPORTED_LOCALES and adding the entry here — nothing else in web or mobile
 * changes, because every screen reads its strings through `es`.
 */
const DICTIONARIES: Record<Locale, Dictionary> = {
  'es-DO': esDO,
  'en-US': en,
};

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the best available dictionary for a browser's or device's language
 * list, falling back to es-DO. Matches by exact tag first ("es-DO"), then by
 * primary subtag ("es"), so `navigator.languages` or Expo's locale array can
 * be passed straight in.
 */
export function resolveLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;

    const primary = tag.split('-')[0].toLowerCase();
    const byPrimary = SUPPORTED_LOCALES.find(
      (locale) => locale.split('-')[0].toLowerCase() === primary,
    );
    if (byPrimary) return byPrimary;
  }
  return DEFAULT_LOCALE;
}

// ---------------------------------------------------------------------------
// Active locale
// ---------------------------------------------------------------------------

let active: Locale = DEFAULT_LOCALE;
const listeners = new Set<(locale: Locale) => void>();

export function getLocale(): Locale {
  return active;
}

/** Changes the language every screen reads from. Listeners re-render. */
export function setLocale(locale: Locale): void {
  if (!isLocale(locale) || locale === active) return;
  active = locale;
  listeners.forEach((listener) => listener(locale));
}

export function onLocaleChange(listener: (locale: Locale) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The dictionary in use right now, as a plain object. */
export function activeDictionary(): Dictionary {
  return DICTIONARIES[active];
}

// ---------------------------------------------------------------------------
// `es`: the reference's type, the active locale's strings
// ---------------------------------------------------------------------------

type Node = Record<string, unknown>;

function nodeAt(root: unknown, path: readonly string[]): unknown {
  let node: unknown = root;
  for (const key of path) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Node)[key];
  }
  return node;
}

function isLeaf(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    Array.isArray(value)
  );
}

/**
 * Builds a proxy over one node of the reference dictionary. Reads of strings,
 * numbers and arrays come from the active dictionary; functions are wrapped so
 * they run the active locale's version; nested objects get their own proxy,
 * cached per key so identity is stable across renders.
 */
function proxyAt(path: readonly string[]): unknown {
  const reference = nodeAt(esDO, path);
  if (typeof reference === 'function') {
    return (...args: unknown[]) => {
      const current = nodeAt(DICTIONARIES[active], path);
      const fn = typeof current === 'function' ? current : reference;
      return (fn as (...a: unknown[]) => unknown)(...args);
    };
  }
  if (reference === null || typeof reference !== 'object' || Array.isArray(reference)) {
    return reference;
  }
  const cache = new Map<string, unknown>();
  return new Proxy(reference as Node, {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol') return Reflect.get(target, prop, receiver);
      const child = target[prop];
      if (child === undefined) {
        // Dynamic keys (`Record<string, string>` lookups) fall through to the
        // active dictionary, which may know keys the reference does not.
        const current = nodeAt(DICTIONARIES[active], path) as Node | undefined;
        return current?.[prop];
      }
      if (isLeaf(child)) {
        const current = nodeAt(DICTIONARIES[active], path) as Node | undefined;
        const value = current?.[prop];
        return value === undefined ? child : value;
      }
      let proxied = cache.get(prop);
      if (proxied === undefined) {
        proxied = proxyAt([...path, prop]);
        cache.set(prop, proxied);
      }
      return proxied;
    },
  });
}

/**
 * What every screen imports. Typed as the Spanish reference so autocompletion
 * and exhaustiveness stay exact; resolved at read time against the active
 * locale so the same code renders English when the person chose it.
 */
export const es = proxyAt([]) as typeof esDO;
