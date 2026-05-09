# Session Log — 2026-05-09 — Track O5c S3 — Decision rubric + live triggers

> Single-session scope, opened from `c5ee644` (the post-S2 backport
> tip). S3 of a 3-session track per `docs/HANDOFF.md §6` and
> `docs/O5_AVATAR_LIPSYNC_RESEARCH.md §5`. Founder authorized a
> **lighter S3** mid-batch — defer the 867-line `OliviaVideoAvatar`
> abstraction lift to a follow-up because it's a refactor of working
> production code; ship the user-visible value (rubric + live
> triggers + Tavus verification) here.

## What shipped

- `src/lib/avatar/liveavatar.ts` — thin adapter so `liveavatar` is a
  first-class entry in the abstraction. `isLiveAvatarConfigured()`
  (gates on both `LIVEAVATAR_API_KEY` and
  `LIVEAVATAR_OLIVIA_AVATAR_ID`), `getLiveAvatarPublicConfig()`
  (returns the avatar id, never the secret), and the
  `LIVEAVATAR_SPEAK_STREAM_PATH` constant the harness imports for its
  live-trigger button. Doc note explains why this file is intentionally
  thin (the WebSocket lifecycle stays in `OliviaVideoAvatar` until the
  full lift lands).
- `src/lib/avatar/decision-rubric.ts` — pure functions for vendor
  ranking. `aggregateRunsByVendor` reduces raw runs to per-vendor
  median latency + mean MOS + mean cost. `rankVendors` applies
  `latency × 0.4 + MOS × 0.4 + cost × 0.2` with latency + cost
  inverted (lower is better), normalised to [0, 1] within the
  candidate set, returns sorted by composite. `DEFAULT_RUBRIC_WEIGHTS`
  is exported so the page can render the formula it's actually using.
- `src/app/admin/avatar-eval/decision/page.tsx` — read-only ranking
  view. Pulls runs from `/api/admin/avatar-eval/runs`, applies the
  rubric, renders ranked table with per-component breakdown so the
  operator can see *why* a vendor ranked where it did. Vendors
  awaiting MOS scores get a separate panel (excluded from the
  ranking — composite is incomparable without MOS).
- `src/app/admin/avatar-eval/page.tsx` — added "Run live (TTFM)"
  button visible only when vendor === `liveavatar`. POSTs the script
  text to `/api/olivia/liveavatar/speak-stream`, captures
  request-start to first PCM byte via `performance.now()`,
  auto-fills the latency input. On JSON-fallback responses
  (LiveAvatar declined / not configured), surfaces the reason
  instead of writing a bogus latency. Header copy updated to point
  at the decision page.
- `src/lib/avatar/tavus.ts` — replaced the `TODO O5c-S2` marker on
  `sendTavusUtterance` with the verified finding: Tavus's REST
  conversation API accepts `{ text }` only — no documented
  phoneme/viseme metadata channel — so the O5d REJECTED conclusion
  stands for our integration. If Tavus exposes a phoneme channel at
  a different SDK tier later, re-open O5d then.
- `src/lib/avatar/__tests__/decision-rubric.test.ts` — 13 pure-function
  tests. Caught one real bug during writing: tie handling.
  `normalise(values).map(n => 1 - n)` would silently flip tied
  values from `1` to `0` and zero-out the latency/cost components.
  Fixed by pushing the inversion inside `normalise` (so ties → 1 in
  any direction). Without this, a stable-vendor candidate set would
  rank everyone at composite ≈ MOS_weight × MOS_norm.
- `src/lib/avatar/__tests__/liveavatar.test.ts` — 4 surface tests
  (module surface, configured branches for both env keys, public
  config never leaks the secret).

## Verification

- `npx tsc --noEmit` — exit 0.
- All avatar tests: 37 pass / 0 fail across 5 files (5 tavus + 8
  eval-scripts + 4 liveavatar + 13 decision-rubric + 7 runs route).
- The decision-rubric tie bug was caught in the test pass — fixed
  before commit.

## Track O5c status: closed (modulo deferred lift)

| Session | What | Status |
|---|---|---|
| **S1** | Tavus adapter + `AvatarEvalRun` Prisma model + env var + 5 smoke tests | ✅ shipped (commit `fb85c3f`) |
| **S2** | 30-script catalog + `/api/admin/avatar-eval/runs` + harness UI + 15 tests | ✅ shipped (commit `059c248`) |
| **S3** | Decision rubric + `/admin/avatar-eval/decision` + live LiveAvatar trigger + LiveAvatar adapter + Tavus phoneme verification + 17 tests | ✅ shipped (this session) |
| **Deferred** | `OliviaVideoAvatar` 867-line vendor-pluggable refactor | scope-cut from S3, lives as a follow-up "Track O5c-Lift" |

The track delivers the user-visible value (per-vendor MOS data drives
a transparent ranked recommendation; LiveAvatar gets live latency
capture) without touching the production avatar component.

## Carry-forward — when (if) the lift is done

Future "Track O5c-Lift" session would:
- Extract a `LiveAvatarHandle` interface (`connect / disconnect /
  speak / interrupt`) into `src/lib/avatar/types.ts`.
- Have each vendor adapter implement it (Tavus would actually wire
  WebRTC via `daily-co` SDK or similar; Simli has its own pattern).
- Refactor `OliviaVideoAvatar` to take a `provider` prop and dispatch
  through the abstraction.
- Wire live triggers in the harness for Tavus + Simli once they have
  real session lifecycles.
- Add per-tenant default vendor selection via `tenant_configs`.

This is genuinely 1–2 sessions of careful refactoring. The current
production avatar pipeline is unaffected.

## Operator actions owed

Unchanged from S1:
- Apply `prisma/sql/10-add-avatar-eval-run.sql` via Supabase. **Both
  `/admin/avatar-eval` and `/admin/avatar-eval/decision` 500 on the
  Prisma read/write paths without it.** SQL printed inline at S1
  close.
- `TAVUS_API_KEY` in Vercel — only relevant once the deferred lift
  wires Tavus live triggers.

## Notes

- The decision-rubric tie bug is exactly the kind of thing the
  founder hates: silent wrong math in code that makes
  business-affecting recommendations. Test pass caught it before
  commit. Worth repeating: pure-function math gets thorough unit
  tests OR it shouldn't ship.
- The "Run live (TTFM)" button measures *server pipe + ElevenLabs
  TTFB only*, not full mouth-movement latency (that requires the
  WebSocket → LiveKit render loop the harness can't observe). For
  LiveAvatar this is the dominant component (per O5a's analysis), so
  the captured TTFM is a useful proxy. For Tavus / Simli with
  vendor-side TTS + render, future live triggers would need to
  measure differently.
- The `/admin/avatar-eval/decision` page only ranks vendors with at
  least one MOS-rated run. Vendors with latency-only runs get a
  separate "Awaiting MOS" panel so the operator knows where to
  direct rating effort.
