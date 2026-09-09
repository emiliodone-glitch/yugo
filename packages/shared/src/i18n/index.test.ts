import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  activeDictionary,
  es,
  getLocale,
  isLocale,
  onLocaleChange,
  resolveLocale,
  setLocale,
  SUPPORTED_LOCALES,
} from './index';
import { es as esDO } from './locales/es-DO';
import { en } from './locales/en-US';

/**
 * Idiomas (RNF-06). Lo que protege: por defecto todo es español dominicano;
 * al cambiar a inglés, `es` (el objeto que importan 130 pantallas) devuelve
 * inglés sin que ninguna cambie; las funciones, los arreglos y las claves
 * dinámicas también; y volver a español restaura todo.
 */
afterEach(() => setLocale('es-DO'));

describe('idiomas', () => {
  it('español dominicano por defecto y los dos idiomas registrados', () => {
    expect(getLocale()).toBe('es-DO');
    expect(SUPPORTED_LOCALES).toEqual(['es-DO', 'en-US']);
    expect(es.common.save).toBe('Guardar');
    expect(activeDictionary()).toBe(esDO);
  });

  it('al cambiar a inglés, el mismo objeto devuelve inglés', () => {
    setLocale('en-US');
    expect(es.common.save).toBe('Save');
    expect(es.tabs.discover).toBe('Discover');
    expect(es.relationship.stages.COURTSHIP).toBe('Courtship');
    expect(activeDictionary()).toBe(en);
    setLocale('es-DO');
    expect(es.common.save).toBe('Guardar');
  });

  it('las funciones, los arreglos y las claves dinámicas siguen al idioma', () => {
    setLocale('en-US');
    expect(es.common.step(2, 5)).toBe('STEP 2 OF 5');
    expect(es.home.greeting('Ana')).toBe('Blessings, Ana');
    expect(es.paywall.plusFeatures[0]).toBe('Unlimited interests');
    expect(es.welcome.points[0].title).toBe('Faith affinity, explained');
    expect(es.discover.secondLookChanges['photos']).toBe('new photos');
    expect(es.admin.heldKind.voice).toBe('Audio testimony');
  });

  it('el inglés cubre todas las claves del español, incluidas las funciones', () => {
    const compare = (reference: unknown, translated: unknown, path: string) => {
      if (typeof reference === 'function') {
        expect(typeof translated, path).toBe('function');
        return;
      }
      if (Array.isArray(reference)) {
        expect(Array.isArray(translated), path).toBe(true);
        expect((translated as unknown[]).length, path).toBe(reference.length);
        return;
      }
      if (reference && typeof reference === 'object') {
        for (const key of Object.keys(reference)) {
          expect(translated, path).toHaveProperty(key);
          compare(
            (reference as Record<string, unknown>)[key],
            (translated as Record<string, unknown>)[key],
            `${path}.${key}`,
          );
        }
        return;
      }
      expect(typeof translated, path).toBe(typeof reference);
      expect(String(translated).trim().length, path).toBeGreaterThan(0);
    };
    compare(esDO, en, 'en');
  });

  it('avisa a quien escucha y respeta idiomas desconocidos', () => {
    const listener = vi.fn();
    const stop = onLocaleChange(listener);
    setLocale('en-US');
    setLocale('en-US');
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    setLocale('es-DO');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(isLocale('fr-FR')).toBe(false);
    setLocale('fr-FR' as never);
    expect(getLocale()).toBe('es-DO');
  });

  it('elige el idioma del dispositivo: inglés para la diáspora, español para todo lo demás', () => {
    expect(resolveLocale(['en-US', 'es'])).toBe('en-US');
    expect(resolveLocale(['en'])).toBe('en-US');
    expect(resolveLocale(['es-MX'])).toBe('es-DO');
    expect(resolveLocale(['fr-FR'])).toBe('es-DO');
    expect(resolveLocale([])).toBe('es-DO');
  });
});
