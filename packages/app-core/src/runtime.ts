/**
 * The two things the hooks need from whichever app hosts them: whether we are
 * in demo mode and how to reach the API. Web configures this with a
 * localStorage-backed client, mobile with a SecureStore-backed one; everything
 * else — every hook, every fixture fallback — is identical on both.
 */
import type { YugoApiClient } from '@yugo/shared';

interface AppRuntime {
  demoMode: boolean;
  client: () => YugoApiClient;
  /**
   * Idioma guardado en la cuenta (RNF-06), avisado cada vez que se carga la
   * sesión. La app decide si lo aplica: solo cuando la persona no eligió uno
   * en este dispositivo.
   */
  onAccountLocale?: (locale: string) => void;
}

let runtime: AppRuntime | null = null;

export function notifyAccountLocale(locale: string | null | undefined): void {
  if (locale) runtime?.onAccountLocale?.(locale);
}

export function configureAppRuntime(next: AppRuntime): void {
  runtime = next;
}

/**
 * Demo mode renders every screen from the shared fixtures so the product can
 * be reviewed without infrastructure. Defaults to true so a host that forgets
 * to configure the runtime shows the demo instead of crashing on a null client.
 */
export function isDemoMode(): boolean {
  return runtime?.demoMode ?? true;
}

export function api(): YugoApiClient {
  if (!runtime) {
    throw new Error('configureAppRuntime() must run before any API call.');
  }
  return runtime.client();
}
