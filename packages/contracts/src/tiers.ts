/**
 * Tier definitions, limits, and workspace role/kind enums.
 *
 * Numbers match the Tier Matrix in the plan exactly. Importing services
 * should never hard-code tier ceilings — always read from TIER_LIMITS.
 *
 * `internal` is a synthetic tier for the operator admin key. It is never
 * assigned via Stripe — only by a manual DB UPDATE on provisioning.
 */

// ─── Tier enum ────────────────────────────────────────────────────────────

export const TIERS = [
  'hobbyist',
  'plus',
  'pro',
  'teams',
  'enterprise',
  'internal',
] as const;
export type Tier = (typeof TIERS)[number];

// ─── Tier limits ──────────────────────────────────────────────────────────

export interface TierLimits {
  /** Maximum API calls per calendar day. null = unlimited (soft/custom). */
  apiPerDay: number | null;
  /**
   * Maximum API calls per minute (HARD 429 on all tiers).
   * For Teams this is per-seat; multiply by seat count at enforcement.
   * null = custom (Enterprise only).
   */
  apiPerMin: number | null;
  /**
   * Maximum simultaneously active API keys.
   * For Teams this is per-seat; multiply by seat count at enforcement.
   * null = unlimited (internal / Enterprise).
   */
  activeApiKeys: number | null;
  /**
   * Maximum bookmarks in the workspace.
   * null = unlimited.
   */
  bookmarksMax: number | null;
  /**
   * Reading history retention in days.
   * null = unlimited (Pro+).
   */
  historyRetentionDays: number | null;
  /**
   * Maximum saved searches per workspace.
   * null = unlimited.
   */
  savedSearchesMax: number | null;
  /**
   * Maximum entity subscriptions per workspace.
   * null = unlimited.
   */
  entitySubscriptionsMax: number | null;
  /**
   * Maximum story web reads per rolling 30 days (authed).
   * null = unlimited.
   */
  storiesPerMonthWeb: number | null;
  /**
   * Alert channels available to this tier.
   * Empty array = no alerts.
   */
  alertChannels: ReadonlyArray<'email' | 'web_push' | 'webhook' | 'slack' | 'teams'>;
  /** Webhook event subscriptions (Pro+). */
  hasWebhooks: boolean;
  /** AI Research Assistant (Pro+). */
  hasAssistant: boolean;
  /** Custom dashboards (Pro+). */
  hasDashboards: boolean;
  /** Notebooks + annotations (Pro+). */
  hasNotebooks: boolean;
  /** Streaming SSE signal feed (Pro+). */
  hasStreaming: boolean;
  /** Filtered CSV report exports (Pro+). */
  hasExports: boolean;
  /**
   * Minimum seats required to create a workspace of this tier.
   * 1 for personal tiers; 5 for Teams; null = not seat-based.
   */
  seatMinimum: number | null;
}

/**
 * TIER_LIMITS — canonical per-tier ceilings.
 *
 * Enforcement notes:
 * - `apiPerDay` is SOFT (warn at 80%, never 429) for Pro/Teams; HARD (429) for Hobby/Plus.
 * - `apiPerMin` is HARD (429) for ALL tiers.
 * - Teams `apiPerDay` / `apiPerMin` / `activeApiKeys` are PER SEAT; Delivery middleware
 *   multiplies by seat count for the workspace's current subscription.
 */
export const TIER_LIMITS: Readonly<Record<Tier, TierLimits>> = {
  hobbyist: {
    apiPerDay: 500,
    apiPerMin: 60,
    activeApiKeys: 1,
    bookmarksMax: null,          // unlimited
    historyRetentionDays: 30,    // HARD prune
    savedSearchesMax: 1,
    entitySubscriptionsMax: null,
    storiesPerMonthWeb: 30,      // HARD cap
    alertChannels: [],
    hasWebhooks: false,
    hasAssistant: false,
    hasDashboards: false,
    hasNotebooks: false,
    hasStreaming: false,
    hasExports: false,
    seatMinimum: 1,
  },
  plus: {
    apiPerDay: 5_000,
    apiPerMin: 120,
    activeApiKeys: 5,
    bookmarksMax: null,
    historyRetentionDays: 30,    // HARD prune
    savedSearchesMax: 10,
    entitySubscriptionsMax: null,
    storiesPerMonthWeb: null,    // unlimited
    alertChannels: ['email'],
    hasWebhooks: false,
    hasAssistant: false,
    hasDashboards: false,
    hasNotebooks: false,
    hasStreaming: false,
    hasExports: false,
    seatMinimum: 1,
  },
  pro: {
    apiPerDay: 50_000,           // SOFT — warn at 80%, never 429
    apiPerMin: 600,
    activeApiKeys: 25,
    bookmarksMax: null,
    historyRetentionDays: null,  // unlimited
    savedSearchesMax: null,
    entitySubscriptionsMax: null,
    storiesPerMonthWeb: null,
    alertChannels: ['email', 'web_push', 'webhook'],
    hasWebhooks: true,
    hasAssistant: true,
    hasDashboards: true,
    hasNotebooks: true,
    hasStreaming: true,
    hasExports: true,
    seatMinimum: 1,
  },
  teams: {
    apiPerDay: 50_000,           // SOFT per seat; multiply by seat count
    apiPerMin: 600,              // per seat; multiply by seat count
    activeApiKeys: 25,           // per seat; multiply by seat count
    bookmarksMax: null,
    historyRetentionDays: null,
    savedSearchesMax: null,
    entitySubscriptionsMax: null,
    storiesPerMonthWeb: null,
    alertChannels: ['email', 'web_push', 'webhook', 'slack', 'teams'],
    hasWebhooks: true,
    hasAssistant: true,
    hasDashboards: true,
    hasNotebooks: true,
    hasStreaming: true,
    hasExports: true,
    seatMinimum: 5,
  },
  enterprise: {
    apiPerDay: null,             // custom contract
    apiPerMin: null,             // custom contract
    activeApiKeys: null,         // unlimited
    bookmarksMax: null,
    historyRetentionDays: null,
    savedSearchesMax: null,
    entitySubscriptionsMax: null,
    storiesPerMonthWeb: null,
    alertChannels: ['email', 'web_push', 'webhook', 'slack', 'teams'],
    hasWebhooks: true,
    hasAssistant: true,
    hasDashboards: true,
    hasNotebooks: true,
    hasStreaming: true,
    hasExports: true,
    seatMinimum: null,
  },
  internal: {
    apiPerDay: null,
    apiPerMin: null,
    activeApiKeys: null,
    bookmarksMax: null,
    historyRetentionDays: null,
    savedSearchesMax: null,
    entitySubscriptionsMax: null,
    storiesPerMonthWeb: null,
    alertChannels: ['email', 'web_push', 'webhook', 'slack', 'teams'],
    hasWebhooks: true,
    hasAssistant: true,
    hasDashboards: true,
    hasNotebooks: true,
    hasStreaming: true,
    hasExports: true,
    seatMinimum: null,
  },
} as const;

// ─── Workspace role ───────────────────────────────────────────────────────

export const WORKSPACE_ROLES = ['owner', 'admin', 'member'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

// ─── Workspace kind ───────────────────────────────────────────────────────

export const WORKSPACE_KINDS = ['personal', 'team', 'enterprise'] as const;
export type WorkspaceKind = (typeof WORKSPACE_KINDS)[number];
