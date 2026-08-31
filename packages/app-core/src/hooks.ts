/**
 * One hook per screen. Each resolves from the live API when the app runs
 * against a backend, and from the shared fixtures in demo mode — so every
 * screen has a single code path and the demo stays a faithful preview.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  demoActivities,
  demoConnections,
  demoCurrentUser,
  demoDailySummary,
  demoDiscover,
  demoEvents,
  demoGroups,
  demoIcebreakers,
  demoNotifications,
  demoPosts,
  demoReports,
  demoAccompaniedBonds,
  demoMentorProfile,
  demoSinglesMinistry,
  DEFAULT_PRICES,
  LIMITS,
  NOTIFICATION_CATEGORIES,
  SAFETY_TIPS_V1,
  isExclusive,
  nextStage,
  type ChatMessage,
  type AccompaniedBond,
  type MentorProfile,
  type SinglesMinistry,
  type RelationshipStage,
  type RelationshipState,
  type DiscoverFilters,
  type ConnectionSummary,
  type EventSummary,
  type GroupSummary,
  type NotificationItem,
  type ProfileCard,
} from '@yugo/shared';
import { useEffect, useRef, useState } from 'react';
import { api, isDemoMode } from './runtime';
import { emitTyping, joinConversation } from './realtime';
import { demoAccompanimentFor, NEW_RELATIONSHIP, useDemoStore } from './demo-store';

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          demo: true as const,
          displayName: demoCurrentUser.displayName,
          tier: demoCurrentUser.subscription.tier,
        };
      }
      const me = await api().auth.me();
      return {
        demo: false as const,
        displayName: me.profile?.displayName ?? 'Miembro',
        tier: me.subscriptions[0]?.tier ?? null,
        me,
      };
    },
  });
}

/** Id of the signed-in member — decides which chat bubbles are "mine". */
export function useCurrentUserId(): string | undefined {
  const { data } = useSession();
  if (!data) return undefined;
  return data.demo ? demoCurrentUser.userId : data.me.id;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ identifier, password }: { identifier: string; password: string }) =>
      api().auth.login(identifier, password),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api().auth.signOut(),
    onSuccess: () => queryClient.clear(),
  });
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export function useHomeSummary() {
  return useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          summary: demoDailySummary,
          featuredEvent: demoEvents[0] as EventSummary | undefined,
          suggestions: demoDiscover.slice(0, 4),
          banners: [] as Array<{ id: string; title: string; body: string; tone: string }>,
        };
      }
      const [discover, events, banners] = await Promise.all([
        api().discover.daily(),
        api().events.featured(),
        api().catalog.banners().catch(() => []),
      ]);
      const whoMarked = await api().interests.whoMarkedMe();
      return {
        summary: {
          interestsUsedToday: discover.interests.used,
          interestsLimit: discover.interests.limit,
          newConnections: 0,
          whoMarkedInterestCount: whoMarked.count,
          discoverRemaining: discover.total,
          discoverTotal: discover.total,
        },
        featuredEvent: events[0],
        suggestions: discover.items.slice(0, 4),
        banners,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Discover
// ---------------------------------------------------------------------------

export function useDiscover(filters: DiscoverFilters = {}) {
  const passed = useDemoStore((s) => s.passedProfiles);
  return useQuery({
    // The filters are part of the key: changing them regenerates the list
    // instead of serving yesterday's answer to today's question.
    queryKey: ['discover', filters],
    queryFn: async (): Promise<{ items: ProfileCard[]; used: number; limit: number | null }> => {
      if (isDemoMode()) {
        const items = demoDiscover
          .filter((p) => !passed[p.userId])
          .filter((p) => !filters.endorsedOnly || !!p.badges.endorsedBy);
        return {
          items,
          used: demoDailySummary.interestsUsedToday,
          limit: demoDailySummary.interestsLimit,
        };
      }
      const response = await api().discover.daily(filters);
      return {
        items: response.items,
        used: response.interests.used,
        limit: response.interests.limit,
      };
    },
  });
}

export function useProfileCard(userId: string) {
  return useQuery({
    queryKey: ['profile-card', userId],
    queryFn: async () => {
      if (isDemoMode()) return demoDiscover.find((p) => p.userId === userId) ?? null;
      return api().discover.profile(userId);
    },
  });
}

export function useMarkInterest() {
  const queryClient = useQueryClient();
  const markDemo = useDemoStore((s) => s.markInterest);
  return useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message?: string }) => {
      if (isDemoMode()) {
        const result = markDemo(userId);
        if (result === 'limit') throw new Error('daily_interests_used');
        return { match: null, remaining: null };
      }
      return api().interests.mark(userId, message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discover'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

export function usePassProfile() {
  const queryClient = useQueryClient();
  const passDemo = useDemoStore((s) => s.passProfile);
  return useMutation({
    mutationFn: async (userId: string) => {
      if (isDemoMode()) {
        passDemo(userId);
        return { id: 'demo' };
      }
      return api().interests.pass(userId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discover'] }),
  });
}

export function useSaveProfile() {
  const saveDemo = useDemoStore((s) => s.saveProfile);
  return useMutation({
    mutationFn: async (userId: string) => {
      if (isDemoMode()) {
        saveDemo(userId);
        return {};
      }
      return api().interests.save(userId);
    },
  });
}

export function useBoostStatus() {
  const activeUntil = useDemoStore((s) => s.boostActiveUntil);
  const usedThisWeek = useDemoStore((s) => s.boostUsedThisWeek);
  return useQuery({
    queryKey: ['boost', activeUntil, usedThisWeek],
    queryFn: async () => {
      if (isDemoMode()) {
        const allowance = LIMITS.FEATURED_PER_WEEK_ORO;
        return {
          tier: 'ORO' as const,
          allowancePerWeek: allowance,
          usedThisWeek,
          remaining: Math.max(0, allowance - usedThisWeek),
          activeUntil,
        };
      }
      return api().discover.boostStatus();
    },
  });
}

export function useActivateBoost() {
  const queryClient = useQueryClient();
  const activateDemo = useDemoStore((s) => s.activateBoost);
  return useMutation({
    mutationFn: async () => {
      if (isDemoMode()) {
        return { featuredUntil: activateDemo(), remaining: 1 };
      }
      return api().discover.activateBoost();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boost'] }),
  });
}

export function useWhoMarkedMe() {
  return useQuery({
    queryKey: ['who-marked-me'],
    queryFn: async () => {
      if (isDemoMode()) {
        const paid = demoCurrentUser.subscription.tier !== null;
        return {
          count: demoDailySummary.whoMarkedInterestCount,
          profiles: paid
            ? demoDiscover.slice(0, 4).map((p) => ({
                userId: p.userId,
                displayName: p.displayName,
                denomination: p.denomination,
                city: p.city,
                message: null,
              }))
            : null,
        };
      }
      return api().interests.whoMarkedMe();
    },
  });
}

export function useSavedProfiles() {
  const saved = useDemoStore((s) => s.savedProfiles);
  return useQuery({
    queryKey: ['saved', Object.keys(saved).join(',')],
    queryFn: async (): Promise<ProfileCard[]> => {
      if (isDemoMode()) return demoDiscover.filter((p) => saved[p.userId]);
      const rows = await api().interests.saved();
      const cards = await Promise.all(
        rows.map((row) => api().discover.profile(row.toUserId).catch(() => null)),
      );
      return cards.filter((card): card is ProfileCard => card !== null);
    },
  });
}

// ---------------------------------------------------------------------------
// Connections & chat
// ---------------------------------------------------------------------------

export function useConnections() {
  // Read the demo relationships here so the list and the conversation always
  // agree about a bond's stage, instead of the fixture going stale the moment
  // someone accepts a proposal.
  const demoRelationships = useDemoStore((s) => s.relationships);
  return useQuery({
    queryKey: ['connections', isDemoMode() ? demoRelationships : null],
    queryFn: async (): Promise<Array<ConnectionSummary & { conversationId?: string }>> => {
      if (isDemoMode()) {
        return demoConnections.map((c) => {
          const bond = demoRelationships[c.matchId] ?? NEW_RELATIONSHIP;
          return {
            ...c,
            conversationId: c.matchId,
            stage: bond.stage,
            stageProposalPending: !!bond.proposal && !bond.proposal.byMe,
          };
        });
      }
      return api().connections.list();
    },
  });
}

export function useConversation(conversationId: string) {
  const demoMessages = useDemoStore((s) => s.messages[conversationId] ?? []);
  return useQuery({
    queryKey: ['messages', conversationId, isDemoMode() ? demoMessages.length : 0],
    queryFn: async (): Promise<{ messages: ChatMessage[]; icebreakers: string[] }> => {
      if (isDemoMode()) {
        return {
          messages: demoMessages,
          icebreakers: demoIcebreakers[conversationId] ?? [
            '¿Qué es lo que más agradeces a Dios este año?',
            '¿Cuál es tu plan perfecto para un sábado libre?',
            '¿Qué canción no falta en tu playlist de adoración?',
          ],
        };
      }
      const [messages, icebreakers] = await Promise.all([
        api().connections.messages(conversationId),
        api().connections.icebreakers(conversationId).catch(() => []),
      ]);
      return { messages, icebreakers };
    },
  });
}

/**
 * RF-CON-03: live chat. Subscribes to the conversation room and keeps the
 * message list fresh without polling, exposes whether the other person is
 * writing, and reports when they have read what we sent.
 *
 * Everything degrades quietly: in demo mode, or with the socket down, the
 * screen still works from the HTTP fetch.
 */
export function useConversationRealtime(conversationId: string, currentUserId?: string) {
  const queryClient = useQueryClient();
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [theyReadAt, setTheyReadAt] = useState<string | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId || isDemoMode()) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void joinConversation(conversationId, {
      onMessage: () => {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['connections'] });
      },
      onRead: (readerId) => {
        // Our own read receipt bouncing back is not news.
        if (readerId !== currentUserId) setTheyReadAt(new Date().toISOString());
      },
      onTyping: (userId, typing) => {
        if (userId === currentUserId) return;
        setOtherIsTyping(typing);
        // A "stopped typing" event can be lost; without this the indicator
        // would stay on screen forever.
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        if (typing) {
          typingTimeout.current = setTimeout(() => setOtherIsTyping(false), 6000);
        }
      },
    }).then((dispose) => {
      if (cancelled) dispose();
      else cleanup = dispose;
    });

    return () => {
      cancelled = true;
      cleanup?.();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [conversationId, currentUserId, queryClient]);

  /** Call as the member types; throttled so it is one event per second. */
  const lastSent = useRef(0);
  const notifyTyping = (typing: boolean) => {
    if (isDemoMode()) return;
    const now = Date.now();
    if (typing && now - lastSent.current < 1000) return;
    lastSent.current = now;
    emitTyping(conversationId, typing);
  };

  return { otherIsTyping, theyReadAt, notifyTyping };
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const sendDemo = useDemoStore((s) => s.sendMessage);
  return useMutation({
    mutationFn: async (body: string) => {
      if (isDemoMode()) return sendDemo(conversationId, body);
      return api().connections.send(conversationId, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', conversationId] }),
  });
}

export function useInviteToEvent(conversationId: string) {
  const queryClient = useQueryClient();
  const sendDemo = useDemoStore((s) => s.sendMessage);
  return useMutation({
    mutationFn: async (event: { id: string; title: string }) => {
      if (isDemoMode()) {
        return { message: sendDemo(conversationId, `¿Vamos juntos? "${event.title}"`) };
      }
      return api().connections.inviteToEvent(conversationId, event.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', conversationId] }),
  });
}

export function useReport() {
  return useMutation({
    mutationFn: async (input: {
      targetType: 'PROFILE' | 'MESSAGE' | 'POST' | 'EVENT' | 'GROUP';
      targetId: string;
      category: 'INAPPROPRIATE' | 'SCAM' | 'FAKE_IDENTITY' | 'HARASSMENT' | 'MISLEADING' | 'UNDERAGE';
      details?: string;
    }) => {
      if (isDemoMode()) return { id: 'demo-report' };
      return api().connections.report(input);
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (isDemoMode()) return { blocked: true };
      return api().connections.block(userId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] }),
  });
}

export function useDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string) => {
      if (isDemoMode()) return { ended: true };
      return api().connections.disconnect(matchId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] }),
  });
}

