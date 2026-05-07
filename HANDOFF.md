# OLIVIA BRAIN — NEXT AGENT HANDOFF

**Updated:** 2026-05-07 (end of batch — O1 rebuild — W-001 CLOSED via LTM-first audit)
**GitHub:** https://github.com/johndesautels1/Olivia-Brain
**Local:** `D:\Olivia Brain`
**HEAD:** post-this-handoff-commit on `main` (code HEAD before docs = `7e4d356`, O1 rebuild)
**State:** **Track O Session O1 ✅ — W-001 CLOSED via LTM-first rebuild.** First O1 attempt (commit `db2f0cf`) shipped without auditing LTM and was reverted (`dba6d1e`, `96975e4`). Rebuilt with byte-for-byte LTM port of the Companies House client (`lib/companies-house/client.ts`) plus 6 OB-original Q3 integrations (per LTM audit confirming none of them exist in LTM). Composio dispatch + approval-gate + confidence-gate confirmed OB-original. **Track V remains 9/9 ✅.** Next session = **Track Q Session Q1 — 56-field Quantara schema design + form scaffold.**
**Tests:** 385/385 across 26 suites (was 368 at V9 close — +17 from O1 rebuild including a contract test for the LTM-ported client). **Typecheck:** clean. **Vercel:** O1 rebuild push (`7e4d356`) deploy will be live shortly.

---

## 0 · READ FIRST — non-skippable

**Past Claude sessions (including the O1 first-attempt agent in THIS session) skipped one or more of the docs below and rebuilt the wrong thing.** That stops here. Read every doc on this list **before** any tool call beyond `git status`.

1. **`~/CLAUDE.md`** — auto-loaded. Master rules. Includes the `UserCompanyDeadline` privacy contract, "stop means stop," the "no local builds" rule, the "minimize tool calls" rule, and the LTM read-only boundary.
2. **Memory files** — auto-loaded. Index at `~/.claude/projects/C--Users-broke/memory/MEMORY.md`. Load-bearing for the next session: `feedback_world_class_standard`, `feedback_olivia_brain_batch_session_pattern`, `feedback_olivia_brain_end_of_batch_handoff_protocol`, `feedback_commit_push_no_prompt`, `project_ltm_types_no_speculative_generalization`.
3. **`HANDOFF.md`** (this file) — read in full.
4. **`docs/OLIVIA_NORTH_STAR.md`** — the single question every commit must answer **yes** to. Locked 2026-05-07.
5. **`docs/00_PRODUCT_TRUTH.md`** — bicycle-wheel architecture, product hierarchy, "all data passes through Olivia." Eternal source of truth; overrides every other doc.
6. **`docs/01_UI_DESIGN_SYSTEM.md`** — Aurum + Aether tokens, LCH color, modular workspace, WCAG 2.2 AA + APCA. Q1 is schema-only; Q2 is form UI — Aurum/Aether tokens, **no cyan branding**, applies.
7. **`docs/BOOTSTRAP.md`** — implementation context, sacred files list, standing rules, **the three sources** (OB / LTM / Studio Olivia prototypes).
8. **`docs/BUILD_SEQUENCE.md`** — find the row labelled `**Q1**` under "Track Q — Quantara Paragraphical Founder Intake (Sessions Q1–Q7)" (around line 148).
9. **`docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md`** — read **Part 36** for what just shipped (O1 first-attempt + revert + LTM-first rebuild — including the audit table) and **Part 35** for the V9 close-out.
10. **`docs/STUDIO_PORT_MANIFEST.md`** § M — full Valuation subsystem inventory (Track V V1–V9). Q3-Q4 reuse parts of this (truth-score-agent, ValuationSubject schema), so familiarity saves time.

If you've never read `00_PRODUCT_TRUTH.md` or `OLIVIA_NORTH_STAR.md` in this session, **stop and read them now.** They are not optional context.

---

## 1 · Resume point — Session 30 = Track Q Session Q1 (56-field Quantara schema)

Per `docs/BUILD_SEQUENCE.md` Track Q row Q1 (~line 148):

