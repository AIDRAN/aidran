# @aidran/db

Drizzle ORM schemas for the [AIDRAN](https://aidran.ai) discourse-intelligence corpus.

This package exposes the table definitions and inferred TypeScript types for the public-reference subset of AIDRAN's database: records, analysis, signals, editorial, and search-sync. Bring your own Postgres connection; this package does not ship a client, connection pool, or migration tooling.

## Install

```sh
pnpm add @aidran/db drizzle-orm pg
# or
npm install @aidran/db drizzle-orm pg
```

## Usage

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@aidran/db';
import type { Database, NewRecord } from '@aidran/db';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db: Database = drizzle(pool, { schema });

await db.insert(schema.records).values({ /* NewRecord */ });
```

The `Database` type is a `NodePgDatabase<Schema>` with the full schema attached, so query results are fully typed without manual annotation at call sites.

## Scope

Schemas published here:

- `records` — ingested raw items with source, cursor, and normalization metadata
- `analysis` — per-record enrichment (embeddings, classifications, signals derived later)
- `signals` — evidence-joined signal events with citations back to records
- `editorial` — story chains (append-only, versioned)
- `search-sync` — denormalized projection used by the search index

Tables and columns used in production but not part of the public reference (prompt exemplars, rubric calibration tables, learned-pattern stores, etc.) are intentionally omitted. See [`NOTICE.md`](https://github.com/AIDRAN/aidran/blob/main/NOTICE.md) in the repo root for the full list.

You cannot regenerate AIDRAN's editorial output from this schema alone. That's intentional.

## License

Apache-2.0. See [`LICENSE`](./LICENSE).
