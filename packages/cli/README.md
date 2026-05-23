# @aidran/cli

CLI for the [AIDRAN](https://aidran.ai) discourse-intelligence platform. Applies the `@aidran/db` migrations to your Postgres database and scaffolds the minimal config needed to consume AIDRAN packages.

## Install

```sh
# As a one-off (no install):
npx @aidran/cli help

# Or as a project dev-dependency:
pnpm add -D @aidran/cli
npm install --save-dev @aidran/cli
```

## Commands

```sh
aidran init       # Write .env.example and drizzle.config.ts to cwd
aidran migrate    # Apply @aidran/db migrations to $DATABASE_URL
aidran verify     # Sanity-check the schema against $DATABASE_URL
aidran help       # Show usage
```

## Zero-to-running quickstart

```sh
mkdir my-aidran-project && cd my-aidran-project
npx @aidran/cli init                       # writes .env.example + drizzle.config.ts
cp .env.example .env                       # fill in DATABASE_URL
DATABASE_URL='postgres://...' npx @aidran/cli migrate
DATABASE_URL='postgres://...' npx @aidran/cli verify
```

After `migrate`, your Postgres has all the AIDRAN corpus tables (`records`, `stories`, `signals`, `topics`, etc.). You can then `import { records, stories } from '@aidran/db'` in your application and query them with full type safety via Drizzle.

## What it ships

The package bundles the AIDRAN migrations folder (the same SQL the production system runs) and uses `drizzle-orm/node-postgres/migrator` to apply them. Idempotent — drizzle tracks applied migrations in a `drizzle.__drizzle_migrations` table.

## Status

Part of the AIDRAN platform public reference implementation. Published from the [`AIDRAN/aidran`](https://github.com/AIDRAN/aidran) monorepo. See [`NOTICE.md`](https://github.com/AIDRAN/aidran/blob/main/NOTICE.md) for the components intentionally omitted from the public reference.

## License

Apache-2.0.
