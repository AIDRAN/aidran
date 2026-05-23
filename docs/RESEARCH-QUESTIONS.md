# Open Research Questions

AIDRAN operates at the intersection of computational journalism, discourse analysis, and continuous information systems. Running the system in production has surfaced a set of problems that are not fully solved — either within AIDRAN or, to our knowledge, in the broader literature.

This document is an honest inventory of those problems. It is intended to invite engagement from researchers who work in related areas. If any of these questions intersects with your work, we would welcome a conversation. Open an issue or email hello@aidran.ai.

---

## 1. Cross-Source Sentiment Divergence Under Uneven Sampling

AIDRAN's divergence signal compares sentiment estimates across sources. The assumption is that each source contributes a representative sample of records over the comparison window. This assumption breaks down when one or more sources are rate-limited, slow, or temporarily unavailable.

If Reddit records are current but arXiv records are 12 hours stale because of a rate-limit event, a divergence calculation over the window will compare current Reddit framing against stale arXiv framing. The result may fire a false divergence signal, or suppress a true one.

The general problem is: how do you estimate cross-source divergence when sources are sampled at different rates and with different latencies? Existing work on incomplete-data sentiment analysis tends to address within-document uncertainty rather than cross-source timing skew. Approaches that model the sampling process explicitly — rather than treating each source as a contemporaneous sample — would be relevant here.

**Related work:** Techniques from survey weighting and unequal-probability sampling may transfer. Temporal alignment in financial time series (where sources tick at different rates) is a closer analog than most NLP literature.

---

## 2. Entity Name Continuity Across Rebrands and Renames

AI entities rename frequently. Companies rebrand, products are renamed at launch, research groups rename, frameworks release under new package names. AIDRAN's entity model currently treats names as stable identifiers: records are linked to entities by name match and embedding similarity.

When a rename occurs, the continuity of the entity in the corpus breaks. Records from before the rename cluster around the old name; records after cluster around the new name. Topic and signal analysis that depend on entity continuity (velocity tracking, for example) fragment at the rename boundary.

The problem has two parts:

1. **Detection:** How do you detect that two entity clusters that appear distinct are the same entity at different points in time? Name similarity alone is insufficient (some renames are complete departures). Embedding similarity of associated records is a candidate, but requires careful windowing to avoid merging genuinely distinct entities that happened to be discussed together.

2. **Resolution:** Once a rename is detected or declared, how do you retroactively merge the entity's record history without distorting signal baselines that were computed before the merge?

This is related to the entity resolution and temporal knowledge graph literature, but the streaming, corpus-embedded variant — where entities are identified by their associated discourse rather than by a named-entity database — is less studied.

---

## 3. "Newness" Scoring for Incremental Beats vs. Genuinely Novel Topics

AIDRAN's novelty signal is designed to fire when a topic has received materially new coverage relative to the existing corpus. But "new" admits two very different cases:

- **Incremental beat updates:** A story about a known topic receives new records that are substantively similar to existing records — new quotes, new sources saying the same thing, incremental developments. The topic is active but not novel.
- **Genuinely novel topics:** A topic receives records that are structurally different from its prior corpus — new framing, new evidence class, new participants. The topic has moved.

Both cases produce high novelty scores under a naive distance-to-centroid metric, because both involve records that are distant from the current centroid. But only the second case warrants a new story version. The first case warrants at most an update to the existing story's evidence set.

A better novelty metric would distinguish between "more of the same" and "something actually changed." Possible approaches include:

- Decomposing the novelty score by semantic dimension (named entities, claims, stance) and requiring novelty on multiple dimensions before treating a signal as genuine
- Maintaining a more granular centroid model that tracks not just the topic centroid but the distribution of evidence types (claims, entities, sources)
- Using a reference class of known incremental-beat patterns to calibrate the novelty baseline

This is a hard problem. The literature on topic evolution and concept drift is relevant but tends to focus on detecting drift rather than distinguishing meaningful drift from surface variation.

---

## 4. Detecting Narrative Seeding by Coordinated Accounts

Coordinated inauthentic behavior — networks of accounts posting similar content to artificially amplify a framing — is documented on most major social platforms. When coordinated seeding occurs in a topic AIDRAN covers, it can create a false velocity or novelty signal: many records arrive in a short window, the centroid shifts, and the signal fires as if genuine discourse movement has occurred.

AIDRAN does not currently have a coordinated-seeding detection layer. This is a gap.

The challenge is that the signals for coordination (unusual volume, timing correlation across accounts, textual similarity above a threshold) are weak individually and require cross-account analysis that may not be available through standard API access. Source-level rate-limiting means that AIDRAN sees only a sample of any platform's activity, making coordination detection even harder.

Relevant research directions:

