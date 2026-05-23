#!/usr/bin/env node
/**
 * `aidran` CLI shim. Delegates to @aidran/cli — top-level code in that
 * module parses process.argv and dispatches to the matching subcommand.
 *
 * Why a shim instead of pointing `bin` directly at @aidran/cli? npm's `bin`
 * field must resolve to a path within the package, not a sibling node_modules
 * entry. A two-line ESM dynamic import is the cleanest passthrough that keeps
 * process.argv, stdio, and exit codes intact.
 */
await import('@aidran/cli/dist/index.js');
