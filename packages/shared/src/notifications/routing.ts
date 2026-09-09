/**
 * RF-NOT-03: where a tapped notification should land.
 *
 * The payload comes from the server, so this is the piece worth pinning down:
 * a specific id wins over the category, and the notification centre is the
 * floor — a tap never does nothing.
 */
export type PushDestination =
  | { screen: 'conversation'; id: string }
  | { screen: 'event'; id: string }
  | { screen: 'group'; id: string }
  | { screen: 'interested-in-you' }
  | { screen: 'verification' }
  | { screen: 'accompaniment'; id: string }
  | { screen: 'introductions' }
  | { screen: 'church-counseling' }
  | { screen: 'notifications' };

export function destinationFor(data: Record<string, unknown> | undefined): PushDestination {
  const text = (key: string) => (typeof data?.[key] === 'string' ? (data[key] as string) : null);

  const conversationId = text('conversationId');
  if (conversationId) return { screen: 'conversation', id: conversationId };

  const eventId = text('eventId');
  if (eventId) return { screen: 'event', id: eventId };

  const groupId = text('groupId');
  if (groupId) return { screen: 'group', id: groupId };

  // Un aviso de acompañamiento lleva a la pareja acompañada, nunca al chat.
  const accompanimentId = text('accompanimentId');
  if (accompanimentId) return { screen: 'accompaniment', id: accompanimentId };

  // Una presentación por padrino se responde desde Conexiones (RF-ACO-05).
  if (text('introductionId')) return { screen: 'introductions' };

  // Una petición de consejería le llega al portal de la iglesia (RF-REL-05).
  if (text('counselingRequestId')) return { screen: 'church-counseling' };

  const category = text('category');
  if (category === 'INTEREST') return { screen: 'interested-in-you' };
  if (category === 'VERIFICATION') return { screen: 'verification' };

  return { screen: 'notifications' };
}
