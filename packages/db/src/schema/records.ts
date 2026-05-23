/**
 * Records — ingestion fact table plus per-source control-plane rows.
 *
 * `sources` owns per-source config (subreddits, query templates, feed URIs, etc.).
 * `records` holds every textual item fetched from those sources.
 * Embeddings, topic assignments, and entity mentions live in analysis.ts.
 *
 * Owner service: `services/ingestion`. No other service may write here.
 */

import {
  pgTable,
  pgEnum,
  text,
  bigserial,
  jsonb,
  timestamp,
  numeric,
  boolean,
  uniqueIndex,
  index,
  integer,
  serial,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────

/**
 * Ingestion source kinds — the upstream provider a record was fetched from.
 *
 * 'exa' and 'webset' carry the actual upstream publisher in records.publisher
 * (e.g. nytimes.com) and are categorised as 'article' (see recordCategoryEnum).
 * The frontend groups articles by category, not by provider.
 */
export const sourceKindEnum = pgEnum('source_kind', [
  'arxiv',
  'bluesky',
  'hackernews',
  'google_news',
  'reddit',
  'twitter',
  'youtube',
  'exa',
  'webset',
]);

/**
 * Top-level record category supporting the frontend's Discourse vs Article split:
 *
 *   - 'discourse' — social platforms where humans converse:
 *       reddit, bluesky, twitter, youtube, hackernews
 *   - 'article'   — published articles from a provider:
 *       google_news, arxiv, exa, webset
 *       Each row's `publisher` column carries the actual publisher domain.
 *
 * Derivable from `kind` but promoted to a column for index-friendly filtering
 * without scanning enum values in WHERE.
 */
export const recordCategoryEnum = pgEnum('record_category', [
  'discourse',
  'article',
]);

export const contentTypeEnum = pgEnum('content_type', [
  'post',
  'comment',
  'article',
]);

// ─── sources ──────────────────────────────────────────────────────────────
// Per-source config: rate limits, query templates, feed URIs, OAuth settings.
// Each source row owns the runtime knobs for one provider integration.

export const sources = pgTable(
  'sources',
  {
    id: serial('id').primaryKey(),
    kind: sourceKindEnum('kind').notNull(),
    /** Human-friendly identifier (e.g. 'reddit-arctic-shift', 'bluesky-search'). */
    name: text('name').notNull(),
    /** Free-form per-source config: rate limits, query templates, feed URIs, OAuth client IDs. */
    config: jsonb('config').notNull().default({}),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_sources_kind_name').on(t.kind, t.name),
    index('idx_sources_kind_enabled')
      .on(t.kind, t.enabled)
      .where(sql`${t.enabled} = true`),
  ],
);

// ─── records ──────────────────────────────────────────────────────────────

export const records = pgTable(
  'records',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    /** Which provider this came from (reddit, exa, webset, google_news, ...). */
    kind: sourceKindEnum('kind').notNull(),
    /**
     * Top-level discourse / article split. Derivable from kind but promoted to
     * a column for fast index-friendly filtering.
     */
    category: recordCategoryEnum('category').notNull().default('discourse'),
    /**
     * For articles: the actual publisher domain (e.g. 'nytimes.com',
     * 'theverge.com', 'arxiv.org'). Derived from URL hostname.
     * NULL for discourse — the platform itself is the source.
     */
    publisher: text('publisher'),
    /** Optional FK to the source-config row. */
    sourceId: integer('source_config_id').references(() => sources.id),
    contentType: contentTypeEnum('content_type').notNull(),
    /** Provider-native ID (Reddit fullname, Bluesky URI, arXiv id, etc.). */
    externalId: text('external_id').notNull(),
    contentText: text('content_text'),
    title: text('title'),
    url: text('url'),
    author: text('author'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    capturedAt: timestamp('captured_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Bluesky/Reddit subreddit or community label. */
    subreddit: text('subreddit'),
    language: text('language').default('en'),
    /** Provider-shaped raw metadata. Never filter on this — use joins/jsonpath. */
    sourceMetadata: jsonb('source_metadata').notNull().default({}),
    /** Per-record analysis output: sentiment, NER, key phrases, emotional register. */
    analysis: jsonb('analysis').notNull().default({}),
    /** Materialized sentiment for fast queries — populated by Analysis service. */
    sentimentLabel: text('sentiment_label'), // 'positive' | 'neutral' | 'negative'
    sentimentScore: numeric('sentiment_score'), // -1.0 to 1.0
  },
  (t) => [
    /** Dedup: one row per (kind, external_id). */
    uniqueIndex('uq_records_source_external_id').on(t.kind, t.externalId),
    index('idx_records_source_captured').on(t.kind, t.capturedAt),
    /** Bare captured_at index — used by date-range timeline queries that don't filter by source. */
    index('idx_records_captured_at').on(t.capturedAt),
    /** Date-first source counts: global/source timelines group by kind inside a captured_at window. */
    index('idx_records_captured_kind').on(t.capturedAt, t.kind),
    /** Content-type filtered listing: comment/post/article pages ordered by newest record. */
    index('idx_records_content_type_captured_id').on(
      t.contentType,
      t.capturedAt,
      t.id,
    ),
    index('idx_records_published').on(t.publishedAt),
    index('idx_records_sentiment')
      .on(t.sentimentLabel, t.capturedAt)
      .where(sql`${t.sentimentLabel} IS NOT NULL`),
    /**
     * Sentiment timeline hot paths filter by score/label presence and date,
     * then group by day + source kind. Date-first partial indexes keep those
     * scans bounded while rollup readers migrate to record_sentiment_daily.
     */
    index('idx_records_sentiment_score_captured_kind')
      .on(t.capturedAt, t.kind)
      .where(sql`${t.sentimentScore} IS NOT NULL`),
    index('idx_records_sentiment_label_captured_kind')
      .on(t.capturedAt, t.kind, t.sentimentLabel)
      .where(sql`${t.sentimentLabel} IS NOT NULL`),
    /** Category-filtered listing: discourse vs article. Hot path for frontend "News" grouping. */
    index('idx_records_category_captured').on(t.category, t.capturedAt),
    /** Article-only lookup by publisher (e.g. all NYT articles AIDRAN has seen). Partial. */
    index('idx_records_publisher')
      .on(t.publisher, t.capturedAt)
      .where(sql`${t.publisher} IS NOT NULL`),
    /** Dedup external articles by URL when (source, external_id) doesn't match. */
    index('idx_records_url_article')
      .on(t.url)
      .where(sql`${t.category} = 'article' AND ${t.url} IS NOT NULL`),
    /**
     * GIN trigram indexes on title and content_text for ILIKE keyword-fallback
     * queries. Postgres uses a trigram GIN automatically for ILIKE patterns —
     * no query change required.
     *
     * Drizzle 0.36 cannot express the `gin_trgm_ops` operator class, so these
     * indexes are SQL-only in a migration. The `pg_trgm` extension is also
     * created there.
     *
     * SQL:
     *   CREATE EXTENSION IF NOT EXISTS pg_trgm;
     *   CREATE INDEX IF NOT EXISTS idx_records_title_trgm
     *     ON records USING GIN (title gin_trgm_ops);
     *   CREATE INDEX IF NOT EXISTS idx_records_content_trgm
     *     ON records USING GIN (content_text gin_trgm_ops);
     */
  ],
);

// ─── relations ────────────────────────────────────────────────────────────

export const sourcesRelations = relations(sources, ({ many }) => ({
  records: many(records),
}));

export const recordsRelations = relations(records, ({ one }) => ({
  source: one(sources, {
    fields: [records.sourceId],
    references: [sources.id],
  }),
}));

// ─── inferred types ───────────────────────────────────────────────────────

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Record_ = typeof records.$inferSelect;
export type NewRecord = typeof records.$inferInsert;
