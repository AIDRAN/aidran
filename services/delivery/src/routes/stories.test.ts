import { describe, expect, it } from 'vitest';
import { toStoryListItem, type StoryArcJoinRow } from './stories.js';
import type { Story, StoryArc, StoryArcMembership } from '@aidran/db';

const story = { id: 'story-1', headline: 'A finding', generatedAt: new Date() } as unknown as Story;

const membership = {
  storyId: 'story-1',
  arcId: 7,
  sequenceOrder: 3,
  arcNote: 'Confirms the earlier benchmark with independent numbers.',
} as unknown as StoryArcMembership;

const arc = {
  id: 7,
  slug: 'model-benchmark-saturation',
  title: 'Benchmark saturation',
  tldr: 'Frontier models keep topping the same benchmarks.',
  storyCount: 5,
} as unknown as StoryArc;

describe('toStoryListItem', () => {
  it('attaches arc context when the story belongs to an arc', () => {
    const row: StoryArcJoinRow = { story, membership, arc };
    const item = toStoryListItem(row);

    expect(item.id).toBe('story-1');
    expect(item.arc).toEqual({
      arcId: 7,
      slug: 'model-benchmark-saturation',
      title: 'Benchmark saturation',
      tldr: 'Frontier models keep topping the same benchmarks.',
      sequenceOrder: 3,
      storyCount: 5,
      arcNote: 'Confirms the earlier benchmark with independent numbers.',
    });
  });

  it('sets arc to null when the story has no membership', () => {
    const row: StoryArcJoinRow = { story, membership: null, arc: null };
    expect(toStoryListItem(row).arc).toBeNull();
  });

  it('sets arc to null when a membership row has no resolved arc', () => {
    const row: StoryArcJoinRow = { story, membership, arc: null };
    expect(toStoryListItem(row).arc).toBeNull();
  });
});
