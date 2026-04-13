# Sprint 4.6 CLUES Product Integration — Agent Handoff

> **Session Date**: 2026-04-13
> **Last Commit**: `7d2d1f4` — Mark Sprint 4.5 complete (7/7 items done)
> **Status**: Sprint 4.5 COMPLETE, Sprint 4.6 PENDING (0/10 items)
> **Next Action**: Build Item 1 (CLUES Intelligence LTD adapter), then continue through Items 2-10

---

## CRITICAL: READ THESE FILES FIRST

1. **`BATTLE_PLAN.md`** — Master build plan, Sprint 4.5 COMPLETE, Sprint 4.6 next
2. **`OLIVIA_BUILD_STATE.md`** — Which items are app-independent vs blocked
3. **`docs/SPRINT_45_HANDOFF.md`** — Previous sprint handoff (all 7 items done)
4. **This file** — Continuation point

---

## REPO LOCATION

- **Local**: `D:\Olivia Brain\`
- **GitHub**: `https://github.com/johndesautels1/Olivia-Brain`
- **Branch**: `main`

---

## ARCHITECTURE RULES (NON-NEGOTIABLE)

- Same rules as Sprint 4.5 handoff — read that file
- `src/lib/integrations/` = Sprint 4.6 integration module (NEW directory, likely)
- All services use singleton factory + NoOp fallback pattern when applicable
- Uses `generateText` from AI SDK with `maxOutputTokens` (NOT maxTokens)
- Discuss each function in detail before coding
- Run `npm run build` before every commit
- Every commit must be immediately pushed to GitHub
- One task at a time — complete, commit, check in

---

## COMPLETED THIS SESSION (Sprint 4.5 — all 7 items)

### Item 1: Red-Team Eval Harness ✅ — `f070ade`
- `src/lib/evaluation/red-team.ts` — 40 adversarial scenarios, 10 attack categories, pattern matching + Opus judge, severity-weighted scoring

### Item 2: Conversation QA Scorecards ✅ — `f92783d`
- `src/lib/evaluation/qa-scorecards.ts` — 6 quality dimensions (helpfulness, accuracy, persona-consistency, compliance, emotional-intelligence, task-completion), heuristic + Opus judge two-layer scoring, weighted overall score, letter grades, aggregate stats

### Item 3: Weekly Model Bake-Off ✅ — `6aa996e`
- `src/lib/evaluation/model-bakeoff.ts` — 15 benchmark prompts × 8 cascade models, Opus judge on 4 dimensions (quality/relevance/accuracy/persona), ranked comparison reports with latency + cost tracking

### Item 4: Braintrust Evals + Prompt Playground ✅ — `2a61821`
- `src/lib/evaluation/braintrust.ts` — Structured eval logging (single + batch), prompt versioning, A/B prompt experiments with 4 Olivia variants, braintrust SDK integration

### Item 5: Patronus AI Hallucination Detection ✅ — `c0351e7`
- `src/lib/evaluation/patronus.ts` — 6 evaluators (hallucination, factual-consistency, answer-relevance, context-sufficiency, toxicity, PII), patronus-api SDK, batch scoring, quick-check helpers

### Item 6: Cleanlab Data Quality Scoring ✅ — `c5a88db`
- `src/lib/evaluation/cleanlab.ts` — 6 issue types (label-error, outlier, near-duplicate, low-quality, ambiguous, inconsistent), Cleanlab API + heuristic fallback (Jaccard similarity, modified Z-score, vocabulary diversity)

### Item 7: A/B Test Avatar Personalities ✅ — `46cc831`
- `src/lib/evaluation/ab-avatar.ts` — 8 personality dimensions, deterministic FNV-1a user-variant assignment, weighted traffic, Z-test statistical comparison, 5 built-in Olivia variants

---

## REMAINING: Sprint 4.6 Items 1-10

### Item 1: CLUES Intelligence LTD Adapter (UK Flagship)
- **What**: Adapter service for CLUES Intelligence LTD (UK company) — Olivia's bridge to CLUES UK operations
- **Pattern**: HTTP client adapter with typed endpoints, singleton factory, NoOp fallback
- **Proposed file**: `src/lib/integrations/clues-intelligence.ts`
- **Env vars**: `CLUES_INTELLIGENCE_API_KEY`, `CLUES_INTELLIGENCE_BASE_URL`

### Item 2: CLUES London Tech Map Integration
- **What**: Connect Olivia to the London Tech Map platform for UK tech ecosystem data
- **Pattern**: Adapter using existing `CLUES_LONDON_BASE_URL` and `CLUES_LONDON_INTERNAL_API_KEY` from env.ts
- **Proposed file**: `src/lib/integrations/clues-london-tech-map.ts`

### Item 3: CLUES LifeScore Integration
- **What**: Adapter for clueslifescore.com — holistic life scoring for relocation decisions
- **Proposed file**: `src/lib/integrations/clues-lifescore.ts`
- **Env vars**: `CLUES_LIFESCORE_API_KEY`, `CLUES_LIFESCORE_BASE_URL`

### Item 4: 20 LifeScore Module Apps
- **What**: Individual module adapters for the 20 LifeScore assessment modules
- **Proposed file**: `src/lib/integrations/lifescore-modules.ts`

