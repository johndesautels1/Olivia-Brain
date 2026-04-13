# Sprint 4.5 Evaluation & Observability — Agent Handoff

> **Session Date**: 2026-04-13
> **Last Commit**: `f070ade` — Add Red-Team Eval Harness
> **Status**: Item 1 COMPLETE, Items 2-7 PENDING
> **Next Action**: Build Item 2 (Conversation QA Scorecards), then continue through Items 3-7

---

## CRITICAL: READ THESE FILES FIRST

1. **`BATTLE_PLAN.md`** — Master build plan, Sprint 4.4 COMPLETE, Sprint 4.5 in progress (1/7 done)
2. **`OLIVIA_BUILD_STATE.md`** — Which items are app-independent vs blocked (all Sprint 4.5 items are independent)
3. **`docs/SPRINT_44_HANDOFF.md`** — Previous sprint handoff (all 5 items done)
4. **This file** — Continuation point

---

## REPO LOCATION

- **Local**: `D:\Olivia Brain\`
- **GitHub**: `https://github.com/johndesautels1/Olivia-Brain`
- **Branch**: `main`

---

## ARCHITECTURE RULES (NON-NEGOTIABLE)

- Same rules as Sprint 4.4 handoff — read that file
- `src/lib/evaluation/` = Sprint 4.5 evaluation module (NEW directory)
- All services use singleton factory + NoOp fallback pattern when applicable
- Opus judge (`ANTHROPIC_MODEL_JUDGE`) used for LLM-as-judge evaluations
- Uses `generateText` from AI SDK with `maxOutputTokens` (NOT maxTokens)
- Discuss each function in detail before coding
- Run `npm run build` before every commit
- Every commit must be immediately pushed to GitHub
- One task at a time — complete, commit, check in

---

## COMPLETED THIS SESSION

### Sprint 4.4 Item 5: Temporal Crash-Proof Workflows ✅ — `b334a0c`
- **Client**: `src/lib/execution/temporal-client.ts` — 7-operation service (start, signal, query, status, cancel, terminate, list)
- **Workflows**: `src/lib/execution/temporal-workflows.ts` — 5 crash-proof state machines:
  - `cityEvaluationPipeline` — 6-step city eval through Cristiano verdict
  - `clientOnboardingJourney` — 7-step multi-week CLUES intake
  - `multiMarketComparison` — fan-out child workflows per city
  - `heartbeatMonitoring` — months-long cardiac tracking
  - `portfolioDataSync` — cross-app data propagation
- **Packages**: `@temporalio/client`, `@temporalio/workflow`, `@temporalio/activity`
- **Env vars**: `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE` in `src/lib/config/env.ts`

### Sprint 4.5 Item 1: Red-Team Eval Harness ✅ — `f070ade`
- **Service**: `src/lib/evaluation/red-team.ts` (~800 lines)
  - 40 built-in adversarial scenarios across 10 attack categories
  - Categories: prompt-injection, jailbreak, data-exfiltration, persona-break, hallucination-bait, illegal-advice, fair-housing-violation, pii-extraction, system-prompt-leak, emotional-manipulation
  - 4 scenarios per category, each with prompt + failureIndicators + successIndicators
  - Pattern matching + optional Opus/Cristiano LLM judge for ambiguous results
  - Severity-weighted scoring (critical=4x, high=3x, medium=2x, low=1x)
  - `getRedTeamService()` singleton factory
- **Index**: `src/lib/evaluation/index.ts` — module exports

---

## REMAINING: Items 2-7

### Item 2: Conversation QA Scorecards
- **What**: Score every Olivia conversation on quality dimensions (helpfulness, accuracy, persona consistency, compliance, emotional intelligence, task completion)
- **Pattern**: Takes conversation turns, runs Opus judge + heuristic scoring, produces a scorecard
- **Proposed file**: `src/lib/evaluation/qa-scorecards.ts`
- **Key types**: `QADimension`, `QAScorecard`, `QAScorecardResult`, `ConversationScorecardService`
- **Functions**: `scoreConversation()`, `scoreDimension()`, `getAggregateScores()`, `getScorecardService()`

