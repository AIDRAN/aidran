/**
 * Interactive AIDRAN setup wizard. Launched automatically when the user runs
 * `aidran` with no arguments in a TTY context. Composes @clack/prompts for
 * the interactive bits with the existing runMigrate / runVerify / runInit
 * command implementations so the wizard never diverges from non-interactive
 * behavior.
 */

import {
  intro,
  outro,
  select,
  text,
  confirm,
  isCancel,
  cancel,
  spinner,
  note,
  log,
} from '@clack/prompts';
import pc from 'picocolors';
import { randomBytes } from 'node:crypto';
import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { renderLogo } from './logo.js';
import { runMigrate } from './migrate.js';
import { runVerify } from './verify.js';

const HELP_BODY = `Subcommands (all work non-interactively):

  ${pc.cyan('aidran init')}      Scaffold .env.example + drizzle.config.ts
  ${pc.cyan('aidran migrate')}   Apply @aidran/db migrations to $DATABASE_URL
  ${pc.cyan('aidran verify')}    Confirm schema is healthy
  ${pc.cyan('aidran help')}      This text

Environment:
  ${pc.dim('DATABASE_URL')}    Postgres connection string (required for migrate/verify)
  ${pc.dim('AIDRAN_API_KEY')}  Bearer token for the reference delivery API
`;

function bail(): never {
  cancel('Cancelled.');
  process.exit(0);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function generateApiKey(): string {
  return randomBytes(32).toString('base64url');
}

export async function runWizard(): Promise<void> {
  process.stdout.write(renderLogo());
  intro(pc.bgCyan(pc.black(' AIDRAN ')));

  const action = await select({
    message: 'What would you like to do?',
    options: [
      { value: 'init', label: 'Initialize', hint: 'scaffold config files in this directory' },
      { value: 'migrate', label: 'Migrate', hint: 'apply schema to your Postgres' },
      { value: 'verify', label: 'Verify', hint: 'check that the schema is healthy' },
      { value: 'help', label: 'Help', hint: 'show all subcommands' },
      { value: 'exit', label: 'Exit', hint: 'leave the wizard' },
    ],
  });
  if (isCancel(action)) bail();

  switch (action) {
    case 'init':
      await initFlow();
      break;
    case 'migrate':
      await migrateFlow();
      break;
    case 'verify':
      await verifyFlow();
      break;
    case 'help':
      note(HELP_BODY, 'Help');
      outro(pc.dim('Run any subcommand directly to skip the wizard.'));
      return;
    case 'exit':
      outro(pc.dim('See you next time.'));
      return;
  }
}

async function initFlow(): Promise<void> {
  const dbUrl = await text({
    message: 'Postgres connection string (DATABASE_URL)',
    placeholder: 'postgres://user:pass@host:5432/dbname',
    initialValue: process.env.DATABASE_URL ?? 'postgres://aidran:aidran@localhost:5432/aidran',
    validate: (value) => {
      if (!value || value.trim().length === 0) return 'Connection string is required.';
      if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
        return 'Must start with postgres:// or postgresql://';
      }
      return undefined;
    },
  });
  if (isCancel(dbUrl)) bail();

  const keyChoice = await select({
    message: 'AIDRAN_API_KEY (bearer token for the reference delivery API)',
    options: [
      { value: 'generate', label: 'Generate a secure random key', hint: 'recommended' },
      { value: 'enter', label: 'Enter my own key' },
    ],
  });
  if (isCancel(keyChoice)) bail();

  let apiKey: string;
  if (keyChoice === 'generate') {
    apiKey = generateApiKey();
    log.success(`Generated key: ${pc.cyan(apiKey.slice(0, 12))}${pc.dim('…')} (full value saved to .env)`);
  } else {
    const entered = await text({
      message: 'Enter API key (min 16 chars)',
      validate: (v) => (!v || v.length < 16 ? 'Key must be at least 16 characters.' : undefined),
    });
    if (isCancel(entered)) bail();
    apiKey = entered as string;
  }

  const cwd = process.cwd();
  const envPath = join(cwd, '.env');
  const envExamplePath = join(cwd, '.env.example');
  const drizzlePath = join(cwd, 'drizzle.config.ts');

  if (await exists(envPath)) {
    const overwrite = await confirm({
      message: `.env already exists. Overwrite?`,
      initialValue: false,
    });
    if (isCancel(overwrite) || !overwrite) {
      log.warn('Skipping .env — keeping your existing values.');
    } else {
      await writeFile(envPath, `DATABASE_URL=${dbUrl}\nAIDRAN_API_KEY=${apiKey}\n`, 'utf8');
      log.success(`Wrote ${pc.cyan('.env')}`);
    }
  } else {
    await writeFile(envPath, `DATABASE_URL=${dbUrl}\nAIDRAN_API_KEY=${apiKey}\n`, 'utf8');
    log.success(`Wrote ${pc.cyan('.env')}`);
  }

  if (!(await exists(envExamplePath))) {
    await writeFile(
      envExamplePath,
      `DATABASE_URL=postgres://aidran:aidran@localhost:5432/aidran\nAIDRAN_API_KEY=replace-me-with-a-long-random-string\n`,
      'utf8',
    );
    log.success(`Wrote ${pc.cyan('.env.example')}`);
  }

  if (!(await exists(drizzlePath))) {
    await writeFile(
      drizzlePath,
      `import { defineConfig } from 'drizzle-kit';\n\nexport default defineConfig({\n  schema: './node_modules/@aidran/db/dist/schema/index.js',\n  out: './migrations',\n  dialect: 'postgresql',\n  dbCredentials: { url: process.env.DATABASE_URL! },\n});\n`,
      'utf8',
    );
    log.success(`Wrote ${pc.cyan('drizzle.config.ts')}`);
  }

  const migrateNow = await confirm({
    message: 'Apply AIDRAN migrations to this database now?',
    initialValue: true,
  });
  if (isCancel(migrateNow)) bail();

  if (migrateNow) {
    process.env.DATABASE_URL = dbUrl as string;
    const s = spinner();
    s.start('Applying migrations');
    try {
      await runMigrate();
      s.stop('Migrations applied ✓');
    } catch (err) {
      s.stop(pc.red('Migration failed'));
      log.error((err as Error).message);
      outro(pc.red('Setup incomplete — fix the error above and rerun.'));
      process.exit(1);
    }

    const verifyNow = await confirm({
      message: 'Run schema verification?',
      initialValue: true,
    });
    if (isCancel(verifyNow)) bail();
    if (verifyNow) {
      const s2 = spinner();
      s2.start('Verifying');
      try {
        await runVerify();
        s2.stop('Schema healthy ✓');
      } catch (err) {
        s2.stop(pc.red('Verify failed'));
        log.error((err as Error).message);
      }
    }
  }

  outro(pc.green('All set. Import @aidran/db in your code and start querying.'));
}

