/**
 * API-key Bearer-token auth middleware. Constant-time comparison guards
 * against timing oracles. Returns 401 with a structured error body matching
 * the @aidran/contracts/errors shape.
 */

import type { MiddlewareHandler } from 'hono';
import { timingSafeEqual } from 'node:crypto';

export function apiKeyAuth(expected: string): MiddlewareHandler {
  const expectedBytes = Buffer.from(expected, 'utf8');

  return async (c, next) => {
    const header = c.req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return c.json({ error: 'unauthorized', detail: 'missing bearer token' }, 401);
    }
    const provided = header.slice('Bearer '.length).trim();
    const providedBytes = Buffer.from(provided, 'utf8');
    if (providedBytes.length !== expectedBytes.length) {
      return c.json({ error: 'unauthorized', detail: 'invalid token' }, 401);
    }
    if (!timingSafeEqual(providedBytes, expectedBytes)) {
      return c.json({ error: 'unauthorized', detail: 'invalid token' }, 401);
    }
    await next();
  };
}
