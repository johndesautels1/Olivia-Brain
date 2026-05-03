# 04 · CLUESINTELLIGENCE — unification plan (audit + fold-in)

> **Read `00_PRODUCT_TRUTH.md` first**, then `03_BRAIN_ENRICHMENT_ENGINE.md`. This file is the audit + unification plan for **cluesintelligence.com — the flagship**. It captures the current architectural reality based on the canonical mission and architecture docs in `D:\Clues Main\` and the user's verbal direction. It defines how the GitHub `clues-questionnaire-engine` repo (current truth) folds into a unified cluesintelligence app, and how that unified app talks to Olivia Brain.

---

## ⚠️ Subject-to-change notice

> **Final architectural details on cluesmain.com / cluesintelligence.com are still being actively worked out by the founder and team.** The questions are being redone, the Bayesian mathematics is being slightly revised, and additional technologies for question design and answering are landing. Anything in this doc that touches **the question bank**, **the Bayesian routing math**, **the persona schema specifics**, or **the report layout** is **subject to change**. The architectural primitives (5-LLM cascade + Opus judge, 30 paragraphs in 6 phases, 23 modules in funnel order, step-in/step-out tier engine, ProfileSignal → EvaluationMetric bridge, Smart Score with dual scoring, three-report deliverable) are **stable** and will remain so. When the questionnaire team locks the new question bank and the revised Bayesian, this file gets a follow-up commit.

---

## 1. The two repos

| Repo | Status | Role |
|------|--------|------|
| `D:\Clues Main` (also github.com/johndesautels1/Clues-Main, deployed at `clues-main.vercel.app`) | **Code is way behind**; canonical **docs** are current | Vision / mission canonical: `CLUES_MISSION.md`, `PARAGRAPHICAL_ARCHITECTURE.md`, `URGENT_ARCHITECTURE_GAP.md`, `CLUES_MAIN_BUILD_REFERENCE.md`, `LLM_PROVIDER_ARCHITECTURE.md`. **Treat the docs as authoritative**, the code as historical. |
| `github.com/johndesautels1/clues-questionnaire-engine` (private, deployed at `clues-questionnaire-engine-git-244830-clues-desautels-projects.vercel.app`) | **Code is current truth** — actively fixing many of main's weaknesses | The active engineering surface. Folds into the unified app. **Local D:\clues-questionnaire-engine is stale (different computer); do not trust it.** |

**Goal:** unify both into one cluesintelligence application. The questionnaire engine's improvements (revised questions, refined Bayesian, additional question-design technologies) become the basis. Clues Main's docs remain the vision; its code is replaced or rewritten.

---

## 2. What's already built — taken from `D:\Clues Main` canonical docs

> All claims in this section come from `URGENT_ARCHITECTURE_GAP.md` (dated 2026-03-10) and `PARAGRAPHICAL_ARCHITECTURE.md` (dated 2026-03-06). The questionnaire engine repo has since revised pieces of this; treat the list below as the **architectural baseline** the engine builds on, not a final code inventory.

### 2.1 Data collection layer (BUILT)

| Source | File (in Clues Main) | Output |
|--------|----------------------|--------|
| Globe Selection | `src/components/Dashboard/GlobeExplorer.tsx` | `GlobeSelection { region, lat, lng, zoomLevel }` |
| Paragraphical (P1–P30, 6 phases) | `src/components/Paragraphical/ParagraphicalFlow.tsx` | 30 free-form text paragraphs |
| Demographics (Q1–Q34) | Main Module | `DemographicAnswers` |
| Do-Not-Wants / DNW (Q35–Q67, severity 1–5) | Main Module | `DNWAnswers` |
| Must-Haves / MH (Q68–Q100, importance 1–5) | Main Module | `MHAnswers` |
| Trade-offs (50 sliders 0–100) | `src/data/questions/tradeoff_questions.ts` | Slider positions |
| General Questions (50 mixed) | `src/data/questions/general_questions.ts` | Mixed answer types |
| Mini Modules (23 × 100) | `src/data/questions/<module_id>.ts` | Per-module answer sets |

**Total question library: ~2,500.** Target: most users complete ~250 answers to reach 2% MOE.

### 2.2 The 30 Paragraphs in 6 Phases

| Phase | Paragraphs | Purpose |
|-------|-----------|---------|
| Phase 1 — Profile | P1, P2 | Demographics baseline |
| Phase 2 — Do Not Wants | P3 | Hard elimination filters |
| Phase 3 — Must Haves | P4 | Required-presence thresholds |
| Phase 4 — Trade-offs | P5 | Category weighting flexibility |
| Phase 5 — Module Deep Dives | P6–P28 (1:1 mapped to 23 modules) | Narrative deep dive per dimension |
| Phase 6 — Vision | P29, P30 | Implicit lifestyle + wildcard |

### 2.3 The 23 Category Modules (Funnel Order)

| Tier | # | Module ID | Module Name |
|------|---|-----------|-------------|
| **SURVIVAL** | 1 | `safety_security` | Safety & Security |
| | 2 | `health_wellness` | Health & Wellness |
| | 3 | `climate_weather` | Climate & Weather |
| **FOUNDATION** | 4 | `legal_immigration` | Legal & Immigration |
| | 5 | `financial_banking` | Financial & Banking |
| | 6 | `housing_property` | Housing & Property |
| | 7 | `professional_career` | Professional & Career |
| **INFRASTRUCTURE** | 8 | `technology_connectivity` | Technology & Connectivity |
| | 9 | `transportation_mobility` | Transportation & Mobility |
| | 10 | `education_learning` | Education & Learning |
| | 11 | `social_values_governance` | Social Values & Governance |
| **LIFESTYLE** | 12 | `food_dining` | Food & Dining |
| | 13 | `shopping_services` | Shopping & Services |
| | 14 | `outdoor_recreation` | Outdoor & Recreation |
| | 15 | `entertainment_nightlife` | Entertainment & Nightlife |
| **CONNECTION** | 16 | `family_children` | Family & Children |
| | 17 | `neighborhood_urban_design` | Neighborhood & Urban Design |
| | 18 | `environment_community_appearance` | Environment & Community Appearance |
| **IDENTITY** | 19 | `religion_spirituality` | Religion & Spirituality |
| | 20 | `sexual_beliefs_practices_laws` | Sexual Beliefs, Practices & Laws |
| | 21 | `arts_culture` | Arts & Culture |
| | 22 | `cultural_heritage_traditions` | Cultural Heritage & Traditions |
| | 23 | `pets_animals` | Pets & Animals |

### 2.4 The 5-LLM Cascade + Opus Judge

| Role | Model | Purpose |
|------|-------|---------|
| Reasoning + extraction | **Gemini 3.1 Pro Preview** with `thinking_level: high` + Google Search grounding | Paragraph-to-metric extraction (100–250 numbered metrics M1–Mn from the 30 paragraphs); initial country / city / town / neighborhood recommendations |
| Evaluation #1 | Claude Sonnet 4.6 | Web search + structured evaluation |
| Evaluation #2 | GPT-5.4 | Web search + factual ground-truth |
| Evaluation #3 | Grok 4.1 Fast Reasoning | 2M context, math-strong |
| Evaluation #4 | Perplexity Sonar Reasoning Pro High | Best native web search |
| Tavily | (research API) | Source-citation augmentation |
| **Judge** | **Opus 4.6 (Cristiano)** | Resolves disagreements, no web search, judges **every tier** |

> **Important correction to my earlier framing.** The cluesintelligence cascade is **5 evaluating LLMs + Opus as judge** (6 models total counting Opus), **not 6 evaluating LLMs**. Opus does NOT search the web by design — he is the judge, not the investigator. The Olivia Brain `model-cascade.ts` currently has an 8-9 model fallback chain; for the cluesintelligence verdict path specifically, it must operate as 5+1 (5 evaluators + Opus judge) per the canonical architecture.

### 2.5 Tier Engine — step-in / step-out

| Tier | Trigger | Active LLMs | Judge | Tavily Calls |
|------|---------|-------------|-------|--------------|
| `discovery` | Paragraphical only | 1 (Gemini) | Yes | 5 |
| `exploratory` | + Demographics | 2 (+ Sonnet) | Yes | 10 |
| `filtered` | + DNW | 3 (+ GPT-5.4) | Yes | 15 |
| `evaluated` | + MH | 4 (+ Grok) | Yes | 20 |
| `validated` | + General Questions | 5 (+ Sonar) | Yes | 200 |
| `precision` | + Mini Modules | 5 (all) | Yes | 200+ |

**Opus judges at every tier.** The Paragraphical alone produces a complete 100+ page report; modules enhance accuracy, they don't enable it.

### 2.6 Bridge — ProfileSignal → EvaluationMetric (built 2026-03-10)

Converts answers from any combination of inputs (Paragraphical, Main Module, Mini Modules) into the unified `EvaluationMetric[]` shape the cascade consumes. Three judge-personalization gaps remain open — see `URGENT_ARCHITECTURE_GAP.md` § 8.3.

### 2.7 Smart Score (per-app primitive)

Currently implemented in Clues Main / questionnaire-engine in the LifeScore pattern: per-metric normalization → category rollup (weighted average) → city rollup (weighted sum) → relative scoring → tie-break. Includes optional **dual scoring** (legal vs lived/enforcement) for relevant metrics.

> **Per-app variation.** Smart Score is **not universal across the bicycle wheel.** Each spoke app implements its own domain-appropriate score: cluesintelligence = relocation fitness, cluesxscore.lifescore = legal-freedom comparison, cluesxscore.transitscore = mobility comparison, clueslondon = pitch readiness / company match, HEARTBEAT = recovery progression, clues-property-search = valuation. Olivia Brain provides the **display primitives** (`ScoreChip`, `ScoreRadar`, `MetricLadder` per `01_UI_DESIGN_SYSTEM.md`) but never a "universal Smart Score formula." Each app owns its scoring math.

### 2.8 Three Reports

| Report | Content |
|--------|---------|
| **Results Data Report** | Raw per-metric, per-LLM data grid; mean / median / mode / stddev; Opus's per-metric adjustments; "show your work." |
| **LLM Analysis Reports** | Each evaluating LLM's narrative synthesis with their own visuals + comparative displays. |
| **CLUES GAMMA Report** | The "WOW" deliverable. Everything from Reports 1 + 2 pushed into Gamma → 100+ pages, professionally polished, source-cited, Cristiano judicial verdict, optional 5-minute HeyGen "Your New Life in [Winning City]" video, designed to be shared with spouse / advisor / family. |

### 2.9 Cristiano Delivery Pipeline

- **Quick Verdict via Simli** (real-time avatar narration, immediate post-evaluation).
- **WOW Moment via HeyGen** (5-min cinematic video covering the winning city, top-3 towns, top-3 neighborhoods).

---

## 3. The unification target — divide of responsibility

The unified cluesintelligence application + Olivia Brain split as follows.

### 3.1 Lives in Olivia Brain (`D:\Olivia Brain`)

The brain owns infrastructure and intelligence that any spoke can consume. Specifically for cluesintelligence:

- The **5-LLM cascade + Opus judge** (extension of existing `src/lib/services/model-cascade.ts` to expose a "verdict mode" with the 5+1 contract).
- **Persona memory** (Olivia Brain's existing memory layer ingests cluesintelligence answers via the BEE data-event channel — see `03_BRAIN_ENRICHMENT_ENGINE.md`).
- **Olivia narration over `/api/olivia/chat`** with cluesintelligence-shaped `pipelineContext` / `documentContext` payloads — already wired (Session 5).
- **Voice + LiveAvatar** — Olivia Brain owns the streaming pipeline; cluesintelligence consumes it as a Web Component or iframe.
- **Calendar / call orchestration** — for follow-up consultations after a verdict lands.
- **Agentic learning + daily/weekly briefs** — Olivia tracks the user's ongoing relocation journey.
- **The Brain Enrichment Engine endpoints** (`03_BRAIN_ENRICHMENT_ENGINE.md`) — cluesintelligence emits schema/data/knowledge events here.

### 3.2 Lives in the unified cluesintelligence app

Owns the **user-facing surfaces specific to relocation predictive analytics**:

- **The questionnaire UI** — the Paragraphical flow, the Main Module (Demographics / DNW / MH / Tradeoffs / General), the Mini Modules. Adaptive engine drives question selection.
- **The persona snapshot UI** — what the user sees about themselves so far.
- **The 24+ math / reasoning pages** (the "show your work" Results Data Report). These run server-side using shared compute primitives but their UI lives in the cluesintelligence app.
- **The verdict reveal** — `VerdictBlock` primitive (from `01_UI_DESIGN_SYSTEM.md`) + Cristiano-saturated Aurum transition + drill-into-city / town / neighborhood.
- **The what-if simulator UI** — "what if I changed answer X."
- **The three-report renderer** — links to Gamma for the GAMMA Report, in-app for Reports 1 + 2.
- **The Globe Explorer** — region selection at the start of the flow.
- **The Smart Score implementation** for relocation fitness (per § 2.7 — own-domain scoring math).

### 3.3 Lives in the spoke ↔ brain interface

- **Bridge providers** in Olivia Brain: a `CluesIntelligenceProvider` implementing `UniversalKnowledgeProvider` so other spokes (or Olivia herself in conversation) can ask "what's this user's persona?" / "what was their last verdict?" / "which modules has the user completed?" — the standard cross-app contract.
- **`UniversalKnowledgeProvider` queries** are read-only from the brain's perspective; **mutations always originate in the spoke app** and propagate to the brain via BEE data events.
- **Auth**: Clerk (Track F, Session 18) issues a tenant-scoped session that both the cluesintelligence app and Olivia Brain accept.

---

## 4. The fold-in path — questionnaire-engine → unified app

The user's direction: "the questionnaire engine has much more accurate code that is up to date" and "[Clues Main] is way behind." The unified app's code base starts from the questionnaire-engine, with Clues Main's mission docs preserved as the vision.

### 4.1 Repo strategy

**Recommended:** rename `clues-questionnaire-engine` to `cluesintelligence` (or keep the existing name if branding matters), and treat it as the unified repo. Migrate any salvageable code from Clues Main into it (likely the Globe Explorer, the report components that are "PARTIALLY BUILT," and the GAMMA Report template). Retire `Clues-Main` repo to read-only / archive once the migration is done.

> **Caveat:** this recommendation depends on the actual state of the questionnaire-engine, which I cannot audit yet (private repo). If the questionnaire-engine is significantly different in scaffold (e.g., uses a different framework or has stripped pieces I've assumed are there), the strategy reverses: bring questionnaire-engine improvements **into** Clues Main's scaffold.

### 4.2 What lands in Olivia Brain from this work

Net additions to `D:\Olivia Brain` to fully support cluesintelligence:

1. **Verdict-mode cascade endpoint** — `/api/intelligence/verdict` that runs the 5-LLM + Opus contract specifically (different prompt shape, different fallback semantics) on top of `runModelCascade`.
2. **Persona derivation endpoint** — `/api/intelligence/persona` that incrementally derives a persona snapshot from the user's answers, using the cascade's structured-output capability.
3. **What-if endpoint** — `/api/intelligence/whatif` that recomputes the verdict delta when the user hypothetically changes specific answers.
4. **Memory writers for cluesintelligence-specific events** — DNW severity ≥ 4, MH importance ≥ 4, module completion, verdict-flagging events. Wired through BEE.
5. **`CluesIntelligenceProvider`** — bridge provider exposing persona / verdict / completion-status to other spokes via the registry.
6. **Olivia-narration helpers for the cluesintelligence surface** — system-prompt templates that frame the assistant as the user's personal walkthrough guide for paragraphs, persona state, math/reasoning pages, and verdict cities.

The unified cluesintelligence app gets:

1. **The (active) questionnaire engine refinements** — revised questions, revised Bayesian math, new question-design technologies (specifics still in flux per the user).
2. **The Globe Explorer + report components from Clues Main** if they outclass anything in the questionnaire-engine.
3. **The full design-system tokens + primitives** from `01_UI_DESIGN_SYSTEM.md`.
4. **An `@olivia/enrichment-client` integration** (per `03_BRAIN_ENRICHMENT_ENGINE.md` § 11) — emits BEE events on every answer change, completion, verdict generation.
5. **An Olivia Web Component embed** — voice + face + chat, in the inspector pane, calling `/api/olivia/chat` with cluesintelligence-shaped contexts.

---

## 5. Sequence — proposed Track L additions

To be added to `BUILD_SEQUENCE.md` once the questionnaire-engine code is auditable.

| Session | Deliverable |
|---------|-------------|
| **L0** | Audit the questionnaire-engine repo (after access unblocks). Produce a delta vs. Clues Main canonical docs. Update this file with locked architectural decisions. |
| **L1** | Olivia Brain: add `/api/intelligence/verdict` + `/api/intelligence/persona` + `/api/intelligence/whatif`. Vitest. |
| **L2** | Olivia Brain: `CluesIntelligenceProvider` bridge provider. Memory writers for cluesintelligence event filter. Vitest. |
| **L3** | Brain Enrichment Engine phase B1–B3 (`03_BRAIN_ENRICHMENT_ENGINE.md`): inbound endpoints + schema + data + knowledge handlers. Vitest. |
| **L4** | Unified app side: integrate `@olivia/enrichment-client`, emit answer-change / completion / verdict events. End-to-end smoke test from answer-edit → BEE → memory write → next Olivia turn references the change. |
| **L5** | Verdict pipeline end-to-end: Globe → Paragraphical → cascade → Opus judge → 3 reports. Stub Gamma; production Gamma in L7. |
| **L6** | Olivia narration + voice integration on the unified app (inspector pane on the workspace shell from Track C). |
| **L7** | GAMMA Report production integration + Simli quick verdict + HeyGen 5-min cinematic. |
| **L8** | What-if simulator end-to-end with the BEE delta-computation path. |
| **L9** | Patronus eval pass + load test the verdict path at meaningful concurrency. |
| **L10** | Launch readiness — DNS, environment audit, observability dashboards, documentation pass. |

**Sequencing recommendation (per `00_PRODUCT_TRUTH.md` priority hierarchy):** ship clueslondon first (priority 1, currently focused via the existing Build Sequence Tracks A–F). Track L starts after Track F's core lands — realistically around Session 17–18. cluesintelligence ships **after** the 2026-06-02 deadline unless the user explicitly chooses to pull Track L forward at the cost of clueslondon polish.

---

## 6. What's NOT yet decided (subject to change)

These are flagged because the user is actively iterating on them:

| # | Open in active design | Locked when |
|---|----------------------|-------------|
| 1 | The exact question prompts (paragraphical + main module + mini modules) — being redone | When the questionnaire team locks the new bank |
| 2 | The Bayesian routing math — slightly revised from the version in `URGENT_ARCHITECTURE_GAP.md` | When the engineering team merges the revision |
| 3 | The "many additional technologies" for question design and answering — not yet specified | When the user shares specifics |
| 4 | The persona attribute schema — likely evolving alongside the question revisions | TBD |
| 5 | The 24-page math/reasoning structure — adjacent to persona schema | TBD |
| 6 | Whether the unified repo lives at `cluesintelligence` (renamed from questionnaire-engine) or as a new top-level repo | TBD |
| 7 | Migration path for existing personas / answers when the schema revises | TBD — likely an enrichment-engine knowledge-event with `affectedUserScope: "all"` |

---

## 7. The mandate

This file is the source of truth for cluesintelligence the same way `00_PRODUCT_TRUTH.md` is for the universe and `01_UI_DESIGN_SYSTEM.md` is for the UI. It will be **updated in place** when the active design decisions land — never replaced or duplicated. The architectural primitives (5+1 cascade contract, 30 paragraphs in 6 phases, 23 modules in funnel order, step-in/step-out tier engine, ProfileSignal → EvaluationMetric bridge, three-report deliverable) are stable. The content (questions, Bayesian specifics, persona schema, page structure) is in flux and will be revised in this file as the user's team locks each decision.

Until those decisions land, **no Track L code is written.** The architectural primitives let us prepare Olivia Brain (the bridge provider, the verdict endpoint, the persona endpoint, the BEE plumbing) without depending on the question content. We do that in parallel with the user's content team.
