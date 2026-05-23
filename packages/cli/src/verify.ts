/**
 * `aidran verify` — sanity check that $DATABASE_URL is reachable and the
 * core AIDRAN tables exist. Cheap pre-flight before running ingestion or the
 * delivery API.
 */

import { Pool } from 'pg';

const EXPECTED_TABLES = [
  'records',
  'stories',
  'signals',
  'story_arcs',
  'topics',
  'entities',
  'search_sync_checkpoints',
] as const;

export async function runVerify(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set.');
  }

  const pool = new Pool({ connectionString: url });
  try {
    const { rows } = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [EXPECTED_TABLES],
    );
    const found = new Set(rows.map((r) => r.table_name));
    const missing = EXPECTED_TABLES.filter((t) => !found.has(t));

    process.stdout.write(`aidran: connected to ${url.replace(/:[^:@]+@/, ':***@')}\n`);
    process.stdout.write(`aidran: found ${found.size}/${EXPECTED_TABLES.length} expected tables\n`);

    if (missing.length > 0) {
      process.stdout.write(`aidran: missing tables: ${missing.join(', ')}\n`);
      process.stdout.write("aidran: run 'aidran migrate' to apply schema\n");
      process.exit(1);
    }

    process.stdout.write('aidran: schema looks healthy ✓\n');
  } finally {
    await pool.end();
  }
}
