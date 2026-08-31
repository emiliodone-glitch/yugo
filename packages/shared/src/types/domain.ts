/**
 * Domain vocabulary (non-negotiable): `interest` (never "like"), `match` /
 * "conexión", `affinityScore`, `covenant`, `endorsement`. Spanish UI strings
 * live in `i18n/es-DO.ts`.
 */
import type { RelationshipStage } from '../relationship/stages';

export type UserRole =
  | 'MEMBER'
  | 'MODERATOR'
  | 'COMMUNITY_MANAGER'
  | 'SUPPORT'
  | 'FINANCE'
  | 'SUPERADMIN';

export type UserStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'SUSPENDED'
  | 'BANNED'
  | 'DELETION_PENDING'
  | 'DELETED';

export type Gender = 'MALE' | 'FEMALE';

/** Declared intention (RF-PER-06). */
export type Intention = 'MARRIAGE' | 'FRIENDSHIP' | 'BOTH';

/** Interdenominational openness (RF-PER-07). */
export type Openness = 'SAME' | 'AFFINE' | 'ALL';

export type Attendance = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'OCCASIONAL';

export type VerificationLevel = 1 | 2 | 3;
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
export type VerificationMethod = 'OTP' | 'SELFIE' | 'CHURCH_CODE' | 'LEADER_CONFIRMATION';

export type ModerationStatus = 'PENDING' | 'APPROVED' | 'HELD' | 'REJECTED';

export type SubscriptionTier = 'PLUS' | 'ORO';
export type SubscriptionPlan = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type SubscriptionChannel = 'STRIPE' | 'AZUL' | 'APP_STORE' | 'GOOGLE_PLAY' | 'PROMO';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';

export type MatchStatus = 'ACTIVE' | 'ENDED';

export type GroupType = 'OPEN' | 'APPROVAL' | 'OFFICIAL';
export type GroupRole = 'ADMIN' | 'MODERATOR' | 'MEMBER';
export type ReactionType = 'AMEN' | 'PRAYING' | 'LIKE';

export type EventType =
  | 'CULTO_ESPECIAL'
  | 'VIGILIA'
  | 'RETIRO'
  | 'CONCIERTO'
  | 'CONGRESO'
  | 'ACTIVIDAD_SOCIAL'
  | 'SERVICIO_COMUNITARIO';

export type EventStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'FINISHED' | 'REJECTED';
export type EventAttendanceStatus = 'GOING' | 'INTERESTED';

export type ReportCategory =
  | 'INAPPROPRIATE'
  | 'SCAM'
  | 'FAKE_IDENTITY'
  | 'HARASSMENT'
  | 'MISLEADING'
  | 'UNDERAGE';

export type ModerationPriority = 'CRITICAL' | 'HIGH' | 'NORMAL';

export type SanctionType = 'WARNING' | 'SUSPENSION' | 'BAN' | 'CONTENT_REMOVAL';

export type ChurchStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
export type ChurchUserRole = 'ADMIN' | 'EVENT_EDITOR';

// ---------------------------------------------------------------------------
// Affinity (7.1)
// ---------------------------------------------------------------------------

export type AffinityComponentKey = 'denomination' | 'intention' | 'practices' | 'distance' | 'age';

export interface AffinityComponent {
  key: AffinityComponentKey;
  /** 0–100 before weighting. */
  score: number;
  /** Optional human explanation shown in the breakdown screen (RF-DES-03). */
  note?: string;
}

export interface AffinityBreakdown {
  /** Weighted total 0–100 (`affinityScore`). */
  total: number;
  components: AffinityComponent[];
}

// ---------------------------------------------------------------------------
// API DTOs (subset shared by web + mobile; the API returns these shapes)
// ---------------------------------------------------------------------------

export interface VerificationBadges {
  contact: boolean;
  identity: boolean;
  /** Church name when endorsed (level 3). */
  endorsedBy?: string;
}

export interface ProfileCard {
  userId: string;
  displayName: string;
  age: number;
  gender: Gender;
  city: string;
  distanceKm: number;
  /** Bucketed distance shown when the member hides the exact value (RF-SEG-07). */
  distanceLabel: string;
  occupation?: string;
  denomination: string;
  churchName?: string;
  intention: Intention;
  testimony?: string;
  verse?: string;
  practices: string[];
  photoUrl?: string;
  affinity: AffinityBreakdown;
  /** One short sentence saying why we suggest this person (RF-DES-02). */
  affinityReason?: string;
  badges: VerificationBadges;
  /** Oro badge shown only if the member opted in (showOroBadge). */
  oroBadge?: boolean;
  inCommon?: string[];
}

export interface ConnectionSummary {
  matchId: string;
  otherUser: {
    userId: string;
    displayName: string;
    photoUrl?: string;
    badges: VerificationBadges;
    churchName?: string;
  };
  isNew: boolean;
  lastMessage?: { body: string; sentAt: string; mine: boolean };
  unreadCount: number;
  /** Etapa del vínculo. Absent on older payloads; treat as KNOWING. */
  stage?: RelationshipStage;
  /** The other person proposed a stage and is waiting for an answer. */
  stageProposalPending?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  moderationStatus: ModerationStatus;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface EventSummary {
  id: string;
  title: string;
  type: EventType;
  typeName: string;
  startsAt: string;
  endsAt?: string;
  churchName: string;
  city: string;
  address?: string;
  distanceKm?: number;
  costLabel: string;
  imageUrl?: string;
  goingCount: number;
  interestedCount: number;
  myStatus?: EventAttendanceStatus;
  connectionsGoing: Array<{ userId: string; displayName: string }>;
  lat?: number;
  lng?: number;
}

export interface GroupSummary {
  id: string;
  name: string;
  category: string;
  type: GroupType;
  city?: string;
  memberCount: number;
  postsToday?: number;
  isOfficial: boolean;
  churchName?: string;
  joined?: boolean;
}

export interface GroupPost {
  id: string;
  groupId: string;
  author: { userId: string; displayName: string };
  body: string;
  imageUrl?: string;
  isPrayerRequest: boolean;
  prayingCount: number;
  amenCount: number;
  likeCount: number;
  answered?: boolean;
  createdAt: string;
}

export interface GroupActivitySummary {
  id: string;
  groupId: string;
  title: string;
  startsAt: string;
  place?: string;
  goingCount: number;
  going?: boolean;
}

export interface DailySummary {
  interestsUsedToday: number;
  interestsLimit: number | null; // null = unlimited (Plus/Oro)
  newConnections: number;
  whoMarkedInterestCount: number;
  discoverRemaining: number;
  discoverTotal: number;
}

export interface SubscriptionState {
  tier: SubscriptionTier | null;
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
  renewsAt?: string;
  invisibleMode?: boolean;
  travelMode?: { city: string; activeUntil: string } | null;
}

/** The categories a member can silence one by one (RF-NOT-02). */
export const NOTIFICATION_CATEGORIES = [
  'CONNECTION',
  'RELATIONSHIP',
  'ACCOMPANIMENT',
  'MESSAGE',
  'INTEREST',
  'EVENT',
  'GROUP',
  'VERIFICATION',
  'MODERATION',
  'SUBSCRIPTION',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
}

// ---------------------------------------------------------------------------
// Moderation (text/image classification result contract)
// ---------------------------------------------------------------------------

export interface ModerationResult {
  /** 0..1 — probability the content violates the covenant. */
  risk: number;
  categories: string[];
  /** Derived decision from thresholds. */
  decision: 'APPROVE' | 'HOLD' | 'REJECT';
}
