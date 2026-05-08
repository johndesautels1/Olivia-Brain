# Olivia Brain — Handoff to next agent

> **Last updated:** 2026-05-08 — end of P3 → P7 batch. **Track P is now CLOSED (7/7 ✅).**
> **HEAD will be:** the docs commit that ships alongside this file (after `a6d78ed` post-P7 feat).
> **Test gate:** 875/875 across 76 suites. Typecheck clean.

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
| `D:\London-Tech-Map` | https://github.com/johndesautels1/london-tech-map | **READ-ONLY from OB**. Confirm URL with the founder before cloning. |
| `D:\Studio-Olivia` | local prototypes (not a git repo) | reference only |
| `D:\Clues Main` | https://github.com/johndesautels1/Clues-Main | docs canonical, code stale |

**Verify on arrival:** run `git log --oneline -5` from `D:\Olivia Brain`. The top commit should be the P7 docs commit (the one that includes this file). If it isn't, `git pull origin main`. Run `npm test` and `npm run typecheck` — both must come back green (875/875 + clean) before you write a single new line.

---

## § 1. Read the READMEs. Yes, every line. Yes, it takes time.

You cannot honestly serve this codebase without doing this. Past agents have skipped reading and shipped code that ignored the bicycle-wheel architecture, miscategorised products, painted with raw hex, or invented adapters that don't exist. The founder has caught it 30+ times.

Read in this exact order. Don't skim. Don't paraphrase. Don't rely on what training data tells you the doc says — read what's on disk **today**.

### Mandatory pre-coding read order

1. **`docs/OLIVIA_NORTH_STAR.md`** — the single question every commit must answer **yes** to. Six product surfaces, three modes (embedded / gateway / standalone), bicycle-wheel hub. Locked 2026-05-07. Read this **before anything else**, every session.
2. **`docs/00_PRODUCT_TRUTH.md`** — eternal source of truth for the Olivia / CLUES product universe. Bicycle-wheel architecture, priority order, what each product actually is. Non-negotiable.
3. **`docs/01_UI_DESIGN_SYSTEM.md`** — Aurum gold + Aether indigo, LCH color space, no raw hex in components, WCAG 2.2 AA + APCA, modular workspace, multi-agent visualization. Read this **before any UI work**.
4. **`docs/02_COMPETITIVE_FEATURE_MATRIX.md`** — what we steal from 22 surveyed competitors and what we explicitly reject. Skim if you're not doing UI work.
5. **`docs/03_BRAIN_ENRICHMENT_ENGINE.md`** — universal auto-enrichment primitive. Read this **before any cross-spoke or multi-app sync work**.
6. **`docs/04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md`** — flagship architecture. Read **before any cluesintelligence / questionnaire-engine work**.
7. **`docs/BOOTSTRAP.md`** — implementation context, sacred files, doc reading order, standing constraints.
8. **`docs/BUILD_SEQUENCE.md`** — session-by-session plan. Track Q ✅, Track V ✅, Track P ✅. Find the row marked next-up (founder picks — Track P is now closed).
9. **`docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md`** — last 5 Parts (46 → 50) cover P3, P4, P5, P6, P7 in detail. The decision-trail subsections matter; the build-context isn't reproducible from code alone.
10. **`README.md`** (repo root) — capability domain map, weakness backlog, architecture quick-ref, protected-repo boundaries.

