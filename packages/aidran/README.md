# aidran

One-install convenience package for the [AIDRAN](https://aidran.ai) discourse-intelligence platform. Bundles `@aidran/contracts`, `@aidran/db`, and the `@aidran/cli` binary in a single `npm install`.

## Install

```sh
npm install aidran
# or
pnpm add aidran
```

## What you get

After install:

- `aidran` binary on your PATH (delegates to [`@aidran/cli`](https://www.npmjs.com/package/@aidran/cli))
- TypeScript types and Zod schemas from [`@aidran/contracts`](https://www.npmjs.com/package/@aidran/contracts)
- Drizzle ORM schemas + bundled migrations from [`@aidran/db`](https://www.npmjs.com/package/@aidran/db)

## Quickstart

```sh
mkdir my-aidran && cd my-aidran
npm install aidran
npx aidran init                 # writes .env.example + drizzle.config.ts
cp .env.example .env            # fill in DATABASE_URL and AIDRAN_API_KEY
npx aidran migrate              # creates AIDRAN tables in your Postgres
npx aidran verify               # sanity-check the schema
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
