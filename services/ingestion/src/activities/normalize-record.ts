/**
 * normalize-record — shared factory for building a NewRecord from a
 * source-normalized intermediate shape.
 *
 * This is pure data transformation — no I/O. It lives in activities/ because
 * it is called by activities, but it contains no side effects and can be unit
 * tested without any workflow runtime.
 */

import type { NewRecord } from '@aidran/db';
import type { SourceKind, ContentType } from '@aidran/contracts';

export interface NormalizedItem {
  source: SourceKind;
  sourceId?: number; // FK to sources.id — populated by ensureSource activity
  contentType: ContentType;
  externalId: string;
  title?: string | null;
  contentText?: string | null;
  url?: string | null;
  author?: string | null;
  publishedAt?: Date | null;
  subreddit?: string | null;
  language?: string;
  sourceMetadata: Record<string, unknown>;
}

/**
 * Sources whose rows are the 'article' category (vs 'discourse').
 * Mirrors packages/db/src/schema/records.ts recordCategoryEnum intent:
 * published articles learned of from a provider.
 */
const ARTICLE_SOURCES: ReadonlySet<SourceKind> = new Set([
  'arxiv',
  'google_news',
  'exa',
  'webset',
]);

function deriveCategory(source: SourceKind): 'discourse' | 'article' {
  return ARTICLE_SOURCES.has(source) ? 'article' : 'discourse';
}

/** Best-effort publisher domain for article rows (e.g. arxiv.org). */
function derivePublisher(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

/**
 * Convert a NormalizedItem to a Drizzle NewRecord ready for insertion.
 * capturedAt is always set to now by the DB default — do not set it here,
 * as that would make the activity non-deterministic (different on retry).
 *
 * category/publisher are derived deterministically from source/url.
 */
export function toNewRecord(item: NormalizedItem): NewRecord {
  const category = deriveCategory(item.source);
  return {
    kind: item.source,
    sourceId: item.sourceId ?? null,
    category,
    publisher: category === 'article' ? derivePublisher(item.url) : null,
    contentType: item.contentType,
    externalId: item.externalId,
    title: item.title ?? null,
    contentText: item.contentText ?? null,
    url: item.url ?? null,
    author: item.author ?? null,
    publishedAt: item.publishedAt ?? null,
    subreddit: item.subreddit ?? null,
    language: item.language ?? 'en',
    sourceMetadata: item.sourceMetadata,
    analysis: {},
  };
}
