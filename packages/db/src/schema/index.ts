/**
 * Schema barrel — re-exports every domain schema file so consumers can
 * `import { records, stories, ... } from '@aidran/db/schema'`.
 *
 * AIDRAN follows a service-boundary discipline: services do not import
 * from each other. They import from `@aidran/db` (this barrel) and write
 * only to their owned tables.
 */

export * from './records.js';
export * from './analysis.js';
export * from './signals.js';
export * from './editorial.js';
export * from './search-sync.js';
