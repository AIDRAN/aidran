/**
 * `aidran init` — scaffold a starter setup in the user's current directory:
 * .env.example for the required environment variables and drizzle.config.ts
 * wired to the installed @aidran/db schema. Refuses to overwrite existing
 * files; the user must remove them first if they want a fresh scaffold.
 */

import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const ENV_EXAMPLE = `# Postgres connection string used by 'aidran migrate' and any code that
# imports @aidran/db's Drizzle schema.
DATABASE_URL=postgres://aidran:aidran@localhost:5432/aidran

# API key required by the reference delivery API stub when reading from the
# corpus. Generate any opaque string — clients send it as 'Authorization: Bearer <key>'.
AIDRAN_API_KEY=replace-me-with-a-long-random-string
`;

const DRIZZLE_CONFIG = `import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration that points at the installed @aidran/db schema.
 * Use this if you want to extend the AIDRAN schema with your own tables and
 * generate additive migrations. The base AIDRAN migrations are already
 * applied via 'aidran migrate' from the @aidran/db package itself.
 */
export default defineConfig({
  schema: './node_modules/@aidran/db/dist/schema/index.js',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    url: process.env.DATABASE_URL!,
  },
});
`;

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeIfMissing(path: string, content: string): Promise<'wrote' | 'skipped'> {
  if (await exists(path)) {
    process.stdout.write(`aidran: skipped ${path} (already exists)\n`);
    return 'skipped';
  }
  await writeFile(path, content, 'utf8');
  process.stdout.write(`aidran: wrote ${path}\n`);
  return 'wrote';
}

export async function runInit(): Promise<void> {
  const cwd = process.cwd();
  await writeIfMissing(join(cwd, '.env.example'), ENV_EXAMPLE);
  await writeIfMissing(join(cwd, 'drizzle.config.ts'), DRIZZLE_CONFIG);

  process.stdout.write(
    '\naidran: scaffold complete. Next:\n' +
      '  1. cp .env.example .env  (fill in DATABASE_URL and AIDRAN_API_KEY)\n' +
      '  2. aidran migrate         (creates AIDRAN tables in your postgres)\n' +
      '  3. aidran verify          (sanity-check the schema)\n',
  );
}
