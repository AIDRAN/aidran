/**
 * Subpath re-export: `import { migrationsFolder } from 'aidran/db/migrations-path'`
 * resolves here and forwards to @aidran/db's migrations-path entry, which
 * exposes the absolute filesystem path of the bundled SQL migrations folder.
 */
export { migrationsFolder } from '@aidran/db/migrations-path';