> **Q1 — 56-field schema design + form scaffold.** Define the canonical 56-field set as Zod schemas in `src/lib/quantara/schema.ts` (sectioned: Core Financials, Ownership/Cap Table, Market, Team/Founder, IP, Vertical-Specific). Each field: type, validation, weight (critical=3 / important=2 / helpful=1), section, description, investor-class relevance flags. Map every field to its destination JSON column on `ValuationSubject` (most map directly; net-new fields go to a `quantaraJson` extension column added in this session).
>
> **Exit criterion:** All 56 fields defined + typed + tested for round-trip into `ValuationSubject`. Cap-table fields validate (e.g., total shares > 0). Field-validation suite added to `npm test`. Typecheck clean.

### **Before you scaffold Q1 — LTM AUDIT FIRST.** (Codified gotcha §3.10.)

The user's framing: **"the entire app build purpose is to copy over from our other sister apps presently london tech map being the big one all their key technologies and then integrate them into olivia brain. When their tech is better we replace that part of olivia brain that is inferior and when their tech is inferior we use ours."**

For Q1, that means **before writing `src/lib/quantara/schema.ts`**, audit:

- LTM's `clues-questionnaire-engine` repo (private — `johndesautels1/clues-questionnaire-engine`) for canonical 56-field Zod shapes. Q is the paragraphical-questionnaire primitive Track L will reuse, so the schema must mirror the questionnaire engine, not invent new shapes.
- LTM's `lib/quantara/` (if present), `lib/intake/`, `lib/founder-intake/`, `lib/questionnaire/`.
- LTM's `prisma/schema.prisma` for any pre-existing `ValuationSubject` JSON-column structure that Q1 should match.
- OB's existing `src/lib/clues-intelligence/` directory — this might already host pieces of the questionnaire engine.

If LTM has a 56-field schema → **port byte-for-byte.** Only build OB-original where LTM doesn't have it.

### What needs to land in Q1

| File | Role |
|---|---|
| `src/lib/quantara/schema.ts` (NEW or PORTED from `clues-questionnaire-engine`) | Canonical 56-field Zod schema, sectioned, weighted, with investor-class relevance flags. |
| `src/lib/quantara/sections.ts` (NEW) | Section catalog (Core Financials / Ownership / Market / Team / IP / Vertical). |
| `src/lib/quantara/field-mapping.ts` (NEW) | Maps each of the 56 fields → its destination JSON column on `ValuationSubject`. |
| `prisma/schema.prisma` (MODIFY) | Add `quantaraJson` column on `ValuationSubject`. |
| `prisma/sql/04-add-quantara-foundation.sql` (NEW) | Migration generated via `prisma migrate diff` for operator paste-into-Supabase. |
| `src/lib/quantara/__tests__/schema.test.ts` + `round-trip.test.ts` (NEW) | Validation + round-trip into ValuationSubject JSON columns. |

### Strategic frame

Quantara is **also** the paragraphical-questionnaire primitive that cluesintelligence (Track L) will reuse. So Q1's schema design is not LTM-specific — keep field shapes generic enough that Track L's 15-20 sessions shrink to ~10 because Q built the engine. Per `project_ltm_types_no_speculative_generalization`, the genericity emerges from clean schema design *naturally*, not via premature abstraction layers.

### What O1 already provided for Q3 (downstream)

- 7 read-only integrations at `src/lib/tools/integrations/{stripe,github,linkedin,quickbooks,xero,companies-house,supabase}.ts`. Each returns `IntegrationResponse<T>` with `data`, `mockMode` flag, and `source.confidence` (0.5 mock / 0.9 real).
- **Companies House uses the byte-for-byte ported LTM client** at `src/lib/companies-house/client.ts` (production-grade rate-limit retry + full surface). The Q3 wrapper is thin.
- `Q3_INTEGRATION_IDS` constant for the source-chip UI.
- Each integration mock-degrades when its key is absent so Q3 can ship + iterate without operator key provisioning.

### Operator actions Q1 will surface

| Action | When | Why |
|---|---|---|
| Apply Q1 SQL migration (`prisma/sql/04-add-quantara-foundation.sql`) | After Q1 commit lands | Adds `quantaraJson` column to `ValuationSubject`. |

---

## 2 · Working directive

**Default is one task at a time.** The user has called out (correctly) that the project's purpose is to PORT from LTM when LTM is better, BUILD OB-original only when LTM lacks the capability. Audit LTM **before** scaffolding any new infrastructure. Failure to audit caused the O1 first-attempt revert in this session.

