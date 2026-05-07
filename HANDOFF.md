# OLIVIA BRAIN — NEXT AGENT HANDOFF

**Updated:** 2026-05-07 (end of batch — O1 / W-001 CLOSED)
**GitHub:** https://github.com/johndesautels1/Olivia-Brain
**Local:** `D:\Olivia Brain`
**HEAD:** post-this-handoff-commit on `main` (code HEAD before docs = `db2f0cf`, O1)
**State:** **Track O Session O1 ✅ — W-001 CLOSED.** Composio dispatch wrapper + 7 Q3 read-only integrations (Stripe, GitHub, LinkedIn, QuickBooks, Xero, Companies House, Supabase) + cascade tool-call wiring shipped. **Track V remains 9/9 ✅** (all War Room family + valuation engine + agents + routes + workbench live). Next session = **Track Q Session Q1 — 56-field Quantara schema design + form scaffold.**
**Tests:** 384/384 across 26 suites (was 368/368 at V9 close — 16 new from O1). **Typecheck:** clean. **Vercel:** V9 + O1 deploys will land green; the env-var schema picked up 6 new optional secrets.

---

## 0 · READ FIRST — non-skippable

**Past Claude sessions (including the agent that handed THIS file to you) skipped one or more of the docs below and rebuilt the wrong thing.** That stops here. Read every doc on this list **before** any tool call beyond `git status`.

1. **`~/CLAUDE.md`** — auto-loaded. Master rules. Includes the `UserCompanyDeadline` privacy contract, "stop means stop," the "no local builds" rule, the "minimize tool calls" rule, and the LTM read-only boundary.
2. **Memory files** — auto-loaded. Index at `~/.claude/projects/C--Users-broke/memory/MEMORY.md`. The **load-bearing** ones for the next session (Track Q Q1 — Quantara schema): `feedback_world_class_standard`, `feedback_olivia_brain_batch_session_pattern`, `feedback_olivia_brain_end_of_batch_handoff_protocol`, `feedback_commit_push_no_prompt`, `project_ltm_types_no_speculative_generalization`.
3. **`HANDOFF.md`** (this file) — read in full.
4. **`docs/OLIVIA_NORTH_STAR.md`** — the single question every commit must answer **yes** to. Locked 2026-05-07.
5. **`docs/00_PRODUCT_TRUTH.md`** — bicycle-wheel architecture, product hierarchy, "all data passes through Olivia." Eternal source of truth; overrides every other doc.
6. **`docs/01_UI_DESIGN_SYSTEM.md`** — Aurum + Aether tokens, LCH color, modular workspace, WCAG 2.2 AA + APCA, Vercel rules. Q1 is schema-only (no UI yet) but Q2 is form UI — Aurum/Aether tokens, **no cyan branding**, applies.
7. **`docs/BOOTSTRAP.md`** — implementation context, sacred files list, standing rules.
8. **`docs/BUILD_SEQUENCE.md`** — find the row labelled `**Q1**` under "Track Q — Quantara Paragraphical Founder Intake (Sessions Q1–Q7)" (around line 148).
9. **`docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md`** — read **Part 36** (O1 close-out) and **Part 35** (V9 close-out) for what just shipped.
10. **`docs/STUDIO_PORT_MANIFEST.md`** § M — full Valuation subsystem inventory (Track V V1–V9). Q3-Q4 reuse parts of this (truth-score-agent, ValuationSubject schema), so familiarity saves time.

If you've never read `00_PRODUCT_TRUTH.md` or `OLIVIA_NORTH_STAR.md` in this session, **stop and read them now.** They are not optional context.

---

## 1 · Resume point — Session 30 = Track Q Session Q1 (56-field Quantara schema)

Per `docs/BUILD_SEQUENCE.md` Track Q row Q1 (~line 148):

