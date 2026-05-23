# Rough Edges

This document describes where AIDRAN's approach struggles operationally. It is intended to be honest rather than promotional. A system that claims no rough edges is either simple or dishonest.

These are not defects in the sense of bugs to be fixed. They are structural tensions between what the approach attempts and what continuous operation over a living corpus actually produces. Understanding them is necessary for anyone who wants to extend or adapt the patterns in this scaffold.

---

## 1. Pattern-Saturation Cold Start

The pattern-saturation feedback loop improves over time as the system accumulates a record of what it has generated. At launch, that record is empty. For the first weeks of operation, the suppression signal from pattern-saturation is near-zero — everything looks novel because nothing has been generated before.

In practice this means early output is more repetitive than mature output. The system generates stories about the same foundational topics (model releases, safety debates, benchmark comparisons) repeatedly before the suppression list accumulates enough signal to dampen those patterns.

There is no clean solution to this. Approaches that partially mitigate it:

- **Seeding the saturation history** with a synthetic corpus of prior-period stories, so the system starts with some awareness of existing patterns. This works but requires care: a seed corpus that over-represents certain topics can suppress legitimate coverage of those topics.
- **Aggressive initial signal thresholds** that require higher evidence volume before a signal fires, effectively slowing the output rate during the cold-start period. This reduces repetition but delays useful output.
- **Human editorial review** during the cold-start period to catch repetition before it reaches readers.

Cold start is a first-operation problem, not an ongoing one. But systems that plan to launch on a new domain or sub-domain will encounter it afresh.

---

## 2. Source-with-Cursor Backfill Quirks

The source-with-cursor pattern provides clean resumability for forward ingestion. When a source is newly added or a cursor is reset for backfill, the behavior is less clean.

The core issue: backfill ingestion processes records in reverse chronological order (oldest first, working toward current). The signal and analysis pipeline is designed for forward ingestion, where the corpus is always growing at the current time horizon. Running signal detection over a backfill corpus produces signals for "novelty" that the system already resolved — the records are old, but they are new to the corpus.

This creates two problems:

1. **False signal firing during backfill.** Novelty and velocity signals fire on historical records that, in the context of their original publication time, were not novel. The signal timestamps are correct but the editorial framing may be anachronistic.
2. **Centroid instability.** As backfill populates the corpus for a topic, the topic centroid shifts. Signals that were computed during partial backfill may be inconsistent with the centroid that exists after backfill completes.

Mitigations:

- **Suppress signal detection during backfill** by flagging records with a backfill marker and excluding them from real-time signal processing. Signals for the topic can be recomputed after backfill completes.
- **Accept the inconsistency** for historical periods and treat backfill signals as archival rather than current.

The first mitigation is implemented in AIDRAN's production system but requires care when backfill and live ingestion overlap for the same source.

---

## 3. Evidence-Join Integrity Under Network Partitions

AIDRAN's evidence-joined signal pattern requires that when a signal is persisted, the join to the records that support it is also persisted atomically. Under normal operation, this is straightforward: the signal and its evidence records are written in the same database transaction.

The weakness appears when the signal-detection workflow runs against a partially-populated corpus. If record ingestion is partway through a source backfill or is behind on live ingestion due to network conditions, a signal may fire on an incomplete evidence set. The signal is technically correct for the records in the corpus at that moment, but it would not have fired — or would have fired differently — if the corpus were complete.

This is a consistency problem that arises from the distributed-systems reality of running ingestion and signal detection as separate, loosely-coupled workflows. The evidence-join records what was true at signal-detection time, not what would be true with a complete corpus.

Concrete implications:

- A divergence signal may fire based on two sources when five sources have records on the topic but only two have been ingested. The divergence may be an artifact of ingestion lag rather than genuine source disagreement.
- A novelty signal may fire during the gap between new records arriving and their embeddings being computed, because the embedding service runs asynchronously.

Mitigations:

- **Ingestion lag monitoring** with alerting when cursor lag exceeds a threshold. Signals computed during high-lag periods are flagged for review.
- **Embedding-complete markers** on records, with signal detection deferred until a minimum fraction of new records have complete embeddings.