// ---------------------------------------------------------------------------
// Etapas del vínculo
// ---------------------------------------------------------------------------

/**
 * The stage of one bond, plus any proposal waiting for an answer.
 *
 * Reads the demo store reactively rather than through the query cache: a
 * proposal is the kind of thing the person expects to see change the instant
 * they tap, not after a refetch.
 */
export function useRelationship(matchId: string, otherName = 'tu conexión') {
  const demo = useDemoStore((s) => s.relationships[matchId]) ?? NEW_RELATIONSHIP;
  const live = useQuery({
    queryKey: ['relationship', matchId],
    enabled: !isDemoMode() && !!matchId,
    queryFn: () => api().connections.stage(matchId),
  });

  if (!isDemoMode()) return live;

  const state: RelationshipState = {
    ...demo,
    nextStage: nextStage(demo.stage),
    isExclusive: isExclusive(demo.stage),
    otherName,
  };
  return { ...live, data: state, isLoading: false, isError: false } as typeof live;
}

export function useProposeStage(matchId: string) {
  const queryClient = useQueryClient();
  const proposeDemo = useDemoStore((s) => s.proposeStage);
  return useMutation({
    mutationFn: async (stage: RelationshipStage) => {
      if (isDemoMode()) {
        if (proposeDemo(matchId, stage) === 'invalid') throw new Error('cannot_skip_stages');
        return { proposed: stage };
      }
      return api().connections.proposeStage(matchId, stage);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['relationship', matchId] }),
  });
}

