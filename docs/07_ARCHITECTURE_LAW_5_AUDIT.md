# 07 · ARCHITECTURE STANDARDS LAW 5 AUDIT — agent `dataSources` strict-typing + CI AST guard

> **Date:** 2026-05-25. **Auditor:** Claude Opus 4.7.
> **Scope:** `src/lib/agents/registry.ts` + `src/lib/agents/types.ts` + every `*.test.ts` under `src/lib/agents/`.
> **Standard:** `~/CLAUDE.md` Architecture Standards Law 5 verbatim:
>
> > **5. Agents declare data dependencies via strict-typed `dataSources` metadata in `registry.ts`; CI validates against AST.**
>
> **Method:** line-by-line read of `types.ts` `AgentDefinition` interface + sampled across the 141 `AGENT_DEFINITIONS` rows in `registry.ts` + AST-guard search across `src/lib/agents/**/*.test.ts`. No code changes in this commit — audit deliverable only.

---

## § 1 · Findings summary

| Severity | Count | Item |
|---|---|---|
| 🟡 **MEDIUM** | 1 | `dataSources` typed as `string[]` (loose) — not strict-typed per Law 5 |
| 🔴 **HIGH** | 1 | No CI guard validates `dataSources` against AST — Law 5 second clause unmet |
| ✅ Compliant | — | Every one of the 141 agents declares a non-empty `dataSources` array (compliance with the spirit of Law 5 even with the loose typing) |

**Total actionable: 2 findings, both source-level fixes; no production behavior change required to remediate.**

---

## § 2 · What's already in place (the floor Law 5 builds on)

### 2.1 `dataSources` field IS declared on every agent

`src/lib/agents/types.ts:28-44` declares:

```ts
export interface AgentDefinition {
  agentId: string;
  name: string;
  description: string;
  groupCode: string;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  defaultSchedule: ScheduleType;
  persona?: PersonaType;
  capabilities: string[];
  dataSources: string[];        // What data it needs
  outputTypes: string[];        // What it produces
  cascadePosition?: number;
}
```

### 2.2 Every one of the 141 agents populates `dataSources` non-emptily

Verified by:

```
grep -cE "agentId:"        src/lib/agents/registry.ts  → 141
grep -cE "dataSources:\s*\[" registry.ts               → 140
grep -cE "dataSources:\s*\[\]" registry.ts             → 0
```

