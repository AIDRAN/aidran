/**
 * Hacker News activities — idempotent, safe to retry.
 *
 * fetchHnStoryIds        — fetches the top N story IDs from /topstories or /newstories
 * fetchHnItemBatch       — fetches and returns a batch of HN items by id
 * insertHnItems          — normalizes and upserts items into records
 * ensureHackerNewsSource — upserts the sources row
 *
 * DB-writing functions accept `db: Database` as a leading argument.
 * The worker creates a single pool and closes over it via makeActivities().
 * databaseUrl is NOT accepted as an activity input — passing credentials
 * through workflow history is unsafe.
 */

import type { Database } from '@aidran/db';
import {
  fetchHnTopStories as clientFetchTopStories,
  fetchHnNewStories as clientFetchNewStories,
  fetchHnItems,
} from '~/adapters/hackernews/client.js';
import type { HnItem } from '~/adapters/hackernews/types.js';
import { toNewRecord, type NormalizedItem } from './normalize-record.js';
import { upsertRecords } from './upsert-records.js';
import { ensureSource } from './ensure-source.js';
import type { RecordIngested } from '@aidran/contracts';

// ── fetchHnStoryIds ───────────────────────────────────────────────────────

export interface FetchHnStoriesInput {
  feed: 'top' | 'new';
  limit: number;
}

/** Fetch up to `limit` story IDs from HN top or new feeds. */
export async function fetchHnStoryIds(
  input: FetchHnStoriesInput,
): Promise<number[]> {
  if (input.feed === 'new') {
    return clientFetchNewStories(input.limit);
  }
  return clientFetchTopStories(input.limit);
}

// ── fetchHnItemBatch ──────────────────────────────────────────────────────

export interface FetchHnItemBatchInput {
  ids: number[];
  concurrency?: number;
}

/** Fetch a batch of HN items. Dead/deleted items are filtered out. */
export async function fetchHnItemBatch(
  input: FetchHnItemBatchInput,
): Promise<HnItem[]> {
  return fetchHnItems(input.ids, input.concurrency ?? 10);
}

// ── insertHnItems ─────────────────────────────────────────────────────────

export interface InsertHnItemsInput {
  items: HnItem[];
  sourceId: number;
}

export interface InsertHnItemsOutput {
  inserted: number;
  events: RecordIngested[];
}

/** Normalize HN items and upsert into the records table. */
export async function insertHnItems(
  db: Database,
  input: InsertHnItemsInput,
): Promise<InsertHnItemsOutput> {
  const normalized: NormalizedItem[] = [];

  for (const item of input.items) {
    // Only ingest stories and comments — skip jobs, polls, pollopts.
    if (item.type !== 'story' && item.type !== 'comment') continue;
    if (!item.by) continue; // deleted author

    const contentType = item.type === 'story' ? 'post' : 'comment';

    normalized.push({
      source: 'hackernews',
      sourceId: input.sourceId,
      contentType,
      externalId: String(item.id),
      title: item.title ?? null,
      contentText: item.text ?? null,
      url: item.url ?? null,
      author: item.by,
      publishedAt: new Date(item.time * 1000),
      subreddit: null,
      language: 'en',
      sourceMetadata: {
        score: item.score ?? 0,
        descendants: item.descendants ?? 0,
        kids: item.kids ?? [],
        parent: item.parent ?? null,
        hn_type: item.type,
      },
    });
  }

  if (normalized.length === 0) {
    return { inserted: 0, events: [] };
  }

  const batch = normalized.map(toNewRecord);
  return upsertRecords(db, batch);
}

// ── ensureHackerNewsSource ────────────────────────────────────────────────

/** Upsert the sources row for HN. Returns numeric sourceId. */
export async function ensureHackerNewsSource(
  db: Database,
): Promise<number> {
  const id = await ensureSource(db, {
    kind: 'hackernews',
    name: 'hackernews-top',
    config: { feed: 'top', limit: 200 },
  });
  return id;
}
