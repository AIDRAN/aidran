/**
 * @aidran/db — Drizzle schemas and shared types for the AIDRAN corpus.
 *
 * Consumers can import schemas directly from this entry point:
 *
 *   import { records, stories, signals } from '@aidran/db';
 *
 * The Drizzle client setup, connection pooling, and migration tooling are
 * not included in the public scaffold. Bring your own postgres connection
 * and pass it to Drizzle's `drizzle()` factory with the exported schema.
 *
 * See NOTICE.md at the repository root for the complete list of components
 * intentionally omitted from this scaffold.
 */

export * from './schema/index.js';