Neither mitigation fully resolves the consistency question. They reduce the frequency of the problem and make it visible when it occurs.

---

## 4. Signal Sensitivity vs. Specificity

AIDRAN's signal detection must balance sensitivity (catching real discourse movements) against specificity (not firing on noise). This tradeoff is calibrated through thresholds that are operationally tuned — but the calibration is not static.

As the corpus grows, the baseline distributions that signals compare against shift. A velocity threshold calibrated at six months of operation may be too sensitive or too specific at eighteen months, because the typical volume and frequency of AI discourse has changed. The corpus itself changes the signal environment.

This is an ongoing operational challenge. The calibration methodology is proprietary, but the structural tension is not: any system that detects change relative to a baseline faces the question of how to maintain the baseline as the world it models evolves.

The specific failure modes are:

- **Sensitivity decay:** As the baseline rises with overall discourse growth, thresholds that were correctly sensitive become too high — real signals are missed.
- **Topic-level oscillation:** For topics with high natural variance (model releases cluster in certain periods, for example), static thresholds produce bursts of false signals followed by quiet periods. The signal pattern reflects the threshold miscalibration more than actual discourse movement.

Regularly recalibrating thresholds against historical signal accuracy is necessary but requires labeled historical data (which signals were "real" in retrospect) that is expensive to produce.

---

## 5. The Long Tail of Thin Beats

AI discourse is not uniformly rich. Major topics (frontier model releases, regulatory proceedings, safety incidents at large organizations) generate hundreds of records across multiple source types. But the discourse also includes a long tail of thin beats: topics with two or three records, usually from a single source, with no cross-source corroboration.

AIDRAN's signal detection and editorial generation are designed with multi-source, multi-record topics in mind. Thin beats stress this design in predictable ways:

- **Signal fragility:** A novelty or velocity signal on a thin beat is based on very few records. One additional record can confirm the signal; one retraction can invalidate it. The confidence in the signal is low.
- **Attribution sparseness:** A story generated from a thin beat may attribute its claims to a single source. Single-source attribution is weaker editorially and harder to verify.
- **Pattern-saturation sensitivity:** The saturation loop is calibrated for normal-volume topics. Thin beats may appear "saturated" (no new signal) not because they have been covered well, but because coverage is genuinely sparse — and sparse coverage is the story.

There is no clean mitigation for thin beats. Options:

- **Minimum evidence thresholds** that prevent story generation until a topic has records from multiple source types. This suppresses thin-beat coverage entirely, which may be worse than publishing it with appropriate caveats.
- **Separate editorial treatment** for thin beats — shorter, more explicitly provisional story formats — with different quality criteria. This is a product choice that requires editorial judgment about reader expectation.

---

## 6. Story Versioning Fragmentation

Append-only versioned story chains preserve history cleanly, but they can fragment in ways that are confusing to readers and to downstream systems.

The fragmentation problem: if signals fire frequently on a topic, the system generates many story versions in a short period. Each version supersedes the last. A reader who encounters a link to version 3 of a story may find, on arriving, a notice that the current version is 7, and the content has changed substantially. The story chain is technically correct but editorially disorienting.

The related problem: if a topic splits — what was tracked as a single topic diverges into two distinct sub-conversations — the story chain does not automatically split. The current version of the story may need to address both sub-topics, which tends to produce longer, less focused stories. Topic splitting requires editorial intervention.

Mitigations:

- **Version cadence limiting** — a minimum time between story versions — prevents rapid fragmentation during high-signal periods. This is a heuristic that trades some signal responsiveness for version stability.
- **Version diff presentation** — showing readers what changed between versions, rather than presenting the new version as a full replacement — reduces reader disorientation.
- **Topic split detection** as a signal type — recognizing when a topic has bifurcated and generating two story chains rather than one — is a capability AIDRAN does not currently have.

---

*See also: `METHODOLOGY.md` for the design rationale behind these patterns; `docs/RESEARCH-QUESTIONS.md` for the open research problems that arise from these limitations.*
