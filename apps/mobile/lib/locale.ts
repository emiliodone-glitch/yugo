/**
 * Idioma de la app (RNF-06): español dominicano por defecto, inglés para la
 * diáspora. Se guarda en el teléfono; si no hay nada guardado, se toma el
 * idioma del sistema (un teléfono en inglés en Nueva York abre en inglés).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import {
  getLocale,
  isLocale,
  onLocaleChange,
  resolveLocale,
  setLocale,
  type Locale,
} from '@yugo/shared';

const KEY = 'yugo.locale';

function deviceLanguages(): string[] {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale;
    return tag ? [tag] : [];
  } catch {
    return [];
  }
}

/** Al arrancar: lo guardado, o el idioma del sistema, o español. */
export async function loadLocale(): Promise<Locale> {
  let stored: string | null = null;
  try {
    stored = await AsyncStorage.getItem(KEY);
  } catch {
    stored = null;
  }
  const locale = isLocale(stored) ? stored : resolveLocale(deviceLanguages());
  setLocale(locale);
  return locale;
}

export async function chooseLocale(locale: Locale): Promise<void> {
  setLocale(locale);
  try {
    await AsyncStorage.setItem(KEY, locale);
  } catch {
    // sin almacenamiento, dura esta sesión
  }
}

/** El idioma de la cuenta manda solo si en este teléfono no se eligió ninguno. */
export async function applyAccountLocale(locale: string): Promise<void> {
  if (!isLocale(locale) || locale === getLocale()) return;
  let stored: string | null = null;
  try {
    stored = await AsyncStorage.getItem(KEY);
  } catch {
    stored = null;
  }
  if (isLocale(stored)) return;
  await chooseLocale(locale);
}

export function useLocale(): Locale {
  return useSyncExternalStore(onLocaleChange, getLocale, getLocale);
}