The pattern that worked across V9 + O1-rebuild:

- **LTM audit first.** Open `D:\London-Tech-Map` read-only. `ls` the relevant lib subdirectories. `grep` for capabilities (composio / approval / hostnames). Read candidate ports if they exist. Decide port-vs-build per the bicycle-wheel rule.
- **Verify Vercel before starting.**
- **Sequential per session, parallel within a session.** Parallel `Read` / `Write` / `Edit` calls when they're independent.
- **Typecheck + tests gate before commit.** No exceptions.
- **Minimize tool calls.** PowerShell `Copy-Item -LiteralPath` for byte-for-byte LTM ports. Parallel writes for new files.
- **One feat commit per session + one docs commit for end-of-batch.**
- **End-of-batch handoff is mandatory** per `feedback_olivia_brain_end_of_batch_handoff_protocol`.

If the user has not pre-authorised a new batch when you start, **default is one task at a time — wait for instructions before chaining sessions.**

---

## 3 · Gotchas — carried forward + new

These bit S23-S29. Bake them into your mental model.

### 3.1 LTM is not always self-consistent

`e2e-pipeline.test.ts` and `security-rng.test.ts` in LTM `__tests__/` reference `src/lib/export/{csv-json-export, timeline-export, sanitize}` modules LTM never shipped. **Do not stub.** `session2.test.ts` in LTM is a top-level imperative dev script, not a vitest suite — wrap in `describe`/`it` if you ever port it.

### 3.2 Generated Prisma client can disagree with `schema.prisma`

`node_modules/.prisma/client/index.d.ts` may include columns the live schema doesn't have. **Trust `schema.prisma`.** Especially relevant for Q1's `quantaraJson` addition.

### 3.3 PowerShell + bracketed path segments

Dynamic Next.js segments like `src/app/api/valuation/[runId]` need **`-LiteralPath`** in PowerShell `Copy-Item` / `Get-Content` / `Set-Content`. Without it the brackets get treated as a glob.

### 3.4 Next.js 16 async route params

`{ params: { runId: string } }` → `{ params: Promise<{ runId: string }> }` with `await params`. Apply to every dynamic-segment route.

### 3.5 Bicycle-wheel boundary on agents and routes

LTM-only Prisma references (`prisma.organization`, `prisma.document`, `prisma.userProfile`, `prisma.analysisResult`) **must not be added speculatively** to OB. Two correct adaptations: push out via injection callback, or return null with a comment naming the future track.

### 3.6 LTM Clerk auth pattern → OB stub

Replace `auth()` + `prisma.userProfile.findUnique` with `getAuthSession()` from `@/lib/auth/session`. PowerShell mass-replaces handle this — see V7 commit `56c735e`.

### 3.7 Tier gate stub pattern

`src/lib/require-tier.ts` exposes the LTM contract. Pre-Clerk every authenticated caller passes as `executive`-tier. F18 swaps the body for a real Prisma planTier lookup.

### 3.8 Test-timeout sizing for large module graphs (V9)

Per-test timeout via the third arg of `it()` — scoped per-test, never global.

### 3.9 Vercel AI SDK 6.x — `inputSchema` not `parameters`

```ts
// ❌ AI SDK 5.x — Olivia Brain ships AI SDK 6.x
const t = tool({ description, parameters: z.object({...}), execute });

// ✅ AI SDK 6.x
const t = tool({ description, inputSchema: z.object({...}), execute });
```

If `error TS2769: No overload matches this call. ... 'execute' ... is not assignable to type 'undefined'` — this is the fix.

### 3.10 LTM AUDIT IS MANDATORY before scaffolding any new infrastructure (O1 lesson)

**The O1 first attempt was reverted because it skipped this step.** The user's framing: *"why are we doing wrappers — the entire app build purpose is to copy over from our other sister apps presently london tech map being the big one all their key technologies and then integrate them into olivia brain."*

Before writing any new `src/lib/<subsystem>/` directory:

