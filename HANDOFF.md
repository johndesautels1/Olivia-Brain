# OLIVIA BRAIN — NEXT AGENT HANDOFF

**Updated:** 2026-05-07 (end of batch — V9 / Track V CLOSED)
**GitHub:** https://github.com/johndesautels1/Olivia-Brain
**Local:** `D:\Olivia Brain`
**HEAD:** post-this-handoff-commit on `main` (code HEAD before docs = `24781da`, V9)
**State:** **Track V 9/9 ✅ — TRACK V CLOSED.** Schema (V1) → engine math (V2-V4) → 14 agents (V5-V6) → 9 API routes (V7) → workbench + 31 zones (V8) → War Room family + Deal Room + Acquisition Mirror + Equity Waterfall (V9). Bidirectional `ValuationRun ↔ DealRoomSession` link exercised end-to-end. Next session = **Track O Session O1 — Composio dispatch layer** (pulled forward from original Track O floating slot per BUILD_SEQUENCE so Quantara Q3's "Let Olivia complete the rest" auto-fill works day 1).
**Tests:** 368/368 across 24 suites. **Typecheck:** clean. **Vercel:** V8 deploy `dpl_6CVj4xoQKxCjx7JeHsJApEeXpvXz` READY in production for commit `edb195a` — verified before V9 started; V9 push (`24781da`) deploy will be live shortly.

---

## 0 · READ FIRST — non-skippable

**Past Claude sessions (including the agent that handed THIS file to you) skipped one or more of the docs below and rebuilt the wrong thing.** That stops here. Read every doc on this list **before** any tool call beyond `git status`.

1. **`~/CLAUDE.md`** — auto-loaded. Master rules. Includes the `UserCompanyDeadline` privacy contract, "stop means stop," the "no local builds" rule, the "minimize tool calls" rule, and the LTM read-only boundary.
2. **Memory files** — auto-loaded. Index at `~/.claude/projects/C--Users-broke/memory/MEMORY.md`. The **load-bearing** ones for the next session (Track O O1 — Composio): `feedback_world_class_standard`, `feedback_olivia_brain_batch_session_pattern`, `feedback_olivia_brain_end_of_batch_handoff_protocol`, `feedback_commit_push_no_prompt`, `project_ltm_types_no_speculative_generalization`.
3. **`HANDOFF.md`** (this file) — read in full.
4. **`docs/OLIVIA_NORTH_STAR.md`** — the single question every commit must answer **yes** to. Locked 2026-05-07.
5. **`docs/00_PRODUCT_TRUTH.md`** — bicycle-wheel architecture, product hierarchy, "all data passes through Olivia." Eternal source of truth; overrides every other doc.
6. **`docs/01_UI_DESIGN_SYSTEM.md`** — Aurum + Aether tokens, LCH color, modular workspace, WCAG 2.2 AA + APCA, Vercel rules. Every UI conforms.
7. **`docs/BOOTSTRAP.md`** — implementation context, sacred files list, standing rules.
8. **`docs/BUILD_SEQUENCE.md`** — find the row labelled `**O1**` under "Track O Session O1 (pulled forward 2026-05-07) — Composio wiring" (around line 134).
9. **`docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md`** — read **Part 35** for what just shipped (V9 / Track V close-out) and **Parts 30–34** for the broader S23-S27 batch context.
10. **`docs/STUDIO_PORT_MANIFEST.md`** § M — full Valuation subsystem inventory (V1-V9), useful if you ever need to revisit Track V scope or Track L (cluesintelligence) wants to ride on the same primitives.

If you've never read `00_PRODUCT_TRUTH.md` or `OLIVIA_NORTH_STAR.md` in this session, **stop and read them now.** They are not optional context.

---

## 1 · Resume point — Session 29 = Track O Session O1 (Composio dispatch)

Per `docs/BUILD_SEQUENCE.md` (around line 134-140):

> **O1 — Composio dispatch layer.** New `src/lib/tools/composio.ts`. Cascade gets a `tools` array; intent classifier flags tool-eligible turns; tool results re-enter the cascade for narration. Approval gate (`src/lib/tools/approval-gate.ts`) wraps high-risk write tools. Wire 7 read-only integrations needed by Q3: Stripe, Supabase, GitHub, Companies House, LinkedIn, QuickBooks, Xero.
>
> **Exit criterion:** Sample tool call ("Send a follow-up email to John from yesterday's call") routes through Composio Gmail with approval prompt → reply + audit log entry. The 7 read-only Quantara integrations return mock-mode degraded data when API keys not set. Typecheck clean. **W-001 closed.**

**Why O1 first (not Track Q directly):** Quantara Q3's "Let Olivia complete the rest" auto-fill button calls Composio to populate fields from connected APIs. Without Composio wired first, Q3 auto-fill is a stub and ships brittle — violates the no-band-aids rule. Locked 2026-05-07.

### What needs to land in O1

| File | Role |
|---|---|
| `src/lib/tools/composio.ts` | NEW — dispatch layer between cascade and Composio. Tool-eligible turn detection + result re-entry into the cascade for narration. |
| `src/lib/tools/approval-gate.ts` | NEW — wraps high-risk write tools. Read-only tools bypass; write tools require explicit approval. |
| `src/lib/tools/integrations/{stripe,supabase,github,companies-house,linkedin,quickbooks,xero}.ts` | NEW — 7 read-only integrations. Each returns confidence-weighted values + source chip metadata (per Q3 spec). Mock-mode degraded data when API keys absent. |
| Cascade hook | The cascade orchestrator gets a `tools` array; intent classifier flags eligible turns. |
| Audit log entry | Tool calls log to existing audit infrastructure. |

### Operator actions O1 will surface

| Action | When | Why |
|---|---|---|
| Set `COMPOSIO_API_KEY` env var (Sensitive, Production + Preview) | Before O1 routes hit non-mock mode | Composio platform key |
| Per-integration API keys (Stripe, GitHub, LinkedIn, QuickBooks, Xero) | Optional during O1; required for Q3 ship | Each integration mock-degrades when missing |
| **Companies House** + **Supabase** typically already have keys in Vercel — verify before O1 starts | — | — |

---

## 2 · Working directive (carried over from the user)

The user authorised batches via `feedback_olivia_brain_batch_session_pattern`. **Default is one task at a time. The V9 batch was a single-session batch** authorised with: *"Full V9 batch, sequential — verify Vercel first, then ship."* The pattern that worked:

- **Verify Vercel before starting** — V8 was green (`dpl_6CVj4xoQKxCjx7JeHsJApEeXpvXz`), so V9 proceeded.
- **Sequential per session, parallel within a session.** Tools that don't depend on each other ran in single tool calls (parallel reads of all 10 LTM source files; PowerShell `Copy-Item` batch).
- **Typecheck + tests gate before commit.** V9 ended with `npm run typecheck` clean and 368/368 tests green. **No exception.** When two import-smoke tests timed out, the root cause (V9's larger graph) was diagnosed and fixed (per-test 60_000ms timeout, scoped) — not bypassed.
- **Minimize tool calls.** All 10 War Room family files copied via one PowerShell batch. Zero per-file Edit calls for byte-for-byte ports.
- **One feat commit for V9 + one docs commit for end-of-batch.** V9 produced commit `24781da` then this docs commit.
- **End-of-batch handoff is mandatory.** This file is the artifact. Per memory `feedback_olivia_brain_end_of_batch_handoff_protocol`: announce "preparing the handoff," update HANDOFF.md, push as the **last** commit of the batch.

If the user has not pre-authorised a new batch when you start, **default is one task at a time — wait for instructions before chaining sessions.**

---

## 3 · Gotchas — carried forward

These bit S23-S28. Bake them into your mental model.

### 3.1 LTM is not always self-consistent

- **`e2e-pipeline.test.ts` and `security-rng.test.ts` in LTM `__tests__/` reference `src/lib/export/{csv-json-export, timeline-export, sanitize}` modules that LTM never shipped.** Verified via `find`. They will defer indefinitely unless a future track adds the export utilities. **Do not stub** — that's a band-aid.
- **`session2.test.ts` in LTM is a top-level imperative dev script** (top-level `console.log` + `throw`), not a vitest suite. V4 wrapped it in `describe`/`it` so vitest picks it up. If you encounter similar LTM dev scripts, do the same — preserve the validation logic, add the test runner hooks.

### 3.2 Generated Prisma client can disagree with `schema.prisma`

`node_modules/.prisma/client/index.d.ts` may include columns the live `prisma/schema.prisma` doesn't have (this batch hit `DealRoomSession.companyName` etc.). **Trust `schema.prisma`.** The next `prisma generate` will resolve the divergence. If a route is writing to a column the schema lacks, drop the column from the route; do not add the column to the schema unless that's what you actually intend.

### 3.3 PowerShell + bracketed path segments

Dynamic Next.js segments like `src/app/api/valuation/[runId]` need **`-LiteralPath`** in PowerShell `Copy-Item` / `Get-Content` / `Set-Content`. Without it the brackets get treated as a glob and your operation silently no-ops. The `[runId]/route.ts` file went missing once for exactly this reason during V8.

### 3.4 Next.js 16 async route params

```ts
// ❌ Next 15 / LTM shape — Next 16 rejects this
export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } },
) {
  const { runId } = params;
}

// ✅ Next 16 contract — applied to [runId]/route.ts in V8 commit edb195a
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
}
```

Apply this to **every** dynamic-segment route you port. If you see Vercel's build worker complain about `RouteHandlerConfig`, this is the fix.

### 3.5 Bicycle-wheel boundary on agents and routes

When porting LTM code that imports `prisma.organization`, `prisma.document`, `prisma.userProfile`, or `prisma.analysisResult`: those models do not exist in OB and (per memory `project_ltm_types_no_speculative_generalization`) **must not be added speculatively.** Two correct adaptations:

1. **Push the dependency out** via an injected callback (e.g. `LoadCandidateOrgsFn` in `cristiano.ts` and `document-intake.ts`). The caller — running embedded in LTM or routing through the UKP bridge — supplies the data.
2. **Return an empty / null result** with a comment naming the future track that wires it (e.g. `gatherDocuments` in `run/route.ts`). The downstream code degrades gracefully; the cascade extraction agents fall back to bridge-only inputs.

Either is fine. **Adding LTM models to `prisma/schema.prisma` is not.**

### 3.6 LTM Clerk auth pattern → OB stub

LTM routes universally use:

```ts
import { auth } from "@clerk/nextjs/server";
const { userId } = auth();
const profile = await prisma.userProfile.findUnique({
  where: { clerkUserId: userId },
  select: { id: true },
});
if (!profile) return NextResponse.json({ error: "No profile found" }, { status: 404 });
```

In OB you replace it with:

```ts
import { getAuthSession } from "@/lib/auth/session";
const { userId } = await getAuthSession();
if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const profile = { id: userId };
```

PowerShell mass-replaces handle this — see V7 commit (`56c735e`) for the regex patterns. `userId` IS the profile id directly in OB. When Clerk lands in F18, the body of `getAuthSession()` becomes the real Clerk call and route code stays identical.

### 3.7 Tier gate stub pattern

`src/lib/require-tier.ts` exposes the same `requireTier` / `tierAtLeast` / `getUserTier` / `PlanTier` / `TierCheckResult` contract LTM uses. **Pre-Clerk every authenticated caller passes as `executive`-tier.** F18 swaps the body for a real Prisma planTier lookup. Route code never changes.

### 3.8 (V9-specific) Test-timeout sizing for large module graphs

V9 surfaced this: dynamic-import smoke tests (`await import(...)` in an `it()` block) inherit the 15s global `testTimeout`. When a module's transitive graph grows (V9 added ~199 KB to the valuation/* tree; V7's `/api/valuation/run` already pulled the cascade orchestrator + 14 agents), cold-start transform time can exceed 15s on Windows. **Fix:** per-test timeout via the third arg of `it()`:

```ts
it("ValuationWorkbench imports without error", async () => {
  const mod = await import("@/components/valuation/ValuationWorkbench");
  expect(mod).toBeDefined();
}, 60_000);
```

Scoped to the specific heavy tests so other 366 tests stay on the strict 15s budget — the test goal is "imports without throwing," not "imports fast." Don't widen the global `testTimeout`; that masks real perf regressions.

---

## 4 · Outstanding state

### 4.1 Stash held for review (carried)

Branch `main` working tree is clean except a stash carrying an uncommitted edit to `docs/00_PRODUCT_TRUTH.md`:

```
stash@{0}: On main: uncommitted PRODUCT_TRUTH §5.1 — held for review
```

The stash is the **§5.1 "Olivia's agentic critical-date pipeline (added 2026-05-04)"** section — the privacy contract that mirrors `~/CLAUDE.md`'s top-priority `UserCompanyDeadline` rule. The user told the previous agent to stash rather than commit; resolution is **the user's call** when they're ready. To inspect or apply:

```powershell
git -C "D:\Olivia Brain" stash show -p stash@{0}     # see the diff
git -C "D:\Olivia Brain" stash apply stash@{0}        # restore to working tree (keeps the stash)
git -C "D:\Olivia Brain" stash drop stash@{0}         # discard
```

Do not commit it without checking with the user first.

### 4.2 Operator actions still owed

| Action | When | Why |
|---|---|---|
| **Apply C3 SQL migration** — paste `prisma/sql/02-add-voice-olivia-foundation.sql` into Supabase SQL Editor and Run. | Before C4 routes write to voice/olivia tables | 9 new tables: `olivia_*` + `voice_*`. |
| **Apply V1 SQL migration** — paste `prisma/sql/03-add-valuation-foundation.sql` into Supabase SQL Editor and Run. | Before V7 routes write to valuation tables (now live and exercised by V9 War Room sessions) | 6 new tables: `valuation_subjects`, `valuation_runs`, `valuation_sensitivities`, `financial_snapshots`, `deal_room_sessions`, `deal_room_messages`. |
| `STUB_USER_ID` env var (Preview only, never Production) | Before testing C4 / V7 / V9 routes in Preview | Stub auth reads it. |
| Twilio + ElevenLabs + Resend + Google/Outlook OAuth + Tavily + OpenAI keys | Per the table in the previous handoff (still applicable) | Every external integration. **Sensitive, Production + Preview only** per `~/CLAUDE.md`. |
| `match_calendar_memory()` PostgreSQL function | When calendar memory becomes a user-facing feature | C2 falls back to empty array + console warning until then. (W-014.) |
| **NEW for O1:** `COMPOSIO_API_KEY` (Sensitive, Production + Preview) + per-integration keys for Stripe, GitHub, LinkedIn, QuickBooks, Xero | Before O1 routes hit non-mock mode | Companies House + Supabase keys typically already exist. |

### 4.3 Active weaknesses (carried)

| ID | What | Where to close |
|---|---|---|
| W-001 | No agentic tool dispatch (Composio not wired) | **Track O Session O1 — next session.** |
| W-013 | UI Tailwind/styling fidelity gap (map + calendar + valuation) | Track C polish |
| W-014 | `match_calendar_memory()` not installed in Supabase | Operator action above |
| W-015 | `lib/auth/session.ts` is a Clerk stub | Track F Session 18 |
| W-016 | `lib/system-alerts.ts` console-only stub (no SystemAlert model) | Future track that needs system alerts |

V9 introduced no new W-IDs.

### 4.4 LTM tests still deferred

`src/lib/valuation/__tests__/e2e-pipeline.test.ts` and `security-rng.test.ts` were dropped in V4 because they import LTM-only `src/lib/export/{csv-json-export, timeline-export, sanitize}` modules **which LTM itself never shipped.** Re-port them only after the export utilities exist. Until then the deferral is the correct posture per `feedback_world_class_standard` ("no band-aids").

---

## 5 · Repo locations

| Repo | Path | Status |
|---|---|---|
| **Olivia Brain (this — your working repo)** | `D:\Olivia Brain` | HEAD = post-this-handoff docs commit. Code HEAD = `24781da` (V9). |
| **GitHub** | https://github.com/johndesautels1/Olivia-Brain | up to date with `main` |
| London Tech Map (LTM) | `D:\London-Tech-Map` | **READ-ONLY.** Copy components OUT; never edit, rename, delete, or move ANY LTM file. |
| Studio Olivia prototypes | `D:\Studio-Olivia` | **REFERENCE ONLY.** |
| Clues Main vision docs | `D:\Clues Main` | Docs canonical; code stale. |
| Questionnaire engine | private GitHub `johndesautels1/clues-questionnaire-engine` | Current truth for cluesintelligence. |

---

## 6 · Absolute rules (do not violate)

1. **LTM is read-only.** Never edit, rename, delete, or move any file in `D:\London-Tech-Map`.
2. **No band-aids.** No `force-dynamic`, no `// hack`, no `@ts-ignore`, no Suspense wrappers used as a workaround. Find and fix the root cause; when work cannot meet the bar, raise the conflict — never silently lower the bar.
3. **Verify before claiming done.** `npm test` and `npm run typecheck` must both pass before any commit.
4. **Lockfile in same commit as `package.json`.** Always.
5. **Commit + push together.** Vercel deploys from git. Local commits do nothing.
6. **One concern per commit.** Mixed-concern commits are forbidden.
7. **AbortSignal + timeout on every network call.** No exceptions. (Particularly relevant for O1 — every Composio integration call MUST carry `AbortSignal.timeout(...)`.)
8. **PII never enters spans, traces, or logs.** Only metadata. (Particularly relevant for O1 — Stripe / Gmail / GitHub / LinkedIn payloads must NOT land in audit logs.)
9. **JSDoc on every exported symbol.** Class headers describe reliability guarantees.
10. **One task at a time** unless the user explicitly authorises a batch.
11. **NEVER run local builds** (`npm run build`, `next build`). Vercel handles that. `npm run typecheck` and `npm test` are allowed.
12. **All architecture and README docs commit alongside code changes** that change them.
13. **STOP means STOP.** "Stop" / "halt" / "wait" / "hold on" / "pause" — in any casing or typo — immediately ceases all tool calls and execution. No completing the current step. (Top-priority rule from `~/CLAUDE.md`.)

Full standing rules: `docs/BUILD_SEQUENCE.md` § "Standing rules carried into every session" + `~/CLAUDE.md`.

---

## 7 · Recent commit trail

```
<this handoff commit>  docs: end-of-batch handoff V9 — Track V CLOSED + O1 prep
24781da feat(valuation): Track V Session V9 — War Room family + Deal Room + Acquisition Mirror + Equity Waterfall
ad956f3 docs: end-of-batch handoff S23-S27 — Track V 8/9 ✅ + V9 prep
edb195a feat(valuation): Track V Session V8 — ValuationWorkbench + 31 zone components
56c735e feat(valuation): Track V Session V7 — 9 valuation API routes + tier gate
b53abea feat(valuation): Track V Session V6 — agents 8-14 + Cristiano synergy bridge
4274f61 feat(valuation): Track V Session V5 — agents 1-7 + cascade-routed LLM adapter
6fbeb25 feat(valuation): Track V Session V4 — stochastic + sensitivity + war-room calendar
2653a67 docs: end-of-batch handoff S18-S22 — Track C CLOSED + Track V 3/9 ✅
b30ea00 docs: close batch S18-S22 — SESSION_LOG Parts 25-29 + handoff state + judgment-call trail
f40fb1b feat(valuation): Track V Session V3 — engine math port (10 methods)
9a67f05 feat(valuation): Track V Session V2 — types + bridge port
ddd3f1b feat(valuation): Track V Session V1 — schema port (6 valuation models)
```

---

## 8 · Strategic priority (locked 2026-05-03, expanded 2026-05-07)

Founder direction: focus on **`clueslondon.com` (priority 1)** and **`cluesintelligence.com` (priority 2 — FLAGSHIP)**. Both ship targets. cluesxscore (priority 3) and white-label Olivia (priority 4) follow.

**June 8 strategy.** London Tech Show on 2026-06-08 is a **demo target, not a full clueslondon ship.** Olivia Brain becomes the canonical implementation; LTM port-back happens in a separate post-OB Claude session. Bicycle-wheel preserved.

**Pace.** Founder operates at ~4 sessions/day. **~57 sessions remain to ship priorities 1–4** (was ~58 at V8 close, ~63 at S22 close, ~68 at S17 close).

**Tracks remaining:**

- **Next: Track O Session O1 (Composio dispatch, W-001 closure).**
- Track Q (Quantara paragraphical intake, Q1–Q7) — depends on O1.
- Track P (Deal Protection + gap closures, P1–P7).
- Track D (Studio ↔ brain wiring, S15–S16 in original numbering).
- Track E (voice input, S17).
- Track F (Clerk auth, S18) — closes W-015.
- Track G (cascade orchestrator port, S19–S20).
- Track H (agents consolidation, S21–S23).
- Track I (multi-tenant + adaptive surface suppression, S24).
- Track J (vertical adapters, S25–S26).
- Track K (hardening + launch prep, S27–S29).
- Launch (S30) on or about 2026-06-02.
- Track N (Visual Manifestation, N1–N5) — depends on O1.
- Track O O2–O5 (weakness closure).
- Track L (cluesintelligence Unification, post-clueslondon, ~10 sessions).

Full session-by-session breakdown: `docs/BUILD_SEQUENCE.md`.

---

## 9 · Memories you'll find auto-loaded

| Memory | What it locks |
|---|---|
| `feedback_world_class_standard` | 12-row standard table; no band-aids; root-cause every failure. |
| `feedback_olivia_brain_batch_session_pattern` | OB-only batch mode (sequential without check-ins, per-session commits) when user pre-authorises — e.g. "build O1-O5." |
| `feedback_olivia_brain_end_of_batch_handoff_protocol` | At end of each OB batch, ANNOUNCE "preparing the handoff" + update HANDOFF.md + push as the LAST commit. |
| `feedback_commit_push_no_prompt` | In OB / LTM repos, every code fix is `git add && commit && push` in the same turn. Don't ask permission per commit. |
| `project_ltm_types_no_speculative_generalization` | Don't add LTM Prisma models to OB. Don't stub LTM-specific routes. Wait for a real second consumer or push the dependency out via injection. |
| `project_track_v_ltm_valuation_port` | Track V scope: 9 sessions, ~93 files. **Now CLOSED at V9.** Memory will need update if Track L ever needs a second consumer of these primitives. |
| `project_olivia_surface_suppression` | When Olivia embeds in a host that already provides a surface (LTM has map + calendar), Olivia hides her own. Lands Track I S24. |
| `feedback_deadline_privacy` | `UserCompanyDeadline` is OWNED by `UserCompanyDeadline`, NOT `UserCompanyProfile`. `loadCompanyProfile` selector and `/directory` consumer must never project deadline columns. |
| `feedback_4_sessions_per_day_pace` | ~4 sessions/day; ~3 weeks to finish priorities 1–4. |
| `reference_olivia_north_star` | Pointer to `OLIVIA_NORTH_STAR.md`. |
| `reference_olivia_clues_product_truth` | Pointer to `00_PRODUCT_TRUTH.md`. |
| `reference_olivia_ui_design_system` | Pointer to `01_UI_DESIGN_SYSTEM.md`. |
| `reference_olivia_brain_enrichment_engine` | Pointer to `03_BRAIN_ENRICHMENT_ENGINE.md` + `04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md`. |
| `reference_olivia_brain_docs` | Olivia Brain canonical doc set + read order. |

---

## 10 · Start sequence (next session)

```bash
cd "D:\Olivia Brain"
git status                                    # should report 1 stash, working tree clean otherwise
git log --oneline -8                          # confirm HEAD is the post-V9 docs commit
```

Then in Claude Code:

1. **Read every doc in §0 above. Do not skip.**
2. Read `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Part 35 for what just shipped (V9 / Track V close-out).
3. Read `docs/BUILD_SEQUENCE.md` Track O Session O1 row (~line 134-140) for Session 29's deliverable + exit criterion.
4. Skim `docs/BUILD_SEQUENCE.md` Track Q rows (Q1-Q7) so you understand which Q3 integrations O1 needs to wire (Stripe, Supabase, GitHub, Companies House, LinkedIn, QuickBooks, Xero — read-only).
5. Confirm Vercel build is green on the post-`24781da` deploy. If it's not, the failure is almost certainly NOT in O1 territory — surface it before O1 starts.
6. Begin Session 29: scaffold `src/lib/tools/{composio,approval-gate}.ts` + the 7 integration files. Wire the cascade `tools` array. Wire the intent classifier hook. Add audit log entries on tool dispatch. Mock-mode degraded data when API keys absent.

**Standing rule reminder:** stop after O1's deliverable lands (W-001 closure). Track O O2-O5 + Track Q + Track P each need their own user pre-authorisation before chaining. Update docs alongside the code commit per the doc-discipline rule.
