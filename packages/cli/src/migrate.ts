/**
 * `aidran migrate` — apply the bundled @aidran/db migrations to the database
 * at $DATABASE_URL using drizzle-orm's node-postgres migrator. Idempotent;
 * drizzle tracks applied migrations in a `drizzle.__drizzle_migrations` table.
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { migrationsFolder } from '@aidran/db/migrations-path';

export async function runMigrate(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Add it to your environment or .env file.');
  }

  process.stdout.write(`aidran: applying migrations from ${migrationsFolder}\n`);

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder });
    process.stdout.write('aidran: migrations applied successfully\n');
  } finally {
    await pool.end();
  }
}