/**
 * Accepting or declining a proposal. Both invalidate Descubrir too: declaring
 * noviazgo takes the couple out of everyone's list, including their own.
 */
export function useRespondToStage(matchId: string) {
  const queryClient = useQueryClient();
  const respondDemo = useDemoStore((s) => s.respondToStage);
  return useMutation({
    mutationFn: async (accept: boolean) => {
      if (isDemoMode()) {
        respondDemo(matchId, accept);
        return { accepted: accept };
      }
      return accept
        ? api().connections.acceptStage(matchId)
        : api().connections.declineStage(matchId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['relationship', matchId] });
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      void queryClient.invalidateQueries({ queryKey: ['discover'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async (): Promise<{ mine: GroupSummary[]; suggested: GroupSummary[] }> => {
      if (isDemoMode()) {
        return {
          mine: demoGroups.filter((g) => g.joined),
          suggested: demoGroups.filter((g) => !g.joined),
        };
      }
      const [mine, suggested] = await Promise.all([
        api().community.myGroups(),
        api().community.suggested(),
      ]);
      return { mine, suggested };
    },
  });
}

export function useGroupDetail(groupId: string) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      if (isDemoMode()) {
        const group = demoGroups.find((g) => g.id === groupId);
        if (!group) return null;
        return {
          ...group,
          description: `Grupo de ${group.name} en Yugo.`,
          myRole: group.joined ? ('MEMBER' as const) : undefined,
          activities: demoActivities.filter((a) => a.groupId === groupId),
          posts: demoPosts
            .filter((p) => p.groupId === groupId)
            .map((p) => ({ ...p, commentCount: 0 })),
        };
      }
      return api().community.detail(groupId);
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, message }: { groupId: string; message?: string }) => {
      if (isDemoMode()) return { joined: true, pending: false };
      return api().community.join(groupId, message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useCreatePost(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, isPrayerRequest }: { body: string; isPrayerRequest: boolean }) => {
      if (isDemoMode()) {
        const held = /\b(dinero|vendo|promoción|whatsapp)\b/i.test(body);
        return { id: `demo-${Date.now()}`, moderationStatus: held ? 'HELD' : 'APPROVED' };
      }
      return api().community.createPost({ groupId, body, isPrayerRequest });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', groupId] }),
  });
}

