/**
 * Regression cover for the public-story predicate. It serializes the SQL with
 * the Postgres dialect (no database needed) and asserts the two things that
 * must hold: the active gate is present, and a citation-existence term guards
 * young stories while a grace period lets old source-free stories through.
 */

import { describe, it, expect } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { storyPublicFilter, CITATION_LANE_PERIOD_SECONDS } from './story-visibility.js';

const dialect = new PgDialect();

describe('storyPublicFilter', () => {
  const { sql, params } = dialect.sqlToQuery(storyPublicFilter());

  it('still gates on active', () => {
    expect(sql).toContain('"stories"."active"');
    expect(params).toContain(true);
  });

  it('requires a citation row to exist', () => {
    expect(sql).toContain('EXISTS (SELECT 1 FROM "story_citations"');
    expect(sql).toContain('"story_citations"."story_id" = "stories"."id"');
  });

  it('lets a story past the grace period through without citations', () => {
    expect(sql).toContain('"stories"."generated_at" <= now()');
    expect(params).toContain(CITATION_LANE_PERIOD_SECONDS);
  });

  it('combines the citation and grace terms with OR, under the active AND', () => {
    // active AND (has-citation OR past-grace)
    expect(sql).toMatch(/"stories"\."active".*and.*EXISTS.*or.*generated_at/s);
  });
});
