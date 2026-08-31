/**
 * Demo-mode state: the whole UI works against the shared fixtures with
 * realistic interactions, including a client-side moderation imitation so the
 * "message held / rejected" flows can be seen. In live mode the same screens
 * call the API instead — see runtime.ts.
 */
import { create } from 'zustand';
import {
  demoCurrentUser,
  demoDailySummary,
  demoMessages,
  LIMITS,
  validateStageProposal,
  type ChatMessage,
  type RelationshipStage,
} from '@yugo/shared';

/** Per-connection stage state, mirroring what the API returns. */
export interface DemoRelationship {
  stage: RelationshipStage;
  stageChangedAt: string | null;
  proposal: { stage: RelationshipStage; byMe: boolean; proposedAt: string } | null;
  history: Array<{ toStage: RelationshipStage; createdAt: string }>;
}

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
  /** Etapas del vínculo, por matchId. */
  relationships: Record<string, DemoRelationship>;
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
  proposeStage: (matchId: string, stage: RelationshipStage) => 'ok' | 'invalid';
  respondToStage: (matchId: string, accept: boolean) => void;
}

const DAY = 24 * 3600_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

/** The default for any connection nobody has moved. */
export const NEW_RELATIONSHIP: DemoRelationship = {
  stage: 'KNOWING',
  stageChangedAt: null,
  proposal: null,
  history: [],
};

/**
 * Seeded so the demo shows the states that matter without anyone having to
 * click through: a bond that already advanced, one waiting on an answer from
 * us, and everything else at the start. Two of them sit on connections that
 * appear in the conversation list, so the stage chip there is visible too.
 */
const demoRelationships: Record<string, DemoRelationship> = {
  'm-daniela': {
    stage: 'INTENTIONAL_FRIENDSHIP',
    stageChangedAt: ago(21),
    proposal: null,
    history: [{ toStage: 'INTENTIONAL_FRIENDSHIP', createdAt: ago(21) }],
  },
  'm-sarah': {
    stage: 'KNOWING',
    stageChangedAt: null,
    proposal: { stage: 'INTENTIONAL_FRIENDSHIP', byMe: false, proposedAt: ago(2) },
    history: [],
  },
  'm-priscila': {
    stage: 'KNOWING',
    stageChangedAt: null,
    proposal: { stage: 'INTENTIONAL_FRIENDSHIP', byMe: false, proposedAt: ago(1) },
    history: [],
  },
};

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
  relationships: demoRelationships,

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
    const until = new Date(Date.now() + DAY).toISOString();
    set((state) => ({ boostActiveUntil: until, boostUsedThisWeek: state.boostUsedThisWeek + 1 }));
    return until;
  },

  proposeStage: (matchId, stage) => {
    const current = get().relationships[matchId] ?? NEW_RELATIONSHIP;
    // Same rule the API applies, from the same function, so demo mode cannot
    // show a step the real product would refuse.
    if (!validateStageProposal(current.stage, stage).ok) return 'invalid';
    set((state) => ({
      relationships: {
        ...state.relationships,
        [matchId]: {
          ...current,
          proposal: { stage, byMe: true, proposedAt: new Date().toISOString() },
        },
      },
    }));
    return 'ok';
  },

  respondToStage: (matchId, accept) => {
    const current = get().relationships[matchId] ?? NEW_RELATIONSHIP;
    if (!current.proposal) return;
    const now = new Date().toISOString();
    const next: DemoRelationship = accept
      ? {
          stage: current.proposal.stage,
          stageChangedAt: now,
          proposal: null,
          history: [...current.history, { toStage: current.proposal.stage, createdAt: now }],
        }
      : { ...current, proposal: null };
    set((state) => ({ relationships: { ...state.relationships, [matchId]: next } }));
  },
}));
