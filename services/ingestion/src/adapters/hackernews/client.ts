/**
 * Hacker News Firebase REST client.
 *
 * HN exposes a read-only Firebase REST API — no auth required.
 * Rate limit is generous (no documented cap); we fetch items concurrently
 * with a small concurrency cap to be respectful.
 *
 * Docs: https://github.com/HackerNews/API
 */

import { fetchWithTimeout } from '@aidran/config';
import type { HnItem, HnStoryList } from './types.js';

const HN_BASE = 'https://hacker-news.firebaseio.com/v0';

/** Fetch the top N story IDs from the /topstories list. */
export async function fetchHnTopStories(limit = 200): Promise<HnStoryList> {
  const res = await fetchWithTimeout(`${HN_BASE}/topstories.json`);
  if (!res.ok) {
    throw new Error(`HN topstories fetch failed: ${res.status} ${res.statusText}`);
  }
  const all = (await res.json()) as HnStoryList;
  return all.slice(0, limit);
}

/** Fetch the newest N story IDs. */
export async function fetchHnNewStories(limit = 200): Promise<HnStoryList> {
  const res = await fetchWithTimeout(`${HN_BASE}/newstories.json`);
  if (!res.ok) {
    throw new Error(`HN newstories fetch failed: ${res.status} ${res.statusText}`);
  }
  const all = (await res.json()) as HnStoryList;
  return all.slice(0, limit);
}

/** Fetch a single item by id. Returns null if deleted/dead. */
export async function fetchHnItem(id: number): Promise<HnItem | null> {
  const res = await fetchWithTimeout(`${HN_BASE}/item/${id}.json`);
  if (!res.ok) {
    throw new Error(`HN item fetch failed for ${id}: ${res.status} ${res.statusText}`);
  }
  const item = (await res.json()) as HnItem | null;
  if (!item || item.deleted || item.dead) {
    return null;
  }
  return item;
}

/**
 * Fetch multiple items concurrently with a bounded concurrency.
 * Returns only non-null items (deleted/dead are filtered out).
 */
export async function fetchHnItems(
  ids: number[],
  concurrency = 10,
): Promise<HnItem[]> {
  const results: HnItem[] = [];

  for (let i = 0; i < ids.length; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    const settled = await Promise.allSettled(chunk.map((id) => fetchHnItem(id)));
    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value !== null) {
        results.push(result.value);
      }
      // Rejected fetches are swallowed — activity retries handle transient failures.
      // One bad item should not abort the whole batch.
    }
  }

  return results;
}
