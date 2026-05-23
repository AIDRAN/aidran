import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Absolute filesystem path to the bundled migrations folder within the
 * installed `@aidran/db` package. Pass this to drizzle-orm's `migrate()`:
 *
 *   import { migrationsFolder } from '@aidran/db/migrations-path';
 *   import { migrate } from 'drizzle-orm/node-postgres/migrator';
 *
 *   await migrate(db, { migrationsFolder });
 *
 * Resolved at runtime relative to this compiled file:
 *   <package>/dist/migrations-path.js -> <package>/migrations
 */
export const migrationsFolder: string = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'migrations',
);
