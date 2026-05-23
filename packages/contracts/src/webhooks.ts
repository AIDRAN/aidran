/**
 * Webhook event payload schemas.
 *
 * These are the shapes delivered to user-registered webhook endpoints (Pro+).
 * Every delivery is HMAC-SHA256 signed with the endpoint secret; the signature
 * is placed in the `X-AIDRAN-Signature` header as `sha256=<hex>`.
 *
 * Idempotency: each event envelope carries an `idempotency_key` (UUID v4).
 * Receivers SHOULD deduplicate on this key — retries re-use the same key.
 *
 * Envelope shape:
 *   { id, event_type, created_at, idempotency_key, data: <payload> }
 *
 * `event_type` values match the webhook event names used when registering
 * endpoint subscriptions (`webhook_endpoints.events` column).
 */

import { z } from 'zod';

// ─── Shared envelope ──────────────────────────────────────────────────────

/**
 * Base envelope fields present on every delivered webhook event.
 * The `data` field is event-type–specific.
 */
const WebhookEnvelopeBaseSchema = z.object({
  /** UUID v4 — unique identifier for this delivery attempt row. */
  id: z.string().uuid(),
  /** ISO-8601 timestamp at which the event was created (not delivered). */
  created_at: z.string().datetime(),
  /**
   * Stable UUID v4 generated at event creation time.
   * Unchanged across retries — use this to deduplicate on the receiver side.
   */
  idempotency_key: z.string().uuid(),
});

// ─── story.published ──────────────────────────────────────────────────────

export const StoryPublishedEventDataSchema = z.object({
  story_id: z.string().uuid(),
  slug: z.string().nullable(),
  headline: z.string().nullable(),
  type: z.string(),
  topic_id: z.number().int().nullable(),
  topic_name: z.string().nullable(),
  entity_name: z.string().nullable(),
  arc_status: z.enum(['breaking', 'developing']).nullable(),
  version: z.number().int().positive(),
  generated_at: z.string().datetime(),
  publish_at: z.string().datetime().nullable(),
});
export type StoryPublishedEventData = z.infer<typeof StoryPublishedEventDataSchema>;

export const StoryPublishedEventSchema = WebhookEnvelopeBaseSchema.extend({
  event_type: z.literal('story.published'),
  data: StoryPublishedEventDataSchema,
});
export type StoryPublishedEvent = z.infer<typeof StoryPublishedEventSchema>;

// ─── signal.detected ─────────────────────────────────────────────────────

export const SignalDetectedEventDataSchema = z.object({
  signal_id: z.number().int().positive(),
  kind: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  score: z.number().nullable(),
  headline: z.string(),
  topic_id: z.number().int().nullable(),
  topic_name: z.string().nullable(),
  detected_at: z.string().datetime(),
});
export type SignalDetectedEventData = z.infer<typeof SignalDetectedEventDataSchema>;

export const SignalDetectedEventSchema = WebhookEnvelopeBaseSchema.extend({
  event_type: z.literal('signal.detected'),
  data: SignalDetectedEventDataSchema,
});
export type SignalDetectedEvent = z.infer<typeof SignalDetectedEventSchema>;

// ─── entity.mentioned ────────────────────────────────────────────────────

export const EntityMentionedEventDataSchema = z.object({
  entity_id: z.number().int().positive(),
  entity_name: z.string(),
  entity_type: z.string(),
  entity_slug: z.string(),
  /** The record that triggered the entity mention. */
  record_id: z.string(),
  record_kind: z.string(),
  record_title: z.string().nullable(),
  record_url: z.string().url().nullable(),
  published_at: z.string().datetime().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
});
export type EntityMentionedEventData = z.infer<typeof EntityMentionedEventDataSchema>;

export const EntityMentionedEventSchema = WebhookEnvelopeBaseSchema.extend({
  event_type: z.literal('entity.mentioned'),
  data: EntityMentionedEventDataSchema,
});
export type EntityMentionedEvent = z.infer<typeof EntityMentionedEventSchema>;

// ─── arc.updated ─────────────────────────────────────────────────────────

export const ArcUpdatedEventDataSchema = z.object({
  arc_id: z.number().int().positive(),
  arc_slug: z.string(),
  arc_title: z.string(),
  arc_status: z.string(),
  story_count: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
  /** The story that triggered this arc update, if any. */
  trigger_story_id: z.string().uuid().nullable(),
  trigger_story_headline: z.string().nullable(),
});
export type ArcUpdatedEventData = z.infer<typeof ArcUpdatedEventDataSchema>;

export const ArcUpdatedEventSchema = WebhookEnvelopeBaseSchema.extend({
  event_type: z.literal('arc.updated'),
  data: ArcUpdatedEventDataSchema,
});
export type ArcUpdatedEvent = z.infer<typeof ArcUpdatedEventSchema>;

// ─── saved_search.matched ─────────────────────────────────────────────────

export const SavedSearchMatchEventDataSchema = z.object({
  saved_search_id: z.string().uuid(),
  saved_search_name: z.string(),
  workspace_id: z.string(),
  /** Number of new matches found since last alert. */
  match_count: z.number().int().positive(),
  /** Up to 5 representative matching story IDs. */
  top_story_ids: z.array(z.string().uuid()).max(5),
  matched_at: z.string().datetime(),
});
export type SavedSearchMatchEventData = z.infer<typeof SavedSearchMatchEventDataSchema>;

export const SavedSearchMatchEventSchema = WebhookEnvelopeBaseSchema.extend({
  event_type: z.literal('saved_search.matched'),
  data: SavedSearchMatchEventDataSchema,
});
export type SavedSearchMatchEvent = z.infer<typeof SavedSearchMatchEventSchema>;

// ─── Union ────────────────────────────────────────────────────────────────

/**
 * Discriminated union of all webhook event payloads.
 * Discriminate on `event_type` to narrow to the specific shape.
 */
export const WebhookEventSchema = z.discriminatedUnion('event_type', [
  StoryPublishedEventSchema,
  SignalDetectedEventSchema,
  EntityMentionedEventSchema,
  ArcUpdatedEventSchema,
  SavedSearchMatchEventSchema,
]);
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

/** All valid webhook subscription event type strings. */
export const WEBHOOK_EVENT_TYPES = [
  'story.published',
  'signal.detected',
  'entity.mentioned',
  'arc.updated',
  'saved_search.matched',
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

// ─── HMAC envelope ────────────────────────────────────────────────────────

/**
 * The shape of the HTTP request body sent to a registered webhook endpoint.
 *
 * The delivery service serializes a `WebhookEvent` as JSON and places it in
 * the body. The HMAC-SHA256 signature of the raw body bytes (using the
 * endpoint's secret) is sent as:
 *   X-AIDRAN-Signature: sha256=<lowercase-hex>
 *
 * Receivers MUST verify the signature before processing the payload.
 */
export interface WebhookDeliveryBody {
  /** The full event envelope. Parse with WebhookEventSchema for type safety. */
  event: WebhookEvent;
}
