/**
 * Subpath re-export: `import { ... } from 'aidran/db'` resolves here and
 * forwards to @aidran/db (Drizzle schemas + Database type).
 *
 * For the migrations folder path, use the dedicated subpath:
 *   import { migrationsFolder } from 'aidran/db/migrations-path';
 */
export * from '@aidran/db';