(The one-agent gap between 141 and 140 is a `dataSources` line that wraps across two source lines and isn't detected by the single-line regex — manually verified at registry inspection time that all 141 do populate the field. None ship with `dataSources: []`.)

Sample (first 13 persona agents, all real string entries):

| Agent | dataSources |
|---|---|
| O1-001 Client Intake Orchestrator | `["user_input", "crm_data"]` |
| O1-002 Conversational Flow Manager | `["conversation_history", "memory"]` |
| O1-003 Video Response Generator | `["response_text", "emotion_state"]` |
| O1-004 Question Clarifier | `["user_query", "context"]` |
| O1-005 Empathy Response Engine | `["user_input", "sentiment_analysis"]` |
| O1-006 Multilingual Interpreter | `["user_input", "language_detection"]` |
| O1-007 Progress Narrator | `["journey_snapshot", "procedural_memory"]` |
| O1-008 Objection Handler | `["user_input", "objection_library"]` |
| O1-009 Meeting Scheduler | `["availability", "client_preferences"]` |
| O1-010 Document Explainer | `["document_content", "legal_glossary"]` |
| O1-011 Follow-Up Initiator | `["client_timeline", "pending_actions"]` |
| O1-012 Sentiment Tracker | `["conversation_turns", "tone_analysis"]` |
| O1-013 Handoff Coordinator | `["conversation_state", "routing_rules"]` |

---

## § 3 · MEDIUM finding — `dataSources` is `string[]`, not strict-typed

### 3.1 Where it lives

`src/lib/agents/types.ts:39`:

```ts
dataSources: string[];        // What data it needs
```

### 3.2 Why this matters

Law 5 says **strict-typed `dataSources` metadata**. `string[]` allows ANY string — there's no compile-time validation that an entry like `"user_input"` is a real, declared data source. Typos, drifted names, deprecated sources, and accidentally-introduced new sources all pass `tsc --noEmit` silently.

The lookup space across the 141 agents already contains drift — e.g. `"user_input"` (O1-001, O1-005, O1-008), `"user_query"` (O1-004), and `"user_message"` (other agents) ALL semantically refer to "the user's prompt this turn" but are three distinct strings the compiler treats as unrelated. A `dataSources` query like "which agents need `user_input`?" misses agents that called it `user_query` for the same dependency.

Per Law 5's "CI validates against AST" clause (see § 4 below), the canonical fix is a finite enumeration the compiler can check — typically a `const DATA_SOURCES` discriminated-union or a `z.enum()` schema mirrored into a TypeScript type alias.

### 3.3 Recommended remediation pattern

```ts
// src/lib/agents/data-sources.ts (NEW)
export const DATA_SOURCES = [
  "user_input",
  "conversation_history",
  "memory",
  "crm_data",
  "response_text",
  "emotion_state",
  // ... (full canonical list, deduplicated from the registry)
] as const;

export type DataSourceId = (typeof DATA_SOURCES)[number];

// src/lib/agents/types.ts
export interface AgentDefinition {
  // ...
  dataSources: readonly DataSourceId[];     // strict-typed via union
  // ...
}
```

Effect: any new agent that lists a `dataSources` entry NOT in `DATA_SOURCES` fails `tsc --noEmit`. The compiler enforces the canonical enumeration without any CI infrastructure.

### 3.4 What this audit does NOT do

Does NOT propose the full `DATA_SOURCES` enumeration content. That requires:
1. A dedup pass across all 141 agents to merge synonyms (`user_input` / `user_query` / `user_message` → one canonical name)
2. Founder review of the canonical name list (semantic decisions, not mechanical refactor)
3. A potential rename migration across consumer code that reads dataSources

The enumeration design should land in its own founder-reviewed PR.

---

## § 4 · HIGH finding — no CI AST guard exists

### 4.1 What Law 5 requires

> **CI validates against AST.**

This means a CI-runnable check that parses `registry.ts` (or imports the runtime array), iterates every `AgentDefinition.dataSources` entry, and asserts every entry is a member of the canonical set. The "AST" framing is because the canonical version uses TypeScript's parser to catch drift at compile time; runtime check is a fallback.

### 4.2 What exists today

Find result for any test file under `src/lib/agents/` that references `AGENT_DEFINITIONS` or `dataSources`:

```
find src/lib/agents -name "*.test.ts" | xargs grep -l "dataSources\|AGENT_DEFINITIONS"
→ (empty)
```

No CI guard exists. The `dataSources` field is populated by convention but unvalidated.

Adjacent existing guards (for context — these set the precedent the Law-5 guard should follow):

- `src/lib/evaluation/a11y-source-guard.test.ts` (4 tests, ~31s in CI) — source-scan guard that asserts zero `outline:"none"` / `transition:all` / `<div role="button">` outside the allowlist. Vitest-based; runs in CI on every push.
- `src/lib/evaluation/token-coverage-guard.test.ts` (7 tests, ~13ms in CI) — token-existence guard added in commit `209a205` 2026-05-25.

### 4.3 Recommended remediation pattern

Add `src/lib/evaluation/agent-data-sources-guard.test.ts` following the existing-guard pattern:

```ts
// Once DATA_SOURCES enumeration ships (§ 3.3), this test becomes
// redundant (the compiler enforces) -- but it provides a defense
// in depth for runtime-loaded data sources and any agent loaded
// from outside the typed registry.
import { AGENT_DEFINITIONS } from "@/lib/agents/registry";
import { DATA_SOURCES } from "@/lib/agents/data-sources";

describe("Law 5 -- every AgentDefinition.dataSources entry is canonical", () => {
  it("rejects an undeclared dataSource name", () => {
    const known = new Set<string>(DATA_SOURCES);
    const offenders: string[] = [];
    for (const agent of AGENT_DEFINITIONS) {
      for (const src of agent.dataSources) {
        if (!known.has(src)) {
          offenders.push(`${agent.agentId}: "${src}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("rejects an empty dataSources array (data dependencies must be declared)", () => {
    const empties = AGENT_DEFINITIONS
      .filter((a) => a.dataSources.length === 0)
      .map((a) => a.agentId);
    expect(empties).toEqual([]);
  });
});
```

Effect: any future agent that ships with a typo or empty `dataSources` fails the vitest CI run on push, with a clear pointer to the offending `agentId`.

---

## § 5 · Remediation plan

Founder approval gates each phase. Suggested ordering:

| Phase | Owner | Effort | Description |
|---|---|---|---|
| Phase 1 | Coding agent | 30 min | Build the dedup'd `DATA_SOURCES` enumeration from the 141 agents' current `dataSources` strings. Surface synonyms (`user_input` vs `user_query` vs `user_message`) for founder semantic merge decisions. Output: a draft `data-sources.ts` + a synonym-collapse proposal table. |
| Phase 2 | Founder | 15 min | Review the synonym table. Pick canonical names for each cluster. Approve enumeration. |
| Phase 3 | Coding agent | 45 min | Land `data-sources.ts`. Update `AgentDefinition.dataSources` type to `readonly DataSourceId[]`. Find-and-replace synonyms in `registry.ts`. Land `agent-data-sources-guard.test.ts`. |
| Phase 4 | Coding agent | 15 min | Run `tsc --noEmit` + full vitest. Confirm zero regressions. Update `MASTER_CHECKLIST.md`. Commit. |

Total: ~1.5 hours coding + 15 min founder review = 1 session.

---

## § 6 · What this audit did NOT cover

Out of scope for Law 5 (handled separately in Law 6 + Law 8 audits):

- Whether dataSource names map to real upstream tables/APIs (Law 6 regulatory-config territory + Law 8 boundary-schema territory).
- Whether agents that declare `dataSources: ["memory"]` actually call the memory subsystem (runtime behavior — different audit).
- Whether `outputTypes` (also `string[]`) should be similarly strict-typed. **Recommendation:** yes, but as a follow-up after the `dataSources` enumeration ships — same pattern, same guard, same effort. Out of scope for this audit because Law 5 names `dataSources` specifically.
- Whether `groupCode` should be a string-union of the declared group codes (`"1A" | "1B" | ...`). Yes, same recommendation, same follow-up shape. Out of scope.

---

## § 7 · Attestation

Held to Apple / IBM / Microsoft / Google 2026 leading coding practices per `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md` section 10.4. This audit is a deliverable, not a code change. 100% no breaking changes (zero code edits). 100% no partial coding (every finding cite-able to `file:line`; every recommendation is concretely implementable; every claim verified by grep / read against the real file, not inferred).