export function useReactToPost() {
  const togglePraying = useDemoStore((s) => s.togglePraying);
  const toggleAmen = useDemoStore((s) => s.toggleAmen);
  return useMutation({
    mutationFn: async ({ postId, type }: { postId: string; type: 'AMEN' | 'PRAYING' | 'LIKE' }) => {
      if (isDemoMode()) {
        if (type === 'PRAYING') togglePraying(postId);
        else toggleAmen(postId);
        return { reacted: true };
      }
      return api().community.react(postId, type);
    },
  });
}

export function useJoinRequests(groupId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['join-requests', groupId],
    enabled,
    queryFn: async () => {
      if (isDemoMode()) {
        return [
          {
            id: 'jr-1',
            userId: 'u-raul',
            displayName: 'Raúl Féliz',
            city: 'Santo Domingo',
            verificationLevel: 2,
            message: 'Toco bajo en mi congregación, me gustaría aportar.',
            createdAt: new Date().toISOString(),
          },
        ];
      }
      return api().community.joinRequests(groupId);
    },
  });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async (): Promise<EventSummary[]> => {
      if (isDemoMode()) return demoEvents;
      return api().events.agenda();
    },
  });
}

export function useEventDetail(eventId: string) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async (): Promise<EventSummary | null> => {
      if (isDemoMode()) return demoEvents.find((e) => e.id === eventId) ?? null;
      const events = await api().events.agenda();
      return events.find((e) => e.id === eventId) ?? null;
    },
  });
}

