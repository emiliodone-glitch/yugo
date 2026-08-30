'use client';

/**
 * Demo-mode state (NEXT_PUBLIC_DEMO_MODE): the whole UI works against the
 * shared fixtures with realistic interactions, including a client-side
 * moderation imitation so the "message held/rejected" flows can be seen.
 * In live mode the same screens call the API instead (lib/api.ts).
 */
import { create } from 'zustand';
import {
  demoCurrentUser,
  demoDailySummary,
  demoMessages,
  LIMITS,
  type ChatMessage,
} from '@yugo/shared';

interface DemoState {
  interestsUsed: number;
  interestsLimit: number | null;
  sentInterests: Record<string, boolean>;
  savedProfiles: Record<string, boolean>;
  passedProfiles: Record<string, boolean>;
  lastPassed: string | null;
  undosUsed: number;
  eventStatus: Record<string, 'GOING' | 'INTERESTED' | undefined>;
  activityJoined: Record<string, boolean>;
  praying: Record<string, boolean>;
  amen: Record<string, boolean>;
  messages: Record<string, ChatMessage[]>;
  invisibleMode: boolean;
  showOroBadge: boolean;
  travelModeOn: boolean;
  pausedProfile: boolean;
  /** RF-DES-10: featured until, so the demo reflects the activation. */
  boostActiveUntil: string | null;
  boostUsedThisWeek: number;
  markInterest: (userId: string) => 'ok' | 'limit';
  passProfile: (userId: string) => void;
  undoPass: () => string | null;
  saveProfile: (userId: string) => void;
  setEventStatus: (eventId: string, status: 'GOING' | 'INTERESTED' | undefined) => void;
  toggleActivity: (activityId: string) => void;
  togglePraying: (postId: string) => void;
  toggleAmen: (postId: string) => void;
  sendMessage: (conversationId: string, body: string) => ChatMessage;
  setInvisibleMode: (on: boolean) => void;
  setShowOroBadge: (on: boolean) => void;
  setTravelMode: (on: boolean) => void;
  setPausedProfile: (on: boolean) => void;
  activateBoost: () => string;
}

/** Mirrors the API's stub classifier so demo mode shows real moderation UX. */
function demoModerationStatus(body: string): ChatMessage['moderationStatus'] {
  if (/\b(dinero|deposita|transferencia|invers|préstamo)\b/i.test(body)) return 'REJECTED';
  if (/\b(whatsapp|telegram|instagram)\b/i.test(body)) return 'HELD';
  return 'APPROVED';
}

export const useDemoStore = create<DemoState>((set, get) => ({
  interestsUsed: demoDailySummary.interestsUsedToday,
  interestsLimit: demoCurrentUser.subscription.tier ? null : demoDailySummary.interestsLimit,
  sentInterests: {},
  savedProfiles: {},
  passedProfiles: {},
  lastPassed: null,
  undosUsed: 0,
  eventStatus: { 'ev-vigilia': 'GOING' },
  activityJoined: {},
  praying: {},
  amen: {},
  messages: demoMessages,
  invisibleMode: demoCurrentUser.subscription.invisibleMode ?? false,
  showOroBadge: false,
  travelModeOn: !!demoCurrentUser.subscription.travelMode,
  pausedProfile: false,
  boostActiveUntil: null,
  boostUsedThisWeek: 1,

  markInterest: (userId) => {
    const { interestsUsed, interestsLimit, sentInterests } = get();
    if (sentInterests[userId]) return 'ok';
    if (interestsLimit !== null && interestsUsed >= interestsLimit) return 'limit';
    set({
      interestsUsed: interestsUsed + 1,
      sentInterests: { ...sentInterests, [userId]: true },
    });
    return 'ok';
  },

  passProfile: (userId) =>
    set((state) => ({
      passedProfiles: { ...state.passedProfiles, [userId]: true },
      lastPassed: userId,
    })),

  undoPass: () => {
    const { lastPassed, undosUsed, passedProfiles } = get();
    if (!lastPassed || undosUsed >= LIMITS.UNDO_PASS_PER_DAY_ORO) return null;
    const { [lastPassed]: _removed, ...rest } = passedProfiles;
    set({ passedProfiles: rest, lastPassed: null, undosUsed: undosUsed + 1 });
    return lastPassed;
  },

  saveProfile: (userId) =>
    set((state) => ({ savedProfiles: { ...state.savedProfiles, [userId]: true } })),

  setEventStatus: (eventId, status) =>
    set((state) => ({ eventStatus: { ...state.eventStatus, [eventId]: status } })),

  toggleActivity: (activityId) =>
    set((state) => ({
      activityJoined: { ...state.activityJoined, [activityId]: !state.activityJoined[activityId] },
    })),

  togglePraying: (postId) =>
    set((state) => ({ praying: { ...state.praying, [postId]: !state.praying[postId] } })),

  toggleAmen: (postId) =>
    set((state) => ({ amen: { ...state.amen, [postId]: !state.amen[postId] } })),

  sendMessage: (conversationId, body) => {
    const message: ChatMessage = {
      id: `local-${Date.now()}`,
      conversationId,
      senderId: demoCurrentUser.userId,
      body,
      moderationStatus: demoModerationStatus(body),
      sentAt: new Date().toISOString(),
      deliveredAt: undefined,
    };
    if (message.moderationStatus === 'APPROVED') {
      message.deliveredAt = new Date().toISOString();
    }
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message],
      },
    }));
    return message;
  },

  setInvisibleMode: (on) => set({ invisibleMode: on }),
  setShowOroBadge: (on) => set({ showOroBadge: on }),
  setTravelMode: (on) => set({ travelModeOn: on }),
  setPausedProfile: (on) => set({ pausedProfile: on }),

  activateBoost: () => {
    const until = new Date(Date.now() + 24 * 3600_000).toISOString();
    set((state) => ({ boostActiveUntil: until, boostUsedThisWeek: state.boostUsedThisWeek + 1 }));
    return until;
  },
}));
