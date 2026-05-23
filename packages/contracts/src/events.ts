/**
 * Inter-service event types. Used as Render Workflow task payloads and
 * row-contract anchors when one service signals another.
 *
 * Convention: name = past-tense fact ("RecordIngested" not "IngestRecord").
 * Events describe what already happened, not what should happen.
 */

import { z } from 'zod';
import {
  SourceKindSchema,
  ContentTypeSchema,
  StoryTypeSchema,
  SignalSeveritySchema,
  SignalEvidenceTargetSchema,
  ArcStatusSchema,
  ContentVariantTypeSchema,
} from './enums.js';

// ─── Ingestion → Analysis ─────────────────────────────────────────────────

/** Emitted after Ingestion writes a new row to `records`. Analysis consumes. */
export const RecordIngestedSchema = z.object({
  recordId: z.string(),
  kind: SourceKindSchema,
  contentType: ContentTypeSchema,
  externalId: z.string(),
  capturedAt: z.string().datetime(),
});
export type RecordIngested = z.infer<typeof RecordIngestedSchema>;

// ─── Analysis → Signal ────────────────────────────────────────────────────

/** Emitted after Analysis inserts entity_mentions for a record. Signal consumes. */
export const EntitiesExtractedSchema = z.object({
  recordId: z.string(),
  entityCount: z.number().int().nonnegative(),
  extractedAt: z.string().datetime(),
});
export type EntitiesExtracted = z.infer<typeof EntitiesExtractedSchema>;

/** Emitted after Analysis writes an embedding for a record. */
export const EmbeddingReadySchema = z.object({
  recordId: z.string(),
  modelName: z.string(),
  dimensions: z.number().int().positive(),
});
export type EmbeddingReady = z.infer<typeof EmbeddingReadySchema>;

/** Emitted after Analysis assigns a record to a topic. */
export const TopicAssignedSchema = z.object({
  recordId: z.string(),
  topicId: z.number().int(),
  method: z.string(),
  confidence: z.number().nullable(),
});
export type TopicAssigned = z.infer<typeof TopicAssignedSchema>;

// ─── Signal → Editorial ───────────────────────────────────────────────────

/** Emitted after Signal detects a new signal. Editorial may consume to draft a story. */
export const SignalDetectedSchema = z.object({
  signalId: z.number().int(),
  kind: z.string(),
  severity: SignalSeveritySchema,
  topicId: z.number().int().nullable(),
  detectedAt: z.string().datetime(),
  evidenceTargets: z.array(SignalEvidenceTargetSchema).nonempty(),
});
export type SignalDetected = z.infer<typeof SignalDetectedSchema>;

// ─── Signal → Delivery (pg_notify) ────────────────────────────────────────

/**
 * Payload broadcast by Postgres `NOTIFY signals_notify, $payload` after the
 * Signal service commits a new row to `signals`.
 * The Delivery gateway fans this out to SSE subscribers on GET /v1/stream/signals.
 *
 * Shape constraints: JSON-only primitives, ≤8000 bytes (Postgres NOTIFY cap).
 */
export const SignalsNotifySchema = z.object({
  signalId: z.number().int().positive(),
  kind: z.string().min(1),
  severity: SignalSeveritySchema,
  score: z.number().nullable(),
  headline: z.string(),
  topicId: z.number().int().nullable(),
  detectedAt: z.string().datetime(),
});
export type SignalsNotify = z.infer<typeof SignalsNotifySchema>;

export const SIGNALS_NOTIFY_CHANNEL = 'signals_notify' as const;

// ─── Editorial → Delivery / Frontend ─────────────────────────────────────

/**
 * Emitted after Editorial publishes a story version.
 * Frontend consumes for briefing assembly; Delivery invalidates its cache.
 */
export const StoryPublishedSchema = z.object({
  storyId: z.string().uuid(),
  type: StoryTypeSchema,
  topicId: z.number().int().nullable(),
  entityName: z.string().nullable(),
  version: z.number().int().positive(),
  previousVersionId: z.string().uuid().nullable(),
  publishAt: z.string().datetime().nullable(),
  generatedAt: z.string().datetime(),
  generationModel: z.string(),
  /** True when this version was produced by the enrichment backfill workflow. */
  fromEnrichment: z.boolean().default(false),
});
export type StoryPublished = z.infer<typeof StoryPublishedSchema>;

/**
 * Emitted after the enrichment workflow completes context search +
 * rewrite for a story. Carries counts so consumers can decide whether
 * to re-index without loading the full story.
 */
export const StoryEnrichedSchema = z.object({
  storyId: z.string().uuid(),
  enrichmentVersion: z.number().int().positive(),
  enrichedAt: z.string().datetime(),
  /** Model used for the enrichment rewrite. */
  generationModel: z.string(),
  /** Number of external citations added. */
  externalCitationCount: z.number().int().nonnegative(),
  /** Number of content variants written (summary_short, social_twitter, etc.). */
  variantCount: z.number().int().nonnegative(),
  /** Whether schemaOrg JSON-LD was (re)generated. */
  schemaOrgGenerated: z.boolean(),
  /** Whether the story was added to or confirmed in an arc during enrichment. */
  arcId: z.number().int().nullable(),
});
export type StoryEnriched = z.infer<typeof StoryEnrichedSchema>;

/**
 * Emitted after Editorial updates a story arc — either a new story was added,
 * the arc status changed, or the AI summary was regenerated.
 */
