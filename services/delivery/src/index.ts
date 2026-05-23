/**
 * Delivery — reference read-API stub for the AIDRAN corpus.
 *
 * This is a clean-room implementation written from the public @aidran/db
 * schemas and @aidran/contracts/api types only. It exposes a minimal surface
 * sufficient to demonstrate the shape of AIDRAN's delivery layer:
 *
 *   GET  /healthz                  no auth — liveness
 *   GET  /v1/records               bearer auth — paginated recent records
 *   GET  /v1/records/:id           bearer auth — single record by id
 *   GET  /v1/stories               bearer auth — paginated active stories
 *   GET  /v1/stories/:id           bearer auth — single story by id (with citations)
 *
 * Production AIDRAN's delivery service has additional surfaces (search,
 * arcs, entities, beats, SEO, webhooks, etc.). Those are not included here.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@aidran/db';
import { apiKeyAuth } from '~/api-key.js';
import { recordsRoutes } from '~/routes/records.js';
import { storiesRoutes } from '~/routes/stories.js';

const PORT = Number(process.env.PORT ?? 3000);

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return url;
}

function getApiKey(): string {
  const key = process.env.AIDRAN_API_KEY;
  if (!key) throw new Error('AIDRAN_API_KEY is not set');
  if (key.length < 16) {
    throw new Error('AIDRAN_API_KEY must be at least 16 characters');
  }
  return key;
}

const pool = new Pool({ connectionString: getDatabaseUrl() });
const db = drizzle(pool, { schema });
const apiKey = getApiKey();

const app = new Hono();

app.get('/healthz', (c) => c.json({ ok: true }));

const v1 = new Hono();
v1.use('*', apiKeyAuth(apiKey));
v1.route('/records', recordsRoutes(db));
v1.route('/stories', storiesRoutes(db));
app.route('/v1', v1);

app.notFound((c) => c.json({ error: 'not_found' }, 404));

app.onError((err, c) => {
  process.stderr.write(`delivery: error — ${err.message}\n`);
  return c.json({ error: 'internal_error' }, 500);
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  process.stdout.write(`delivery: listening on http://localhost:${info.port}\n`);
});
