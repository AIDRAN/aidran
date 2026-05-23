/**
 * Stories routes — read-only access to generated narratives.
 *
 *   GET /v1/stories?limit=25&cursor=<generatedAt-ISO>   active stories newest-first
 *   GET /v1/stories/:id                                  single story with citations
 */

import { Hono } from 'hono';
import { desc, eq, and, lt } from 'drizzle-orm';
import { stories, storyCitations } from '@aidran/db';
import type { Database } from '@aidran/db';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function parseLimit(raw: string | undefined): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function parseCursor(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function storiesRoutes(db: Database): Hono {
  const app = new Hono();

  app.get('/', async (c) => {
    const limit = parseLimit(c.req.query('limit'));
    const cursor = parseCursor(c.req.query('cursor'));

    const cursorFilter = cursor ? lt(stories.generatedAt, cursor) : undefined;
    const where = cursorFilter ? and(eq(stories.active, true), cursorFilter) : eq(stories.active, true);

    const rows = await db
      .select()
      .from(stories)
      .where(where)
      .orderBy(desc(stories.generatedAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? last.generatedAt.toISOString() : null;

    return c.json({ items, nextCursor });
  });

  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const [story] = await db.select().from(stories).where(eq(stories.id, id)).limit(1);
    if (!story) return c.json({ error: 'not_found' }, 404);

    const citations = await db
      .select()
      .from(storyCitations)
      .where(eq(storyCitations.storyId, id))
      .orderBy(storyCitations.position);

    return c.json({ ...story, citations });
  });

  return app;
}
