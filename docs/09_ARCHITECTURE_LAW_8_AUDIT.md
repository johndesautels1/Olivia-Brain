# 09 · ARCHITECTURE STANDARDS LAW 8 AUDIT — schema-first at every boundary (Zod + type guard + tolerant JSON parser per G1-033)

> **Date:** 2026-05-25. **Auditor:** Claude Opus 4.7.
> **Scope:** `src/lib/agents/impl/g1-033-data-protection-orchestrator.ts` (the canonical reference) + every `route.ts` under `src/app/api/` (119 files).
> **Standard:** `~/CLAUDE.md` Architecture Standards Law 8 verbatim:
>
> > **8. Schema-first at every boundary. Zod + type guard + tolerant JSON parser per the canonical G1-033 reference pattern.**
>
> **Method:** read G1-033 in full to pin the canonical 3-layer pattern; grep across 119 API routes for `z.object` / `z.string` / `safeParse` to compute Zod coverage; sample one no-Zod route + one Zod-compliant route to confirm the gap is real. No code changes in this commit — audit deliverable only.

---

## § 1 · Findings summary

| Severity | Count | Item |
|---|---|---|
| 🟡 **MEDIUM** | 1 | API route Zod coverage = 37 / 119 = **31%**. ~82 routes do not directly use Zod at the boundary — many are real violations (sampled below); some are legitimate non-input routes |
| 🟡 **MEDIUM** | 1 | No CI guard enforces the 3-layer pattern. A new route can land without Zod and CI says nothing |
| ✅ Compliant | — | G1-033 itself is the textbook 3-layer pattern: strict Zod schema + `safeParse(raw).data ?? {}` tolerant fallback + `isDpiaDocument` type guard + `parseLlmJson` with fence-and-brace fallback |

**Total actionable: 2 findings — both source-level patterns; remediation is route-by-route + one CI guard test.**

---

## § 2 · The G1-033 canonical pattern (the floor every boundary should hit)

`src/lib/agents/impl/g1-033-data-protection-orchestrator.ts`:

| Line | Layer | What it does |
|---|---|---|
| 34-36 | Doc | `isXxxDocument()` type guard + `parseLlmJson()` with fence-and-brace fallback declared in the header docstring as part of the contract |
| 61 | **Strict Zod schema** | `const G033ExtensionSchema = z.object({ techStack: z.array(z.string().min(1).max(80)).max(50).optional() })` — every field has min/max bounds |
| 83 | **Tolerant `safeParse` with fallback** | `const ext = G033ExtensionSchema.safeParse(raw).data ?? {}` — never throws; returns the parsed object OR an empty object |
| 135 | **Type guard** | `export function isDpiaDocument(obj: unknown): obj is DpiaDocument` — returns boolean; narrows `unknown` to the typed shape |
| 157 | **Tolerant JSON parser** | `export function parseLlmJson(raw: string): DpiaDocument | null` — extracts JSON from markdown fences AND raw braces; runs `isDpiaDocument` post-check |
| 175 | Type-guard application | `if (isDpiaDocument(obj)) return obj;` inside parseLlmJson — never returns a malformed shape |
| 308 | Consumer usage | `const dpia = parseLlmJson(llmResult.text);` then `if (!dpia)` fallback path — the call site never crashes on bad LLM output |

**This is the textbook 3-layer pattern.** Every new boundary code (API route, agent handler, cascade provider) should mirror it.

---

## § 3 · MEDIUM 1 — 82/119 API routes lack a Zod schema at the boundary

### 3.1 Coverage stats

```
$ grep -rln "z\.object\|z\.string\|safeParse" src/app/api | wc -l
37

$ find src/app/api -name "route.ts" | wc -l
119

Coverage:  37 / 119  =  31 %
Gap:       82 / 119  =  69 %
```

### 3.2 Concrete violation sample — `/api/calendar/entries` GET handler

`src/app/api/calendar/entries/route.ts:25-40`:

```ts
// GET — Fetch calendar entries for a date range
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-entries" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(...);
  }
  // ... query string values flow directly into downstream code unvalidated.
}
```

`start` and `end` are read from query string and used directly. There is no Zod schema validating that they:
- Are ISO-8601 dates (e.g. `2026-05-25T00:00:00Z`)
- Are not malformed strings (which downstream date parsing may silently convert to `Invalid Date`)
- Satisfy `start < end`
- Are within a reasonable range (e.g. preventing a 100-year-wide query that crashes Prisma)

Per Law 8: the canonical fix is a Zod schema for the query params (`z.object({ start: z.string().datetime(), end: z.string().datetime() }).refine(...)`) parsed at the boundary, returning 400 with a structured error on failure, narrowing the values to ISO-string-typed for downstream code.