> **Q1 — 56-field schema design + form scaffold.** Define the canonical 56-field set as Zod schemas in `src/lib/quantara/schema.ts` (sectioned: Core Financials, Ownership/Cap Table, Market, Team/Founder, IP, Vertical-Specific). Each field: type, validation, weight (critical=3 / important=2 / helpful=1), section, description, investor-class relevance flags. Map every field to its destination JSON column on `ValuationSubject` (most map directly; net-new fields go to a `quantaraJson` extension column added in this session).
>
> **Exit criterion:** All 56 fields defined + typed + tested for round-trip into `ValuationSubject`. Cap-table fields validate (e.g., total shares > 0). Field-validation suite added to `npm test`. Typecheck clean.

### What needs to land in Q1

| File | Role |
|---|---|
| `src/lib/quantara/schema.ts` (NEW) | Canonical 56-field Zod schema. Sectioned. Each field has `type`, validation, `weight` (critical=3 / important=2 / helpful=1), `section`, `description`, and an `investorClassRelevance` map flagging which investor types (angel / seed / series_a / series_b / buyout) treat the field as critical. |
| `src/lib/quantara/sections.ts` (NEW) | Section catalog (Core Financials, Ownership/Cap Table, Market, Team/Founder, IP, Vertical-Specific). Each section: id, label, order, descriptive blurb. |
| `src/lib/quantara/field-mapping.ts` (NEW) | Maps each of the 56 fields → its destination JSON column on `ValuationSubject` (`coreFinancialsJson` / `ownershipJson` / `marketJson` / `teamJson` / `ipJson` / new `quantaraJson` for net-new fields). |
| `prisma/schema.prisma` (MODIFY) | Add `quantaraJson` column on `ValuationSubject` for net-new Quantara fields that don't fit existing JSON columns. |
| `prisma/sql/04-add-quantara-foundation.sql` (NEW) | Migration generated via `prisma migrate diff` for the operator to paste into Supabase SQL Editor (Option B pattern). |
| `src/lib/quantara/__tests__/schema.test.ts` (NEW) | Validation tests: every field type-checks, cap-table totals validate (`total shares > 0`), required fields reject empty input, weight enum is valid. |
| `src/lib/quantara/__tests__/round-trip.test.ts` (NEW) | Round-trip tests: schema → ValuationSubject JSON columns → schema deserialise → identical. |

### Strategic frame

Quantara is **also** the paragraphical-questionnaire primitive that cluesintelligence (Track L) will reuse. So Q1's schema design is **not LTM-specific** — keep field shapes generic enough that Track L's 15-20 sessions shrink to ~10 because Q built the engine. Per `project_ltm_types_no_speculative_generalization`, that genericity should emerge from Q1's clean schema design *naturally*, not via premature abstraction layers.

### Operator actions Q1 will surface

| Action | When | Why |
|---|---|---|
| Apply Q1 SQL migration (`prisma/sql/04-add-quantara-foundation.sql`) | After Q1 commit lands | Adds `quantaraJson` column to `ValuationSubject`. Doesn't block Q2 (form UI) but blocks Q3 if net-new fields aren't migrated. |

### What O1 already provided for Q3

Q1-Q2 are pure schema + form UI (no integrations needed). Q3 ("Let Olivia complete the rest" auto-fill) directly consumes the O1 deliverables:

- 7 read-only integrations at `src/lib/tools/integrations/{stripe,github,linkedin,quickbooks,xero,companies-house,supabase}.ts`. Each returns `IntegrationResponse<T>` with `data`, `mockMode` flag, and `source.confidence` (0.5 mock / 0.9 real).
- `Q3_INTEGRATION_IDS` constant for the source-chip UI.
- Each integration mock-degrades when its key is absent so Q3 can ship + iterate without operator key provisioning.
- Q4's truth-score-agent (already ported in V5) can reconcile user-entered values against `source.confidence`-weighted API-derived values.

---

## 2 · Working directive (carried over from the user)

The user authorised batches via `feedback_olivia_brain_batch_session_pattern`. **Default is one task at a time. The O1 batch was a single-session batch.** The pattern that worked across V9 + O1:

