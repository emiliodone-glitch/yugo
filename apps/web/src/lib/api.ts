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

export const API_BASE_URL = `${
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
}/v1`;

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
      baseUrl: API_BASE_URL,
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
