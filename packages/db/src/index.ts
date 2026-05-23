/**
 * @aidran/db — Drizzle schemas and shared types for the AIDRAN corpus.
 *
 * Consumers can import schemas directly from this entry point:
 *
 *   import { records, stories, signals } from '@aidran/db';
 *   import type { Database, NewRecord } from '@aidran/db';
 *
 * The Drizzle client setup, connection pooling, and migration tooling are
 * not included in the public scaffold. Bring your own postgres connection
 * and pass it to Drizzle's `drizzle()` factory with the exported schema.
 *
 * Example:
 *   import { drizzle } from 'drizzle-orm/node-postgres';
 *   import { Pool } from 'pg';
 *   import * as schema from '@aidran/db';
 *
 *   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 *   const db: Database = drizzle(pool, { schema });
 *
 * See NOTICE.md at the repository root for the complete list of components
 * intentionally omitted from this scaffold.
 */

import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';

export * from './schema/index.js';

export type Schema = typeof schema;

/**
 * Typed Drizzle database handle for the AIDRAN corpus.
 *
 * Construct via `drizzle()` from 'drizzle-orm/node-postgres' with the
 * exported schema object. This type is exported so activity functions can
 * accept a typed db parameter without coupling to the connection factory.
 */
export type Database = NodePgDatabase<Schema>;
