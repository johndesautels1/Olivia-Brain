# OLIVIA BRAIN — NEXT AGENT HANDOFF

> **STOP. Before any tool call beyond `git status`, you MUST read every line of every doc in §0 below. Not skim. Not paraphrase. Not substitute prior assumptions. EVERY LINE.**
>
> The previous agent in this conversation skipped readmes and built net-new wrappers when LTM already had production-grade tech. Their O1 attempt was reverted (commits `db2f0cf` + `462aa34` → reverted at `dba6d1e` + `96975e4`) and rebuilt from scratch (`7e4d356`) only after the user caught it. Repeat that failure and your work gets reverted.
>
> The user's exact words: *"no matter how many readme's i write you simply dont read them. ... the entire app build purpose is to copy over from our other sister apps presently london tech map being the big one all their key technologies and then integrate them into olivia brain. When their tech is better we replace that part of olivia brain that is inferior and when their tech is inferior we use ours we borrow what we need from those other apps to build state of the art olivia code base olivia brain."*
>
> Read this handoff to the bottom. Then read the docs in §0. Then audit LTM. Then plan. Then act.

---

## Repo locations — full paths

| Where | Full path |
|---|---|
| **GitHub** | https://github.com/johndesautels1/Olivia-Brain |
| **Local working dir** | `D:\Olivia Brain` |
| **Default branch** | `main` |
| **Code HEAD (Q1)** | `75c3b5d` (Q1 — 56-field Quantara schema) |
| **Docs HEAD before this handoff commit** | `5f4ceb0` (Q1 SESSION_LOG + BUILD_SEQUENCE) |
| **HEAD after this handoff commit** | will be the `git push` immediately after this doc lands |
| **LTM repo (READ-ONLY — port FROM, never edit)** | `D:\London-Tech-Map` |
| **LTM source-of-truth for Quantara fields** | `D:\London-Tech-Map\public\assets\founder-valuation-form.html` (1762 LOC HTML mockup, never built into LTM React) + `D:\London-Tech-Map\docs\TIER_SYSTEM.md` §"56-FIELD VALUATION INTAKE FORM" |
| **Studio Olivia prototypes (REFERENCE ONLY)** | `D:\Studio-Olivia` |
| **Clues Main vision docs** | `D:\Clues Main` |
| **Questionnaire engine repo (canonical for Track L cluesintelligence, NOT Track Q)** | https://github.com/johndesautels1/clues-questionnaire-engine (private). 2,486 RELOCATION questions across 10 life domains + 12 Bayesian dimensions. **Different app from Quantara** — see § 1 + gotcha § 3.12. |
| **Other CLUES product repos** | `clues-property-search`, `Heart-Recovery-Calender`, `lifescore-study` (per `00_PRODUCT_TRUTH.md`) |

**Updated:** 2026-05-07 (end of batch — Q1 — Track Q 1/7 ✅)
**State:** Track Q Session Q1 ✅ (56-field Quantara schema canonicalized in OB; LTM stays read-only). Track O Session O1 ✅. Track V remains 9/9 ✅. Tests **427/427 across 28 suites** (was 385/26 at O1 close — +42 new Quantara tests). Typecheck clean.
**Next session:** Track Q Session Q2 — Form UI (non-metamorphic baseline). Port the LTM `founder-valuation-form.html` layout to React + Aurum/Aether tokens (replacing the cyan branding); render all 56 fields; live data-completeness % bar; "Field N of 56" progress chip; save to `ValuationSubject` works.

---

## 0 · MANDATORY READING — read every line of every doc on this list

**THIS IS NOT OPTIONAL.** The user's complaint is that prior agents skipped readmes and built the wrong thing. The list below is exhaustive. Read every line. Do not skim. Do not paraphrase. Do not substitute prior assumptions.

After reading you will run an LTM audit (gotcha §3.10) before any new code.

