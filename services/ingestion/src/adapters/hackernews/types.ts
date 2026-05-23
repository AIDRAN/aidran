/**
 * Hacker News Firebase API response shapes.
 *
 * Docs: https://github.com/HackerNews/API
 * We type only the fields we consume. All fields land in source_metadata.
 */

export type HnItemType = 'story' | 'comment' | 'job' | 'poll' | 'pollopt';

export interface HnItem {
  id: number;
  type: HnItemType;
  by?: string; // author username; absent for deleted items
  time: number; // Unix timestamp (seconds)
  title?: string; // stories, jobs, polls
  text?: string; // HTML — comments, self-posts, job descriptions
  url?: string; // link stories
  score?: number; // stories, polls
  descendants?: number; // total comment count on a story
  kids?: number[]; // direct child item ids (comments)
  parent?: number; // parent item id for comments
  deleted?: boolean;
  dead?: boolean;
}

/** /v0/topstories, /v0/newstories, /v0/beststories return int[] */
export type HnStoryList = number[];