- **Verify Vercel before starting** — V8 was green before V9; V9 will be green before Q1.
- **Sequential per session, parallel within a session.** Tools that don't depend on each other ran in single tool calls (parallel reads of LTM source files in V9; parallel reads of foundation/types/cascade context in O1; parallel `Write` for the 7 integration files).
- **Typecheck + tests gate before commit.** O1 ended with `npm run typecheck` clean and 384/384 tests green. **No exception.** When typecheck failed on `parameters` vs `inputSchema`, the root cause (AI SDK 6.x rename) was diagnosed and fixed — not bypassed.
- **Minimize tool calls.** O1 used PowerShell-like batches (single shell mkdir for both directories, parallel `Write` calls for the integration files).
- **One feat commit per session + one docs commit for end-of-batch.** O1 produced commit `db2f0cf` then this docs commit.
- **Architectural questions BEFORE building when scope changes.** O1 inventory revealed substantial pre-existing scaffolding the BUILD_SEQUENCE row didn't anticipate. A 30-second 3-question alignment check prevented wrong-direction work. **Use the same pattern** when discovering scope drift.
- **End-of-batch handoff is mandatory.** This file is the artifact. Per memory `feedback_olivia_brain_end_of_batch_handoff_protocol`: announce "preparing the handoff," update HANDOFF.md, push as the **last** commit of the batch.

If the user has not pre-authorised a new batch when you start, **default is one task at a time — wait for instructions before chaining sessions.**

---

## 3 · Gotchas — carried forward + new

These bit S23-S29. Bake them into your mental model.

### 3.1 LTM is not always self-consistent

- **`e2e-pipeline.test.ts` and `security-rng.test.ts` in LTM `__tests__/` reference `src/lib/export/{csv-json-export, timeline-export, sanitize}` modules that LTM never shipped.** Verified via `find`. **Do not stub** — that's a band-aid.
- **`session2.test.ts` in LTM is a top-level imperative dev script**, not a vitest suite. V4 wrapped it in `describe`/`it` so vitest picks it up.

### 3.2 Generated Prisma client can disagree with `schema.prisma`

`node_modules/.prisma/client/index.d.ts` may include columns the live `prisma/schema.prisma` doesn't have. **Trust `schema.prisma`.** The next `prisma generate` will resolve. Especially relevant for Q1 where you're adding `quantaraJson`.

### 3.3 PowerShell + bracketed path segments

Dynamic Next.js segments like `src/app/api/valuation/[runId]` need **`-LiteralPath`** in PowerShell `Copy-Item` / `Get-Content` / `Set-Content`. Without it the brackets get treated as a glob.

### 3.4 Next.js 16 async route params

```ts
// ❌ Next 15 / LTM shape — Next 16 rejects this
export async function GET(req: NextRequest, { params }: { params: { runId: string } }) {
  const { runId } = params;
}

// ✅ Next 16 contract
export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
}
```

Apply this to **every** dynamic-segment route you port. Q1 is schema-only (no routes), but Q2's `/founder-intake` route + any per-id routes Q4-Q7 add will need this.

### 3.5 Bicycle-wheel boundary on agents and routes

When porting LTM code that imports `prisma.organization`, `prisma.document`, `prisma.userProfile`, or `prisma.analysisResult`: those models do not exist in OB and (per memory `project_ltm_types_no_speculative_generalization`) **must not be added speculatively.** Two correct adaptations: push out via injection callback, or return null with a comment naming the future track.

### 3.6 LTM Clerk auth pattern → OB stub

Replace `auth()` + `prisma.userProfile.findUnique({where: {clerkUserId}})` with `getAuthSession()` from `@/lib/auth/session`. PowerShell mass-replaces handle this — see V7 commit `56c735e` for the regex patterns.

### 3.7 Tier gate stub pattern

`src/lib/require-tier.ts` exposes the LTM contract. Pre-Clerk every authenticated caller passes as `executive`-tier. F18 swaps the body for a real Prisma planTier lookup.

### 3.8 Test-timeout sizing for large module graphs (V9)

