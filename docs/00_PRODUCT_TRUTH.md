# 00 · PRODUCT TRUTH — read this first, every session, no exceptions

> **This is the eternal source of truth for the Olivia / CLUES product universe.** It overrides any other doc, any prior conversation, any prior agent's framing. If something here conflicts with `BOOTSTRAP.md`, `MERGE_PLAN.md`, `BUILD_SEQUENCE.md`, or any other file in this repo, **this file wins** and the conflicting file gets corrected.
>
> Past agents — and Claude in past sessions of this very build — have repeatedly missed the architecture below and built code that didn't fit. That stops here. Every Olivia Brain session **starts** by reading this file. Don't skim. Don't paraphrase. Don't substitute your prior assumptions.
>
> If you finish reading this and your mental model still has "Olivia is a chat assistant," "LifeScore is a top-level product," "the GrandMaster Studio is the homepage," or "Olivia is for relocation + real estate + London tech" as 3 equally-weighted verticals — read it again, because you missed it.

---

## 1. The bicycle-wheel architecture

```
                          cluesintelligence.com
                          (the FLAGSHIP — relocation predictive analytics)
                                       │
       cluesxscore.com ────────┐       │       ┌──────── clueslondon.com
       (23 modular mini-apps,  │       │       │         (London tech ecosystem,
        lifescore is ONE of 23) ╲      │      ╱            CURRENT priority 1)
                                 ╲     │     ╱
                                  ╲    │    ╱
                                   ╲   │   ╱
       clues-property-search ───────╲──┼──╱─────── Heart-Recovery-Calendar
       (real estate / market analysis,  ╲│╱        (heart-health recovery,
        next-year build)            OLIVIA          next-year build)
                                  (the brain at
                                    the hub —
                                ALL DATA PASSES
                                  THROUGH HER)
                                       │
                          London transit app
                          (to-be-designed, 2-year build)
```

**Olivia is the hub.** Every product is a spoke. **All data — every field, every event, every signal — passes through Olivia.** She is not "a chat assistant bolted on top of an app." She is the brain. The apps are surfaces; Olivia is the intelligence layer underneath.

When an agent writes Olivia code, the question is never "should this go through Olivia?" — the answer is always yes. The question is "which of Olivia's subsystems does this belong to?"

---

## 2. Product hierarchy — priority order

### Priority 1 — `clueslondon.com` (closest to done)

> **The world's premier tech ecosystem application for everything London-tech.** Mission: take ideas from mind to market in the world's most diverse tech ecosystem.

**What Olivia does inside clueslondon.com:**

- **District + directory + company intelligence.** Olivia answers any natural-language question about London tech districts, the directory tree, and individual companies.
- **Appointments + calendar.** She books appointments, pushes them to the user's calendar, **places outbound calls**, **receives inbound calls**, and appends every call summary to the calendar automatically.
- **The business document library.** A **12-section, 56–62-page** library of business documents. Olivia walks the user through **every single field** of every document, explaining what's needed and why.
- **One-of-a-kind business documents.** She helps the user complete bespoke business documents in preparation for proposals to angels, seed VCs, partners, and buyout firms in London's tech ecosystem.
- **Pitch decks + business plans.** Both from the existing template library AND fully custom — Olivia can build either path.
- **Marketing creation.** She creates marketing assets for the user's company / product.
- **Gamma PPX presentations.** She generates Gamma-format presentations of the user's company / product and **presents them to the top-3 matches** identified by clueslondon's executive findings report.
- **Agentic learning.** She continuously learns the user's needs, patterns, and wants in the London tech ecosystem.
- **Daily / weekly briefs.** She prepares scheduled briefs of things that directly affect the user or could benefit them.

**She is the brain of clueslondon.com. ALL data of the entire clueslondon.com ecosystem passes through her.** Repeat: **all of it**. Not "most." Not "the chat parts." **All of it.**

**Repo:** `D:\London-Tech-Map` (read-only from this repo — see protected-repo rules in `~/CLAUDE.md`).

---

### Priority 2 — `cluesintelligence.com` (the FLAGSHIP)

> **The entire company is built on this product.** Predictive analytics for relocation. Bayesian-style massive questionnaire engine that derives a user's persona from their answers and predicts where in the world they should live.

**The questionnaire architecture (this is the heart of the company):**

