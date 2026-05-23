# AIDRAN: What It Is and Isn't

This document positions AIDRAN against adjacent product and research categories. The goal is not to diminish those categories — several are useful, widely deployed, and technically sophisticated — but to be precise about what AIDRAN actually measures.

The short version: **AIDRAN measures how a subject moves through public conversation over time.** Most adjacent tools measure something else.

---

## The Core Distinction

AIDRAN tracks a *subject domain* (artificial intelligence) across discourse surfaces, detecting when the shape of conversation changes and generating source-attributed analysis of those changes. The subject is the anchor; the sources are evidence.

Most tools in adjacent categories invert this relationship. They anchor on a brand, a keyword, a sentiment label, or a document — and measure properties of the match. AIDRAN anchors on the subject and measures the discourse itself.

The difference matters when the question is "how is this topic moving?" rather than "what is being said about this entity today?"

---

## Generic LLM Newsletter Generators

A growing category of tools uses LLM-based summarization to produce newsletters or digest emails from RSS feeds, curated source lists, or search results. These tools are generally excellent at aggregation and formatting. They are not designed to detect change.

**What they do:** Given a set of recent documents, summarize them readably.

**What AIDRAN does differently:**

- AIDRAN detects *signals* — changes in novelty, velocity, or cross-source divergence — before generating anything. Stories are generated in response to signal, not on a fixed schedule.
- AIDRAN's stories are versioned and chained. A story about a topic is not regenerated from scratch each cycle; it is updated when the evidence warrants it.
- AIDRAN's generation is gated by an independent quality evaluation that runs after persistence. A generic newsletter generator typically has no adversarial quality gate.
- AIDRAN's corpus is structured: records are linked to entities, topics, and signals by schema. A newsletter generator typically treats documents as unstructured text.

Generic LLM newsletter tools are good tools for a different job. They answer "what happened today?" AIDRAN is built to answer "what is changing and why does it matter now versus last week?"

---

## Brand Mention Monitoring (Brandwatch, Meltwater, Mention, et al.)

Brand monitoring platforms ingest social media and news at scale and track mentions of named entities — brand names, product names, executives. They provide volume dashboards, sentiment trends, and reach estimates. They are operationally mature, widely used in communications and marketing workflows, and generally excellent at what they do.

**What they do:** Track how often a named entity appears across sources, and in what sentiment context.

**What AIDRAN does differently:**

- AIDRAN does not track brands. It tracks the AI discourse as a subject domain. An AIDRAN signal fires when the *conversation* shifts, not when a name appears more or less frequently.
- Brand monitoring is fundamentally a counting problem: how many times was this name mentioned, with what sentiment, in what reach tier? AIDRAN is a discourse-structure problem: what is the relationship between how different sources are framing the same development?
- Brand monitoring systems are typically configured per client around the client's named entities. AIDRAN has no concept of a "client entity" — the subject domain is fixed.
- AIDRAN produces editorial output (stories). Brand monitoring produces dashboards, reports, and alerts. These are different consumer surfaces for different audiences.

Brand monitoring is useful when the question is "what are people saying about us?" AIDRAN is built for "what is happening in AI discourse and what does the pattern of disagreement across sources indicate?"

---

## Sentiment Analysis Dashboards

Sentiment analysis platforms apply text classification models to produce aggregate sentiment scores — typically positive/negative/neutral — over time series derived from social feeds or news. Some are standalone; others are integrated into brand monitoring platforms.

**What they do:** Score the emotional valence of text about a subject and display trends.

**What AIDRAN does differently:**

- Sentiment analysis in AIDRAN is one input into divergence signal detection, not an end product. The question is not "what is the aggregate sentiment?" but "are sources diverging from each other, and does that divergence indicate a contested story?"
- Aggregate sentiment scores lose the cross-source structure that makes divergence meaningful. If five sources are uniformly positive and five are uniformly negative, the aggregate might read as neutral. AIDRAN's divergence signal would fire.
- AIDRAN does not display a sentiment dashboard. It uses sentiment as evidence for editorial decisions.
- Sentiment models applied to AI discourse face significant domain adaptation challenges: technical terms, irony in developer communities, and contested framing are all hard cases for general-purpose sentiment classifiers. AIDRAN is aware of this limitation (see `docs/ROUGH-EDGES.md`).

