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
  demoStories,
  CONVERSATION_QUESTIONS,
  DEFAULT_PRICES,
  LIMITS,
  type ProfileQuestion,
  type VoiceNoteState,
  type VideoCallItem,
  type VideoCallsResponse,
  demoIntroductions,
  demoProposedIntroductions,
  type IntroductionForMember,
  type IntroductionForMentor,
  NOTIFICATION_CATEGORIES,
  SAFETY_TIPS_V1,
  isExclusive,
  nextStage,
  rankPrayerRequests,
  type DevotionalDraft,
  type PrayerScope,
  type ChatMessage,
  type AccompaniedBond,
  type MentorProfile,
  type SinglesMinistry,
  type CoupleStory,
  type PublishedStory,
  type StoryDraftInput,
  type MeetingPlanInput,
  type RelationshipStage,
  type RelationshipState,
  type DiscoverFilters,
  type ConnectionSummary,
  type EventSummary,
  type GroupSummary,
  type Intention,
  type MyProfile,
  type NotificationItem,
  type ProfileCard,
  type ProfileUpdateInput,
  type SearchPreferencesInput,
  type SubscriptionTier,
} from '@yugo/shared';
import { useEffect, useRef, useState } from 'react';
import { api, isDemoMode } from './runtime';
import { emitTyping, joinConversation, subscribeNotifications } from './realtime';
import { track } from './analytics';
import type { CheckoutResult, DiscoverResponse, GroupDetail, PaymentReceipt } from '@yugo/shared';
import {
  demoAccompanimentFor,
  demoStageQuestions,
  NEW_RELATIONSHIP,
  useDemoStore,
} from './demo-store';

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export function useSession(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['session'],
    // Public pages (invitation link, public event) pass `enabled` from the
    // stored-token check so a visitor without a session doesn't fire a call
    // that can only come back as a 401.
    enabled: options.enabled ?? true,
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
        api()
          .catalog.banners()
          .catch(() => []),
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
    queryFn: async (): Promise<{
      items: ProfileCard[];
      used: number;
      limit: number | null;
      cityCount?: number;
      lowDensity?: boolean;
      city?: string | null;
    }> => {
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
        cityCount: response.cityCount,
        lowDensity: response.lowDensity,
        city: response.city,
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

/**
 * Quita una tarjeta de todas las listas de Descubrir en caché, ahora mismo,
 * y devuelve cómo deshacerlo. Marcar interés o pasar se siente instantáneo;
 * si la API falla, la tarjeta vuelve y el error se muestra.
 */
function removeFromDiscoverCache(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  const snapshots = queryClient.getQueriesData<DiscoverResponse>({ queryKey: ['discover'] });
  for (const [key, data] of snapshots) {
    if (!data?.items) continue;
    queryClient.setQueryData<DiscoverResponse>(key, {
      ...data,
      items: data.items.filter((item) => item.userId !== userId),
    });
  }
  return () => {
    for (const [key, data] of snapshots) queryClient.setQueryData(key, data);
  };
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
    onMutate: async ({ userId }) => {
      if (isDemoMode()) return undefined;
      await queryClient.cancelQueries({ queryKey: ['discover'] });
      return { rollback: removeFromDiscoverCache(queryClient, userId) };
    },
    onError: (_error, _vars, context) => context?.rollback?.(),
    onSuccess: (result, variables) => {
      track('interest_marked', { withMessage: !!variables.message });
      if (result && 'match' in result && result.match) track('connection_created');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['discover'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

/** Arranque por ciudad: «avísame cuando haya más gente». */
export function useCityWaitlist() {
  return useQuery({
    queryKey: ['city-waitlist'],
    queryFn: async () =>
      isDemoMode()
        ? { joined: false, city: demoCurrentUser.city, notifiedAt: null }
        : api().discover.cityWaitlist(),
  });
}

export function useJoinCityWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (join: boolean) => {
      if (isDemoMode()) return { joined: join };
      return join ? api().discover.joinCityWaitlist() : api().discover.leaveCityWaitlist();
    },
    onSuccess: (_result, join) => {
      if (join) track('city_waitlist_joined');
      queryClient.invalidateQueries({ queryKey: ['city-waitlist'] });
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
    onMutate: async (userId) => {
      if (isDemoMode()) return undefined;
      await queryClient.cancelQueries({ queryKey: ['discover'] });
      return { rollback: removeFromDiscoverCache(queryClient, userId) };
    },
    onError: (_error, _vars, context) => context?.rollback?.(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['discover'] }),
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  const saveDemo = useDemoStore((s) => s.saveProfile);
  return useMutation({
    mutationFn: async (userId: string) => {
      if (isDemoMode()) {
        saveDemo(userId);
        return {};
      }
      return api().interests.save(userId);
    },
    // Antes no invalidaba nada: en producción «Guardados» no se enteraba
    // hasta que otra cosa recargaba la lista.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved'] }),
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
        rows.map((row) =>
          api()
            .discover.profile(row.toUserId)
            .catch(() => null),
        ),
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
        api()
          .connections.icebreakers(conversationId)
          .catch(() => []),
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
      category:
        'INAPPROPRIATE' | 'SCAM' | 'FAKE_IDENTITY' | 'HARASSMENT' | 'MISLEADING' | 'UNDERAGE';
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

/** Cierre digno (RF-CON-11): cerrar con una palabra, no con silencio. */
export function useCloseConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      matchId,
      template,
      message,
    }: {
      matchId: string;
      template?: string;
      message?: string;
    }) => {
      if (isDemoMode()) return { ended: true };
      return api().connections.close(matchId, { template, message });
    },
    onSuccess: () => {
      track('connection_closed_with_message');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

// ---- Videollamada dentro de la app (RF-CON-12) ----

const demoCalls = new Map<string, VideoCallItem[]>();

export function useVideoCalls(matchId: string | undefined) {
  return useQuery({
    queryKey: ['video-calls', matchId],
    enabled: !!matchId,
    queryFn: async (): Promise<VideoCallsResponse> => {
      if (!matchId) return { available: false, calls: [] };
      if (isDemoMode()) return { available: true, calls: demoCalls.get(matchId) ?? [] };
      return api().connections.calls(matchId);
    },
    refetchInterval: 60_000,
  });
}

export function useScheduleCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, scheduledAt }: { matchId: string; scheduledAt: string }) => {
      if (isDemoMode()) {
        const item: VideoCallItem = {
          id: `demo-call-${Date.now()}`,
          matchId,
          scheduledAt,
          durationMin: 15,
          status: 'SCHEDULED',
          mine: true,
          joinable: Math.abs(Date.parse(scheduledAt) - Date.now()) < 10 * 60_000,
        };
        demoCalls.set(matchId, [...(demoCalls.get(matchId) ?? []), item]);
        return item;
      }
      return api().connections.scheduleCall(matchId, scheduledAt);
    },
    onSuccess: (_, variables) => {
      track('video_call_scheduled');
      queryClient.invalidateQueries({ queryKey: ['video-calls', variables.matchId] });
    },
  });
}

export function useJoinCall() {
  return useMutation({
    mutationFn: async (callId: string) => {
      if (isDemoMode()) {
        return {
          url: 'about:blank#demo',
          expiresAt: new Date(Date.now() + 1800_000).toISOString(),
        };
      }
      return api().connections.joinCall(callId);
    },
    onSuccess: () => track('video_call_joined'),
  });
}

export function useCancelCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ callId, matchId }: { callId: string; matchId: string }) => {
      if (isDemoMode()) {
        demoCalls.set(
          matchId,
          (demoCalls.get(matchId) ?? []).filter((call) => call.id !== callId),
        );
        return { cancelled: true };
      }
      return api().connections.cancelCall(callId);
    },
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({ queryKey: ['video-calls', variables.matchId] }),
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
  const queryClient = useQueryClient();
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
    // El contador sube al instante en el grupo abierto; el servidor confirma
    // (o corrige, si era un toggle que quitaba la reacción) al invalidar.
    onMutate: async ({ postId, type }) => {
      if (isDemoMode()) return undefined;
      await queryClient.cancelQueries({ queryKey: ['group'] });
      const snapshots = queryClient.getQueriesData<GroupDetail>({ queryKey: ['group'] });
      for (const [key, data] of snapshots) {
        if (!data?.posts) continue;
        queryClient.setQueryData<GroupDetail>(key, {
          ...data,
          posts: data.posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  prayingCount: post.prayingCount + (type === 'PRAYING' ? 1 : 0),
                  amenCount: post.amenCount + (type === 'AMEN' ? 1 : 0),
                }
              : post,
          ),
        });
      }
      return {
        rollback: () => {
          for (const [key, data] of snapshots) queryClient.setQueryData(key, data);
        },
      };
    },
    onError: (_error, _vars, context) => context?.rollback?.(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['group'] }),
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

