import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration for generating SQL migrations from the @aidran/db
 * schema definitions. Points at the compiled `dist/` output because drizzle-kit's
 * CJS loader cannot resolve TypeScript-with-`.js`-extension imports directly —
 * the .js imports do resolve once compiled. Run `pnpm build` before
 * `drizzle-kit generate`.
 *
 * Generation is invoked with: `pnpm build && pnpm drizzle-kit generate`
 * Migrations land in `./migrations/` and are shipped in the published tarball.
 */
export default defineConfig({
  schema: './dist/schema/index.js',
  out: './migrations',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
});