1. **Paragraphicals.** Questions are not multiple-choice fields — they are **paragraph-style** ("paragraphical") prompts that elicit nuanced free-text answers, which the LLM cascade then parses into structured signal.
2. **Main segmented questionnaire** — five segments:
   - **Demographics**
   - **Do-not-wants**
   - **Must-haves**
   - **Trade-offs**
   - **General questions**
3. **23 focus modules**, each with **100 questions**.
4. **Upstream Bayesian router** decides — per user, dynamically — **which modules** and **which questions within each module** the user actually answers. Not every user sees all 2,300 module questions; the upstream system selects what's relevant.
5. **Persona derivation.** The full set of answers is distilled into a unique user persona.
6. **24 advanced pages of math and reasoning.** Quantitative scoring across the persona's must-haves, do-not-wants, and trade-offs.
7. **6-LLM cascade + Tavily + Opus judge** weighs:
   - The questions and answers themselves
   - The mathematics from the 24 reasoning pages
   - Real-time web search (Tavily) for current data
   - **Opus 4.6 (Cristiano™) renders the unilateral final verdict.**
8. **Output: the top-3 cities, top-3 towns, top-3 neighborhoods anywhere in the world** that are uniquely best for that specific user.
9. **Reports + pages + visuals.** Tons of them.
10. **Olivia walks the user through everything.** Every field, every detail, every visual, every city, every question, every edge case — and **simulates "what-if" changes** ("if I changed answer X, how would that affect the report?").

This is the flagship. When prioritization conflicts arise between Olivia features, **cluesintelligence.com wins** unless clueslondon.com is explicitly named as a higher priority for the current sprint.

**Repo:** to be created. Olivia Brain (`D:\Olivia Brain`) currently hosts the cascade + persona + memory infrastructure that cluesintelligence will consume.

---

### Priority 3 — `cluesxscore.com` (23 modular mini-apps)

> **`X` is a placeholder for any single metric category.** Each mini-app compares 2 cities on **100 metrics within that one category**. There will be **23 of these mini-apps total**, one per category.

- **Database:** 200 cities (100 North America + 100 Europe). Growing.
- **Each mini-app:** pick any 2 cities → compare on 100 metrics in that category → output the verdict (which city wins on what).
- **Examples:**
  - `lifescore.com` (one of the 23)
  - `cluestransitscore.com` (e.g., LA vs Berlin on 100 transportation metrics)
  - `cluesenvironmentalscore.com` (any 2 cities, 100 environmental metrics)

> **CRITICAL CORRECTION** — **`lifescore.com` is NOT a top-level product.** It is **one of 23 cluesxscore modules.** Past agents (and my prior turns in this build) have framed it as a peer-level product. That is wrong. LifeScore is a sub-product of cluesxscore. Future framing must reflect this.

**Repo:** to be created.

---

### Priority 4 — Olivia herself, white-labeled

Olivia ships as a **standalone, white-labelable, modular-gateway-configurable** product that other companies in **real estate** or **relocation** can adopt for their own use cases. The same Olivia Brain (`D:\Olivia Brain`) powers her in every deployment; the gateway adapter selects which vertical's data sources, prompts, and surfaces are exposed.

**Repo:** `D:\Olivia Brain` (this one).

---

### Priority 5 — `clues-property-search` (next-year build)

> Real-estate residential sales market evaluations + buyer brokerage. Includes new-construction home sales evaluation.

**Repo:** https://github.com/johndesautels1/clues-property-search

---

### Priority 6 — `Heart-Recovery-Calendar` (next-year build)

> Heart-health recovery tracking + calendar.

**Repo:** https://github.com/johndesautels1/Heart-Recovery-Calender

---

### Priority 7 — London transit app (2-year build)

> To-be-designed. Will be a hub-and-spoke surface like the others.

---

## 3. Olivia's role across all of them

> **All data passes through Olivia. Every field. Every event. Every signal. Every API response. Every user action.**

Olivia is not a feature. She is the substrate. Every app surface is a presentation layer over the answers Olivia produces. Specifically:

