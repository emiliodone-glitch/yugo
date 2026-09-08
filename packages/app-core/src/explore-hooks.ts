/**
 * Modo explorar: lo que se puede ver de Yugo sin tener cuenta.
 *
 * El devocional del día, la agenda pública de eventos, las historias y los
 * grupos que existen. Nunca perfiles ni nada de una persona concreta: quien
 * explora ve que la comunidad está viva, no a quién tiene dentro. En modo
 * demo se sirven las fixtures, como el resto de la app.
 */
import { useQuery } from '@tanstack/react-query';
import {
  demoDevotional,
  demoEvents,
  demoGroups,
  type GroupSummary,
  type PublicDevotional,
  type PublicEvent,
} from '@yugo/shared';
import { api, isDemoMode } from './runtime';

function demoPublicEvent(event: (typeof demoEvents)[number]): PublicEvent {
  return {
    id: event.id,
    title: event.title,
    description: (event as { description?: string }).description ?? null,
    type: event.type,
    typeName: event.typeName,
    imageUrl: event.imageUrl,
    startsAt: event.startsAt,
    endsAt: event.endsAt ?? null,
    address: event.address ?? null,
    city: event.city ?? null,
    lat: event.lat ?? null,
    lng: event.lng ?? null,
    churchName: event.churchName,
    costLabel: event.costLabel,
    externalUrl: null,
    interestedCount: event.goingCount + event.interestedCount,
    shareUrl: `/e/${event.id}`,
  };
}

export function usePublicDevotional() {
  return useQuery<PublicDevotional | null>({
    queryKey: ['explore', 'devotional'],
    queryFn: async () => {
      if (isDemoMode()) {
        const { id, publishOn, isToday, reference, title, body, question, readCount } = demoDevotional;
        return { id, publishOn, isToday, reference, title, body, question, readCount };
      }
      return api().explore.devotional();
    },
  });
}

export function usePublicEvents() {
  return useQuery<PublicEvent[]>({
    queryKey: ['explore', 'events'],
    queryFn: async () => (isDemoMode() ? demoEvents.map(demoPublicEvent) : api().explore.events()),
  });
}

export function usePublicEvent(eventId: string) {
  return useQuery<PublicEvent>({
    queryKey: ['explore', 'event', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      if (isDemoMode()) {
        const event = demoEvents.find((e) => e.id === eventId);
        if (!event) throw new Error('not_found');
        return demoPublicEvent(event);
      }
      return api().events.publicEvent(eventId);
    },
  });
}

export function usePublicGroups() {
  return useQuery<GroupSummary[]>({
    queryKey: ['explore', 'groups'],
    queryFn: async () => (isDemoMode() ? demoGroups : api().explore.groups()),
  });
}
