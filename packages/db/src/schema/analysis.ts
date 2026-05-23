/**
 * Analysis — embeddings, entities, topics, and the joins that connect them
 * to records.
 *
 * Key tables:
 *   - `embeddings`         — per-record vector embeddings, one row per (record, model).
 *   - `topics`             — editorial beat topics; ingestion config lives in sources.config.
 *   - `entities`           — canonical entity registry, deduped on LOWER(name).
 *   - `entity_mentions`    — join: which records mention which entities.
 *   - `topic_assignments`  — direct (record, topic) assignments with method and confidence.
 *   - rollup tables        — Analysis-owned derived aggregates for Delivery read paths.
 *
 * Owner service: `services/analysis`. Reads from `records`.
 */

import {
  pgTable,
  pgEnum,
  text,
  bigserial,
  bigint,
  serial,
  integer,
  numeric,
  jsonb,
  date,
  timestamp,
  boolean,
  uniqueIndex,
  index,
  primaryKey,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { records, sourceKindEnum } from './records.js';

// ─── pgvector custom type ─────────────────────────────────────────────────
// customType keeps the DDL explicit and lets re-embedding workflows
// instantiate vectors at any dimension without coupling to one model.

export const vector = (name: string, config: { dimensions: number }) =>
  customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
    dataType(_cfg) {
      return `vector(${config.dimensions})`;
    },
    toDriver(value: number[]): string {
      return `[${value.join(',')}]`;
    },
    fromDriver(value: string): number[] {
      // Postgres returns "[1.2,3.4,...]" — strip brackets and split.
      const trimmed = value.replace(/^\[|\]$/g, '');
      return trimmed === '' ? [] : trimmed.split(',').map(Number);
    },
  })(name);

// ─── topics ───────────────────────────────────────────────────────────────
// Editorial beat topics. Ingestion-config lives in `sources.config`;
// SEO metadata lives in `seo_metadata`.

export const topics = pgTable(
  'topics',
  {
    id: serial('id').primaryKey(),
    /** Stable slug used in URLs and joins. */
    name: text('name').notNull().unique(),
    displayName: text('display_name').notNull(),
    description: text('description'),
    /** Coarse topic-cluster grouping label. */
    cluster: text('cluster'),
    /** Free-form keyword list used by signal/editorial heuristics. */
    keywords: text('keywords').array().notNull().default(sql`ARRAY[]::text[]`),
    active: boolean('active').notNull().default(true),
    /** Hourly Analysis-owned rollup for topic list/distribution reads. */
    recordCount: integer('record_count').notNull().default(0),
    /** Hourly public-story rollup for topic cards and SEO facts. */
    activeStoryCount: integer('active_story_count').notNull().default(0),
    /** Latest record timestamp in this topic, refreshed with recordCount. */
    lastRecordAt: timestamp('last_record_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_topics_cluster').on(t.cluster),
    index('idx_topics_active').on(t.active).where(sql`${t.active} = true`),
    index('idx_topics_record_count').on(t.recordCount, t.id),
    index('idx_topics_last_record_at').on(t.lastRecordAt),
  ],
);

// ─── embeddings ───────────────────────────────────────────────────────────
// One row per (record, model). Storing `dimensions` as a column lets
// re-embedding rounds with different models coexist for A/B comparison.

