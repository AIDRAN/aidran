/**
 * ensureSource — idempotent upsert of a sources row.
 *
 * Every workflow calls this before inserting records so that
 * records.source_config_id is always populated on live-ingested rows.
 * Safe to retry: INSERT ... ON CONFLICT DO NOTHING, then SELECT.
 */

import { eq, and } from 'drizzle-orm';
import { sources } from '@aidran/db';
import type { Database } from '@aidran/db';
import type { SourceKind } from '@aidran/contracts';
import type { SourceId } from '@aidran/contracts';
import { SourceId as makeSourceId } from '@aidran/contracts';

export interface EnsureSourceInput {
  kind: SourceKind;
  name: string;
  config?: Record<string, unknown>;
}

/**
 * Upsert the sources row for this (kind, name) pair. Returns the row id.
 * config is only written on first insert — subsequent calls with the same
 * (kind, name) are a no-op (DO NOTHING), so live config changes must go
 * through a separate migration/admin tool.
 */
export async function ensureSource(
  db: Database,
  input: EnsureSourceInput,
): Promise<SourceId> {
  // Attempt insert — silently skips if (kind, name) already exists.
  await db
    .insert(sources)
    .values({
      kind: input.kind,
      name: input.name,
      config: input.config ?? {},
      enabled: true,
    })
    .onConflictDoNothing();

  // Fetch the row (either just-inserted or pre-existing).
  const row = await db
    .select({ id: sources.id })
    .from(sources)
    .where(and(eq(sources.kind, input.kind), eq(sources.name, input.name)))
    .limit(1);

  const found = row[0];
  if (!found) {
    throw new Error(
      `ensureSource: could not find or create sources row for ${input.kind}/${input.name}`,
    );
  }

  return makeSourceId(found.id);
}
