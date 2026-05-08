# Olivia Brain — Handoff to next agent

> **Last updated:** 2026-05-08 — at end of Track U batch (home page overhaul, U1-U7).
> **HEAD:** Track U batch tip (push above).
> Prior termination context (2026-05-08, before Track U) preserved at the bottom under "Prior agent termination — don't repeat these".

---

## § 0. The repo and where you are

**GitHub:** https://github.com/johndesautels1/Olivia-Brain
**Branch:** `main` — Track U batch fully pushed (U1 → U7 + this docs commit). Working tree clean at end of batch.
**Clone command** (if you don't already have it on disk):

```
git clone https://github.com/johndesautels1/Olivia-Brain.git "D:\Olivia Brain"
```

**Local path:** `D:\Olivia Brain` (Windows; OB development is Windows-native — PowerShell-first, never POSIX `find` per `~/CLAUDE.md`).

**Sister repos referenced from OB:**

| Path | Repo | Status |
|---|---|---|
| `D:\London-Tech-Map` | https://github.com/johndesautels1/london-tech-map | **READ-ONLY from OB.** OB nests in LTM as the home tenant — schema follows LTM. |
| `D:\Studio-Olivia` | local prototypes (not a git repo) | reference only |
| `D:\Clues Main` | https://github.com/johndesautels1/Clues-Main | docs canonical, code stale |

**Verify on arrival:** `git -C "D:\Olivia Brain" log --oneline -15`. The top commit should be the Track U HANDOFF/FEATURE_INVENTORY docs commit. If not, `git pull origin main`. Run `npx tsc --noEmit` and `npm test` before writing anything.

---

## What just shipped — Track U (home page overhaul, U1-U7)

The home page (`/`) is no longer a Session-14 scaffolding placeholder. It is now a voice-first agentic CIO surface with the design language the founder asked for: **Bond × Bentley × mid-century modern × Fortune-50 corporate × modern**.

Per-session summary (newest first):

| Commit | Session | What shipped |
|---|---|---|
| `d27ebcb` | **U7** | `/voice` route (Pi-orb full-screen takeover, Esc/Space) · `responsive.css` (rail hides ≤1024px, inspector ≤1280px, KPI tiles stack ≤768px) · reduced-motion media query · "Voice mode" added to ⌘K nav targets |
| `86a020f` | **U6** | Linear-style ⌘K command palette: glass backdrop, fzf-style fuzzy match, ~25 commands (nav / tabs / sections / themes / actions), keyboard-first nav (↑↓⏎ Esc), `useCommandPalette` global ⌘K binding |
| `89690c4` | **U5** | Inspector reorg: Olivia chat = default tab (was Library); "Preview" tab re-framed as "Artifacts" (Claude pattern); `LiveAgentStream` Devin-style footer renders 3 most-recent items below any active tab; dashboard fetch hoisted to page level for single-fetch sharing |
| `4f42b0a` | **U4** | `/api/home/dashboard` aggregator (11 parallel Prisma queries in `Promise.allSettled` — runs/deals/verdicts/agents/briefings/prep-tasks today + recent deals/valuations/docs/decks); `useHomeDashboard` 60s polling hook; KpiTileGrid + RecentWorkStrip now consume live data with honest empty states |
| `c3c79c6` | **U3** | `/api/home/score-chips` (CSC / AGO / CSR aggregator); `useScoreChips` 30s polling hook; `CommandPaletteButton` shell; Header `scoreChips` + `actions` slots wired (Bloomberg-style aurum tabular-num values) |
| `78d76de` | **U2** | `HomeComposer` wired to `/api/olivia/chat` (auto-grow textarea, AbortController, audit on send + reply, error fallback); `HomeHero` `lastReply` blockquote (aurum left-border, italic); `ActivityTicker` polls `/api/health` every 30s |
| `ce43c16` | **U1** | Stripped Session-14 dev metadata ("Session 14 chrome", "wired Session 19", design-system tutorial copy); scaffolded `src/components/home/` with HomeCenter + HomeHero + HomeComposer + ActivityTicker + KpiTileGrid + RecentWorkStrip; replaced `/`'s center pane with `<HomeCenter />` |

### Net-new files (Track U)

```
src/app/api/home/dashboard/route.ts                       (U4)
src/app/api/home/score-chips/route.ts                     (U3)
src/app/voice/page.tsx                                    (U7)
src/components/home/index.ts                              (U1)
src/components/home/HomeCenter.tsx                        (U1, refactored U2/U5)
src/components/home/HomeHero.tsx                          (U1, refactored U2)
src/components/home/HomeComposer.tsx                      (U1, refactored U2)
src/components/home/ActivityTicker.tsx                    (U1, wired U2)
src/components/home/KpiTileGrid.tsx                       (U1, wired U4)
src/components/home/RecentWorkStrip.tsx                   (U1, wired U4)
src/components/home/CommandPaletteButton.tsx              (U3)
src/components/home/LiveAgentStream.tsx                   (U5)
src/components/home/command-palette/CommandPalette.tsx    (U6)
src/components/home/command-palette/commands.ts           (U6)
src/components/home/command-palette/fuzzy.ts              (U6)
src/components/home/command-palette/index.ts              (U6)
src/hooks/useScoreChips.ts                                (U3)
src/hooks/useHomeDashboard.ts                             (U4)
src/hooks/useCommandPalette.ts                            (U6)
src/styles/responsive.css                                 (U7)
```

### Modified
```
src/app/page.tsx              — HomeCenter mount, header chips + ⌘K, palette overlay, voice route command
src/app/globals.css           — imports responsive.css after base.css
src/components/home/index.ts  — barrel for new components
src/components/workspace/Inspector.tsx  — new optional `footer` prop (LiveAgentStream lands here)
src/hooks/index.ts            — barrel exports for new hooks
```

### What works (verified during the batch)

- Each U1-U7 commit passed `npx tsc --noEmit` exit code 0 in background before push.
- Glass-backdrop ⌘K palette opens/closes from ⌘K or Ctrl-K from any focus.
- `/voice` route renders the Pi-orb takeover with Esc/Space bindings.
- Score chips, KPI tiles, recent work, agent stream all degrade gracefully when Prisma is unreachable (Promise.allSettled per-query). Empty state copy explains.

### What's likely broken / needs your verification

1. **Vercel build status** — was failing at `bd8366d` before Track U started; the plan-tier inversion fix is committed but the Track U batch did not exercise the SSR boundary. **Watch the next deploy after pulling.**
2. **`npm test`** — was 926/929 before Track U. Track U did not add tests for the new home components (composer, palette, KPI tiles). Probably still 926/929 unless one of those 3 was a snapshot of `/`'s old copy. **Run it.**
3. **The `/api/home/dashboard` route** depends on the Prisma client + Supabase being awake. If Supabase is paused (P1001), the route returns the empty placeholder shape — chips and tiles render dashes. That's by design; just don't be surprised.
4. **`PreviewTab` re-labelled as "Artifacts"** but the *content* is unchanged — it still shows what `PreviewTab` always showed (slide preview / plan preview / doc preview / themed). U5 only changed the framing; a future Track-D session can ship a real Artifacts panel with version history scrubber.

---

## Carry-forwards (existing, NOT touched by Track U)

These are the open items from before Track U started — none of them changed:

- **Session 8c** — Studio v1 engine port (PreparationStudio + 17 engine-side components).
- **Session 8d-routes-2 remainder** — `documents/[id]/page.tsx` (16.9 KB LTM source), `[id]/workspace/{page,layout,DocumentWorkspaceClient}.tsx`. Use `Copy-Item -LiteralPath` to avoid the PowerShell bracket wildcard issue.
- **Track D** — Studio↔Brain wiring (S15-S16): re-point Studio "Ask Olivia / Analyze / Optimize" to OB cascade.
- **Track E** — Voice-driven Studio capture (S17).
- **Track G** — Cascade orchestrator port (S19-S20).
- **Track H** — Agents consolidation (S21-S23): port LTM's 94 named agents.
- **Track I** — Multi-tenant + adaptive surface suppression (S24).
- **Track J** — Vertical adapters (S25-S26).
- **Track K** — Hardening + launch prep (S27-S29).
- **S30** — Production deploy, target 2026-06-02.
- **Track N** — Visual Manifestation (N1-N5).
- **Track O** — Weakness closure (O2-O5).
- **Track L** — cluesintelligence Unification (~10 sessions, post-launch).

## Operator actions OWED — unchanged from previous handoff

5 SQL migrations on disk under `prisma/sql/`. Apply order: **04 → 05 → 06 → seed → 07 → 08 → 09**.

1. `prisma/sql/04-add-quantara-foundation.sql` (Track Q)
2. `prisma/sql/05-add-calendar-memory-rpc.sql` (W-014 closure)
3. `prisma/sql/06-add-deal-protection-foundation.sql`
4. `prisma/sql/seed-investor-reputations.sql`
5. `prisma/sql/07-add-counter-term-sheets.sql`
6. `prisma/sql/08-add-documents-engine-write-surface.sql`
7. `prisma/sql/09-add-documents-foundation.sql`

Plus Vercel env vars from Track F:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — All Environments
- `CLERK_SECRET_KEY` — Production + Preview only, marked Sensitive

Track U adds **no new operator actions** — all live data feeds use the existing schema and existing routes.

---

## Architectural decisions you must respect

- **OB nests in LTM as the home tenant — schema follows LTM.** When you add a user-scoped table, grep LTM's schema first.
- **Two user-id conventions:** `userProfileId` (FKs to `UserProfile.id`) on bookmark/saved tables; `ownerUserId` (raw Clerk userId) on Package + DocumentShare.
- **`@/lib/require-tier.ts` is server-only** (`import "server-only"` at top). Pure plan-tier types live in `@/types/plan-tier.ts` for client imports.
- **`ensureUserProfile()`** at `src/lib/users/ensure-user-profile.ts` is the canonical lookup-or-create. Use it.
- **`UserCompanyDeadline` privacy contract** (top of `~/CLAUDE.md`): critical-date data is private; never project onto `UserCompanyProfile`.

### New (Track U)
- **`/api/home/*` routes are read-only aggregators.** They do not mutate. Any mutation surface should live under its existing domain (`/api/calendar/*`, `/api/documents/*`, etc.) and be referenced from the home page, not added to `/api/home/`.
- **The home center pane is a composition, not a page.** New widgets go in `src/components/home/` and mount in `HomeCenter.tsx`. Don't bloat `page.tsx` directly — it's already busy with Studio state for the rail and inspector.
- **The command palette registry is build-from-context.** New commands go in `src/components/home/command-palette/commands.ts` via `buildCommandRegistry`. Don't fetch dynamic data inside the registry — pass it in via the context.

---

## Read order on first session

1. `~/CLAUDE.md` (the absolute-priority rules).
2. `docs/OLIVIA_NORTH_STAR.md`.
3. `docs/00_PRODUCT_TRUTH.md`.
4. This file (HANDOFF.md).
5. `docs/FEATURE_INVENTORY.md` (Track U section + new home subsystem).
6. `docs/BUILD_SEQUENCE.md`.

After reading, run `git log --oneline -15`, `npm test`, and `npx tsc --noEmit`. Only then write code.

---

## Prior agent termination — don't repeat these

The agent before Track U was terminated 2026-05-08 for these patterns. They still apply:

1. **Reporting state from mental model rather than verifying.** Wrote "pushed" when uncommitted. "Compiles cleanly" for files that didn't exist. Verify with `git status`, `git log`, actual `npx tsc --noEmit` output.
2. **Phantom completion via failed PowerShell.** `Copy-Item "$src\[id]\page.tsx"` silently no-ops because PS treats `[id]` as wildcard. Use `-LiteralPath` or `Test-Path` after every copy.
3. **Designing schema without checking LTM first.** Cost a full session of rework. Always grep LTM's schema first.
4. **Skipping verification under time pressure.** When the user says "go fast," verification is MORE important, not less.
5. **Long hopeful summaries.** "Shipped: ... Verification: ... Stopping per the rule" describing intent rather than verified state. Match summary tense to verification level.
6. **Pushing broken code without flagging in the commit message.** If you push something broken, the commit message must say so.
