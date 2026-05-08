# Olivia Brain — Handoff to next agent

> **Last updated:** 2026-05-08 — end of Q5 → P2 batch.
> **HEAD:** `757933f` on `main`.
> **Test gate:** 697/697 across 52 suites. Typecheck clean.

---

## § 0. The repo and where you are

**GitHub:** https://github.com/johndesautels1/Olivia-Brain
**Branch:** `main` — all work pushed; nothing uncommitted.
**Clone command (if you don't already have it on disk):**

```
git clone https://github.com/johndesautels1/Olivia-Brain.git "D:\Olivia Brain"
```

**Local path:** `D:\Olivia Brain` (Windows; OB development is Windows-native).

**Sister repos referenced from OB:**

| Path | Repo | Status |
|---|---|---|
| `D:\London-Tech-Map` | https://github.com/johndesautels1/london-tech-map | **READ-ONLY from OB**. Confirm URL with the founder before cloning — don't guess from training data. |
| `D:\Studio-Olivia` | local prototypes (not a git repo) | reference only |
| `D:\Clues Main` | https://github.com/johndesautels1/Clues-Main | docs canonical, code stale per `04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md` |

**Verify on arrival:** run `git log --oneline -5` from `D:\Olivia Brain`. The top commit must be `757933f` (P2 docs). If it isn't, `git pull origin main`. Run `npm test` and `npm run typecheck` — both must come back green (697/697 + clean) before you write a single new line.

---

## § 1. Read the READMEs. Yes, every line. Yes, it takes time.

You cannot honestly serve this codebase without doing this. Past agents have skipped reading and shipped code that ignored the bicycle-wheel architecture, miscategorised products, painted with raw hex, or invented adapters that don't exist. The founder has caught it 30+ times.

Read in this exact order. Don't skim. Don't paraphrase. Don't rely on what training data tells you the doc says — read what's on disk **today**.

### Mandatory pre-coding read order

1. **`docs/OLIVIA_NORTH_STAR.md`** — the single question every commit must answer **yes** to. Six product surfaces, three modes (embedded / gateway / standalone), bicycle-wheel hub. Locked 2026-05-07. Read this **before anything else**, every session.
2. **`docs/00_PRODUCT_TRUTH.md`** — eternal source of truth for the Olivia / CLUES product universe. Bicycle-wheel architecture, priority order, what each product actually is. Non-negotiable. Read this **second**, every session.
3. **`docs/01_UI_DESIGN_SYSTEM.md`** — Aurum gold + Aether indigo, LCH color space, no raw hex in components, WCAG 2.2 AA + APCA, modular workspace, multi-agent visualization. Read this **before any UI work**.
4. **`docs/02_COMPETITIVE_FEATURE_MATRIX.md`** — what we steal from 22 surveyed competitors and what we explicitly reject. Skim if you're not doing UI work; read in full if you are.
5. **`docs/03_BRAIN_ENRICHMENT_ENGINE.md`** — universal auto-enrichment primitive. Read this **before any cross-spoke or multi-app sync work**.
6. **`docs/04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md`** — flagship architecture. Read **before any cluesintelligence / questionnaire-engine work**. Subject-to-change banner inline; respect it.
7. **`docs/BOOTSTRAP.md`** — implementation context, sacred files, doc reading order, standing constraints.
8. **`docs/BUILD_SEQUENCE.md`** — session-by-session plan. Find the row marked next-up (currently **P3**) and read its exit criteria + "DEFERRED" / "DONE" caveats on prior rows.
9. **`docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md`** — last 4 Parts (42 → 45) cover Q6, Q7, P1, P2 in detail. The decision-trail subsections matter; the build-context isn't reproducible from code alone.
10. **`README.md`** (repo root) — capability domain map, weakness backlog (W-001 through W-017), architecture quick-ref, protected-repo boundaries.

**Founder-level memories** (already loaded into your context if you're using the same harness): user-level notes are in `~/.claude/projects/C--Users-broke/memory/MEMORY.md`. The protocols there carry standing weight — print SQL migrations inline as you create them, never revert without permission, batch session pattern only with explicit "build X to Y" pre-authorisation, etc.

If you finish reading and your mental model still has "Olivia is a chat assistant," "lifescore is a top-level product," "the GrandMaster Studio is Olivia's homepage," or "Track Q is still open" — read again. You missed it.

---

## § 2. Where to resume coding

**Next session: Track P Session P3 — Term sheet parser + analyze API.** Per `docs/BUILD_SEQUENCE.md` Track P row P3:

> P3 | Term sheet parser + analyze API. New `src/lib/deal-protection/parser.ts` (text + PDF → structured `TermSheetTerms` shape per Python `parser.py` design). New API `POST /api/deal-protection/analyze` (parse → clause-intel → smart-score → optional quant via existing V3 engine in scenario mode → `DealAnalysis` record persisted).
> Exit: end-to-end paste term sheet text → returns `DealRiskReport` with smart score + clause analyses + critical issues + walk-away reasons. Typecheck clean.

**Concretely, P3 needs:**

- `src/lib/deal-protection/parser.ts` — accepts term-sheet text (PDF parsing is a stretch goal; ship text-first); returns a structured `TermSheetTerms` shape with extracted clauses (one entry per clause boundary). Cascade-driven extraction is fine; the existing `runModelCascade` with `intent: "operations"` handles it.
- `src/app/api/deal-protection/analyze/route.ts` — POST. Input: `{ subjectId, termSheetText }`. Pipeline: parser → `classifyClauses` (P2) → aggregate clause toxicity into a 0-100 `smartScore` → `getSmartBandRecord` (P1) for the band copy → persist a `DealAnalysis` row → return the bundled report. Mirror the auth + rate-limit + soft-failure patterns from `/api/founder-intake/personas`.
- Tests covering parser unit behaviour, the aggregation formula, and the route's surface contract (validation branches that return BEFORE Prisma is hit).

The Track P row in BUILD_SEQUENCE has full exit-criterion language. P3's `DealRiskReport` shape and the aggregation formula are open design decisions — the founder hasn't locked them. Propose your shape in the first response (or in a quick AskUserQuestion) before coding.

**P3 needs no new SQL migration** — the `deal_analyses` table from P1 already accommodates it.

---

## § 3. What shipped in this batch (Q5 → P2, ten commits)

Track Q closed, Track P 2/7 ✅. Each commit pair is `feat: …` + `docs: …`:

| Session | Feat | Docs | Net |
|---|---|---|---|
| Q5 — Investor-class metamorphic UI | `1791395` | `7526294` | round-axis metamorphism (`f23 targetRoundType` → section reorder + 18 supplementary fields) |
| Q6 — Vertical-specific schedules | `58fad87` | `8918139` | parallel vertical axis (5 verticals × 5 fields = 20 + Generic) — shared `MetamorphicFieldShape` powers one renderer across both axes |
| Q7 — Voice + persona synthesis | `5b47efb` | `f9f3e36` | voice extraction (Whisper transcribe → cascade → Q3-shape suggestions) + persona synthesis (`FounderPersona` + `CompanyPersona` Prisma models, gated at ≥ 80% completeness) |
| P1 — Deal Protection schema + Smart Score | `bb58863` | `22d3624` | new `DealAnalysis` + `InvestorReputation` Prisma models; 5-band ladder with module-load runtime invariants |
| P2 — Clause classifier | `fb5eba6` | `757933f` | 20-value `ClauseType` enum, two-pass cascade (Sonnet primary + Opus judge for critical), 3-mode soft-failure fixture fallback |

**Test growth across the batch:** 510/510 (post-Q4) → 697/697 (post-P2). +187 tests across 7 new suites.

**Architectural takeaways the next agent needs in working memory:**
- The `quantaraJson` extension column on `valuation_subjects` hosts FOUR namespaces: canonical net-new-field subkeys + `supplementary[roundType]` (Q5) + `vertical[verticalId]` (Q6) + the `persona` linkage isn't here (personas have their own tables).
- Q5/Q6 share `MetamorphicFieldShape` as a structural type so `IntakeSupplementaryField` renders both axes' fields without duplication. Don't fork that.
- All cascade-driven endpoints in this batch follow a 3-soft-failure-mode pattern: cascade mock-mode, JSON parse failure, schema/calibration violation → graceful fallback (mock fixture or empty array — never throws). P3 should follow the same pattern.

---

## § 4. Operator actions outstanding

**Database:** all migrations 01–05 are applied (founder confirmed). **Migration 06 — `prisma/sql/06-add-deal-protection-foundation.sql` — needs to be applied before any DealAnalysis or InvestorReputation persistence runs.** Its SQL body was printed inline in the P1 feat-commit chat; the file is also on disk. Paste into Supabase SQL Editor when ready for Track P to be live.

**No env-var changes needed by Q5–P2.** P3 may need a PDF parser library if PDF support is in scope; ship text-first and decide.

**Pending feature work flagged elsewhere:**
- W-017 (deferred since Q5) — Organization-records investor-bias for the metamorphism axis. Lands when Track L or Track J introduces a real LTM ecosystem-data consumer.
- Evidence Room clickable citations (`D:\London-Tech-Map\docs\EVIDENCE_ROOM_CITATIONS.md`) — LTM repo, separate session.

---

## § 5. Standing rules — re-read on every session

These are non-negotiable. Every prior agent who broke one of these caused real cleanup work.

1. **No LTM edits.** `D:\London-Tech-Map` is read-only from OB. Copy components OUT; never edit in place. Never `git push` from OB to the LTM remote.
2. **No band-aids.** No `force-dynamic` workarounds. No `// hack` comments. No `@ts-ignore`. No Suspense wrappers used to suppress an underlying issue. Find the root cause; remove the cause.
3. **Verify before claiming done.** Every commit: `npm test` must pass and `npm run typecheck` must be clean. "Hope" is not a delivery method.
4. **Never run `npm run build` locally.** Vercel builds from git. Local builds waste minutes per commit and provide zero value. (See `~/CLAUDE.md`.)
5. **Lockfile in the same commit as `package.json`.** Always run `npm install` before committing a `package.json` edit.
6. **Commit + push together.** Local commits do nothing — Vercel deploys from git.
7. **AbortSignal + timeout on every network call.** No exceptions.
8. **PII never enters spans, traces, or logs.** Only metadata.
9. **One concern per commit.** Mixed-concern commits are forbidden.
10. **One task at a time.** After completing each session's deliverable, stop and check in with the founder. The "OB batch session pattern" memory permits sequential execution **only** when the founder explicitly pre-authorises a multi-session batch (e.g. "build P3-P5"). A single "yes" or "continue" authorises ONE session.
11. **`UserCompanyDeadline` privacy contract.** Critical-date data (license / trademark / patent / tax / annual filing / regulatory / insurance / board / investor / cap-table) lives in private `UserCompanyDeadline`, NEVER `UserCompanyProfile`. The `loadCompanyProfile` selector and `/directory` consumer must never project these columns. (Repo-wide standing rule from `~/CLAUDE.md`.)
12. **Print SQL migrations inline as you write them.** When a session creates or alters `prisma/sql/*.sql`, print the full SQL body as a `\`\`\`sql` block in the same chat message — don't make the founder open the file. Locked into memory as `feedback_inline_sql_migrations.md` after Q1/Q5/Q7 silently accumulated unrun migrations.
13. **Never revert code without explicit permission, even defensively.** When a safety concern surfaces about a recent change, ASK before changing anything.

---

## § 6. Gotchas the next agent will probably hit if not warned

- **`MediaRecorder` in JSDOM tests.** Q7's `VoiceCaptureCard` uses MediaRecorder, which JSDOM doesn't ship. The component falls back gracefully (`if (!("MediaRecorder" in window))` → error state) but unit tests around it should mock the API or skip.
- **Zod v4 enum from dynamic arrays.** Q5/Q6/Q7 use `z.enum(values as unknown as readonly [string, ...string[]])` because Zod v4's generic constraint changed from tuple to `Readonly<Record<string, EnumValue>>`. Cast through `unknown` is the canonical TS escape; not a band-aid.
- **`runModelCascade` → CascadeResult** has `providerId: ProviderId | "mock"`, not plain string. Tests that mock the cascade need `ProviderAttempt[]` typing on the attempts array — see `synthesize.test.ts` for the canonical pattern.
- **Cold-import test flakiness.** Full-suite runs sometimes fail one route's "module surface" test on a cold node start (the route imports the entire chain including Prisma + auth). Re-run the suite — the second run is reliable. If it fails twice in a row, dig into the actual error.
- **Calendar `match_calendar_memory()` SQL function.** Not installed in OB Supabase yet (W-014). Calendar memory semantic search degrades to empty array gracefully; install the function when calendar memory becomes user-facing. LTM reference at `D:\London-Tech-Map\prisma\sql\` (search for `match_calendar_memory`).
- **Clerk auth is stubbed.** `getAuthSession()` reads `STUB_USER_ID` env var in dev/preview, throws clearly when env unset OR in production (W-015). All API routes use the stub. Track F Session 18 wires Clerk; route code stays identical.

---

## § 7. Quick-start commands

From `D:\Olivia Brain`:

```bash
# Confirm you're on the right HEAD
git log --oneline -5
# Should show 757933f at the top

# Pull anything that landed since
git pull origin main

# Install deps (run after any package.json edit)
npm install

# Run the full test suite
npm test

# Typecheck (no emit)
npm run typecheck

# Watch mode for local TDD
npm run test:watch

# Dev server
npm run dev
```

**Don't run `npm run build` locally.** Standing rule.

---

## § 8. The mandate

Olivia is the brain at the hub of a bicycle wheel. Every commit either makes her more advanced, more intelligent, more agentic, more user-friendly, or more useful as the Chief Intelligence Officer of those six product surfaces — or it shouldn't ship. Read `OLIVIA_NORTH_STAR.md` first, every session, before touching anything.

The founder operates at ~4 sessions/day; every session you waste re-reading what you skipped, re-discovering what's already shipped, or re-building what's already in the schema is a session not spent moving the brain forward.

Welcome. Get the READMEs in your head, then ship P3.
