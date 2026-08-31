/**
 * Typed API client (Hito 1). One method per endpoint, grouped by module, so
 * web and mobile share the exact same contract and a rename in the API
 * breaks the build instead of failing at runtime.
 */
import { HttpClient, type HttpClientOptions, type TokenPair } from './http';
import type {
  ChatMessage,
  ConnectionSummary,
  EventSummary,
  GroupActivitySummary,
  GroupPost,
  GroupSummary,
  Intention,
  NotificationItem,
  ProfileCard,
  SubscriptionPlan,
  SubscriptionTier,
} from '../types/domain';
import type { RelationshipStage } from '../relationship/stages';
import type { DiscoverFilters } from '../validators/discover';
import type { CreateEventInput, CreateGroupInput, ReportInput } from '../validators/community';
import type { ProfileUpdateInput, SearchPreferencesInput } from '../validators/profile';
import type { PriceTable } from '../constants/pricing';

// ---------------------------------------------------------------------------
// Response shapes that only the client needs to name
// ---------------------------------------------------------------------------

export interface MeResponse {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE';
  covenantAcceptedAt: string | null;
  covenantVersion: string | null;
  profile: MyProfile | null;
  verifications: Array<{ level: number; status: string; church?: { name: string } | null }>;
  subscriptions: Array<{ tier: SubscriptionTier; status: string; endsAt: string }>;
}

/** Everything the couple's stage screen shows, from one request. */
export interface RelationshipState {
  stage: RelationshipStage;
  stageChangedAt: string | null;
  /** The only stage proposable from here; null once there is nowhere further. */
  nextStage: RelationshipStage | null;
  /** True from noviazgo on: both people have left Descubrir. */
  isExclusive: boolean;
  otherName: string;
  proposal: { stage: RelationshipStage; byMe: boolean; proposedAt: string } | null;
  history: Array<{ toStage: RelationshipStage; createdAt: string }>;
}

export type MeetingPlanStatus = 'PLANNED' | 'SHARED' | 'CHECKED_IN' | 'CANCELED';

export interface MeetingPlanInput {
  place: string;
  meetsAt: string;
  notes?: string;
  /**
   * Free text like "mi hermana Rosa". Deliberately not a phone number: Yugo
   * never stores or contacts a third party who did not agree to be here.
   */
  trustedContactLabel?: string;
}

export interface MeetingPlan {
  id: string;
  place: string;
  meetsAt: string;
  notes: string | null;
  trustedContactLabel: string | null;
  status: MeetingPlanStatus;
  sharedAt: string | null;
  checkInAt: string | null;
  /** The message the member sends themselves, from their own phone. */
  shareText: string;
  /** The meeting has passed and they have not said they are fine. */
  awaitingCheckIn: boolean;
}

export type StoryStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED';

/**
 * Una historia publicada.
 *
 * `churchNames` is not optional: a story a congregation stands behind is a
 * reason to trust the product, and one nobody can check is just marketing.
 */
export interface PublishedStory {
  id: string;
  names: string;
  churchNames: string;
  city: string | null;
  marriedAt: string;
  body: string;
  publishedAt: string | null;
}

export interface StoryDraftInput {
  names: string;
  churchNames: string;
  city?: string;
  marriedAt: string;
  body: string;
}

/** La historia de una pareja, vista por ellos mismos. */
export interface CoupleStory {
  canSubmit: boolean;
  whyNot: 'not_married_yet' | null;
  story: {
    id: string;
    status: StoryStatus;
    names: string;
    churchNames: string;
    marriedAt: string;
    body: string;
    myConsent: boolean;
    theirConsent: boolean;
    reviewNote: string | null;
  } | null;
}

/**
 * Lo que ve el ministerio de solteros de una congregación.
 *
 * Counts and rates only. No names, no attendee lists, nothing about who is
 * talking to whom — the same line the rest of the church portal holds, and
 * the reason a church can lend its name to any of this.
 */
export interface SinglesMinistry {
  endorsedSingles: number;
  pastEncounters: number;
  going: number;
  /** People who wanted in and did not fit: the number that says "book a bigger room". */
  waitlisted: number;
  checkIns: number;
  checkInRate: number;
  upcoming: Array<{
    id: string;
    title: string;
    startsAt: string;
    capacity: number | null;
    going: number;
    waitlisted: number;
  }>;
  privacyNote: string;
}

export type AccompanimentStatus = 'INVITED' | 'ACTIVE' | 'DECLINED' | 'ENDED';

/** What the couple sees about who accompanies them. */
export interface CoupleAccompaniment {
  canInvite: boolean;
  whyNot: 'needs_intentional_friendship' | null;
  items: Array<{
    id: string;
    status: AccompanimentStatus;
    mentorName: string;
    spouseName: string | null;
    churchName: string | null;
    marriedSince: number | null;
    bio: string | null;
    invitedByMe: boolean;
    myConsent: boolean;
    theirConsent: boolean;
    mentorAccepted: boolean;
  }>;
}

