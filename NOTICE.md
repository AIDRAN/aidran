# What This Repository Does Not Contain

The AIDRAN Platform Scaffold is a curated public artifact, not a complete clone of the AIDRAN system. The following components are intentionally omitted and remain proprietary trade secrets of AIDRAN LLC:

- **Editorial generation prompts** — the prompts that produce AIDRAN's stories, dispatches, beat updates, and entity descriptions.
- **Quality evaluation rubrics** — the antagonist judge, narrative judge, SEO judge, and NER judge rubrics that determine AIDRAN's quality bar.
- **Calibrated signal-detection thresholds** — the novelty, velocity, and divergence thresholds that determine what becomes a story.
- **Prompt exemplars and the echo-detection corpus** — the target-register exemplars that define AIDRAN's voice and the parroting-prevention guard built around them.
- **Pattern-saturation history and learned banned-word list** — the iterative tuning record accumulated through AIDRAN's operation.

The patterns and architecture in this repository can be studied, extended, and used for non-competing purposes. They cannot be used to regenerate AIDRAN's output, which requires the tuning record above.

## Why publish anything at all

AIDRAN believes that the architecture of a discourse-intelligence platform is worth sharing — the evidence-joined signal pattern, the append-only versioned story chain, the antagonist-after-persist quality gate, and the pattern-saturation feedback loop are all generic enough to serve other researchers and builders without giving away AIDRAN's specific output.

This is the same separation Anthropic makes between Constitutional AI (architecture, published) and Claude (the model, proprietary). The shape is publishable; the artifact is not.

## See also

- `LICENSE` — Apache License 2.0
- `TRADEMARKS.md` — AIDRAN trademark and license-does-not-grant-trademark-rights
- `NORMS.md` — non-binding community ask regarding competing-publication use
- `METHODOLOGY.md` — research-paper-style narrative of the AIDRAN approach
