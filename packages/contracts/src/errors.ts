/**
 * Canonical API error codes.
 *
 * Every error returned by the Delivery API uses one of these codes in the
 * `{"error":{"code":"...","message":"..."}}` envelope. Service middleware
 * and route handlers import from here rather than hard-coding strings.
 *
 * Codes are grouped by origin:
 *   - Auth / permission errors (4xx)
 *   - Quota / rate-limit errors (429)
 *   - Tier / entitlement errors (402 / 403)
 *   - Resource errors (4xx)
 *   - Server errors (5xx)
 *
 * The HTTP status mapping is advisory — the Delivery gateway owns the
 * final status code choice. Codes here are stable identifiers; status codes
 * may be adjusted without a contracts change.
 */

// ─── Auth / permission ────────────────────────────────────────────────────

/** No Authorization header or unrecognized token format. HTTP 401. */
export const ERROR_UNAUTHORIZED = 'unauthorized' as const;

/** Token is valid but the key or session lacks the required scope. HTTP 403. */
export const ERROR_FORBIDDEN = 'forbidden' as const;

/**
 * Operation requires a workspace role the caller does not hold.
 * e.g. a Member attempting an Owner-only action. HTTP 403.
 */
export const ERROR_WORKSPACE_ROLE_REQUIRED = 'workspace_role_required' as const;

// ─── Rate limiting ────────────────────────────────────────────────────────

/**
 * Per-minute HARD rate limit hit (enforced on ALL tiers).
 * Caller should wait until X-RateLimit-Reset. HTTP 429.
 */
export const ERROR_RATE_LIMITED = 'rate_limited' as const;

// ─── Quota ────────────────────────────────────────────────────────────────

/**
 * Per-day quota exhausted for Hobby or Plus (HARD cap).
 * Pro/Teams daily quota is SOFT — this code is never returned for them.
 * HTTP 429.
 */
export const ERROR_QUOTA_EXCEEDED = 'quota_exceeded' as const;

// ─── Tier / entitlement ───────────────────────────────────────────────────

/**
 * The caller's tier does not include the requested feature or the request
 * exceeds a tier-defined hard limit (e.g. Hobby web-read cap, active API
 * key count ceiling).
 * HTTP 402.
 */
export const ERROR_TIER_LIMIT_EXCEEDED = 'tier_limit_exceeded' as const;

/**
 * A Teams workspace has exhausted its purchased seat count.
 * Returned when attempting to add a member beyond the subscription quantity.
 * HTTP 402.
 */
export const ERROR_WORKSPACE_SEAT_EXCEEDED = 'workspace_seat_exceeded' as const;

/**
 * Export request rejected because the workspace has too many in-flight or
 * recently completed exports (per-tier throttle, independent of daily quota).
 * HTTP 429.
 */
export const ERROR_EXPORT_THROTTLED = 'export_throttled' as const;

// ─── Resource ─────────────────────────────────────────────────────────────

/** The requested resource does not exist. HTTP 404. */
export const ERROR_NOT_FOUND = 'not_found' as const;

/** Request body or query parameters failed validation. HTTP 422. */
export const ERROR_VALIDATION = 'validation_error' as const;

// ─── Server ───────────────────────────────────────────────────────────────

/** Unexpected server-side failure. HTTP 500. */
export const ERROR_INTERNAL = 'internal_error' as const;

/** A required upstream dependency (DB, Redis, external API) is unavailable. HTTP 503. */
export const ERROR_SERVICE_UNAVAILABLE = 'service_unavailable' as const;

// ─── Union type ───────────────────────────────────────────────────────────

export const API_ERROR_CODES = [
  ERROR_UNAUTHORIZED,
  ERROR_FORBIDDEN,
  ERROR_WORKSPACE_ROLE_REQUIRED,
  ERROR_RATE_LIMITED,
  ERROR_QUOTA_EXCEEDED,
  ERROR_TIER_LIMIT_EXCEEDED,
  ERROR_WORKSPACE_SEAT_EXCEEDED,
  ERROR_EXPORT_THROTTLED,
  ERROR_NOT_FOUND,
  ERROR_VALIDATION,
  ERROR_INTERNAL,
  ERROR_SERVICE_UNAVAILABLE,
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