export const ArcUpdatedSchema = z.object({
  arcId: z.number().int().positive(),
  arcSlug: z.string(),
  arcStatus: ArcStatusSchema,
  storyCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  /** The story that triggered this arc update, if any. */
  triggerStoryId: z.string().uuid().nullable(),
});
export type ArcUpdated = z.infer<typeof ArcUpdatedSchema>;

/**
 * Emitted after the variant-generation pass writes all content variants for
 * a story. Frontend briefing assembly consumes `briefing_blurb` variant.
 */
export const StoryVariantsGeneratedSchema = z.object({
  storyId: z.string().uuid(),
  variantTypes: z.array(ContentVariantTypeSchema).nonempty(),
  generationModel: z.string(),
  generatedAt: z.string().datetime(),
});
export type StoryVariantsGenerated = z.infer<typeof StoryVariantsGeneratedSchema>;

// ─── PostHog analytics event taxonomy ────────────────────────────────────
//
// Canonical event name constants shared between the browser SDK and the
// server SDK. Import the constant rather than hard-coding the string to
// catch renames at compile time.
//
// Event naming convention: <domain>:<action> (colon-separated, snake_case).

export const ANALYTICS_EVENTS = {
  // Auth
  AUTH_SIGNUP_STARTED:       'auth:signup_started',
  AUTH_SIGNUP_COMPLETED:     'auth:signup_completed',
  AUTH_LOGIN:                'auth:login',
  AUTH_LOGOUT:               'auth:logout',
  AUTH_EMAIL_VERIFIED:       'auth:email_verified',

  // Billing
  BILLING_PLAN_VIEW:         'billing:plan_view',
  BILLING_CHECKOUT_STARTED:  'billing:checkout_started',
  BILLING_CHECKOUT_COMPLETED:'billing:checkout_completed',
  BILLING_CHECKOUT_ABANDONED:'billing:checkout_abandoned',
  BILLING_UPGRADE:           'billing:upgrade',
  BILLING_DOWNGRADE:         'billing:downgrade',
  BILLING_CANCELED:          'billing:canceled',
  BILLING_TIER_CHANGED:      'billing:tier_changed',

  // API keys
  APIKEY_CREATED:            'apikey:created',
  APIKEY_REVOKED:            'apikey:revoked',
  APIKEY_ROTATED:            'apikey:rotated',
  APIKEY_COPIED_TO_CLIPBOARD:'apikey:copied_to_clipboard',

  // Quota / rate limit
  QUOTA_WARNING_80PCT:       'quota:warning_80pct',
  QUOTA_EXCEEDED:            'quota:exceeded',
  RATELIMIT_HIT:             'ratelimit:hit',

  // Reader — bookmarks + history
  BOOKMARK_ADDED:            'bookmark:added',
  BOOKMARK_REMOVED:          'bookmark:removed',
  HISTORY_OPENED:            'history:opened',
  HISTORY_CLEARED:           'history:cleared',

  // Saved searches
  SEARCH_SAVED:              'search:saved',
  SEARCH_ALERT_FIRED:        'search:alert_fired',
  SEARCH_ALERT_CLICKED:      'search:alert_clicked',

  // Story paywall
  STORY_PAYWALL_HIT:         'story:paywall_hit',
  STORY_UPGRADE_CLICKED:     'story:upgrade_clicked',
  STORY_SCROLLED_TO_END:     'story:scrolled_to_end',

  // Entity subscriptions
  SUBSCRIPTION_ENTITY_FOLLOWED:   'subscription:entity_followed',
  SUBSCRIPTION_ENTITY_UNFOLLOWED: 'subscription:entity_unfollowed',

  // Reader digest
  READER_DIGEST_OPENED:       'reader:digest_opened',
  READER_DIGEST_UNSUBSCRIBED: 'reader:digest_unsubscribed',

  // Webhooks (Pro+)
  WEBHOOK_REGISTERED: 'webhook:registered',
  WEBHOOK_DELIVERED:  'webhook:delivered',
  WEBHOOK_FAILED:     'webhook:failed',
  WEBHOOK_DISABLED:   'webhook:disabled',

  // AI Research Assistant (Pro+)
  ASSISTANT_CONVERSATION_STARTED: 'assistant:conversation_started',
  ASSISTANT_MESSAGE_SENT:         'assistant:message_sent',
  ASSISTANT_CITED_SOURCE:         'assistant:cited_source',
  ASSISTANT_EXPORTED:             'assistant:exported',

  // Dashboards (Pro+)
  DASHBOARD_CREATED: 'dashboard:created',
  DASHBOARD_VIEWED:  'dashboard:viewed',
  DASHBOARD_SHARED:  'dashboard:shared',

  // Notebooks + annotations (Pro+)
  NOTEBOOK_CREATED:   'notebook:created',
  NOTEBOOK_OPENED:    'notebook:opened',
  ANNOTATION_CREATED: 'annotation:created',

  // Exports (Pro+)
  EXPORT_REQUESTED:  'export:requested',
  EXPORT_COMPLETED:  'export:completed',
  EXPORT_FAILED:     'export:failed',

  // Workspace / Teams
  WORKSPACE_CREATED:        'workspace:created',
  WORKSPACE_MEMBER_INVITED: 'workspace:member_invited',
  WORKSPACE_MEMBER_JOINED:  'workspace:member_joined',
  WORKSPACE_ROLE_CHANGED:   'workspace:role_changed',

  // Enterprise
  ENTERPRISE_SALES_CONTACT_SUBMITTED: 'enterprise:sales_contact_submitted',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
