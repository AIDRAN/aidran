# @aidran/contracts

Shared TypeScript types and Zod schemas for the [AIDRAN](https://aidran.ai) discourse-intelligence platform.

This package defines the wire format between AIDRAN services: inter-service event payloads, public API DTOs, webhook envelopes, tier policies, error shapes, and search-index documents. Consumers can validate at runtime with Zod or import types statically.

## Install

```sh
pnpm add @aidran/contracts
# or
npm install @aidran/contracts
```

## Usage

```ts
import { recordIngestedEvent, type RecordIngestedEvent } from '@aidran/contracts/events';

const parsed: RecordIngestedEvent = recordIngestedEvent.parse(payload);
```

Subpath entries are exposed for narrower imports:

- `@aidran/contracts/events` — inter-service event schemas
- `@aidran/contracts/api` — REST/RPC DTOs
- `@aidran/contracts/webhooks` — outbound webhook envelopes
- `@aidran/contracts/tiers` — tier policies and quotas
- `@aidran/contracts/errors` — structured error shapes

The default export re-exports everything for convenience.

## Status

Part of the AIDRAN platform public reference implementation. This package is published from the [`AIDRAN/aidran`](https://github.com/AIDRAN/aidran) monorepo.

The contracts here are the same shapes used in production AIDRAN — they are deliberately published so external integrators can build compatible producers, consumers, and observers. The editorial intelligence that interprets these contracts is not part of the public reference. See [`NOTICE.md`](https://github.com/AIDRAN/aidran/blob/main/NOTICE.md) in the repo root for the full list of intentionally-omitted components.

## License

Apache-2.0. See [`LICENSE`](./LICENSE).
