/**
 * `aidran` — one-install convenience for the AIDRAN public surface.
 *
 *   import { contracts, db } from 'aidran';
 *
 * Each subnamespace is the full re-export of its underlying package:
 *
 *   const event = contracts.recordIngestedEvent.parse(payload);
 *   const stories = db.stories;
 *
 * For granular imports (avoiding the namespace), use the subpath entries:
 *
 *   import { records } from 'aidran/db';
 *   import { recordIngestedEvent } from 'aidran/contracts';
 *
 * The `aidran` CLI binary is also exposed by this package — see `aidran help`.
 */

export * as contracts from '@aidran/contracts';
export * as db from '@aidran/db';
