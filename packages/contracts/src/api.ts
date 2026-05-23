/**
 * Delivery API DTOs — request/response shapes for the public HTTP API.
 *
 * The actual route handlers live in services/delivery/src/routers/ (gateway). They
 * import these schemas to validate inputs and shape outputs.
 *
 * Convention: every endpoint has a *Schema (zod) and a *Response / *Summary / *Detail
 * (TS interface). Inputs are zod-validated at the boundary; outputs are typed because
 * we trust our own shape — no runtime guard needed on the way out.
 */

import { z } from 'zod';
import {
  StoryTypeSchema,
  SourceKindSchema,
  SignalSeveritySchema,
  ComputedArcStatusSchema,
  ContentVariantTypeSchema,
  CitationTypeSchema,
  RecordCategorySchema,
} from './enums.js';

// ─── /api/health ──────────────────────────────────────────────────────────

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  ts: string;
  checks: {
    db: 'ok' | 'fail';
    workflows: 'ok' | 'fail' | 'skipped';
  };
}

// ─── /v1/stories ─────────────────────────────────────────────────────────

export const StoryListQuerySchema = z.object({
  type: StoryTypeSchema.optional(),
  topicId: z.coerce.number().int().optional(),
  entityName: z.string().optional(),
  arcStatus: ComputedArcStatusSchema.optional(),
  enriched: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type StoryListQuery = z.infer<typeof StoryListQuerySchema>;

export interface StorySummary {
  id: string;
  slug: string | null;
  type: z.infer<typeof StoryTypeSchema>;
  topicId: number | null;
  topicName: string | null;
  headline: string | null;
  synopsis: string | null;
  keyTakeaways: string[] | null;
  entityName: string | null;
  /**
   * Derived operational state — 'breaking' when the LLM intent is breaking AND
   * the story is <=48h old; 'developing' when the arc or signal corpus is still
   * live. null when neither.
   */
  arcStatus: z.infer<typeof ComputedArcStatusSchema> | null;
  readingTimeSeconds: number | null;
  wordCount: number | null;
  version: number;
  generatedAt: string;
  publishAt: string | null;
  enrichedAt: string | null;
  /** Distinct source platform keys for the records that fed this story. */
  sourcePlatforms: string[];
}

/**
 * Signal provenance carried onto a story.
 *
 * A story is produced from a triggering signal (novelty / velocity /
 * divergence / trend_google_trends). This object surfaces why AIDRAN
 * flagged the story and how confident the detector was.
 *
 * `confidence` is a fixed mapping from the signal's `severity`:
 *   low → 0.4, medium → 0.7, high → 0.9
 */
export interface StorySignalProvenance {
  /** signals.id of the triggering signal. */
  signalId: number;
  /** signals.kind — 'novelty' | 'velocity' | 'divergence' | 'trend_google_trends' | … */
  kind: string;
  severity: z.infer<typeof SignalSeveritySchema>;
  /** signals.score (numeric, nullable) — the raw detector score, if any. */
  score: number | null;
  /** ISO-8601 — signals.detected_at. */
  detectedAt: string;
  /** Derived confidence in [0, 1]. Mapped from severity. */
  confidence: number;
}

export interface StoryDetail extends StorySummary {
  content: string;
  /**
   * Why AIDRAN flagged this story + detector confidence.
   * Optional: absent on older stories and stubs without a resolvable
   * triggering signal.
   */
  signalProvenance?: StorySignalProvenance | null;
  sections: Array<{
    order: number;
    heading: string | null;
    body: string;
    sectionType: string;
  }> | null;
  arcSummary: string | null;
  difficultyLevel: string | null;
  faq: Array<{ order: number; question: string; answer: string }> | null;
  schemaOrg: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  sourceRecordIds: string[] | null;
  previousVersionId: string | null;
  expiresAt: string | null;
  active: boolean;
  generationModel: string;
  enrichmentVersion: number;
}

export interface StoryListResponse {
  items: StorySummary[];
  nextCursor: string | null;
}

// ─── /v1/stories/:id/citations ────────────────────────────────────────────

export interface StoryCitationItem {
  id: string;
  marker: number | null;
  citationType: z.infer<typeof CitationTypeSchema>;
  // internal citation
  recordId: string | null;
  // external citation
  externalUrl: string | null;
  domain: string | null;
  fetchedAt: string | null;
  title: string | null;
  excerpt: string | null;
  aiClaim: string | null;
  factType: string | null;
  credibilityScore: number | null;
  platform: string | null;
  inferred: boolean;
  confidence: number | null;
  position: number;
}

export interface StoryCitationsResponse {
  storyId: string;
  citations: StoryCitationItem[];
  internalCount: number;
  externalCount: number;
}

// ─── /v1/stories/:id/related ──────────────────────────────────────────────

export interface StoryRelatedItem {
  relatedId: string;
  relationshipType: string;
  aiReason: string | null;
  similarityScore: number | null;
  computedAt: string;
  story: StorySummary;
}

export interface StoryRelatedResponse {
  storyId: string;
  related: StoryRelatedItem[];
}

// ─── /v1/stories/:id/variants ─────────────────────────────────────────────

export interface StoryVariantItem {
  variantType: z.infer<typeof ContentVariantTypeSchema>;
  content: string;
  generationModel: string;
  generatedAt: string;
}

export interface StoryVariantsResponse {
  storyId: string;
  variants: StoryVariantItem[];
}

// ─── /v1/arcs ─────────────────────────────────────────────────────────────

export const ArcListQuerySchema = z.object({
  topicId: z.coerce.number().int().optional(),
  arcStatus: ComputedArcStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type ArcListQuery = z.infer<typeof ArcListQuerySchema>;

export interface ArcSummary {
  id: number;
  slug: string;
  topicId: number | null;
  title: string;
  tldr: string | null;
  /**
   * Derived from the newest non-stub member story's computed arc status.
   * null when the arc has no live members.
   */
  arcStatus: z.infer<typeof ComputedArcStatusSchema> | null;
  storyCount: number;
  firstStoryAt: string | null;
  lastStoryAt: string | null;
}

export interface ArcDetail extends ArcSummary {
  summary: string | null;
  generationModel: string;
  stories: StorySummary[];
}

export interface ArcListResponse extends CursorPage<ArcSummary> {}

// ─── /v1/records ─────────────────────────────────────────────────────────

export const RecordListQuerySchema = z.object({
  kind: SourceKindSchema.optional(),
  topicId: z.coerce.number().int().optional(),
  entityId: z.coerce.number().int().optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional(),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type RecordListQuery = z.infer<typeof RecordListQuerySchema>;

export interface RecordSummary {
  id: string;
  kind: z.infer<typeof SourceKindSchema>;
  externalId: string;
  title: string | null;
  url: string | null;
  author: string | null;
  publishedAt: string | null;
  capturedAt: string;
  sentimentLabel: string | null;
  sentimentScore: string | null;
  // Optional enrichment fields
  category?: z.infer<typeof RecordCategorySchema>;
  contentType?: string;
  publisher?: string | null;
  subreddit?: string | null;
  excerpt?: string | null;
  emotionalRegister?: string | null;
  keyPhrases?: string[];
  engagementScore?: number | null;
  topics?: { id: number; displayName: string }[];
  topEntity?: { name: string; salience: number | null } | null;
  hasDispatch?: boolean;
}

export interface RecordListResponse {
  items: RecordSummary[];
  nextCursor: string | null;
}

// ─── /api/search ──────────────────────────────────────────────────────────

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  scope: z.enum(['stories', 'records', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export interface SearchHit {
  kind: 'story' | 'record';
  id: string;
  score: number;
  headline: string | null;
  snippet: string;
}

export interface SearchResponse {
  hits: SearchHit[];
}

// ─── Error envelope ───────────────────────────────────────────────────────

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ─── Cursor pagination ────────────────────────────────────────────────────

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

// ─── /v1/records (extended) ───────────────────────────────────────────────

export const RecordListQueryExtSchema = z.object({
  kind: SourceKindSchema.optional(),
  content_type: z.enum(['post', 'comment', 'article']).optional(),
  topicId: z.coerce.number().int().positive().optional(),
  entityId: z.coerce.number().int().positive().optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  min_sentiment: z.coerce.number().min(-1).max(1).optional(),
  max_sentiment: z.coerce.number().min(-1).max(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type RecordListQueryExt = z.infer<typeof RecordListQueryExtSchema>;

export interface RecordDetail extends RecordSummary {
  contentType: string;
  contentText: string | null;
  subreddit: string | null;
  language: string | null;
  sourceMetadata: Record<string, unknown>;
}

export interface RecordEmbeddingResponse {
  recordId: string;
  modelName: string;
  dimensions: number;
  vector: number[];
}

export interface RecordEntityItem {
  entityId: number;
  name: string;
  type: string;
  confidence: number | null;
}

export interface RecordEntitiesResponse {
  recordId: string;
  entities: RecordEntityItem[];
}

export interface RecordTopicItem {
  topicId: number;
  topicName: string;
  method: string;
  confidence: number | null;
}

export interface RecordTopicsResponse {
  recordId: string;
  topics: RecordTopicItem[];
}

export interface RecordSignalsResponse {
  recordId: string;
  signals: SignalSummary[];
}

export interface RecordStoriesResponse {
  recordId: string;
  stories: StorySummary[];
}

// ─── /v1/stories (extended) ───────────────────────────────────────────────

export const StoryListQueryExtSchema = z.object({
  topic_id: z.coerce.number().int().optional(),
  entity_id: z.coerce.number().int().optional(),
  story_type: StoryTypeSchema.optional(),
  arc_status: ComputedArcStatusSchema.optional(),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type StoryListQueryExt = z.infer<typeof StoryListQueryExtSchema>;

export const StoryCountQueryExtSchema = StoryListQueryExtSchema.omit({
  limit: true,
  cursor: true,
});
export type StoryCountQueryExt = z.infer<typeof StoryCountQueryExtSchema>;

export interface StoryVersionItem {
  id: string;
  version: number;
  headline: string | null;
  generatedAt: string;
  active: boolean;
}

export interface StorySourceRecord {
  recordId: string;
  kind: string;
  title: string | null;
  url: string | null;
  publishedAt: string | null;
  excerpt: string | null;
  byline: string | null;
  sentimentScore: number | null;
  inferred: boolean;
  confidence: number | null;
  credibilityScore: number | null;
}

/**
 * External citation — a story_citations row with `citation_type='external'`.
 *
 * Distinct from {@link StorySourceRecord}, which represents a corpus
 * `records` row referenced by the story. External citations are web URLs
 * discovered by the Editorial enrichment step. They have no backing corpus
 * record and therefore no `recordId`, `kind`, `byline`, or `sentimentScore`.
 */
export interface StoryExternalCitation {
  externalUrl: string;
  domain: string | null;
  anchorText: string | null;
  title: string | null;
  excerpt: string | null;
  aiClaim: string | null;
  factType: string | null;
  platform: string | null;
  inferred: boolean;
  confidence: number | null;
  credibilityScore: number | null;
  fetchedAt: string | null;
}

/**
 * Response envelope for `GET /v1/stories/:id/sources`.
 *
 * `sources` lists corpus-records cited by the story. `externalCitations` lists
 * story_citations rows of type `external` — web URLs that have no backing
 * corpus record.
 */
export interface StorySourcesResponse {
  storyId: string;
  sources: StorySourceRecord[];
  externalCitations?: StoryExternalCitation[];
}

export interface StorySeoResponse {
  storyId: string;
  seoTitle: string | null;
  seoDescription: string | null;
  version: number;
  source: string;
}

// ─── /v1/seo ─────────────────────────────────────────────────────────────

export const SeoPageTypeSchema = z.enum(['story', 'beat', 'entity', 'arc', 'static']);
export type SeoPageType = z.infer<typeof SeoPageTypeSchema>;

export const SeoMetadataQuerySchema = z.object({
  pageType: SeoPageTypeSchema,
  pageId: z.string().min(1),
});
export type SeoMetadataQuery = z.infer<typeof SeoMetadataQuerySchema>;

export interface SeoMetadataResponse {
  pageType: SeoPageType;
  pageId: string;
  seoTitle: string | null;
  seoDescription: string | null;
  version: number;
  source: string;
  sourceDetail: Record<string, unknown> | null;
  createdAt: string | null;
}

export const SeoTitleSchema = z.string().min(10).max(45);
export const SeoDescriptionSchema = z.string().min(50).max(145);
export const SeoOgTitleSchema = z.string().min(1).max(70);
export const SeoOgDescriptionSchema = z.string().min(1).max(200);
export const SeoOgImageUrlSchema = z.string().url().max(2_048);
export const SeoKeywordsSchema = z.array(z.string().min(1)).min(5).max(10);
export const SeoJsonLdSchema = z.record(z.unknown()).nullable();

export const SeoSourceDetailSchema = z
  .object({
    narrativeId: z.string().uuid().optional(),
    storyId: z.string().uuid().optional(),
    seoPromptVersion: z.string().min(1).optional(),
    keywords: SeoKeywordsSchema.optional(),
    ogTitle: SeoOgTitleSchema.optional(),
    ogDescription: SeoOgDescriptionSchema.optional(),
    ogImageUrl: SeoOgImageUrlSchema.optional(),
    ogImage: SeoOgImageUrlSchema.optional(),
    jsonLd: SeoJsonLdSchema.optional(),
    schemaOrg: SeoJsonLdSchema.optional(),
    parameters: z.record(z.unknown()).optional(),
  })
  .passthrough();
export type SeoSourceDetail = z.infer<typeof SeoSourceDetailSchema>;

export const SeoExplorerListQuerySchema = z.object({
  q: z.string().min(1).max(200).optional(),
  pageType: SeoPageTypeSchema.optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type SeoExplorerListQuery = z.infer<typeof SeoExplorerListQuerySchema>;

export const SeoExplorerParamsSchema = z.object({
  pageType: SeoPageTypeSchema,
  pageId: z.string().min(1),
});
export type SeoExplorerParams = z.infer<typeof SeoExplorerParamsSchema>;

export const SeoExplorerUpdateRequestSchema = z.object({
  seoTitle: SeoTitleSchema.optional(),
  seoDescription: SeoDescriptionSchema.optional(),
  keywords: SeoKeywordsSchema.optional(),
  ogTitle: SeoOgTitleSchema.optional(),
  ogDescription: SeoOgDescriptionSchema.optional(),
  ogImageUrl: SeoOgImageUrlSchema.optional(),
  jsonLd: SeoJsonLdSchema.optional(),
  schemaOrg: SeoJsonLdSchema.optional(),
  sourceDetail: SeoSourceDetailSchema.optional(),
  expectedVersion: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});
export type SeoExplorerUpdateRequest = z.infer<typeof SeoExplorerUpdateRequestSchema>;

export const SeoSerpQuerySchema = z.object({
  q: z.string().min(1).max(200),
  engine: z.string().min(1).max(32).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
export type SeoSerpQuery = z.infer<typeof SeoSerpQuerySchema>;

export type SeoExplorerFieldStatus = 'missing' | 'too_short' | 'ok' | 'too_long';

export interface SeoExplorerTextDiagnostic {
  length: number;
  min: number;
  max: number;
  status: SeoExplorerFieldStatus;
}

export interface SeoExplorerKeywordDiagnostic {
  count: number;
  min: number;
  max: number;
  status: SeoExplorerFieldStatus;
}

export interface SeoExplorerDiagnostics {
  seoTitle: SeoExplorerTextDiagnostic;
  seoDescription: SeoExplorerTextDiagnostic;
  ogTitle: SeoExplorerTextDiagnostic;
  ogDescription: SeoExplorerTextDiagnostic;
  keywords: SeoExplorerKeywordDiagnostic;
  sourceDetailParseError: string | null;
}

export interface SeoExplorerItem {
  id: number | null;
  pageType: SeoPageType;
  pageId: string;
  seoTitle: string | null;
  seoDescription: string | null;
  keywords: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  jsonLd: Record<string, unknown> | null;
  schemaOrg: Record<string, unknown> | null;
  version: number;
  active: boolean;
  source: string;
  sourceDetail: SeoSourceDetail | Record<string, unknown> | null;
  sourceDetailRaw: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  diagnostics: SeoExplorerDiagnostics;
}

export interface SeoExplorerListResponse extends CursorPage<SeoExplorerItem> {}

export interface SeoExplorerDetailResponse {
  item: SeoExplorerItem;
  writeBoundary: {
    status: 'implemented' | 'external';
    owner: 'delivery' | 'editorial';
    message: string;
  };
}

export interface SeoSerpResult {
  title: string;
  url: string;
  displayUrl: string | null;
  domain: string | null;
  snippet: string;
  engine: string;
  rank: number | null;
  position: number;
  type: string | null;
  isAd: boolean;
}

export interface SeoSerpResponse {
  provider: 'openserp';
  configured: boolean;
  query: string;
  engine: string;
  limit: number;
  results: SeoSerpResult[];
  warning: string | null;
}

export const SitemapPageStatsQuerySchema = z.object({
  page_size: z.coerce.number().int().min(1).max(50_000).default(50_000),
});
export type SitemapPageStatsQuery = z.infer<typeof SitemapPageStatsQuerySchema>;

// ─── /api/webhooks (management DTOs) ─────────────────────────────────────

import { WEBHOOK_EVENT_TYPES } from './webhooks.js';

/** Request body for POST /api/webhooks (register new endpoint). */
export const CreateWebhookEndpointRequestSchema = z.object({
  /** HTTPS URL the delivery service POSTs to. Must start with https://. */
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), 'Endpoint URL must use HTTPS'),
  /** Event types to subscribe to. At least one required. */
  events: z
    .array(z.enum(WEBHOOK_EVENT_TYPES))
    .min(1, 'Subscribe to at least one event type'),
});
export type CreateWebhookEndpointRequest = z.infer<typeof CreateWebhookEndpointRequestSchema>;

/** Summary row returned in list and create responses. Secret is NEVER returned after creation. */
export interface WebhookEndpointSummary {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  failureCount: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
}

/** Response from POST /api/webhooks — secret included only here, shown once. */
export interface CreateWebhookEndpointResponse {
  endpoint: WebhookEndpointSummary;
  /** Signing secret for HMAC-SHA256. Shown exactly once — store it now. */
  secret: string;
}

/** Response from GET /api/webhooks */
export interface WebhookEndpointListResponse {
  endpoints: WebhookEndpointSummary[];
}

/** One row in the delivery log. */
export interface WebhookDeliverySummary {
  id: string;
  endpointId: string;
  eventType: string;
  statusCode: number | null;
  attempt: number;
  deliveredAt: string | null;
  nextRetryAt: string | null;
  createdAt: string;
}

/** Response from GET /api/webhooks/[id]/deliveries */
export interface WebhookDeliveryListResponse {
  deliveries: WebhookDeliverySummary[];
  nextCursor: string | null;
}

/** Query params for delivery log. */
export const WebhookDeliveryListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});
export type WebhookDeliveryListQuery = z.infer<typeof WebhookDeliveryListQuerySchema>;

/** Response from POST /api/webhooks/[id]/test */
export interface WebhookTestResponse {
  deliveryId: string;
  message: string;
}

export interface SitemapPageStatsRecord {
  page: number;
  offset: number;
  count: number;
  lastmod: string;
}

export interface SitemapPageStatsResponse {
  total: number;
  pageSize: number;
  pages: SitemapPageStatsRecord[];
}

export interface StorySlugRecord {
  slug: string;
  updatedAt: string;
}

export interface ListStorySlugsResponse {
  items: StorySlugRecord[];
}

// ─── /v1/signals ─────────────────────────────────────────────────────────

export const SignalListQuerySchema = z.object({
  kind: z.string().optional(),
  topic_id: z.coerce.number().int().optional(),
  entity_id: z.coerce.number().int().optional(),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type SignalListQuery = z.infer<typeof SignalListQuerySchema>;

export const SignalFeedQuerySchema = z.object({
  window_hours: z.coerce.number().int().min(1).max(168).default(24),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type SignalFeedQuery = z.infer<typeof SignalFeedQuerySchema>;

export interface SignalEvidenceItem {
  id: string;
  target: 'record' | 'entity' | 'topic' | 'story';
  recordId: string | null;
  entityId: number | null;
  topicId: number | null;
  storyId: string | null;
  weight: number | null;
}

export interface SignalSummary {
  id: number;
  kind: string;
  topicId: number | null;
  severity: string;
  headline: string;
  score: number | null;
  detectedAt: string;
  acknowledged: boolean;
  detail?: Record<string, unknown>;
}

export interface SignalDetail extends SignalSummary {
  detail: Record<string, unknown>;
  dedupKey: string | null;
  evidence: SignalEvidenceItem[];
}

export interface SignalListResponse extends CursorPage<SignalSummary> {}

// ─── /v1/topics ──────────────────────────────────────────────────────────

export const TopicListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type TopicListQuery = z.infer<typeof TopicListQuerySchema>;

export interface TopicSummary {
  id: number;
  slug: string;
  name: string;
  displayName: string;
  description: string | null;
  cluster: string | null;
  recordCount: number;
  activeStoryCount: number;
  lastRecordAt: string | null;
}

export interface TopicDetail extends TopicSummary {
  keywords: string[];
  active: boolean;
  recentRecords: RecordSummary[];
}

export interface TopicListResponse extends CursorPage<TopicSummary> {}

// ─── /v1/topics/:id/entities + /v1/topics/:id/sentiment ──────────────────

export interface TopicEntityEntry {
  entityId: number;
  slug: string;
  canonicalPath: string;
  name: string;
  type: string;
  mentionCount: number;
}

export interface TopicEntityResponse {
  topicId: number;
  entities: TopicEntityEntry[];
}

export interface TopicSentimentEntry {
  kind: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface TopicSentimentResponse {
  topicId: number;
  windowDays: number;
  sentiment: TopicSentimentEntry[];
}

// ─── /v1/entities ────────────────────────────────────────────────────────

/**
 * Sort modes for /v1/entities.
 *
 * - `last_seen` (default): ordered by `last_seen DESC, id DESC` (recency).
 * - `mentions_desc`: ordered by `mention_count DESC, id DESC` (corpus presence).
 */
export const ENTITY_SORT_MODES = ['last_seen', 'mentions_desc'] as const;
export type EntitySortMode = (typeof ENTITY_SORT_MODES)[number];

export const EntityListQuerySchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sort: z.enum(ENTITY_SORT_MODES).optional().default('last_seen'),
  minMentions: z.coerce.number().int().min(0).optional().default(0),
});
export type EntityListQuery = z.infer<typeof EntityListQuerySchema>;

export const EntitySlugListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50_000).default(1_000),
  offset: z.coerce.number().int().min(0).default(0),
});
export type EntitySlugListQuery = z.infer<typeof EntitySlugListQuerySchema>;

export interface MentionTimelineEntry {
  date: string;
  count: number;
}

export interface EntitySummary {
  id: number;
  slug: string;
  canonicalPath: string;
  name: string;
  type: string;
  mentionCount: number;
  firstSeen: string;
  lastSeen: string;
  updatedAt: string;
  sourceMix: EntitySourceMixEntry[];
  growthFactor: number | null;
  recentMentions: number;
  lede: string;
}

export interface EntityRelatedEntry extends EntitySummary {
  sharedRecordCount: number;
}

export interface EntityTopicMixEntry {
  topicId: number;
  slug: string;
  name: string;
  displayName: string;
  recordCount: number;
}

export interface EntitySourceMixEntry {
  kind: string;
  recordCount: number;
}

export interface EntitySentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
  unknown: number;
}

export interface EntitySentimentTrendEntry {
  weekStart: string;
  avgScore: number | null;
  sampleSize: number;
}

export interface EntityStoryArcEntry {
  id: string;
  title: string;
  arcStatus: z.infer<typeof ComputedArcStatusSchema> | null;
  storyCount: number;
  lastUpdatedAt: string;
}

export interface EntitySourceDiversity {
  distinctSources: number;
  /** Herfindahl-Hirschman Index in [0, 10000]. Lower = more diverse. */
  herfindahlIndex: number;
}

export interface EntityProminenceRank {
  /** Percentile rank 0–100 within all entities of the same type. Null when sampleSize < 5. */
  withinType: number | null;
  sampleSize: number;
}

export interface EntityDetail extends EntitySummary {
  mentionTimeline: MentionTimelineEntry[];
  recentRecords: RecordSummary[];
  recentStories: StorySummary[];
  directSignals: SignalSummary[];
  relatedEntities: EntityRelatedEntry[];
  topicMix: EntityTopicMixEntry[];
  sentimentDistribution: EntitySentimentDistribution;
  sentimentTrend: EntitySentimentTrendEntry[];
  storyArcs: EntityStoryArcEntry[];
  sourceDiversity: EntitySourceDiversity;
  prominenceRank: EntityProminenceRank;
  noveltyActive: boolean;
  growthFactor: number;
  recentMentions: number;
  baselineMentions: number;
}

export interface EntityListResponse extends CursorPage<EntitySummary> {}

export interface EntitySlugRecord {
  id: number;
  slug: string;
  canonicalPath: string;
  name: string;
  type: string;
  mentionCount: number;
  lastSeen: string;
  updatedAt: string;
}

export interface EntitySlugListResponse {
  items: EntitySlugRecord[];
  total: number;
  offset: number;
  limit: number;
  nextOffset: number | null;
}

export type EntitySlugLookupResponse =
  | { kind: 'entity'; entity: EntityDetail }
  | { kind: 'disambiguation'; slug: string; matches: EntitySummary[] };

// ─── /v1/sources ─────────────────────────────────────────────────────────

export interface SourceStats {
  id: number;
  kind: string;
  name: string;
  enabled: boolean;
  totalRecords: number;
  last24hRecords: number;
  last7dRecords: number;
}

export interface SourceListResponse {
  sources: SourceStats[];
}

// ─── /v1/search (extended) ───────────────────────────────────────────────

export const SearchQueryExtSchema = z.object({
  query: z.string().min(1).max(500),
  filters: z
    .object({
      kind: SourceKindSchema.optional(),
      since: z.string().datetime().optional(),
      topic_id: z.coerce.number().int().optional(),
    })
    .optional(),
  top_k: z.coerce.number().int().min(1).max(100).default(10),
  target: z.enum(['records', 'stories', 'entities', 'primary', 'all']).default('all'),
});
export type SearchQueryExt = z.infer<typeof SearchQueryExtSchema>;

export const SimilarQuerySchema = z.object({
  record_id: z.string().optional(),
  embedding: z.array(z.number().finite()).min(1).max(2048).optional(),
  top_k: z.coerce.number().int().min(1).max(100).default(10),
});
export type SimilarQuery = z.infer<typeof SimilarQuerySchema>;

export interface SearchHitExt {
  kind: 'record' | 'story' | 'citation' | 'entity' | 'topic';
  id: string;
  href: string | null;
  score: number;
  headline: string | null;
  snippet: string;
  sourceKind: string | null;
  topicId: number | null;
  topicName: string | null;
  topicDisplayName: string | null;
  topicCluster: string | null;
  subreddit: string | null;
  sentimentLabel: string | null;
  publishedAt: string | null;
}

export interface SearchResponseExt {
  hits: SearchHitExt[];
  total: number;
  searchType: 'vector' | 'keyword' | 'hybrid';
  embeddingMs: number | null;
  searchMs: number;
}

// ─── /v1/search/quick ────────────────────────────────────────────────────

export const QuickSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});
export type QuickSearchQuery = z.infer<typeof QuickSearchQuerySchema>;

export interface QuickSearchHit {
  type: 'topic' | 'story' | 'record' | 'entity';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  score: number;
}

export interface QuickSearchResponse {
  hits: QuickSearchHit[];
  searchType: 'vector' | 'keyword';
}

// ─── /v1/stats ───────────────────────────────────────────────────────────

export interface StatsTimelineEntry {
  date: string;
  count: number;
}

export interface SentimentTimelineEntry {
  date: string;
  kind: string;
  avgScore: number;
  recordCount: number;
}

export interface TrendingEntityEntry {
  entityId: number;
  slug: string;
  canonicalPath: string;
  name: string;
  type: string;
  recentMentions: number;
  baselineMentions: number;
  growthFactor: number;
}

export interface TopicDistributionEntry {
  topicId: number;
  topicName: string;
  recordCount: number;
  share: number;
}

// ─── /v1 index ───────────────────────────────────────────────────────────

export interface ApiIndexResponse {
  version: string;
  routers: string[];
  openapi: string;
}

// ─── API key management DTOs ──────────────────────────────────────────────

export const API_KEY_SCOPES = [
  'read:corpus',
  'read:user',
  'write:bookmarks',
] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export interface ApiKeySummary {
  id: string;
  name: string;
  /** First 8 chars of the key — never the full secret. */
  prefix: string;
  scopes: ApiKeyScope[];
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export interface ApiKeyListResponse {
  keys: ApiKeySummary[];
  /** Total active key count for the workspace. */
  activeCount: number;
  /** Tier limit for active keys (null = unlimited). */
  activeLimit: number | null;
}

export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1).default(['read:corpus']),
  expiresAt: z.string().datetime().nullable().optional(),
});
export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;

export interface CreateApiKeyResponse {
  key: ApiKeySummary;
  /**
   * Full secret — shown ONCE at creation. The caller must copy it immediately.
   * Never stored; the DB only holds the hashed value.
   */
  secret: string;
}

// ─── /api/usage/me — per-session quota status ─────────────────────────────

export interface UsageMeResponse {
  tier: string;
  dailyQuotaLimit: number | null;
  dailyQuotaUsed: number;
  dailyQuotaRemaining: number | null;
  perMinuteLimit: number | null;
  resetAt: string;
}

// ─── /v1/bookmarks ────────────────────────────────────────────────────────

export const BookmarkTargetKindSchema = z.enum(['story', 'entity', 'topic', 'arc', 'record']);
export type BookmarkTargetKind = z.infer<typeof BookmarkTargetKindSchema>;

export const CreateBookmarkRequestSchema = z.object({
  targetKind: BookmarkTargetKindSchema,
  targetId: z.string().min(1),
  note: z.string().max(1000).optional(),
});
export type CreateBookmarkRequest = z.infer<typeof CreateBookmarkRequestSchema>;

export interface BookmarkSummary {
  id: string;
  workspaceId: string;
  targetKind: BookmarkTargetKind;
  targetId: string;
  note: string | null;
  addedByUserId: string;
  createdAt: string;
}

export interface ListBookmarksResponse extends CursorPage<BookmarkSummary> {}

export interface DeleteBookmarkResponse {
  id: string;
  deleted: boolean;
}

// ─── /v1/saved-searches ───────────────────────────────────────────────────

export const SavedSearchAlertChannelSchema = z.enum(['email', 'web_push', 'webhook', 'slack', 'teams']);
export type SavedSearchAlertChannel = z.infer<typeof SavedSearchAlertChannelSchema>;

export const SavedSearchAlertCadenceSchema = z.enum(['instant', 'daily', 'weekly']);
export type SavedSearchAlertCadence = z.infer<typeof SavedSearchAlertCadenceSchema>;

export const CreateSavedSearchRequestSchema = z.object({
  name: z.string().min(1).max(200),
  query: z.string().min(1).max(500),
  filters: z.record(z.unknown()).optional(),
  alertChannels: z.array(SavedSearchAlertChannelSchema).optional(),
  alertCadence: SavedSearchAlertCadenceSchema.optional(),
});
export type CreateSavedSearchRequest = z.infer<typeof CreateSavedSearchRequestSchema>;

export interface SavedSearchSummary {
  id: string;
  workspaceId: string;
  name: string;
  query: string;
  filters: Record<string, unknown> | null;
  alertChannels: SavedSearchAlertChannel[];
  alertCadence: SavedSearchAlertCadence | null;
  lastRunAt: string | null;
  lastFiredAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface ListSavedSearchesResponse extends CursorPage<SavedSearchSummary> {}

// ─── /v1/entity-subscriptions ─────────────────────────────────────────────

export const CreateEntitySubscriptionRequestSchema = z.object({
  entityId: z.number().int().positive(),
  cadence: SavedSearchAlertCadenceSchema.optional(),
});
export type CreateEntitySubscriptionRequest = z.infer<typeof CreateEntitySubscriptionRequestSchema>;

export interface EntitySubscriptionSummary {
  id: string;
  workspaceId: string;
  userId: string;
  entityId: number;
  entityName: string;
  entitySlug: string;
  cadence: SavedSearchAlertCadence | null;
  createdAt: string;
}

export interface ListEntitySubscriptionsResponse extends CursorPage<EntitySubscriptionSummary> {}

// ─── /v1/notebooks ───────────────────────────────────────────────────────

export const CreateNotebookRequestSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.record(z.unknown()).optional(),
});
export type CreateNotebookRequest = z.infer<typeof CreateNotebookRequestSchema>;

export const UpdateNotebookRequestSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.record(z.unknown()).optional(),
});
export type UpdateNotebookRequest = z.infer<typeof UpdateNotebookRequestSchema>;

export interface NotebookSummary {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookDetail extends NotebookSummary {
  /** Block-based content document (Tiptap/Plate JSON). */
  content: Record<string, unknown> | null;
}

export interface ListNotebooksResponse extends CursorPage<NotebookSummary> {}

// ─── /v1/annotations ─────────────────────────────────────────────────────

export const CreateAnnotationRequestSchema = z.object({
  targetKind: z.enum(['story', 'record', 'entity']),
  targetId: z.string().min(1),
  selector: z.record(z.unknown()).optional(),
  body: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
});
export type CreateAnnotationRequest = z.infer<typeof CreateAnnotationRequestSchema>;

export interface AnnotationSummary {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  targetKind: string;
  targetId: string;
  selector: Record<string, unknown> | null;
  body: string;
  parentId: string | null;
  createdAt: string;
}

export interface ListAnnotationsResponse extends CursorPage<AnnotationSummary> {}

// ─── /v1/dashboards ──────────────────────────────────────────────────────

export const CreateDashboardRequestSchema = z.object({
  title: z.string().min(1).max(200),
  layout: z.record(z.unknown()).optional(),
  widgets: z.array(z.record(z.unknown())).optional(),
});
export type CreateDashboardRequest = z.infer<typeof CreateDashboardRequestSchema>;

export const UpdateDashboardRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  layout: z.record(z.unknown()).optional(),
  widgets: z.array(z.record(z.unknown())).optional(),
});
export type UpdateDashboardRequest = z.infer<typeof UpdateDashboardRequestSchema>;

export interface DashboardSummary {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardDetail extends DashboardSummary {
  layout: Record<string, unknown> | null;
  widgets: Record<string, unknown>[];
}

export interface ListDashboardsResponse extends CursorPage<DashboardSummary> {}

// ─── /v1/exports ─────────────────────────────────────────────────────────

export const ExportKindSchema = z.enum([
  'bookmarks',
  'reading_history',
  'saved_search_results',
  'notebook',
  'annotations',
]);
export type ExportKind = z.infer<typeof ExportKindSchema>;

export const CreateExportRequestSchema = z.object({
  kind: ExportKindSchema,
  params: z.record(z.unknown()).optional(),
});
export type CreateExportRequest = z.infer<typeof CreateExportRequestSchema>;

export interface ExportRequestSummary {
  id: string;
  workspaceId: string;
  userId: string;
  kind: ExportKind;
  params: Record<string, unknown> | null;
  rowCount: number | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  fileUrl: string | null;
}

export interface CreateExportResponse {
  export: ExportRequestSummary;
}

export interface ListExportsResponse extends CursorPage<ExportRequestSummary> {}
