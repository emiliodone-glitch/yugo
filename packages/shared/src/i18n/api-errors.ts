/**
 * Spanish (es-DO) copy for the API's domain error codes. Web and mobile both
 * render errors from here so a member reads the same sentence on any device,
 * and a new code only has to be translated once.
 */
import { ApiError } from '../api/http';

const MESSAGES: Record<string, string> = {
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

const GENERIC = 'Algo salió mal. Inténtalo de nuevo.';
const EXPIRED_SESSION = 'Tu sesión expiró. Vuelve a entrar.';

/** Turns anything thrown by the client into a sentence a member can read. */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return GENERIC;
  if (error.isUnauthorized) return EXPIRED_SESSION;
  return MESSAGES[error.code] ?? GENERIC;
}
