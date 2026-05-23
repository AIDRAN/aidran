# AIDRAN Platform Scaffold

A curated public scaffold of patterns and infrastructure from [AIDRAN](https://aidran.ai), the AI-discourse intelligence platform.

> **AIDRAN** ingests AI-related discourse from public platforms, enriches the records with analysis, detects signals when the conversation moves, and generates source-attributed stories. This repository shows the architecture and ships a runnable subset; it does not contain the components that produce AIDRAN's voice. See `NOTICE.md` for what is intentionally omitted.

## Quickstart

You need Node 22+, pnpm 9+, and a Postgres database (local or hosted).

```sh
# 1. Get the schemas into your database
npx @aidran/cli init                    # writes .env.example and drizzle.config.ts
cp .env.example .env                    # fill in DATABASE_URL and AIDRAN_API_KEY
export $(grep -v '^#' .env | xargs)     # or use direnv / dotenv
npx @aidran/cli migrate                 # creates AIDRAN tables in your Postgres
npx @aidran/cli verify                  # confirms schema is healthy
```

That gives you the corpus tables. To run the reference ingestion and delivery layers end-to-end, clone this repo:

```sh
# 2. Run the reference HackerNews ingestion (one-shot)
git clone https://github.com/AIDRAN/aidran.git aidran-public
cd aidran-public
pnpm install
DATABASE_URL='...' pnpm --filter @aidran/ingestion run once

# 3. Start the reference delivery read API on :3000
DATABASE_URL='...' AIDRAN_API_KEY='...' pnpm --filter @aidran/delivery run start

# 4. Query
curl -s http://localhost:3000/healthz
curl -s -H "Authorization: Bearer $AIDRAN_API_KEY" http://localhost:3000/v1/records | jq
curl -s -H "Authorization: Bearer $AIDRAN_API_KEY" http://localhost:3000/v1/stories | jq
```

## What lives here

**Published to npm under [`@aidran`](https://www.npmjs.com/org/aidran):**

- [`@aidran/contracts`](https://www.npmjs.com/package/@aidran/contracts) — shared TypeScript types and Zod schemas for wire protocols (events, API DTOs, webhooks, tier policies, errors)
- [`@aidran/db`](https://www.npmjs.com/package/@aidran/db) — Drizzle ORM schemas and bundled SQL migrations for the corpus tables
- [`@aidran/cli`](https://www.npmjs.com/package/@aidran/cli) — applies the migrations and scaffolds consumer projects

**In the monorepo as runnable reference (not published):**

- `services/ingestion` — Render-Workflows-shaped ingestion service with a Hacker News reference adapter
- `services/delivery` — minimal Hono + Bearer-auth read API for the corpus

**Architecture patterns from production:**

- Evidence-joined signals (every signal cites the records that justify it)
- Append-only versioned story chains (stories supersede rather than overwrite)
- Antagonist-after-persist quality gate (non-blocking adversarial re-evaluation)
- Pattern-saturation feedback loop (automated voice-drift detection)
- Source-with-cursor task pattern (unified ingestion model)

## What's not here

The components that define AIDRAN's editorial voice and quality bar — prompts, evaluation rubrics, calibrated thresholds, prompt exemplars, and learned banned-word lists — are not included. See `NOTICE.md` for the full list.

You cannot regenerate AIDRAN's output from this scaffold. That's intentional. The runnable services here let you stand up the same data plane and read surfaces; the editorial intelligence is yours to bring (or to subscribe to via AIDRAN's hosted offering).

## License

Apache License 2.0. See `LICENSE`. The license does not grant rights in the AIDRAN trademark. See `TRADEMARKS.md`.

## Community norms

Apache 2.0 permits broad use including commercial use. We respectfully ask members of the community not to use this code to build a competing AI-discourse publication. See `NORMS.md`.

## Methodology

A research-paper-style narrative of the patterns is in `METHODOLOGY.md`. The pattern catalog is under `docs/patterns/`. Open research questions are in `docs/RESEARCH-QUESTIONS.md`. Rough edges of the approach are in `docs/ROUGH-EDGES.md`.

## Contributing

See `CONTRIBUTING.md`.

## Status

This repository is a curated, manually-published artifact. Each commit is a deliberate publication event reviewed against AIDRAN's trade-secret guardrails. We do not auto-mirror from a private repository.
