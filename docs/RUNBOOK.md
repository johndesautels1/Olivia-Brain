# Olivia Brain — Production Runbook

> Deploy procedure, smoke tests, on-call playbook, rollback steps.
> Last updated: 2026-05-09 (Track K Session 29).
>
> **Production target:** 2026-06-02 (clueslondon + Olivia core).
> **Branch:** `main` (Vercel deploys every push).

---

## §1 · Pre-deploy checklist

Before merging anything to `main` for a production-bound deploy, verify:

| Check | Command / Source | Expected |
|---|---|---|
| Tests pass | `npm test` | All green. The chart-spec + GammaCard + vertical-adapter + CitationStrip suites must be in this. |
| Typecheck clean | `npx tsc --noEmit` | Exit 0. |
| No uncommitted changes | `git status` | "nothing to commit". |
| Latest commit is yours | `git log -1` | The last push of this batch. |
| HANDOFF.md current | `docs/HANDOFF.md` | HEAD value matches `git log -1` short hash. |
| FEATURE_INVENTORY.md current | `docs/FEATURE_INVENTORY.md` | Same as above. |

If any check fails, **do not deploy**. Fix and re-verify.

---

## §2 · Required environment variables

The Vercel project must have these set. Per `~/CLAUDE.md`'s security rules, **NEVER set secrets to "All Environments"** — secrets go Production + Preview only, marked Sensitive.

### Essential (deploy fails or core surface 500s without these)

| Variable | Scope | Notes |
|---|---|---|
| `DATABASE_URL` | Production + Preview, Sensitive | Supabase Postgres pooler URL. |
| `DIRECT_URL` | Production + Preview, Sensitive | Direct connection (used by Prisma migrations). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production ONLY**, Sensitive | Bypasses RLS — never set on Preview. |

### Auth (currently disabled — see middleware.ts inline restoration steps)

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | All Environments | Public — designed for client. |
| `CLERK_SECRET_KEY` | Production + Preview, Sensitive | Required by `clerkMiddleware()`. |

When both land, restore the canonical Clerk wiring in `middleware.ts` per the inline comment at the top of that file. `auth/session.ts` already falls through to `STUB_USER_ID` without keys.

### LLM cascade (any one of these is enough; full cascade unlocks per-intent routing)

| Variable | Scope | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Production + Preview, Sensitive | Sonnet 4.6 primary + Opus 4.6 judge. |
| `ANTHROPIC_MODEL_PRIMARY` | All Environments | Defaults to `claude-sonnet-4-6`. |
| `ANTHROPIC_MODEL_JUDGE` | All Environments | Defaults to `claude-opus-4-6`. |
| `OPENAI_API_KEY` | Production + Preview, Sensitive | GPT-5.4 secondary, also fallback for TTS/STT. |
| `GOOGLE_API_KEY` | Production + Preview, Sensitive | Gemini 3.1. |
| `XAI_API_KEY` | Production + Preview, Sensitive | Grok. |
| `PERPLEXITY_API_KEY` | Production + Preview, Sensitive | Sonar (citations). |
| `MISTRAL_API_KEY` | Production + Preview, Sensitive | Multilingual. |
| `GROQ_API_KEY` | Production + Preview, Sensitive | LPU. |
| `TAVILY_API_KEY` | Production + Preview, Sensitive | Web research (pitch helpers). |

Without any LLM key, the cascade falls back to mock mode and Olivia returns deterministic placeholder text. Demo-safe but not production-shippable.

### Voice (`/voice` and synthesize/transcribe routes)

| Variable | Scope | Notes |
|---|---|---|
| `DEEPGRAM_API_KEY` | Production + Preview, Sensitive | STT primary (sub-200ms). |
| `OPENAI_API_KEY` | Production + Preview, Sensitive | STT (Whisper) + TTS (OpenAI) fallback. |
| `ELEVENLABS_API_KEY` | Production + Preview, Sensitive | TTS primary (Olivia / Cristiano / Emelia voices). |

### Avatar lip-sync vendors (Track O5c)

| Variable | Scope | Notes |
|---|---|---|
| `TAVUS_API_KEY` | Production + Preview, Sensitive | A/B candidate alongside Simli + LiveAvatar LITE. Adapter at `src/lib/avatar/tavus.ts`. Without it, `getAvatarServiceStatus().tavus.configured = false` and the realtime selector falls back to Simli → D-ID → Tavus chain. |

### Telephony (Twilio inbound/outbound)

| Variable | Scope | Notes |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | Production + Preview, Sensitive | |
| `TWILIO_AUTH_TOKEN` | Production + Preview, Sensitive | |
| `TWILIO_PHONE_NUMBER` | All Environments | The actual outbound number. |