- **Textual clustering:** Records from coordinated networks tend to be near-duplicates or paraphrases of a small seed set. High within-window textual similarity could be a coordination indicator, without requiring account-level data.
- **Source diversity weighting:** If a velocity spike is sourced from a small number of accounts on a single platform, it could be weighted lower than a spike distributed across platforms and account types. This is a heuristic, not a proof, but it degrades gracefully.
- **Reference class comparison:** Compare the temporal distribution of incoming records against historical baselines for organic velocity spikes. Coordinated activity often has a sharper onset than organic discourse.

This is an area where collaboration with platform trust-and-safety research would be productive.

---

## 5. Multilingual Discourse Alignment

AIDRAN currently operates primarily on English-language sources. AI discourse is global, and significant portions of it occur in Chinese, Japanese, Korean, French, German, and other languages. AIDRAN does not currently align multilingual discourse.

The alignment problem has several components:

- **Entity normalization:** The same entity may be referred to by a romanized name, a native script name, or a translation. These need to resolve to the same entity in the corpus.
- **Sentiment estimation:** Sentiment models trained on English text do not transfer reliably to other languages, and some languages encode stance differently than the positive/negative/neutral taxonomy assumes.
- **Embedding space alignment:** Records in different languages will cluster in different regions of the embedding space even if they discuss the same topic. Cross-lingual embeddings (multilingual models) reduce this gap but do not eliminate it, and their performance on domain-specific AI terminology is uneven.
- **Velocity and novelty comparability:** A topic may be moving faster in Japanese-language discourse than in English-language discourse for culturally specific reasons. A cross-lingual system needs to decide whether to report these as a single signal or as parallel signals.

AIDRAN's current architecture does not preclude multilingual operation — the source adapter pattern and corpus schema are language-agnostic — but the signal calibration and quality evaluation are English-specific.

---

## 6. Sustaining Editorial Voice as the Corpus Grows

AIDRAN's pattern-saturation feedback loop is designed to prevent repetition. But there is a subtler problem: as the corpus of generated stories grows, the generation system has more of its own prior output to learn from, explicitly or implicitly. This creates a risk of the system settling into a stable but narrow register — competent, coherent, and gradually less varied.

This is a form of distributional drift specific to continuously operating generation systems. It is different from the "mode collapse" in generative model training because it operates at the editorial level rather than the model level. The generation model does not change; the context the model operates in changes, because the prompt context increasingly includes the system's own prior output patterns.

Open questions:

- How do you measure editorial voice drift in a continuous system? What metrics capture narrowing register?
- Can the pattern-saturation loop be extended to detect voice drift in addition to topical repetition?
- What is the right intervention when drift is detected — re-seeding with diverse reference material, adjusting the context window, or flagging for human review?

This question is adjacent to ongoing work in long-context coherence and to the literature on editorial style consistency in collaborative writing systems.

---

## 7. Citation Provenance Through Aggregator-of-Aggregators URLs

A significant fraction of AIDRAN's ingested records come from sources that are themselves aggregators: Google News surfaces news articles; Hacker News surfaces links to papers and blog posts; Exa returns pages that may be summaries or compilations of primary sources.

When AIDRAN generates a story and attributes a claim to a record, the attribution chain may be: AIDRAN story → Hacker News post → linked article → original source. The record in AIDRAN's corpus is the Hacker News post, not the original article. If a reader wants to verify the claim, the path requires following two or more links.

The deeper problem is that AIDRAN's enrichment (entity extraction, embedding, sentiment) operates on the aggregator-level record, not the primary source. If the Hacker News post summarizes the original article inaccurately, the inaccuracy propagates through AIDRAN's corpus.

Possible mitigations:

- **Full-text enrichment:** For records that are links rather than text-complete, fetch and enrich the linked document. This is partially addressed by Exa full-text integration but not uniformly applied.
- **Provenance depth tracking:** Record the source chain explicitly — aggregator URL, resolved URL, canonical URL — so that attribution can reference the primary source.
- **Claim-level grounding:** Rather than attributing claims at the record level, attribute them at the claim level with the specific text excerpt that supports the claim. This makes provenance chains auditable.

The citation provenance question is related to the broader problem of claim extraction and attribution in automated journalism, which has an active research literature but limited production deployment examples.

---

## Engaging with These Questions

If you are working on any of these problems and would find access to AIDRAN's corpus, architecture, or production data useful for research purposes, we are open to research collaboration conversations. Open a GitHub issue describing your research context and the question you're working on.

We cannot share proprietary components (prompt templates, rubrics, calibrated thresholds), but we can discuss architecture, provide access to published corpus data, and engage with methodological questions.

*See also: `METHODOLOGY.md` for the system's approach to these problems; `docs/ROUGH-EDGES.md` for where the approach currently struggles operationally.*
