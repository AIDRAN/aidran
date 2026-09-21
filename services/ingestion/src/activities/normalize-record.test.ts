import { describe, it, expect } from 'vitest';
import { toNewRecord, type NormalizedItem } from './normalize-record.js';

function makeItem(overrides: Partial<NormalizedItem> = {}): NormalizedItem {
  return {
    source: 'hackernews',
    contentType: 'post',
    externalId: '1',
    sourceMetadata: {},
    ...overrides,
  };
}

describe('toNewRecord publisher derivation', () => {
  it('derives the publisher from an off-site url on a discourse row', () => {
    const record = toNewRecord(
      makeItem({ url: 'https://www.nytimes.com/2026/09/21/story.html' }),
    );
    expect(record.category).toBe('discourse');
    expect(record.publisher).toBe('nytimes.com');
  });

  it('keeps the publisher null for a self-post with no url', () => {
    const record = toNewRecord(makeItem({ url: null }));
    expect(record.category).toBe('discourse');
    expect(record.publisher).toBeNull();
  });

  it('keeps the publisher null for a comment with no url', () => {
    const record = toNewRecord(
      makeItem({ contentType: 'comment', externalId: '2' }),
    );
    expect(record.publisher).toBeNull();
  });

  it('derives the publisher for an article row too', () => {
    const record = toNewRecord(
      makeItem({ source: 'arxiv', url: 'https://arxiv.org/abs/2609.01234' }),
    );
    expect(record.category).toBe('article');
    expect(record.publisher).toBe('arxiv.org');
  });

  it('returns null when the url cannot be parsed', () => {
    const record = toNewRecord(makeItem({ url: 'not a url' }));
    expect(record.publisher).toBeNull();
  });
});
