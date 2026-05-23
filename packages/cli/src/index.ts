#!/usr/bin/env node
/**
 * @aidran/cli — entry point.
 *
 * Behavior matrix:
 *   `aidran`                  (TTY)     → interactive wizard
 *   `aidran`                  (non-TTY) → prints help (so CI never hangs)
 *   `aidran <subcommand>`               → direct execution, no wizard
 *
 * Subcommands:
 *   init      Scaffold .env.example + drizzle.config.ts in cwd
 *   migrate   Apply @aidran/db migrations to $DATABASE_URL
 *   verify    Sanity-check the schema against $DATABASE_URL
 *   help      Show usage
 */

import pc from 'picocolors';
import { renderWordmark, renderLogoPlain } from './logo.js';
import { runMigrate } from './migrate.js';
import { runInit } from './init.js';
import { runVerify } from './verify.js';
import { runWizard } from './wizard.js';

function buildHelp(): string {
  return `${renderWordmark()}
${pc.bold('Usage:')}
  ${pc.cyan('aidran')}                  Launch interactive setup wizard (in a TTY)
  ${pc.cyan('aidran <command>')}        Run a command directly

${pc.bold('Commands:')}
  ${pc.cyan('init')}      Scaffold .env.example and drizzle.config.ts in the current directory
  ${pc.cyan('migrate')}   Apply @aidran/db migrations to the database at $DATABASE_URL
  ${pc.cyan('verify')}    Confirm $DATABASE_URL is reachable and required tables exist
  ${pc.cyan('help')}      Show this help text

${pc.bold('Environment:')}
  ${pc.dim('DATABASE_URL')}    Postgres connection string used by 'migrate' and 'verify'
  ${pc.dim('AIDRAN_API_KEY')}  Bearer token used by the reference delivery API stub
`;
}

const [, , command] = process.argv;

const directCommands: Record<string, () => Promise<void>> = {
  init: runInit,
  migrate: runMigrate,
  verify: runVerify,
};

async function main(): Promise<void> {
  // No subcommand: launch wizard if interactive, otherwise print help.
  if (!command) {
    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    if (interactive) {
      await runWizard();
      return;
    }
    // Non-TTY (CI, piped): plain logo + help so logs are scrubbed of ANSI.
    process.stdout.write(renderLogoPlain());
    process.stdout.write('\n');
    process.stdout.write(buildHelp());
    return;
  }

  if (command === 'help' || command === '--help' || command === '-h') {
    process.stdout.write(buildHelp());
    return;
  }

  const handler = directCommands[command];
  if (!handler) {
    process.stderr.write(`aidran: unknown command '${command}'\n\n`);
    process.stdout.write(buildHelp());
    process.exit(1);
  }
  await handler();
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${pc.red('aidran:')} ${msg}\n`);
  process.exit(1);
});
