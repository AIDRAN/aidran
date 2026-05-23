/**
 * Records routes — read-only access to the corpus.
 *
 *   GET /v1/records?limit=50&cursor=<id>     paginated descending by id
 *   GET /v1/records/:id                       single record by numeric id
 */

import { Hono } from 'hono';
import { desc, lt, eq } from 'drizzle-orm';
import { records } from '@aidran/db';
import type { Database } from '@aidran/db';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function parseLimit(raw: string | undefined): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function parseCursor(raw: string | undefined): bigint | null {
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export function recordsRoutes(db: Database): Hono {
  const app = new Hono();

  app.get('/', async (c) => {
    const limit = parseLimit(c.req.query('limit'));
    const cursor = parseCursor(c.req.query('cursor'));

    const where = cursor !== null ? lt(records.id, cursor) : undefined;
    const rows = await db
      .select()
      .from(records)
      .where(where)
      .orderBy(desc(records.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? String(items[items.length - 1]?.id ?? '') : null;

    return c.json({ items, nextCursor });
  });

  app.get('/:id', async (c) => {
    const id = (() => {
      try {
        return BigInt(c.req.param('id'));
      } catch {
        return null;
      }
    })();
    if (id === null) return c.json({ error: 'invalid_id' }, 400);

    const [row] = await db.select().from(records).where(eq(records.id, id)).limit(1);
    if (!row) return c.json({ error: 'not_found' }, 404);
    return c.json(row);
  });

  return app;
}