1. `ls "D:/London-Tech-Map/src/lib/"*/` — full LTM lib inventory.
2. `grep` LTM source for the capability keyword (e.g. `composio`, `approval`, `quantara`, `questionnaire`).
3. Read any candidate LTM file (`lib/<subsystem>/`, `lib/services/<subsystem>.ts`, `lib/cascade/providers/<subsystem>.ts`).
4. Decide per the **bicycle-wheel rule**:
   - LTM has a better version → **PORT byte-for-byte** via PowerShell `Copy-Item -LiteralPath` (V9 pattern). Q3-style wrappers are thin and delegate.
   - LTM has an inferior version OR a different concern → keep / build OB-original. **Document** the audit + decision in the commit message.
   - LTM lacks it entirely → OB-original is correct. Document why in commit message + handoff.

**Failure to audit = the session gets reverted.** This is non-negotiable.

The O1 audit table (locked 2026-05-07) is in SESSION_LOG Part 36; reuse the format for future audits.

### 3.11 Pre-existing OB scaffolding can change scope (O1)

The BUILD_SEQUENCE row's wording can understate what's already built in OB. Inventory both LTM AND OB before building. The O1 audit revealed `services/composio.ts` + `tools/approval-gate.ts` + `tools/confidence-gate.ts` already existed in OB; the O1 work was therefore wiring + Companies House port, not ground-up.

---

## 4 · Outstanding state

### 4.1 Stash held for review (carried)

```
stash@{0}: On main: uncommitted PRODUCT_TRUTH §5.1 — held for review
```

The §5.1 "Olivia's agentic critical-date pipeline" section. User's call when ready.

### 4.2 Operator actions still owed

| Action | When | Why |
|---|---|---|
| **Apply C3 SQL migration** — `prisma/sql/02-add-voice-olivia-foundation.sql` | Before C4 routes write to voice/olivia tables | 9 tables. |
| **Apply V1 SQL migration** — `prisma/sql/03-add-valuation-foundation.sql` | Before V7 routes write to valuation tables | 6 tables. |
| `STUB_USER_ID` env var (Preview only, never Production) | Before testing C4 / V7 / V9 / O1 routes in Preview | Stub auth reads it. |
| `COMPOSIO_API_KEY` (Sensitive, Production + Preview) | Before O1 dispatch fires non-mock | Without this key, all dispatch returns `not_configured`. |
| `STRIPE_API_KEY`, `GITHUB_TOKEN`, `LINKEDIN_API_KEY`, `QUICKBOOKS_API_KEY`, `XERO_API_KEY`, `COMPANIES_HOUSE_API_KEY` (Sensitive, Production + Preview) | When Q3 ships, OR earlier for real-mode dev | Each integration mock-degrades when absent. |
| Twilio + ElevenLabs + Resend + Google/Outlook OAuth + Tavily + OpenAI keys | Per earlier handoff tables | Every external integration. **Sensitive, Production + Preview only.** |
| `match_calendar_memory()` PostgreSQL function | When calendar memory becomes user-facing | (W-014.) |
| **Q1 will surface:** `quantaraJson` column migration to `ValuationSubject` | After Q1 commit lands | New JSON extension column. |

### 4.3 Active weaknesses

| ID | What | Where to close |
|---|---|---|
| ~~W-001~~ | ~~No agentic tool dispatch~~ | **CLOSED in O1 rebuild (commit `7e4d356`).** |
| W-013 | UI Tailwind/styling fidelity gap | Track C polish |
| W-014 | `match_calendar_memory()` not installed in Supabase | Operator action above |
| W-015 | `lib/auth/session.ts` is a Clerk stub | Track F Session 18 |
| W-016 | `lib/system-alerts.ts` console-only stub | Future track |

### 4.4 Known future LTM ports flagged in O1

These are **not** weaknesses — they are scheduled ports per BUILD_SEQUENCE. Flagged here so future agents don't accidentally rebuild what's planned:

| Capability | LTM source | Port track |
|---|---|---|
| Cascade orchestrator | `D:\London-Tech-Map\src\lib\cascade\` (orchestrator + 8 providers including the cascade-aware `companies-house.ts`) | **Track G S19-S20** |
| 94 named agents | `D:\London-Tech-Map\src\lib\agents\impl\g1-001-...` (94 files) | **Track H S21-S23** |
| Stripe billing/subscription sync | `D:\London-Tech-Map\src\lib\stripe.ts` (uses prisma.userProfile.stripeCustomerId + PricingTier table) | **Post-Track F** (when OB ships paid plans) |

When those tracks land, the corresponding O1 wiring (tool array hook on `services/model-cascade.ts`, OB-original Stripe-rollup integration) gets reconnected to the ported LTM tech.

### 4.5 LTM tests still deferred

`src/lib/valuation/__tests__/e2e-pipeline.test.ts` + `security-rng.test.ts` — LTM never shipped the export modules they import.

---

## 5 · Repo locations

| Repo | Path | Status |
|---|---|---|
| **Olivia Brain (your working repo)** | `D:\Olivia Brain` | HEAD = post-this-handoff docs commit. Code HEAD = `7e4d356`. |
| **GitHub** | https://github.com/johndesautels1/Olivia-Brain | up to date with `main` |
| London Tech Map (LTM) | `D:\London-Tech-Map` | **READ-ONLY.** Copy components OUT. **AUDIT FIRST per gotcha §3.10.** |
| Studio Olivia prototypes | `D:\Studio-Olivia` | **REFERENCE ONLY.** |
| Clues Main vision docs | `D:\Clues Main` | Docs canonical; code stale. |
| Questionnaire engine | private GitHub `johndesautels1/clues-questionnaire-engine` | **AUDIT BEFORE Q1** — current truth for the 56-field questionnaire shape Q must mirror. |

---

## 6 · Absolute rules (do not violate)

1. **LTM is read-only. AUDIT FIRST per gotcha §3.10.** Port byte-for-byte when LTM is better; build OB-original only when LTM lacks the capability.
2. **No band-aids.** No `force-dynamic`, no `// hack`, no `@ts-ignore`, no Suspense workarounds. Find and fix the root cause.
3. **Verify before claiming done.** `npm test` and `npm run typecheck` must both pass before any commit.
4. **Lockfile in same commit as `package.json`.** Always.
5. **Commit + push together.** Vercel deploys from git.
6. **One concern per commit.** Mixed-concern commits forbidden.
7. **AbortSignal + timeout on every network call.** No exceptions.
8. **PII never enters spans, traces, or logs.** Only metadata.
9. **JSDoc on every exported symbol.**
10. **One task at a time** unless the user explicitly authorises a batch.
11. **NEVER run local builds** (`npm run build`, `next build`).
12. **All architecture and README docs commit alongside code changes** that change them.
13. **STOP means STOP.**

Full standing rules: `docs/BUILD_SEQUENCE.md` § "Standing rules carried into every session" + `~/CLAUDE.md`.

---

## 7 · Recent commit trail

```
<this handoff commit>  docs: end-of-batch handoff O1 rebuild — W-001 CLOSED via LTM-first audit + Q1 prep
7e4d356 feat(tools): Track O Session O1 rebuild — Composio dispatch + LTM-ported Companies House client + 6 net-new Q3 integrations (W-001 closed)
96975e4 Revert "feat(tools): Track O Session O1 — Composio dispatch + 7 read-only integrations (W-001 closed)"
dba6d1e Revert "docs: end-of-batch handoff O1 — W-001 CLOSED + Q1 prep"
462aa34 docs: end-of-batch handoff O1 — W-001 CLOSED + Q1 prep            (REVERTED — first attempt skipped LTM audit)
db2f0cf feat(tools): Track O Session O1 — Composio dispatch + 7 read-only integrations (W-001 closed)  (REVERTED — first attempt)
7cba95d docs: end-of-batch handoff V9 — Track V CLOSED + O1 prep
24781da feat(valuation): Track V Session V9 — War Room family + Deal Room + Acquisition Mirror + Equity Waterfall
ad956f3 docs: end-of-batch handoff S23-S27 — Track V 8/9 ✅ + V9 prep
edb195a feat(valuation): Track V Session V8 — ValuationWorkbench + 31 zone components
56c735e feat(valuation): Track V Session V7 — 9 valuation API routes + tier gate
b53abea feat(valuation): Track V Session V6 — agents 8-14 + Cristiano synergy bridge
4274f61 feat(valuation): Track V Session V5 — agents 1-7 + cascade-routed LLM adapter
6fbeb25 feat(valuation): Track V Session V4 — stochastic + sensitivity + war-room calendar
```

