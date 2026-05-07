# OLIVIA BRAIN — NEXT AGENT HANDOFF

**Updated:** 2026-05-07 (end of batch S23–S27)
**GitHub:** https://github.com/johndesautels1/Olivia-Brain
**Local:** `D:\Olivia Brain`
**HEAD:** `edb195a` on `main` (Track V Session V8 — ValuationWorkbench + 31 zone components)
**State:** **Track V 8/9 ✅.** Valuation engine, agents, API routes, and workbench UI all ported. Next session = S28 / **V9** — port the five War Room / Deal Room components currently shimmed by `_v9-placeholders.tsx` and close Track V.
**Tests:** 368/368 across 24 suites. **Typecheck:** clean. **Vercel:** post-S26 build broke on Next 16 async-params strictness; **fixed in V8 (`edb195a`)** — verify the next Vercel deploy succeeds.

---

## 0 · READ FIRST — non-skippable

**Past Claude sessions (including the agent that handed THIS file to you) skipped one or more of the docs below and rebuilt the wrong thing.** That stops here. Read every doc on this list **before** any tool call beyond `git status`.

1. **`~/CLAUDE.md`** — auto-loaded. Master rules. Includes the `UserCompanyDeadline` privacy contract, "stop means stop," the "no local builds" rule, the "minimize tool calls" rule, and the LTM read-only boundary.
2. **Memory files** — auto-loaded. Index at `~/.claude/projects/C--Users-broke/memory/MEMORY.md`. The **load-bearing** ones for valuation work: `feedback_world_class_standard`, `feedback_olivia_brain_batch_session_pattern`, `feedback_olivia_brain_end_of_batch_handoff_protocol`, `project_ltm_types_no_speculative_generalization`, `project_track_v_ltm_valuation_port`, `feedback_commit_push_no_prompt`.
3. **`HANDOFF.md`** (this file) — read in full.
4. **`docs/OLIVIA_NORTH_STAR.md`** — the single question every commit must answer **yes** to. Locked 2026-05-07.
5. **`docs/00_PRODUCT_TRUTH.md`** — bicycle-wheel architecture, product hierarchy, "all data passes through Olivia." Eternal source of truth; overrides every other doc.
6. **`docs/01_UI_DESIGN_SYSTEM.md`** — Aurum + Aether tokens, LCH color, modular workspace, WCAG 2.2 AA + APCA, Vercel rules. Every UI conforms.
7. **`docs/BOOTSTRAP.md`** — implementation context, sacred files list, standing rules.
8. **`docs/BUILD_SEQUENCE.md`** — find the row labelled `**V9**` under "Track V — LTM Valuation Engine Port (Sessions V1–V9)."
9. **`docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md`** — read **Parts 30–34** for what just shipped (the S23–S27 batch you're picking up after).

If you've never read `00_PRODUCT_TRUTH.md` or `OLIVIA_NORTH_STAR.md` in this session, **stop and read them now.** They are not optional context.

---

## 1 · Resume point — Session 28 = Track V V9

Per `docs/BUILD_SEQUENCE.md` Track V row V9:

> **WarRoom + DealRoomSimulator + AcquisitionMirror.** Port: `WarRoom.tsx`, `WarRoomSession.tsx`, `WarRoomTranscript.tsx`, `WarRoomBriefing.tsx`, `WarRoomDocumentBridge.tsx`, `DealRoomSimulator.tsx`, `AcquisitionMirror.tsx`, `NegotiationAnchorCard.tsx`. Wire `negotiationSummary` bidirectional link from `ValuationRun` → `DealRoomSession`. Add `STUDIO_PORT_MANIFEST.md` § M (Valuation subsystem inventory). **Track V CLOSED.**

### Files V8 left as placeholders that V9 must replace

These five files in `src/components/valuation/` are currently re-export shims pointing at `_v9-placeholders.tsx`. **Replace them with the real LTM ports.** `ValuationWorkbench` already imports them; do not change V8 call sites.

| OB file (currently shim) | LTM source to copy |
|---|---|
| `WarRoom.tsx` | `D:\London-Tech-Map\src\components\valuation\WarRoom.tsx` |
| `DealRoomSimulator.tsx` | `D:\London-Tech-Map\src\components\valuation\DealRoomSimulator.tsx` |
| `AcquisitionMirror.tsx` | `D:\London-Tech-Map\src\components\valuation\AcquisitionMirror.tsx` |
| `NegotiationAnchorCard.tsx` | `D:\London-Tech-Map\src\components\valuation\NegotiationAnchorCard.tsx` (must keep exporting `interface ChallengeResponse` — V8 imports it) |
| `EquityWaterfall.tsx` | `D:\London-Tech-Map\src\components\valuation\EquityWaterfall.tsx` |

Plus the rest of the War Room family (not yet in OB):

| OB destination | LTM source |
|---|---|
| `src/components/valuation/WarRoomSession.tsx` | `D:\London-Tech-Map\src\components\valuation\WarRoomSession.tsx` |
| `src/components/valuation/WarRoomTranscript.tsx` | `D:\London-Tech-Map\src\components\valuation\WarRoomTranscript.tsx` |
| `src/components/valuation/WarRoomBriefing.tsx` | `D:\London-Tech-Map\src\components\valuation\WarRoomBriefing.tsx` |
| `src/components/valuation/WarRoomDocumentBridge.tsx` | `D:\London-Tech-Map\src\components\valuation\WarRoomDocumentBridge.tsx` |
| `src/components/valuation/war-room-utils.ts` | `D:\London-Tech-Map\src\components\valuation\war-room-utils.ts` |

After porting, **delete `src/components/valuation/_v9-placeholders.tsx`** — it has no consumers once the real components ship.

### Bidirectional `negotiationSummary` link

V9 spec: "Wire `negotiationSummary` bidirectional link from `ValuationRun` → `DealRoomSession`." `ValuationRun.dealRoomSessions` already exists (V1 schema); the GET `[runId]` route already builds a `negotiationSummary` from the latest session (`src/app/api/valuation/[runId]/route.ts:498-521`). Confirm that War Room writes flow back into the existing `negotiationSummary` shape; extend `dashboard-types.ts` only if a real gap exists.

### Track close-out artifact

Append `STUDIO_PORT_MANIFEST.md` § **M — Valuation subsystem inventory** mirroring the shape of § J (Map) and § L (Calendar). Include the V8 + V9 file inventory + adaptations + LTM weakness IDs touched.

---

## 2 · Working directive (carried over from the user)

The user authorised batches via `feedback_olivia_brain_batch_session_pattern`. Default is one task at a time. **For S23–S27 the user explicitly directed:**

> *"Build the next 5 sessions in parallel, stop with each session so we can assure no typescript errors. You are commanded to code to best coding practices and minimize tool uses and get going."*

Translation in practice (this batch validated the pattern):

- **Sequential per session, parallel within a session.** Tools that don't depend on each other (parallel reads of LTM source files, the PowerShell mass-replace) ran in single tool calls. Inside each session the work was: copy → adapt → typecheck → tests → commit + push → next session.
- **Typecheck-gated stop after each.** Every session ended with `npm run typecheck` clean and `npm test` green before the commit. **No exception is acceptable.** If typecheck fails, fix the root cause; do not push the session.
- **Minimize tool calls.** PowerShell mass-replaces beat dozens of `Edit` calls when the patterns are mechanical. Per-component hand-edits when the structure is unique. Do not call `find` / `grep` to "double-check" something the canonical doc already says (CLAUDE.md rule).
- **Per-session feat commits + per-session SESSION_LOG entries batched into a single end-of-batch docs commit.** S23–S27 produced commits `6fbeb25`, `4274f61`, `b53abea`, `56c735e`, `edb195a` then this docs commit.
- **End-of-batch handoff is mandatory.** This file is the artifact. Per memory `feedback_olivia_brain_end_of_batch_handoff_protocol`: announce "preparing the handoff," update HANDOFF.md, push as the **last** commit of the batch.

If the user has not pre-authorised a new batch when you start, **default is one task at a time — wait for instructions before chaining sessions.**

---

## 3 · Gotchas this batch surfaced — do not rediscover

These are the things that bit S23–S27. Bake them into your mental model before you touch code.

### 3.1 LTM is not always self-consistent

- **`e2e-pipeline.test.ts` and `security-rng.test.ts` in LTM `__tests__/` reference `src/lib/export/{csv-json-export, timeline-export, sanitize}` modules that LTM never shipped.** Verified via `find`. They will defer indefinitely unless V9 (or a follow-up) adds the export utilities. Do not attempt to "fix" by stubbing — that's a band-aid.
- **`session2.test.ts` in LTM is a top-level imperative dev script** (top-level `console.log` + `throw`), not a vitest suite. V4 wrapped it in `describe`/`it` so vitest picks it up. If you encounter similar LTM dev scripts, do the same — preserve the validation logic, add the test runner hooks.

### 3.2 Generated Prisma client can disagree with `schema.prisma`

`node_modules/.prisma/client/index.d.ts` may include columns the live `prisma/schema.prisma` doesn't have (this batch hit this on `DealRoomSession.companyName` etc.). **Trust `schema.prisma`.** The next `prisma generate` will resolve the divergence. If a route is writing to a column the schema lacks, drop the column from the route; do not add the column to the schema unless that's what you actually intend.

### 3.3 PowerShell + bracketed path segments

Dynamic Next.js segments like `src/app/api/valuation/[runId]` need **`-LiteralPath`** in PowerShell `Copy-Item` / `Get-Content` / `Set-Content`. Without it the brackets get treated as a glob and your operation silently no-ops on the file you cared about. The `[runId]/route.ts` file went missing once for exactly this reason — a `find` listing was the only way to spot it.

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

### 3.5 Bicycle-wheel boundary on cristiano.ts and run/route.ts

When porting LTM code that imports `prisma.organization`, `prisma.document`, `prisma.userProfile`, or `prisma.analysisResult`: those models do not exist in OB and (per memory `project_ltm_types_no_speculative_generalization`) **must not be added speculatively.** Two correct adaptations:

1. **Push the dependency out** via an injected callback (e.g. `LoadCandidateOrgsFn` in `cristiano.ts`). The caller — running embedded in LTM or routing through the UKP bridge — supplies the data.
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

---

## 4 · Outstanding state

### 4.1 Stash held for review

Branch `main` working tree is clean except a stash carrying an uncommitted edit to `docs/00_PRODUCT_TRUTH.md`:

```
stash@{0}: On main: uncommitted PRODUCT_TRUTH §5.1 — held for review
```

The stash is the **§5.1 "Olivia's agentic critical-date pipeline (added 2026-05-04)"** section — the privacy contract that mirrors `~/CLAUDE.md`'s top-priority `UserCompanyDeadline` rule. It was in the working tree when this conversation started and the previous agent's "Working tree clean" claim was wrong. The user told me to stash rather than commit; resolution is **the user's call** when they're ready. To inspect or apply:

```powershell
git -C "D:\Olivia Brain" stash show -p stash@{0}     # see the diff
git -C "D:\Olivia Brain" stash apply stash@{0}        # restore to working tree (keeps the stash)
git -C "D:\Olivia Brain" stash drop stash@{0}         # discard
```

Do not commit it without checking with the user first.

### 4.2 Operator actions still owed (unchanged from prior handoffs)

| Action | When | Why |
|---|---|---|
| **Apply C3 SQL migration** — paste `prisma/sql/02-add-voice-olivia-foundation.sql` into Supabase SQL Editor and Run. | Before C4 routes write to voice/olivia tables | 9 new tables: `olivia_*` + `voice_*`. |
| **Apply V1 SQL migration** — paste `prisma/sql/03-add-valuation-foundation.sql` into Supabase SQL Editor and Run. | Before V7 routes (now live post-V8) write to valuation tables | 6 new tables: `valuation_subjects`, `valuation_runs`, `valuation_sensitivities`, `financial_snapshots`, `deal_room_sessions`, `deal_room_messages`. |
| `STUB_USER_ID` env var (Preview only, never Production) | Before testing C4 / V7 routes in Preview | Stub auth reads it. |
| Twilio + ElevenLabs + Resend + Google/Outlook OAuth + Tavily + OpenAI keys | Per the table in the previous handoff (still applicable) | Every external integration. **Sensitive, Production + Preview only** per `~/CLAUDE.md`. |
| `match_calendar_memory()` PostgreSQL function | When calendar memory becomes a user-facing feature | C2 falls back to empty array + console warning until then. (W-014.) |

### 4.3 Active weaknesses (carried)

| ID | What | Where to close |
|---|---|---|
| W-013 | Calendar UI Tailwind/styling fidelity gap | Track C polish (revisit after Track V close) |
| W-014 | `match_calendar_memory()` not installed in Supabase | Operator action above |
| W-015 | `lib/auth/session.ts` is a Clerk stub | Track F Session 18 |
| W-016 | `lib/system-alerts.ts` console-only stub (no SystemAlert model) | Future track that needs system alerts |

V8 did not introduce new W-IDs. V9 will not either if it sticks to the spec.

### 4.4 LTM tests still deferred

`src/lib/valuation/__tests__/e2e-pipeline.test.ts` and `security-rng.test.ts` were dropped in V4 because they import LTM-only `src/lib/export/{csv-json-export, timeline-export, sanitize}` modules **which LTM itself never shipped.** Re-port them only after the export utilities exist (no obvious owner; not in the V9 spec). Until then the deferral is the correct posture per `feedback_world_class_standard` ("no band-aids").

---

## 5 · Repo locations

| Repo | Path | Status |
|---|---|---|
| **Olivia Brain (this — your working repo)** | `D:\Olivia Brain` | HEAD `edb195a` post this handoff commit. |
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
7. **AbortSignal + timeout on every network call.** No exceptions.
8. **PII never enters spans, traces, or logs.** Only metadata.
9. **JSDoc on every exported symbol.** Class headers describe reliability guarantees.
10. **One task at a time** unless the user explicitly authorises a batch.
11. **NEVER run local builds** (`npm run build`, `next build`). Vercel handles that. `npm run typecheck` and `npm test` are allowed.
12. **All architecture and README docs commit alongside code changes** that change them.
13. **STOP means STOP.** "Stop" / "halt" / "wait" / "hold on" / "pause" — in any casing or typo — immediately ceases all tool calls and execution. No completing the current step. (Top-priority rule from `~/CLAUDE.md`.)

Full standing rules: `docs/BUILD_SEQUENCE.md` § "Standing rules carried into every session" + `~/CLAUDE.md`.

---

## 7 · Recent commit trail

```
<this handoff commit>  docs: end-of-batch handoff S23-S27 — Track V 8/9 ✅ + V9 prep
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
9c2f25d feat(studio): Track C Session 19 — polish (J/K keyboard nav + autosave + theme switching)
98a63d6 feat(studio): Track C Session 18 — right-pane tabs + audit log + theme picker
```

---

## 8 · Strategic priority (locked 2026-05-03, expanded 2026-05-07)

Founder direction: focus on **`clueslondon.com` (priority 1)** and **`cluesintelligence.com` (priority 2 — FLAGSHIP)**. Both ship targets. cluesxscore (priority 3) and white-label Olivia (priority 4) follow.

**June 8 strategy.** London Tech Show on 2026-06-08 is a **demo target, not a full clueslondon ship.** Olivia Brain becomes the canonical implementation; LTM port-back happens in a separate post-OB Claude session. Bicycle-wheel preserved.

**Pace.** Founder operates at ~4 sessions/day. **~58 sessions remain to ship priorities 1–4** (was ~63 at S22 close, ~68 at S17 close).

**Tracks remaining after V9:**

- Track O Session O1 (Composio dispatch) — pulled forward ahead of Track Q.
- Track Q (Quantara paragraphical intake, Q1–Q7).
- Track P (Deal Protection + gap closures, P1–P7).
- Track D (Studio ↔ brain wiring, S15–S16 in original numbering).
- Track E (voice input, S17).
- Track F (Clerk auth, S18).
- Track G (cascade orchestrator port, S19–S20).
- Track H (agents consolidation, S21–S23).
- Track I (multi-tenant + adaptive surface suppression, S24).
- Track J (vertical adapters, S25–S26).
- Track K (hardening + launch prep, S27–S29).
- Launch (S30) on or about 2026-06-02.
- Track N (Visual Manifestation, N1–N5).
- Track O O2–O5 (weakness closure).
- Track L (cluesintelligence Unification, post-clueslondon, ~10 sessions).

Full session-by-session breakdown: `docs/BUILD_SEQUENCE.md`.

---

## 9 · Memories you'll find auto-loaded

| Memory | What it locks |
|---|---|
| `feedback_world_class_standard` | 12-row standard table; no band-aids; root-cause every failure. |
| `feedback_olivia_brain_batch_session_pattern` | OB-only batch mode (sequential without check-ins, per-session commits) when user pre-authorises — e.g. "build S28–S33." |
| `feedback_olivia_brain_end_of_batch_handoff_protocol` | At end of each OB batch, ANNOUNCE "preparing the handoff" + update HANDOFF.md + push as the LAST commit. |
| `feedback_commit_push_no_prompt` | In OB / LTM repos, every code fix is `git add && commit && push` in the same turn. Don't ask permission per commit. |
| `project_ltm_types_no_speculative_generalization` | Don't add LTM Prisma models to OB. Don't stub LTM-specific routes. Wait for a real second consumer or push the dependency out via injection. |
| `project_track_v_ltm_valuation_port` | Track V scope: 9 sessions, ~93 files. V8 is the workbench surface; V9 is War Room close-out. |
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
git log --oneline -8                          # confirm HEAD is the post-S23-S27 docs commit
```

Then in Claude Code:

1. **Read every doc in §0 above. Do not skip.**
2. Read `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Parts 30–34 for what just shipped + the judgment-call trail.
3. Read `docs/BUILD_SEQUENCE.md` Track V row **V9** for Session 28's deliverable + exit criterion.
4. Read `docs/STUDIO_PORT_MANIFEST.md` § J + § L (Map and Calendar inventories) — § M will be appended in V9 in the same shape.
5. Open `D:\London-Tech-Map\src\components\valuation\` in **read-only** mode to inventory the WarRoom family + DealRoomSimulator + AcquisitionMirror + EquityWaterfall + war-room-utils.ts.
6. Begin Session 28 by replacing the five `_v9-placeholders.tsx`-backed shims with real LTM ports, then port the rest of the WarRoom family, then wire `negotiationSummary` bidirectional, then append `STUDIO_PORT_MANIFEST.md` § M.
7. Confirm the Vercel build is green on the post-`edb195a` deploy. If it's not, the failure is almost certainly NOT in V9 territory — it's a leftover from V8 that needs surfacing before V9 starts.

**Standing rule reminder:** stop after V9's deliverable lands. Track V closes at V9 — confirm with the user before opening Track O / Q / P. Update docs alongside the code commit per the doc-discipline rule.