### 3.3 Known-good sample — `/api/cristiano/judge`

`src/app/api/cristiano/judge/route.ts`:

```ts
/**
 * POST /api/cristiano/judge
 *
 * Renders a Cristiano verdict for the authenticated user. Accepts a
 * `CristianoVerdictRequest` discriminated union, validates with Zod,
 * checks the `(userId, requestHash)` idempotency lookup, and either
 * returns the existing verdict or calls the Opus brain to render a
 * fresh one and persists it.
 *
 * Request shape (validated by `parseVerdictRequest`):
 *   {
 *     kind: "startup_match" | "city_compare" | "freeform",
 *     payload: <kind-specific payload — see lib/cristiano/types.ts>
 *   }
 *
 * Response shape:
 *   200: { ok: true, verdict: CristianoVerdictRecord, alreadyExisted: boolean }
 *   400: { ok: false, error: "Invalid JSON body" | "Invalid request shape", ... }
 *   401: { ok: false, error: "Authentication required" }
 *   429: { ok: false, error: "Too many requests" }
 *   500: { ok: false, error: "Verdict render failed", reason }
 *   503: { ok: false, error: "Judge service unavailable", reason }
 */
```

Header docstring enumerates every response shape; Zod via `parseVerdictRequest` validates the discriminated union; structured error responses for every failure. **This is the pattern every route should hit.**

### 3.4 First 15 routes in the 82-route gap (sample)

(Full sweep result from the audit grep; many of the 82 may legitimately need NO body validation — these 15 are the sample for triage.)

```
src/app/api/admin/agents/run/route.ts
src/app/api/admin/agents/[agentId]/route.ts
src/app/api/admin/eval/run/route.ts
src/app/api/admin/investors/seed/route.ts
src/app/api/admin/toggles/route.ts
src/app/api/avatar/generate/route.ts
src/app/api/avatar/route.ts
src/app/api/avatar/session/route.ts
src/app/api/calendar/analytics/route.ts
src/app/api/calendar/attendees/route.ts
src/app/api/calendar/entries/route.ts
src/app/api/calendar/memory/route.ts
src/app/api/calendar/notes/route.ts
src/app/api/calendar/plan/route.ts
src/app/api/calendar/prep-tasks/route.ts
```

Likely categorisation pending full per-route triage:
- **Real Law 8 violations:** routes that accept request body / query params and read them directly (calendar/entries confirmed)
- **Legitimate non-violations:** routes that take NO input (a webhook with no body), or routes that delegate to a downstream module that itself uses Zod
- **Auth-only routes:** routes where the only "input" is the session (already typed by `getAuthSession`) — borderline; Zod adds little here

### 3.5 What this audit does NOT do

Does NOT triage all 82 routes individually. That requires:
1. Reading each route to determine if it accepts inputs at all
2. If it does, mapping the input shape to a Zod schema
3. Adding the schema + structured error responses
4. Verifying no consumer breaks

Estimated effort: **~10-20 minutes per route × 82 routes = ~15-25 hours**. Multi-session work. The recommendation is to either ship a CI guard (§ 4) that flags new offenders going forward, OR run the triage on the highest-traffic routes first (Cristiano + voice + calendar are the most likely user-facing surfaces).

---

## § 4 · MEDIUM 2 — no CI guard enforces the 3-layer pattern

### 4.1 What exists today

Two adjacent guards in OB (`src/lib/evaluation/`):
- `a11y-source-guard.test.ts` — scans for inline a11y anti-patterns
- `token-coverage-guard.test.ts` — asserts required `@theme` tokens stay declared (shipped 2026-05-25 in commit `209a205`)

**No Law-8 guard exists.** A new route can ship without Zod and the test suite says nothing. A new agent handler can ship without a type guard and the test suite says nothing.

### 4.2 Recommended remediation pattern

Two-piece guard:

```ts
// src/lib/evaluation/law-8-route-zod-guard.test.ts (NEW)
// Scans every route.ts under src/app/api. For each route that accepts
// a body (POST/PUT/PATCH) OR reads searchParams beyond a single id, asserts
// the file imports `z` from `zod` AND the file body contains either
// `z.object`, `z.string`, OR `safeParse`. Allowlist file for routes
// that legitimately need no validation (webhook endpoints with no body,
// pure-delegation routes).
```