/**
 * What the mentor sees. Note what is missing and always will be: no
 * conversation id, no last message, no unread count.
 */
export interface AccompaniedBond {
  id: string;
  status: AccompanimentStatus;
  stage: RelationshipStage;
  stageChangedAt: string | null;
  since: string | null;
  names: [string, string];
  churches: [string | null, string | null];
  bothConsented: boolean;
}

export interface AccompaniedBondDetail {
  id: string;
  since: string | null;
  stage: RelationshipStage;
  stageChangedAt: string | null;
  names: [string, string];
  churches: [string | null, string | null];
  history: Array<{ toStage: RelationshipStage; createdAt: string }>;
}

export interface MentorProfile {
  userId: string;
  code: string;
  spouseName: string | null;
  marriedSince: number | null;
  bio: string | null;
  active: boolean;
}

export interface MyProfile {
  userId: string;
  displayName: string;
  city: string | null;
  province: string | null;
  occupation: string | null;
  education: string | null;
  testimony: string | null;
  verse: string | null;
  denominationId: string | null;
  churchId: string | null;
  churchFreeText: string | null;
  yearsInFaith: number | null;
  attendance: string | null;
  intention: Intention;
  openness: 'SAME' | 'AFFINE' | 'ALL';
  hasChildren: boolean | null;
  completeness: number;
  ageMin: number;
  ageMax: number;
  maxDistanceKm: number;
  invisibleMode: boolean;
  showOroBadge: boolean;
  hideExactDistance: boolean;
  allowEventPresenceVisible: boolean;
  age?: number;
  photos?: Array<{ id: string; storageKey: string; position: number; moderationStatus: string }>;
  denomination?: { id: string; name: string; slug: string } | null;
  church?: { id: string; name: string } | null;
  serviceAreas?: Array<{ serviceArea: { id: string; slug: string; name: string } }>;
  answers?: Array<{ question: string; answer: string }>;
}

export interface DiscoverResponse {
  items: ProfileCard[];
  total: number;
  interests: { used: number; limit: number | null };
}

export interface AuthResult extends TokenPair {
  isNewAccount?: boolean;
}

export type LoginResult = AuthResult | { twoFactorRequired: true; identifier: string };
export type OAuthResult = AuthResult | { needsProfile: true; email: string | null };

export interface BoostStatus {
  tier: 'FREE' | 'PLUS' | 'ORO';
  allowancePerWeek: number;
  usedThisWeek: number;
  remaining: number;
  activeUntil: string | null;
}

export interface SubscriptionStateResponse {
  tier: SubscriptionTier | null;
  plan?: SubscriptionPlan;
  status?: string;
  renewsAt?: string;
  downgradeToTier: SubscriptionTier | null;
  invisibleMode: boolean;
  showOroBadge: boolean;
  travelMode: { city: string; activeUntil: string } | null;
}

export interface VerificationStatusResponse {
  level1?: VerificationRecord;
  level2?: VerificationRecord;
  level3?: VerificationRecord;
}

export interface VerificationRecord {
  id: string;
  level: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  method: string;
  similarity?: number | null;
  createdAt: string;
  resolvedAt?: string | null;
  church?: { name: string } | null;
}

export interface GroupDetail extends GroupSummary {
  description: string | null;
  myRole?: 'ADMIN' | 'MODERATOR' | 'MEMBER';
  activities: GroupActivitySummary[];
  posts: Array<GroupPost & { commentCount: number }>;
}

export interface JoinRequestRow {
  id: string;
  userId: string;
  displayName: string;
  city?: string | null;
  verificationLevel: number;
  message?: string | null;
  createdAt: string;
}

export interface HomeBannerResponse {
  id: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  tone: 'ink' | 'olive' | 'wheat' | 'wine';
}

export interface SafetyTipsResponse {
  firstConnection: { title: string; points: string[] };
  scamWarning: { title: string; points: string[] };
}

export interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  typeName: string;
  startsAt: string;
  endsAt: string | null;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  churchName: string;
  costLabel: string;
  externalUrl: string | null;
  interestedCount: number;
  shareUrl: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class YugoApiClient {
  readonly http: HttpClient;

  constructor(options: HttpClientOptions) {
    this.http = new HttpClient(options);
  }

  setTokens(tokens: TokenPair | null) {
    return this.http.setTokens(tokens);
  }
  isAuthenticated() {
    return this.http.isAuthenticated();
  }

  // ---- Auth (RF-AUT-01..08) ------------------------------------------------
  readonly auth = {
    register: (input: {
      email?: string;
      phone?: string;
      password: string;
      birthDate: string;
      gender: 'MALE' | 'FEMALE';
    }) => this.http.post<{ userId: string; otpSentTo: string }>('/auth/register', input, { anonymous: true }),

    verifyOtp: async (identifier: string, code: string) => {
      const tokens = await this.http.post<TokenPair>(
        '/auth/otp/verify',
        { identifier, code },
        { anonymous: true },
      );
      await this.http.setTokens(tokens);
      return tokens;
    },

    login: async (identifier: string, password: string) => {
      const result = await this.http.post<LoginResult>(
        '/auth/login',
        { identifier, password },
        { anonymous: true },
      );
      if ('accessToken' in result) await this.http.setTokens(result);
      return result;
    },

    loginSecondFactor: async (identifier: string, code: string) => {
      const tokens = await this.http.post<TokenPair>(
        '/auth/login/2fa',
        { identifier, code },
        { anonymous: true },
      );
      await this.http.setTokens(tokens);
      return tokens;
    },

    /** RF-AUT-02: Google / Apple with a verified provider id_token. */
    oauth: async (input: {
      provider: 'google' | 'apple';
      idToken: string;
      birthDate?: string;
      gender?: 'MALE' | 'FEMALE';
    }) => {
      const result = await this.http.post<OAuthResult>('/auth/oauth', input, { anonymous: true });
      if ('accessToken' in result) await this.http.setTokens(result);
      return result;
    },

    requestPasswordReset: (identifier: string) =>
      this.http.post<{ sent: boolean }>('/auth/password/request-reset', { identifier }, { anonymous: true }),

    resetPassword: (identifier: string, code: string, newPassword: string) =>
      this.http.post<{ reset: boolean }>(
        '/auth/password/reset',
        { identifier, code, newPassword },
        { anonymous: true },
      ),

    acceptCovenant: (version: string) =>
      this.http.post<{ accepted: boolean; version: string }>('/auth/covenant/accept', {
        version,
        accepted: true,
      }),

    me: () => this.http.get<MeResponse>('/auth/me'),

    logoutAll: async () => {
      await this.http.post<{ ok: boolean }>('/auth/logout-all');
      await this.http.setTokens(null);
    },

    signOut: () => this.http.setTokens(null),

    pause: (paused: boolean) => this.http.post<{ paused: boolean }>('/auth/pause', { paused }),

    deleteAccount: () => this.http.delete<{ graceDays: number }>('/auth/account'),
  };

  // ---- Profile (RF-PER-01..11) --------------------------------------------
  readonly profiles = {
    mine: () => this.http.get<MyProfile | null>('/profiles/me'),
    update: (input: ProfileUpdateInput) => this.http.put<MyProfile>('/profiles/me', input),
    updatePreferences: (input: SearchPreferencesInput) =>
      this.http.put<MyProfile>('/profiles/me/preferences', input),
    preview: () =>
      this.http.get<{ profile: MyProfile; completeness: { completeness: number; nextSuggestion: { key: string; targetPct: number } | null } }>(
        '/profiles/me/preview',
      ),
    // RF-PER-09
    questions: () =>
      this.http.get<Array<{ key: string; question: string; maxLength: number }>>('/profiles/questions', {
        anonymous: true,
      }),
    answers: () => this.http.get<Array<{ question: string; answer: string }>>('/profiles/me/answers'),
    saveAnswer: (key: string, answer: string) =>
      this.http.put<{ question: string; answer: string }>('/profiles/me/answers', { key, answer }),
    removeAnswer: (key: string) => this.http.delete<{ removed: boolean }>(`/profiles/me/answers/${key}`),
  };

  // ---- Photos (RF-PER-02) --------------------------------------------------
  readonly photos = {
    signUpload: (contentType: string) =>
      this.http.post<{ key: string; uploadUrl: string }>('/photos/sign-upload', { contentType }),
    confirm: (key: string, position: number) =>
      this.http.post<{ id: string; moderationStatus: string }>('/photos/confirm', { key, position }),
    mine: () =>
      this.http.get<Array<{ id: string; url: string; position: number; moderationStatus: string }>>(
        '/photos/mine',
      ),
    remove: (id: string) => this.http.delete<{ ok: boolean }>(`/photos/${id}`),
  };

  // ---- Catalogs (RF-ADM-07) ------------------------------------------------
  readonly catalog = {
    denominations: () =>
      this.http.get<Array<{ id: string; slug: string; name: string; family: string }>>(
        '/catalog/denominations',
        { anonymous: true },
      ),
    serviceAreas: () =>
      this.http.get<Array<{ id: string; slug: string; name: string }>>('/catalog/service-areas', {
        anonymous: true,
      }),
    groupCategories: () =>
      this.http.get<Array<{ id: string; slug: string; name: string }>>('/catalog/group-categories', {
        anonymous: true,
      }),
    churches: (query?: string) =>
      this.http.get<Array<{ id: string; name: string; city: string | null }>>('/catalog/churches', {
        anonymous: true,
        query: { q: query },
      }),
    /** Cuánta gente ya está aquí para alguien así (prueba de valor). */
    reach: (denomination?: string, province?: string) =>
      this.http.get<{
        approximate: number | null;
        hasPeople: boolean;
        denomination: string | null;
        province: string | null;
      }>('/catalog/reach', { anonymous: true, query: { denomination, province } }),
    covenant: () =>
      this.http.get<{ version: string; body: { points: string[] } }>('/catalog/covenant', {
        anonymous: true,
      }),
    banners: () => this.http.get<HomeBannerResponse[]>('/catalog/banners'),
    safetyTips: () => this.http.get<SafetyTipsResponse>('/catalog/safety-tips', { anonymous: true }),
  };

  // ---- Discover (RF-DES-01..15) -------------------------------------------
  readonly discover = {
    daily: (filters?: DiscoverFilters) =>
      this.http.get<DiscoverResponse>('/discover', {
        query: filters ? { filters: JSON.stringify(filters) } : undefined,
      }),
    profile: (userId: string) => this.http.get<ProfileCard>(`/discover/${userId}`),
    whoViewedMe: () =>
      this.http.get<{
        available: boolean;
        count: number;
        viewers: Array<{ userId: string; displayName: string; viewedAt: string }>;
      }>('/discover/who-viewed-me'),
    boostStatus: () => this.http.get<BoostStatus>('/discover/boost'),
    activateBoost: () =>
      this.http.post<{ featuredUntil: string; remaining: number }>('/discover/boost'),
  };

  // ---- Interests (RF-DES-04..09) ------------------------------------------
  readonly interests = {
    mark: (toUserId: string, message?: string) =>
      this.http.post<{ match: { id: string } | null; remaining: number | null }>('/interests', {
        toUserId,
        message,
      }),
    pass: (userId: string) => this.http.post<{ id: string }>('/interests/pass', { userId }),
    undoPass: () =>
      this.http.post<{ undoneUserId: string; remaining: number }>('/interests/pass/undo'),
    save: (userId: string) => this.http.post<unknown>('/interests/save', { userId }),
    saved: () =>
      this.http.get<Array<{ toUserId: string; to: { profile: { displayName: string } } }>>(
        '/interests/saved',
      ),
    whoMarkedMe: () =>
      this.http.get<{
        count: number;
        profiles: Array<{
          userId: string;
          displayName: string;
          denomination?: string;
          city?: string;
          message?: string | null;
        }> | null;
      }>('/interests/who-marked-me'),
  };

  // ---- Connections & chat (RF-CON-01..10) ---------------------------------
  readonly connections = {
    list: () => this.http.get<Array<ConnectionSummary & { conversationId?: string }>>('/connections'),
    messages: (conversationId: string) =>
      this.http.get<ChatMessage[]>(`/connections/conversations/${conversationId}/messages`),
    send: (conversationId: string, body: string) =>
      this.http.post<ChatMessage>(`/connections/conversations/${conversationId}/messages`, { body }),
    icebreakers: (conversationId: string) =>
      this.http.get<string[]>(`/connections/conversations/${conversationId}/icebreakers`),
    inviteToEvent: (conversationId: string, eventId: string) =>
      this.http.post<{ message: ChatMessage }>(
        `/connections/conversations/${conversationId}/invite-event`,
        { eventId },
      ),
    archive: (conversationId: string, archived: boolean) =>
      this.http.put<{ archived: boolean }>(`/connections/conversations/${conversationId}/archive`, {
        archived,
      }),
    disconnect: (matchId: string) => this.http.delete<{ ended: boolean }>(`/connections/${matchId}`),
    report: (input: ReportInput) => this.http.post<{ id: string }>('/connections/report', input),
    block: (userId: string) => this.http.post<{ blocked: boolean }>('/connections/block', { userId }),

    // Etapas del vínculo: uno propone, el otro acepta, nadie avanza solo.
    stage: (matchId: string) => this.http.get<RelationshipState>(`/connections/${matchId}/stage`),
    proposeStage: (matchId: string, stage: RelationshipStage) =>
      this.http.post<{ proposed: RelationshipStage }>(`/connections/${matchId}/stage/propose`, {
        stage,
      }),
    acceptStage: (matchId: string) =>
      this.http.post<{ stage: RelationshipStage; isExclusive: boolean; advanced: boolean }>(
        `/connections/${matchId}/stage/accept`,
        {},
      ),
    declineStage: (matchId: string) =>
      this.http.post<{ declined: boolean }>(`/connections/${matchId}/stage/decline`, {}),

    // Acompañamiento, lado de la pareja.
    accompaniment: (matchId: string) =>
      this.http.get<CoupleAccompaniment>(`/connections/${matchId}/accompaniment`),
    inviteMentor: (matchId: string, code: string) =>
      this.http.post<{ id: string; status: AccompanimentStatus }>(
        `/connections/${matchId}/accompaniment/invite`,
        { code },
      ),
    consentToMentor: (matchId: string, agree: boolean) =>
      this.http.post<{ id: string; status: AccompanimentStatus }>(
        `/connections/${matchId}/accompaniment/consent`,
        { agree },
      ),

    // Plan del primer encuentro. Es de quien lo escribe: la otra persona
    // nunca lo ve ni se entera de que existe.
    meetingPlan: (matchId: string) =>
      this.http.get<{ plan: MeetingPlan | null }>(`/connections/${matchId}/plan`),
    saveMeetingPlan: (matchId: string, input: MeetingPlanInput) =>
      this.http.post<MeetingPlan>(`/connections/${matchId}/plan`, input),
    markPlanShared: (planId: string) =>
      this.http.post<MeetingPlan>(`/connections/plan/${planId}/shared`, {}),
    planCheckIn: (planId: string) =>
      this.http.post<MeetingPlan>(`/connections/plan/${planId}/check-in`, {}),
    cancelPlan: (planId: string) =>
      this.http.delete<{ canceled: boolean }>(`/connections/plan/${planId}`),
  };

  // ---- Historias de parejas que se casaron --------------------------------
  readonly stories = {
    /** Público a propósito: quien no tiene cuenta también debería poder verlas. */
    published: (limit?: number) =>
      this.http.get<PublishedStory[]>('/historias', { query: { limit }, anonymous: true }),
    forCouple: (matchId: string) =>
      this.http.get<CoupleStory>(`/historias/conexion/${matchId}`),
    submit: (matchId: string, input: StoryDraftInput) =>
      this.http.post<{ id: string; status: StoryStatus }>(`/historias/conexion/${matchId}`, input),
    consent: (matchId: string, agree: boolean) =>
      this.http.post<{ status?: StoryStatus; deleted?: boolean }>(
        `/historias/conexion/${matchId}/consent`,
        { agree },
      ),
    queue: () => this.http.get<PublishedStory[]>('/historias/revision'),
    decide: (id: string, approve: boolean, note?: string) =>
      this.http.post<{ status: StoryStatus }>(`/historias/revision/${id}`, { approve, note }),
  };

  // ---- Acompañamiento, lado del matrimonio que acompaña -------------------
  // Nada aquí devuelve un mensaje: no hay endpoint que pueda.
  readonly accompaniment = {
    mine: () => this.http.get<AccompaniedBond[]>('/acompanamiento'),
    detail: (id: string) => this.http.get<AccompaniedBondDetail>(`/acompanamiento/${id}`),
    respond: (id: string, accept: boolean) =>
      this.http.post<{ id: string; status: AccompanimentStatus }>(
        `/acompanamiento/${id}/respond`,
        { accept },
      ),
    end: (id: string) =>
      this.http.delete<{ id: string; status: AccompanimentStatus }>(`/acompanamiento/${id}`),
    myMentorProfile: () => this.http.get<MentorProfile | null>('/acompanamiento/perfil'),
    enableMentor: (input: { spouseName?: string; marriedSince?: number; bio?: string }) =>
      this.http.put<MentorProfile>('/acompanamiento/perfil', input),
    disableMentor: () => this.http.delete<MentorProfile>('/acompanamiento/perfil'),
  };

  // ---- Community (RF-COM-01..09) ------------------------------------------
  readonly community = {
    myGroups: () => this.http.get<GroupSummary[]>('/community/groups/mine'),
    suggested: () => this.http.get<GroupSummary[]>('/community/groups/suggested'),
    detail: (groupId: string) => this.http.get<GroupDetail>(`/community/groups/${groupId}`),
    create: (input: CreateGroupInput) => this.http.post<{ id: string }>('/community/groups', input),
    join: (groupId: string, message?: string) =>
      this.http.post<{ joined: boolean; pending: boolean }>(`/community/groups/${groupId}/join`, {
        message,
      }),
    joinRequests: (groupId: string) =>
      this.http.get<JoinRequestRow[]>(`/community/groups/${groupId}/join-requests`),
    resolveJoinRequest: (requestId: string, accept: boolean) =>
      this.http.put<{ resolved: boolean }>(`/community/join-requests/${requestId}`, { accept }),
    createPost: (input: { groupId: string; body: string; isPrayerRequest?: boolean; imageKey?: string }) =>
      this.http.post<{ id: string; moderationStatus: string }>('/community/posts', input),
    react: (postId: string, type: 'AMEN' | 'PRAYING' | 'LIKE') =>
      this.http.post<{ reacted: boolean }>('/community/posts/react', { postId, type }),
    markAnswered: (postId: string) =>
      this.http.put<{ answered: boolean }>(`/community/posts/${postId}/answered`),
    comment: (postId: string, body: string) =>
      this.http.post<{ id: string }>(`/community/posts/${postId}/comments`, { body }),
    createActivity: (input: { groupId: string; title: string; startsAt: string; place?: string }) =>
      this.http.post<{ id: string }>('/community/activities', input),
    attendActivity: (activityId: string) =>
      this.http.post<{ going: boolean }>(`/community/activities/${activityId}/attend`),
    manageMember: (groupId: string, userId: string, action: 'EXPEL' | 'MUTE' | 'UNMUTE' | 'PROMOTE_MODERATOR') =>
      this.http.post<{ done: boolean }>(`/community/groups/${groupId}/members/manage`, { userId, action }),
  };

  // ---- Events (RF-EVE-01..08) ---------------------------------------------
  readonly events = {
    agenda: (filters?: { type?: string; maxKm?: number }) =>
      this.http.get<EventSummary[]>('/events', {
        query: { type: filters?.type, maxKm: filters?.maxKm },
      }),
    featured: () => this.http.get<EventSummary[]>('/events/featured'),
    publicEvent: (eventId: string) =>
      this.http.get<PublicEvent>(`/events/${eventId}/public`, { anonymous: true }),
    setAttendance: (eventId: string, status: 'GOING' | 'INTERESTED' | null) =>
      this.http.post<{ status: string | null }>(`/events/${eventId}/attendance`, { status }),
    checkIn: (qrToken: string) =>
      this.http.post<{ checkedIn: boolean; eventTitle: string }>('/events/check-in', { qrToken }),
    /** RF-EVE-08: direct link the device opens to add it to the calendar. */
    calendarUrl: (eventId: string) => this.http.url(`/events/${eventId}/calendar.ics`),
  };

  // ---- Verification (RF-VER-01..05) ---------------------------------------
  readonly verification = {
    status: () => this.http.get<VerificationStatusResponse>('/verification/status'),
    startSelfie: () =>
      this.http.post<{ gestures: string[]; uploadKey: string; uploadUrl: string }>(
        '/verification/selfie/start',
      ),
    submitSelfie: (evidenceKey: string, livenessPassed: boolean) =>
      this.http.post<VerificationRecord>('/verification/selfie/submit', {
        evidenceKey,
        livenessPassed,
      }),
    redeemChurchCode: (code: string) =>
      this.http.post<{ endorsedBy: string }>('/verification/church-code', { code }),
    requestLeaderEndorsement: (input: {
      churchId: string;
      leaderEmail?: string;
      leaderName?: string;
      attendsSince?: number;
    }) => this.http.post<{ id: string; status: string }>('/verification/leader-request', input),
  };

  // ---- Subscriptions (RF-PLU-01..10) --------------------------------------
  readonly subscriptions = {
    state: () => this.http.get<SubscriptionStateResponse>('/subscriptions/me'),
    prices: () => this.http.get<PriceTable>('/subscriptions/prices', { anonymous: true }),
    purchase: (input: {
      tier: SubscriptionTier;
      plan: SubscriptionPlan;
      channel: 'STRIPE' | 'AZUL' | 'APP_STORE' | 'GOOGLE_PLAY';
      currency: 'DOP' | 'USD';
      token?: string;
    }) => this.http.post<{ id: string; tier: SubscriptionTier; endsAt: string }>('/subscriptions/purchase', input),
    redeemPromo: (code: string) =>
      this.http.post<{ tier: SubscriptionTier; trialDays: number; endsAt: string }>(
        '/subscriptions/promo',
        { code },
      ),
    cancel: () => this.http.delete<{ accessUntil: string }>('/subscriptions/me'),
    setInvisibleMode: (enabled: boolean) =>
      this.http.put<{ invisibleMode: boolean }>('/subscriptions/invisible-mode', { enabled }),
    setOroBadge: (show: boolean) =>
      this.http.put<{ showOroBadge: boolean }>('/subscriptions/oro-badge', { show }),
    setTravelMode: (input: { city: string; lat: number; lng: number; days: number } | null) =>
      this.http.put<{ travelMode: { city: string; activeUntil: string } | null }>(
        '/subscriptions/travel-mode',
        input,
      ),
  };

  // ---- Notifications (RF-NOT-01..03) --------------------------------------
  readonly notifications = {
    list: () => this.http.get<NotificationItem[]>('/notifications'),
    markRead: (id: string) => this.http.put<{ ok: boolean }>(`/notifications/${id}/read`),
    registerPushToken: (token: string, platform: 'ios' | 'android' | 'web') =>
      this.http.post<{ ok: boolean }>('/notifications/push-token', { token, platform }),
    preferences: () =>
      this.http.get<Array<{ category: string; push: boolean; email: boolean }>>(
        '/notifications/preferences',
      ),
    setPreference: (category: string, push: boolean, email: boolean) =>
      this.http.put<unknown>('/notifications/preferences', { category, push, email }),
    // RF-NOT-02
    quietHours: () =>
      this.http.get<{ enabled: boolean; startHour: number; endHour: number }>(
        '/notifications/quiet-hours',
      ),
    setQuietHours: (input: { enabled: boolean; startHour: number; endHour: number }) =>
      this.http.put<{ enabled: boolean; startHour: number; endHour: number }>(
        '/notifications/quiet-hours',
        input,
      ),
  };

  // ---- Privacy & legal (RF-SEG-06..08) ------------------------------------
  readonly privacy = {
    exportData: () => this.http.get<Record<string, unknown>>('/privacy/export'),
    requestRectification: (field: string, requestedValue: string) =>
      this.http.post<{ received: boolean }>('/privacy/rectification', { field, requestedValue }),
    setPreferences: (input: { hideExactDistance?: boolean; allowEventPresenceVisible?: boolean }) =>
      this.http.put<{ saved: boolean }>('/privacy/preferences', input),
    covenantStatus: () =>
      this.http.get<{
        accepted: boolean;
        requiredVersion: string;
        mustReaccept: boolean;
      }>('/privacy/covenant-status'),
    legal: (kind: 'COVENANT' | 'TERMS' | 'PRIVACY' | 'SAFETY_TIPS') =>
      this.http.get<{ kind: string; version: string; body: Record<string, unknown> }>(
        `/privacy/legal/${kind}`,
        { anonymous: true },
      ),
  };

  // ---- Church portal (RF-IGL-01..06) --------------------------------------
  readonly church = {
    register: (input: Record<string, unknown>) => this.http.post<{ id: string }>('/church-portal/register', input),
    me: () =>
      this.http.get<{
        church: { id: string; name: string; status: string; denominationId: string | null };
        role: string;
        stats: { endorsedMembers: number; activeCodes: number; pendingRequests: number };
      }>('/church-portal/me'),
    events: () => this.http.get<Array<{ id: string; title: string; status: string; startsAt: string }>>('/church-portal/events'),
    createEvent: (input: CreateEventInput & { submit: boolean }) =>
      this.http.post<{ id: string; status: string }>('/church-portal/events', input),
    submitEvent: (eventId: string) =>
      this.http.put<{ status: string }>(`/church-portal/events/${eventId}/submit`),
    codes: () =>
      this.http.get<Array<{ id: string; code: string; expiresAt: string; usedAt: string | null }>>(
        '/church-portal/codes',
      ),
    generateCodes: (count: number) =>
      this.http.post<Array<{ id: string; code: string }>>('/church-portal/codes/generate', { count }),
    endorsementRequests: () =>
      this.http.get<Array<{ id: string; name: string; attendsSince: number | null; leaderName: string | null }>>(
        '/church-portal/endorsement-requests',
      ),
    resolveEndorsement: (requestId: string, confirm: boolean) =>
      this.http.put<{ resolved: boolean }>(`/church-portal/endorsement-requests/${requestId}`, { confirm }),
    revokeEndorsement: (memberUserId: string, reason: string) =>
      this.http.post<{ revoked: boolean }>('/church-portal/endorsements/revoke', { memberUserId, reason }),
    metrics: () =>
      this.http.get<{
        events: number;
        going: number;
        checkIns: number;
        groupMembers: number;
        endorsed: number;
        endorsedLast30: number;
        codesIssued: number;
        codesUsed: number;
        codeRedemptionRate: number;
        checkInRate: number;
      }>('/church-portal/metrics'),
    /** Ministerio de solteros: totales, nunca nombres. */
    singlesMinistry: () => this.http.get<SinglesMinistry>('/church-portal/singles-ministry'),
  };

  // ---- Admin panel (RF-ADM-01..12) ----------------------------------------
  readonly admin = {
    dashboard: () =>
      this.http.get<{
        kpis: Record<string, number>;
        attention: Array<{ priority: string; text: string }>;
        queues: Record<string, number>;
      }>('/admin/dashboard'),
    members: (query?: string, page = 1) =>
      this.http.get<{ items: unknown[]; total: number; page: number }>('/admin/members', {
        query: { q: query, page },
      }),
    memberDetail: (id: string) => this.http.get<Record<string, unknown>>(`/admin/members/${id}`),
    memberAction: (id: string, action: 'WARN' | 'SUSPEND' | 'BAN' | 'REINSTATE', reason: string, days?: number) =>
      this.http.post<{ done: boolean }>(`/admin/members/${id}/actions`, { action, reason, days }),
    verificationQueue: () => this.http.get<unknown[]>('/admin/verifications'),
    decideVerification: (id: string, decision: 'APPROVE' | 'REJECT' | 'ESCALATE', note?: string) =>
      this.http.post<{ done: boolean }>(`/admin/verifications/${id}/decision`, { decision, note }),
    revokeVerification: (id: string, reason: string) =>
      this.http.post<{ done: boolean }>(`/admin/verifications/${id}/revoke`, { reason }),
    moderationQueue: (kind?: 'REPORT' | 'AI_HELD' | 'APPEAL') =>
      this.http.get<{ items: unknown[]; counts: Record<string, number> }>('/admin/moderation/queue', {
        query: { kind },
      }),
    takeNextCase: () => this.http.post<{ id: string } | null>('/admin/moderation/take-next'),
    decideCase: (id: string, decision: string, reason: string) =>
      this.http.post<{ done: boolean }>(`/admin/moderation/cases/${id}/decision`, { decision, reason }),
    resolveHeldMessage: (id: string, approve: boolean) =>
      this.http.post<{ done: boolean }>(`/admin/moderation/messages/${id}/resolve`, { approve }),
    pendingChurches: () => this.http.get<unknown[]>('/admin/churches/pending'),
    decideChurch: (id: string, approve: boolean, note?: string) =>
      this.http.post<{ done: boolean }>(`/admin/churches/${id}/decision`, { approve, note }),
    eventsInReview: () => this.http.get<unknown[]>('/admin/events/in-review'),
    decideEvent: (id: string, approve: boolean, note?: string) =>
      this.http.post<{ done: boolean }>(`/admin/events/${id}/decision`, { approve, note }),
    setEventFeatured: (id: string, featured: boolean) =>
      this.http.put<{ done: boolean }>(`/admin/events/${id}/featured`, { featured }),
    pendingGroups: () => this.http.get<unknown[]>('/admin/groups/pending'),
    decideGroup: (id: string, approve: boolean) =>
      this.http.post<{ done: boolean }>(`/admin/groups/${id}/decision`, { approve }),
    settings: () =>
      this.http.get<{
        weights: Record<string, number>;
        limits: Record<string, unknown>;
        thresholds: Record<string, number>;
        covenantVersion: string;
        prices: PriceTable;
      }>('/admin/settings'),
    updateWeights: (weights: Record<string, number>) =>
      this.http.put<{ saved: boolean }>('/admin/settings/affinity-weights', weights),
    updateSetting: (key: string, value: unknown) =>
      this.http.put<{ saved: boolean }>('/admin/settings', { key, value }),
    denominationMatrix: () =>
      this.http.get<{
        denominations: Array<{ id: string; name: string; slug: string }>;
        affinities: Array<{ aId: string; bId: string; value: number }>;
      }>('/admin/denomination-matrix'),
    updateMatrixCell: (aId: string, bId: string, value: number) =>
      this.http.put<{ saved: boolean }>('/admin/denomination-matrix', { aId, bId, value }),
    auditLog: (filters?: { actorId?: string; action?: string; page?: number }) =>
      this.http.get<unknown[]>('/admin/audit', { query: filters }),
    payments: (page = 1) => this.http.get<unknown[]>('/admin/payments', { query: { page } }),
    approveRefund: (id: string) =>
      this.http.post<{ status: string }>(`/admin/payments/${id}/refund-approve`),
    // RF-ADM-10
    banners: () => this.http.get<HomeBannerResponse[]>('/admin/content/banners'),
    saveBanners: (banners: HomeBannerResponse[]) =>
      this.http.put<{ saved: boolean }>('/admin/content/banners', { banners }),
    icebreakers: () =>
      this.http.get<{ byPractice: Record<string, string>; generic: string[] }>('/admin/content/icebreakers'),
    saveIcebreakers: (input: { byPractice: Record<string, string>; generic: string[] }) =>
      this.http.put<{ saved: boolean }>('/admin/content/icebreakers', input),
    safetyTips: () => this.http.get<SafetyTipsResponse>('/admin/content/safety-tips'),
    saveSafetyTips: (tips: SafetyTipsResponse) =>
      this.http.put<{ saved: boolean }>('/admin/content/safety-tips', tips),
    // RF-ADM-12
    report: (kind: string, weeks?: number) =>
      this.http.get<{ title: string; rows: Array<Record<string, string | number>> }>(
        `/admin/reports/${kind}`,
        { query: { weeks } },
      ),
    reportCsvUrl: (kind: string, weeks?: number) =>
      this.http.url(`/admin/reports/${kind}/export.csv`, { weeks }),
    // RF-PLU-04
    promoCodes: () => this.http.get<unknown[]>('/subscriptions/promo'),
    createPromoCode: (input: {
      code: string;
      tier: SubscriptionTier;
      trialDays: number;
      maxUses?: number;
      expiresAt?: string;
    }) => this.http.post<{ id: string; code: string }>('/subscriptions/promo/create', input),
  };

  // ---- Health (RNF-08) -----------------------------------------------------
  readonly health = {
    check: () =>
      this.http.get<{ status: string; checks: Record<string, string>; uptimeSeconds: number }>('/health', {
        anonymous: true,
      }),
    metrics: () =>
      this.http.get<{
        moderation: Record<string, number>;
        queues: Record<string, number>;
        alerts: Array<{ level: string; text: string }>;
      }>('/health/metrics'),
  };
}

export function createApiClient(options: HttpClientOptions): YugoApiClient {
  return new YugoApiClient(options);
}