Dynamic-import smoke tests inherit the 15s global `testTimeout`. When module graphs grow, cold-start transform can exceed 15s on Windows. **Fix:** per-test timeout via the third arg of `it()`:

```ts
it("ValuationWorkbench imports without error", async () => {
  const mod = await import("@/components/valuation/ValuationWorkbench");
  expect(mod).toBeDefined();
}, 60_000);
```

Scoped per-test, never global.

### 3.9 Vercel AI SDK 6.x — `inputSchema` not `parameters` (O1)

The `tool({ description, parameters, execute })` shape is **AI SDK 5.x.** AI SDK 6.x renamed it:

```ts
// ❌ AI SDK 5.x
const t = tool({ description, parameters: z.object({...}), execute });

// ✅ AI SDK 6.x — used by Olivia Brain
const t = tool({ description, inputSchema: z.object({...}), execute });
```

If you see `error TS2769: No overload matches this call. ... 'execute' ... is not assignable to type 'undefined'` — this is the fix. Documented in O1 commit `db2f0cf`.

### 3.10 Pre-existing scaffolding can change scope (O1)

The BUILD_SEQUENCE row's wording can understate what's already built. **Always inventory before scaffolding net-new.** Run a parallel directory + grep + import-search at the start of any "build new infrastructure" session. If you find substantial existing scaffolding, ask the user 3 architectural questions (audit log location, fallback strategy, vendor SDK shape) before launching the build. A 30-second check prevents 30 minutes of wrong-direction work.

---

## 4 · Outstanding state

### 4.1 Stash held for review (carried)

Branch `main` working tree is clean except a stash carrying an uncommitted edit to `docs/00_PRODUCT_TRUTH.md`:

```
stash@{0}: On main: uncommitted PRODUCT_TRUTH §5.1 — held for review
```

The stash is the **§5.1 "Olivia's agentic critical-date pipeline (added 2026-05-04)"** section — the privacy contract that mirrors `~/CLAUDE.md`'s top-priority `UserCompanyDeadline` rule. The user told a previous agent to stash rather than commit; resolution is **the user's call** when they're ready. To inspect or apply:

```powershell
git -C "D:\Olivia Brain" stash show -p stash@{0}     # see the diff
git -C "D:\Olivia Brain" stash apply stash@{0}        # restore to working tree (keeps the stash)
git -C "D:\Olivia Brain" stash drop stash@{0}         # discard
```

Do not commit it without checking with the user first.

### 4.2 Operator actions still owed

| Action | When | Why |
|---|---|---|
| **Apply C3 SQL migration** — `prisma/sql/02-add-voice-olivia-foundation.sql` | Before C4 routes write to voice/olivia tables | 9 new tables: `olivia_*` + `voice_*`. |
| **Apply V1 SQL migration** — `prisma/sql/03-add-valuation-foundation.sql` | Before V7 routes write to valuation tables | 6 new tables: valuation_subjects, valuation_runs, valuation_sensitivities, financial_snapshots, deal_room_sessions, deal_room_messages. |
| `STUB_USER_ID` env var (Preview only, never Production) | Before testing C4 / V7 / V9 / O1 routes in Preview | Stub auth reads it. |
| `COMPOSIO_API_KEY` (Sensitive, Production + Preview) | Before O1 dispatch fires non-mock | Without this key, all dispatch returns `not_configured`. |
| Per-integration keys: `STRIPE_API_KEY`, `GITHUB_TOKEN`, `LINKEDIN_API_KEY`, `QUICKBOOKS_API_KEY`, `XERO_API_KEY`, `COMPANIES_HOUSE_API_KEY` (Sensitive, Production + Preview) | When Q3 ships, OR earlier for real-mode dev | Each integration mock-degrades when absent so Q1-Q2 unblocked. |
| Twilio + ElevenLabs + Resend + Google/Outlook OAuth + Tavily + OpenAI keys | Per the table in earlier handoffs | Every external integration. **Sensitive, Production + Preview only** per `~/CLAUDE.md`. |
| `match_calendar_memory()` PostgreSQL function | When calendar memory becomes a user-facing feature | C2 falls back to empty array + console warning until then. (W-014.) |
| **NEW for Q1:** `quantaraJson` column migration to `ValuationSubject` | After Q1 commit lands | Adds a JSON extension column for net-new Quantara fields. |

