/**
 * «Cómo llegar»: una URL de direcciones que abre la app de mapas del
 * teléfono. Con coordenadas va al punto exacto; sin ellas, busca la dirección.
 */
export function directionsUrl(event: {
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
  churchName?: string;
}): string | null {
  if (typeof event.lat === 'number' && typeof event.lng === 'number') {
    return `https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`;
  }
  const query = [event.address, event.churchName, event.city].filter(Boolean).join(', ');
  if (!query) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}