export const embeddings = pgTable(
  'embeddings',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    recordId: bigint('record_id', { mode: 'bigint' })
      .notNull()
      .references(() => records.id, { onDelete: 'cascade' }),
    /** Embedding model identifier (e.g. 'text-embedding-3-large'). */
    modelName: text('model_name').notNull(),
    dimensions: integer('dimensions').notNull(),
    vector: vector('vector', { dimensions: 512 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** One embedding per (record, model) — re-embed by inserting a row with a new model_name. */
    uniqueIndex('uq_embeddings_record_model').on(t.recordId, t.modelName),
    index('idx_embeddings_record').on(t.recordId),
    index('idx_embeddings_model').on(t.modelName),
    /**
     * pgvector ANN index — IVFFlat. Drizzle does not yet emit this DDL natively;
     * add it via a hand-written migration:
     *
     *   CREATE INDEX idx_embeddings_vector_cosine
     *     ON embeddings USING ivfflat (vector vector_cosine_ops)
     *     WITH (lists = 100);
     */
  ],
);

// ─── entities ─────────────────────────────────────────────────────────────
// Canonical entity registry. One row per (LOWER(name), type); mentions are
// stored separately in `entity_mentions`.

export const entities = pgTable(
  'entities',
  {
    id: serial('id').primaryKey(),
    /** Canonical name as extracted (mixed case preserved). */
    name: text('name').notNull(),
    /** 'person' | 'organization' | 'technology' | etc. — kept open as text. */
    type: text('type').notNull(),
    /** First time this canonical entity was observed (across all mentions). */
    firstSeen: timestamp('first_seen', { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp('last_seen', { withTimezone: true }).notNull().defaultNow(),
    /** Materialized mention count — incremented by Analysis on entity_mention insert. */
    mentionCount: integer('mention_count').notNull().default(0),
    // Indexability columns (additive, all nullable — no backfill required;
    // existing rows default to NULL = unclassified = treated as eligible).
    // Written exclusively by `services/analysis/src/tasks/classify-entities.ts`
    // (Render Workflow, serialized — no race). Read by
    // `services/delivery/src/routers/entities.ts publicEntityPredicates()`.
    indexability: text('indexability'),
    classifiedAt: timestamp('classified_at', { withTimezone: true }),
    classifierModel: text('classifier_model'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** Canonical entity dedup: case-insensitive on name + exact on type. */
    uniqueIndex('uq_entities_lower_name_type').on(sql`LOWER(${t.name})`, t.type),
    index('idx_entities_last_seen').on(t.lastSeen),
    index('idx_entities_lower_name').on(sql`LOWER(${t.name})`),
    /** Slug expression index — matches the URL slug derivation used in entity pages. */
    index('idx_entities_slug').on(
      sql`TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(${t.name}), '[^a-z0-9]+', '-', 'g'))`,
    ),
    // Cursor index for the analysis/classify-entities task. Partial — only
    // covers unclassified rows, so it shrinks toward zero as the backlog is
    // swept and only re-grows as new rows are inserted by extract-entities.
    index('idx_entities_unclassified')
      .on(t.id)
      .where(sql`${t.indexability} IS NULL`),
  ],
);

// ─── entity_mentions ──────────────────────────────────────────────────────
// Join table: which records mention which entities.

export const entityMentions = pgTable(
  'entity_mentions',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    entityId: integer('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    recordId: bigint('record_id', { mode: 'bigint' })
      .notNull()
      .references(() => records.id, { onDelete: 'cascade' }),
    /** Optional character offset into record.content_text (null when unknown). */
    startOffset: integer('start_offset'),
    endOffset: integer('end_offset'),
    /** NER confidence 0.0–1.0. Nullable when not produced by the extraction method. */
    confidence: numeric('confidence', { precision: 4, scale: 3 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /**
     * Denormalized from records.captured_at to avoid a double-scan in
     * trending-entity queries. Nullable — populated by the Analysis service at
     * insert time. Enables index-only time-window scans without joining records.
     */
    capturedAt: timestamp('captured_at', { withTimezone: true }),
  },
  (t) => [
    /**
     * Non-NULL arbiter: a given record mentions an entity at most once per
     * start_offset. PATH-A mentions (with a real offset) dedup here. PATH-B
     * mentions have a NULL start_offset and CANNOT dedup in this index
     * because SQL treats every NULL as distinct — they are covered by the
     * complementary partial index below.
     */
    uniqueIndex('uq_entity_mentions_unique').on(t.entityId, t.recordId, t.startOffset),
    /**
     * Complementary partial unique index for mentions where start_offset IS NULL.
     * SQL treats every NULL as distinct, so the 3-col index above is a no-op
     * for NULL offsets. The two indexes cover disjoint populations (NULL vs
     * non-NULL start_offset) and together form a total idempotency contract.
     * Created via a hand-written migration; declared here to keep schema and
     * live DB in sync.
     */
    uniqueIndex('uq_entity_mentions_null_offset')
      .on(t.entityId, t.recordId)
      .where(sql`${t.startOffset} IS NULL`),
    index('idx_entity_mentions_entity').on(t.entityId, t.createdAt),
    index('idx_entity_mentions_record').on(t.recordId),
    /** Record-first co-mention/topic joins: topic/entity counts join through record_id. */
    index('idx_entity_mentions_record_entity').on(t.recordId, t.entityId),
    /** Date-window aggregate scans across all entities. */
    index('idx_entity_mentions_captured_entity')
      .on(t.capturedAt, t.entityId)
      .where(sql`${t.capturedAt} IS NOT NULL`),
    /**
     * Composite index for trending-entity queries filtering by time window.
     * Declared here for schema/DB parity; created via SQL in a migration.
     *
     * SQL: CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity_captured
     *        ON entity_mentions (entity_id, captured_at);
     */
    index('idx_entity_mentions_entity_captured').on(t.entityId, t.capturedAt),
  ],
);

// ─── topic_assignments ────────────────────────────────────────────────────
// Direct (record, topic) assignments. Multiple methods can coexist —
// 'cluster', 'keyword', 'llm', 'manual' — discriminated by `method`.

export const topicAssignments = pgTable(
  'topic_assignments',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    recordId: bigint('record_id', { mode: 'bigint' })
      .notNull()
      .references(() => records.id, { onDelete: 'cascade' }),
    topicId: integer('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    /** 'cluster' | 'keyword' | 'llm' | 'manual'. */
    method: text('method').notNull(),
    /** 0.0–1.0. Nullable when not produced by the method (e.g. keyword match). */
    confidence: numeric('confidence', { precision: 4, scale: 3 }),
    /** Free-form per-method metadata (cluster_id, kmeans run, etc.). */
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** A record gets at most one assignment per (topic, method) combo. */
    uniqueIndex('uq_topic_assignments').on(t.recordId, t.topicId, t.method),
    index('idx_topic_assignments_topic').on(t.topicId, t.createdAt),
    index('idx_topic_assignments_record').on(t.recordId),
    /** Cover topic distribution/timeline joins without heap-fetching record_id. */
    index('idx_topic_assignments_topic_record').on(t.topicId, t.recordId),
  ],
);

// ─── Delivery aggregate rollups ──────────────────────────────────────────
// Analysis-owned derived aggregates for Delivery read paths. A rollup workflow
// refreshes these from source facts while Delivery remains read-only.

export const recordSentimentDaily = pgTable(
  'record_sentiment_daily',
  {
    bucketDate: date('date', { mode: 'string' }).notNull(),
    kind: sourceKindEnum('kind').notNull(),
    avgScore: numeric('avg_score', { precision: 8, scale: 6 }).notNull(),
    recordCount: integer('record_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.bucketDate, t.kind] }),
    index('idx_record_sentiment_daily_kind_date').on(t.kind, t.bucketDate),
  ],
);

export const recordSourceDaily = pgTable(
  'record_source_daily',
  {
    bucketDate: date('date', { mode: 'string' }).notNull(),
    kind: sourceKindEnum('kind').notNull(),
    recordCount: integer('record_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.bucketDate, t.kind] }),
    index('idx_record_source_daily_kind_date').on(t.kind, t.bucketDate),
  ],
);

export const sourceKindRollups = pgTable(
  'source_kind_rollups',
  {
    kind: sourceKindEnum('kind').primaryKey(),
    totalRecords: integer('total_records').notNull().default(0),
    last24hRecords: integer('last_24h_records').notNull().default(0),
    last7dRecords: integer('last_7d_records').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_source_kind_rollups_total').on(t.totalRecords),
    index('idx_source_kind_rollups_recent').on(t.last24hRecords, t.last7dRecords),
  ],
);

export const topicRecordCounts = pgTable(
  'topic_record_counts',
  {
    topicId: integer('topic_id')
      .primaryKey()
      .references(() => topics.id, { onDelete: 'cascade' }),
    recordCount: integer('record_count').notNull().default(0),
    activeStoryCount: integer('active_story_count').notNull().default(0),
    lastRecordAt: timestamp('last_record_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_topic_record_counts_count').on(t.recordCount, t.topicId),
    index('idx_topic_record_counts_last_record').on(t.lastRecordAt),
  ],
);

export const entityMentionDaily = pgTable(
  'entity_mention_daily',
  {
    bucketDate: date('date', { mode: 'string' }).notNull(),
    entityId: integer('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    mentionCount: integer('mention_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.bucketDate, t.entityId] }),
    index('idx_entity_mention_daily_entity_date').on(t.entityId, t.bucketDate),
  ],
);

export const entitySourceCounts = pgTable(
  'entity_source_counts',
  {
    entityId: integer('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    kind: sourceKindEnum('kind').notNull(),
    recordCount: integer('record_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.entityId, t.kind] }),
    index('idx_entity_source_counts_kind').on(t.kind, t.recordCount),
  ],
);

// ─── analysis_cursors ─────────────────────────────────────────────────────
// One row per analysis task. Persists the last processed record id so a cron
// tick resumes from where the prior run stopped rather than re-scanning the
// full table every tick. `cursor` is a stringified bigint (records.id), or
// NULL when the task has not yet started. Written exclusively by
// services/analysis.

export const analysisCursors = pgTable('analysis_cursors', {
  task: text('task').primaryKey(),
  cursor: text('cursor'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── relations ────────────────────────────────────────────────────────────

export const topicsRelations = relations(topics, ({ many }) => ({
  assignments: many(topicAssignments),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  record: one(records, {
    fields: [embeddings.recordId],
    references: [records.id],
  }),
}));

export const entitiesRelations = relations(entities, ({ many }) => ({
  mentions: many(entityMentions),
}));

export const entityMentionsRelations = relations(entityMentions, ({ one }) => ({
  entity: one(entities, {
    fields: [entityMentions.entityId],
    references: [entities.id],
  }),
  record: one(records, {
    fields: [entityMentions.recordId],
    references: [records.id],
  }),
}));

export const topicAssignmentsRelations = relations(topicAssignments, ({ one }) => ({
  record: one(records, {
    fields: [topicAssignments.recordId],
    references: [records.id],
  }),
  topic: one(topics, {
    fields: [topicAssignments.topicId],
    references: [topics.id],
  }),
}));

// ─── inferred types ───────────────────────────────────────────────────────

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
export type EntityMention = typeof entityMentions.$inferSelect;
export type NewEntityMention = typeof entityMentions.$inferInsert;
export type TopicAssignment = typeof topicAssignments.$inferSelect;
export type NewTopicAssignment = typeof topicAssignments.$inferInsert;
export type RecordSentimentDaily = typeof recordSentimentDaily.$inferSelect;
export type NewRecordSentimentDaily = typeof recordSentimentDaily.$inferInsert;
export type RecordSourceDaily = typeof recordSourceDaily.$inferSelect;
export type NewRecordSourceDaily = typeof recordSourceDaily.$inferInsert;
export type SourceKindRollup = typeof sourceKindRollups.$inferSelect;
export type NewSourceKindRollup = typeof sourceKindRollups.$inferInsert;
export type TopicRecordCount = typeof topicRecordCounts.$inferSelect;
export type NewTopicRecordCount = typeof topicRecordCounts.$inferInsert;
export type EntityMentionDaily = typeof entityMentionDaily.$inferSelect;
export type NewEntityMentionDaily = typeof entityMentionDaily.$inferInsert;
export type EntitySourceCount = typeof entitySourceCounts.$inferSelect;
export type NewEntitySourceCount = typeof entitySourceCounts.$inferInsert;
export type AnalysisCursor = typeof analysisCursors.$inferSelect;
export type NewAnalysisCursor = typeof analysisCursors.$inferInsert;