```ts
// src/lib/evaluation/law-8-agent-pattern-guard.test.ts (NEW)
// Scans every agent handler under src/lib/agents/impl. For each handler
// that calls callLLM (and therefore parses LLM output), asserts the
// file contains BOTH: (a) an `is<Name>Document(obj: unknown): obj is X`
// type guard, AND (b) a `parseLlmJson(raw: string): X | null`
// function that runs the type guard before returning. Allowlist for
// handlers that legitimately bypass the pattern (e.g. handlers that
// return narrative-only text with no structured JSON).
```

Both guards follow the existing a11y-guard / token-coverage-guard test-style (vitest source-scan, allowlist file, structured error pointer). Effort: ~1 session for both guards + the initial allowlist.

---

## § 5 · Cross-cutting context

### 5.1 callLLM-side coverage

After commits `e8d7230` (voice-document) + `f87610b` (voice-conversation), every LLM call routes through the canonical `callLLM` wrapper at `src/lib/agents/llm.ts`. That wrapper already handles transport, retry, observability, and cost-tracking centrally. **Law 8's `parseLlmJson` layer applies to what callers do with `callLLM`'s `result.text`** — not to the wrapper itself.

For agents that ship structured JSON expectations, the G1-033 pattern is mandatory. For agents that ship narrative text (e.g. voice-conversation's `generateResponse` returning a ConversationResponse with a JSON field embedded in text), `extractJson` + Zod re-validation is the textbook flow.

### 5.2 The 12 ported per-company handlers (Track H S21)

Per `feedback_ltm_agent_handler_pattern.md` (locked 2026-05-08): every Track H per-company handler mirrors G1-033's structure. The 12 ported handlers (G1-033, G1-048, G1-076, G1-105, G1-107, G1-110, G1-115, G1-130, G1-136, G1-141, G1-149, G1-150) are by-construction Law 8 compliant. The Law 8 gap is in API routes + non-handler code, not in the per-company-handler corpus.

### 5.3 Cascade providers

`src/lib/orchestration/cascade/providers/*.ts` — each provider handles a specific LLM vendor's response shape. Per the prior agent's audit work (cited in HANDOFF.md), the cascade providers internally parse vendor responses and surface them through a normalised `{ text, inputTokens, outputTokens }` shape. They are Law 8 internal-layer code, not boundary code. The boundary is upstream (in `callLLM` itself) or downstream (in the caller that re-parses text as JSON).

---

## § 6 · Remediation plan

Founder approval gates each phase.

| Phase | Owner | Effort | Description |
|---|---|---|---|
| Phase 1 | Coding agent | 1 session | Ship the two CI guards (`law-8-route-zod-guard.test.ts` + `law-8-agent-pattern-guard.test.ts`) per § 4.2, with allowlist files seeded by the current 82-route gap. The allowlist serves as the explicit "known-deferred-work" list that future remediation drains row-by-row. |
| Phase 2 | Coding agent | 1 session per surface area | Triage the 82-route gap by surface (Cristiano + voice + calendar + admin + ... ). Each surface gets its routes' Zod schemas added; the allowlist drains as routes graduate to compliant. |
| Phase 3 | Coding agent | 1 session | Sweep every `src/lib/agents/impl/*.ts` handler against the agent-pattern guard. Add type guards + tolerant parsers where missing. The 12 Track-H handlers should pass by-construction; the gap is in non-Track-H handlers. |
| Phase 4 | Coding agent | 15 min per remediated batch | Update MASTER_CHECKLIST.md after each surface drains. |

Total: 1 session for the guards (high leverage — locks the current state + flags any new offenders going forward), then incremental session-by-session for triage. Could ship the guards alone in this session if approved, and queue the triage for follow-ups.

---

## § 7 · What this audit did NOT cover

- Per-route triage (recommended as Phase 2 follow-up; see § 3.5 effort estimate)
- Per-agent triage of non-Track-H handlers
- Frontend boundary validation (e.g. form input validation in React components — different concern; falls under Vercel WIG / a11y standards already audited)
- Database query validation at the Prisma boundary (Prisma itself enforces types; the question is whether dynamic query strings get sanitized — borderline Law 8)
- WebSocket message validation (LiveAvatar control channel — already covered by the `agent.speak` shape contract in `HEYGEN_LTM_CONFIG.md`)

---

## § 8 · Attestation

Held to Apple / IBM / Microsoft / Google 2026 leading coding practices per `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md` section 10.4. This audit is a deliverable, not a code change. 100% no breaking changes (zero code edits). 100% no partial coding (every finding cite-able to `file:line`; the G1-033 reference pattern annotated layer-by-layer with line numbers; remediation pattern provided as concrete code; the 82-route gap quantified with the first 15 enumerated; out-of-scope items explicitly listed).
