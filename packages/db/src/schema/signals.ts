/**
 * Signals — detected intelligence signals and their evidence.
 *
 * `signals` holds each detected signal; `signal_evidence` is a join table
 * with one row per piece of supporting evidence (record, entity, topic, or
 * story). This normalizes evidence that might otherwise be embedded as inline
 * JSON arrays.
 *
 * Signal kinds include: volume_anomaly, sentiment_shift, platform_divergence,
 * entity_surge, emotional_register_shift, key_phrase_trending,
 * cross_topic_correlation, trend, novelty, velocity, divergence.
 *
 * Owner service: `services/signal`. Reads from records, embeddings, entities,
 * entity_mentions, topics, and topic_assignments. Does not write to editorial
 * tables.
 */

import {
  pgTable,
  pgEnum,
  text,
  uuid,
  bigserial,
  bigint,
  serial,
  integer,
  numeric,
  jsonb,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { records } from './records.js';
import { topics, entities } from './analysis.js';
import { stories } from './editorial.js';

// ─── enums ────────────────────────────────────────────────────────────────

export const signalSeverityEnum = pgEnum('signal_severity', [
  'low',
  'medium',
  'high',
]);

/** Evidence kinds the signal points at. */
export const evidenceTargetEnum = pgEnum('signal_evidence_target', [
  'record',
  'entity',
  'topic',
  'narrative', // when a signal references a previously-published story (column name is historical)
]);

// ─── signals ──────────────────────────────────────────────────────────────

export const signals = pgTable(
  'signals',
  {
    id: serial('id').primaryKey(),
    /** Free-form — new signal kinds can be added without a migration. */
    kind: text('kind').notNull(),
    /** Topic context — most signals are scoped to a beat. Nullable for cross-topic signals. */
    topicId: integer('topic_id').references(() => topics.id),
    severity: signalSeverityEnum('severity').notNull().default('medium'),
    headline: text('headline').notNull(),
    /** Structured payload backing the signal — score components, deltas, baselines. */
    detail: jsonb('detail').notNull().default({}),
    /** Optional numeric score for ranking signals. */
    score: numeric('score'),
    detectedAt: timestamp('detected_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Idempotency: one signal per (kind, topic, dedup_key). */
    dedupKey: text('dedup_key'),
    acknowledged: boolean('acknowledged').notNull().default(false),
  },
  (t) => [
    index('idx_signals_topic_time').on(t.topicId, t.detectedAt),
    index('idx_signals_kind_time').on(t.kind, t.detectedAt),
    index('idx_signals_severity_open')
      .on(t.severity, t.detectedAt)
      .where(sql`${t.acknowledged} = false`),
    uniqueIndex('uq_signals_dedup')
      .on(t.kind, t.topicId, t.dedupKey)
      .where(sql`${t.dedupKey} IS NOT NULL`),
  ],
);

// ─── signal_evidence ──────────────────────────────────────────────────────
// One row per piece of evidence backing a signal. Exactly one of
// (record_id, entity_id, topic_id, narrative_id) is set, with `target`
// indicating which one.

export const signalEvidence = pgTable(
  'signal_evidence',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    signalId: integer('signal_id')
      .notNull()
      .references(() => signals.id, { onDelete: 'cascade' }),
    target: evidenceTargetEnum('target').notNull(),
    recordId: bigint('record_id', { mode: 'bigint' }).references(() => records.id, {
      onDelete: 'cascade',
    }),
    entityId: integer('entity_id').references(() => entities.id, {
      onDelete: 'cascade',
    }),
    targetTopicId: integer('target_topic_id').references(() => topics.id, {
      onDelete: 'cascade',
    }),
    /**
     * Reference to a story. uuid + real FK so a deleted story can't leave
     * dangling evidence rows. No drizzle `relations()` entry is added —
     * the relation API is fussy with a uuid column inside a polymorphic
     * discriminator; delivery reads this as a plain column, not a join.
     */
    narrativeId: uuid('narrative_id').references(() => stories.id, {
      onDelete: 'cascade',
    }),
    /** Optional weight/contribution this evidence row had on the signal score. */
    weight: numeric('weight', { precision: 6, scale: 4 }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_signal_evidence_signal').on(t.signalId),
    index('idx_signal_evidence_record').on(t.recordId).where(sql`${t.recordId} IS NOT NULL`),
    index('idx_signal_evidence_entity').on(t.entityId).where(sql`${t.entityId} IS NOT NULL`),
    index('idx_signal_evidence_topic')
      .on(t.targetTopicId)
      .where(sql`${t.targetTopicId} IS NOT NULL`),
    /** Sanity check: each row points at exactly one target. */
    // CHECK constraint is added via migration SQL — Drizzle doesn't model multi-column checks cleanly.
    // Production schema enforces: `CHECK (num_nonnulls(record_id, entity_id, target_topic_id, narrative_id) = 1)`.
  ],
);

// ─── relations ────────────────────────────────────────────────────────────

export const signalsRelations = relations(signals, ({ one, many }) => ({
  topic: one(topics, {
    fields: [signals.topicId],
    references: [topics.id],
  }),
  evidence: many(signalEvidence),
}));

export const signalEvidenceRelations = relations(signalEvidence, ({ one }) => ({
  signal: one(signals, {
    fields: [signalEvidence.signalId],
    references: [signals.id],
  }),
  record: one(records, {
    fields: [signalEvidence.recordId],
    references: [records.id],
  }),
  entity: one(entities, {
    fields: [signalEvidence.entityId],
    references: [entities.id],
  }),
  topic: one(topics, {
    fields: [signalEvidence.targetTopicId],
    references: [topics.id],
  }),
}));

// ─── inferred types ───────────────────────────────────────────────────────

export type Signal = typeof signals.$inferSelect;
export type NewSignal = typeof signals.$inferInsert;
export type SignalEvidence = typeof signalEvidence.$inferSelect;
export type NewSignalEvidence = typeof signalEvidence.$inferInsert;