async function migrateFlow(): Promise<void> {
  let url = process.env.DATABASE_URL;
  if (!url) {
    const v = await text({
      message: 'DATABASE_URL is not set. Enter Postgres connection string',
      placeholder: 'postgres://user:pass@host:5432/dbname',
    });
    if (isCancel(v)) bail();
    url = v as string;
    process.env.DATABASE_URL = url;
  }

  const proceed = await confirm({
    message: `Apply migrations to ${pc.cyan(url.replace(/:[^:@]+@/, ':***@'))}?`,
    initialValue: true,
  });
  if (isCancel(proceed) || !proceed) bail();

  const s = spinner();
  s.start('Applying migrations');
  try {
    await runMigrate();
    s.stop('Migrations applied ✓');
    outro(pc.green('Schema is up to date.'));
  } catch (err) {
    s.stop(pc.red('Migration failed'));
    log.error((err as Error).message);
    process.exit(1);
  }
}

async function verifyFlow(): Promise<void> {
  let url = process.env.DATABASE_URL;
  if (!url) {
    const v = await text({
      message: 'DATABASE_URL is not set. Enter Postgres connection string',
      placeholder: 'postgres://user:pass@host:5432/dbname',
    });
    if (isCancel(v)) bail();
    url = v as string;
    process.env.DATABASE_URL = url;
  }

  const s = spinner();
  s.start('Verifying schema');
  try {
    await runVerify();
    s.stop('Schema healthy ✓');
    outro(pc.green('Everything checks out.'));
  } catch (err) {
    s.stop(pc.red('Verification failed'));
    log.error((err as Error).message);
    process.exit(1);
  }
}
