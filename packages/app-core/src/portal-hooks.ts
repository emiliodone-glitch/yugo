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
  CONVERSATION_QUESTIONS,
  SETTING_KEYS,
  type ProfileQuestion,
  DEFAULT_AFFINITY_WEIGHTS,
  demoAdminKpis,
  demoAttentionItems,
  demoChurch,
  demoCounselingRequests,
  type PortalCounselingRequest,
  demoDiscover,
  demoEvents,
  demoGroups,
  demoModerationQueue,
  demoPosts,
  demoVerificationCase,
  type AdminAuditRow,
  type AdminChurchRow,
  type AdminEventInReview,
  type AdminEventRow,
  type AdminGroupRow,
  type AdminMemberRow,
  type AdminPaymentRow,
  type AdminStaffRow,
  type AdminSubscriptionSummary,
  type AdminVerificationCase,
  type ChurchInvitationRow,
  type ChurchInviteResult,
  type ChurchMetrics,
  type ChurchOfficialGroup,
  type ChurchPortalEvent,
  type ChurchPortalMe,
  type ChurchPortalUser,
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
          queues: {
            pendingVerifications: 23,
            openReports: 9,
            heldMessages: 0,
            pendingChurches: 4,
            devotionalRunway: 14,
          },
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
      if (isDemoMode())
        return { id: `ev-${Date.now()}`, status: input.submit ? 'IN_REVIEW' : 'DRAFT' };
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

// ---------------------------------------------------------------------------
// Panel admin: colas y listados (RF-ADM-02..11)
// ---------------------------------------------------------------------------