/**
 * En demo, la asistencia que la persona marca vive en el almacén de la demo
 * (los fixtures son constantes). Se funde aquí para que lista y detalle
 * reflejen «Asistiré» o «lista de espera» igual que lo haría la API.
 */
function withDemoAttendance(
  event: EventSummary,
  statuses: Record<string, 'GOING' | 'INTERESTED' | 'WAITLIST' | undefined>,
): EventSummary {
  return eventIdIn(statuses, event.id) ? { ...event, myStatus: statuses[event.id] } : event;
}

const eventIdIn = (
  statuses: Record<string, 'GOING' | 'INTERESTED' | 'WAITLIST' | undefined>,
  id: string,
) => Object.prototype.hasOwnProperty.call(statuses, id);

export function useEvents() {
  const statuses = useDemoStore((s) => s.eventStatus);
  return useQuery({
    queryKey: ['events', isDemoMode() ? statuses : null],
    queryFn: async (): Promise<EventSummary[]> => {
      if (isDemoMode()) return demoEvents.map((event) => withDemoAttendance(event, statuses));
      return api().events.agenda();
    },
  });
}

export function useEventDetail(eventId: string) {
  const statuses = useDemoStore((s) => s.eventStatus);
  return useQuery({
    queryKey: ['event', eventId, isDemoMode() ? statuses : null],
    queryFn: async (): Promise<EventSummary | null> => {
      if (isDemoMode()) {
        const event = demoEvents.find((e) => e.id === eventId);
        return event ? withDemoAttendance(event, statuses) : null;
      }
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
    // «Asistiré» se refleja al instante. El servidor puede convertirlo en
    // lista de espera si el encuentro está lleno: por eso se invalida al
    // terminar y lo que queda es lo que él dijo, no lo que se pidió.
    onMutate: async ({ eventId, status }) => {
      if (isDemoMode()) return undefined;
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['events'] }),
        queryClient.cancelQueries({ queryKey: ['event', eventId] }),
      ]);
      const lists = queryClient.getQueriesData<EventSummary[]>({ queryKey: ['events'] });
      const details = queryClient.getQueriesData<EventSummary | null>({
        queryKey: ['event', eventId],
      });
      const apply = (event: EventSummary): EventSummary => {
        const was = event.myStatus === 'GOING' ? 1 : 0;
        const now = status === 'GOING' ? 1 : 0;
        return {
          ...event,
          myStatus: status ?? undefined,
          goingCount: Math.max(0, event.goingCount + now - was),
        };
      };
      for (const [key, data] of lists) {
        if (!Array.isArray(data)) continue;
        queryClient.setQueryData<EventSummary[]>(
          key,
          data.map((event) => (event.id === eventId ? apply(event) : event)),
        );
      }
      for (const [key, data] of details) {
        if (data) queryClient.setQueryData<EventSummary | null>(key, apply(data));
      }
      return {
        rollback: () => {
          for (const [key, data] of lists) queryClient.setQueryData(key, data);
          for (const [key, data] of details) queryClient.setQueryData(key, data);
        },
      };
    },
    onError: (_error, _vars, context) => context?.rollback?.(),
    onSuccess: (_result, variables) => {
      if (variables.status) track('event_attendance', { status: variables.status });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

/**
 * RF-EVE-06: registrar la asistencia con el QR del evento. Acepta la URL
 * completa que hay en el afiche (…/e/ID?ci=TOKEN) o el token suelto.
 */
export function checkInTokenFrom(scanned: string): string | null {
  const text = scanned.trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    const ci = url.searchParams.get('ci');
    if (ci) return ci;
  } catch {
    // no era una URL: puede ser el token directamente
  }
  return /^[A-Za-z0-9_-]{12,64}$/.test(text) ? text : null;
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scanned: string) => {
      const token = checkInTokenFrom(scanned);
      if (!token) throw new Error('invalid_qr');
      if (isDemoMode()) return { checkedIn: true, eventId: 'demo', eventTitle: 'Evento' };
      return api().events.checkIn(token);
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
 * Quién soy, en una sola forma para la demo y la API real.
 *
 * Perfil, Preferencias, Visibilidad y los detalles que firman con mi nombre
 * leían `demoCurrentUser` directamente, así que en producción una persona
 * real veía «Emilio, 34, QA Analyst» en su propio perfil. Este hook es la
 * única puerta: en demo devuelve la ficha de muestra; en vivo compone
 * `/auth/me` (suscripción, verificaciones) con `/profiles/me/preview`
 * (perfil y completitud con la sugerencia siguiente).
 */
export interface CurrentMember {
  userId: string;
  displayName: string;
  age: number | null;
  city: string | null;
  occupation: string | null;
  denomination: string | null;
  churchName: string | null;
  intention: Intention;
  completeness: number;
  /** Qué añadir para subir y hasta dónde llega; null cuando está al 100 %. */
  completenessNext: { key: string; targetPct: number } | null;
  ageMin: number;
  ageMax: number;
  maxDistanceKm: number;
  minVerificationLevel: number | null;
  tier: SubscriptionTier | null;
  verse: string | null;
  testimony: string | null;
}

export function useCurrentMember() {
  return useQuery({
    queryKey: ['current-member'],
    queryFn: async (): Promise<CurrentMember | null> => {
      if (isDemoMode()) {
        const demo = demoCurrentUser;
        return {
          userId: demo.userId,
          displayName: demo.displayName,
          age: demo.age,
          city: demo.city,
          occupation: demo.occupation,
          denomination: demo.denomination,
          churchName: 'Iglesia Bautista Central',
          intention: demo.intention,
          completeness: demo.completeness,
          completenessNext: { key: 'verse', targetPct: demo.completenessNext.targetPct },
          ageMin: demo.ageMin,
          ageMax: demo.ageMax,
          maxDistanceKm: demo.maxDistanceKm,
          minVerificationLevel: 2,
          tier: demo.subscription.tier,
          verse: 'Rut 1:16',
          testimony: null,
        };
      }
      const [me, preview] = await Promise.all([
        api().auth.me(),
        // Sin perfil todavía (registro a medias) el preview responde 404:
        // se sigue con lo que haya en /auth/me.
        api()
          .profiles.preview()
          .catch(() => null),
      ]);
      const profile = preview?.profile ?? me.profile;
      if (!profile) return null;
      // La API guarda la preferencia como `prefMinVerification`; el tipo
      // público del perfil no la declara todavía.
      const extended = profile as MyProfile & { prefMinVerification?: number | null };
      return {
        userId: me.id,
        displayName: profile.displayName,
        age: profile.age ?? null,
        city: profile.city,
        occupation: profile.occupation,
        denomination: profile.denomination?.name ?? null,
        churchName: profile.church?.name ?? profile.churchFreeText ?? null,
        intention: profile.intention,
        completeness: preview?.completeness.completeness ?? profile.completeness,
        completenessNext: preview?.completeness.nextSuggestion ?? null,
        ageMin: profile.ageMin,
        ageMax: profile.ageMax,
        maxDistanceKm: profile.maxDistanceKm,
        minVerificationLevel: extended.prefMinVerification ?? null,
        tier: me.subscriptions[0]?.tier ?? null,
        verse: profile.verse,
        testimony: profile.testimony,
      };
    },
  });
}

/** RF-PER-08: guarda el rango de edad, la distancia y la intención de búsqueda. */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SearchPreferencesInput) => {
      if (isDemoMode()) return null;
      return api().profiles.updatePreferences(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-member'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      // La lista de Descubrir depende del rango: se regenera.
      queryClient.invalidateQueries({ queryKey: ['discover'] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileUpdateInput) => {
      if (isDemoMode()) return null;
      return api().profiles.update(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-member'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}

/** Insignia Oro visible en el perfil (opt-in). */
export function useSetOroBadge() {
  const queryClient = useQueryClient();
  const setDemo = useDemoStore((s) => s.setShowOroBadge);
  return useMutation({
    mutationFn: async (show: boolean) => {
      if (isDemoMode()) {
        setDemo(show);
        return { showOroBadge: show };
      }
      return api().subscriptions.setOroBadge(show);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });
}

/** RF-DES-14: modo viaje (Oro). `null` lo apaga. */
export function useSetTravelMode() {
  const queryClient = useQueryClient();
  const setDemo = useDemoStore((s) => s.setTravelMode);
  return useMutation({
    mutationFn: async (input: { city: string; lat: number; lng: number; days: number } | null) => {
      if (isDemoMode()) {
        setDemo(input !== null);
        return { travelMode: input ? { city: input.city, activeUntil: '' } : null };
      }
      return api().subscriptions.setTravelMode(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
    },
  });
}

/** RF-DES-15: quién vio mi perfil (Oro). Sin Oro llega `available: false`. */
export function useWhoViewedMe() {
  return useQuery({
    queryKey: ['who-viewed-me'],
    queryFn: async () => {
      if (isDemoMode()) return { available: true, count: 27, viewers: [] };
      return api().discover.whoViewedMe();
    },
  });
}

/** Pausar el perfil: desaparece de Descubrir sin borrar nada. */
export function usePauseProfile() {
  const queryClient = useQueryClient();
  const setDemo = useDemoStore((s) => s.setPausedProfile);
  return useMutation({
    mutationFn: async (paused: boolean) => {
      if (isDemoMode()) {
        setDemo(paused);
        return { paused };
      }
      return api().auth.pause(paused);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session'] }),
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
// ---- Voz propia (RF-PER-09/12): tres respuestas y un audio de testimonio ----

const demoAnswers = new Map<string, string>([
  [
    'verse_sustained',
    'Salmo 37:5. Lo repetí un año entero cuando no sabía qué venía; encomendar el camino fue aprender a soltar el control.',
  ],
]);
let demoVoice: VoiceNoteState | null = null;

export function useProfileQuestions() {
  return useQuery({
    queryKey: ['profile-questions'],
    queryFn: async (): Promise<ProfileQuestion[]> =>
      isDemoMode() ? CONVERSATION_QUESTIONS : api().profiles.questions(),
    staleTime: 10 * 60_000,
  });
}

export function useMyAnswers() {
  return useQuery({
    queryKey: ['my-answers'],
    queryFn: async () => {
      if (isDemoMode()) {
        return [...demoAnswers].map(([question, answer]) => ({ question, answer }));
      }
      return api().profiles.answers();
    },
  });
}

export function useSaveAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, answer }: { key: string; answer: string }) => {
      if (isDemoMode()) {
        demoAnswers.set(key, answer);
        return { question: key, answer };
      }
      return api().profiles.saveAnswer(key, answer);
    },
    onSuccess: () => {
      track('profile_answer_saved');
      queryClient.invalidateQueries({ queryKey: ['my-answers'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}

export function useRemoveAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      if (isDemoMode()) {
        demoAnswers.delete(key);
        return { removed: true };
      }
      return api().profiles.removeAnswer(key);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-answers'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}

export function useMyVoiceNote() {
  return useQuery({
    queryKey: ['my-voice'],
    queryFn: async (): Promise<VoiceNoteState | null> => {
      if (isDemoMode()) return demoVoice;
      return (await api().profiles.mine())?.voiceNote ?? null;
    },
  });
}

/**
 * Sube el audio igual que una foto: URL firmada, PUT directo, confirmación.
 * `blob` en web sale del MediaRecorder; en móvil, de `fetch(uri).blob()`.
 */
export function useUploadVoiceNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      blob,
      contentType,
      durationMs,
    }: {
      blob: Blob;
      contentType: string;
      durationMs: number;
    }): Promise<VoiceNoteState> => {
      if (isDemoMode()) {
        demoVoice = {
          id: 'demo-voice',
          status: 'PENDING',
          durationMs,
          url: '',
          createdAt: new Date().toISOString(),
        };
        return demoVoice;
      }
      const { key, uploadUrl } = await api().profiles.voiceSignUpload(contentType);
      const upload = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': contentType },
        body: blob,
      });
      if (!upload.ok) throw new Error('upload_failed');
      return api().profiles.voiceConfirm(key, durationMs, contentType);
    },
    onSuccess: () => {
      track('voice_uploaded');
      queryClient.invalidateQueries({ queryKey: ['my-voice'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}

export function useRemoveVoiceNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (isDemoMode()) {
        demoVoice = null;
        return { removed: true };
      }
      return api().profiles.voiceRemove();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-voice'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}

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
      track('photo_uploaded');
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
          travelMode: travelModeOn ? (demoCurrentUser.subscription.travelMode ?? null) : null,
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

/** Web checkout: activa al instante en local o devuelve la URL de Stripe. */
export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tier: 'PLUS' | 'ORO';
      plan: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
      currency: 'DOP' | 'USD';
    }): Promise<CheckoutResult> => {
      if (isDemoMode()) {
        return {
          mode: 'activated',
          subscription: {
            id: 'demo-subscription',
            tier: input.tier,
            endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          },
        };
      }
      return api().subscriptions.checkout(input);
    },
    onSuccess: (result, input) => {
      track(result.mode === 'redirect' ? 'checkout_started' : 'subscription_activated', {
        tier: input.tier,
        plan: input.plan,
      });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

/** RF-PLU-05: cancelar; el acceso sigue hasta el fin del período. */
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      isDemoMode()
        ? { accessUntil: demoCurrentUser.subscription.renewsAt }
        : api().subscriptions.cancel(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });
}

export function useMyPayments() {
  return useQuery({
    queryKey: ['subscription', 'payments'],
    queryFn: async (): Promise<PaymentReceipt[]> => {
      if (isDemoMode()) {
        return [
          {
            id: 'pay-demo',
            amount: 1490,
            currency: 'DOP',
            provider: 'STRIPE',
            status: 'SUCCEEDED',
            createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
            tier: demoCurrentUser.subscription.tier,
            plan: demoCurrentUser.subscription.plan ?? null,
            periodEndsAt: demoCurrentUser.subscription.renewsAt ?? null,
          },
        ];
      }
      return api().subscriptions.payments();
    },
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

/**
 * Unread badge, kept live: the socket announces every stored notification and
 * the count refetches; without a socket (demo, red caída) sigue valiendo lo
 * último que se leyó.
 */
export function useUnreadNotifications(enabled = true) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications', 'unread'],
    enabled,
    queryFn: async (): Promise<number> => {
      if (isDemoMode()) return demoNotifications.filter((n) => !n.readAt).length;
      return (await api().notifications.unreadCount()).count;
    },
  });
  useEffect(() => {
    if (isDemoMode() || !enabled) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void subscribeNotifications((notification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Lo que cambia el resto de la app también se refresca: una conexión
      // nueva o un mensaje mueven la lista de Conexiones.
      if (notification.category === 'MESSAGE' || notification.category === 'CONNECTION') {
        queryClient.invalidateQueries({ queryKey: ['connections'] });
      }
      if (notification.category === 'INTEREST') {
        queryClient.invalidateQueries({ queryKey: ['who-marked-me'] });
      }
    }).then((off) => {
      if (cancelled) off();
      else cleanup = off;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [queryClient, enabled]);
  return query;
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (isDemoMode() ? { ok: true } : api().notifications.markAllRead()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/** Resumen semanal por correo: activado por defecto, sin rachas. */
export function useDigestSetting() {
  return useQuery({
    queryKey: ['notifications', 'digest'],
    queryFn: async () =>
      isDemoMode() ? { enabled: true, hasEmail: true } : api().notifications.digest(),
  });
}

export function useSetDigest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) =>
      isDemoMode() ? { enabled } : api().notifications.setDigest(enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'digest'] }),
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

// ---- Presentación por padrino (RF-ACO-05) ----

let demoIntroductionsState: IntroductionForMember[] = [...demoIntroductions];
let demoProposedState: IntroductionForMentor[] = [...demoProposedIntroductions];

/** Las presentaciones que me hicieron y esperan mi respuesta. */
export function useIntroductions() {
  return useQuery({
    queryKey: ['introductions'],
    queryFn: async (): Promise<IntroductionForMember[]> =>
      isDemoMode() ? demoIntroductionsState : api().accompaniment.introductions(),
  });
}

export function useRespondIntroduction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      if (isDemoMode()) {
        const current = demoIntroductionsState.find((item) => item.id === id);
        demoIntroductionsState = demoIntroductionsState
          .map((item) =>
            item.id === id
              ? { ...item, myStatus: accept ? ('ACCEPTED' as const) : ('DECLINED' as const) }
              : item,
          )
          .filter((item) => item.myStatus !== 'DECLINED');
        const matched = accept && !!current?.theyAnswered;
        if (matched) demoIntroductionsState = demoIntroductionsState.filter((i) => i.id !== id);
        return {
          status: !accept
            ? ('DECLINED' as const)
            : matched
              ? ('MATCHED' as const)
              : ('PENDING' as const),
          matched,
          conversationId: matched ? 'm-mariel' : undefined,
        };
      }
      return api().accompaniment.respondIntroduction(id, accept);
    },
    onSuccess: (result) => {
      track(result.matched ? 'introduction_matched' : 'introduction_answered');
      queryClient.invalidateQueries({ queryKey: ['introductions'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

/** Lo que el padrino propuso, con su resultado. */
export function useProposedIntroductions(enabled = true) {
  return useQuery({
    queryKey: ['introductions', 'proposed'],
    enabled,
    queryFn: async (): Promise<IntroductionForMentor[]> =>
      isDemoMode() ? demoProposedState : api().accompaniment.proposedIntroductions(),
  });
}

export function useProposeIntroduction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { a: string; b: string; note: string }) => {
      if (isDemoMode()) {
        const item: IntroductionForMentor = {
          id: `demo-intro-${Date.now()}`,
          names: [input.a.split('@')[0], input.b.split('@')[0]],
          note: input.note,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        };
        demoProposedState = [item, ...demoProposedState];
        return item;
      }
      return api().accompaniment.proposeIntroduction(input);
    },
    onSuccess: () => {
      track('introduction_proposed');
      queryClient.invalidateQueries({ queryKey: ['introductions', 'proposed'] });
    },
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

// ---------------------------------------------------------------------------
// Historias
// ---------------------------------------------------------------------------

/** Published stories. Public — no session required. */
export function useStories(limit?: number) {
  return useQuery({
    queryKey: ['stories', limit],
    queryFn: async (): Promise<PublishedStory[]> => {
      if (isDemoMode()) return demoStories.slice(0, limit ?? 20);
      return api().stories.published(limit);
    },
  });
}

/** The couple's own story, if they have one, and whether they can write it. */
export function useOurStory(matchId: string) {
  const stage = useDemoStore((s) => s.relationships[matchId]?.stage ?? 'KNOWING');
  const draft = useDemoStore((s) => s.storyDrafts[matchId]);
  const live = useQuery({
    queryKey: ['our-story', matchId],
    enabled: !isDemoMode() && !!matchId,
    queryFn: () => api().stories.forCouple(matchId),
  });

  if (!isDemoMode()) return live;
  const data: CoupleStory = {
    canSubmit: stage === 'MARRIED' && !draft,
    whyNot: stage === 'MARRIED' ? null : 'not_married_yet',
    story: draft ?? null,
  };
  return { ...live, data, isLoading: false } as typeof live;
}

export function useSubmitStory(matchId: string) {
  const queryClient = useQueryClient();
  const submitDemo = useDemoStore((s) => s.submitStory);
  return useMutation({
    mutationFn: async (input: StoryDraftInput) => {
      if (isDemoMode()) {
        submitDemo(matchId, input);
        return { id: 'demo', status: 'DRAFT' as const };
      }
      return api().stories.submit(matchId, input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['our-story', matchId] }),
  });
}

export function useConsentToStory(matchId: string) {
  const queryClient = useQueryClient();
  const consentDemo = useDemoStore((s) => s.consentToStory);
  return useMutation({
    mutationFn: async (agree: boolean) => {
      if (isDemoMode()) {
        consentDemo(matchId, agree);
        return agree ? { status: 'IN_REVIEW' as const } : { deleted: true };
      }
      return api().stories.consent(matchId, agree);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['our-story', matchId] }),
  });
}

// ---------------------------------------------------------------------------
// Plan del primer encuentro (RF-SEG-06)
// ---------------------------------------------------------------------------

/**
 * My plan for this bond. There is no hook for anybody else's, because there
 * is no endpoint: a plan belongs to the person who wrote it.
 */
export function useMeetingPlan(matchId: string) {
  const demo = useDemoStore((s) => s.meetingPlans[matchId] ?? null);
  const live = useQuery({
    queryKey: ['meeting-plan', matchId],
    enabled: !isDemoMode() && !!matchId,
    queryFn: () => api().connections.meetingPlan(matchId),
  });

  if (!isDemoMode()) return live;
  return { ...live, data: { plan: demo }, isLoading: false } as typeof live;
}

export function useSaveMeetingPlan(matchId: string) {
  const queryClient = useQueryClient();
  const saveDemo = useDemoStore((s) => s.saveMeetingPlan);
  return useMutation({
    mutationFn: async (input: MeetingPlanInput) => {
      if (isDemoMode()) return saveDemo(matchId, input);
      return api().connections.saveMeetingPlan(matchId, input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meeting-plan', matchId] }),
  });
}

/** They sent the message themselves; we only record that they did. */
export function useMarkPlanShared(matchId: string) {
  const queryClient = useQueryClient();
  const updateDemo = useDemoStore((s) => s.updateMeetingPlan);
  return useMutation({
    mutationFn: async (planId: string) => {
      if (isDemoMode()) {
        return updateDemo(matchId, { status: 'SHARED', sharedAt: new Date().toISOString() });
      }
      return api().connections.markPlanShared(planId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meeting-plan', matchId] }),
  });
}

export function usePlanCheckIn(matchId: string) {
  const queryClient = useQueryClient();
  const updateDemo = useDemoStore((s) => s.updateMeetingPlan);
  return useMutation({
    mutationFn: async (planId: string) => {
      if (isDemoMode()) {
        return updateDemo(matchId, {
          status: 'CHECKED_IN',
          checkInAt: new Date().toISOString(),
          awaitingCheckIn: false,
        });
      }
      return api().connections.planCheckIn(planId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meeting-plan', matchId] }),
  });
}

export function useCancelMeetingPlan(matchId: string) {
  const queryClient = useQueryClient();
  const cancelDemo = useDemoStore((s) => s.cancelMeetingPlan);
  return useMutation({
    mutationFn: async (planId: string) => {
      if (isDemoMode()) {
        cancelDemo(matchId);
        return { canceled: true };
      }
      return api().connections.cancelPlan(planId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meeting-plan', matchId] }),
  });
}

// ---------------------------------------------------------------------------
// Conversaciones que importan
// ---------------------------------------------------------------------------

/**
 * Las preguntas abiertas para esta pareja.
 *
 * La respuesta ajena llega en null mientras falte la propia — eso lo decide el
 * servidor, no la pantalla, así que no hay forma de sacarla del payload.
 */
export function useStageQuestions(matchId: string) {
  const stage = useDemoStore((s) => s.relationships[matchId]?.stage ?? 'KNOWING');
  const demoAnswers = useDemoStore((s) => s.questionAnswers[matchId]);
  const live = useQuery({
    queryKey: ['stage-questions', matchId],
    enabled: !isDemoMode() && !!matchId,
    queryFn: () => api().connections.questions(matchId),
  });

  if (!isDemoMode()) return live;
  return {
    ...live,
    data: demoStageQuestions(stage, demoAnswers),
    isLoading: false,
  } as typeof live;
}

export function useAnswerStageQuestion(matchId: string) {
  const queryClient = useQueryClient();
  const answerDemo = useDemoStore((s) => s.answerStageQuestion);
  return useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      if (isDemoMode()) return answerDemo(matchId, questionId, answer);
      return api().connections.answerQuestion(matchId, questionId, answer);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stage-questions', matchId] }),
  });
}

// ---------------------------------------------------------------------------
// Devocional del día
// ---------------------------------------------------------------------------

/**
 * El devocional de hoy.
 *
 * Devuelve `churchReadCount` porque es lo que convierte una lectura solitaria
 * en algo compartido: no importa que 312 personas lo leyeran, importa que 27
 * de tu congregación leyeron lo mismo que tú.
 */
export function useDevotional() {
  const demo = useDemoStore((s) => s.devotional);
  const live = useQuery({
    queryKey: ['devotional'],
    enabled: !isDemoMode(),
    queryFn: () => api().devotional.today(),
  });

  if (!isDemoMode()) return live;
  return { ...live, data: demo, isLoading: false } as typeof live;
}

export function useReadDevotional() {
  const queryClient = useQueryClient();
  const readDemo = useDemoStore((s) => s.readDevotional);
  return useMutation({
    mutationFn: async ({ id, reflection }: { id: string; reflection?: string }) => {
      if (isDemoMode()) return readDemo(reflection);
      return api().devotional.read(id, reflection);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devotional'] }),
  });
}

// ---------------------------------------------------------------------------
// Muro de oración
// ---------------------------------------------------------------------------

/**
 * El muro.
 *
 * El orden lo decide el servidor con `rankPrayerRequests` para que la regla de
 * «nadie se queda en cero» no dependa de qué pantalla lo esté pintando. En
 * demo se aplica la misma función sobre las mismas fixtures.
 */
export function usePrayerWall(scope: PrayerScope = 'community') {
  const demo = useDemoStore((s) => s.prayers);
  const live = useQuery({
    queryKey: ['prayer-wall', scope],
    enabled: !isDemoMode(),
    queryFn: () => api().prayer.wall(scope),
  });

  if (!isDemoMode()) return live;
  const filtered = scope === 'church' ? demo.filter((item) => item.sameChurch) : demo;
  return { ...live, data: rankPrayerRequests(filtered), isLoading: false } as typeof live;
}

export function useIntercede() {
  const queryClient = useQueryClient();
  const intercedeDemo = useDemoStore((s) => s.intercede);
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) return intercedeDemo(id);
      return api().prayer.intercede(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prayer-wall'] }),
  });
}

export function useCreatePrayer() {
  const queryClient = useQueryClient();
  const createDemo = useDemoStore((s) => s.createPrayer);
  return useMutation({
    mutationFn: async ({ body, anonymous }: { body: string; anonymous: boolean }) => {
      if (isDemoMode()) return createDemo(body, anonymous);
      return api().prayer.create(body, anonymous);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prayer-wall'] }),
  });
}

export function useMarkPrayerAnswered() {
  const queryClient = useQueryClient();
  const markDemo = useDemoStore((s) => s.markPrayerAnswered);
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      if (isDemoMode()) {
        const { noteHeld } = markDemo(id, note);
        return {
          id,
          answeredAt: new Date().toISOString(),
          answeredNote: noteHeld ? null : (note ?? null),
          noteHeld,
        };
      }
      return api().prayer.markAnswered(id, note);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prayer-wall'] }),
  });
}

// ---------------------------------------------------------------------------
// Panel: contenido retenido por la moderación automática
// ---------------------------------------------------------------------------

/**
 * Lo retenido, con el texto delante.
 *
 * Antes la cola devolvía casos sin contenido y quien moderaba no podía ni
 * leerlos ni aprobarlos. Para una petición de oración eso significaba que a la
 * persona se le decía «se publica cuando alguien la apruebe» y nadie podía.
 */
export function useHeldContent() {
  const demo = useDemoStore((s) => s.held);
  const live = useQuery({
    queryKey: ['admin-held'],
    enabled: !isDemoMode(),
    queryFn: () => api().admin.heldContent(),
    refetchInterval: 30_000,
  });

  if (!isDemoMode()) return live;
  return { ...live, data: demo, isLoading: false } as typeof live;
}

/** Cola dedicada de fotos del panel (RF-ADM-04): misma decisión, más contexto. */
export function useHeldPhotos() {
  const demo = useDemoStore((s) => s.held);
  const live = useQuery({
    queryKey: ['admin-held-photos'],
    enabled: !isDemoMode(),
    queryFn: () => api().admin.heldPhotos(),
    refetchInterval: 30_000,
  });
  if (!isDemoMode()) return live;
  return {
    ...live,
    data: demo.filter((item) => item.kind === 'photo'),
    isLoading: false,
  } as typeof live;
}

export function useResolveHeld() {
  const queryClient = useQueryClient();
  const resolveDemo = useDemoStore((s) => s.resolveHeld);
  return useMutation({
    mutationFn: async ({ caseId, approve }: { caseId: string; approve: boolean }) => {
      if (isDemoMode()) return resolveDemo(caseId, approve);
      return api().admin.resolveHeldContent(caseId, approve);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-held'] });
      queryClient.invalidateQueries({ queryKey: ['admin-held-photos'] });
      queryClient.invalidateQueries({ queryKey: ['prayer-wall'] });
      queryClient.invalidateQueries({ queryKey: ['devotional'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Panel: autoría de devocionales
// ---------------------------------------------------------------------------

/**
 * El calendario y, sobre todo, la reserva: días consecutivos programados a
 * partir de hoy. Es el número que evita que la app repita el último devocional
 * para siempre sin que nadie se entere.
 */
export function useDevotionalSchedule() {
  const demo = useDemoStore((s) => s.devotionalSchedule);
  const live = useQuery({
    queryKey: ['admin-devotionals'],
    enabled: !isDemoMode(),
    queryFn: () => api().admin.devotionalSchedule(),
  });

  if (!isDemoMode()) return live;
  return { ...live, data: demo, isLoading: false } as typeof live;
}

export function useUpsertDevotional() {
  const queryClient = useQueryClient();
  const upsertDemo = useDemoStore((s) => s.upsertDevotional);
  return useMutation({
    mutationFn: async ({ date, draft }: { date: string; draft: DevotionalDraft }) => {
      if (isDemoMode()) return upsertDemo(date, draft);
      return api().admin.upsertDevotional(date, draft);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-devotionals'] });
      queryClient.invalidateQueries({ queryKey: ['devotional'] });
    },
  });
}

export function useRemoveDevotional() {
  const queryClient = useQueryClient();
  const removeDemo = useDemoStore((s) => s.removeDevotional);
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) {
        removeDemo(id);
        return { deleted: true };
      }
      return api().admin.removeDevotional(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-devotionals'] }),
  });
}
