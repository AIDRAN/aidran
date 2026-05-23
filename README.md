# AIDRAN Platform Scaffold

A curated public scaffold of patterns and infrastructure from [AIDRAN](https://aidran.ai), the AI-discourse intelligence platform.

> **AIDRAN** ingests AI-related discourse from public platforms, enriches the records with analysis, detects signals when the conversation moves, and generates source-attributed stories. This repository shows the architecture; it does not contain the components that produce AIDRAN's voice. See `NOTICE.md` for what is intentionally omitted.

## What lives here

- **Architecture patterns** AIDRAN uses in production:
  - Evidence-joined signals (every signal cites the records that justify it)
  - Append-only versioned story chains (stories supersede rather than overwrite)
  - Antagonist-after-persist quality gate (non-blocking adversarial re-evaluation)
  - Pattern-saturation feedback loop (automated voice-drift detection)
  - Source-with-cursor task pattern (unified ingestion model)
- **Reference implementations** of the publishable patterns
- **One reference source adapter** (Hacker News)
- **A reference Hono + Scalar Delivery gateway** (admin endpoints stubbed)
- **Methodology, comparison, rough-edges, and open-research-questions** documents

## What's not here

The components that define AIDRAN's editorial voice and quality bar — prompts, evaluation rubrics, calibrated thresholds, prompt exemplars, and learned banned-word lists — are not included. See `NOTICE.md` for the full list.

You cannot regenerate AIDRAN's output from this scaffold. That's intentional.

## License

Apache License 2.0. See `LICENSE`. The license does not grant rights in the AIDRAN trademark. See `TRADEMARKS.md`.

## Community norms

Apache 2.0 permits broad use including commercial use. We respectfully ask members of the community not to use this code to build a competing AI-discourse publication. See `NORMS.md`.

## Methodology

A research-paper-style narrative of the patterns is in `METHODOLOGY.md`. The pattern catalog is under `docs/patterns/`. Open research questions are in `docs/RESEARCH-QUESTIONS.md`. Rough edges of the approach are in `docs/ROUGH-EDGES.md`.

## Contributing

See `CONTRIBUTING.md`.

## Status

This repository is a curated, manually-published artifact. Each commit is a deliberate publication event reviewed against AIDRAN's trade-secret guardrails. We do not auto-mirror from a private repository.