- **Conversations** — Olivia is the interlocutor for every user-facing chat / voice / video moment. Same brain across every product.
- **Persona memory** — built once (primarily during cluesintelligence onboarding) and reused across every product the user touches.
- **Cascade reasoning** — every "smart" output (city verdict, document field suggestion, pitch slide, score-comparison ranking, marketing copy, brief) comes from the cascade + persona + memory stack inside Olivia Brain.
- **Calendar / call orchestration** — Olivia runs the user's appointments, places and receives calls, takes notes, files them.
- **Agentic learning** — she observes what the user does across all surfaces and updates her model of them.
- **Daily / weekly briefs** — she generates them across whichever product the user is most active in.
- **White-label gateway** — the gateway adapter is what lets a third party plug Olivia into their own real-estate or relocation surface. The adapter does NOT replace Olivia; it filters and re-routes her.

**This is what "the brain at the hub of the bicycle wheel" means.** It is not a metaphor for a marketing diagram. It is the architecture.

---

## 4. What this means for Olivia Brain code (this repo)

`D:\Olivia Brain` is the implementation of Olivia herself. Every line of code in this repo serves the bicycle-wheel architecture. Concretely:

- **`src/lib/services/model-cascade.ts`** is the 6-LLM cascade + Opus judge + Tavily that cluesintelligence.com depends on for the city/town/neighborhood verdict. It is also what clueslondon.com uses for document drafting, pitch generation, and marketing creation. Same cascade, different prompts per intent.
- **`src/lib/bridge/`** is the universal-knowledge-provider layer that lets Olivia answer questions sourced from clueslondon.com data (via `LtmKnowledgeProvider`), her own DB (via `OliviaSelfProvider`), and — incoming — cluesintelligence's questionnaire data, cluesxscore's metric data, etc.
- **`/api/olivia/chat`** is the universal chat endpoint every product calls. Same endpoint. Different `pageContext` / `pipelineContext` / `documentContext` payloads tell Olivia which surface she's serving on this turn.
- **`src/lib/memory/store.ts`** is the persona / conversation / episode memory shared across products. A user's persona built during cluesintelligence onboarding **is the same persona** that walks them through clueslondon's document library two months later.
- **Avatar, voice, calendar, calls, briefs** all live (or will live) inside this repo and are consumed by the products as cross-cutting services.

When an agent is unsure where a feature belongs: **does it produce, persist, or transform data Olivia uses to reason?** If yes, it lives in Olivia Brain. If it's a presentation surface, it lives in the product repo.

---

## 5. Anti-patterns — past agents (and prior Claude sessions) have done these. Do NOT repeat.

1. **Treating Olivia as a chat assistant bolted on top of one app.** She is the brain underneath all of them.
2. **Treating LifeScore as a peer of cluesintelligence / clueslondon.** It is one of 23 cluesxscore modules. Sub-product.
3. **Treating "the GrandMaster Studio" as Olivia's homepage.** GrandMaster is the **clueslondon.com pitch-deck/document-library Studio surface**. It is one product's center module. It is **not** the homepage of Olivia Brain. It is **not** the homepage of cluesintelligence. It is **not** the cluesxscore comparison view.
4. **Treating "relocation, real estate, and London tech" as three equally-weighted verticals.** They map onto **specific products** with **specific priorities**:
   - Relocation → cluesintelligence.com (flagship, priority 2)
   - London tech → clueslondon.com (priority 1, current focus)
   - Real estate → clues-property-search (priority 5, next-year)
5. **Building a UI shell without first knowing which product the shell serves.** Every UI shell must be tied to a product in the hierarchy above. "A general homepage for Olivia Brain" is not a thing — Olivia Brain is the brain, not a user-facing app. The user-facing apps are clueslondon, cluesintelligence, cluesxscore.
6. **Inventing a "vertical adapter" or "Olivia-everywhere" abstraction without grounding it in this hierarchy.** Adapters exist (white-label productization, priority 4), but they are **adapter shells over the products in this hierarchy** — not generic verticals.
7. **Skipping this doc and building from `BUILD_SEQUENCE.md` alone.** BUILD_SEQUENCE describes implementation order; THIS doc describes what is being implemented. Read this **first**, every session.

---

## 6. The mandate

Every Olivia Brain session begins by reading this file. Every architectural decision is verified against this hierarchy. Every doc that contradicts this file gets corrected to match — this file does not bend to other docs. The product universe described here is the eternal source of truth. The bicycle-wheel architecture is non-negotiable. The priority order is non-negotiable. The "all data passes through Olivia" principle is non-negotiable.

If a future change is needed (e.g., a new product joins the wheel, a priority shifts), **the user updates this file first**, then BUILD_SEQUENCE / MERGE_PLAN / BOOTSTRAP follow. Never the other way around.
