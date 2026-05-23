#!/usr/bin/env node
/**
 * @aidran/cli — entry point.
 *
 * Subcommands:
 *   aidran migrate   Apply @aidran/db migrations to $DATABASE_URL
 *   aidran init      Write a starter .env.example and drizzle.config.ts to cwd
 *   aidran verify    Check DATABASE_URL connectivity + count expected tables
 *   aidran help      Show usage
 */

import { runMigrate } from './migrate.js';
import { runInit } from './init.js';
import { runVerify } from './verify.js';

const HELP = `aidran — AIDRAN platform CLI

Usage:
  aidran <command>

Commands:
  init      Scaffold .env.example and drizzle.config.ts in the current directory
  migrate   Apply @aidran/db migrations to the database at $DATABASE_URL
  verify    Confirm $DATABASE_URL is reachable and required tables exist
  help      Show this help text

Environment:
  DATABASE_URL    Postgres connection string used by 'migrate' and 'verify'
`;

const [, , command] = process.argv;

const commands: Record<string, () => Promise<void>> = {
  init: runInit,
  migrate: runMigrate,
  verify: runVerify,
  help: async () => {
    process.stdout.write(HELP);
  },
  '--help': async () => {
    process.stdout.write(HELP);
  },
  '-h': async () => {
    process.stdout.write(HELP);
  },
};

const handler = command ? commands[command] : commands.help;

if (!handler) {
  process.stderr.write(`aidran: unknown command '${command}'\n\n${HELP}`);
  process.exit(1);
}

handler().catch((err: unknown) => {
  if (err instanceof Error) {
    process.stderr.write(`aidran: ${err.message}\n`);
  } else {
    process.stderr.write(`aidran: ${String(err)}\n`);
  }
  process.exit(1);
});
