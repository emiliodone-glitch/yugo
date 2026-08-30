'use client';

import {
  ApiError,
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

/** Spanish copy for the API's domain error codes. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Algo salió mal. Inténtalo de nuevo.';
  const messages: Record<string, string> = {
    invalid_credentials: 'Correo o contraseña incorrectos.',
    account_exists: 'Ya existe una cuenta con esos datos.',
    account_banned: 'Esta cuenta fue suspendida permanentemente.',
    account_suspended: 'Tu cuenta está suspendida temporalmente.',
    must_be_adult: 'Debes tener al menos 18 años para usar Yugo.',
    invalid_otp: 'El código no es válido o ya venció.',
    otp_rate_limited: 'Demasiados intentos. Espera unos minutos.',
    rate_limited: 'Demasiadas solicitudes. Espera un momento.',
    covenant_acceptance_required: 'Debes aceptar la versión vigente del Pacto de conducta.',
    covenant_version_outdated: 'El pacto cambió; acepta la versión vigente.',
    daily_interests_used: 'Usaste tus intereses de hoy.',
    already_interested: 'Ya marcaste interés en esta persona.',
    plus_required: 'Esta función es de Yugo Plus.',
    oro_required: 'Esta función es de Yugo Oro.',
    interest_message_requires_plus: 'El mensaje con tu interés es de Yugo Plus.',
    interest_message_too_long: 'El mensaje excede el límite de tu nivel.',
    age_range_too_narrow: 'El rango debe tener al menos 3 años de amplitud.',
    age_min_below_adult: 'El rango no puede incluir menores de 18 años.',
    level2_required: 'Necesitas verificar tu identidad para crear grupos.',
    max_groups_administered: 'Ya administras el máximo de grupos permitido.',
    requires_admin_approval: 'Este grupo requiere aprobación de sus administradores.',
    not_member: 'Debes ser parte del grupo para publicar.',
    muted: 'Estás silenciado temporalmente en este grupo.',
    invalid_code: 'El código no es válido.',
    code_already_used: 'Ese código ya fue usado.',
    code_expired: 'Ese código venció.',
    invalid_promo_code: 'El código promocional no es válido.',
    promo_code_expired: 'El código promocional venció.',
    promo_code_exhausted: 'Ese código ya alcanzó su límite de usos.',
    promo_already_used: 'Ya usaste ese código promocional.',
    already_subscribed: 'Ya tienes una suscripción activa.',
    event_full: 'El evento alcanzó su aforo.',
    weekly_boost_used: 'Ya usaste tus destaques de esta semana.',
    already_featured: 'Tu perfil ya está destacado ahora mismo.',
    undo_limit_reached: 'Alcanzaste el límite de deshacer de hoy.',
    nothing_to_undo: 'No hay ningún perfil que recuperar.',
    connection_ended: 'Esta conexión ya no está activa.',
    validation_error: 'Revisa los datos e inténtalo de nuevo.',
  };
  if (error.isUnauthorized) return 'Tu sesión expiró. Vuelve a entrar.';
  return messages[error.code] ?? 'Algo salió mal. Inténtalo de nuevo.';
}
