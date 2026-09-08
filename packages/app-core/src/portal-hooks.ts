/**
 * Hooks del panel admin y del portal de iglesias.
 *
 * Están aparte de hooks.ts a propósito: son pocos, cambian por otras razones
 * y hasta ahora esas pantallas vivían solo de fixtures. Contra la API real
 * mostraban números inventados (4.812 miembros activos en un piloto de 40) y
 * el portal de iglesias ni siquiera preguntaba a qué iglesia pertenece quien
 * entra. Cada hook conserva su versión demo para que el modo sin servidor
 * siga funcionando igual.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  demoAdminKpis,
  demoAttentionItems,
  demoChurch,
  demoEvents,
  type ChurchPortalEvent,
  type ChurchPortalMe,
  type CreateEventInput,
} from '@yugo/shared';
import { api, isDemoMode } from './runtime';

export interface AdminDashboardData {
  kpis: {
    activeMembers30d: number;
    newRegistrations30d: number;
    connectionsCreated30d: number;
    verifiedLevel2Pct: number;
    revenueDop30d: number;
  };
  attention: Array<{ priority: string; text: string }>;
  queues: Record<string, number>;
}

export function useAdminDashboard() {
  return useQuery<AdminDashboardData>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          kpis: {
            activeMembers30d: demoAdminKpis.activeMembers30d,
            newRegistrations30d: demoAdminKpis.weekly.reduce((a, b) => a + b, 0),
            connectionsCreated30d: demoAdminKpis.connectionsCreated,
            verifiedLevel2Pct: demoAdminKpis.verifiedLevel2Pct,
            revenueDop30d: demoAdminKpis.plusRevenueDop,
          },
          attention: demoAttentionItems,
          queues: { verifications: 23, moderation: 9, churches: 4 },
        };
      }
      const data = await api().admin.dashboard();
      return {
        kpis: {
          activeMembers30d: data.kpis.activeMembers30d ?? 0,
          newRegistrations30d: data.kpis.newRegistrations30d ?? 0,
          connectionsCreated30d: data.kpis.connectionsCreated30d ?? 0,
          verifiedLevel2Pct: data.kpis.verifiedLevel2Pct ?? 0,
          revenueDop30d: data.kpis.revenueDop30d ?? 0,
        },
        attention: data.attention ?? [],
        queues: data.queues ?? {},
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Portal de iglesias
// ---------------------------------------------------------------------------

function demoChurchMe(): ChurchPortalMe {
  return {
    church: { id: 'c-demo', name: demoChurch.name, status: 'APPROVED', denominationId: null },
    role: 'ADMIN',
    stats: { endorsedMembers: demoChurch.endorsedMembers, activeCodes: 12, pendingRequests: 3 },
  };
}

/**
 * La iglesia de quien entra al portal. Contra la API real, un 403 significa
 * «esta cuenta no está vinculada a ninguna iglesia»: la puerta del portal lo
 * usa para ofrecer el registro en vez de quedarse cargando.
 */
export function useChurchMe() {
  return useQuery<ChurchPortalMe>({
    queryKey: ['church', 'me'],
    queryFn: () => (isDemoMode() ? demoChurchMe() : api().church.me()),
    retry: false,
  });
}

export function useChurchEvents() {
  return useQuery<ChurchPortalEvent[]>({
    queryKey: ['church', 'events'],
    queryFn: async () => {
      if (isDemoMode()) {
        return demoEvents
          .filter((event) => event.churchName === demoChurch.name)
          .map((event) => ({
            id: event.id,
            title: event.title,
            type: event.type,
            status: 'PUBLISHED',
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            city: event.city,
            audience: event.audience ?? 'CONGREGATION',
            capacity: event.capacity,
            goingCount: event.goingCount,
            featured: false,
          }));
      }
      return api().church.events();
    },
  });
}

export function useCreateChurchEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEventInput & { submit: boolean }) => {
      if (isDemoMode()) return { id: `ev-${Date.now()}`, status: input.submit ? 'IN_REVIEW' : 'DRAFT' };
      return api().church.createEvent(input);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['church', 'events'] }),
  });
}

export function useSubmitChurchEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (isDemoMode()) return { status: 'IN_REVIEW' };
      return api().church.submitEvent(eventId);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['church', 'events'] }),
  });
}

export function useRegisterChurch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      city?: string;
      address?: string;
      contactName?: string;
      contactEmail?: string;
      denominationId?: string;
    }) => {
      if (isDemoMode()) return { id: 'c-demo' };
      return api().church.register(input);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['church'] }),
  });
}