### Item 3: Weekly Model Bake-Off System
- **What**: Run the same prompts through all 9 cascade models and compare quality, latency, cost
- **Pattern**: Define a set of benchmark prompts, run each through every model, score results, produce comparison report
- **Proposed file**: `src/lib/evaluation/model-bakeoff.ts`
- **Key types**: `BakeOffPrompt`, `BakeOffModelResult`, `BakeOffReport`, `ModelBakeOffService`
- **Functions**: `runBakeOff()`, `getBenchmarkPrompts()`, `compareModels()`, `getBakeOffService()`

### Item 4: Braintrust Evals + Prompt Playground
- **What**: Integrate Braintrust SDK for structured eval logging, prompt versioning, and A/B testing prompts
- **Proposed file**: `src/lib/evaluation/braintrust.ts`
- **Package**: `braintrust` (needs npm install)
- **Env var**: `BRAINTRUST_API_KEY`
- **Functions**: `logEval()`, `runPromptExperiment()`, `getPromptVersions()`, `getBraintrustService()`

### Item 5: Patronus AI Hallucination Detection
- **What**: Integrate Patronus API for automated hallucination scoring on Olivia's responses
- **Proposed file**: `src/lib/evaluation/patronus.ts`
- **Package**: `patronus` or HTTP client (needs npm install)
- **Env var**: `PATRONUS_API_KEY`
- **Functions**: `detectHallucinations()`, `scoreFactualConsistency()`, `getPatronusService()`

### Item 6: Cleanlab Data Quality Scoring
- **What**: Score training data, conversation logs, and knowledge base entries for quality issues (label errors, outliers, near-duplicates)
- **Proposed file**: `src/lib/evaluation/cleanlab.ts`
- **Package**: HTTP client to Cleanlab Studio API
- **Env var**: `CLEANLAB_API_KEY`
- **Functions**: `scoreDataQuality()`, `findIssues()`, `getCleanLabService()`

### Item 7: A/B Test Avatar Personalities
- **What**: Framework for A/B testing Olivia's personality parameters (warmth, assertiveness, humor, etc.) and measuring impact on conversation quality
- **Proposed file**: `src/lib/evaluation/ab-avatar.ts`
- **Key types**: `PersonalityVariant`, `ABTestConfig`, `ABTestResult`, `AvatarABTestService`
- **Functions**: `createExperiment()`, `assignVariant()`, `recordOutcome()`, `getExperimentResults()`, `getAvatarABTestService()`

---

## KEY FILE MAP

### Evaluation Services (Sprint 4.5)
| File | Purpose |
|------|---------|
| `src/lib/evaluation/index.ts` | Module exports — ADD new service exports here |
| `src/lib/evaluation/red-team.ts` | Red-team adversarial testing (Item 1) |

### Execution Services (Sprint 4.4 — complete)
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

### Existing Observability (Sprint 1.5)
| File | Purpose |
|------|---------|
| `src/lib/observability/tracer.ts` | OpenTelemetry tracing |
| `src/lib/observability/langfuse.ts` | Langfuse LLM observability |
| `src/lib/observability/traces.ts` | Trace recording |

### Existing Compliance (Sprint 1.5)
| File | Purpose |
|------|---------|
| `src/lib/compliance/pii-redactor.ts` | PII detection/redaction |
| `src/lib/compliance/guardrails.ts` | NeMo-style guardrails |
| `src/lib/compliance/fair-housing.ts` | Fair Housing validators |
| `src/lib/compliance/rag-scoring.ts` | RAG quality scoring |

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
f070ade — Add Red-Team Eval Harness (Sprint 4.5 Item 1)
adf3a6d — Mark Sprint 4.4 complete
b334a0c — Add Temporal crash-proof workflows (Sprint 4.4 Item 5)
```

---

## SUMMARY FOR NEXT AGENT

Tell the next agent:
"Read D:\Olivia Brain\docs\SPRINT_45_HANDOFF.md first. Repo is at D:\Olivia Brain\ (GitHub: github.com/johndesautels1/Olivia-Brain, branch main). Sprint 4.5 Item 1 (Red-Team Eval Harness) is COMPLETE. Items 2-7 are pending. Next: Item 2 (Conversation QA Scorecards). All items are app-independent. Build each item, commit + push, then move to the next. Discuss each function in detail before coding."
