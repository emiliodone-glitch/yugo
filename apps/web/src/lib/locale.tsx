'use client';

/**
 * Idioma de la interfaz (RNF-06): español dominicano por defecto, inglés para
 * la diáspora.
 *
 * El servidor siempre pinta en español; al hidratar se aplica la preferencia
 * guardada (o el idioma del navegador) y, solo si cambia, se vuelve a montar
 * el árbol. Así no hay desajuste de hidratación y quien usa español no paga
 * nada. La preferencia vive en el navegador; con sesión se guarda también en
 * la cuenta para que el teléfono y la web coincidan.
 */
import { useEffect, useSyncExternalStore } from 'react';
import {
  DEFAULT_LOCALE,
  getLocale,
  isLocale,
  LOCALE_NAMES,
  onLocaleChange,
  resolveLocale,
  setLocale,
  SUPPORTED_LOCALES,
  type Locale,
} from '@yugo/shared';

const KEY = 'yugo.locale';

export function storedLocale(): Locale | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

/** Lo que eligió la persona; se aplica ya y se recuerda. */
export function chooseLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(KEY, locale);
  } catch {
    // sin almacenamiento, dura esta visita
  }
  setLocale(locale);
  document.documentElement.lang = locale;
}

export function useLocale(): Locale {
  return useSyncExternalStore(onLocaleChange, getLocale, () => DEFAULT_LOCALE);
}

export function LocaleGate({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  useEffect(() => {
    const languages = window.navigator.languages ?? [window.navigator.language];
    const preferred = storedLocale() ?? resolveLocale(languages);
    if (preferred !== getLocale()) setLocale(preferred);
    document.documentElement.lang = preferred;
  }, []);
  // La clave cambia solo cuando cambia el idioma: en español no se remonta nada.
  return (
    <div key={locale} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}

/** Dos opciones, cada una en su propio idioma. */
export function LanguageSwitch({
  onChange,
  className = '',
}: {
  onChange?: (locale: Locale) => void;
  className?: string;
}) {
  const current = useLocale();
  return (
    <div
      className={`flex flex-wrap gap-1.5 ${className}`}
      role="group"
      aria-label="Idioma / Language"
    >
      {SUPPORTED_LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={current === locale}
          className={`chip ${current === locale ? 'chip-olive' : ''}`}
          onClick={() => {
            if (current === locale) return;
            chooseLocale(locale);
            onChange?.(locale);
          }}
        >
          {LOCALE_NAMES[locale]}
        </button>
      ))}
    </div>
  );
}
