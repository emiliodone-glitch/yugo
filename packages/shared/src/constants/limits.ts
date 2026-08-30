/**
 * Domain limits and defaults. These are the fallback values; the live values
 * are stored in the `Setting` table and administrable from the admin panel
 * (RF-ADM-08). Business rules reference: sections 6.9 and 7.2 of the
 * requirements document.
 */
export const LIMITS = {
  /** Minimum legal age. Never relax this rule (RF-AUT-03). */
  ADULT_AGE: 18,
  /** Declared age range must span at least this many years (7.2). */
  AGE_RANGE_MIN_SPAN: 3,
  /** Default age range offsets applied to the member's own age (RF-PER-08). */
  AGE_RANGE_DEFAULT_OFFSET_MIN: -5,
  AGE_RANGE_DEFAULT_OFFSET_MAX: 7,

  /** Daily interests for free accounts; Plus and Oro are unlimited (RF-DES-05). */
  DAILY_INTERESTS_FREE: 8,
  /** Daily curated Discover list size (RF-DES-01, 6.9). */
  DISCOVER_PER_DAY_FREE: 30,
  DISCOVER_PER_DAY_ORO: 60,
  /** Undo "Pasar" — Oro only (RF-DES-13). */
  UNDO_PASS_PER_DAY_ORO: 5,
  /** Days a profile stays hidden after "Pasar" (7.2). */
  PASS_HIDE_DAYS: 30,
  /** A broken connection cannot be re-made for this many days (7.2). */
  RECONNECT_COOLDOWN_DAYS: 90,
  /** Profiles inactive longer than this are hidden from Discover (7.2). */
  INACTIVITY_HIDE_DAYS: 60,
  /** Profiles below this completeness do not appear in Discover (RF-PER-10). */
  MIN_COMPLETENESS_FOR_DISCOVER: 60,
  /** Position bonus (ordering only, not displayed score) for level-3 verified (7.1). */
  LEVEL3_POSITION_BONUS: 5,

  /** Interest message length by tier (RF-DES-07, 6.9). */
  INTEREST_MESSAGE_MAX_PLUS: 140,
  INTEREST_MESSAGE_MAX_ORO: 300,
  /** Featured profile per week (RF-DES-10). */
  FEATURED_PER_WEEK_PLUS: 1,
  FEATURED_PER_WEEK_ORO: 3,
  /** "Who viewed my profile" window in days — Oro (RF-DES-15). */
  PROFILE_VIEWS_WINDOW_DAYS: 30,

  /** Profile content lengths (RF-PER-04). */
  TESTIMONY_MAX: 600,
  PHOTOS_MIN: 2,
  PHOTOS_MAX: 6,

  /** Moderation thresholds (7.3, RF-SEG-02) — administrable. */
  MODERATION_HOLD_THRESHOLD: 0.7,
  MODERATION_REJECT_THRESHOLD: 0.92,
  /** Rejected messages in 7 days that trigger an automatic warning (7.3). */
  REJECTIONS_FOR_WARNING: 3,
  /** The next rejection after the warning triggers a 3-day suspension (7.3). */
  REJECTIONS_FOR_SUSPENSION: 4,
  REJECTION_WINDOW_DAYS: 7,
  SUSPENSION_AFTER_REJECTIONS_DAYS: 3,

  /** Endorsement codes expire after this many days (RF-VER-02). */
  ENDORSEMENT_CODE_TTL_DAYS: 30,
  /** Oro identity verification SLA in hours (6.9). */
  ORO_VERIFICATION_SLA_HOURS: 4,

  /** Account deletion grace period in days (RF-AUT-08). */
  DELETION_GRACE_DAYS: 14,
  /** Invisible mode expiry warning lead time in days (RF-PLU-08). */
  INVISIBLE_EXPIRY_WARNING_DAYS: 3,

  /** Community rules (7.4). */
  MAX_GROUPS_ADMINISTERED: 3,
  GROUP_AUTO_ARCHIVE_DAYS: 90,

  /** Event reminder push lead time in hours (RF-EVE-04). */
  EVENT_REMINDER_HOURS: 24,

  /** Chat moderation target latency in ms (7.3). */
  MODERATION_TARGET_LATENCY_MS: 300,
} as const;

/** Timezone that governs daily counters (interests reset at 00:00 — 7.2). */
export const APP_TIMEZONE = 'America/Santo_Domingo';

/** Default affinity score weights — must sum 100 (7.1, RF-ADM-08). */
export const DEFAULT_AFFINITY_WEIGHTS = {
  denomination: 25,
  intention: 25,
  practices: 30,
  distance: 10,
  age: 10,
} as const;

export type AffinityWeights = { [K in keyof typeof DEFAULT_AFFINITY_WEIGHTS]: number };

/** Keys used in the `Setting` table. */
export const SETTING_KEYS = {
  AFFINITY_WEIGHTS: 'affinity.weights',
  LIMITS: 'limits',
  MODERATION_THRESHOLDS: 'moderation.thresholds',
  COVENANT_VERSION: 'covenant.version',
  PRICES: 'subscription.prices',
} as const;
