/**
 * upsertRecords — idempotent bulk insert into `records`.
 *
 * Uses ON CONFLICT (kind, external_id) DO NOTHING so retried activities
 * never double-insert. Returns the count of rows actually inserted (not
 * the total attempted — conflicts are silently skipped).
 *
 * Also emits a RecordIngested payload for each new row so downstream
 * consumers (Analysis service) can pick up work. The "emission" is simply
 * returning the inserted ids — the Analysis service polls or is triggered
 * separately. No cross-service HTTP here.
 */

import { records } from '@aidran/db';
import type { Database, NewRecord } from '@aidran/db';
import type { RecordIngested } from '@aidran/contracts';
import { RecordId } from '@aidran/contracts';

export interface UpsertRecordsResult {
  inserted: number;
  events: RecordIngested[];
}

/**
 * Insert a batch of records. Caller is responsible for chunking if the
 * batch is large (Postgres parameter limit is 65535; with ~12 columns per
 * row that's ~5000 rows safe max per call — callers should use ≤500).
 */
export async function upsertRecords(
  db: Database,
  batch: NewRecord[],
): Promise<UpsertRecordsResult> {
  if (batch.length === 0) {
    return { inserted: 0, events: [] };
  }

  // Insert with DO NOTHING, returning id + columns needed for the event.
  const inserted = await db
    .insert(records)
    .values(batch)
    // Explicit conflict target — the dedup contract is the
    // (kind, external_id) unique index. Relying on inferred inference
    // would silently change dedup semantics if another unique index is
    // added to `records` later.
    .onConflictDoNothing({ target: [records.kind, records.externalId] })
    .returning({
      id: records.id,
      kind: records.kind,
      contentType: records.contentType,
      externalId: records.externalId,
      capturedAt: records.capturedAt,
    });

  const events: RecordIngested[] = inserted.map((row) => ({
    recordId: RecordId(String(row.id)),
    kind: row.kind,
    contentType: row.contentType,
    externalId: row.externalId,
    capturedAt: row.capturedAt.toISOString(),
  }));

  return { inserted: inserted.length, events };
}
