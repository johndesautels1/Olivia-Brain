# Session Log — 2026-05-09 — Track O5c S1 — Tavus adapter foundation

> Single-session scope, opened from `4808d6c`. S1 of a 3-session track per
> `docs/HANDOFF.md §6` and `docs/O5_AVATAR_LIPSYNC_RESEARCH.md §5`.
> Founder authorized "S1 only, stop and check in for S2."

## What shipped

- `src/lib/avatar/types.ts` — `tavus` added to the `AvatarProvider`
  union and to the `AvatarServiceStatus` interface.
- `src/lib/avatar/tavus.ts` — new adapter mirroring the Simli adapter
  shape: `isTavusConfigured`, `createTavusSession` (POST
  `/v2/conversations`), `sendTavusUtterance` (POST `…/utterance`),
  `endTavusSession`, `generateTavusVideo` (POST `/v2/videos`),
  `getTavusSessionStatus`. All write paths wrapped in `withTraceSpan`.
- `src/lib/avatar/index.ts` — Tavus registered in
  `getAvatarServiceStatus`, `getAvailableProviders`, the
  `generateAvatarVideo` switch, and the `createAvatarSession` realtime
  selector (gated to fallback slot until S3's decision rubric).
- `src/lib/config/env.ts` — `TAVUS_API_KEY` added (optional secret).
- `prisma/schema.prisma` — new `AvatarEvalRun` model
  (`avatar_eval_runs` table) with indexes on `(vendor, createdAt DESC)`
  and `(scriptId, vendor)`. Snapshots `scriptText` so future suite edits
  don't break old comparisons.
- `prisma/sql/10-add-avatar-eval-run.sql` — idempotent migration with
  Apply + Verify blocks. Operator action: apply via Supabase or
  `npx prisma db execute`.
- `src/lib/avatar/__tests__/tavus.test.ts` — 5 smoke tests
  (module surface, configured/unconfigured branches, throw-on-missing-key,
  service-status sibling preservation). All pass; cumulative suite
  remains green.
- `docs/RUNBOOK.md` — `TAVUS_API_KEY` added to §2 in a new "Avatar
  lip-sync vendors" subsection; §3 SQL list extended with
  `10-add-avatar-eval-run.sql`.

## Verification

- `npx tsc --noEmit` — exit 0.
- `npx vitest run src/lib/avatar/__tests__/tavus.test.ts` — 5/5 pass.

## Carry-forward to S2

- `/admin/avatar-eval` page + 30-script suite (per
  `docs/O5_AVATAR_LIPSYNC_RESEARCH.md §5`).
- `POST /api/admin/avatar-eval/run` writing to `AvatarEvalRun`.
- Per-vendor latency telemetry capture (mirror the
  `speak-stream` performance marks).
- **Verify Tavus's actual phoneme-input claim** during the harness
  wiring. The adapter has a `TODO O5c-S2` marker on
  `sendTavusUtterance`. If Tavus accepts a phoneme/viseme channel,
  re-open O5d.

## Carry-forward to S3

- Pull `OliviaVideoAvatar` behind the `src/lib/avatar/` abstraction so
  vendor swaps become declarative.
- Implement decision rubric: `latency × 0.4 + lip-sync MOS × 0.4 +
  cost × 0.2`.
- Results dashboard + per-tenant default vendor selection.

## Operator actions owed by this session

- Apply `prisma/sql/10-add-avatar-eval-run.sql` via Supabase SQL
  editor (or `npx prisma db execute`). Without it, the harness in S2
  will 500 on the `AvatarEvalRun` write path. SQL was printed inline
  in the chat at session close per the inline-SQL rule.
- Set `TAVUS_API_KEY` in Vercel: Production + Preview, marked
  Sensitive (per `~/CLAUDE.md` — never All Environments for secrets).
  Without it, the realtime selector skips Tavus gracefully — so this
  is *only* needed once S2's harness needs Tavus telemetry.

## Notes

- Replaced no behavior. Until `TAVUS_API_KEY` is set, every code path
  short-circuits exactly as before.
- The `TAVUS_REPLICA_IDS` map uses placeholder IDs; real Tavus replica
  IDs land in S2 alongside the harness UI.
- Verification trail also flagged a single-test cold-start timeout
  flake on `src/app/api/admin/investors/__tests__/route.test.ts` when
  running the full 93-file suite (15029ms vs 15000ms threshold). Re-ran
  in isolation → 8772ms, 10/10 pass. Filed as known-flaky parallel-load
  pattern, not a regression.