Sentiment dashboards answer "how do people feel about X?" AIDRAN uses sentiment to detect "are sources disagreeing about X, and is that disagreement structurally interesting?"

---

## Academic Discourse Studies (One-Off Corpora)

A substantial body of academic literature studies online discourse about AI through snapshot corpora: a researcher collects posts from a platform over a time window, applies computational methods (topic modeling, network analysis, content analysis), and publishes findings. This work is methodologically rigorous and has produced important insights.

**What it does:** Analyzes a fixed corpus of discourse to answer specific research questions.

**What AIDRAN does differently:**

- AIDRAN is continuous. It does not study a snapshot; it maintains a living corpus that grows daily. This introduces engineering challenges that one-off studies do not face (cursor management, version drift, signal sensitivity tuning over time).
- AIDRAN's output is editorial (stories for readers), not academic (papers for reviewers). The quality criteria are different: editorial output must be readable, attributable, and timely; academic output must be reproducible and falsifiable.
- AIDRAN's corpus is multi-surface by design: nine source kinds spanning social platforms, academic preprints, video, and news. Many academic studies focus on a single platform or source type.
- Reproducibility is a first-class concern in academic work; it is a secondary concern in AIDRAN. AIDRAN preserves story chains for historical inspection, but the living corpus cannot be frozen for replication.

Academic discourse studies are the methodological ancestor of what AIDRAN does computationally. The research questions in `docs/RESEARCH-QUESTIONS.md` are drawn from the gap between what AIDRAN does and what that literature has studied carefully.

---

## Social Listening Platforms (Sprout Social, Hootsuite Insights, Pulsar, et al.)

Social listening platforms monitor social media for conversations about topics, brands, or trends. They provide engagement metrics, share of voice, influencer identification, and campaign tracking. They are built around social media APIs and are optimized for marketing and communications use cases.

**What they do:** Track social engagement around topics and brands; identify influential accounts; measure campaign reach.

**What AIDRAN does differently:**

- AIDRAN is not social-media-first. Its source set includes arXiv (academic preprints), Hacker News (developer discussion), Google News (journalism), and YouTube (video commentary) in addition to social platforms. The discourse about AI is not primarily a social media phenomenon.
- Social listening measures *engagement* (likes, shares, replies, reach). AIDRAN does not measure engagement. It measures discourse structure: what topics are being discussed, how the framing is changing, where sources disagree.
- Social listening is configured around an account (the client's brand presence) or a set of keywords. AIDRAN is configured around a subject domain, not a keyword list. Keywords are a retrieval tool; subject domains require entity and topic modeling.
- AIDRAN has no influencer identification feature. It does not rank sources by follower count or engagement rate. All sources contribute evidence proportionally to the content they produce.

Social listening answers "how is our brand performing on social media?" AIDRAN is built for "what is the AI discourse producing as a system, independent of any brand's presence in it?"

---

## Summary Table

| Category | What it anchors on | What it measures | Output |
|---|---|---|---|
| LLM newsletter generators | Document set | Recency, readability | Newsletter digest |
| Brand monitoring | Named entity | Mention volume, sentiment, reach | Dashboard, alerts |
| Sentiment dashboards | Subject keywords | Emotional valence over time | Trend charts |
| Academic discourse studies | Research question | Corpus-level patterns (one-off) | Research papers |
| Social listening | Brand / keyword | Social engagement, influencer reach | Reports, campaign analytics |
| **AIDRAN** | **Subject domain** | **Discourse structure change over time** | **Source-attributed versioned stories** |

---

## What AIDRAN Is Not Trying to Do

For completeness:

- **AIDRAN is not a search engine.** It does not answer ad hoc queries about the corpus. It generates stories when signals fire.
- **AIDRAN is not a fact-checker.** It attributes claims to sources; it does not independently verify them.
- **AIDRAN is not a recommendation engine.** It does not personalize output to individual reader preferences.
- **AIDRAN is not a social media management tool.** It reads social platforms; it does not post to them (except for automated story publishing to designated AIDRAN accounts).
- **AIDRAN is not a general-purpose news aggregator.** It is specialized for AI discourse. The specialization is not incidental — the entity taxonomy, source selection, and signal calibration are all domain-specific.

---

*Questions about positioning and category definitions are welcome via GitHub issues.*
