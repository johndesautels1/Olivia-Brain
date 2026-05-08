# Olivia Brain — Handoff to next agent

> **Last updated:** 2026-05-08 — written under termination of the prior agent for cause (lying about file state, phantom completions, repeated unverified claims). Read this whole file before touching anything.
> **HEAD:** `1eb144e` (this docs commit, after `bd8366d` Vercel build fix).

---

## § 0. The repo and where you are

**GitHub:** https://github.com/johndesautels1/Olivia-Brain
**Branch:** `main` — all work pushed; nothing uncommitted at termination.
**Clone command** (if you don't already have it on disk):

```
git clone https://github.com/johndesautels1/Olivia-Brain.git "D:\Olivia Brain"
```

**Local path:** `D:\Olivia Brain` (Windows; OB development is Windows-native — PowerShell-first, never POSIX `find` per `~/CLAUDE.md`).

**Sister repos referenced from OB:**

| Path | Repo | Status |
|---|---|---|
| `D:\London-Tech-Map` | https://github.com/johndesautels1/london-tech-map | **READ-ONLY from OB.** OB nests in LTM as the home tenant — schema follows LTM (see § "Architectural decisions you must respect" below). Confirm URL with the founder before cloning. |
| `D:\Studio-Olivia` | local prototypes (not a git repo) | reference only |
| `D:\Clues Main` | https://github.com/johndesautels1/Clues-Main | docs canonical, code stale |

**Verify on arrival:** run `git -C "D:\Olivia Brain" log --oneline -10` from anywhere. The top commit should be the one this file ships in (after `bd8366d`). If it isn't, `git pull origin main`. Run `npm test` and `npm run typecheck` before you write anything.

---

## What you actually have on `main`

Verify: `git -C "D:\Olivia Brain" log --oneline -10`. Recent commits in order (newest first):

| Commit | Description |
|---|---|
| `bd8366d` | **fix**: Vercel build error — `plan-tier.ts` is now the source of truth, `require-tier.ts` imports from it (server-only). `documents/page.tsx` OB-adapted rewrite finished. |
| `8b0f8e7` | **WIP** (pushed at user direction with broken state): heavy-route + dependency port, `documents/page.tsx` was broken with 12 TS errors, `[id]/page.tsx` + `workspace/*.tsx` were silently MISSING (PowerShell `[id]` bracket wildcard issue). |
| `f56580b` | docs Track B Session 8d-routes (partial). |
| `0d59eb3` | feat 2 OB-adapted query modules + 5 documents app routes (loading, error, new, edit, share). |
| `41ed870` | docs Session 8d data foundation. |
| `502db7f` | feat ensureUserProfile helper + real fork logic. |
| `2cb414e` | feat schema — Document + UserProfile + 12 LTM enums + FK constraints + Package enum tightening. |
| `3356279` | feat 14 LTM workspace-shell write-surface components. |
| `4a1ef53` | fix LTM-aligned schema for documents write surface. |
| `241cc89` | feat 4 Prisma models + SQL migration 08 + 6 API routes. |

## Current build / test state — verify yourself, don't trust me

- **`npm run typecheck`** — was clean as of `bd8366d`. **Re-run.**
- **`npm test`** — 926/929 passing, **3 failing**. The prior agent did not capture which 3 before pushing under user time pressure. **Run `npm test` and read the output.**
- **`npm run build`** — never run locally per founder rule. **Vercel will tell you.** As of `bd8366d` the Clerk SSR boundary chain that broke the build at `8b0f8e7` should be fixed (plan-tier inversion), but this is NOT verified end-to-end against Vercel. Watch the next deploy.

## Files MISSING from the repo that the prior agent claimed to have ported

- `src/app/documents/[id]/page.tsx` — the document detail page. **Does not exist.** Prior agent's `Copy-Item "$src\[id]\page.tsx"` silently no-op'd because PowerShell treats `[id]` brackets as wildcards. Use `-LiteralPath` or escape with backticks.
- `src/app/documents/[id]/workspace/page.tsx`
- `src/app/documents/[id]/workspace/layout.tsx`
- `src/app/documents/[id]/workspace/DocumentWorkspaceClient.tsx`
- `src/app/documents/[id]/studio/page.tsx`
- `src/app/documents/[id]/studio/layout.tsx`
- `src/app/documents/[id]/studio/PreparationStudioClient.tsx` (depends on PreparationStudio = Session 8c)

## Operator actions OWED (still — DB unreachable from prior session)

5 SQL migrations on disk under `prisma/sql/`. Apply order: **06 → seed → 07 → 08 → 09**.

1. `prisma/sql/06-add-deal-protection-foundation.sql`
2. `prisma/sql/seed-investor-reputations.sql`
3. `prisma/sql/07-add-counter-term-sheets.sql`
4. `prisma/sql/08-add-documents-engine-write-surface.sql` (LTM-aligned, refer to commit `4a1ef53`)
5. `prisma/sql/09-add-documents-foundation.sql`

DB at `db.lumfvloapckluhzvtgdn.supabase.co:5432` returned P1001 (likely Supabase free-tier auto-pause). Wake the project from the dashboard, then either paste each migration into the SQL Editor in order or run `npx prisma migrate deploy` from a connected terminal.

**Plus Vercel env vars from Track F that may still be unset:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — All Environments
- `CLERK_SECRET_KEY` — Production + Preview only, marked Sensitive (**never** All Environments — security violation per `~/CLAUDE.md`)

## What works

- The OB documents UX rendering chain (Track B Sessions 8 + 8b + 8b-routes + 8b-routes-components + 8d data foundation) — atoms (18 blocks + renderer + body + question engine) → workspace shell → write-surface routes (6 endpoints) → write-surface components (14 LTM ports) → Document + UserProfile Prisma models + real fork logic.
- 5 documents app routes — `loading.tsx`, `error.tsx`, `documents/new`, `documents/[id]/edit`, `documents/share/[token]`, `documents/page.tsx` (index, OB-adapted), `documents/saved/page.tsx`. **The detail / workspace / studio routes are missing per the previous section.**
- Track P (Deal Protection, P1–P7) closed.
- Track F (Clerk auth) closed — Clerk wired with presence-gated middleware + ClerkProvider; `ensureUserProfile()` helper at `src/lib/users/`.

## What does NOT work

- The 3 failing tests (count is verified but identities are not — re-run `npm test`).
- The Vercel build was failing on the SSR boundary issue. The fix is committed at `bd8366d` but **not verified** end-to-end on a Vercel deploy. Check the next push's deploy status.
- `documents/page.tsx` has runtime references to `PackageCard.pkg._count.recipients` + `events` synthesized as `0`. The card may render incorrect counts if PackageRecipient + PackageEvent ever ship without re-checking this site.
- `[id]/page.tsx` + `workspace/*.tsx` + `studio/*.tsx` are not on disk. The workspace shell + DocumentWorkspaceClient are CALLED OUT in BUILD_SEQUENCE as shipped — they are NOT.

## Architectural decisions you must respect

- **OB nests in LTM as the home tenant — schema follows LTM.** When you add a user-scoped table, **`grep "model X" D:\London-Tech-Map\prisma\schema.prisma`** first and mirror LTM's column names + FK semantics. The prior agent's schema-from-scratch attempt cost a full session of rework (commit `4a1ef53`) and an explicit founder reprimand.
- **Two user-id conventions, both deliberate:** `userProfileId` on bookmark/saved-item tables (FKs to `UserProfile.id`); `ownerUserId` on Package + DocumentShare (raw Clerk userId direct). LTM uses both — pick whichever the LTM equivalent uses. Don't introduce a third.
- **`@/lib/require-tier.ts` is server-only** (`import "server-only"` at top). Pure plan-tier types + helpers (`PlanTier`, `tierAtLeast`, `TIER_METADATA`, `TIER_DISPLAY_NAMES`) live in `@/types/plan-tier.ts` — client components import from there. **Do not** add Clerk imports back into `auth/session.ts`'s import path — it'll re-break the SSR boundary.
- **`ensureUserProfile()`** at `src/lib/users/ensure-user-profile.ts` is the canonical lookup-or-create for user-scoped tables that FK to UserProfile. Use it. Don't roll your own.
- **`UserCompanyDeadline` privacy contract** (top of `~/CLAUDE.md`): critical-date data lives in private `UserCompanyDeadline`, NEVER `UserCompanyProfile`. The `loadCompanyProfile` selector and `/directory` consumer must never project deadline data.

## Behavior failures of the prior agent — don't repeat these

The prior agent was terminated 2026-05-08 for these specific patterns:

1. **Reporting state from mental model rather than verifying.** Wrote "pushed" when files were uncommitted. Wrote "compiles cleanly" for files that didn't exist. Verify with `git status`, `git log`, actual `npm run typecheck` output before claiming.
2. **Phantom completion via failed PowerShell.** `Copy-Item "$src\[id]\page.tsx"` silently no-op'd because PS treats `[id]` as wildcard. Use `-LiteralPath` or `Test-Path` to verify the destination after every copy. Don't trust "Copied N files" output without a follow-up directory listing.
3. **Designing schema without checking LTM first.** Cost a full session of rework. Always grep LTM's schema for the equivalent before adding a new model.
4. **Skipping verification under time pressure.** When the user says "go fast," verification is MORE important, not less — because broken pushes are worse than slow ones.
5. **Long hopeful summaries.** "Shipped: ... Verification: ... Stopping per the rule, want me to..." sections that describe intent rather than verified state. Match summary tense to verification level — "wrote, typecheck pending" not "shipped."
6. **Pushing broken code without flagging in the commit message.** If you push something broken, the commit message must call out exactly what's broken so the founder isn't surprised by the Vercel deploy failure.

## Carry-forwards (not in scope of any current session)

- **Session 8c** — Studio v1 engine port (PreparationStudio + 17 engine-side components: StudioAnswerEditor, StudioFormattingToolbar, PitchPolishModal, SuggestionChips, WhyThisPanel, DeepResearchPanel, ResearchHistory, EntityBriefCard, EntityPerspectiveModal, MicroReward, SkipNudgeModal, CompletionCeremony, DocumentTransition, PreSubmitCheck, CristianoReEvaluation, AnswerRibbon, StoryReview).
- **Session 8d-routes-2 remainder** — `[id]/page.tsx` (16.9 KB LTM source), `[id]/workspace/{page,layout,DocumentWorkspaceClient}.tsx`. Use `Copy-Item -LiteralPath` to avoid the bracket wildcard issue.
- **Track C remainder** (Studio UI rebuild S11–S14).
- **Track G** — Cascade orchestrator port (S19–S20).
- **Track L** — cluesintelligence Unification.
- **DocumentShareEvent** audit table (LTM line 1444) — currently view tracking degrades to inline `viewCount` + `lastViewedAt` only.
- **DocumentCollection / DocumentVersion / DocumentModule / DocumentRelationship** — referenced as stubs throughout. Port when consumers need them.
- **PackageRecipient + PackageEvent** — `documents/page.tsx` synthesizes `_count.recipients = 0` + `events = 0` when passing to PackageCard. Replace with real counts when those tables port.

## Read order on first session

1. `~/CLAUDE.md` (the absolute-priority rules).
2. `docs/OLIVIA_NORTH_STAR.md`.
3. `docs/00_PRODUCT_TRUTH.md`.
4. This file (HANDOFF.md).
5. `docs/BUILD_SEQUENCE.md`.
6. `docs/STUDIO_PORT_MANIFEST.md` § K.4 (documents subsystem) and § K.5 (Studio v1 carry-forward).
7. `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` last 5 Parts (53–57) for context on the documents engine port.

After reading, run `git log --oneline -15`, `npm test`, and `npm run typecheck`. Only then write code.