### Observability

| Variable | Scope | Notes |
|---|---|---|
| `LANGFUSE_PUBLIC_KEY` | Production + Preview, Sensitive | Without both Langfuse keys, `instrumentation.ts` no-ops gracefully. |
| `LANGFUSE_SECRET_KEY` | Production + Preview, Sensitive | |

### Cron + admin gate

| Variable | Scope | Notes |
|---|---|---|
| `CRON_SECRET` | Production + Preview, Sensitive | Vercel cron auth — `/api/cron/*` rejects without it. |
| `ADMIN_API_KEY` | Production + Preview, Sensitive | LiveAvatar admin endpoints (carry-forward from Track F). |

### Optional / public (safe in All Environments)

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | All Environments | Map page Google embed. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | All Environments | Map page Mapbox impl. |
| `NEXT_PUBLIC_SITE_URL` | All Environments | Used in Resend email templates. |

---

## §3 · Pending operator actions

Open at the time of writing. Apply before production:

1. SQL migrations under `prisma/sql/` — apply in order **04 → 05 → 06 → seed → 07 → 08 → 09 → 10**. Each is idempotent. Use Supabase SQL editor or `npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/NN-…sql` from a connected terminal.

   - `04-add-quantara-foundation.sql` — Track Q
   - `05-add-calendar-memory-rpc.sql` — W-014 (calendar memory pgvector function)
   - `06-add-deal-protection-foundation.sql`
   - `seed-investor-reputations.sql`
   - `07-add-counter-term-sheets.sql`
   - `08-add-documents-engine-write-surface.sql`
   - `09-add-documents-foundation.sql`
   - `10-add-avatar-eval-run.sql` — Track O5c session 1 (avatar A/B harness foundation)

   After applying `10-add-avatar-eval-run.sql`, optionally seed sample data so the harness + decision pages render meaningful content out of the box:

   ```powershell
   npx tsx scripts/seed-avatar-eval-demo.ts          # seed ~30 rows
   npx tsx scripts/seed-avatar-eval-demo.ts --clean  # remove demo rows
   ```

   See `scripts/README.md` for the per-script convention.

2. Set Clerk env vars (see §2 Auth) **then** restore `middleware.ts` per its inline comment.

3. Pause Supabase free-tier auto-pause if visible — production should be on a paid tier.

---

## §4 · Deploy procedure

Vercel deploys from `main` automatically. There is no manual deploy step.

**To ship:**

1. Verify §1 checklist passes locally.
2. `git push origin main` — that's the deploy.
3. Watch the Vercel build at https://vercel.com/clues-desautels-projects/olivia-brain.
4. On green build, run §5 smoke tests against the production URL.
5. On red build, triage per §7 — common failures and fixes.

**Never skip §1.** Pushing broken code to `main` = production downtime in seconds.

---

## §5 · Smoke tests (run after every deploy)

| # | Surface | Action | Pass criterion |
|---|---|---|---|
| 1 | `/` | Open the page | Hero orb breathes; KPI tiles paint; suggestion chips visible; ⌘K opens palette; `?` opens shortcuts |
| 2 | `/` composer | Type "What can you help with?" + ⏎ | Reply streams in token-by-token; orb cycles thinking → speaking → idle; lastReply blockquote renders |
| 3 | `/` chart manifestation | Click "London Series A by sector" suggestion + ⏎ | Reply includes a chart-fence rendering; recharts visualization paints inline |
| 4 | `/voice` | Tap mic; speak "Hello Olivia"; tap mic again | Orb listening → thinking → speaking; transcript surfaces; reply audio plays (if TTS configured) |
| 5 | `/calendar` | Open page | Calendar surface paints (LTM-ported) |
| 6 | `/map` | Open page | London tech districts paint |
| 7 | `/admin` | Open page | 250-agent dashboard paints |
| 8 | `/api/health` | curl | 200 OK; provider list with `configured` flags |
| 9 | `/api/home/dashboard` | curl | 200 OK; KPI + recent shape; `Cache-Control: public, max-age=45...` header present |
| 10 | `/api/home/score-chips` | curl | 200 OK; CSC/AGO/CSR shape |

Fail any of these = consider rollback per §6.

---

## §6 · Rollback procedure

Vercel keeps every deploy live. **No code change needed to roll back.**

1. Open https://vercel.com/clues-desautels-projects/olivia-brain/deployments.
2. Find the last known-good deployment (green badge, smoke tests passed).
3. Click ⋯ → "Promote to Production".
4. Confirm. The production domain swaps in ~30s.
5. File a follow-up issue documenting why the bad deploy shipped.

If the bad deploy already corrupted production data (rare — most things are read-only or scoped):