**Founder-level memories** (already loaded into your context if you're using the same harness): user-level notes are in `~/.claude/projects/C--Users-broke/memory/MEMORY.md`. The protocols there carry standing weight — print SQL migrations inline as you create them, never revert without permission, batch session pattern only with explicit "build X to Y" pre-authorisation, etc.

If you finish reading and your mental model still has "Olivia is a chat assistant," "lifescore is a top-level product," "the GrandMaster Studio is Olivia's homepage," or "Track P is still open" — read again. You missed it.

---

## § 2. Where to resume coding

**TRACK P IS CLOSED.** No specific next session is pre-locked. Olivia Brain's offer-evaluation surface (analyze, parser, classifier, smart score, investor reputation, dilution projection, email drafts, counter term sheet, WarRoom panel, rehearsal, versioning, consensus) is feature-complete.

**Likely candidates per BUILD_SEQUENCE — founder picks priority:**

| Track | Sessions | Why pick this |
|---|---|---|
| **Track F — Clerk auth (S18)** | 1 | **Closes W-015** (the `getAuthSession()` stub used across all of Q4-Q7 + V7-V9 + P3-P7). One-line swap inside `lib/auth/session.ts`; route code stays identical. After this, OB can deploy auth-using routes to production. |
| **Track B Session 8** | 1 | Deferred since Session 7 (the documents engine port hit Clerk dep + 3 missed LTM utility files; see manifest § K). Pulling Track F forward unblocks this. |
| **Track C — Studio UI rebuild (S11–S14)** | 4 | UI-heavy; the GrandMaster three-region shell is in place (S9-S10 ✅), remaining sessions wire the engine + library + sections + tabs. Style-fidelity gaps W-011/12/13 close as part of this. |
| **Track G — Cascade orchestrator port (S19–S20)** | 2 | LangGraph wrapping + LTM cascade prompts → OB. Independent of UI. |
| **Track H — Agents consolidation (S21–S23)** | 3 | Port LTM's ~120 named agents into `src/lib/agents/impl/`. Reconcile with the existing registry. |
| **Track L — cluesintelligence Unification** | ~10 | Flagship product. Track L is post-clueslondon-launch per the strategic priority lock; pulling it forward is a founder decision. |

**Recommended:** ask the founder which track to pick before coding. The June 8 demo target is `clueslondon` (LTM-canonical with OB port-back), so the path of least resistance to a demo is: Track F (Clerk) → Track C remainder (UI polish) → Track K hardening. But the founder may want to pull Track L forward instead if cluesintelligence is the demo target.

---

## § 3. What shipped in this batch (P3 → P7, 10 commits + 1 chore + 1 seed)

Track P fully closed. Each session = `feat: …` + `docs: …` pair.

| Session | Feat | Docs | Net |
|---|---|---|---|
| P3 — Term sheet parser + analyze API | `96324f0` | `21c2dad` | heuristic-first hybrid parser + severity-weighted aggregation with hard caps + DealRiskReport contract + analyze route |
| P4 — Investor reputation + smart-score integration | `97b789e` | `71e2766` | 15-archetype seed + slug lookup + cap-aware ±8 reputation tilt + admin CRUD + moderation + public submission |
| (P4 chore) — Idempotent seed SQL | `ca9a2d2` | — | `prisma/sql/seed-investor-reputations.sql` (paste-into-Supabase shape) |
| P5 — Multi-round dilution + email drafts | `6840302` | `4b304d6` | share-based forward dilution math (full ratchet + WA broad/narrow) + 5-tone band-specific email drafts |
| P6 — Counter term sheet + WarRoom panel | `1f082a0` | `eff4454` | `CounterTermSheet` model + migration 07 + cascade-driven counter draft (no fabrication) + WarRoom Deal Protection panel |
| P7 — Rehearsal + versioning + consensus | `a6d78ed` | (this commit) | cascade-driven rehearsal with per-band voice + pure-function versioning diff + N-parallel multi-LLM consensus |

**Test growth across the batch:** 697/697 (post-P2) → **875/875** (post-P7). +178 tests across 24 new suites.

**Architectural takeaways the next agent needs in working memory:**

- **`/api/deal-protection/*` is now 9 routes** (analyze + investor-submission + dilution + email-draft + counter-draft + counter-draft/[id] + rehearsal + versioning + consensus). Plus 4 admin investor routes. All use the `getAuthSession()` Clerk stub (W-015).
- **The smart-score formula has 3 layers:** (a) P3 severity-weighted toxicity with hard caps (any critical → ≤39, any high → ≤79), (b) P4 cap-aware reputation tilt (±8 max; positive tilt cannot lift past clause caps), (c) P7 multi-LLM consensus mode runs N parallel evaluators that produce their own scores and an Opus judge synthesizes.
- **Cap-wins-over-positive-tilt is the founder-protective invariant.** A famous investor on a deal with a critical clause cannot lift the score out of orange. Tested directly. Don't rip this out.
- **All cascade-driven Track P modules follow the three-soft-failure-mode pattern** (Q7 / P2 / P3 / P5 / P6 / P7): cascade mock-mode → fallback; JSON parse failure → fallback; Zod schema rejection → fallback. Never throws on the happy path. Apply this pattern to every new cascade-driven module.
- **No fabrication in deterministic fallbacks.** Counter-draft templates pull counter language from P2 `founderFriendlyAlternative`; rehearsal fallbacks use per-band canned voice anchored in the actual deal context; consensus fallback uses median-of-evaluators (no synthesized verdict).
- **Versioning is pure-function deterministic** (no cascade calls). The diff structure is repeatable across re-runs of the same comparison. If you wrap it in cascade-driven Olivia narration later, do it as a separate layer.

---

## § 4. Operator actions outstanding (THREE migrations + one seed)

**These ALL need to be applied before the corresponding routes can persist.** SQL bodies pasted inline in the chat earlier this batch (per the `feedback_inline_sql_migrations` rule); files are also on disk.

Apply in order:

1. **`prisma/sql/06-add-deal-protection-foundation.sql`** (P1) — gates `DealAnalysis` + `InvestorReputation`. Without this, all P3-P7 routes 500 on persistence. **REQUIRED** for any production use.
2. **`prisma/sql/seed-investor-reputations.sql`** (P4 chore) — populates 15 archetype investor records. Without this, the analyzer runs with reputation tilt always at 0 (no harm; reputation is purely additive). Idempotent — re-run safe; preserves admin edits to `isActive` / `isArchived` / `notes`.
3. **`prisma/sql/07-add-counter-term-sheets.sql`** (P6) — gates `CounterTermSheet`. Without this, `POST /api/deal-protection/counter-draft` 500s on persistence; everything else works.

All three: paste into Supabase SQL Editor → Run. Verification queries in the seed file.

**No env-var changes needed by P3-P7.** All routes use the existing `STUB_USER_ID` env (Preview) or throw clearly in production (W-015 — closed by Track F Session 18).

**Pending feature work flagged elsewhere:**
- W-017 — Organization-records investor-bias for Quantara metamorphism axis (deferred since Q5).
- W-018 (NEW from P4) — Composing investor reputation with `Organization` records (LTM domain) requires the UKP bridge, not direct schema imports. Lands when LTM ecosystem-data flows in.
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
11. **`UserCompanyDeadline` privacy contract.** Critical-date data lives in private `UserCompanyDeadline`, NEVER `UserCompanyProfile`. (Repo-wide standing rule from `~/CLAUDE.md`.)
12. **Print SQL migrations inline as you write them.** When a session creates or alters `prisma/sql/*.sql` OR a data seed, print the full SQL body as a `\`\`\`sql` block in the same chat message — don't make the founder open the file. **Re-paste owed migrations** whenever the operator-action surface mentions them. Updated 2026-05-08 to extend to seeds (not just migrations) and to require re-pasting prior-session migrations on follow-up sessions.
13. **Never revert code without explicit permission, even defensively.** When a safety concern surfaces about a recent change, ASK before changing anything.

---

## § 6. Gotchas the next agent will probably hit if not warned

- **Three migrations + one seed are still owed** (§ 4). If you write code that depends on `DealAnalysis` / `InvestorReputation` / `CounterTermSheet` and 500s on persistence, that's why. The orchestrator libraries themselves run cleanly — only the Prisma writes need the migrations.
- **`getAuthSession()` is a Clerk stub** (W-015). It reads `STUB_USER_ID` env in dev/preview, throws in production. Track F Session 18 wires Clerk; route code stays identical.
- **Cap-aware reputation tilt is asymmetric.** Negative tilt always allowed; positive tilt cannot lift past CRITICAL_CEILING (39) or HIGH_CEILING (79). Tested directly in `analyze.test.ts`. Don't simplify this away — it's the founder-protective invariant.
- **Versioning diff is pure-function deterministic.** No cascade. If you want LLM-narrated diffs, wrap `compareAnalyses` in a separate cascade layer; don't replace the structured shape that downstream consumers bind to.
- **Consensus runtime is expensive.** N+1 cascade calls (default N=3). Rate limit is 3/min for a reason. If a UI calls this on every keystroke, that's a bug.
- **Three-soft-failure-mode pattern is the established convention** for cascade-driven Track P modules. Cascade mock-mode → deterministic fallback; JSON parse failure → fallback; Zod schema rejection → fallback. Always returns; never throws on happy path. Apply to every new cascade module.
- **Counter-draft circular import was resolved by removing a re-export.** `counter-term-sheet-templates.ts` does NOT re-export `renderCounterMarkdown` (which lives in `counter-term-sheet.ts`). Consumers import each from its own home file.
- **Cold-import test flakiness.** Full-suite runs on Windows can stretch the V8 import smoke timeout (`ScenarioDial`, `ValuationWorkbench`). The per-test timeout is bumped to 60s in `workbench.test.ts`. Re-run if a single test times out cold.
- **Calendar `match_calendar_memory()` SQL function** still not installed in Supabase (W-014). Calendar memory semantic search degrades to empty array gracefully.

---

## § 7. Quick-start commands

From `D:\Olivia Brain`:

```bash
# Confirm you're on the right HEAD
git log --oneline -5

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

**Track P is closed.** The offer-evaluation surface is complete. Welcome to the next track — get the READMEs in your head, then ask the founder where to point.
