import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Enlace universal del afiche o de un evento compartido (https://…/e/ID).
 * Dentro de la app no hay página pública: se abre el detalle real, y si el
 * enlace trae el token del QR de entrada (?ci=), el detalle registra la
 * asistencia (RF-EVE-06, RF-EVE-08).
 */
export default function PublicEventRedirect() {
  const { id, ci } = useLocalSearchParams<{ id: string; ci?: string }>();
  return (
    <Redirect
      href={{ pathname: '/eventos/[id]', params: ci ? { id: id ?? '', ci } : { id: id ?? '' } }}
    />
  );
}
