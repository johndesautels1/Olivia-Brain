# Session Log — 2026-05-09 — Track O5c S2 — Avatar A/B harness

> Single-session scope, opened from `fb85c3f` (S1's tip). S2 of a 3-session
> track per `docs/HANDOFF.md §6` and `docs/O5_AVATAR_LIPSYNC_RESEARCH.md §5`.
> Founder authorized "continue S2" mid-batch.

## What shipped

- `src/lib/avatar/eval-scripts.ts` — typed catalog of the 30-script
  suite from the O5 memo. Six categories of 5: short, medium,
  number_heavy, plosive, multilingual, long_form. Append-only IDs so
  the `(scriptId, vendor)` index in `AvatarEvalRun` correlates
  historical runs correctly. Helpers: `getEvalScript`,
  `getEvalScriptsByCategory`, `isEvalVendor`. `EVAL_VENDORS` list
  includes the existing `src/lib/avatar/*` adapters plus `liveavatar`
  (the production LITE-mode path that's not in the abstraction yet —
  S3's lift).
- `src/app/api/admin/avatar-eval/runs/route.ts` — GET (list, filterable
  by `?vendor=` and `?scriptId=`, default 200) + POST (create) backed
  by Prisma `AvatarEvalRun`. Mirrors `/api/admin/investors`: same
  `requireAdmin()` pattern, same `rateLimit` shape (60/min on both
  GET and POST), `force-dynamic`. Snapshots `scriptText` from the
  catalog at write-time so future suite edits don't mis-correlate
  prior MOS data. Validates with Zod; rejects unknown vendors,
  unknown scriptIds, out-of-range MOS, and negative cost/latency.
- `src/app/admin/avatar-eval/page.tsx` — client harness UI (mirrors
  `/admin/eval`'s style + tokens). Vendor selector at top; left
  column has the script catalog grouped by category with per-(vendor,
  script) MOS chips so the operator can see at a glance what's been
  rated; right column has the selected-script preview + capture form
  (latency, MOS 1.0–5.0, cost cents, notes) + recent runs for the
  current selection; bottom shows all recent runs. Live capture stays
  out-of-band for S2 — operator drives the vendor's own player and
  pastes the latency in. S3's abstraction lift will wire live
  triggers.
- `src/lib/avatar/__tests__/eval-scripts.test.ts` — 8 catalog
  completeness tests (count = 30, 5 per category, unique IDs,
  non-empty text, long-form ≥ 3 sentences, lookup helpers,
  `isEvalVendor` narrowing).
- `src/app/api/admin/avatar-eval/runs/__tests__/route.test.ts` — 7
  surface-contract tests (module surface, validation branches for
  invalid JSON / unknown vendor / missing scriptId / out-of-range MOS
  / unknown scriptId, auth-stub-missing 503). Pre-warms the route in
  `beforeAll` so per-test Prisma+Zod cold-start doesn't hit the
  default 15s testTimeout — the same pattern would help
  `admin/investors`'s flaky route smoke if/when it's revisited.

## Verification

- `npx tsc --noEmit` — exit 0 (after fixing one Zod v4 callsite:
  `z.record(z.string(), z.unknown())` instead of the deprecated
  single-arg form).
- New tests: 20/20 pass across 3 files (eval-scripts, route, tavus).

## Carry-forward to S3

- **Pull `OliviaVideoAvatar` behind the `src/lib/avatar/`
  abstraction.** Today it's a 867-line direct LiveAvatar LITE
  consumer; S3 turns vendor swaps into a one-line registry change.
  Lights up Tavus/Simli on the realtime path automatically.
- **Decision rubric.** New `/admin/avatar-eval/decision` view that
  ranks vendors by `latency × 0.4 + lip-sync MOS × 0.4 + cost × 0.2`
  per `O5_AVATAR_LIPSYNC_RESEARCH.md §5`. Optional: per-tenant
  default vendor selection wired via `tenant_configs`.
- **Live trigger.** A "Run live" button per script that drives the
  selected vendor for real and captures latency via
  `performance.mark` (mirror `speak-stream`'s timeline marks).
  Requires the abstraction lift to be done first.
- **Verify Tavus phoneme-input claim.** Adapter has the
  `TODO O5c-S2` marker; S2 didn't touch live Tavus calls (out-of-band
  rating only), so the claim verification rolls into S3's live trigger
  work. If Tavus accepts a phoneme/viseme channel, re-open O5d.

## Operator actions

No new operator actions added by S2 beyond what S1 already owed:

- Apply `prisma/sql/10-add-avatar-eval-run.sql` via Supabase. **The
  harness 500s on writes without it.** SQL was printed inline in the
  S1 chat close.
- `TAVUS_API_KEY` in Vercel only matters once S3 wires live
  triggers; S2 is fine without it (the harness is vendor-agnostic
  and just records what the operator types).

## Notes

- The `beforeAll` pre-warm pattern (timeout 60s) is worth adopting
  in any new admin-route test file with a heavy module graph (Prisma
  + Zod + auth + rate-limit). Saves ~14s per test on cold-start.
- Catalog is append-only by design. Five long-form scripts are
  domain-relevant (pitch coach, valuation walkthrough, deal
  protection, heart-recovery, London relocation) so the vendor
  ranking reflects real Olivia content shape, not generic narration.