/** «hace 2 h», «hace 3 días»: la edad de una cola se lee mejor así que como fecha. */
export function timeAgoLabel(iso: string): string {
  const minutes = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} días`;
}

const invalidateAdmin = (queryClient: ReturnType<typeof useQueryClient>, ...keys: string[]) =>
  keys.forEach((key) => void queryClient.invalidateQueries({ queryKey: ['admin', key] }));

export function useAdminMembers(query: string) {
  return useQuery<{ items: AdminMemberRow[]; total: number; page: number }>({
    queryKey: ['admin', 'members', query],
    queryFn: async () => {
      if (isDemoMode()) {
        const items: AdminMemberRow[] = [
          ...demoDiscover.map((p) => ({
            id: p.userId,
            email: `${p.displayName.toLowerCase().replace(/\s+/g, '.')}@ejemplo.do`,
            displayName: p.displayName,
            city: p.city,
            age: p.age,
            completeness: 90,
            level: p.badges.endorsedBy ? 3 : p.badges.identity ? 2 : 1,
            tier: null,
            reports: 0,
            sanctions: 0,
            status: 'ACTIVE',
            createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
            lastActiveAt: new Date().toISOString(),
          })),
          {
            id: 'u-emilio',
            email: 'emilio@ejemplo.do',
            displayName: 'Emilio Doñe',
            city: 'Santo Domingo',
            age: 34,
            completeness: 82,
            level: 2,
            tier: 'ORO' as const,
            reports: 0,
            sanctions: 0,
            status: 'ACTIVE',
            createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
          {
            id: 'u-carlos',
            email: 'carlos@ejemplo.do',
            displayName: 'Carlos Medina',
            city: 'Santiago',
            age: 41,
            completeness: 70,
            level: 1,
            tier: null,
            reports: 2,
            sanctions: 1,
            status: 'ACTIVE',
            createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
        ].filter((row) => row.displayName.toLowerCase().includes(query.toLowerCase()));
        return { items, total: items.length, page: 1 };
      }
      return api().admin.members(query || undefined);
    },
  });
}

export function useAdminMemberAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      action: 'WARN' | 'SUSPEND' | 'BAN' | 'REINSTATE';
      reason: string;
      days?: number;
    }) => {
      if (isDemoMode()) return { done: true };
      return api().admin.memberAction(input.id, input.action, input.reason, input.days);
    },
    onSuccess: () => invalidateAdmin(queryClient, 'members'),
  });
}

function demoVerificationQueue(): AdminVerificationCase[] {
  return [
    {
      id: 'ver-demo-1',
      userId: 'u-mariel',
      displayName: 'Mariel Peña',
      city: 'Santo Domingo',
      age: 28,
      birthDate: '1998-03-12',
      selfieUrl: null,
      photoUrl: null,
      similarity: demoVerificationCase.similarity,
      livenessPassed: demoVerificationCase.livenessPassed,
      priority: false,
      createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
      history: { reports: 0, sanctions: 0, since: '2026-08-20T00:00:00.000Z' },
    },
  ];
}

export function useAdminVerificationQueue() {
  return useQuery<AdminVerificationCase[]>({
    queryKey: ['admin', 'verifications'],
    queryFn: () => (isDemoMode() ? demoVerificationQueue() : api().admin.verificationQueue()),
  });
}

export function useDecideVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      decision: 'APPROVE' | 'REJECT' | 'ESCALATE';
      note?: string;
    }) => {
      if (isDemoMode()) return { done: true };
      return api().admin.decideVerification(input.id, input.decision, input.note);
    },
    onSuccess: () => invalidateAdmin(queryClient, 'verifications', 'dashboard'),
  });
}

/** Una fila de la cola de reportes, ya en palabras de quien modera. */
export interface ModerationQueueRow {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  type: string;
  reported: string;
  reason: string;
  evidence: string;
  ageLabel: string;
}

const TARGET_LABEL: Record<string, string> = {
  PROFILE: 'Perfil',
  MESSAGE: 'Mensaje',
  POST: 'Publicación',
  PHOTO: 'Foto',
  EVENT: 'Evento',
  GROUP: 'Grupo',
};

export function useModerationQueue(kind: 'REPORT' | 'APPEAL') {
  return useQuery<{ items: ModerationQueueRow[]; counts: Record<string, number> }>({
    queryKey: ['admin', 'moderation', kind],
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          items:
            kind === 'REPORT'
              ? demoModerationQueue.map((row) => ({ ...row, ageLabel: row.ageLabel }))
              : [],
          counts: { REPORT: demoModerationQueue.length, APPEAL: 2, AI_HELD: 0 },
        };
      }
      const data = await api().admin.moderationQueue(kind);
      return {
        counts: data.counts,
        items: data.items.map((item) => ({
          id: item.id,
          priority: (item.priority as ModerationQueueRow['priority']) ?? 'NORMAL',
          type:
            TARGET_LABEL[item.report?.targetType ?? item.targetType ?? ''] ??
            (item.kind === 'APPEAL' ? 'Apelación' : 'Reporte'),
          reported: item.report?.targetId ?? item.targetId ?? '—',
          reason: item.report?.details || item.report?.category || item.reason || item.kind,
          evidence: item.report?.targetType === 'PHOTO' ? '1 foto' : '—',
          ageLabel: timeAgoLabel(item.createdAt),
        })),
      };
    },
  });
}

export function useTakeNextCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (isDemoMode() ? { id: 'mod-demo' } : api().admin.takeNextCase()),
    onSuccess: () => invalidateAdmin(queryClient, 'moderation'),
  });
}

export function useDecideCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; decision: string; reason: string }) => {
      if (isDemoMode()) return { done: true };
      return api().admin.decideCase(input.id, input.decision, input.reason);
    },
    onSuccess: () => invalidateAdmin(queryClient, 'moderation', 'dashboard'),
  });
}

const DEMO_IN_REVIEW: AdminEventInReview[] = [
  {
    id: 'rev-1',
    title: 'Retiro de damas: Mujer virtuosa',
    startsAt: '2026-09-26T09:00:00.000Z',
    type: 'RETIRO',
    church: { name: 'Centro Cristiano Vida Nueva' },
  },
];

export function useAdminEventsInReview() {
  return useQuery<AdminEventInReview[]>({
    queryKey: ['admin', 'events-review'],
    queryFn: () => (isDemoMode() ? DEMO_IN_REVIEW : api().admin.eventsInReview()),
  });
}

export function useAdminPublishedEvents() {
  return useQuery<AdminEventRow[]>({
    queryKey: ['admin', 'events'],
    queryFn: async () => {
      if (isDemoMode()) {
        return demoEvents.map((event) => ({
          id: event.id,
          title: event.title,
          churchName: event.churchName,
          startsAt: event.startsAt,
          type: event.type,
          attendances: event.goingCount + event.interestedCount,
          featured: event.id === 'ev-vigilia',
        }));
      }
      return api().admin.publishedEvents();
    },
  });
}

export function useDecideEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; approve: boolean; note?: string }) => {
      if (isDemoMode()) return { done: true };
      return api().admin.decideEvent(input.id, input.approve, input.note);
    },
    onSuccess: () => {
      invalidateAdmin(queryClient, 'events-review', 'events', 'dashboard');
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useSetEventFeatured() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; featured: boolean }) => {
      if (isDemoMode()) return { done: true };
      return api().admin.setEventFeatured(input.id, input.featured);
    },
    onSuccess: () => {
      invalidateAdmin(queryClient, 'events');
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      void queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export function useAdminGroups() {
  return useQuery<AdminGroupRow[]>({
    queryKey: ['admin', 'groups'],
    queryFn: async () => {
      if (isDemoMode()) {
        return demoGroups.map((group) => ({
          id: group.id,
          name: group.name,
          category: group.category,
          type: group.type,
          status: 'ACTIVE' as const,
          memberCount: group.memberCount,
          postCount: group.postsToday ?? 0,
          isOfficial: group.isOfficial,
          churchName: group.churchName ?? null,
          city: group.city ?? null,
          createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        }));
      }
      return api().admin.allGroups();
    },
  });
}

export function useDecideGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; approve: boolean }) => {
      if (isDemoMode()) return { done: true };
      return api().admin.decideGroup(input.id, input.approve);
    },
    onSuccess: () => {
      invalidateAdmin(queryClient, 'groups', 'dashboard');
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

const DEMO_CHURCHES: AdminChurchRow[] = [
  {
    id: 'o1',
    name: 'Iglesia Río de Vida',
    denomination: 'Pentecostal',
    city: 'La Romana',
    contactName: 'Pastor J. Guzmán',
    contactEmail: null,
    status: 'PENDING',
    events: 0,
    users: 1,
    createdAt: '2026-09-01T10:00:00.000Z',
    approvedAt: null,
  },
  {
    id: 'o2',
    name: 'Ministerio Casa de Pan',
    denomination: 'Evangélica',
    city: 'Santo Domingo Norte',
    contactName: 'Pastora M. Cuevas',
    contactEmail: null,
    status: 'PENDING',
    events: 0,
    users: 1,
    createdAt: '2026-09-02T10:00:00.000Z',
    approvedAt: null,
  },
  {
    id: 'o3',
    name: 'Iglesia Buenas Nuevas',
    denomination: 'Bautista',
    city: 'San Cristóbal',
    contactName: 'Pastor E. Rosario',
    contactEmail: null,
    status: 'PENDING',
    events: 0,
    users: 1,
    createdAt: '2026-09-03T10:00:00.000Z',
    approvedAt: null,
  },
  {
    id: 'o4',
    name: 'Comunidad Cristo Vive',
    denomination: 'Iglesia de Dios',
    city: 'Higüey',
    contactName: 'Pastor F. Santana',
    contactEmail: null,
    status: 'PENDING',
    events: 0,
    users: 1,
    createdAt: '2026-09-04T10:00:00.000Z',
    approvedAt: null,
  },
  {
    id: 'o5',
    name: demoChurch.name,
    denomination: demoChurch.denomination,
    city: 'Santo Domingo Este',
    contactName: 'Pastor Luis Reyes',
    contactEmail: null,
    status: 'APPROVED',
    events: 3,
    users: 2,
    createdAt: '2026-06-01T10:00:00.000Z',
    approvedAt: '2026-06-03T10:00:00.000Z',
  },
];

export function useAdminChurches() {
  return useQuery<AdminChurchRow[]>({
    queryKey: ['admin', 'churches'],
    queryFn: () => (isDemoMode() ? DEMO_CHURCHES : api().admin.allChurches()),
  });
}

export function useDecideChurch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; approve: boolean; note?: string }) => {
      if (isDemoMode()) return { done: true };
      return api().admin.decideChurch(input.id, input.approve, input.note);
    },
    onSuccess: () => invalidateAdmin(queryClient, 'churches', 'dashboard'),
  });
}

export function useAdminSubscriptionSummary() {
  return useQuery<AdminSubscriptionSummary>({
    queryKey: ['admin', 'subscriptions-summary'],
    queryFn: async () =>
      isDemoMode()
        ? { plus: 228, oro: 41, revenueMonthDop: demoAdminKpis.plusRevenueDop, refundsPending: 1 }
        : api().admin.subscriptionSummary(),
  });
}

const DEMO_PAYMENTS: AdminPaymentRow[] = [
  {
    id: 'p1',
    email: 'emilio@ejemplo.do',
    tier: 'ORO',
    plan: 'ANNUAL',
    provider: 'STRIPE',
    amount: 6990,
    currency: 'DOP',
    status: 'SUCCEEDED',
    firstApprovalGiven: false,
    createdAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'p2',
    email: 'mariel@ejemplo.do',
    tier: 'PLUS',
    plan: 'MONTHLY',
    provider: 'APP_STORE',
    amount: 6.99,
    currency: 'USD',
    status: 'SUCCEEDED',
    firstApprovalGiven: false,
    createdAt: '2026-09-02T12:00:00.000Z',
  },
  {
    id: 'p3',
    email: 'carlos@ejemplo.do',
    tier: 'PLUS',
    plan: 'ANNUAL',
    provider: 'AZUL',
    amount: 2990,
    currency: 'DOP',
    status: 'REFUND_REQUESTED',
    firstApprovalGiven: false,
    createdAt: '2026-09-03T12:00:00.000Z',
  },
  {
    id: 'p4',
    email: 'ana@ejemplo.do',
    tier: 'ORO',
    plan: 'MONTHLY',
    provider: 'GOOGLE_PLAY',
    amount: 14.99,
    currency: 'USD',
    status: 'SUCCEEDED',
    firstApprovalGiven: false,
    createdAt: '2026-09-04T12:00:00.000Z',
  },
];

export function useAdminPayments() {
  return useQuery<AdminPaymentRow[]>({
    queryKey: ['admin', 'payments'],
    queryFn: () => (isDemoMode() ? DEMO_PAYMENTS : api().admin.payments()),
  });
}

export function useApproveRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      isDemoMode() ? { status: 'awaiting_second_approval' } : api().admin.approveRefund(id),
    onSuccess: () => invalidateAdmin(queryClient, 'payments', 'subscriptions-summary'),
  });
}

export interface AdminSettingsData {
  weights: Record<string, number>;
  limits: Record<string, unknown>;
  thresholds: Record<string, number>;
  covenantVersion: string;
  /** Catálogo de preguntas de perfil vigente (RF-PER-09). */
  profileQuestions: ProfileQuestion[];
}

let demoProfileQuestions: ProfileQuestion[] = [...CONVERSATION_QUESTIONS];

export function useAdminSettings() {
  return useQuery<AdminSettingsData>({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          weights: { ...DEFAULT_AFFINITY_WEIGHTS },
          limits: {},
          thresholds: { holdAbove: 0.7, rejectAbove: 0.92 },
          covenantVersion: '1.0',
          profileQuestions: demoProfileQuestions,
        };
      }
      const data = await api().admin.settings();
      return {
        weights: data.weights,
        limits: data.limits,
        thresholds: data.thresholds,
        covenantVersion: data.covenantVersion,
        profileQuestions: data.profileQuestions ?? [...CONVERSATION_QUESTIONS],
      };
    },
  });
}

/** Guarda el catálogo completo de preguntas de perfil (RF-PER-09, RF-ADM-08). */
export function useUpdateProfileQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questions: ProfileQuestion[]) => {
      if (isDemoMode()) {
        demoProfileQuestions = questions;
        return { saved: true };
      }
      return api().admin.updateSetting(SETTING_KEYS.PROFILE_QUESTIONS, questions);
    },
    onSuccess: () => {
      invalidateAdmin(queryClient, 'settings');
      queryClient.invalidateQueries({ queryKey: ['profile-questions'] });
    },
  });
}

export function useUpdateWeights() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (weights: Record<string, number>) =>
      isDemoMode() ? { saved: true } : api().admin.updateWeights(weights),
    onSuccess: () => invalidateAdmin(queryClient, 'settings'),
  });
}

export interface DenominationMatrixData {
  denominations: Array<{ id: string; name: string; slug: string }>;
  affinities: Array<{ aId: string; bId: string; value: number }>;
}

const DEMO_MATRIX: DenominationMatrixData = (() => {
  const names = ['Evangélica', 'Bautista', 'Pentecostal', 'Adventista', 'Católica'];
  const values = [
    [100, 80, 75, 50, 40],
    [80, 100, 65, 50, 40],
    [75, 65, 100, 45, 35],
    [50, 50, 45, 100, 30],
    [40, 40, 35, 30, 100],
  ];
  const denominations = names.map((name, index) => ({
    id: `d${index}`,
    name,
    slug: name.toLowerCase(),
  }));
  const affinities: DenominationMatrixData['affinities'] = [];
  for (let a = 0; a < names.length; a += 1) {
    for (let b = a + 1; b < names.length; b += 1) {
      affinities.push({ aId: `d${a}`, bId: `d${b}`, value: values[a][b] });
    }
  }
  return { denominations, affinities };
})();

export function useDenominationMatrix() {
  return useQuery<DenominationMatrixData>({
    queryKey: ['admin', 'matrix'],
    queryFn: () => (isDemoMode() ? DEMO_MATRIX : api().admin.denominationMatrix()),
  });
}

export function useUpdateMatrixCell() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { aId: string; bId: string; value: number }) =>
      isDemoMode()
        ? { saved: true }
        : api().admin.updateMatrixCell(input.aId, input.bId, input.value),
    onSuccess: () => invalidateAdmin(queryClient, 'matrix'),
  });
}

const DEMO_AUDIT: AdminAuditRow[] = [
  {
    id: 'a1',
    actorId: 'admin@yugo.do',
    action: 'SETTINGS_AFFINITY_WEIGHTS',
    targetType: 'SETTING',
    targetId: 'affinity.weights',
    createdAt: '2026-08-29T18:02:00.000Z',
  },
  {
    id: 'a2',
    actorId: 'mod1@yugo.do',
    action: 'VERIFICATION_APPROVE',
    targetType: 'VERIFICATION',
    targetId: 'Mariel Peña',
    createdAt: '2026-08-29T17:40:00.000Z',
  },
  {
    id: 'a3',
    actorId: 'mod2@yugo.do',
    action: 'CASE_SUSPEND_7',
    targetType: 'USER',
    targetId: '@carlos.mv',
    createdAt: '2026-08-29T16:15:00.000Z',
  },
  {
    id: 'a4',
    actorId: 'gestor@yugo.do',
    action: 'CHURCH_APPROVED',
    targetType: 'CHURCH',
    targetId: 'Iglesia Río de Vida',
    createdAt: '2026-08-29T14:03:00.000Z',
  },
  {
    id: 'a5',
    actorId: 'finanzas@yugo.do',
    action: 'REFUND_FIRST_APPROVAL',
    targetType: 'PAYMENT',
    targetId: 'Pago p3',
    createdAt: '2026-08-28T22:30:00.000Z',
  },
];

export function useAuditLog(action?: string) {
  return useQuery<AdminAuditRow[]>({
    queryKey: ['admin', 'audit', action ?? ''],
    queryFn: () =>
      isDemoMode()
        ? DEMO_AUDIT.filter((row) => !action || row.action.includes(action.toUpperCase()))
        : api().admin.auditLog(action ? { action: action.toUpperCase() } : undefined),
  });
}

const DEMO_STAFF: AdminStaffRow[] = [
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `m${i}`,
    email: `mod${i + 1}@yugo.do`,
    role: 'MODERATOR',
    twoFactorEnabled: true,
    lastActiveAt: new Date().toISOString(),
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `g${i}`,
    email: `gestor${i + 1}@yugo.do`,
    role: 'COMMUNITY_MANAGER',
    twoFactorEnabled: true,
    lastActiveAt: new Date().toISOString(),
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `s${i}`,
    email: `soporte${i + 1}@yugo.do`,
    role: 'SUPPORT',
    twoFactorEnabled: true,
    lastActiveAt: new Date().toISOString(),
  })),
  {
    id: 'f1',
    email: 'finanzas@yugo.do',
    role: 'FINANCE',
    twoFactorEnabled: true,
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: 'sa',
    email: 'admin@yugo.do',
    role: 'SUPERADMIN',
    twoFactorEnabled: true,
    lastActiveAt: new Date().toISOString(),
  },
];

export function useAdminStaff() {
  return useQuery<AdminStaffRow[]>({
    queryKey: ['admin', 'staff'],
    queryFn: () => (isDemoMode() ? DEMO_STAFF : api().admin.staff()),
  });
}

// ---------------------------------------------------------------------------
// Portal de iglesias: códigos, métricas, grupo, usuarios (RF-IGL-02/04/05/06)
// ---------------------------------------------------------------------------

/**
 * Estado de la demo del portal, a nivel de módulo: generar códigos o resolver
 * una solicitud se nota en la pantalla sin servidor, igual que en la API.
 */
const churchDemo = {
  activeCodes: demoChurch.activeCodes,
  generated: 0,
  requests: demoChurch.endorsementRequests.map((request) => ({
    id: request.id,
    name: request.name,
    attendsSince: request.attendsSince,
    leaderName: request.leader,
  })),
};

export interface ChurchCode {
  id: string;
  code: string;
  expiresAt: string;
  usedAt: string | null;
}

export function useChurchCodes() {
  return useQuery<ChurchCode[]>({
    queryKey: ['church', 'codes'],
    queryFn: async () => {
      if (isDemoMode()) {
        return Array.from({ length: churchDemo.activeCodes }, (_, i) => ({
          id: `code-${i}`,
          code: `MONT-${(1000 + i).toString(16).toUpperCase()}`,
          expiresAt: new Date(Date.now() + 20 * 86400000).toISOString(),
          usedAt: null,
        }));
      }
      return api().church.codes();
    },
  });
}

export function useGenerateChurchCodes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (count: number) => {
      if (isDemoMode()) {
        churchDemo.activeCodes += count;
        churchDemo.generated += count;
        return [];
      }
      return api().church.generateCodes(count);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['church', 'codes'] });
      void queryClient.invalidateQueries({ queryKey: ['church', 'me'] });
      void queryClient.invalidateQueries({ queryKey: ['church', 'metrics'] });
    },
  });
}

export interface EndorsementRequestRow {
  id: string;
  name: string;
  attendsSince: number | null;
  leaderName: string | null;
}

export function useEndorsementRequests() {
  return useQuery<EndorsementRequestRow[]>({
    queryKey: ['church', 'requests'],
    queryFn: () => (isDemoMode() ? [...churchDemo.requests] : api().church.endorsementRequests()),
  });
}

export function useResolveEndorsement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; confirm: boolean }) => {
      if (isDemoMode()) {
        churchDemo.requests = churchDemo.requests.filter((request) => request.id !== input.id);
        return { resolved: true };
      }
      return api().church.resolveEndorsement(input.id, input.confirm);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['church', 'requests'] });
      void queryClient.invalidateQueries({ queryKey: ['church', 'me'] });
    },
  });
}

export function useChurchMetrics() {
  return useQuery<ChurchMetrics>({
    queryKey: ['church', 'metrics'],
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          events: 3,
          going: 311,
          checkIns: 187,
          groupMembers: 142,
          endorsed: demoChurch.endorsedMembers,
          endorsedLast30: 12,
          codesIssued: 60,
          codesUsed: 41,
          weeklyReach: [30, 44, 38, 52, 61, 58, 72, 85],
          codeRedemptionRate: 68,
          checkInRate: 60,
        };
      }
      return api().church.metrics();
    },
  });
}

export function useChurchOfficialGroup() {
  return useQuery<ChurchOfficialGroup | null>({
    queryKey: ['church', 'group'],
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          id: 'g-ja-sde',
          name: 'Jóvenes adultos SDE',
          status: 'ACTIVE',
          memberCount: 142,
          posts: demoPosts.map((post) => ({
            id: post.id,
            author: post.author.displayName,
            body: post.body,
            isPrayerRequest: post.isPrayerRequest,
            reactions: post.amenCount + post.prayingCount,
            comments: 0,
            createdAt: post.createdAt,
          })),
        };
      }
      // Sin grupo la API responde 200 con cuerpo vacío; para React Query
      // `undefined` es un error, así que se vuelve `null` explícito.
      return (await api().church.officialGroup()) ?? null;
    },
  });
}

const DEMO_PORTAL_USERS: ChurchPortalUser[] = [
  {
    id: 'cu1',
    userId: 'u-luis',
    email: 'luis@montedesion.do',
    name: 'Pastor Luis Reyes',
    role: 'ADMIN',
    isMe: true,
  },
  {
    id: 'cu2',
    userId: 'u-keila',
    email: 'keila@montedesion.do',
    name: 'Keila Torres',
    role: 'EVENT_EDITOR',
    isMe: false,
  },
];

export function useChurchUsers() {
  return useQuery<ChurchPortalUser[]>({
    queryKey: ['church', 'users'],
    queryFn: () => (isDemoMode() ? DEMO_PORTAL_USERS : api().church.users()),
  });
}

export function useInviteChurchUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      role: 'ADMIN' | 'EVENT_EDITOR';
    }): Promise<ChurchInviteResult> =>
      isDemoMode()
        ? {
            id: `cu-${Date.now()}`,
            role: input.role,
            invited: true,
            inviteUrl: `https://yugo.do/iglesias/invitacion?token=demo-${Date.now()}`,
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          }
        : api().church.inviteUser(input.email, input.role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['church', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['church', 'invitations'] });
    },
  });
}