---

## 8 · Strategic priority (locked 2026-05-03, expanded 2026-05-07)

Founder direction: focus on **`clueslondon.com` (priority 1)** and **`cluesintelligence.com` (priority 2 — FLAGSHIP)**. cluesxscore (priority 3) and white-label Olivia (priority 4) follow.

**June 8 strategy.** London Tech Show on 2026-06-08 is a **demo target, not a full clueslondon ship.** Olivia Brain is the canonical implementation; LTM port-back happens in a separate post-OB session. Bicycle-wheel preserved.

**Pace.** Founder operates at ~4 sessions/day. **~56 sessions remain to ship priorities 1–4.**

**Tracks remaining:**

- **Next: Track Q (Quantara paragraphical intake, Q1–Q7).** Q1 = schema design.
- Track P (Deal Protection + gap closures, P1–P7).
- Track D (Studio ↔ brain wiring).
- Track E (voice input, S17).
- Track F (Clerk auth, S18) — closes W-015.
- **Track G (cascade orchestrator port, S19–S20)** — ports LTM's `lib/cascade/`. O1's tool wiring reconnects here.
- **Track H (agents consolidation, S21–S23)** — ports LTM's 94 named agents at `lib/agents/impl/`.
- Track I (multi-tenant + adaptive surface suppression, S24).
- Track J (vertical adapters, S25–S26).
- Track K (hardening + launch prep, S27–S29).
- Launch (S30) ~2026-06-02.
- Track N (Visual Manifestation, N1–N5).
- Track O O2–O5 (eval / voice-latency / citation-first RAG / avatar lip-sync).
- Track L (cluesintelligence Unification, post-clueslondon, ~10 sessions because Q built the engine).

Full session-by-session breakdown: `docs/BUILD_SEQUENCE.md`.

---

## 9 · Memories you'll find auto-loaded

| Memory | What it locks |
|---|---|
| `feedback_world_class_standard` | 12-row standard table; no band-aids; root-cause every failure. |
| `feedback_olivia_brain_batch_session_pattern` | OB-only batch mode when user pre-authorises. |
| `feedback_olivia_brain_end_of_batch_handoff_protocol` | At end of each OB batch, ANNOUNCE "preparing the handoff" + update HANDOFF.md + push as the LAST commit. |
| `feedback_commit_push_no_prompt` | Every code fix is `git add && commit && push` in the same turn. |
| `project_ltm_types_no_speculative_generalization` | Don't add LTM Prisma models to OB. Don't stub LTM-specific routes. |
| `project_track_v_ltm_valuation_port` | Track V scope: 9 sessions, ~93 files. **CLOSED at V9.** |
| `project_olivia_surface_suppression` | When Olivia embeds in a host that already provides a surface, Olivia hides her own. |
| `feedback_deadline_privacy` | `UserCompanyDeadline` is OWNED by `UserCompanyDeadline`. |
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
git log --oneline -10                         # confirm HEAD is the post-O1-rebuild docs commit
```

Then in Claude Code:

1. **Read every doc in §0 above. Do not skip.** Especially read SESSION_LOG Part 36 to understand the LTM-audit lesson.
2. Read `docs/BUILD_SEQUENCE.md` Track Q row Q1 (~line 148) for Session 30's deliverable + exit criterion.
3. **Run the LTM audit per gotcha §3.10:** `ls D:/London-Tech-Map/src/lib/`, grep for `quantara` / `questionnaire` / `intake` / `founder-intake`, inspect any candidate ports, read `johndesautels1/clues-questionnaire-engine` repo for canonical 56-field shapes.
4. Decide per the bicycle-wheel rule: port byte-for-byte where LTM has it; build OB-original only where LTM lacks it. Document the audit + decision in the Q1 commit message.
5. Confirm Vercel build is green on the post-`7e4d356` deploy.
6. Begin Session 30: scaffold (or PORT) `src/lib/quantara/{schema,sections,field-mapping}.ts`, add the `quantaraJson` Prisma column + migration, write the schema + round-trip tests.

**Standing rule reminder:** stop after Q1's deliverable lands. Q2-Q7 each need their own user pre-authorisation before chaining. Update docs alongside the code commit.
