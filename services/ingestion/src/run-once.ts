/**
 * One-shot HN ingestion runner — the reference entry point that turns the
 * publishable ingestion activities into something a human can actually run.
 *
 *   pnpm --filter @aidran/ingestion run once
 *
 * Reads $DATABASE_URL, opens a connection, ensures the HN source row, fetches
 * a small batch of top stories, normalizes and upserts them into `records`,
 * prints a summary, and exits. Idempotent — safe to run repeatedly.
 *
 * This is intentionally minimal. In production AIDRAN, the same activities
 * are orchestrated by Render Workflows on a cron schedule with retry policy
 * and durable state. The public reference shows that the activities themselves
 * are unit-testable and orchestrator-agnostic.
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@aidran/db';
import {
  ensureHackerNewsSource,
  fetchHnStoryIds,
  fetchHnItemBatch,
  insertHnItems,
} from '~/activities/hackernews.js';

const FEED: 'top' | 'new' = (process.env.HN_FEED as 'top' | 'new') || 'top';
const LIMIT = Number(process.env.HN_LIMIT ?? 25);

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Provide a postgres connection string.');
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  try {
    const t0 = Date.now();
    process.stdout.write(`ingestion: ensuring HN source row\n`);
    const sourceId = await ensureHackerNewsSource(db);

    process.stdout.write(`ingestion: fetching ${LIMIT} ${FEED} story IDs\n`);
    const ids = await fetchHnStoryIds({ feed: FEED, limit: LIMIT });

    process.stdout.write(`ingestion: fetching ${ids.length} items\n`);
    const items = await fetchHnItemBatch({ ids, concurrency: 8 });

    process.stdout.write(`ingestion: upserting ${items.length} items\n`);
    const result = await insertHnItems(db, { items, sourceId });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    process.stdout.write(
      `ingestion: done — inserted=${result.inserted} events=${result.events.length} elapsed=${elapsed}s\n`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    process.stderr.write(`ingestion: error — ${err.message}\n`);
  } else {
    process.stderr.write(`ingestion: error — ${String(err)}\n`);
  }
  process.exit(1);
});