/** Invitaciones por enlace pendientes (RF-IGL-02). */
export function useChurchInvitations() {
  return useQuery<ChurchInvitationRow[]>({
    queryKey: ['church', 'invitations'],
    queryFn: () => (isDemoMode() ? [] : api().church.invitations()),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      isDemoMode() ? { revoked: true } : api().church.revokeInvitation(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['church', 'invitations'] }),
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) =>
      isDemoMode()
        ? { churchId: 'c-demo', churchName: demoChurch.name, role: 'EVENT_EDITOR' }
        : api().church.acceptInvitation(token),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['church'] }),
  });
}

/** QR de entrada de un evento publicado, para imprimir (RF-EVE-06). */
export function useEventQr(eventId: string) {
  return useQuery({
    queryKey: ['church', 'event-qr', eventId],
    enabled: !!eventId,
    queryFn: async () =>
      isDemoMode()
        ? { token: 'demo', url: `https://yugo.do/e/${eventId}?ci=demo`, title: 'Evento' }
        : api().church.eventQr(eventId),
  });
}

export function useRemoveChurchUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (churchUserId: string) =>
      isDemoMode() ? { removed: true } : api().church.removeUser(churchUserId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['church', 'users'] }),
  });
}

// ---------------------------------------------------------------------------
// Consejería prematrimonial pedida por parejas (RF-REL-05)
// ---------------------------------------------------------------------------

let counselingDemo: PortalCounselingRequest[] = demoCounselingRequests.map((row) => ({ ...row }));

export function useCounselingRequests() {
  return useQuery<PortalCounselingRequest[]>({
    queryKey: ['church', 'counseling'],
    queryFn: () =>
      isDemoMode() ? counselingDemo.map((row) => ({ ...row })) : api().church.counselingRequests(),
  });
}

export function useRespondCounselingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; accept: boolean; message?: string }) => {
      if (isDemoMode()) {
        counselingDemo = counselingDemo.map((row) =>
          row.id === input.id
            ? {
                ...row,
                status: input.accept ? 'ACCEPTED' : 'DECLINED',
                respondedAt: new Date().toISOString(),
                responseNote: input.message?.trim() || null,
              }
            : row,
        );
        return { id: input.id, status: input.accept ? 'ACCEPTED' : 'DECLINED' };
      }
      return api().church.respondCounseling(input.id, {
        accept: input.accept,
        message: input.message,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['church', 'counseling'] });
    },
  });
}
