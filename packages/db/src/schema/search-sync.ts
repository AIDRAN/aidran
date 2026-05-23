/**
 * Search-sync checkpoints — per-kind watermarks for the reconcile sweep.
 *
 * Ownership: `services/search-sync` is the ONLY writer. The checkpoint row is
 * UPDATEd after each successfully uploaded page.
 *
 * Kind values mirror `SearchIndexKindSchema` in `@aidran/contracts/src/enums.ts`.
 * A CHECK constraint is used rather than a pgEnum to avoid the migration-heavy
 * ALTER TYPE operations required when a Postgres enum is extended. If a new
 * kind is added to contracts, update the CHECK here in the same schema PR and
 * regenerate the migration.
 *
 * Seed: one row per kind with `last_synced_at = 1970-01-01` is inserted in the
 * generated migration. The epoch watermark causes the first reconcile pass to
 * treat every existing corpus row as new. The INSERT uses ON CONFLICT DO NOTHING
 * so the migration is re-runnable.
 */

import { check, index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── search_sync_checkpoints ─────────────────────────────────────────────────

export const searchSyncCheckpoints = pgTable(
  'search_sync_checkpoints',
  {
    /**
     * The corpus entity kind this checkpoint tracks.
     * Constrained to the four canonical search index kinds.
     */
    kind: text('kind').primaryKey(),

    /**
     * Watermark timestamp. The reconcile workflow SELECTs rows from the
     * relevant corpus table where `updated_at > last_synced_at`, then
     * UPDATEs this column to MAX(uploaded row.updated_at) after each
     * successful page upload.
     */
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull(),

    /**
     * Row-level mutation timestamp. Postgres sets this whenever the
     * reconcile workflow advances the watermark. Useful for ops visibility
     * (e.g. "when did the last reconcile pass touch this kind?").
     */
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      'search_sync_checkpoints_kind_check',
      sql`${t.kind} IN ('story', 'record', 'citation', 'entity', 'topic')`,
    ),
  ],
);

export type SearchSyncCheckpoint = typeof searchSyncCheckpoints.$inferSelect;
export type NewSearchSyncCheckpoint = typeof searchSyncCheckpoints.$inferInsert;

// ─── search_sync_projection_state ───────────────────────────────────────────

export const searchSyncProjectionState = pgTable(
  'search_sync_projection_state',
  {
    /** Projection kind. ADR-0010 scope: story, citation, entity, topic. */
    kind: text('kind').notNull(),

    /** Canonical source row id, stringified. */
    entityId: text('entity_id').notNull(),

    /** Stable external search index id, usually `<kind>/<entity_id>.md`. */
    chromaId: text('chroma_id').notNull(),

    /** SHA-256 of the uploaded text body. Used to identify no-op pushes. */
    contentHash: text('content_hash'),

    /** Source row modification timestamp used by reconcile/checkpoint policy. */
    sourceUpdatedAt: timestamp('source_updated_at', { withTimezone: true }),

    /** Last successful external search-index upsert. Null until first success. */
    lastPushedAt: timestamp('last_pushed_at', { withTimezone: true }),

    /** Last successful external search-index delete/tombstone. Null unless deleted. */
    lastDeletedAt: timestamp('last_deleted_at', { withTimezone: true }),

    /** pending | synced | deleted | failed. Kept as text to avoid enum churn. */
    status: text('status').notNull().default('pending'),

    /** Consecutive failed attempts since the last success. */
    attempts: integer('attempts').notNull().default(0),

    /** Last error message, truncated by the service. */
    lastError: text('last_error'),

    /** Row-level mutation timestamp. */
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.kind, t.entityId] }),
    index('idx_search_sync_projection_status').on(t.status, t.updatedAt),
    index('idx_search_sync_projection_source_updated').on(t.kind, t.sourceUpdatedAt),
    check(
      'search_sync_projection_state_kind_check',
      sql`${t.kind} IN ('story', 'citation', 'entity', 'topic')`,
    ),
    check(
      'search_sync_projection_state_status_check',
      sql`${t.status} IN ('pending', 'synced', 'deleted', 'failed')`,
    ),
  ],
);

export type SearchSyncProjectionState = typeof searchSyncProjectionState.$inferSelect;
export type NewSearchSyncProjectionState = typeof searchSyncProjectionState.$inferInsert;