| # | Path | Lines | What it locks |
|---|---|---|---|
| 1 | `~/CLAUDE.md` (`C:\Users\broke\CLAUDE.md`) | 262 | Master rules. UserCompanyDeadline privacy contract. "STOP means STOP." No-local-builds. Minimize-tool-calls. LTM read-only boundary. NEVER set secret env vars to "All Environments". |
| 2 | `~/.claude/projects/C--Users-broke/memory/MEMORY.md` + every memory file it indexes | 16 + indexed files | Auto-loaded user/feedback/project/reference memory. Load-bearing for Q1: `feedback_world_class_standard`, `feedback_olivia_brain_batch_session_pattern`, `feedback_olivia_brain_end_of_batch_handoff_protocol`, `feedback_commit_push_no_prompt`, `project_ltm_types_no_speculative_generalization`. |
| 3 | `D:\Olivia Brain\HANDOFF.md` (this file) | 412 | Read in full. |
| 4 | `D:\Olivia Brain\README.md` | 283 | Repo-level overview, Protected Repo Boundaries. |
| 5 | `D:\Olivia Brain\BATTLE_PLAN.md` | 366 | Active battle plan. |
| 6 | `D:\Olivia Brain\OLIVIA_BUILD_STATE.md` | 198 | Build state snapshot. |
| 7 | `D:\Olivia Brain\docs\OLIVIA_NORTH_STAR.md` | 94 | THE single question every commit must answer YES to. Locked 2026-05-07. |
| 8 | `D:\Olivia Brain\docs\00_PRODUCT_TRUTH.md` | 197 | **Eternal source of truth.** Bicycle-wheel architecture. Product hierarchy 1–7. "All data passes through Olivia." |
| 9 | `D:\Olivia Brain\docs\01_UI_DESIGN_SYSTEM.md` | 631 | Universal design language. Aurum + Aether tokens. LCH color. WCAG 2.2 AA + APCA. Vercel rules. |
| 10 | `D:\Olivia Brain\docs\02_COMPETITIVE_FEATURE_MATRIX.md` | 222 | Competitive analysis — what we steal, what we reject. |
| 11 | `D:\Olivia Brain\docs\03_BRAIN_ENRICHMENT_ENGINE.md` | 354 | Auto-enrichment primitive. Bidirectional event pipeline. |
| 12 | `D:\Olivia Brain\docs\04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md` | 244 | Flagship plan — questionnaire-engine fold-in. **Critical for Q track.** |
| 13 | `D:\Olivia Brain\docs\BOOTSTRAP.md` | 175 | Implementation context. **The three sources** (OB / LTM / Studio Olivia). Sacred files list. Constraints. |
| 14 | `D:\Olivia Brain\docs\BUILD_SEQUENCE.md` | 291 | Session-by-session plan. Find row `**Q1**` for the next session. |
| 15 | `D:\Olivia Brain\docs\CLUES_INTELLIGENCE_ARCHITECTURE.md` | 590 | cluesintelligence flagship architecture. **Read before Q track because Q is also the cluesintelligence questionnaire primitive.** |
| 16 | `D:\Olivia Brain\docs\STUDIO_PORT_MANIFEST.md` | 732 | File-by-file port inventory — § J (Map), § L (Calendar), § M (Valuation V1–V9 / War Room family). Use the same shape for any new port section. |
| 17 | `D:\Olivia Brain\docs\MERGE_PLAN.md` | 509 | Bridge contract. Persona model. Deployment topology. |
| 18 | `D:\Olivia Brain\docs\MERGE_INVENTORY.md` | 727 | 233-row capability matrix across the three sources. **Consult by feature, not bulk-read.** |
| 19 | `D:\Olivia Brain\docs\UNIVERSAL_ARCHITECTURE_ANALYSIS.md` | 733 | Universal architecture analysis. |
| 20 | `D:\Olivia Brain\docs\HEYGEN_LTM_CONFIG.md` | 503 | LiveAvatar must-preserve contracts. Don't change naively. |
| 21 | `D:\Olivia Brain\docs\API_INTEGRATION_BACKLOG.md` | 206 | 25-API integration backlog. |
| 22 | `D:\Olivia Brain\docs\GRAPH_PERSISTENCE_DESIGN.md` | 180 | Graph persistence design. |
| 23 | `D:\Olivia Brain\docs\STUDIO_OLIVIA_DESIGN.md` | 349 | UI north star derived from the GrandMaster prototype. |
| 24 | `D:\Olivia Brain\docs\final-stack.md` | 141 | Final stack. |
| 25 | `D:\Olivia Brain\docs\london-calendar-adapter-contract.md` | 274 | London calendar adapter contract. |
| 26 | `D:\Olivia Brain\docs\olivia-core-architecture.md` | 135 | Olivia core architecture. |
| 27 | `D:\Olivia Brain\docs\SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` | 1671 | **READ PARTS 30–37** at minimum (V4–V9 + O1 + Q1). Earlier parts are background. |