export function useSetAttendance() {
  const queryClient = useQueryClient();
  const setDemo = useDemoStore((s) => s.setEventStatus);
  return useMutation({
    mutationFn: async ({
      eventId,
      status,
    }: {
      eventId: string;
      status: 'GOING' | 'INTERESTED' | null;
    }) => {
      if (isDemoMode()) {
        // Devuelve lo que realmente quedó, no lo que se pidió: un encuentro
        // lleno convierte «Asistiré» en lista de espera.
        return { status: setDemo(eventId, status ?? undefined) ?? null };
      }
      return api().events.setAttendance(eventId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event'] });
    },
  });
}

/** RF-EVE-08: direct .ics link the browser downloads. */
export function calendarUrl(eventId: string): string {
  return isDemoMode() ? '#' : api().events.calendarUrl(eventId);
}

// ---------------------------------------------------------------------------
// Profile, subscription, notifications, privacy
// ---------------------------------------------------------------------------

export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      if (isDemoMode()) return null;
      return api().profiles.mine();
    },
    enabled: !isDemoMode(),
  });
}

/**
 * RF-PER-02: the member's own photos, with their moderation state. A photo is
 * only visible to other people once it is APPROVED, so the manager has to show
 * PENDING and REJECTED explicitly instead of pretending everything is live.
 */
/**
 * RF-DES-01: prueba de valor durante el registro. Ocho pasos de formulario
 * antes de ver una sola señal de que vale la pena es mucho pedir de fe.
 */
export function useReach(denomination?: string, province?: string) {
  return useQuery({
    queryKey: ['reach', denomination, province],
    enabled: !!denomination,
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          approximate: 120,
          hasPeople: true,
          denomination: denomination ?? null,
          province: province ?? null,
        };
      }
      return api().catalog.reach(denomination, province);
    },
  });
}

export function useMyPhotos() {
  return useQuery({
    queryKey: ['my-photos'],
    queryFn: async () => {
      if (isDemoMode()) {
        return [] as Array<{ id: string; url: string; position: number; moderationStatus: string }>;
      }
      return api().photos.mine();
    },
  });
}

/**
 * Uploads one photo: asks for a signed URL, PUTs the bytes straight to
 * storage, then registers it so it enters the moderation queue. The bytes
 * never travel through the API.
 */
export function useUploadPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      blob,
      contentType,
      position,
    }: {
      blob: Blob;
      contentType: string;
      position: number;
    }) => {
      if (isDemoMode()) {
        return { id: `demo-${Date.now()}`, moderationStatus: 'PENDING' };
      }
      const { key, uploadUrl } = await api().photos.signUpload(contentType);
      const upload = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': contentType },
        body: blob,
      });
      if (!upload.ok) throw new Error('upload_failed');
      return api().photos.confirm(key, position);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-photos'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: string) => {
      if (isDemoMode()) return { ok: true };
      return api().photos.remove(photoId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-photos'] }),
  });
}

