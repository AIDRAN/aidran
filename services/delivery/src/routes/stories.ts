/**
 * Stories routes — read-only access to generated narratives.
 *
 *   GET /v1/stories?limit=25&cursor=<generatedAt-ISO>   active stories newest-first
 *   GET /v1/stories/:id                                  single story with citations
 *
 * Each list row carries its story-arc membership when the story belongs to an
 * arc, so a client can tell a follow-up filing from a repeat of one already
 * read. A story belongs to at most one arc, so the arc joins never multiply
 * rows.
 */

import { Hono } from 'hono';
import { desc, eq, and, lt } from 'drizzle-orm';
import { stories, storyCitations, storyArcMembership, storyArcs } from '@aidran/db';
import type { Database, Story, StoryArc, StoryArcMembership } from '@aidran/db';

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

/** Arc relationship carried onto a story list row. Null when the story has no arc. */
export interface StoryArcRef {
  arcId: number;
  slug: string;
  title: string;
  tldr: string | null;
  /** 1-based position of this story within the arc. */
  sequenceOrder: number;
  /** Total stories in the arc. */
  storyCount: number;
  /** How this story advances the arc. */
  arcNote: string | null;
}

/** One joined row from the list query: a story plus its optional arc membership. */
export interface StoryArcJoinRow {
  story: Story;
  membership: StoryArcMembership | null;
  arc: StoryArc | null;
}

export type StoryListItem = Story & { arc: StoryArcRef | null };

/** Fold a joined row into a list item, attaching arc context when present. */
export function toStoryListItem(row: StoryArcJoinRow): StoryListItem {
  const { story, membership, arc } = row;
  const arcRef: StoryArcRef | null =
    membership && arc
      ? {
          arcId: arc.id,
          slug: arc.slug,
          title: arc.title,
          tldr: arc.tldr,
          sequenceOrder: membership.sequenceOrder,
          storyCount: arc.storyCount,
          arcNote: membership.arcNote,
        }
      : null;
  return { ...story, arc: arcRef };
}

export function storiesRoutes(db: Database): Hono {
  const app = new Hono();

  app.get('/', async (c) => {
    const limit = parseLimit(c.req.query('limit'));
    const cursor = parseCursor(c.req.query('cursor'));

    const cursorFilter = cursor ? lt(stories.generatedAt, cursor) : undefined;
    const where = cursorFilter ? and(eq(stories.active, true), cursorFilter) : eq(stories.active, true);

    const rows = await db
      .select({ story: stories, membership: storyArcMembership, arc: storyArcs })
      .from(stories)
      .leftJoin(storyArcMembership, eq(storyArcMembership.storyId, stories.id))
      .leftJoin(storyArcs, eq(storyArcs.id, storyArcMembership.arcId))
      .where(where)
      .orderBy(desc(stories.generatedAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items = pageRows.map(toStoryListItem);
    const last = pageRows[pageRows.length - 1];
    const nextCursor = hasMore && last ? last.story.generatedAt.toISOString() : null;

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
