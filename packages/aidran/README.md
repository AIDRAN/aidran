# aidran

One-install convenience package for the [AIDRAN](https://aidran.ai) discourse-intelligence platform. Bundles `@aidran/contracts`, `@aidran/db`, and the `@aidran/cli` binary in a single `npm install`.

## Install

```sh
npm install -g aidran
# or:  pnpm add -g aidran
```

Global install puts the `aidran` binary on your PATH so you can run it as a bare command. Prefer a project-local install? Use `npm install aidran` and invoke via `npx aidran`.

## What you get

- The `aidran` binary on your PATH — interactive wizard + non-interactive subcommands
- TypeScript types and Zod schemas from [`@aidran/contracts`](https://www.npmjs.com/package/@aidran/contracts)
- Drizzle ORM schemas + bundled migrations from [`@aidran/db`](https://www.npmjs.com/package/@aidran/db)

## Quickstart

```sh
npm install -g aidran
aidran                  # launches the interactive setup wizard
```

The wizard prompts for `DATABASE_URL`, generates an `AIDRAN_API_KEY`, writes config files, applies the migrations, and verifies the schema in one flow.

Already past the wizard? The same commands work directly:

```sh
aidran init       # scaffold .env.example + drizzle.config.ts
aidran migrate    # apply migrations to $DATABASE_URL
aidran verify     # confirm schema is healthy
aidran help       # see all commands
```

## Using the types and schemas

```ts
// Namespace imports (avoids name collisions):
import { contracts, db } from 'aidran';

const event = contracts.recordIngestedEvent.parse(payload);
const stories = db.stories;

// Or via subpath (narrower):
import { recordIngestedEvent } from 'aidran/contracts';
import { records, type Database } from 'aidran/db';
import { migrationsFolder } from 'aidran/db/migrations-path';
```

## Status

Published from the [`AIDRAN/aidran`](https://github.com/AIDRAN/aidran) monorepo with build provenance via GitHub Actions OIDC. See [`NOTICE.md`](https://github.com/AIDRAN/aidran/blob/main/NOTICE.md) for components intentionally omitted from the public reference.

## License

Apache-2.0.
