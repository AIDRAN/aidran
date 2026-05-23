# @aidran/cli

The `aidran` binary — interactive setup wizard and non-interactive subcommands for the [AIDRAN](https://aidran.ai) discourse-intelligence platform.

## Install

```sh
npm install -g @aidran/cli
# or:  pnpm add -g @aidran/cli
```

After installing, run `aidran` (no args) to launch the interactive wizard.

Prefer to skip the global install? Use the convenience meta-package or `npx`:

```sh
npm install -g aidran     # meta-package — also exports types and schemas
npx @aidran/cli           # no install, one-off invocation
```

## Wizard

Running `aidran` with no arguments in a terminal launches an interactive wizard with the AIDRAN logo, a menu, and guided prompts. It can:

- Generate a secure random `AIDRAN_API_KEY`
- Write `.env`, `.env.example`, and `drizzle.config.ts`
- Apply migrations to your Postgres
- Verify the schema

## Commands (non-interactive)

```sh
aidran init       # Write .env.example and drizzle.config.ts to cwd
aidran migrate    # Apply @aidran/db migrations to $DATABASE_URL
aidran verify     # Sanity-check the schema against $DATABASE_URL
aidran help       # Show usage
```

These run directly without prompts — suitable for CI, scripts, or anyone who already knows what they want.

## What it ships

The package bundles the AIDRAN migrations folder (the same SQL the production system runs, via the `@aidran/db` dependency) and uses `drizzle-orm/node-postgres/migrator` to apply them. Idempotent — drizzle tracks applied migrations in a `drizzle.__drizzle_migrations` table.

The interactive UI uses [`@clack/prompts`](https://www.npmjs.com/package/@clack/prompts) for the wizard and [`picocolors`](https://www.npmjs.com/package/picocolors) for terminal styling. Both detect non-TTY contexts automatically and degrade to plain output.

## Status

Part of the AIDRAN platform public reference implementation. Published from the [`AIDRAN/aidran`](https://github.com/AIDRAN/aidran) monorepo. See [`NOTICE.md`](https://github.com/AIDRAN/aidran/blob/main/NOTICE.md) for the components intentionally omitted from the public reference.

## License

Apache-2.0.
