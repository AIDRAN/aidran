/**
 * Story visibility — the single predicate that decides whether a story may be
 * served to the public.
 *
 * A story is generated in one pass and its citation rows are written in a
 * later pass. Between the two a story is `active` and carries inline `[N]`
 * markers in its prose, but `story_citations` holds no rows behind them. A
 * plain `active = true` gate serves that story with unbacked markers.
 *
 * The rule below keeps such a story out of the public surface *only while it is
 * young enough that its citation pass may not have run yet*. Once a story is
 * older than the citation lane's period, a genuinely source-free story stays
 * visible — so the rare stories that legitimately carry no citations are not
 * hidden forever.
 *
 * Both the list route and the by-id route share this fragment, so the two
 * cannot drift apart.
 */

import { and, eq, or, sql, type SQL } from 'drizzle-orm';
import { stories, storyCitations } from '@aidran/db';

/**
 * The citation lane runs once an hour, so a story can wait up to one period
 * for its citation rows. A story younger than this must have at least one
 * citation row to be public.
 */
export const CITATION_LANE_PERIOD_SECONDS = 60 * 60;

/** SQL predicate: the story is active and its citations are settled. */
export function storyPublicFilter(): SQL {
  return and(
    eq(stories.active, true),
    or(
      sql`EXISTS (SELECT 1 FROM ${storyCitations} WHERE ${storyCitations.storyId} = ${stories.id})`,
      sql`${stories.generatedAt} <= now() - (${CITATION_LANE_PERIOD_SECONDS} * interval '1 second')`,
    ),
  )!;
}
