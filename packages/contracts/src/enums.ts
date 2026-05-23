/**
 * Canonical enum value lists. These MUST match the Postgres enums declared
 * in packages/db/src/schema/. The Schema and Contracts teams cross-review
 * any addition or rename.
 *
 * Why duplicated: contracts cannot depend on packages/db (would create a
 * cycle). The list is short enough that manual sync is cheap.
 */

import { z } from 'zod';

/**
 * Source kinds. Mirrors `source_kind` enum in packages/db/src/schema/records.ts.
 *
 * Discourse-category (social platforms): reddit, bluesky, twitter, youtube,
 *   hackernews. Future social platforms get added here AND on the records
 *   schema enum.
 * Article-category (publications): google_news, arxiv, exa, webset.
 */
export const SOURCE_KINDS = [
  'arxiv',
  'bluesky',
  'hackernews',
  'google_news',
  'reddit',
  'twitter',
  'youtube',
  'exa',
  'webset',
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
export const SourceKindSchema = z.enum(SOURCE_KINDS);

/**
 * Top-level record category. Mirrors `record_category` enum in
 * packages/db/src/schema/records.ts.
 */
export const RECORD_CATEGORIES = ['discourse', 'article'] as const;
export type RecordCategory = (typeof RECORD_CATEGORIES)[number];
export const RecordCategorySchema = z.enum(RECORD_CATEGORIES);

export const CONTENT_TYPES = ['post', 'comment', 'article'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export const ContentTypeSchema = z.enum(CONTENT_TYPES);

// ── Story types ───────────────────────────────────────────────────────────

export const STORY_TYPES = [
  'lead_story',
  'secondary_story',
  'beat_story',
  'dispatch',
  'entity_story',
] as const;
export type StoryType = (typeof STORY_TYPES)[number];
export const StoryTypeSchema = z.enum(STORY_TYPES);

// ── Arc statuses ──────────────────────────────────────────────────────────

/**
 * Stored arc status — the editorial system's stamped intent at enrichment time.
 *
 * This is the on-disk enum in `stories.arc_status`. It is NOT what the
 * Delivery API surfaces to readers. Reader-facing arc status is the
 * narrower `ComputedArcStatusSchema` below, derived at read time from
 * `arc_status` + story age + arc / signal freshness.
 */
export const ARC_STATUSES = [
  'breaking',    // editorial intent: just emerged — high urgency
  'developing',  // editorial intent: ongoing, new signals arriving
  'ongoing',     // editorial intent: sustained but stable
  'resolved',    // editorial intent: story has concluded
  'archived',    // editorial intent: no longer surfaced to readers
] as const;
export type ArcStatus = (typeof ARC_STATUSES)[number];
export const ArcStatusSchema = z.enum(ARC_STATUSES);

/**
 * Computed arc status — the Delivery API's reader-facing operational state.
 *
 * Only `breaking` and `developing` ever surface as live tags; everything
 * else is null (no badge). The mapping rules live in the delivery service
 * and are intentionally not in this package — contracts hold the *shape*,
 * not the *derivation*.
 */
export const COMPUTED_ARC_STATUSES = ['breaking', 'developing'] as const;
export type ComputedArcStatus = (typeof COMPUTED_ARC_STATUSES)[number];
export const ComputedArcStatusSchema = z.enum(COMPUTED_ARC_STATUSES);

// ── Content variant types ─────────────────────────────────────────────────

export const CONTENT_VARIANT_TYPES = [
  'summary_short',    // 2–3 sentences — feed cards
  'summary_medium',   // 2–3 paragraphs — story preview modals
  'briefing_blurb',   // ~80 words — daily email briefings
  'social_twitter',   // tweet / thread opener ≤280 chars
  'social_linkedin',  // LinkedIn post ~150 words
  'email_teaser',     // subject + preview line pair
] as const;
export type ContentVariantType = (typeof CONTENT_VARIANT_TYPES)[number];
export const ContentVariantTypeSchema = z.enum(CONTENT_VARIANT_TYPES);

// ── Citation types ────────────────────────────────────────────────────────

export const CITATION_TYPES = [
  'internal',   // points to a records row (Reddit / arXiv / HN etc.)
  'external',   // points to an Exa-sourced web URL
] as const;
export type CitationType = (typeof CITATION_TYPES)[number];
export const CitationTypeSchema = z.enum(CITATION_TYPES);

// ── Signals ───────────────────────────────────────────────────────────────

export const SIGNAL_SEVERITIES = ['low', 'medium', 'high'] as const;
export type SignalSeverity = (typeof SIGNAL_SEVERITIES)[number];
export const SignalSeveritySchema = z.enum(SIGNAL_SEVERITIES);

export const SIGNAL_EVIDENCE_TARGETS = [
  'record',
  'entity',
  'topic',
  'story',
] as const;
export type SignalEvidenceTarget = (typeof SIGNAL_EVIDENCE_TARGETS)[number];
export const SignalEvidenceTargetSchema = z.enum(SIGNAL_EVIDENCE_TARGETS);

// ── Search index ──────────────────────────────────────────────────────────

/**
 * Kinds of entity surfaced through the search store. Used as a
 * metadata filter facet at query time and as the discriminator on push
 * signal payloads.
 *
 * - story: editorial-produced story (lead, secondary, beat, dispatch, entity)
 * - record: raw discourse record (reddit/bluesky/hn/arxiv/youtube/news/twitter post)
 * - entity: canonical entity (person, org, model name)
 * - topic: beat / topic cluster
 */
export const SEARCH_INDEX_KINDS = ['story', 'record', 'entity', 'topic'] as const;
export type SearchIndexKind = (typeof SEARCH_INDEX_KINDS)[number];
export const SearchIndexKindSchema = z.enum(SEARCH_INDEX_KINDS);

/**
 * Kinds of curated projection documents surfaced through the public search index.
 *
 * Raw records are intentionally excluded. Source records remain in Postgres
 * and are reached through story citations/provenance.
 */
export const SEARCH_PROJECTION_KINDS = ['story', 'citation', 'entity', 'topic'] as const;
export type SearchProjectionKind = (typeof SEARCH_PROJECTION_KINDS)[number];
export const SearchProjectionKindSchema = z.enum(SEARCH_PROJECTION_KINDS);