1. Identify the corrupted table(s) from the deploy diff.
2. Restore from the most recent Supabase point-in-time backup (paid tier required).
3. Roll back the deployment per above.
4. Manually replay any user actions lost in the rollback window.

---

## §7 · On-call playbook (common 5xx causes)

### `MIDDLEWARE_INVOCATION_FAILED`
- **Cause:** Edge runtime crash, usually Clerk init without keys or instrumentation.ts pulling Node-only modules.
- **Fix:** Both fixes are committed (`727a74c` middleware Clerk-free, `fc1d645` instrumentation deferred). If this returns, check that those commits are still on main.
- **If new:** Check the latest deploy's runtime logs at vercel.com → Functions → middleware. The first error line names the missing symbol.

### `Type error: ... not assignable to type ...` at build time
- **Cause:** Schema field rename or enum change without updating callsites.
- **Past examples:** `ValuationSubject.companyName` (not `name`); `Document.status` `DocStatus` enum (`active`, not `"ready"`).
- **Fix:** Run `npx tsc --noEmit` locally, fix all errors, push.

### `[ReferenceError: __import_unsupported is not defined]`
- **Cause:** Edge runtime tried to bundle a Node-only module. Usually instrumentation.ts or a top-level import in middleware.
- **Fix:** Defer the import. Pattern: dynamic `await import(...)` inside an async function, gated by `NEXT_RUNTIME === "nodejs"`.

### Olivia returns "I'm momentarily offline" / mock-mode placeholders
- **Cause:** No LLM key configured for any cascade provider, or all configured providers are returning errors.
- **Triage:**
  1. `/api/health` → check `runtimeMode` and `providers[].configured`.
  2. If `runtimeMode === "mock"` → set at least one of `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / etc.
  3. If `runtimeMode === "live"` but reply is still mock → check Vercel function logs for provider errors. Common: rate limit, invalid key, model id mismatch.

### Voice mode: "STT not configured" 503
- **Cause:** Neither `DEEPGRAM_API_KEY` nor `OPENAI_API_KEY` set.
- **Fix:** Set one. Deepgram is preferred for sub-200ms latency.

### Voice mode: TTS doesn't play audio (text reply only)
- **Cause:** Neither `ELEVENLABS_API_KEY` nor `OPENAI_API_KEY` set, or TTS provider returned an error.
- **Fix:** Set one; check `/api/voice/synthesize` logs.

### Vercel cron 401
- **Cause:** `CRON_SECRET` not set, or the cron's Authorization header doesn't match.
- **Fix:** Set `CRON_SECRET` in Vercel env vars; Vercel injects it into cron triggers automatically.

### `429 Too Many Requests` on `/api/olivia/chat` or `/voice/*`
- **Cause:** Rate limit hit. The in-memory limiter is per-function-instance, so on Vercel's cold-start fanout, 30/min/IP is conservative.
- **Triage:** Real abuse → check the IP. Accidental loop → check the client (probably an unbounded `useEffect`).
- **Fix:** Adjust the `RATE_LIMIT.limit` constant in the offending route OR migrate to Upstash Redis for shared state across instances.

---

## §8 · Cost-vector dashboards

Olivia has 4 paid-vendor surfaces. Watch these dashboards weekly during the first month post-launch:

| Surface | Vendor | Where to check |
|---|---|---|
| LLM cascade | Anthropic | console.anthropic.com → Usage |
| LLM cascade | OpenAI | platform.openai.com → Usage |
| TTS | ElevenLabs | elevenlabs.io → Usage |
| STT | Deepgram | console.deepgram.com → Usage |
| Web research | Tavily | app.tavily.com → API Keys → Usage |

If any of these spike >2× baseline overnight: check `/api/home/dashboard` recent activity. Likely cause is an accidental client-side loop or a tenant misuse pattern. Tighten the relevant route's rate limit (S27 sets baselines).

---

## §9 · Reference

| Doc | Purpose |
|---|---|
| `~/CLAUDE.md` | Absolute-priority rules (privacy contract, never set All Environments, no local builds, etc.) |
| `docs/OLIVIA_NORTH_STAR.md` | The single question every commit answers. |
| `docs/00_PRODUCT_TRUTH.md` | Product hierarchy + bicycle-wheel architecture. |
| `docs/01_UI_DESIGN_SYSTEM.md` | Tokens, motion, modular workspace, multi-agent visualization. |
| `docs/HANDOFF.md` | Current open work + carry-forwards. |
| `docs/FEATURE_INVENTORY.md` | Comprehensive feature snapshot + roadmap. |
| `docs/BUILD_SEQUENCE.md` | Session-by-session plan. |