export function useSubscriptionState() {
  const invisibleMode = useDemoStore((s) => s.invisibleMode);
  const showOroBadge = useDemoStore((s) => s.showOroBadge);
  const travelModeOn = useDemoStore((s) => s.travelModeOn);
  return useQuery({
    queryKey: ['subscription', invisibleMode, showOroBadge, travelModeOn],
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          tier: demoCurrentUser.subscription.tier,
          plan: demoCurrentUser.subscription.plan,
          status: demoCurrentUser.subscription.status,
          renewsAt: demoCurrentUser.subscription.renewsAt,
          downgradeToTier: null,
          invisibleMode,
          showOroBadge,
          travelMode: travelModeOn ? demoCurrentUser.subscription.travelMode ?? null : null,
        };
      }
      return api().subscriptions.state();
    },
  });
}

export function usePrices() {
  return useQuery({
    queryKey: ['prices'],
    queryFn: async () => {
      if (isDemoMode()) return DEFAULT_PRICES;
      return api().subscriptions.prices();
    },
  });
}

/** Buys or upgrades a subscription (RF-PLU-01/02/03). */
export function usePurchaseSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tier: 'PLUS' | 'ORO';
      plan: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
      channel: 'STRIPE' | 'AZUL' | 'APP_STORE' | 'GOOGLE_PLAY';
      currency: 'DOP' | 'USD';
    }) => {
      if (isDemoMode()) {
        return {
          id: 'demo-subscription',
          tier: input.tier,
          endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        };
      }
      return api().subscriptions.purchase(input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });
}

export function useRedeemPromo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      if (isDemoMode()) {
        if (code.trim().toUpperCase() !== 'IGLESIA30') throw new Error('invalid_promo_code');
        return {
          tier: 'PLUS' as const,
          trialDays: 30,
          endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        };
      }
      return api().subscriptions.redeemPromo(code);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });
}

export function useSetInvisibleMode() {
  const queryClient = useQueryClient();
  const setDemo = useDemoStore((s) => s.setInvisibleMode);
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (isDemoMode()) {
        setDemo(enabled);
        return { invisibleMode: enabled };
      }
      return api().subscriptions.setInvisibleMode(enabled);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<NotificationItem[]> => {
      if (isDemoMode()) return demoNotifications;
      return api().notifications.list();
    },
  });
}

/** RF-NOT-02: per-category preferences and the quiet-hours window. */
export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          preferences: NOTIFICATION_CATEGORIES.map((category) => ({
            category,
            push: true,
            email: false,
          })),
          quietHours: { enabled: true, startHour: 22, endHour: 7 },
        };
      }
      const [preferences, quietHours] = await Promise.all([
        api().notifications.preferences(),
        api().notifications.quietHours(),
      ]);
      return { preferences, quietHours };
    },
  });
}

export function useSetNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { category: string; push: boolean; email: boolean }) => {
      if (isDemoMode()) return input;
      return api().notifications.setPreference(input.category, input.push, input.email);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-settings'] }),
  });
}

export function useSetQuietHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { enabled: boolean; startHour: number; endHour: number }) => {
      if (isDemoMode()) return input;
      return api().notifications.setQuietHours(input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-settings'] }),
  });
}

export function useVerificationStatus() {
  return useQuery({
    queryKey: ['verification'],
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          level1: { status: 'APPROVED' as const, level: 1 },
          level2: { status: 'APPROVED' as const, level: 2, resolvedAt: '2026-08-12' },
          level3: undefined,
        };
      }
      return api().verification.status();
    },
  });
}

export function useRedeemChurchCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      if (isDemoMode()) {
        if (!code.trim()) throw new Error('invalid_code');
        return { endorsedBy: 'Iglesia Monte de Sion' };
      }
      return api().verification.redeemChurchCode(code);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['verification'] }),
  });
}

export function useSafetyTips() {
  return useQuery({
    queryKey: ['safety-tips'],
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          firstConnection: SAFETY_TIPS_V1.firstConnection,
          scamWarning: SAFETY_TIPS_V1.scamWarning,
        };
      }
      return api().catalog.safetyTips();
    },
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      if (isDemoMode()) {
        return { exportedAt: new Date().toISOString(), demo: true };
      }
      return api().privacy.exportData();
    },
  });
}

// ---------------------------------------------------------------------------
// Admin reports (RF-ADM-12)
// ---------------------------------------------------------------------------

/**
 * One exportable report. `funnel` is the one that matters: it runs from
 * sign-up to bonds that advanced, and deliberately does not end in revenue —
 * that lives in the `subscriptions` report instead.
 */