**Total: ~11,000 lines.** At ~500 lines/min reading speed that's ~22 minutes. **Do it.**

### How to verify you actually read them

For each doc, before any tool call beyond `git status`, internally confirm:

- [ ] You read the FIRST line.
- [ ] You read the LAST line.
- [ ] You read at least 5 lines from the MIDDLE you couldn't have predicted from the title.

If any of those fails, go back and read the file again. **The user has explicitly stated that prior agents skip these. Don't be one of them.**

---

## 1 · The bicycle-wheel rule (LTM-first audit) — READ THIS TWICE

Quoting the user verbatim:

> *"the entire app build purpose is to copy over from our other sister apps presently london tech map being the big one all their key technologies and then integrate them into olivia brain. When their tech is better we replace that part of olivia brain that is inferior and when their tech is inferior we use ours we borrow what we need from those other apps to build state of the art olivia code base olivia brain."*

**Before scaffolding ANY new infrastructure in OB:**

1. `ls D:\London-Tech-Map\src\lib\*\` — full LTM lib inventory.
2. `grep` LTM source for the capability keyword (e.g. `composio`, `quantara`, `questionnaire`, `intake`, etc.).
3. Read every candidate file LTM has.
4. Decide:
   - **LTM has a better version → PORT byte-for-byte** via PowerShell `Copy-Item -LiteralPath` (V9 pattern). Wrappers in OB are thin and delegate.
   - **LTM has an inferior version OR a different concern** → keep / build OB-original. Document the audit + decision in the commit message.
   - **LTM lacks it entirely** → OB-original is correct. Document why in commit message + handoff.
5. **Failure to audit = the session gets reverted.** The user has committed to this. Non-negotiable.

**Two prior failures both fixed in-session — for reference:**

- The O1 attempt skipped step 1 and built a fresh Companies House client when LTM had a 358-line production one (`lib/companies-house/client.ts`). Cost: revert + rebuild.
- The Q1 first plan-presentation read the wrong canonical source — treated the private `clues-questionnaire-engine` repo as the authority for the 56-field Quantara intake. **It is not.** The user corrected: *"the clues questionnaire engine and its 2500 questions plus or minus has nothing to do with london-tech-map and its 56 critical financial questions two different apps two different purposes we are training olivia on both."* The audit was retargeted to LTM `D:\London-Tech-Map\public\assets\founder-valuation-form.html` BEFORE any code shipped. **Cost: zero — caught at the plan stage.** See gotcha § 3.12 below.

---

## 2 · Resume point — Session 31 = Track Q Session Q2

Per `D:\Olivia Brain\docs\BUILD_SEQUENCE.md` Track Q row Q2 (~line 149):

> **Q2 — Form UI (non-metamorphic baseline).** Port the Quantara HTML wireframe layout (3-pane: sidebar progress + main form + Olivia copilot) to React + Aurum/Aether tokens (no cyan branding). Build form with all 56 fields rendered. Live data-completeness % bar. "Field N of 56" progress chip.
>
> **Exit criterion:** `/founder-intake` route renders the full 56-field form. Save to `ValuationSubject` works. Typecheck clean.

### What Q1 shipped (HEAD = `75c3b5d` for code, docs at `5f4ceb0` + this handoff)

- **`src/lib/quantara/`** (8 files) — types, sections, schema, field-mapping, index, 2 test suites. 56 `QuantaraFieldDefinition` records keyed by `f1`..`f56` with immutable `field_map_key` (`QUANT_<FIN|CAP|FND|CRR|TRC|MKT|IPM|TEM|RSK|GRW|PRJ|STR>_NNN`), Zod schemas, weights, section + investor-class relevance.
- **12-section catalog** (Core Financials 14 · Capital Structure 4 · Funding History 3 · Current Round 2 · Traction 6 · Market 4 · IP & Moat 6 · Team 5 · Risk 3 · Growth Levers 4 · Projections 4 · Strategic 1 = **56 ✓**).
- **Destination split** — 13 fields metric-wrapped into existing engine JSON columns (engine bridge from Track V V2 untouched), 36 fields land in new `quantaraJson` column on `ValuationSubject`.
- **Round-trip helpers** — `quantaraToValuationSubject`, `valuationSubjectToQuantara`, `mergeQuantaraIntoSubject` (preserves untouched JSON-column subkeys for partial-save flows).
- **Prisma schema** — added `quantaraJson Json?` column with JSDoc-listed subkeys.
- **SQL migration** — `prisma/sql/04-add-quantara-foundation.sql` (single additive `ALTER TABLE`).
- **Tests** — 42 new (29 schema + 13 round-trip). All 427/427 passing across 28 suites. Typecheck clean.

### Before scaffolding Q2 — REQUIRED LTM AUDIT

| Source to inspect | Why |
|---|---|
| `D:\London-Tech-Map\public\assets\founder-valuation-form.html` (1762 LOC) | **Canonical visual + structural reference for the form.** The HTML mockup is design-locked but never built into LTM React — OB is canonical implementation per June-8-demo strategy. Q2 mirrors the 3-pane layout (left sidebar progress / main form / right Olivia + valuation preview), the section dividers, the section completeness chips. **REPLACE the cyan-400 brand accent** with Aurum gold per `01_UI_DESIGN_SYSTEM.md`. |
| `D:\Olivia Brain\src\lib\quantara/*` | The Q1 schema + sections + field-mapping. Q2 imports these — do not redefine. |
| `D:\Olivia Brain\src\components\workspace/*` (S14 shell) + `src\components\primitives/*` (S15 primitives) | The Aurum/Aether shell and primitives Q2 mounts inside. AvatarOrb + Badge + CompletionRing etc. are already shipped — reuse, do not rebuild. |
| `D:\Olivia Brain\src\styles\tokens.css` | The canonical Aurum + Aether token set Q2 styling consumes. |

**Expected outcomes:**

- Q2 builds NEW React components (no port — LTM's HTML is mockup-only). Components live in `src/components/quantara/` mirroring the LTM section structure.
- The `/founder-intake` route is NEW under `src/app/founder-intake/`.
- Save flow uses Prisma against the existing `ValuationSubject` model + the `quantaraJson` column from Q1.

### Operator actions still owed (Q1)

| Action | When | Why |
|---|---|---|
| **Apply Q1 SQL migration** — `prisma/sql/04-add-quantara-foundation.sql` | Before Q2 routes write to `ValuationSubject.quantaraJson` | Adds the new column. Single `ALTER TABLE`. Operator path: paste into Supabase SQL Editor + Run (Option B, identical to V1's `03-add-valuation-foundation.sql`). |

---

## 3 · Gotchas — every one bit a previous session

### 3.1 LTM is not always self-consistent

`e2e-pipeline.test.ts` and `security-rng.test.ts` in LTM `__tests__/` reference `src/lib/export/{csv-json-export, timeline-export, sanitize}` modules LTM never shipped. **Do not stub.** `session2.test.ts` is a top-level imperative dev script — wrap in `describe`/`it` if you ever port it.

### 3.2 Generated Prisma client can disagree with `schema.prisma`

`node_modules/.prisma/client/index.d.ts` may include columns the live schema doesn't have. **Trust `schema.prisma`.** Especially relevant for Q1's `quantaraJson` addition.

### 3.3 PowerShell + bracketed path segments

Dynamic Next.js segments like `src/app/api/valuation/[runId]` need **`-LiteralPath`** in PowerShell `Copy-Item` / `Get-Content` / `Set-Content`. Without it the brackets get treated as a glob.

### 3.4 Next.js 16 async route params

```ts
// ❌ Next 15 / LTM shape
export async function GET(req: NextRequest, { params }: { params: { runId: string } }) {
  const { runId } = params;
}

// ✅ Next 16 contract
export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
}
```

### 3.5 Bicycle-wheel boundary on agents and routes

LTM-only Prisma references (`prisma.organization`, `prisma.document`, `prisma.userProfile`, `prisma.analysisResult`) **must not be added speculatively** to OB. Push out via injection callback, or return null with a comment naming the future track.

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

### 3.10 LTM AUDIT IS MANDATORY before scaffolding any new infrastructure (O1 lesson)

**The previous agent's O1 first attempt was reverted because it skipped this step.** Before any new `src/lib/<subsystem>/` directory:

1. `ls D:/London-Tech-Map/src/lib/*/` — full LTM lib inventory.
2. `grep` LTM source for the capability keyword.
3. Read any candidate LTM file (`lib/<subsystem>/`, `lib/services/<subsystem>.ts`, `lib/cascade/providers/<subsystem>.ts`).
4. Decide per the bicycle-wheel rule (§1).
5. **Document the audit + decision in the commit message.** Use the table format from SESSION_LOG Part 36.

Failure to audit = revert. Non-negotiable.

### 3.11 Pre-existing OB scaffolding can change scope (O1)

The BUILD_SEQUENCE row's wording can understate what's already built in OB. Inventory both LTM AND OB before building.

### 3.12 The `clues-questionnaire-engine` repo is NOT the canonical for Track Q (Q1 lesson)

**Track Q (Quantara) and `clues-questionnaire-engine` are different apps.** This caused a wrong-target audit at Q1's first plan-presentation:

- **Quantara** (this repo, `src/lib/quantara/`) = the **56-field founder-valuation financial intake form** for `clueslondon.com`. Source-of-truth: `D:\London-Tech-Map\public\assets\founder-valuation-form.html` (1762 LOC mockup) + `D:\London-Tech-Map\docs\TIER_SYSTEM.md` §"56-FIELD VALUATION INTAKE FORM". Feeds the LTM-ported valuation engine.
- **`clues-questionnaire-engine`** (private GitHub) = the **2,486-question relocation questionnaire** for `cluesintelligence.com`. 10 life-domain sections, 12 Bayesian scoring dimensions. Feeds the Track L (cluesintelligence) flagship — not Track Q.

The earlier handoff text framed `clues-questionnaire-engine` as "canonical for Q track" — that was wrong. Track L will reuse Quantara's primitives (the `field_map_key` pattern, Zod schema discipline, section catalog), but the field SET is different by orders of magnitude. The user's framing 2026-05-07 is canonical: *"two different apps two different purposes we are training olivia on both."*

**Implication for future agents:** when a Q-track session asks for a "questionnaire primitive," do not auto-port from `clues-questionnaire-engine` — its 2,486 relocation questions are not the LTM founder-valuation 56. Audit the LTM HTML mockup + `TIER_SYSTEM.md` first.

---

## 4 · Outstanding state

### 4.1 Stash held for review

```
stash@{0}: On main: uncommitted PRODUCT_TRUTH §5.1 — held for review
```

The §5.1 "Olivia's agentic critical-date pipeline" section. User's call when ready. **Do not commit it without checking with the user.**

### 4.2 Operator actions still owed

| Action | When | Why |
|---|---|---|
| **Apply Q1 SQL migration** — `prisma/sql/04-add-quantara-foundation.sql` | Before Q2 routes write to `ValuationSubject.quantaraJson` | Single additive `ALTER TABLE` adding the `quantaraJson JSONB` column. |
| **Apply C3 SQL migration** — `prisma/sql/02-add-voice-olivia-foundation.sql` | Before C4 routes write to voice/olivia tables | 9 tables. |
| **Apply V1 SQL migration** — `prisma/sql/03-add-valuation-foundation.sql` | Before V7 routes write to valuation tables | 6 tables. |
| `STUB_USER_ID` env var (Preview only, never Production) | Before testing C4 / V7 / V9 / O1 routes in Preview | Stub auth reads it. |
| `COMPOSIO_API_KEY` (Sensitive, Production + Preview) | Before O1 dispatch fires non-mock | Without this key, all dispatch returns `not_configured`. |
| `STRIPE_API_KEY`, `GITHUB_TOKEN`, `LINKEDIN_API_KEY`, `QUICKBOOKS_API_KEY`, `XERO_API_KEY`, `COMPANIES_HOUSE_API_KEY` (Sensitive, Production + Preview) | When Q3 ships, OR earlier for real-mode dev | Each integration mock-degrades when absent. |
| Twilio + ElevenLabs + Resend + Google/Outlook OAuth + Tavily + OpenAI keys | Per earlier handoff tables | Every external integration. **Sensitive, Production + Preview only.** |
| `match_calendar_memory()` PostgreSQL function | When calendar memory becomes user-facing | (W-014.) |

### 4.3 Active weaknesses

| ID | What | Where to close |
|---|---|---|
| ~~W-001~~ | ~~No agentic tool dispatch~~ | **CLOSED in O1 rebuild (commit `7e4d356`).** |
| W-013 | UI Tailwind/styling fidelity gap | Track C polish |
| W-014 | `match_calendar_memory()` not installed in Supabase | Operator action above |
| W-015 | `lib/auth/session.ts` is a Clerk stub | Track F Session 18 |
| W-016 | `lib/system-alerts.ts` console-only stub | Future track |

### 4.4 Known future LTM ports flagged in O1

These are **not** weaknesses — they are scheduled ports per BUILD_SEQUENCE. Flagged so future agents don't accidentally rebuild what's planned:

| Capability | LTM source | Port track |
|---|---|---|
| Cascade orchestrator | `D:\London-Tech-Map\src\lib\cascade\` (orchestrator + 8 providers including the cascade-aware `companies-house.ts`) | **Track G S19-S20** |
| 94 named agents | `D:\London-Tech-Map\src\lib\agents\impl\g1-001-...` (94 files) | **Track H S21-S23** |
| Stripe billing/subscription sync | `D:\London-Tech-Map\src\lib\stripe.ts` | **Post-Track F** (when OB ships paid plans) |

When those tracks land, the corresponding O1 wiring gets reconnected to the ported LTM tech.

### 4.5 LTM tests still deferred

`src/lib/valuation/__tests__/e2e-pipeline.test.ts` + `security-rng.test.ts` — LTM never shipped the export modules they import.

---

## 5 · Repo locations (full)

| Repo | Path | Status |
|---|---|---|
| **Olivia Brain (your working repo)** | `D:\Olivia Brain` | HEAD = post-this-handoff docs commit. Code HEAD = `7e4d356`. |
| **GitHub** | https://github.com/johndesautels1/Olivia-Brain | up to date with `main` |
| **London Tech Map (LTM)** | `D:\London-Tech-Map` | **READ-ONLY.** Copy components OUT. **AUDIT FIRST per §1 + §3.10.** |
| **Studio Olivia prototypes** | `D:\Studio-Olivia` | **REFERENCE ONLY.** |
| **Clues Main vision docs** | `D:\Clues Main` | Docs canonical; code stale. |
| **Questionnaire engine** | https://github.com/johndesautels1/clues-questionnaire-engine | **AUDIT BEFORE Q1** — current truth for the 56-field shape. |

---

## 6 · Absolute rules (do not violate)

1. **LTM is read-only. AUDIT FIRST per §1 + §3.10.** Port byte-for-byte when LTM is better; build OB-original only when LTM lacks the capability.
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
12. **All architecture and README docs commit alongside code changes.**
13. **STOP means STOP.**

Full standing rules: `docs/BUILD_SEQUENCE.md` § "Standing rules carried into every session" + `~/CLAUDE.md`.

---

## 7 · Recent commit trail

```
<this handoff commit>  docs: end-of-batch handoff Q1 — Track Q 1/7 ✅ + Q2 prep
5f4ceb0 docs: Track Q Session Q1 — SESSION_LOG Part 37 + BUILD_SEQUENCE Q1 ✅
75c3b5d feat(quantara): Track Q Session Q1 — 56-field schema + ValuationSubject round-trip
189c675 docs: handoff — mandatory readme list (27 docs, ~11K lines) + LTM-first command + full repo paths
7e183a4 docs: end-of-batch handoff O1 rebuild — W-001 CLOSED via LTM-first audit + Q1 prep
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
```

---

## 8 · Strategic priority (locked 2026-05-03, expanded 2026-05-07)

Founder direction: **`clueslondon.com` (priority 1)** + **`cluesintelligence.com` (priority 2 — FLAGSHIP)**. cluesxscore (priority 3) and white-label Olivia (priority 4) follow.

**June 8 strategy.** London Tech Show on 2026-06-08 is a **demo target, not a full clueslondon ship.** Olivia Brain is the canonical implementation; LTM port-back happens in a separate post-OB session.

**Pace.** ~4 sessions/day. **~55 sessions remain to ship priorities 1–4** (was ~56 at O1 close; -1 for Q1).

**Tracks remaining:**

- **Next: Track Q (Quantara, Q2–Q7).** Q1 ✅ closed. Q2 = form UI.
- Track P (Deal Protection + gap closures, P1–P7).
- Track D (Studio ↔ brain wiring).
- Track E (voice input, S17).
- Track F (Clerk auth, S18) — closes W-015.
- **Track G (cascade orchestrator port, S19–S20)** — ports LTM `lib/cascade/`. O1 reconnects here.
- **Track H (agents consolidation, S21–S23)** — ports LTM's 94 named agents.
- Track I (multi-tenant + adaptive surface suppression, S24).
- Track J (vertical adapters, S25–S26).
- Track K (hardening + launch prep, S27–S29).
- Launch (S30) ~2026-06-02.
- Track N (Visual Manifestation, N1–N5).
- Track O O2–O5.
- Track L (cluesintelligence Unification, post-clueslondon, ~10 sessions because Q built the engine).

Full session-by-session breakdown: `D:\Olivia Brain\docs\BUILD_SEQUENCE.md`.

---

## 9 · Memories you'll find auto-loaded

| Memory | What it locks |
|---|---|
| `feedback_world_class_standard` | 12-row standard table; no band-aids; root-cause every failure. |
| `feedback_olivia_brain_batch_session_pattern` | OB-only batch mode when user pre-authorises. |
| `feedback_olivia_brain_end_of_batch_handoff_protocol` | At end of each OB batch, ANNOUNCE "preparing the handoff" + update HANDOFF.md + push as the LAST commit. |
| `feedback_commit_push_no_prompt` | Every code fix is `git add && commit && push` in the same turn. |
| `project_ltm_types_no_speculative_generalization` | Don't add LTM Prisma models to OB. Don't stub LTM-specific routes. |
| `project_track_v_ltm_valuation_port` | Track V scope — CLOSED at V9. |
| `project_olivia_surface_suppression` | When Olivia embeds in a host with its own surface, hide hers. |
| `feedback_deadline_privacy` | `UserCompanyDeadline` is OWNED by `UserCompanyDeadline`. |
| `feedback_4_sessions_per_day_pace` | ~4 sessions/day. |
| `reference_olivia_north_star` | Pointer to `OLIVIA_NORTH_STAR.md`. |
| `reference_olivia_clues_product_truth` | Pointer to `00_PRODUCT_TRUTH.md`. |
| `reference_olivia_ui_design_system` | Pointer to `01_UI_DESIGN_SYSTEM.md`. |
| `reference_olivia_brain_enrichment_engine` | Pointers to `03_BRAIN_ENRICHMENT_ENGINE.md` + `04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md`. |
| `reference_olivia_brain_docs` | Olivia Brain canonical doc set + read order. |

---

## 10 · Start sequence (next session) — MANDATORY ORDER

```bash
cd "D:\Olivia Brain"
git status                                    # should report 1 stash, working tree clean
git log --oneline -10                         # HEAD is the post-Q1 handoff commit
```

Then in Claude Code, in this order — no skipping:

1. **Read every line of every doc in §0.** All 27 entries. ~11,000 lines. ~22 minutes. **The user has explicitly stated that prior agents skip these. Don't be one of them.**
2. **Internally answer the bicycle-wheel question for Q2:** what does the LTM `founder-valuation-form.html` mockup look like (3-pane layout, section dividers, completeness chips, "Olivia Online" status, "Let Olivia complete the rest" button, live valuation preview)? Which OB primitives (`AvatarOrb`, `Badge`, `CompletionRing`, `WorkspaceShell` from S14/S15) does Q2 mount inside? What Aurum/Aether tokens replace the form's cyan-400?
3. **Run the LTM audit per §1 + §3.10.** Q2 builds NEW React (no port — LTM mockup is HTML-only). Document: "LTM has the design, OB builds the implementation." Match the section structure of `founder-valuation-form.html` byte-for-byte at the layout level; replace the brand palette per `01_UI_DESIGN_SYSTEM.md`.
4. **Re-read § 3.12 of this file.** The `clues-questionnaire-engine` is for Track L, not Track Q. Don't confuse the two.
5. Confirm Vercel build is green on the post-`75c3b5d` deploy.
6. **Confirm Q1 SQL migration applied to Supabase** — check `valuation_subjects` table for the new `quantaraJson` column. If absent, apply `prisma/sql/04-add-quantara-foundation.sql` first; Q2 routes need the column.
7. Begin Session 31: scaffold `src/components/quantara/` (12 section components mirroring the LTM form's section structure) + `src/app/founder-intake/page.tsx` route + save flow against `ValuationSubject` using the round-trip helpers from `src/lib/quantara/field-mapping.ts`. Live data-completeness % bar driven off `QUANTARA_FIELDS` weights. "Field N of 56" progress chip. Aurum/Aether tokens, no raw hex.
8. Typecheck + tests gate before commit.
9. Commit + push as one feat commit. Then end-of-batch handoff per the protocol (announce, update HANDOFF.md, last commit of the batch).

**Standing rule reminder:** stop after Q2's deliverable lands. Q3-Q7 each need their own user pre-authorisation before chaining.

**The user's standard:** *"It sounds to me like you don't give a flying fuck and do a half ass job"* — that was a prior agent's review for skipping the audit. Don't earn it.
