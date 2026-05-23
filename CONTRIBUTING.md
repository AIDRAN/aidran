# Contributing to the AIDRAN Platform Scaffold

Thank you for your interest in contributing.

## Before you start

This repository is a curated scaffold of patterns and infrastructure from AIDRAN's discourse intelligence platform. It is **not** a complete clone of the AIDRAN system. The components that define AIDRAN's editorial voice and quality bar are not included — see `NOTICE.md`.

Please read `NORMS.md` for our community ask regarding competing-publication use.

## What we welcome

- Bug fixes in published code
- Pattern documentation improvements
- New source adapter examples
- Test coverage on shipped components
- Honest "rough edges" callouts
- Discussion in issues about the patterns shown here
- Citations and references back from your own research

## What is out of scope

- New editorial prompts, scoring rubrics, or calibration constants. These belong to AIDRAN's private system; we cannot accept contributions in this space.
- Anything that would constitute AIDRAN's voice or quality enforcement.
- Production-deployment configuration for AIDRAN itself.
- Anything that targets a competing AI-discourse publication.

## Process

1. **Open an issue first** for any non-trivial change. We will discuss scope and design before code lands.
2. **Fork, branch, PR.** Standard GitHub flow.
3. **Sign off your commits** per the Developer Certificate of Origin (DCO). Add `Signed-off-by: Your Name <you@example.com>` to each commit (`git commit -s`).
4. **CI must pass.** Builds, tests, and the public-safety check.
5. **One concern per PR.** Smaller, focused changes review faster.

## Code style

- TypeScript strict mode.
- Named exports only; no default exports.
- Throw `Error` subclasses with structured causes; never throw strings.
- Use structured JSON logging through `pino`.
- Tests live next to source and use Vitest.

## Code of conduct

See `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).

## License

Contributions are accepted under Apache License 2.0, the repository's license.
