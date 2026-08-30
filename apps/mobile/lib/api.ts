/**
 * Mobile transport for the shared typed client. Tokens live in the device
 * keychain / keystore through expo-secure-store, which is the only difference
 * with the web app: every endpoint, error code and Spanish message is shared.
 */
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import {
  ApiError,
  apiErrorMessage,
  createApiClient,
  type TokenPair,
  type TokenStorage,
  type YugoApiClient,
} from '@yugo/shared';

const TOKEN_KEY = 'yugo.tokens';

/** Keychain-backed storage with an in-memory mirror for synchronous reads. */
class SecureTokenStorage implements TokenStorage {
  private cached: TokenPair | null = null;
  private loaded = false;

  async read(): Promise<TokenPair | null> {
    if (this.loaded) return this.cached;
    try {
      const raw = await SecureStore.getItemAsync(TOKEN_KEY);
      this.cached = raw ? (JSON.parse(raw) as TokenPair) : null;
    } catch {
      // Keystore unavailable (simulator without a passcode): stay signed out.
      this.cached = null;
    }
    this.loaded = true;
    return this.cached;
  }

  async write(tokens: TokenPair | null): Promise<void> {
    this.cached = tokens;
    this.loaded = true;
    try {
      if (tokens) await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
      else await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // The session simply will not survive a restart.
    }
  }
}

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  demoMode?: boolean;
};

export const API_BASE_URL = `${
  process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://localhost:4000'
}/v1`;

/**
 * Demo mode renders every screen from the shared fixtures so the product can
 * be reviewed on a device without infrastructure. `EXPO_PUBLIC_DEMO_MODE=false`
 * points the same screens at the live API.
 */
export const DEMO_MODE =
  process.env.EXPO_PUBLIC_DEMO_MODE !== 'false' && extra.demoMode !== false;

let client: YugoApiClient | null = null;
const signOutListeners = new Set<() => void>();

export function getApiClient(): YugoApiClient {
  if (!client) {
    client = createApiClient({
      baseUrl: API_BASE_URL,
      storage: new SecureTokenStorage(),
      onSignOut: () => signOutListeners.forEach((listener) => listener()),
    });
  }
  return client;
}

/** Registers a callback for when the refresh token is rejected. */
export function onSignOut(listener: () => void): () => void {
  signOutListeners.add(listener);
  return () => signOutListeners.delete(listener);
}

export { ApiError };
export const errorMessage = apiErrorMessage;