### Item 5: CLUES-TES™ (Transit Environmental Systems)
- **What**: Transit and environmental scoring for city evaluations
- **Proposed file**: `src/lib/integrations/clues-tes.ts`

### Item 6: HEARTBEAT™ (Cardiac Recovery)
- **What**: Health monitoring integration for cardiac recovery tracking
- **Proposed file**: `src/lib/integrations/heartbeat.ts`

### Item 7: Stay or Sell™ Advisor (FL Coastal)
- **What**: Florida coastal property advisor — stay or sell decision engine
- **Proposed file**: `src/lib/integrations/stay-or-sell.ts`

### Item 8: Tampa Bay Brokerage Stack
- **What**: Tampa Bay real estate brokerage data integration
- **Proposed file**: `src/lib/integrations/tampa-brokerage.ts`

### Item 9: Predictive Analytics Engine
- **What**: Predictive models for market trends, pricing, and relocation outcomes
- **Proposed file**: `src/lib/integrations/predictive-analytics.ts`

### Item 10: CORPUS™ Document Suite (84-doc DNA Engine)
- **What**: Document generation and management system for the 84-document DNA Engine
- **Proposed file**: `src/lib/integrations/corpus-documents.ts`

---

## KEY FILE MAP

### Evaluation Services (Sprint 4.5 — COMPLETE)
| File | Purpose |
|------|---------|
| `src/lib/evaluation/index.ts` | Module exports for all 7 evaluation services |
| `src/lib/evaluation/red-team.ts` | Red-team adversarial testing (Item 1) |
| `src/lib/evaluation/qa-scorecards.ts` | Conversation QA scorecards (Item 2) |
| `src/lib/evaluation/model-bakeoff.ts` | Weekly model bake-off (Item 3) |
| `src/lib/evaluation/braintrust.ts` | Braintrust evals + prompt playground (Item 4) |
| `src/lib/evaluation/patronus.ts` | Patronus hallucination detection (Item 5) |
| `src/lib/evaluation/cleanlab.ts` | Cleanlab data quality scoring (Item 6) |
| `src/lib/evaluation/ab-avatar.ts` | A/B test avatar personalities (Item 7) |

### Execution Services (Sprint 4.4 — COMPLETE)
| File | Purpose |
|------|---------|
| `src/lib/execution/index.ts` | Module exports |
| `src/lib/execution/action-budgets.ts` | Action budget enforcement |
| `src/lib/execution/inngest-client.ts` | Inngest client + typed events |
| `src/lib/execution/inngest-functions.ts` | 4 durable step functions |
| `src/lib/execution/queue.ts` | QStash fire-and-forget queue |
| `src/lib/execution/trigger-client.ts` | Trigger.dev SDK config |
| `src/lib/execution/trigger-tasks.ts` | 5 long-running tasks |
| `src/lib/execution/temporal-client.ts` | Temporal client service |
| `src/lib/execution/temporal-workflows.ts` | 5 crash-proof workflows |

### Config
| File | Purpose |
|------|---------|
| `src/lib/config/env.ts` | All env vars (Zod-validated, cached singleton) |

---

## ENV VARS ADDED IN SPRINT 4.5

```
BRAINTRUST_API_KEY    — Braintrust eval logging + prompt versioning
PATRONUS_API_KEY      — Patronus hallucination detection
CLEANLAB_API_KEY      — Cleanlab data quality scoring
```

---

## PACKAGES ADDED IN SPRINT 4.5

```
braintrust      — Structured eval logging, prompt management, A/B experiments
patronus-api    — Hallucination detection, factual consistency, toxicity, PII
```

---

## LLM CALL PATTERN (for reference)

```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getServerEnv } from "@/lib/config/env";

const env = getServerEnv();
const result = await generateText({
  model: anthropic(env.ANTHROPIC_MODEL_JUDGE), // Opus 4.6
  system: "system prompt here",
  prompt: "user prompt here",
  temperature: 0.2,
  maxOutputTokens: 500, // NOT maxTokens
});
const text = result.text;
```

---

## GIT HISTORY THIS SESSION

```
7d2d1f4 — Mark Sprint 4.5 complete (7/7 items done)
46cc831 — Add A/B Test Avatar Personalities (Sprint 4.5 Item 7)
c5a88db — Add Cleanlab Data Quality Scoring (Sprint 4.5 Item 6)
c0351e7 — Add Patronus AI Hallucination Detection (Sprint 4.5 Item 5)
2a61821 — Add Braintrust Evals + Prompt Playground (Sprint 4.5 Item 4)
6aa996e — Add Weekly Model Bake-Off System (Sprint 4.5 Item 3)
f92783d — Add Conversation QA Scorecards (Sprint 4.5 Item 2)
```

---

## SUMMARY FOR NEXT AGENT

Tell the next agent:
"Read D:\Olivia Brain\docs\SPRINT_46_HANDOFF.md first. Repo is at D:\Olivia Brain\ (GitHub: github.com/johndesautels1/Olivia-Brain, branch main). Sprint 4.5 (Evaluation & Observability) is COMPLETE — all 7 items built, tested, and pushed. Sprint 4.6 (CLUES Product Integration) is next with 10 items. Start with Item 1 (CLUES Intelligence LTD adapter). All items are app-independent. Build each item, commit + push, then move to the next. Discuss each function in detail before coding."