export function useAdminReport(kind: string, weeks?: number) {
  return useQuery({
    queryKey: ['admin-report', kind, weeks],
    queryFn: async (): Promise<{
      title: string;
      rows: Array<Record<string, string | number>>;
    }> => {
      if (isDemoMode()) return demoReports[kind] ?? { title: kind, rows: [] };
      return api().admin.report(kind, weeks);
    },
  });
}

// ---------------------------------------------------------------------------
// Acompañamiento
// ---------------------------------------------------------------------------

/** Who accompanies this bond, from the couple's side. */
export function useAccompaniment(matchId: string) {
  const demo = useDemoStore((s) => s.accompaniment[matchId]);
  const live = useQuery({
    queryKey: ['accompaniment', matchId],
    enabled: !isDemoMode() && !!matchId,
    queryFn: () => api().connections.accompaniment(matchId),
  });

  if (!isDemoMode()) return live;
  return { ...live, data: demo ?? demoAccompanimentFor(matchId), isLoading: false } as typeof live;
}

export function useInviteMentor(matchId: string) {
  const queryClient = useQueryClient();
  const inviteDemo = useDemoStore((s) => s.inviteMentor);
  return useMutation({
    mutationFn: async (code: string) => {
      if (isDemoMode()) {
        const result = inviteDemo(matchId, code);
        if (result !== 'ok') throw new Error(result);
        return { id: 'demo', status: 'INVITED' as const };
      }
      return api().connections.inviteMentor(matchId, code);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accompaniment', matchId] }),
  });
}

export function useConsentToMentor(matchId: string) {
  const queryClient = useQueryClient();
  const consentDemo = useDemoStore((s) => s.consentToMentor);
  return useMutation({
    mutationFn: async (agree: boolean) => {
      if (isDemoMode()) {
        consentDemo(matchId, agree);
        return { id: 'demo', status: agree ? ('ACTIVE' as const) : ('DECLINED' as const) };
      }
      return api().connections.consentToMentor(matchId, agree);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accompaniment', matchId] }),
  });
}

export function useEndAccompaniment(matchId: string) {
  const queryClient = useQueryClient();
  const endDemo = useDemoStore((s) => s.endAccompaniment);
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) {
        endDemo(matchId);
        return { id, status: 'ENDED' as const };
      }
      return api().accompaniment.end(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accompaniment', matchId] });
      void queryClient.invalidateQueries({ queryKey: ['accompanied-bonds'] });
    },
  });
}

/**
 * The other side: the bonds this member accompanies. Nothing here carries a
 * conversation, because the API has no endpoint that could return one.
 */
export function useAccompaniedBonds() {
  return useQuery({
    queryKey: ['accompanied-bonds'],
    queryFn: async (): Promise<AccompaniedBond[]> => {
      if (isDemoMode()) return demoAccompaniedBonds;
      return api().accompaniment.mine();
    },
  });
}

export function useRespondToAccompaniment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      if (isDemoMode()) return { id, status: accept ? ('ACTIVE' as const) : ('DECLINED' as const) };
      return api().accompaniment.respond(id, accept);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accompanied-bonds'] }),
  });
}

export function useMentorProfile() {
  return useQuery({
    queryKey: ['mentor-profile'],
    queryFn: async (): Promise<MentorProfile | null> => {
      if (isDemoMode()) return demoMentorProfile;
      return api().accompaniment.myMentorProfile();
    },
  });
}

export function useEnableMentor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { spouseName?: string; marriedSince?: number; bio?: string }) => {
      if (isDemoMode()) return { ...demoMentorProfile, ...input };
      return api().accompaniment.enableMentor(input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mentor-profile'] }),
  });
}

// ---------------------------------------------------------------------------
// Ministerio de solteros (portal de iglesias)
// ---------------------------------------------------------------------------

/**
 * Totals for the encuentros a congregation convokes. Counts and rates only —
 * the church portal never sees who attends or who connects with whom.
 */
export function useSinglesMinistry() {
  return useQuery({
    queryKey: ['singles-ministry'],
    queryFn: async (): Promise<SinglesMinistry> => {
      if (isDemoMode()) return demoSinglesMinistry;
      return api().church.singlesMinistry();
    },
  });
}
