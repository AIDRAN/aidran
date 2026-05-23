# Editorial service — architecture only

This directory shows the **architecture** of AIDRAN's editorial service.

The generation prompts, evaluation rubrics, scoring weights, calibrated thresholds, prompt exemplars, and learned banned-word lists that define AIDRAN's voice and quality bar are **not included** and remain trade secrets of AIDRAN LLC.

**Forks of this repository cannot regenerate AIDRAN's output.** That is intentional.

The Apache 2.0 license does not grant rights to the AIDRAN™ trademark — see `../../TRADEMARKS.md`.

## What you will find here

- Workflow shells that show *how* AIDRAN orchestrates story generation, antagonist-after-persist quality evaluation, and pattern-saturation drift detection
- Generic helpers for prompt assembly, version tracking, and output validation
- Type definitions for the public surface

## What you will not find here

- Any prompt content (the `prompts/` directory is omitted entirely)
- Any judge rubric weights or scoring criteria (judges are stubbed)
- Any calibrated threshold values (placeholders used; production values differ)
- Any banned-word seeds, exemplar corpora, or accumulated tuning history

## Why this separation

AIDRAN believes the *architecture* of a discourse-generation system is worth sharing. The *artifact* — the voice, the rubric, the calibration — is what makes AIDRAN distinctive and is not on offer here.

This is the same separation Anthropic makes between published Constitutional AI architecture and the proprietary Claude model. The shape is publishable; the artifact is not.

## See also

- `../../NOTICE.md` — full list of omitted components
- `../../docs/patterns/antagonist-after-persist.md` — the quality-gate pattern in detail
- `../../docs/patterns/pattern-saturation-loop.md` — the voice-drift detection pattern
