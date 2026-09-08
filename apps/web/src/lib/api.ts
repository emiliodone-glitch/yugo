'use client';

import {
  ApiError,
  apiErrorMessage,
  createApiClient,
  type TokenPair,
  type TokenStorage,
  type YugoApiClient,
} from '@yugo/shared';

const TOKEN_KEY = 'yugo.tokens';

declare global {
  interface Window {
    /** Inyectada por el layout raíz desde `API_URL` en tiempo de ejecución. */
    __YUGO_API_URL__?: string;
  }
}

/** Tokens in localStorage; SSR-safe (returns null on the server). */
class BrowserTokenStorage implements TokenStorage {
  read(): TokenPair | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(TOKEN_KEY);
      return raw ? (JSON.parse(raw) as TokenPair) : null;
    } catch {
      return null;
    }
  }

  write(tokens: TokenPair | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (tokens) window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
      else window.localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('yugo:auth-changed'));
    } catch {
      // Private mode or blocked storage: the session just won't persist.
    }
  }
}

export type ApiUrlSource = 'runtime' | 'build' | 'default';

/**
 * Acepta solo una URL con host real. Una referencia de Railway sin resolver
 * deja cosas como `https://` o `https://${{api.RAILWAY_PUBLIC_DOMAIN}}`, que
 * `new URL` rechaza o parsea con un host que no es un host. Tolera `/v1` al
 * final: lo añadimos nosotros.
 */
function validApiOrigin(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (!url.hostname || url.hostname.includes('$') || url.hostname.includes('{')) return null;
    const path = url.pathname.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
    return `${url.origin}${path}`;
  } catch {
    return null;
  }
}

/**
 * De dónde sale la dirección de la API, por orden:
 *
 *   1. `API_URL` del servidor web, inyectada en la página al servirla
 *      (`window.__YUGO_API_URL__`). Se lee en cada petición: cambiarla en
 *      Railway surte efecto sin reconstruir la web.
 *   2. `NEXT_PUBLIC_API_URL`, horneada al construir. Sigue valiendo, pero es
 *      la que fallaba en producción: una referencia sin resolver dejaba la
 *      web apuntando a `https:///v1` y no había forma de arreglarlo sin otro
 *      build.
 *   3. `http://localhost:4000`, para desarrollo.
 */
export function apiUrlSource(): ApiUrlSource {
  if (typeof window !== 'undefined' && validApiOrigin(window.__YUGO_API_URL__)) return 'runtime';
  if (validApiOrigin(process.env.NEXT_PUBLIC_API_URL)) return 'build';
  return 'default';
}

/** Base de la API con el prefijo `/v1`, resuelta en el momento de llamar. */
export function apiBaseUrl(): string {
  const origin =
    (typeof window !== 'undefined' ? validApiOrigin(window.__YUGO_API_URL__) : null) ??
    validApiOrigin(process.env.NEXT_PUBLIC_API_URL) ??
    'http://localhost:4000';
  return `${origin}/v1`;
}

/**
 * Whether this browser holds tokens for the live API. Cheap and synchronous:
 * the member area uses it to send people without a session to /entrar before
 * firing requests that would only come back as 401s.
 */
export function hasStoredSession(): boolean {
  return new BrowserTokenStorage().read() !== null;
}

/**
 * Demo mode renders the whole UI from the shared fixtures so the product can
 * be reviewed without infrastructure. With `NEXT_PUBLIC_DEMO_MODE=false` the
 * same screens talk to the live API through this client.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

let client: YugoApiClient | null = null;

export function getApiClient(): YugoApiClient {
  if (!client) {
    client = createApiClient({
      baseUrl: apiBaseUrl(),
      storage: new BrowserTokenStorage(),
      onSignOut: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('yugo:signed-out'));
        }
      },
    });
  }
  return client;
}

export { ApiError };

/** Spanish copy for the API's domain error codes (shared with mobile). */
export const errorMessage = apiErrorMessage;