### 4.3 Active weaknesses

| ID | What | Where to close |
|---|---|---|
| ~~W-001~~ | ~~No agentic tool dispatch~~ | **CLOSED in O1 (commit `db2f0cf`).** |
| W-013 | UI Tailwind/styling fidelity gap (map + calendar + valuation) | Track C polish |
| W-014 | `match_calendar_memory()` not installed in Supabase | Operator action above |
| W-015 | `lib/auth/session.ts` is a Clerk stub | Track F Session 18 |
| W-016 | `lib/system-alerts.ts` console-only stub (no SystemAlert model) | Future track that needs system alerts |

O1 introduced no new W-IDs.

### 4.4 LTM tests still deferred

`src/lib/valuation/__tests__/e2e-pipeline.test.ts` and `security-rng.test.ts` were dropped in V4 because they import LTM-only `src/lib/export/{csv-json-export, timeline-export, sanitize}` modules **which LTM itself never shipped.** Re-port them only after the export utilities exist. Until then the deferral is correct posture per `feedback_world_class_standard` ("no band-aids").

---

## 5 · Repo locations

| Repo | Path | Status |
|---|---|---|
| **Olivia Brain (this — your working repo)** | `D:\Olivia Brain` | HEAD = post-this-handoff docs commit. Code HEAD = `db2f0cf` (O1). |
| **GitHub** | https://github.com/johndesautels1/Olivia-Brain | up to date with `main` |
| London Tech Map (LTM) | `D:\London-Tech-Map` | **READ-ONLY.** Copy components OUT; never edit, rename, delete, or move ANY LTM file. |
| Studio Olivia prototypes | `D:\Studio-Olivia` | **REFERENCE ONLY.** |
| Clues Main vision docs | `D:\Clues Main` | Docs canonical; code stale. |
| Questionnaire engine | private GitHub `johndesautels1/clues-questionnaire-engine` | Current truth for cluesintelligence. **Q1 should mirror this engine's field shapes** — Q is also the paragraphical-questionnaire primitive Track L will reuse. |

---

## 6 · Absolute rules (do not violate)

1. **LTM is read-only.** Never edit, rename, delete, or move any file in `D:\London-Tech-Map`.
2. **No band-aids.** No `force-dynamic`, no `// hack`, no `@ts-ignore`, no Suspense wrappers used as a workaround. Find and fix the root cause.
3. **Verify before claiming done.** `npm test` and `npm run typecheck` must both pass before any commit.
4. **Lockfile in same commit as `package.json`.** Always.
5. **Commit + push together.** Vercel deploys from git. Local commits do nothing.
6. **One concern per commit.** Mixed-concern commits are forbidden.
7. **AbortSignal + timeout on every network call.** No exceptions. (Q3 will exercise the O1 integrations, all of which already use `AbortSignal.timeout(8s)` via `withMockFallback`.)
8. **PII never enters spans, traces, or logs.** Only metadata. (Q1 schema must NOT log field values into traces — only field ids + validation outcomes.)
9. **JSDoc on every exported symbol.** Class headers describe reliability guarantees.
10. **One task at a time** unless the user explicitly authorises a batch.
11. **NEVER run local builds** (`npm run build`, `next build`). Vercel handles that. `npm run typecheck` and `npm test` are allowed.
12. **All architecture and README docs commit alongside code changes** that change them.
13. **STOP means STOP.** "Stop" / "halt" / "wait" / "hold on" / "pause" — in any casing or typo — immediately ceases all tool calls and execution.

Full standing rules: `docs/BUILD_SEQUENCE.md` § "Standing rules carried into every session" + `~/CLAUDE.md`.

