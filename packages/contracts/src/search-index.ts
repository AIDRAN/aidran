/**
 * Search index contracts — store identifier, metadata schema,
 * and push-signal payload shapes shared between writer (search-sync) and
 * reader (delivery).
 *
 * Why this lives in @aidran/contracts: both services must agree on
 * (a) the store identifier string and (b) the exact metadata keys uploaded
 * with each file. The store filters at query time on metadata keys —
 * any drift between writer and reader means the search endpoint silently
 * filters to nothing.
 *
 * No runtime behavior in this file. Just constants + zod schemas.
 */

import { z } from 'zod';
import {
  CitationTypeSchema,
  SearchProjectionKindSchema,
  SearchIndexKindSchema,
  SourceKindSchema,
  StoryTypeSchema,
} from './enums.js';

// ─── Store identifier ─────────────────────────────────────────────────────

/**
 * The canonical Mixedbread store identifier. Must satisfy Mixedbread's
 * naming rule (lowercase / digits / hyphen / period only).
 *
 * Same string in dev and prod. Environments isolate via separate Mixedbread
 * workspaces / API keys, not separate identifiers.
 */
export const SEARCH_STORE_IDENTIFIER = 'aidran-search-store' as const;
export type SearchStoreIdentifier = typeof SEARCH_STORE_IDENTIFIER;

/**
 * Historical Chroma collection name for the curated AIDRAN projection.
 */
export const AIDRAN_CORPUS_COLLECTION = 'aidran-corpus' as const;
export type AidranCorpusCollection = typeof AIDRAN_CORPUS_COLLECTION;

/**
 * Canonical Typesense collection name for the public product-search projection.
 *
 * The projection contains stories, citations/excerpts, entities, and topics;
 * raw records stay in Postgres and pgvector.
 */
export const AIDRAN_TYPESENSE_COLLECTION = 'aidran_corpus' as const;
export type AidranTypesenseCollection = typeof AIDRAN_TYPESENSE_COLLECTION;

// ─── Metadata schema ──────────────────────────────────────────────────────

/**
 * Metadata attached to every file uploaded to the search store. The reader
 * filters on these keys at query time, so adding a filter facet means
 * adding a key here AND backfilling existing files (re-upload).
 *
 * Conventions:
 * - All keys lowercase snake_case to match Mixedbread idiom.
 * - `kind` is the primary discriminator — every filter starts with it.
 * - Nullable fields are emitted as `null` (NOT omitted) so metadata_facets
 *   reports the missing-value bucket explicitly.
 * - Timestamps as ISO-8601 strings, not epoch ints — Mixedbread filter
 *   operators (`gt`, `lt`, ...) work on lexicographic strings, and ISO-8601
 *   sorts lexicographically.
 */
export const SearchIndexMetadataSchema = z.object({
  /** What kind of corpus entity this file represents. */
  kind: SearchIndexKindSchema,
  /** Canonical entity id, stringified. record:bigint, story:uuid, entity/topic:int. */
  entity_id: z.string(),
  /** Headline / canonical name. Carried so quick search results can render without a DB join. */
  title: z.string(),
  /** Topic (beat) numeric id, when the entity is topic-scoped. Null for entities not tied to a topic. */
  topic_id: z.number().int().nullable(),
  /** Topic display name. Carried alongside topic_id for client rendering. */
  topic_name: z.string().nullable(),
  /**
   * Source kind for `record`. Null for story/entity/topic.
   * Named `source_kind` (not bare `kind`) here because this schema already
   * has a `kind` discriminator (SearchIndexKindSchema = record|story|entity|topic).
   */
  source_kind: SourceKindSchema.nullable(),
  /** Story type for `kind=story`. Null otherwise. */
  story_type: StoryTypeSchema.nullable(),
  /** Public URL (records: source URL; stories: /story/<slug>; entities/topics: optional). */
  url: z.string().nullable(),
  /** ISO timestamp of original publication (records) or generation (stories). */
  published_at: z.string().datetime().nullable(),
  /** Slug for stories — used to build the canonical href. Null for record/entity/topic. */
  slug: z.string().nullable(),
});
export type SearchIndexMetadata = z.infer<typeof SearchIndexMetadataSchema>;

/**
 * Metadata attached to every public search projection document. This is
 * separate from the legacy Mixedbread metadata because the current projection
 * indexes citations as first-class documents and deliberately excludes raw
 * records.
 */
export const SearchProjectionMetadataSchema = z.object({
  /** Public search projection kind. Raw records are intentionally absent. */
  kind: SearchProjectionKindSchema,
  /** Canonical row id for the projection document. */
  entity_id: z.string(),
  /** Headline / source title / canonical name. */
  title: z.string(),
  /** Topic (beat) numeric id, when available. */
  topic_id: z.number().int().nullable(),
  /** Topic display name or slug, when available. */
  topic_name: z.string().nullable(),
  /** Story type for story projection documents. */
  story_type: StoryTypeSchema.nullable(),
  /** Public or source URL, if available. */
  url: z.string().nullable(),
  /** ISO timestamp of generation/publication/last observation. */
  published_at: z.string().datetime().nullable(),
  /** Slug for stories/topics/entities where the product has one. */
  slug: z.string().nullable(),
  /** Parent story id for citations. Null for non-citation projections. */
  story_id: z.string().nullable(),
  /** Citation type for citation projections. Null otherwise. */
  citation_type: CitationTypeSchema.nullable(),
  /** Linked source record id for internal citations. Null otherwise. */
  record_id: z.string().nullable(),
  /** Citation/source domain for evidence hits. Null when unavailable. */
  domain: z.string().nullable(),
  /** Source platform for citation projections. Null for stories/entities/topics. */
  source_kind: z.string().nullable(),
});
export type SearchProjectionMetadata = z.infer<typeof SearchProjectionMetadataSchema>;

// ─── Push signal payload ───────────────────────────────────────────────────

/**
 * Payload of the `pushSearchIndexEntry` signal. Any service that finalizes a
 * corpus row fires this signal at the SearchSync worker so the change is
 * reflected in the store within seconds.
 *
 * The signal carries only the kind + id — SearchSync looks up the row itself
 * to materialize the latest content. Keeps the payload tiny and lets the
 * writer service stay ignorant of the search document shape.
 */
export const SearchIndexPushSchema = z.object({
  kind: SearchIndexKindSchema,
  /** Canonical id, stringified. Matches the metadata.entity_id at upload time. */
  entityId: z.string(),
  /** Optional reason, for observability. e.g. "story_v2_published", "entity_merged". */
  reason: z.string().optional(),
});
export type SearchIndexPush = z.infer<typeof SearchIndexPushSchema>;

export const SearchProjectionPushSchema = z.object({
  kind: SearchProjectionKindSchema,
  /** Canonical id, stringified. Matches metadata.entity_id at upload time. */
  entityId: z.string(),
  /** Optional reason, for observability. e.g. "story_enriched", "citation_upserted". */
  reason: z.string().optional(),
});
export type SearchProjectionPush = z.infer<typeof SearchProjectionPushSchema>;

/**
 * Payload of the `removeSearchIndexEntry` signal — used when a row is deleted
 * or hidden (e.g. `arc_status=archived`) and must vanish from search results.
 */
export const SearchIndexRemoveSchema = z.object({
  kind: SearchIndexKindSchema,
  entityId: z.string(),
  reason: z.string().optional(),
});
export type SearchIndexRemove = z.infer<typeof SearchIndexRemoveSchema>;