---

## 7 · Recent commit trail

```
<this handoff commit>  docs: end-of-batch handoff O1 — W-001 CLOSED + Q1 prep
db2f0cf feat(tools): Track O Session O1 — Composio dispatch + 7 read-only integrations (W-001 closed)
7cba95d docs: end-of-batch handoff V9 — Track V CLOSED + O1 prep
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
```

---

## 8 · Strategic priority (locked 2026-05-03, expanded 2026-05-07)

Founder direction: focus on **`clueslondon.com` (priority 1)** and **`cluesintelligence.com` (priority 2 — FLAGSHIP)**. Both ship targets. cluesxscore (priority 3) and white-label Olivia (priority 4) follow.

**June 8 strategy.** London Tech Show on 2026-06-08 is a **demo target, not a full clueslondon ship.** Olivia Brain becomes the canonical implementation; LTM port-back happens in a separate post-OB Claude session. Bicycle-wheel preserved.

**Pace.** Founder operates at ~4 sessions/day. **~56 sessions remain to ship priorities 1–4** (was ~57 at V9 close, ~58 at V8 close).

**Tracks remaining:**

- **Next: Track Q (Quantara paragraphical intake, Q1–Q7).** Q1 is the schema design.
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
- Track N (Visual Manifestation, N1–N5) — depends on O1 (now ✅).
- Track O O2–O5 (eval runtime / voice latency / citation-first RAG / avatar lip-sync).
- Track L (cluesintelligence Unification, post-clueslondon, ~10 sessions because Q built the questionnaire engine).

Full session-by-session breakdown: `docs/BUILD_SEQUENCE.md`.

---

## 9 · Memories you'll find auto-loaded

| Memory | What it locks |
|---|---|
| `feedback_world_class_standard` | 12-row standard table; no band-aids; root-cause every failure. |
| `feedback_olivia_brain_batch_session_pattern` | OB-only batch mode (sequential without check-ins, per-session commits) when user pre-authorises. |
| `feedback_olivia_brain_end_of_batch_handoff_protocol` | At end of each OB batch, ANNOUNCE "preparing the handoff" + update HANDOFF.md + push as the LAST commit. |
| `feedback_commit_push_no_prompt` | In OB / LTM repos, every code fix is `git add && commit && push` in the same turn. Don't ask permission per commit. |
| `project_ltm_types_no_speculative_generalization` | Don't add LTM Prisma models to OB. Don't stub LTM-specific routes. Wait for a real second consumer or push the dependency out via injection. |
| `project_track_v_ltm_valuation_port` | Track V scope: 9 sessions, ~93 files. **Now CLOSED at V9.** |
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
git log --oneline -8                          # confirm HEAD is the post-O1 docs commit
```

Then in Claude Code:

1. **Read every doc in §0 above. Do not skip.**
2. Read `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Part 36 for what just shipped (O1 close-out).
3. Read `docs/BUILD_SEQUENCE.md` Track Q row Q1 (~line 148) for Session 30's deliverable + exit criterion.
4. Skim `docs/BUILD_SEQUENCE.md` Track Q rows Q2-Q7 so you understand which sections of the schema design will drive form UI / metamorphic re-ordering / voice capture later.
5. Inspect the existing Quantara questionnaire engine repo (`johndesautels1/clues-questionnaire-engine`) for canonical 56-field shapes — Q1 should mirror those, not invent new ones, since Track L will reuse the primitive.
6. Confirm Vercel build is green on the post-`db2f0cf` deploy. If it's not, the failure is almost certainly NOT in Q1 territory — surface it before Q1 starts.
7. Begin Session 30: scaffold `src/lib/quantara/{schema,sections,field-mapping}.ts`, add the `quantaraJson` Prisma column + migration, write the schema + round-trip tests.

**Standing rule reminder:** stop after Q1's deliverable lands. Q2-Q7 each need their own user pre-authorisation before chaining. Update docs alongside the code commit per the doc-discipline rule.
