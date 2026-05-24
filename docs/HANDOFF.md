# Olivia Brain — Handoff to next agent

> **Last updated:** 2026-05-25 (Cristiano dashboard batch close — 8 OB commits + 1 lifescore backport)

---

## 🤝 TODAY'S BATCH — 2026-05-25 — Cristiano dashboard (8 OB commits + lifescore Opus backport)

The 5 architecture pieces founder approved 2026-05-25 ("all 5 need done") are
shipped. Three sub-tabs (Ask / Library / Inbox), one judge brain
endpoint, one verdict-library endpoint, one gateway push endpoint
with constant-time bearer auth, one imperative `presentVerdict()`
method on the avatar component, vendor-neutral discriminated-union
envelope, and a Prisma model with idempotent unique-constraint
lookup.

### Commit table

| # | Hash (OB) | What |
|---|---|---|
| C1 | `f41548e` | Foundation — `CristianoVerdictV1` envelope + Zod validators + SHA256 idempotency hash + Prisma model + inline SQL migration |
| C2 | `5c7b20c` | Judge brain — `lib/cristiano/brain.ts` + `lib/cristiano/persist.ts` + `POST /api/cristiano/judge` (claude-opus-4-7, 3 per-kind handlers, Result-typed) |
| C3 | `4948194` | Verdict list + detail endpoints — `GET /api/cristiano/verdicts` + `GET /api/cristiano/verdicts/[id]` |
| C4 | `bc268f2` | Gateway bearer auth — `lib/gateway/auth.ts` (constant-time `timingSafeEqual`) + `POST /api/gateway/cristiano/verdicts` + 8 `GATEWAY_TOKEN_*` env vars |
| C5 | `0121c7c` | `OliviaVideoAvatarRef.presentVerdict(script, options)` imperative method — one-shot speak, autoDisconnect, typed outcome |
| C6 | `9a5391b` | `CristianoVerdictPlayer` + `VerdictLibrary` + `GatewayInbox` (one shared player, two play modes — live LiveAvatar / pre-rendered MP4) |
| C7 | `d25e3c1` | `AskCristiano` form — 3-kind picker, per-kind validation, submit → judge → live narrate |
| C8 | (this commit) | `CristianoDashboard` parent + `/cristiano` route + HANDOFF docs |

### lifescore backport (separate repo)

| # | Hash (lifescore) | What |
|---|---|---|
| L1 | `73b216b` (lifescore main) | `chore(judge): bump Opus model claude-opus-4-6 -> claude-opus-4-7` — 10 files (7 prod sites, 2 tests, 1 pricing table + 6 docs), 100/100 lifescore tests green, retains deprecated 4-6 pricing entry for historical Supabase rows. Now LTM + OB + lifescore all aligned on Opus 4.7 / Sonnet 4.6. |

### Architecturally closed this batch

- ✅ `CristianoVerdictV1` discriminated-union envelope (kinds: startup_match / city_compare / freeform) with kind-aware Zod request + body schemas
- ✅ `cristiano_verdicts` Prisma model with `@@unique([userId, requestHash])` idempotency constraint + inline SQL migration `prisma/sql/14-add-cristiano-verdict.sql`
- ✅ Opus 4.7 judge brain — 3 per-kind handlers with Result-typed Returns, tolerant JSON extraction, Zod re-validation of LLM output
- ✅ List + detail endpoints with keyset pagination
- ✅ Gateway bearer auth — 8 source-app tokens, constant-time `timingSafeEqual` compare, cross-app forgery guard at the route handler
- ✅ One-shot `presentVerdict()` pattern on `OliviaVideoAvatar` (distinct from Olivia's reactive `lastReply` chat loop)
- ✅ Three sub-tab UI: Ask Cristiano (submit + live narrate) / Verdict Library (replay archive) / Gateway Inbox (poll for pushes every 30s)
- ✅ `/cristiano` standalone route + embeddable `<CristianoDashboard />` component
- ✅ Cross-repo model alignment: LTM `claude-opus-4-7` + OB `claude-opus-4-7` + lifescore `claude-opus-4-7` (was 4-6)

### Test results this batch

- C1: 36/36 new (types + hash)
- C2: +9 new (judge route surface)
- C3: +11 new (list 5 + detail 6)
- C4: +27 new (gateway auth 13 + push route 14)
- C5: regression-only — 108/108 olivia + studio + avatar still green
- C6: +13 new (player + library + inbox smoke)
- C7: +10 new (AskCristiano form + submit)
- C8: +13 new (dashboard parent + tab nav + accessibility)
- **Full batch cumulative: 118/118 green** across `src/lib/cristiano`, `src/lib/gateway`, `src/app/api/cristiano`, `src/app/api/gateway`, `src/components/cristiano`
- lifescore: 100/100 green after backport (31 costCalculator tests + 69 others)
- `npx tsc --noEmit --incremental` — clean after every OB commit

### Founder direction locked 2026-05-25 (verbatim)

> "all 5 need done and you need to carefully line by line meeting all 2026
> microsoft apple ibm and google latest code standards implement all 5
> remembering never to touch the code in those other apps"

> "commit to github then backport lifescore and make sure you commit to
> the right repro then finish c8"

> "He doesnt talk to people just like a judge he renders decsioins
> verdicts and reccomendations" (locked the persona separation)

> "stay out of ltm" (preserved from 2026-05-23 — LTM walled garden held throughout this batch)

### Operator actions OWED to fully activate the Cristiano dashboard

#### Apply the SQL migration (Supabase SQL editor → OB production)

Run this against `db.lumfvloapckluhzvtgdn.supabase.co` (OB production). Idempotent — re-running is safe via `IF NOT EXISTS` guards.

```sql
CREATE TABLE IF NOT EXISTS "cristiano_verdicts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceApp" TEXT NOT NULL DEFAULT 'ob',
    "externalId" TEXT,
    "requestPayload" JSONB NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "verdictBody" JSONB NOT NULL,
    "spokenScript" TEXT NOT NULL,
    "verdictTitle" TEXT NOT NULL,
    "preRenderedVideoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "durationSeconds" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "errorMessage" TEXT,
    "modelUsed" TEXT,
    "tokenInputCount" INTEGER,
    "tokenOutputCount" INTEGER,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "cristiano_verdicts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cristiano_verdicts_userId_requestHash_key"
    ON "cristiano_verdicts" ("userId", "requestHash");
CREATE INDEX IF NOT EXISTS "cristiano_verdicts_userId_createdAt_idx"
    ON "cristiano_verdicts" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "cristiano_verdicts_userId_kind_idx"
    ON "cristiano_verdicts" ("userId", "kind");
CREATE INDEX IF NOT EXISTS "cristiano_verdicts_sourceApp_externalId_idx"
    ON "cristiano_verdicts" ("sourceApp", "externalId");
```

#### Set per-app gateway tokens on Vercel (Production + Preview, marked Sensitive)

Set as each linked app comes online. Recommended token format: 32+ random bytes (e.g. `openssl rand -hex 32`). Rotate independently per app.

```
GATEWAY_TOKEN_LTM
GATEWAY_TOKEN_LIFESCORE
GATEWAY_TOKEN_CLUESLONDON
GATEWAY_TOKEN_CLUESINTELLIGENCE
GATEWAY_TOKEN_CLUESXSCORE
GATEWAY_TOKEN_HEART_RECOVERY
GATEWAY_TOKEN_PROPERTY_SEARCH
GATEWAY_TOKEN_TRANSIT
```

Until tokens are set, the gateway endpoint returns clean 503 "Gateway tokens not configured" — no broken UX.

### Recommended next pickups

1. **Mount `<CristianoDashboard />` inside the existing Ask Olivia surface** (separate commit; the dashboard route stands alone today at `/cristiano`).
2. **LTM gateway publisher backport** (separate LTM session — walled-garden out of this batch) — add `POST /api/gateway-publish` in LTM that fires verdicts at OB's `/api/gateway/cristiano/verdicts`. Once that lands, LTM's Cristiano top-3 matches appear in OB's Gateway Inbox automatically.
3. **lifescore gateway publisher backport** (separate lifescore session) — same pattern, fires HeyGen Video Agent V2 MP4 URL + city-compare verdict at OB.
4. **`/cristiano?tab=...` deep-link** — query-string driven initialTab — wire via Next's `useSearchParams`. Low effort, high utility for cross-app navigation.
5. **User-app linkage table + per-user authorization** — deferred per `lib/gateway/auth.ts` threat-model note. When a single OB user can be addressed by multiple gatewayed apps, we need a lookup that asserts "yes, LTM is allowed to act on behalf of user X."
6. **WCAG/APCA audit on the new Cristiano surfaces** — mirror the 2026-05-23 audit pattern.

### EXCLUDED / BLOCKED (unchanged from 2026-05-23)

- **Track L cluesintelligence** — EXCLUDED until founder unlocks
- **LTM code edits** — walled garden, no exceptions

---

> **Prior session header (2026-05-24 LiveAvatar persona batch — 6 commits) preserved below for cross-batch context.**

> **Last updated:** 2026-05-24 (LiveAvatar persona batch close — 6 commits) — **Olivia ⇄ LTM parity verified (forward-port C1 = no-op, OB is at LTM contract + beyond) + persona-aware LiveAvatar LITE pipeline (single pipeline, two personas — Olivia + Cristiano) + `OliviaVideoAvatar` accepts `personaId` prop + Cristiano cinematic verdict mounted in `CristianoReEvaluation` + `HEYGEN_LTM_CONFIG.md` § 0 addendum + consent route 2026-bar fix (JSON guard, auth-misconfig 503).**

---

## 🤝 TODAY'S BATCH — 2026-05-24 — LiveAvatar persona pipeline (6 commits since `1458d90`)

| # | Hash | What |
|---|---|---|
| 1 | `304b24c` | test(api/olivia/consent): surface-contract route tests (11 cases) |
| 2 | `70ec03d` | fix(api/olivia/consent): 2026-standard error contracts at boundaries — JSON parse 500 → 400 + auth misconfig 500 → 503 via new `requireUserOrResponse` helper modeled on canonical `requireAdmin()` from admin/investors; test suite grew to 15 cases |
| 3 | `6868f0e` | **feat(avatar): persona-aware LiveAvatar LITE pipeline (Olivia + Cristiano)** — new `src/lib/avatar/personas.ts` Result-style resolver + `LIVEAVATAR_CRISTIANO_AVATAR_ID` + `ELEVENLABS_CRISTIANO_VOICE_ID` env vars (defaults set per LTM ref) + persona-param threading through `createSessionToken(personaId)` + 3 routes (`/api/olivia/liveavatar`, `/speak`, `/speak-stream`) + `createLiveAvatarLiveHandle({ personaId })` + 15 unit tests covering eligibility / Zod / Result branches / throw-on-miss. Backwards compatible: every parameter defaults to "olivia". |
| 4 | `4f91eab` | **feat(olivia-video-avatar): persona-aware UI labels + handle wiring** — `OliviaVideoAvatar` accepts optional `personaId` prop (default "olivia"). Per-persona display copy via `PERSONA_LABELS` table (connect button, status pills, recording filename prefix). `aria-hidden` on decorative SVG. |
| 5 | `cc03204` | **feat(studio/cristiano-re-evaluation): mount LiveAvatar verdict (Cristiano)** — replaces CSS-pulse placeholder with `<OliviaVideoAvatar ref personaId="cristiano" lastReply={narrative} />`. Pre-connects during analysis animation so cinematic verdict speaks immediately at phase 5 (no 2-5s gap between "Re-evaluation Complete" and Cristiano speaking). Explicit disconnect on dialog close to be a good LiveAvatar-credit citizen. Verdict text remains rendered below the video as accessibility fallback. `role="region"` + `aria-label="Cristiano's verdict"`. |
| 6 | **(this commit)** | **docs(handoff + heygen-config): persona dimension + batch close** — `HEYGEN_LTM_CONFIG.md` gains § 0 addendum documenting the persona refactor + locked architectural decisions + env-var transfer checklist; THIS file gains this entry. |

### Architecturally closed this batch

- ✅ Consent route at 2026 bar (15/15 tests, JSON-parse guard, auth-misconfig 503 via `requireUserOrResponse` helper)
- ✅ Persona-aware LiveAvatar LITE pipeline (Olivia + Cristiano on a single pipeline; adding a third persona is a 3-step diff with TS-enforced exhaustiveness)
- ✅ Cristiano cinematic verdict shipped in `CristianoReEvaluation` (auto-connect during analysis → real-time speak at phase 5 reveal)
- ✅ `HEYGEN_LTM_CONFIG.md` extended with § 0 persona dimension + § 0 env-var transfer checklist
- ✅ Forward-port-from-LTM verified at C1 — OB's `lib/olivia/liveavatar.ts` + `/api/olivia/liveavatar/*` are at LTM byte-for-byte parity (and beyond — OB has the `createLiveAvatarHandle` lift + streaming TTS variant LTM doesn't). C1 was a no-op.

### Test results this batch

- 78/78 tests green after C2 (avatar + liveavatar + consent + chat)
- 113/113 tests green after C3 (above + studio + olivia component suites)
- 108/108 tests green after C4 (Cristiano mount didn't break PreparationStudio smoke)
- 15/15 new personas resolver tests pass
- 15/15 consent tests pass (up from 11 after auth-503 + strict-400 additions)
- `npx tsc --noEmit --incremental` clean after every commit

### Founder direction locked 2026-05-24 (verbatim)

> "we must meet 2026 best coding standards with apple ibm microsoft and google"

> "the LTM Olivia heygen live avatar is 100% fully wired correctly. If you forward port that into this olivia brain we have a turn key live olivia"

> "for cristiano we should have cloned the olivia wiring in the ltm app for cristiano"

> "we do have all and i mean all the env variables but they are in vercel in the LTM app. I can transfer them over"

> "this olivia app will backport some components and integrate into LTM but it will also become a free standing app and an app that plugs into many other apps"

> "stay out of ltm" (preserved from 2026-05-23)

### Operator actions OWED to make Cristiano render

Transfer from LTM Vercel to OB Vercel — Production + Preview, marked Sensitive per `~/CLAUDE.md`:

```
LIVEAVATAR_API_KEY                = <same as LTM — shared LiveAvatar account>
LIVEAVATAR_OLIVIA_AVATAR_ID       = <Olivia's LiveAvatar UUID>
LIVEAVATAR_CRISTIANO_AVATAR_ID    = <Cristiano's LiveAvatar UUID — founder confirmed they have it>
ELEVENLABS_API_KEY                = <same as LTM>
ELEVENLABS_OLIVIA_VOICE_ID        = rVk0ZvRulp6xrYJkGztP (per HEYGEN_LTM_CONFIG.md § 4)
ELEVENLABS_CRISTIANO_VOICE_ID     = <Cristiano's voice — default yoZ06aMxZJJ28mfd3POQ already shipped; override if LTM has a different value>
```

The Cristiano voice id has a sensible default in `lib/config/env.ts`, so only `LIVEAVATAR_CRISTIANO_AVATAR_ID` is hard-required for the cinematic verdict moment. Without it, the avatar shows a clean 503 with the missing-var name in the payload and the verdict text remains rendered as the accessibility fallback — no broken UX.

### Recommended next pickups (founder direction: strictly OB-internal, no LTM, no cross-app, no Track L)

1. **Mount Cristiano in more surfaces** — `WarRoom.tsx` / `WarRoomBriefing.tsx` / `ValuationWorkbench.tsx` / `PreparationStudio.tsx`. Same pattern as `CristianoReEvaluation` (commit `cc03204`). One commit per surface.
2. **More `olivia/*` route tests** — 21 routes still untested after consent shipped (calendar entries / prep-tasks / attendees / analytics / sync / voice sub-routes / call sub-routes / presentation).
3. **Architecture Standards Law audits** — Law 5 (`dataSources` metadata on agents), Law 6 (regulatory constants in `src/lib/regulatory-config/` with `validUntil`), Law 8 (schema-first at every boundary).
4. **S30 deploy prep doc** — walk `docs/RUNBOOK.md`, write a precise pre-deploy checklist (11 owed SQL migrations + Vercel env vars + smoke-test plan).
5. **Plug-in contract for embedded OB in LTM** — React context provider OR `@olivia/avatar-config` package. Currently deferred per founder Option C choice 2026-05-24.
6. **`callLLMWithTools` provider expansion** — currently Anthropic-only. OpenAI + Gemini tool-calling extension when a consumer surface needs it.

### EXCLUDED / BLOCKED (unchanged from 2026-05-23)

- **Track L cluesintelligence** (~10 sessions, FLAGSHIP) — EXCLUDED until founder unlocks
- **Track H S22-S23** (4 remaining LTM handlers) — BLOCKED by walled-garden
- **`@olivia/design-system` code extraction** — pending founder confirmation on 5 open questions in `05_DESIGN_SYSTEM_PACKAGE_SPEC.md § 9`
- **Phase 4 cascade injector** — DEFERRED until consumer surface lands
- **Any LTM repo edits** — walled garden, no exceptions

---

> **Prior session header (2026-05-23 mega-batch — 25 commits) preserved below for cross-batch context.**

> **Last updated:** 2026-05-23 (mega-batch close, 25 commits) — **Track N closed + AGENTS.md drop + WCAG audit Phases 1+2+3 + regression guard + design-system spec + Architecture Standards Law 3 fully closed (5/5 raw-fetch sites + new `callLLMWithTools` API) + reply-renderer testing triangle complete (parser + mount + integration for 7/7 fences) + streaming chat route + intent classifier + cascade orchestrator branch coverage all tested.**
>
> **🤝 GITHUB REPO:** **https://github.com/johndesautels1/Olivia-Brain** — clone via `git clone https://github.com/johndesautels1/Olivia-Brain.git "D:\Olivia Brain"`. Branch: `main`. Vercel auto-deploys from main in ~90s with no staging gate.
>
> **Working tree:** clean on `main`. `npx tsc --noEmit --incremental` clean on touched files; full sweep deferred to Vercel deploy. **>490 vitest cases green** across reply-renderer triangle (159) + orchestration (106) + agents + LLM + callLLMWithTools (33) + olivia/chat (sync + stream = 30) + valuation routes (11) + a11y source-scan guard (4) + a stack of pre-existing suites.
>
> **Latest HEAD:** `c408e20` before this handoff commit (cascade orchestrator gap tests); will move forward when this push lands.
>
> **Status:** Every action in `docs/02_COMPETITIVE_FEATURE_MATRIX.md § 3` queue (Actions 1 + 2 + 3 + 4) CLOSED. All 30 WCAG audit findings remediated + regression guard installed at `src/lib/evaluation/a11y-source-guard.test.ts`. All 5 Architecture Standards Law 3 raw-fetch violations closed (`callLLM` covers text-only, new `callLLMWithTools` covers agentic Anthropic tool-loop). Reply-renderer testing triangle complete. Critical streaming chat route + intent classifier + cascade orchestrator branches all have explicit test coverage.
>
> **🤝 NEXT AGENT — READ THE INLINE HANDOFF IN CHAT BEFORE ANYTHING ELSE.** The chat-pasted version of this handoff carries the full mandatory-reading-order (with line counts), the verbatim Google/IBM/Apple/Microsoft 2026 standards table, the Stop-Means-Stop override, the § 0 verify commands, the 11 owed SQL migrations, and the explicit EXCLUDED/BLOCKED list. The file version below has the cumulative cross-batch detail.
>
> **Founder direction (locked 2026-05-23 end-of-day, verbatim):** "stay out of ltm" + "we are not doing anything that touches another app" + "must meet apple microsoft google ibm 2026 leading coding standards" + "no breaking changes" + "test end to end" + "read every line." Strictly OB-internal work; no cross-app integration; no Track L cluesintelligence until founder unlocks.
>
> **Prior batches (2026-05-17 + 2026-05-11) summary preserved below.**

### Today's mega-batch (2026-05-23 — 25 commits + this handoff since `40c215c`)

Full 25-commit table preserved below from the prior in-batch refresh — see "Today's mega-batch (2026-05-23 — 15 commits since `40c215c`)" further down. The post-15-commit tail added 10 more commits in this order:

| # | Commit | Concern |
|---|---|---|
| 16 | `bc562d8` | HANDOFF.md refresh #2 (the 15-commit reconciliation) |
| 17 | `b52f3a1` | refactor(valuation): score-rubric → `callLLM` — Law 3 cleanup 1/5 |
| 18 | `b24a326` | refactor(calendar): 3 raw-fetch sites → `callLLM` — Law 3 cleanup 2-4/5 |
| 19 | `bcd5692` | feat(agents/llm): **`callLLMWithTools`** new API + Law 3 closure 5/5 |
| 20 | `e90f517` | test(reply-renderer): mount tests for 6 of 7 fences |
| 21 | `b809bbd` | test(reply-renderer): ChartFromSpec mount tests + ResizeObserver shim — 7/7 fences |
| 22 | `98d987d` | test(reply-renderer): MarkdownReply integration tests — triangle complete |
| 23 | `b702fa8` | test(api/olivia): streaming chat route tests — zero-coverage gap closed |
| 24 | `e35ed77` | test(orchestration): inferIntent classifier tests — zero-coverage gap closed |
| 25 | `c408e20` | test(cascade): orchestrator gap tests (Tavily / Companies House / mixed Phase 1 / readyForInjection / lastCollectionDate) |
| 26 | (this commit) | **HANDOFF.md final refresh** — this very entry |

### Architecturally closed this mega-batch — full summary

  - ✅ All 4 competitive-matrix actions (1+2+3+4 from `docs/02_COMPETITIVE_FEATURE_MATRIX.md § 3`)
  - ✅ All 30 WCAG audit findings (17 HIGH `outline:"none"` + 10 MEDIUM 9× `transition:all` + 1× missing aria-label + 2 LOW `<div role="button">` → native `<button>`)
  - ✅ A11y source-scan regression guard at `src/lib/evaluation/a11y-source-guard.test.ts`
  - ✅ Architecture Standards Law 3 — all 5 raw-fetch-to-LLM violations across `src/app/api/valuation/...` + `src/lib/calendar/...` closed; new `callLLMWithTools` API added in `src/lib/agents/llm.ts` for agentic tool-loop calls
  - ✅ Reply-renderer testing triangle — parser tests (110) + mount tests (29) + integration tests (20) for all 7 fence languages (chart / gamma / sources / timeline / map / ui / comparison)
  - ✅ Critical zero-coverage paths now covered: streaming chat route, intent classifier, cascade orchestrator branches (Tavily / Companies House / mixed Phase 1 / readyForInjection invariant / lastCollectionDate threading)

### Recommended next pickups (founder direction: strictly OB-internal, no LTM, no cross-app, no Track L)

  1. **More olivia/* route tests** — 22 routes still untested (calendar entries / prep-tasks / attendees / analytics / sync / voice sub-routes / call sub-routes / presentation). ~3-4 tests per route, single-session per route.
  2. **Architecture Standards Law audits** — Law 5 (`dataSources` metadata on agents), Law 6 (regulatory constants in `src/lib/regulatory-config/` with `validUntil`), Law 8 (schema-first at every boundary). Surface findings + remediate per founder approval.
  3. **S30 deploy prep doc** — walk `docs/RUNBOOK.md`, write a precise pre-deploy checklist (11 owed SQL migrations + Vercel env vars + smoke-test plan).
  4. **`callLLMWithTools` provider expansion** — currently Anthropic-only. OpenAI + Gemini tool-calling extension when a consumer surface needs it.

### EXCLUDED / BLOCKED

  - **Track L cluesintelligence** (~10 sessions, FLAGSHIP) — EXCLUDED until founder unlocks
  - **Track H S22-S23** (4 remaining LTM handlers) — BLOCKED by walled-garden
  - **`@olivia/design-system` code extraction** — pending founder confirmation on 5 open questions in `05_DESIGN_SYSTEM_PACKAGE_SPEC.md § 9`
  - **Phase 4 cascade injector** — DEFERRED until consumer surface lands

---

### Today's mega-batch (2026-05-23 — 15 commits since `40c215c`)

| # | Commit | Lines | What |
|---|---|---|---|
| 1 | `6845239` | +1,007 | **Track N N2** — `map` fence. Mapbox manifestation, 3 intents (cities / pin / districts), auto-fit bounds OR fly-to, graceful degrade to list card when `NEXT_PUBLIC_MAPBOX_TOKEN` missing. 21 new parser tests. |
| 2 | `8feb31d` | +950 | **Track N N4-foundations** — `ui` fence. Safe registry rendering of card / stat / progress / button primitives. Strict http(s)-only allowlist on button hrefs (parser-enforced — `javascript:` + `data:` + scheme-relative rejected). 26 new parser tests. |
| 3 | `48edc40` | +798 | **Comparison fence** (competitive-matrix Action 2). 2-3 column side-by-side with optional verdict + winner highlight. The cluesxscore primitive — powers all 23 mini-app verdicts, cluesintelligence top-3, Deal Protection offer-vs-offer, Quantara round-axis. 21 new parser tests. |
| 4 | `1484c6b` | +307 | **`AGENTS.md` at repo root** (competitive-matrix Action 1). 307-line standing-rules synthesis pulled from `~/CLAUDE.md` + canonical docs + locked feedback memories. Every future coding agent reads it first. |
| 5 | `d0616b9` | +29 −2 | **HANDOFF.md § 2 reconciliation #1** — added Track C (S14-S19) + Track V (V1-V9) + Track G (S19-S20) + Track H S21 + Track B 8d-routes-2 + Track Calendar + full Track O O5c-Lift to the closed list. Caught by archaeology — the doc had been stale for 16 days. |
| 6 | `ae4fe57` | +66 −1 | **Golden eval cases for the 3 new fences.** Extended `ManifestFence` type (4 → 7 values); 3 new GOLDEN_CASES entries; 3 new FENCE_PATTERNS in golden-runner. Closes the eval validation loop for the system-prompt teaching landed in commits 1-3. |
| 7 | `b3192c8` | +351 | **`docs/04_ACCESSIBILITY_AUDIT_2026-05-23.md`** (competitive-matrix Action 4 — audit deliverable). 30 findings across 15 files: 18 HIGH (`outline: "none"` overrides) + 10 MEDIUM (9× `transition: all` + 1 div-as-button missing aria-label) + 2 LOW. Phased remediation plan in § 8 of the audit. |
| 8 | `729d193` | +48 −5 | **HANDOFF.md mid-batch handoff** (later mid-batch — superseded by THIS commit). |
| 9 | `397835a` | −7 | **WCAG Phase 1 — Quantara cluster.** 7 HIGH-severity `outline: "none"` removals across `IntakeField.tsx` + `IntakeForm.tsx` + `IntakeSupplementaryField.tsx`. The 56-field founder questionnaire now shows the canonical Aurum focus ring under keyboard navigation. 58/58 quantara tests green. |
| 10 | `f803521` | −5 | **WCAG Phase 1 — Studio cluster.** 5 `outline: "none"` removals across `OliviaChatTab.tsx` + `LibraryTab.tsx` + `PitchCoachTab.tsx`. 35/35 studio tests green. |
| 11 | `11f6a26` | −5 | **WCAG Phase 1 — Home + Calendar + Valuation clusters.** Final 5 `outline: "none"` removals — `HomeComposer.tsx`, `CommandPalette.tsx`, `EventStatusWidget.tsx`, `CalendarPageClient.tsx`, `ValuationWorkbench.tsx`. All 17 HIGH-severity violations cleared. 149/149 affected tests green. |
| 12 | `8995c41` | +10 −9 | **WCAG Phase 2 — `transition: all` enumerations + PreMortemPanel aria-label.** 9 sites (ExternalLinkFrame, ValuationWorkbench, GlossaryTooltip, WhyThisPanel, SuggestionChips, PitchCoachTab, OliviaDisplayScreen, GoogleMapView × 2) — each enumerates the actual transition properties read from the surrounding state machine. PreMortemPanel:76 gains the missing aria-label. 178/178 affected tests green. |
| 13 | `566753e` | +13 −18 | **WCAG Phase 3 — `<div role="button">` → native `<button>`.** 2 sites (DocumentWorkspace + PreMortemPanel) converted to native button with explicit reset of browser defaults (text-left, appearance:none, font:inherit, color:inherit). Test selector updated. 57/57 affected tests green. **All 30 of 30 audit findings remediated.** |
| 14 | `7ec186e` | +249 | **a11y source-scan regression guard.** `src/lib/evaluation/a11y-source-guard.test.ts` — vitest scan that fails CI if any new `outline: "none"` / `transition: all` / `role="button"` on non-button slips in. Allowlist-sanity check ensures stale allowlist entries fail too. Structured error output cross-references the audit's fix pattern. |
| 15 | `ded8893` | +329 | **`docs/05_DESIGN_SYSTEM_PACKAGE_SPEC.md`** (competitive-matrix Action 3). The extraction-path spec for `@olivia/design-system` — file structure + token contracts + primitive APIs + theme generator + distribution + 6-consumer migration order + 5 open questions for founder. Pure spec, no code yet. **Closes the final competitive-matrix queue item.** |
| 16 | (this commit) | — | **HANDOFF.md update** — this very entry. Front-matter refreshed; full 15-commit table; recommended-next-pickup rewritten because the audit-Phase-1 recommendation in the prior version is now stale (those clusters are all closed). |

### What this mega-batch did NOT touch

- **LTM repo** (`D:\London-Tech-Map`) — walled-garden boundary preserved. Zero LTM reads or writes in this batch.
- **Prisma schema** — no schema changes. Operator migrations from prior batches still owed (§ 4 below).
- **Cascade orchestrator** (Track G S20 surface) — untouched.
- **Agent registry / handlers** — untouched.
- **23 protected paths** under `UserCompanyDeadline` — untouched.
- **Track L cluesintelligence** — EXCLUDED per founder direction 2026-05-23 until spec lock.
- **Cross-app integration code** — EXCLUDED per founder direction 2026-05-23 (end-of-day). No white-label tenant work, no LTM-OB sync, no brain-enrichment-engine cross-spoke wiring.
- **Production code in the design-system package** — Action 3 ships the SPEC only. Code extraction lands in a future session once founder confirms the 5 open questions in `05_DESIGN_SYSTEM_PACKAGE_SPEC.md § 9`.

### Architectural facts captured this batch

- **`AGENTS.md` at the repo root** is now the canonical first-read for every coding agent. It mirrors and curates `~/CLAUDE.md` + `00_PRODUCT_TRUTH.md` + `01_UI_DESIGN_SYSTEM.md` + the L1-L13 Vercel WIG rules + the locked feedback memories. Future founder rule additions to `~/CLAUDE.md` should mirror here.
- **The reply-renderer fence count is now 7** — chart / gamma / sources / timeline / map / ui / comparison. The recipe for adding an 8th is documented in `AGENTS.md § 4` (6 steps: parser → renderer → tests → MarkdownReply wire → barrel → system-prompt entry).
- **WCAG 2.2 AA + APCA foundation is excellent in `src/styles/base.css`.** 10/10 Vercel Web Interface Guidelines primitives correctly implemented. All audit findings were LOCAL component overrides that bypassed the foundation — not gaps in the foundation itself. **Phases 1+2+3 fully remediated** (commits 9-13 above).
- **The 2026 standard is now Apple / IBM / Google / Microsoft** (founder direction 2026-05-23 — IBM added to the prior Apple/Microsoft/Google list). IBM signals expectations around enterprise-grade backend discipline, supply-chain security, and accessibility leadership. The verbatim attestation in every commit + every end-of-turn summary stays the same: *"100% no breaking changes (every public API signature and behavior preserved) and 100% no partial coding (every shipped function fully implemented, tested, and operational end-to-end)."*
- **The a11y source-scan regression guard** at `src/lib/evaluation/a11y-source-guard.test.ts` (commit `7ec186e`) is the canonical mechanism for preventing the audit findings from sneaking back in. Any new violation fails CI on push with a structured error pointing at the canonical fix pattern. Allowlist entries require both a file-exists check and a pattern-still-present check — stale allowlist entries fail the test.
- **The `@olivia/design-system` package spec** (`docs/05_DESIGN_SYSTEM_PACKAGE_SPEC.md`) lays out the extraction path for every spoke app to consume the design system from a single source of truth. **Pending founder confirmation on 5 open questions in § 9** before code extraction begins.
- **The full competitive-matrix § 3 action queue is CLOSED.** Action 1 (AGENTS.md), Action 2 (comparison fence), Action 3 (design-system spec), Action 4 (WCAG audit + remediation) — all done this batch.

### Recommended next pickup (in priority order)

Founder direction 2026-05-23 end-of-day: **strictly OB-internal work, no cross-app integration, no Track L cluesintelligence.** With that constraint:

1. **TD-1 cleanup** — `src/lib/agents/impl/g2-225-video-enrichment.ts` bypasses `callLLM` with a raw `fetch("https://api.anthropic.com/v1/messages")`. Per `~/CLAUDE.md` § Architecture Standards Law 3, every LLM call goes through `callLLM`. This is the current critical tech-debt drain item per the canonical doc. **~1 session, single-file refactor, OB-internal.**
2. **Renderer-level tests for the 7 reply-renderer fences** — today the parsers are tested (110 cases green) but the visual renderers (ChartFromSpec, GammaCard, CitationStrip, TimelineFromSpec, MapManifest, UIManifest, ComparisonView) don't have jsdom-mount tests. Adding mount + ARIA assertions catches UI regressions cheaply. **~1 session, additive test work.**
3. **Operator-action prep for S30 production deploy** — walk `docs/RUNBOOK.md`, write a precise pre-deploy checklist for the founder covering the 11 owed SQL migrations + Vercel env vars + smoke-test plan. The actual deploy is operator action, not Claude work, but Claude can prep. **~1 session, doc deliverable.**
4. **Bundle-size audit** — Next.js + recharts + mapbox-gl + framer-motion + @radix-ui — total client bundle should be analysed; lazy-load opportunities surfaced. Performance is part of the 2026 standard (Google INP < 200ms target). **~1 session, OB-internal analysis + remediation.**
5. **More golden eval cases** — beyond the 3 new ones added in commit `ae4fe57`, the spoke router + vertical adapters + the 7 fences have additional edge cases worth covering. **~1 session, additive eval coverage.**

What's BLOCKED / EXCLUDED:
- **Track L cluesintelligence** (~10 sessions, FLAGSHIP) — EXCLUDED until founder signals the questionnaire / Bayesian / persona spec is locked.
- **Track H S22–S23** (4 remaining LTM handlers — G1-005 / G1-034 / G1-036 / G1-050) — BLOCKED by walled-garden direction. Needs LTM-side v1 API extension OR bridge build-out.
- **`@olivia/design-system` code extraction** — pending founder confirmation on the 5 open questions in `05_DESIGN_SYSTEM_PACKAGE_SPEC.md § 9` (monorepo vs separate repo, private vs public registry, etc.).
- **Phase 4 cascade injector** (Track G follow-up) — DEFERRED until consumer surface lands; Track L was the leading candidate before exclusion.

---

### Today's batch (2026-05-17 — 2 code commits + 2 docs commits since `c3a2760`)

2. `18bd216` — **Track G S20 CLOSED**: LangGraph 5-node wrap around `runCascade()`.
   - `src/lib/orchestration/cascade/graph.ts` (~250 LOC). Nodes: plan → search → judge → validate → finalize, with conditional retry loop from validate back to search.
   - Validate-node rules: manualReview > 0 → escalate; status=error + retries remain → retry; status=error + exhausted → escalate; status=partial + high/total < 0.5 + retries → retry; otherwise → accept.
   - Two public exports: `buildCascadeGraph()` (reusable compiled instance) and `runCascadeGraph({ taskId, lastCollectionDate?, maxAttempts? })` convenience invoker.
   - Exported constants for tuning: `DEFAULT_MAX_ATTEMPTS = 2`, `RETRY_CONFIDENCE_THRESHOLD = 0.5`.
   - 7 vitest tests covering every branch: accept on first attempt, escalate on manual review, escalate after max retries, retry-then-accept on partial+low confidence, no-retry-on-good-partial, lastCollectionDate wiring, graph reuse across invocations. All passing in 322ms.
   - LTM untouched (no LTM equivalent — LTM doesn't use LangGraph).

1. `c2106e3` — **Track G S19 (3/3) CLOSED**: cascade orchestrator + 8 provider files + write-side breadcrumb helper.
   - `src/lib/orchestration/cascade/orchestrator.ts` (~370 LOC, 4 exit points each emitting `CascadeEvent`). Copied byte-for-byte from `D:\London-Tech-Map\src\lib\cascade\orchestrator.ts` with the addition of `emitBreadcrumb()` calls at every return path. LTM is **walled-garden, read-only**: zero LTM files touched.
   - `src/lib/orchestration/cascade/providers/` — 8 provider files + `index.ts` registry: `anthropic.ts` (Sonnet + Opus), `openai.ts` (GPT-4o + 21 structured-output schemas), `google.ts` (Gemini), `xai.ts` (Grok + x_search), `perplexity.ts` (Sonar), `kimi.ts` (Moonshot), `tavily.ts` (Phase 2 search), `companies-house.ts` (Phase 2 UK registry). Companies-house import points at `@/lib/companies-house/client` (OB already has it).
   - `events.ts` — added `recordCascadeEvent({taskId, status, itemCount, skippedCount, durationMs, errorMessage, metadata})` append-only write helper. Existing 4 read-only helpers untouched.
   - 12 new vitest tests: `providers.test.ts` (6 — registry contract, isConfigured surface, web-search filter), `orchestrator.test.ts` (6 — all 4 exit points + breadcrumb-failure-safe + progress callback), `events.test.ts` (+2 — recordCascadeEvent write contract). **Full cascade suite: 34/34 in 6.44s.**

**What this batch did NOT touch:**
- **LTM**: zero edits, zero writes, zero git ops against `D:\London-Tech-Map`. Read-only file access only (orchestrator.ts, injector.ts, 8 providers/*.ts). Walled-garden boundary held.
- **Phase 4 injector**: explicitly deferred per founder direction "ok a". The LTM injector writes to 11 Prisma models OB doesn't ship (Organization, FundingRound, Event, Location, Person, DistrictScore, Program, DynamicContent, VideoSource, FeatureCatalogProposal + helpers). Direct copy would crash at runtime. An OB-shaped injector should be built when a concrete consumer surface lands (Track L cluesintelligence is the first candidate).
- **`callLLM` adapter layer**: the HANDOFF's earlier wording suggested "adapter wiring" between cascade providers and `lib/agents/llm.ts`. After reading both: they do different jobs (cascade = structured data extraction with JSON-schema enforcement; callLLM = narrative text). The duplication of fetch boilerplate is honest and intentional. A future refactor extracting a shared raw-HTTP client is a separate track (was Option C in the design surface, not picked).

**Operator actions OWED (carry-forward, unchanged from prior batch):**
- Migrations 04, 05, 06, 07, 08, 09, 10, 11, 12, 13 + seed-investor-reputations. Full SQL in § 4.
- **Migration 12 (cascade_events) is what unlocks the breadcrumb writes** from this batch. Code is migration-safe without it — `recordCascadeEvent` failure is swallowed with a console warning so the orchestrator never crashes on a missing table.

---

### Previous batch (2026-05-11 — 21 commits since `669a6d0`)

Six tracks closed or advanced. **Track H S21 COMPLETE** (12 per-company handlers). **Track B 8c COMPLETE** (Studio v1 engine — 38 files, ~12,800 LOC). **Track B 8d-routes-2 COMPLETE** (3 new Prisma models + heavy documents routes ported). **AGENT_DEFINITIONS** + **`/admin/tools` migration-11 auto-detect** shipped. **Track G S19 partial → now CLOSED in 2026-05-17 batch above** (cascade types + events + 15 prompts ported then; orchestrator + providers landed today).

### Today's batch (21 commits since `669a6d0`)

1. `6c37ff0` — **Track H S21 C1**: port `callLLM` bridge from LTM (`src/lib/agents/llm.ts`, ~580 lines, 7-provider fan-out with opt-in web search, graceful degradation, rich cost/token return). 20 vitest tests.
2. `3966525` — **Track H S21 C2**: Prisma foundation. New `CollectionType` enum + 3 new models (`DocumentCollection`, `DocumentVersion`, `UserCompanyProfile` as minimum 10-column LTM subset). Privacy contract codified inline. SQL migration `prisma/sql/11-add-agent-handler-foundation.sql` (idempotent throughout, seeds 12 collection rows). `prisma format` + `prisma generate` ran clean.
3. `0afe8a8` — **Track H S21 C3**: port `resolve-company` helper (`src/lib/agents/resolve-company.ts`, byte-for-byte LTM port). `BaseCompanyInputSchema` (Zod, passthrough) + `resolveUserCompany()` with profile/input/input+profile/default precedence + source tagging. Never throws. 9 vitest tests.
4. `84e0d74` — **Track H S21 C4**: port `document-mirror` (`src/lib/agents/document-mirror.ts`, byte-for-byte LTM port). `spawnDocumentFromAgent()` resolves UserProfile -> Clerk userId, looks up DocumentCollection by slug, creates Document + DocumentVersion v1 with canonical /api/documents POST shape, idempotent via slug, best-effort throughout. 10 vitest tests.
5. `738fabc` — **Track H S21 C5**: port `g1-033-data-protection-orchestrator` (`src/lib/agents/impl/g1-033-data-protection-orchestrator.ts`, byte-for-byte LTM port). Versioned output schema, `isDpiaDocument` type guard, fence+brace JSON parser, structured fallback briefings on both failure modes, spawn-when-userProfileId flow. Wired into `handlers.ts` registry. 14 vitest tests.
6. `770cb8d` — **Track H S21 C6**: `docs/SESSION_LOG_2026-05-11_TRACK_H_S21_G1_033_PORT.md` + HANDOFF.md update (inlines the migration 11 SQL body per the README ABSOLUTE RULE). Foundation batch close.
7. `e619332` — **G1-048 Modern Slavery Statement Generator** (~340 lines + 15 tests). Threshold derivation (£36M), ARR-as-turnover proxy, legal-compliance mirror.
8. `787c7c9` — SESSION_LOG addendum 1 + HANDOFF update (close of G1-048 continuation).
9. `2e324a2` — **fix(sql): migration 11 tolerant FKs**. Operator hit `42P01 documents does not exist` because migrations 08+09 (documents engine + foundation) haven't been applied yet. Wrapped each of the three FK ADDs in DO/EXCEPTION blocks that catch `undefined_table` with RAISE NOTICE. Migration now applies cleanly — 3 new tables + 12 seed rows succeed; FKs deferred until 08+09 land.
10. `92204b7` — **G1-076 Pitch Deck London Filter** (~420 lines + 15 tests). Rewrites US decks for UK investors (USD→GBP, US accelerators→London, FCA/EIS/SEIS anchors). Pitch-decks mirror.
11. `1a20c7b` — **G1-107 Thought Leadership Ghostwriter** (~400 lines + 15 tests). Long-form essay / blog / LinkedIn / op-ed in founder's voice. sales-marketing mirror. maxTokens cap at 5000 for 45s timeout safety.
12. `9e6c221` — **G1-105 Journalist Matchmaker** (~450 lines + 15 tests). UK tech journalist matching + personalised pitch. **First handler to opt into provider-native web search** (`enableWebSearch: true`) — validates the search-opt-in machinery from llm.ts (commit 1) end-to-end. sales-marketing mirror.
13. `b180f29` — **G1-115 Social Proof Agent** (~420 lines + 16 tests). Proof package across 8 categories × 4 use contexts. **Numeric-threshold severity** (legitimacyScore < 50 → warning) and **conditional audience/purpose derivation** from targetUseContext (first handler to do this).
14. `3324525` — **G1-110 Podcast Booker** (~460 lines + 14 tests). London-tech podcast matching with per-show `<<HOOK>>` placeholders + booking expectations. Second handler with `enableWebSearch: true`.
15. `7805bd4` — Extended-batch close 1: SESSION_LOG addendum 2 + HANDOFF update.
16. `545d7f9` — fix(sql): migration 11 paste-and-go version (operator successfully applied this in Supabase).
17. `f761213` — **G1-130 Build-vs-Buy Decision** (~525 lines + 16 tests). First briefing-only. First three-level severity (critical). Self-validation of rubric weights + option coverage.
18. `401718e` — **G1-149 Email Negotiator** (~520 lines + 20 tests). Typed `@prisma/client` audience/purpose routing matrix (7 request types). Stance-gated mirror.
19. `89a9e02` — **G1-150 Procurement Agent** (~480 lines + 10 tests). SOW + 5-vendor shortlist. First handler using licensing-commercial collection. Third web-search handler.
20. `f863687` — **G1-141 Confidence Score Decision Engine** (~430 lines + 12 tests). Calibrated 0-100 + reversibility-aware severity escalation (critical when low + hard-to-reverse). Briefing-only.
21. `c705cf7` — **G1-136 Second-Order Consequence Modeler** (~480 lines + 11 tests). 3-order cascading consequences across 8 domains. Default model claude-opus-4-7. Briefing-only. **Closes the per-company handler queue.**
22. `818f730` — Track H S21 final close (addendum 3 + HANDOFF for the 12-handler queue closure).
23. `545d7f9` already listed above — migration 11 paste-and-go version that the operator successfully applied. (Re-numbered chronologically — was commit 16.)
24. `e05581e` — **AGENT_DEFINITIONS rows for all 12 ported handlers** + 3 new AgentGroup codes (5A Legal & Compliance / 5B Pitch & PR / 5C Strategy & Decisions). 24 alignment tests lock the registry ↔ handlers bridge. Closes the "schedulers can't see the 12 handlers" gap.
25. `d674b8d` — **`/admin/tools` auto-detect for migration 11** + inline-render. Probes `prisma.documentCollection.count()` (also surfaces partial applies where seed < 12 rows). Closes the in-product-UX-matches-chat-rule gap.
26. `e12fb0d` — **Track B 8c (1/3)**: 18 Studio v1 leaf components ported from LTM (MicroReward / DocumentTransition / SkipNudgeModal / AnswerRibbon / CompletionCeremony / StoryReview / PreSubmitCheck / EntityBriefCard / EntityPerspectiveModal / CristianoReEvaluation / WhyThisPanel / PitchPolishModal / SuggestionChips / ResearchHistory / StudioFormattingToolbar / StudioAnswerEditor / DeepResearchPanel / StudioKeyboardShortcuts). +useFocusTrap hook + 2 lib/studio re-export shims + engine-types re-export. 7586 LOC.
27. `1fa643f` — **Track B 8c (2/3)**: PreparationStudio (1462 LOC) + 8 UI shell components (StudioTopBar / Bottom / OliviaAvatar / OliviaChat / QuestionCard / TTSPlayer / VoiceInput / VoiceCommands). 5185 LOC.
28. `8b99f7b` — **Track B 8c (3/3) CLOSED**: `/studio/[id]` route + 14 module-import smoke tests. Studio v1 engine mounts against a 3-block stub fixture.
29. `96f3815` — **Track B 8d-routes-2 queries upgrade**: `getDocumentCollections` + `getDocumentById.include.{collection,versions}` + `getCollectionSiblings` + `getDocumentFilterOptions` all promoted from stubs to real migration-11-backed queries. 9 new tests.
30. `370024c` — **Track G S19 (1/3)**: CascadeEvent Prisma model + migration 12 (paste-and-go SQL) + cascade/types.ts (576 LOC) + cascade/events.ts (133 LOC) + 6 event-helper tests.
31. `462174a` — **Track G S19 (2/3)**: cascade/prompts/index.ts byte-for-byte port (1060 LOC, 15 production-tuned cascade prompts) + 14 prompt-resolver tests.
32. `324e41b` — Mid-session HANDOFF push (Track G S19 partial close).
33. `ebd1b65` — **Track B 8d-routes-2 CLOSED**: 3 Prisma models (DocumentModule + DocumentRelationship + AnalysisResult) + migration 13 + heavy route ports (`/documents/[id]/page.tsx` + `/documents/[id]/workspace/*`). 1072 LOC added.
34. **(this commit)** — Final session-close HANDOFF update.

What's still owed (deferred to next session):
- Track G S19 (3/3) — orchestrator + injector + provider-adapter wiring.
- Track G S20 — LangGraph 5-node wrap.
- Track C 11-14 — Studio UI rebuild (4 sessions). Replaces the v1 chrome ported in Track B 8c with the GrandMaster prototype shell.
- Track L cluesintelligence Unification (~10 sessions, FLAGSHIP). Direct on the "cluesintelligence right after clueslondon" sequencing.

What's NOT in this batch (deferred to next session):
- Track G S19 (3/3) — orchestrator + injector + provider-adapter wiring. The injector has 30+ touchpoints with LTM-specific Prisma writes (Organization, FundingRound, DistrictEvent) that need bridge adaptation. The orchestrator imports its own provider abstractions that overlap with OB's existing `lib/agents/llm.ts` 7-provider fan-out — needs an adapter layer, not a straight copy.
- Track G S20 — LangGraph 5-node wrap.
- Track B 8d-routes-2 page port — blocked on `DocumentModule` + `DocumentRelationship` + `AnalysisResult` Prisma models. Either add those (1 commit of schema + migration) or scope-cut the page to skip those sections.
- AGENT_DEFINITIONS row for the existing handlers in registry.ts already done; outstanding: wire schedulers + UI to the 12 G1-* entries.

### What this batch did NOT touch

- LTM repo: **zero touches**. LTM remains a walled garden to OB sessions per founder direction.
- The Studio engine port (Track B Session 8c) and document workspace routes (Track B Session 8d-routes-2) — unchanged. The Document + DocumentVersion rows G1-033 spawns have the right shape for those routes to consume when they land.
- The cascade orchestrator (`runModelCascade`). `callLLM` does NOT delegate through it — the two LLM surfaces coexist (cascade for multi-step chat, callLLM for direct agent narrative generation). Mirrors LTM exactly.
- G1-005 Property Gravity Forecaster — explicitly NOT ported. Needs LTM-side API extension (district score history + time-windowed organization groupings + `computeTechGravityScore` utility) which is blocked by the walled-garden direction. Parked.

### Architectural facts captured this batch

- **G1-033 is the canonical per-company handler pattern.** Memory note `feedback_ltm_agent_handler_pattern.md` (locked 2026-05-08) is now grounded in OB code. Future ports reuse `resolveUserCompany` + `callLLM` + `spawnDocumentFromAgent` + `parseLlmJson` + `isXxxDocument` instead of reinventing. Subsequent per-company handlers should port in ~1 session each because the infrastructure is now in place.
- **UserCompanyProfile in OB is a deliberate minimum subset** of LTM's ~85-field source — 10 columns covering exactly what `resolve-company.ts` selects. The privacy-contract doc-comment on the schema model locks the deadline-data boundary explicitly so future agents can't accidentally project deadline columns onto the public profile path.
- **Migration 11 is owed; SQL body lives in `§ 4 below` AND in `docs/SESSION_LOG_2026-05-11_*.md`** per the README ABSOLUTE RULE (never reference an unapplied migration without printing the SQL inline). `/admin/tools` auto-detection for migration 11 is a carry-forward (the in-product UX matching the chat rule).

### Previous batch — 2026-05-10 (closed at `669a6d0`, 5 commits since `f474739`)

1. `07eb914` — `test(api): pre-warm route modules in 8 surface tests to fix cold-start timeout`. Backports the `c5ee644` pattern to 8 admin/API route test files that were timing out at 15s under full-suite parallel load. Pre-existing infra debt; suite went 1058/1070 in 329s → 1070/1070 in 97s.
2. `d4cfb7b` — **O5c-Lift C1**: `LiveAvatarHandle` interface + `LiveAvatarProvider` union + `SpeakErrorReason` + `LiveAvatarHandleEventMap` + `CreateLiveAvatarHandleOptions` in `src/lib/avatar/types.ts`. `AvatarState` moved from `OliviaVideoAvatar` to `types.ts` with re-export for back-compat.
3. `3e4048a` — **O5c-Lift C2**: per-vendor handle implementations + factory dispatcher. LiveAvatar handle is the real one (lifts the LiveKit + WS code). Tavus + Simli are HONEST stubs — connect/speak throw or return clearly-labelled deferred-implementation errors so no caller is fooled. 23 contract tests.
4. `1a9a812` — **O5c-Lift C3**: `OliviaVideoAvatar.tsx` refactor. Net −210 lines. Component dispatches all lifecycle via `handleRef.current.{connect,disconnect,speak,interrupt,attachVideo}`. New `provider` prop. Behavior parity preserved (verified against the original lifecycle).
5. `892dc17` — **O5c-Lift C4**: harness "Run live (TTFM)" extended from liveavatar-only to liveavatar + tavus + simli. New `/api/admin/avatar-eval/live/[vendor]/route.ts` for Tavus (utterance accept timing) + Simli (session-create timing). 9 route tests.
6. **(this commit)** — **O5c-Lift C5**: `docs/SESSION_LOG_2026-05-10_O5C_LIFT.md` + this HANDOFF.md update.

### What this batch did NOT touch
- No SQL migrations. Migrations owed by prior batches (04, 05, 06, 07, 08, 09, 10, seed-investor-reputations) all still listed in `/admin/tools` with the in-app SQL inline-paste affordance — unchanged.
- No production secret env-var changes. Two new env vars become useful AFTER this batch (TAVUS_API_KEY, SIMLI_API_KEY for the harness "Run live" buttons), but not required for any existing surface.
- `~/CLAUDE.md` was updated by the founder mid-batch with new local-builds policy (C70 onward — local builds permitted under specific safety rules: commit + push BEFORE starting any local server). I did NOT make that edit; flagged for awareness.

### Architectural fact captured this batch
- **`liveavatar` and `heygen` are the same vendor (HeyGen) at different product tiers** — `liveavatar` is HeyGen's LITE Mode realtime path; `heygen` is HeyGen's async video gen. Saved to memory at `~/.claude/projects/.../memory/project_ob_liveavatar_is_heygen.md` and to the doc comment on `LiveAvatarProvider` in `types.ts`. Past sessions had treated them as unrelated vendors. When reasoning about cost/strategy: aggregate. When reasoning about API surface / env vars: separate.

### Mid-batch sidetrack (LTM, now off-limits)
- Founder asked me to investigate a London-Tech-Map trust-strip image-upload bug. I committed a 3-file silent-fail UX fix (`6af7714` on LTM master), founder asked me to revert it, revert pushed as `c460932`. Net effect on LTM: zero. Founder direction: London-Tech-Map is now a **walled garden** to OB sessions — do not touch.

### Previous batch — 2026-05-09 (closed at `f474739`, 19 commits since `4808d6c`)

**O5c arc + immediate polish (commits 1–10):**
1. `fb85c3f` — **O5c S1**: Tavus adapter + `AvatarEvalRun` Prisma model + `TAVUS_API_KEY` env var + 5 smoke tests
2. `059c248` — **O5c S2**: 30-script catalog + `/api/admin/avatar-eval/runs` (GET+POST) + `/admin/avatar-eval` harness UI + 15 tests
3. `c5ee644` — `admin/investors` test pre-warm backport (eliminates the cold-start flake observed in S1's verify)
4. `c35b72d` — **O5c S3**: decision rubric + `/admin/avatar-eval/decision` + LiveAvatar live trigger + Tavus phoneme claim verified false + 17 tests
5. `a14555c` — vendor health endpoint (`/api/admin/avatar-vendors/status`) + per-vendor wiring panel; LiveAvatar key-missing state on the live-trigger button; pre-warm backports
6. `0cebf77` — graceful "migration not applied" handling on both /admin/avatar-eval and /admin/avatar-eval/decision (banner + machine-readable 503)
7. `10029b3` — `/admin/tools` operator landing page (indexes every admin surface, reads vendor health inline)
8. `b3e7a0e` — `scripts/seed-avatar-eval-demo.ts` + `scripts/README.md` (idempotent demo seeder)
9. `87f7c8e` — per-run DELETE (`/api/admin/avatar-eval/runs/[id]`) + harness ✕ undo button
10. `a5e3a56` — `Cache-Control: private, max-age=5–10, stale-while-revalidate=30` on the two read-mostly admin endpoints

**Mid-batch HANDOFF push:**
11. `6dd9c88` — HANDOFF.md batch-close (the doc this section is rewriting)

**Closing wave — README rule + UX gap closure + spoke routing (commits 12–19):**
12. `ca91423` — **README ABSOLUTE RULE** + `~/CLAUDE.md` complement: NEVER reference an unapplied migration without inlining the SQL body in the same chat message. Permanent. The trigger was founder rage at being asked to "apply prisma/sql/10" without the SQL inline.
13. `572fd7b` — fix(sql): ASCII-only inside SQL comments. Founder hit `ERROR: 42601: syntax error at or near "§5"` because the chat → clipboard → Supabase paste path autocorrected `--` to en/em dash on lines containing Unicode (em dash, section sign, multiplication sign). Rewrote `prisma/sql/10` as ASCII-only and added a sub-rule under the README ABSOLUTE RULE.
14. `0d93703` — `/admin/tools` now detects unapplied migrations server-side via `try { prisma.avatarEvalRun.count() } catch`, renders the full SQL inline in a banner so the operator never has to chase files. Banner disappears once the table exists.
15. `2bdfe78` — Copy-to-clipboard button on each owed-migration SQL block (extracted into `OwedMigrationCard` client subcomponent; falls back silently if Clipboard API blocked).
16. `f4c8b4f` — 5 new golden eval cases (multilingual French, valuation narrative, deal-protection liq-pref impact, safety/cardiologist redirect, ClimateTech vertical adapter). Suite 10 → 15 cases.
17. `98487e6` — fl_realestate spoke regex extended to Tampa Bay markets (Pinellas / St Pete / Clearwater / Bradenton / Lakeland) + FL tax/insurance concepts (homestead exemption / Save Our Homes / Citizens Insurance / sinkhole / HOA). Plus golden case verifying it. Founder works the Pinellas market specifically.
18. `32e694c` — fl_realestate system-prompt addendum enriched to name Tampa Bay markets + tax mechanics (Save Our Homes 3% cap, Citizens Insurance dynamics, sinkhole disclosures) + Pinellas Realtor Organization in the cite list.
19. `d1a9495` — Unit-test coverage for the fl_realestate Tampa Bay extension (spoke-router test suite 16 → 18 tests).

The avatar A/B story is now end-to-end demo-ready AND the migration friction loop is closed at the UX level: visit `/admin/tools`, click "Copy SQL", paste into Supabase, refresh. fl_realestate is now properly grounded for the founder's Pinellas market.
>
> **⚠ Read this if you're walking in cold:** the prior handoff (the one that ended at `de4fef7`) claimed clean state, but verification showed 7 typecheck errors + 3 failing tests. This session opened by fixing those before doing any new work — the pattern HANDOFF.md §7 explicitly warns about. Always run the §0 verify commands; do not trust a handoff's "clean" claim without proof.

---

## § 0 · Where you are

| | |
|---|---|
| **GitHub** | https://github.com/johndesautels1/Olivia-Brain |
| **Branch** | `main` (Vercel deploys from this branch automatically) |
| **Local path** | `D:\Olivia Brain` (Windows; PowerShell-first per `~/CLAUDE.md`) |
| **Clone command** | `git clone https://github.com/johndesautels1/Olivia-Brain.git "D:\Olivia Brain"` |
| **Current HEAD** | will be the commit this docs push lands on — `git log -1` to confirm |
| **Production URL** | https://olivia-brain.vercel.app |

**Sister repos** (reference only — DO NOT modify from OB):
- `D:\London-Tech-Map` — github.com/johndesautels1/london-tech-map (LTM source for Track G/H ports)
- `D:\Studio-Olivia` — local prototypes, not a git repo
- `D:\Clues Main` — github.com/johndesautels1/Clues-Main (docs canonical, code stale)

**Verify on arrival:**
```powershell
cd "D:\Olivia Brain"
git pull origin main
git log --oneline -20
npx tsc --noEmit
npm test
```

If any of those fails, fix it before writing new code.

---

## § 1 · Mandatory reading order — read before writing anything

Read these in order. Skipping any of them produces drift the founder has been burned by repeatedly.

1. **`~/CLAUDE.md`** — absolute-priority rules. Top items:
   - `UserCompanyDeadline` privacy contract (deadline data is private, never project onto `UserCompanyProfile`)
   - NEVER set secrets to "All Environments" in Vercel
   - NEVER run local builds (`npm run build` / `next build`) — Vercel does this
   - Use Prisma scripts, not raw SQL pastes, for data ops
   - Always commit + push (Vercel deploys from git)
   - Stop means stop — no chaining tasks past a stop signal
2. **`docs/OLIVIA_NORTH_STAR.md`** — the single question every commit answers yes to. Six product spokes, three deployment modes, bicycle-wheel architecture.
3. **`docs/00_PRODUCT_TRUTH.md`** — product hierarchy in priority order. cluesintelligence is the FLAGSHIP; clueslondon is current P1; LifeScore is 1 of 23 cluesxscore modules (NOT a top-level product).
4. **`docs/01_UI_DESIGN_SYSTEM.md`** — Aurum + Aether tokens, LCH color space, modular workspace, multi-agent visualization, Vercel Web Interface Guidelines, WCAG 2.2 AA.
5. **This file (`docs/HANDOFF.md`)** — current open work + carry-forwards.
6. **`docs/FEATURE_INVENTORY.md`** — comprehensive feature snapshot (39 capability domains).
7. **`docs/RUNBOOK.md`** — production runbook (deploy / smoke / rollback / on-call / cost dashboards / required env vars).
8. **`docs/BUILD_SEQUENCE.md`** — session-by-session plan (canonical track / session breakdown).
9. (Optional, deeper context) **`docs/03_BRAIN_ENRICHMENT_ENGINE.md`** + **`docs/04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md`** — when working on multi-app sync or cluesintelligence.

After reading, run the verify commands in § 0 again and review the latest `git log --oneline -30` to see what was just shipped.

---

## § 2 · What's done (cumulative across all batches)

> **STALE-DOC NOTE (2026-05-23).** This handoff was last fully reconciled on 2026-05-17 before the 2026-05-23 batch (4 commits — see end of this section). The "closed tracks" table below was significantly stale relative to the git log on arrival 2026-05-23; **Track C and Track V are closed in git history** (commits `2653a67` "Track C CLOSED + Track V 3/9 ✅" and `7cba95d` "Track V CLOSED + O1 prep") but were missing from this table. Both are added below. If you arrive cold, **trust the git log over this table** when they disagree.

### ✅ Closed tracks
| Track | Sessions | What it shipped |
|---|---|---|
| **Track Q** (Quantara) | Q1–Q7 | 56-field founder intake, Q3 auto-fill, Q4 truth-score, Q5 round-axis metamorphic, Q6 vertical schedules, Q7 voice + persona synthesis |
| **Track P** (Deal Protection) | P1–P7 | 5-band Smart Score, clause classifier, term-sheet parser, investor reputation, dilution math, email drafts, counter draft, rehearsal, versioning, consensus |
| **Track F** (Clerk auth) | S18 | `@clerk/nextjs` wired with presence-gated middleware (Clerk currently NOT active in middleware — see § 4) |
| **Track U** (Home page overhaul) | U1–U7 | 240px hero AvatarOrb, Bloomberg score chips, ⌘K palette, KPI tiles, Inspector reorg, /voice takeover, responsive shell |
| **Track C** (Studio UI rebuild) | S14–S19 | Three-region shell + Aurum/Aether design system + Tailwind v4 (S14); 5 reusable primitives + Cristiano transition + council mode (S15); Library tab + scoring + Apply flow (S16); section nav + docs tree + frameworks panel + plan section nav (S17); right-pane tabs + audit log + theme picker (S18); J/K keyboard nav + autosave + theme switching (S19). Close: `2653a67`. **Sessions 9–14 in `BUILD_SEQUENCE.md` ↔ S14–S19 in commits** (Track Calendar's insertion shifted absolute session numbers by 5). |
| **Track V** (LTM Valuation Engine Port) | V1–V9 | Schema port (V1) → types + bridge (V2) → 10-method engine math (V3) → Monte Carlo + sensitivity + war-room calendar (V4) → agents 1-7 + cascade-routed LLM adapter (V5) → agents 8-14 + Cristiano synergy bridge (V6) → 9 API routes + tier gate (V7) → ValuationWorkbench + 31 zone components (V8) → War Room family + Deal Room + Acquisition Mirror + Equity Waterfall (V9). Close: `7cba95d`. Olivia Brain Einstein-genius on valuation. |
| **Track D** (Studio↔Brain wiring) | S15–S16 | Pitch helpers cascade-routed via `runPitchCascade`; PitchCoachTab Inspector |
| **Track E** (Voice input) | S17 | Full STT → cascade → TTS chain on /voice with state-machine orb |
| **Track G** (Cascade orchestrator port) | S19–S20 | Cascade types + events + Prisma model (S19 1/3); 15 cascade prompts byte-for-byte (S19 2/3); cascade orchestrator + 8 providers + write-side breadcrumb helper (S19 3/3 `c2106e3`); LangGraph 5-node wrap with retry + escalate semantics (S20 `18bd216`). Any future agent can call `runCascadeGraph({ taskId })` as a single planning primitive. Phase 4 injector explicitly DEFERRED (LTM-shaped, would crash in OB — see § 3). |
| **Track H** (Agents consolidation, S21 slice) | S21 | 12 per-company doc-spawn handlers ported (G1-033 Data Protection Orchestrator, G1-048 Modern Slavery, G1-076 Pitch Deck London Filter, G1-105 Journalist Matchmaker, G1-107 Thought Leadership, G1-110 Podcast Booker, G1-115 Social Proof, G1-130 Build-vs-Buy, G1-136 Second-Order Consequence, G1-141 Confidence Score, G1-149 Email Negotiator, G1-150 Procurement) + `callLLM` bridge + `resolve-company` + `document-mirror` + 3 Prisma models + 12-row collection seed + AGENT_DEFINITIONS rows + `/admin/tools` migration-11 auto-detect. 4 remaining LTM handlers (G1-005 / G1-034 / G1-036 / G1-050) BLOCKED behind walled-garden direction. |
| **Track I** (Multi-tenant + suppression) | S24 | `ui.suppressedSurfaces` / `ui.brandName` / `ui.accentColor` config keys + `useTenantUi` hook |
| **Track J** (Vertical adapters) | S25–S26 | 4 vertical addenda (AI/SaaS, HealthTech, ClimateTech, PropTech) + provider preferences + free-form industry detection |
| **Track K** (Hardening + launch prep) | S27–S29 | Security audit + rate limits on cost vectors; Cache-Control headers (60-80% TTFB drop); `docs/RUNBOOK.md` |
| **Track O** (Weakness closure) | O3 + O4 + O5a + O5b + O5d + O5e + O5c-S1 + O5c-S2 + O5c-S3 + O5c-Lift C1–C5 | W-002 / W-003 / W-004 / W-005 closed. O5d closed REJECTED — vendor surface check showed no integrated vendor accepts phoneme metadata, see `docs/O5D_PHONEME_ALIGNMENT_RESEARCH.md`. **O5c S1 + S2 + S3 all shipped** (Tavus adapter + AvatarEvalRun model; 30-script catalog + harness UI + run/runs API; decision rubric + live LiveAvatar triggers + Tavus phoneme verification). 4 SESSION_LOG files document each. **O5c-Lift C1–C5 shipped (2026-05-10)** — `OliviaVideoAvatar` now dispatches lifecycle via `handleRef.current.{connect,disconnect,speak,interrupt,attachVideo}`. Track O fully closed. |
| **Track B** (Studio engine port) | S7–S8c, S8b-routes, S8d, S8d-routes, S8d-routes-2 | LTM map port (S7); documents-engine atoms (S8); workspace-shell-atoms (S8b); documents-engine write-surface data layer + API routes (S8b-routes); 14 write-surface component ports (S8b-routes-components); documents data foundation + real fork logic (S8d); 5 documents app routes (S8d-routes); Studio v1 engine port 38 files ~12,800 LOC (S8c 1-3); heavy documents routes + 3 Prisma models (S8d-routes-2 `ebd1b65`). |
| **Track Calendar** | C1–C6 | 14 calendar Prisma models + 15 enums (C1); engine + queries (C2); voice + Olivia models + engine (C3); 19/21 voice/email/call/sms/WhatsApp routes (C4); calendar UI + 18/24 routes (C5); app routes + smoke tests + docs (C6). |
| **Track N** (Visual manifestation) | N1 + N2 + N3 + N4-foundations + N5 + timeline + comparison | Canvas shell + tool-dispatch (N1) + markdown + recharts manifestation (N3) `4c2ff02`; Gamma deck preview (N5) `0c4ef08`; timeline fence; **map manifestation `map` fence (N2) `6845239` 2026-05-23**; **generative UI `ui` fence (N4-foundations) `8feb31d` 2026-05-23**; **comparison fence `48edc40` 2026-05-23** (cluesxscore primitive — competitive-matrix Action 2). Track N fully closed at the foundation level. Full N4 (Vercel v0 + Spline + Cesium) deferred until concrete consumer surface lands. |

### 🟡 Partial tracks
| Track | Status | Remaining |
|---|---|---|
| **Track H** (Agents consolidation, post-S21) | S21 done (12 handlers); S22–S23 blocked | 4 LTM handlers (G1-005 / G1-034 / G1-036 / G1-050) BLOCKED behind walled-garden direction — they need LTM-side v1 API extension (`districtScoreHistory`, time-windowed `organization` groupings, person-organization-role) or a bridge build-out. Park until founder reopens the LTM boundary. |

### 🔲 Not started
| Track | Sessions | Notes |
|---|---|---|
| **Track L** (cluesintelligence Unification — FLAGSHIP) | ~10 | Priority 2 per `00_PRODUCT_TRUTH.md`; "the company is built on this product." `04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md` flags questionnaire / Bayesian / persona-schema details as subject-to-change while the team locks the new spec. **Founder has signalled (2026-05-23) to find work that is NOT cluesintelligence until the spec lock lands.** Phase 4 cascade injector port (Track G follow-up) is the leading candidate to surface during this track. |
| **S30** Production deploy (2026-06-02 target) | 1 | Walk `docs/RUNBOOK.md` § 1 → § 5. Apply the 10 SQL migrations + set env vars. |

### 📦 This batch (2026-05-23 — 5 commits since `40c215c`)

| Commit | What landed |
|---|---|
| `6845239` | **Track N N2** — map manifestation. ```map``` fence renders interactive Mapbox view with markers, auto-fit bounds, fly-to animation. 3 intents (cities / pin / districts) one fence. Graceful degrade to list card when `NEXT_PUBLIC_MAPBOX_TOKEN` is missing. 21 new parser tests. |
| `8feb31d` | **Track N N4-foundations** — generative UI primitives. ```ui``` fence renders card / stat / progress / button through a fixed-registry safe path (no JSX smuggling). Strict http(s)-only allowlist on button hrefs. 26 new parser tests. |
| `48edc40` | **Comparison fence** (competitive-matrix Action 2). ```comparison``` fence — side-by-side 2-3 column with optional verdict + winner highlight. The cluesxscore primitive (powers all 23 mini-app verdicts, cluesintelligence top-3, Deal Protection offer-vs-offer, Quantara round-axis). 21 new parser tests. |
| `1484c6b` | **AGENTS.md at repo root** (competitive-matrix Action 1). 307-line standing-rules synthesis pulled from `~/CLAUDE.md` + canonical docs + locked feedback memories. Every future coding agent reads it first. |
| (this commit) | **HANDOFF.md reconciliation** — Track C + Track V + Track G + Track H S21 + Track B (8d-routes-2) + Track Calendar + Track O (full O5c-Lift) + Track N (full closure) all moved to the ✅ closed list to match git log. |

**Reply-renderer fence count: 7** — chart / gamma / sources / timeline / map / ui / comparison. Adding a new fence is documented in `AGENTS.md § 4` (6 steps).

### This session (2026-05-09 follow-up — 9 commits since `de4fef7`)

**Recovery (3 commits — main was broken, the prior handoff claimed clean):**
- `0511d0f` — fix(studio): PitchCoachTab reads s.text + s.fields, not nonexistent s.content
- `86b8ace` — fix(home): MarkdownReply spread type accepts react-markdown ExtraProps
- `949a97f` — fix(vitest): no-op `server-only` via vi.mock so tier-gated routes load in tests (recovered the 3 V7 valuation route smokes)

**Track O — avatar lip-sync (5 commits closing W-005):**
- `e6be1fb` — research memo `docs/O5_AVATAR_LIPSYNC_RESEARCH.md` (pipeline analysis + recommended sequence)
- `d793fa9` — **O5a streaming pre-roll**: new `/api/olivia/liveavatar/speak-stream` route streams ElevenLabs PCM through without server-side buffering; client splits into ~125ms first-chunk / ~250ms target chunks, sends each as `agent.speak` ws message, terminates with `agent.speak_end`. **8-40× TTFM improvement** (~1.2s → ~250ms median). Uses `eleven_turbo_v2_5` (~250ms TTFB vs ~500ms for multilingual). Performance marks at speak-start / first-byte / first-chunk / done. Falls back to `/speak` on stream decline. +5 smoke tests.
- `14594e9` — **O5b polish**: auto-interrupt before queueing a new utterance (was: queued back-to-back); client text truncation 2000→5000 to match the route ceiling; `eleven_turbo_v2_5` applied to `/speak` fallback too.
- `e55967b` — **O5e abort + onSpeakError**: speakAbortRef cancels in-flight stream when a new reply arrives (no PCM interleave on the wire); new optional `onSpeakError(reason)` callback fires when both speak paths decline so parents can surface "voice unavailable" instead of leaving the user wondering why the avatar's mouth didn't move.
- `b4aa78f` — **O5d REJECTED**: `docs/O5D_PHONEME_ALIGNMENT_RESEARCH.md`. Investigated all five wired vendors (LiveAvatar LITE, Simli, HeyGen async, D-ID, SadTalker); none accept phoneme/viseme metadata as input. Cost-benefit on phoneme alignment doesn't pay even if a vendor existed. W-005 functionally closed by O5a/b/e (latency dominates user perception). Reopen if O5c surfaces a vendor that DOES accept phoneme input (Tavus claim is uncertain — verify).

**O5c sessions 1 + 2 + 3 all closed this batch.** Only the deferred `OliviaVideoAvatar` 867-line refactor remains, tracked as a separate "Track O5c-Lift" follow-up.

### Follow-up session #4 (2026-05-09 — Track O5c S3, 1 commit since the backport)

- `src/lib/avatar/liveavatar.ts` — thin adapter (`isLiveAvatarConfigured`, `getLiveAvatarPublicConfig`, `LIVEAVATAR_SPEAK_STREAM_PATH`). The WebSocket lifecycle stays inside `OliviaVideoAvatar` until the full lift lands.
- `src/lib/avatar/decision-rubric.ts` — pure ranking math (`aggregateRunsByVendor` + `rankVendors` with default weights `latency 0.4 / MOS 0.4 / cost 0.2`). One real bug caught by the tests: ties in latency/cost would silently zero those components when inversion happened after `normalise`. Fix: push inversion inside `normalise` so ties → 1.0 regardless of direction.
- `/admin/avatar-eval/decision` page — read-only ranked table with per-component breakdown; vendors lacking MOS data show in a separate "Awaiting MOS" panel (excluded from ranking — composite is incomparable without MOS).
- `/admin/avatar-eval` page — added "Run live (TTFM)" button visible only when vendor === `liveavatar`. POSTs the script to `/api/olivia/liveavatar/speak-stream`, measures request-start to first PCM byte via `performance.now()`, auto-fills latency. Surfaces JSON-fallback reasons instead of writing bogus latencies.
- Tavus phoneme claim verified — REST `/v2/conversations/{id}/utterance` accepts `{ text }` only; O5d REJECTED stands. `tavus.ts` TODO marker replaced with the verified finding inline.
- Tests: `decision-rubric.test.ts` (13) + `liveavatar.test.ts` (4). 37/37 avatar tests across 5 files now pass.
- See `docs/SESSION_LOG_2026-05-09_O5C_S3_DECISION_AND_TRIGGERS.md` for full S3 manifest + the deferred-lift carry-forward.

### Follow-up session #3 (2026-05-09 — Track O5c S2, 1 commit since the S1 commit)

- 30-script eval catalog at `src/lib/avatar/eval-scripts.ts` — 6 categories of 5 (short, medium, number_heavy, plosive, multilingual, long_form). Append-only IDs to keep historical `AvatarEvalRun` correlation stable. Five long-form scripts are domain-relevant (pitch coach, valuation, deal protection, heart-recovery, London relocation).
- `/api/admin/avatar-eval/runs` (GET + POST) at `src/app/api/admin/avatar-eval/runs/route.ts` — mirrors `/api/admin/investors` exactly: `requireAdmin()`, `rateLimit` 60/min, Zod validation, `force-dynamic`. Snapshots `scriptText` at write-time. Filters: `?vendor=`, `?scriptId=`.
- `/admin/avatar-eval` page at `src/app/admin/avatar-eval/page.tsx` — vendor selector + script catalog grouped by category with per-(vendor,script) MOS chips + capture form (latency, MOS 1–5, cost, notes) + recent runs panel + all-runs section. Mirrors `/admin/eval` style.
- Tests: `eval-scripts.test.ts` (8 — catalog completeness) + `runs/__tests__/route.test.ts` (7 — module surface + validation + auth-503). 20/20 pass with the existing tavus smokes.
- One Zod v4 fix: `z.record(z.string(), z.unknown())` (single-arg form deprecated).
- `beforeAll` pre-warm pattern in the new route test cuts cold-start from 34s to <1s; worth adopting in any new admin-route test file with a heavy module graph.
- See `docs/SESSION_LOG_2026-05-09_O5C_S2_HARNESS.md` for full S2 manifest + S3 carry-forwards.

### Follow-up session #2 (2026-05-09 — Track O5c S1, 1 commit since `4808d6c`)

- Tavus adapter at `src/lib/avatar/tavus.ts` — mirrors the Simli adapter shape exactly (`isTavusConfigured`, `createTavusSession` POST `/v2/conversations`, `sendTavusUtterance`, `endTavusSession`, `generateTavusVideo` POST `/v2/videos`, `getTavusSessionStatus`).
- `tavus` registered in `src/lib/avatar/index.ts` realtime selector (gated to fallback slot until S3's decision rubric lands).
- `tavus` added to the `AvatarProvider` union and `AvatarServiceStatus` interface in `src/lib/avatar/types.ts`.
- `TAVUS_API_KEY` added to `src/lib/config/env.ts`.
- `AvatarEvalRun` Prisma model + `prisma/sql/10-add-avatar-eval-run.sql` migration (operator-applied; idempotent).
- 5 smoke tests in `src/lib/avatar/__tests__/tavus.test.ts` — all pass.
- `docs/RUNBOOK.md` §2 + §3 updated for the new env var + SQL migration.
- See `docs/SESSION_LOG_2026-05-09_O5C_S1_TAVUS_ADAPTER.md` for the full S1 manifest + S2/S3 carry-forwards.

---

### Cross-cutting systems shipped earlier batches (not on a single track)

- **Streaming chat** — `/api/olivia/chat/stream` with `runModelCascadeStream`; HomeComposer reads ReadableStream and updates UI per chunk; falls back to non-streaming on error; full per-provider cascade fallback preserved
- **Spoke router** — 6-spoke detection (`fl_realestate`/`relocation`/`london_tech`/`xscore`/`heart_recovery`/`london_transit`/`general`) + per-spoke system-prompt addendum + UI badge in provenance row
- **Conversation persistence on streaming** — recall last 4 turns + persist user/assistant turns through `SafeConversationStore`; `conversationIdRef` threads across sends; `X-Olivia-Conversation-Id` response header; "New conversation" reset path via ⌘K
- **Provenance** — every reply carries `provider · model · ms · spoke · source` (stream/fallback) in a Bloomberg-style mono caption + clipboard copy button
- **Manifest contract** (chart / timeline / sources / gamma) — Olivia returns structured fences; UI manifests live; cascade prompt teaches the contract; ~80 unit tests
- **Live cascade trace recording** — both production chat routes (`/api/olivia/chat` and `/api/olivia/chat/stream`) call `recordTrace`; `/admin/traces` page renders the live bucket
- **Golden eval scaffold** — 10 hand-picked cases, `runGoldenSuite` runner, `/api/admin/eval/run`, `/admin/eval` dashboard with per-check breakdown
- **Polish** — suggestion chips, keyboard shortcuts overlay (`?`), auto-focus composer on mount, skeleton shimmer on KPI tiles, copy-reply button

### Test additions this session

| Suite | Count |
|---|---|
| `chart-spec.test.ts` | 14 |
| `GammaCard.test.ts` | 11 |
| `vertical-adapter.test.ts` | 16 |
| `CitationStrip.test.ts` | 8 |
| `TimelineFromSpec.test.ts` | 9 |
| `spoke-router.test.ts` | 16 |
| `golden-cases.test.ts` | 6 |
| **Total new** | **~80** |

All passing.

### 4 deploy fixes embedded in this batch
- `639c9fb` — `ValuationSubject.companyName` (not `.name`); `Document.status` `DocStatus` enum
- `c713dcf` — `Prisma.InputJsonValue` cast on `system-alerts.ts` line 43
- `727a74c` — `middleware.ts` Clerk-free until env vars land
- `fc1d645` — `instrumentation.ts` deferred OTel imports + Edge-runtime guard

---

## § 3 · Open work — pick one, stop ad-hoc picking

Listed in rough leverage order. Each entry is honest about scope.

### 🔥 High demo leverage, medium scope
1. **Track N4 — Generative UI / 3D scenes.** Add a `ui` or `component` manifest fence that mounts runtime React components from a constrained schema. Big design + safety implications (sandboxing). Start with N4-foundations: pick ~5 safe components Olivia can reference (Card / Stat / Progress / Button / Form), define the JSON contract, parse + render. Skip eval-time JSX entirely.

2. **Track G — FULLY CLOSED 2026-05-17.** S19 (3/3) shipped `runCascade()` returning `ValidatedDataset<T>`; S20 shipped `runCascadeGraph()` LangGraph wrap with retry + escalate semantics. Any future agent can consume the cascade as a single planning primitive. Phase 4 injector remains deferred — see § 6 discussion.

### 🛠 High capability leverage, large scope
3. **Track H S21–S23 — 94 LTM named agents consolidation.** LTM has 116 fully-implemented agents at `D:\London-Tech-Map\src\lib\agents\impl\g1-001-…` through `g1-116-…`. They reference LTM-only Prisma models (`location` / `districtOrganizations` / `fundingRound` / `event`) so direct port 500s. Two paths:
   - (a) Bridge-friendly: rewrite each ported agent to fetch via `LtmKnowledgeProvider` (already exists in `src/lib/bridge/`)
   - (b) Schema port: add the LTM models to OB's Prisma schema (massive)
   - Recommended: start with (a). Pick 5 agents with the simplest data dependencies and port them through the bridge. Document the pattern.

4. **Track O5c — fully closed (modulo deferred lift).** ✅ **S1** + **S2** + **S3** shipped this batch. Only the 867-line `OliviaVideoAvatar` vendor-pluggable refactor was scope-cut to a follow-up — it's a refactor of working production code (high risk, multi-session) and the user-visible A/B story doesn't depend on it. See "Track O5c-Lift" below if you want to take the lift on.

5. **Track O5c-Lift (follow-up; ~1–2 sessions).** Refactor `src/components/olivia/OliviaVideoAvatar.tsx` (867 lines) to take a `provider` prop and dispatch through the `src/lib/avatar/*` abstraction. Path: extract a `LiveAvatarHandle` interface (`connect / disconnect / speak / interrupt`) into `src/lib/avatar/types.ts`; have each adapter implement it; thread provider into the component. Once the lift lands, the harness's "Run live (TTFM)" button can be enabled for Tavus + Simli too (today it's LiveAvatar-only). Per-tenant default vendor selection via `tenant_configs` falls out of the same lift.

### 🎯 Single-session wins
4. **N2 — Mapbox 3D enhancement.** `/map` already has dual Mapbox + Google 3D. Add a "fly to selected district" smooth animation. Read `src/components/map/GoogleMap3DView.tsx` first — risk of breaking the existing surface.
5. ~~**O5 — Avatar lip-sync upgrade.**~~ ✅ Closed this session (O5a/b/d/e). The remaining O5c (Tavus + A/B harness) is multi-session enhancement work — see leverage-tier #2 below.

### 🚢 Pre-launch
6. **S30 — Production deploy** (target **2026-06-02**). Walk `docs/RUNBOOK.md` § 1 (pre-deploy checklist) → § 5 (smoke tests). The RUNBOOK is the source of truth.
7. **Operator actions still owed** (see § 4 below).

### 📋 Carry-forwards from prior agent (still open — none touched this batch)
- **Track B Session 8c** — Studio v1 engine port (PreparationStudio + 17 engine-side components from `D:\Studio-Olivia\StudioOliviaGrandMaster.jsx`)
- **Track B Session 8d-routes-2** — `documents/[id]/page.tsx` (16.9 KB LTM source), `documents/[id]/workspace/{page,layout,DocumentWorkspaceClient}.tsx`. **Use `Copy-Item -LiteralPath`** to avoid the PowerShell `[id]` bracket wildcard issue that bit a prior agent.
- **DocumentShareEvent** audit table (LTM line 1444) — currently `documents/page.tsx` synthesizes `_count.recipients = 0` + `events = 0`.
- **DocumentCollection / DocumentVersion / DocumentModule / DocumentRelationship** — referenced as stubs throughout.
- **Track L** (cluesintelligence Unification, ~10 sessions, post-launch) — verdict + persona + what-if endpoints; `CluesIntelligenceProvider` bridge; BEE phase B1-B3.

---

## § 4 · Operator actions OWED

These are pending and will block production at S30 if not done.

### SQL migrations (apply in order from Supabase SQL editor or `npx prisma db execute`):

```
prisma/sql/04-add-quantara-foundation.sql        — Track Q
prisma/sql/05-add-calendar-memory-rpc.sql        — W-014 (calendar memory pgvector function)
prisma/sql/06-add-deal-protection-foundation.sql — Track P1+
prisma/sql/seed-investor-reputations.sql         — Track P4 (15 archetype seeds)
prisma/sql/07-add-counter-term-sheets.sql        — Track P6
prisma/sql/08-add-documents-engine-write-surface.sql — Track B
prisma/sql/09-add-documents-foundation.sql       — Track B
prisma/sql/10-add-avatar-eval-run.sql            — Track O5c S1 (avatar A/B harness foundation)
prisma/sql/11-add-agent-handler-foundation.sql   — Track H S21 (DocumentCollection + DocumentVersion + UserCompanyProfile + FKs + 12 seeded collections; required for G1-033 to work end-to-end)
```

**Migration 11 — agent handler foundation (paste into Supabase SQL editor):**

```sql
-- 11-add-agent-handler-foundation.sql
-- Track H S21 -- foundation tables for LTM-style agent handlers.
-- ASCII-only inside comments to dodge Supabase paste corruption.
DO $$ BEGIN
  CREATE TYPE "CollectionType" AS ENUM (
    'company_core',
    'pitch_decks',
    'strategic_partnerships',
    'product_technology',
    'financials_models',
    'licensing_commercial',
    'legal_compliance',
    'due_diligence',
    'sales_marketing',
    'methodology',
    'sample_reports',
    'acquisition_exit'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "document_collections" (
  "id"             TEXT             NOT NULL,
  "name"           TEXT             NOT NULL,
  "slug"           TEXT             NOT NULL,
  "description"    TEXT,
  "collectionType" "CollectionType" NOT NULL,
  "isActive"       BOOLEAN          NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)     NOT NULL,
  CONSTRAINT "document_collections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_collections_slug_key"
  ON "document_collections" ("slug");
CREATE INDEX IF NOT EXISTS "document_collections_collectionType_idx"
  ON "document_collections" ("collectionType");
CREATE INDEX IF NOT EXISTS "document_collections_isActive_idx"
  ON "document_collections" ("isActive");

CREATE TABLE IF NOT EXISTS "document_versions" (
  "id"               TEXT         NOT NULL,
  "documentId"       TEXT         NOT NULL,
  "versionNumber"    INTEGER      NOT NULL,
  "titleSnapshot"    TEXT,
  "contentSnapshot"  TEXT,
  "filePathSnapshot" TEXT,
  "changeNotes"      TEXT,
  "createdBy"        TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "document_versions_documentId_idx"
  ON "document_versions" ("documentId");
CREATE INDEX IF NOT EXISTS "document_versions_versionNumber_idx"
  ON "document_versions" ("versionNumber");

CREATE TABLE IF NOT EXISTS "user_company_profiles" (
  "id"                   TEXT             NOT NULL,
  "userProfileId"        TEXT             NOT NULL,
  "companyName"          TEXT             NOT NULL,
  "primarySector"        TEXT,
  "headquartersLocation" TEXT,
  "employeeCount"        INTEGER,
  "arr"                  DOUBLE PRECISION,
  "totalRaised"          DOUBLE PRECISION,
  "regulatoryBody"       TEXT,
  "certifications"       TEXT[]           NOT NULL DEFAULT '{}'::TEXT[],
  "customerCount"        INTEGER,
  "createdAt"            TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3)     NOT NULL,
  CONSTRAINT "user_company_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_company_profiles_userProfileId_key"
  ON "user_company_profiles" ("userProfileId");
CREATE INDEX IF NOT EXISTS "user_company_profiles_primarySector_idx"
  ON "user_company_profiles" ("primarySector");

-- Foreign keys -- tolerant of missing parent tables (catches 42P01).
DO $$ BEGIN
  ALTER TABLE "documents"
    ADD CONSTRAINT "documents_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "document_collections"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_table THEN RAISE NOTICE 'Skipping documents FK: table not yet created (apply migrations 08+09 first, then re-run migration 11)';
END $$;

DO $$ BEGIN
  ALTER TABLE "document_versions"
    ADD CONSTRAINT "document_versions_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_table THEN RAISE NOTICE 'Skipping document_versions FK: documents table not yet created';
END $$;

DO $$ BEGIN
  ALTER TABLE "user_company_profiles"
    ADD CONSTRAINT "user_company_profiles_userProfileId_fkey"
    FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_table THEN RAISE NOTICE 'Skipping user_company_profiles FK: user_profiles table not yet created';
END $$;

INSERT INTO "document_collections"
  ("id", "name", "slug", "description", "collectionType", "isActive", "createdAt", "updatedAt")
VALUES
  ('cdoc_company_core',           'Company Core',           'company-core',           'Foundational corporate documents',                'company_core',           true, NOW(), NOW()),
  ('cdoc_pitch_decks',            'Pitch Decks',            'pitch-decks',            'Investor-facing slide decks',                     'pitch_decks',            true, NOW(), NOW()),
  ('cdoc_strategic_partnerships', 'Strategic Partnerships', 'strategic-partnerships', 'Partnership memoranda and co-marketing assets',   'strategic_partnerships', true, NOW(), NOW()),
  ('cdoc_product_technology',     'Product & Technology',   'product-technology',     'Technical and product specifications',            'product_technology',     true, NOW(), NOW()),
  ('cdoc_financials_models',      'Financials & Models',    'financials-models',      'Financial statements and valuation models',       'financials_models',      true, NOW(), NOW()),
  ('cdoc_licensing_commercial',   'Licensing & Commercial', 'licensing-commercial',   'License agreements and commercial terms',         'licensing_commercial',   true, NOW(), NOW()),
  ('cdoc_legal_compliance',       'Legal & Compliance',     'legal-compliance',       'Legal agreements and compliance artefacts (DPIA)', 'legal_compliance',       true, NOW(), NOW()),
  ('cdoc_due_diligence',          'Due Diligence',          'due-diligence',          'Diligence room exhibits and disclosures',         'due_diligence',          true, NOW(), NOW()),
  ('cdoc_sales_marketing',        'Sales & Marketing',      'sales-marketing',        'Sales collateral and marketing assets',           'sales_marketing',        true, NOW(), NOW()),
  ('cdoc_methodology',            'Methodology',            'methodology',            'Internal methodology and how-we-work docs',       'methodology',            true, NOW(), NOW()),
  ('cdoc_sample_reports',         'Sample Reports',         'sample-reports',         'Anonymised sample outputs',                       'sample_reports',         true, NOW(), NOW()),
  ('cdoc_acquisition_exit',       'Acquisition & Exit',     'acquisition-exit',       'M and A + exit-readiness documents',              'acquisition_exit',       true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
```

Verify (12 rows expected):

```sql
SELECT slug, name FROM "document_collections" ORDER BY slug;
```

**Per the README ABSOLUTE RULE** (top of `README.md`), every unapplied migration must be inlined in chat for the operator to paste, never just referenced by file path. The bodies of 04–09 live on disk under `prisma/sql/`; the body of migration 10 (this batch's addition) is below — and `/admin/tools` auto-detects whether 10 is applied and renders it inline with a Copy-SQL button when not. Future agents adding migrations should extend `getOwedMigrations()` in `src/app/admin/tools/page.tsx` so `/admin/tools` covers them too.

**Migration 10 — `avatar_eval_runs` (paste into Supabase SQL editor):**

```sql
CREATE TABLE IF NOT EXISTS "avatar_eval_runs" (
  "id"             UUID           NOT NULL DEFAULT gen_random_uuid(),
  "vendor"         TEXT           NOT NULL,
  "scriptId"       TEXT           NOT NULL,
  "scriptCategory" TEXT           NOT NULL,
  "scriptText"     TEXT           NOT NULL,
  "latencyMs"      INTEGER        NOT NULL,
  "mosScore"       DOUBLE PRECISION,
  "costCents"      INTEGER,
  "raterId"        TEXT,
  "notes"          TEXT,
  "metadata"       JSONB          NOT NULL DEFAULT '{}'::jsonb,
  "createdAt"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "avatar_eval_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "avatar_eval_runs_vendor_createdAt_idx"
  ON "avatar_eval_runs" ("vendor", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "avatar_eval_runs_scriptId_vendor_idx"
  ON "avatar_eval_runs" ("scriptId", "vendor");
```

Verify (should return 1 row):

```sql
SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'avatar_eval_runs';
```

Optional after applying: seed sample data with `npx tsx scripts/seed-avatar-eval-demo.ts` (idempotent; `--clean` removes only `metadata.demo === true` rows).

### Vercel env vars (per `~/CLAUDE.md` — never All Environments for secrets)

**Auth (currently disabled — middleware is pure passthrough until both land):**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — All Environments
- `CLERK_SECRET_KEY` — Production + Preview only, marked Sensitive

When both are set, restore Clerk in `middleware.ts` per the inline comment at the top of that file.

**LLM cascade (any one unblocks live mode; full set unlocks per-intent routing):**
- `ANTHROPIC_API_KEY` (recommended primary), `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `PERPLEXITY_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`
- `TAVILY_API_KEY` — pitch helpers' web research pre-search

**Voice:**
- `DEEPGRAM_API_KEY` (preferred for sub-200ms STT) or `OPENAI_API_KEY` (Whisper fallback)
- `ELEVENLABS_API_KEY` (preferred for TTS) or `OPENAI_API_KEY`

**Telephony:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

**Observability:** `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` (`instrumentation.ts` no-ops without both)

**Cron + admin:** `CRON_SECRET` (Vercel cron auth), `ADMIN_API_KEY` (LiveAvatar admin endpoints)

Full inventory with scope rules in `docs/RUNBOOK.md` § 2.

---

## § 5 · Architecture rules you MUST respect

### Established (carried forward)
- **OB nests in LTM as the home tenant — schema follows LTM.** Always grep LTM's schema for the equivalent before adding a new model.
- **Two user-id conventions:** `userProfileId` (FK to `UserProfile.id`) on bookmark/saved tables; `ownerUserId` (raw Clerk userId) on Package + DocumentShare.
- **`@/lib/require-tier.ts` is server-only.** Pure plan-tier types live in `@/types/plan-tier.ts` for client imports.
- **`ensureUserProfile()`** at `src/lib/users/ensure-user-profile.ts` is the canonical lookup-or-create.
- **`UserCompanyDeadline` privacy contract** (top of `~/CLAUDE.md`).

### New (Track U → Track O batch)
- **`/api/home/*` routes are read-only aggregators.** They do not mutate. Mutation surfaces live under their own domains.
- **Home composition lives in `src/components/home/`.** Don't bloat `page.tsx`. New widgets mount in `HomeCenter.tsx`.
- **Command palette is build-from-context.** New commands go in `src/components/home/command-palette/commands.ts` via `buildCommandRegistry`. Don't fetch dynamic data inside the registry — pass via context.
- **Olivia replies are markdown.** All chat surfaces (HomeHero, OliviaChatTab, PitchCoachTab) render through `MarkdownReply`. New chat surfaces should do the same.
- **The manifest contract** is `lib/services/model-cascade.ts buildSystemPrompt()` + the 4 fence parsers (`chart-spec.ts`, `GammaCard.tsx`, `CitationStrip.tsx`, `TimelineFromSpec.tsx`). To add a new manifest type, extend BOTH the prompt AND the renderer's code-fence handler. Schema stays JSON.
- **Spoke router** (`lib/orchestration/spoke-router.ts`) classifies every message into 1 of 7 spokes. Cascade picks up the addendum. Don't route around it — extend it.
- **Vertical adapter** (`lib/orchestration/vertical-adapter.ts`) is per-industry; spoke is per-product-surface. Both can apply to the same message.
- **Tenant suppression** is via `ui.suppressedSurfaces` config key on `tenant_configs`. Hosts that embed Olivia pass `x-tenant-slug` header. Standalone returns empty defaults.
- **Pitch operations** — `usePitchConfig` (localStorage-persistent OptimizeConfig) is the source of truth client-side. Server-side, the `/api/pitch/*` routes accept it in the body.
- **Streaming chat** does NOT do per-provider fallback mid-stream (only the synchronous route does). Stream errors → client falls back to `/api/olivia/chat`.
- **Conversation persistence** is best-effort. Both routes wrap `appendTurn` in try/catch — store failures don't break the user's reply.
- **Trace recording** is also best-effort. Both production chat routes call `recordTrace`; `/admin/traces` shows the bucket.
- **Eval cases** in `lib/evaluation/golden-cases.ts` are append-only — never renumber existing case ids.

### New (Track O5 batch)
- **`server-only` is mocked in vitest setup** (`vitest.setup.ts:24` — `vi.mock("server-only", () => ({}))`). Without this, any test that transitively imports `@/lib/require-tier` (V7 valuation routes, deal-protection routes, founder-intake routes, etc.) crashes at module load because the package's default `index.js` throws unconditionally and vitest doesn't honor the `react-server` export condition. Production builds still resolve the real module via Next.js — the boundary check is preserved at build time. Don't remove this without a different replacement.
- **Avatar speak path has TWO routes that coexist:** `/api/olivia/liveavatar/speak` (original — server-buffers full PCM, returns base64 JSON, single `agent.speak` ws message) and `/api/olivia/liveavatar/speak-stream` (Track O5a — streams PCM through, client splits + forwards multiple `agent.speak` chunks then `agent.speak_end`). Client tries streaming first, falls back to the original on decline. Both use `eleven_turbo_v2_5`. **Don't merge these** — the response shapes are incompatible and the dual-route pattern mirrors `/api/olivia/chat/stream` vs `/api/olivia/chat`.
- **Avatar in-flight serialization:** `OliviaVideoAvatar` holds `speakAbortRef` and aborts any in-flight speak before starting the next one (Track O5e). New `onSpeakError(reason)` callback fires when both speak paths decline; parents can render "voice unavailable" UI. The `agent.interrupt` ws message clears the SaaS-side queue; the AbortController cancels client-side stream draining. Both are needed — they're complementary, not redundant.

---

## § 6 · Where to pick up exactly where I left off

The session-end state is:
- Working tree clean on `main`
- **6 commits this session** since `669a6d0` (the prior batch's tip). Itemised in the header section "Today's batch (6 commits since `669a6d0`)".
- Track O5c-Lift remains CLOSED (no changes in this batch).
- Track H S21 is OPEN — first per-company handler (G1-033) ported + canonical infrastructure (llm.ts + resolve-company.ts + document-mirror.ts + 3 Prisma models + 12-row collection seed) landed. Future per-company handler ports should take ~1 session each now that the infrastructure exists.

### Resume options (pick one)

**Option A (Recommended) — Track H S21 is COMPLETE. Pick a different track.**
- **Why Track H S21 is closed:** All 12 per-company doc-spawn handlers are ported. There is no remaining queue of LTM handlers that can be ported without LTM-data-bridge access.
- **The 4 remaining LTM handlers (G1-005 / G1-034 / G1-036 / G1-050) are BLOCKED** behind the walled-garden direction. They need LTM-side v1 API extension (district score history, time-windowed organization groupings, person-organization-role data). Park until founder reopens the LTM boundary.
- **Highest-leverage next moves (in this order):**
    1. **AGENT_DEFINITIONS registry rows for all 12 handlers** — without these, schedulers can't auto-run any handler. ~30 min: add 12 rows to `src/lib/agents/registry.ts AGENT_DEFINITIONS` mirroring existing entries.
    2. **`/admin/tools getOwedMigrations()` detection for migration 11** — closes the in-product-UX-matches-chat-rule gap. ~20 min.
    3. **Migrations 08 + 09 application** + re-run migration 11 to land the deferred FKs (currently migration 11's three FKs to `documents` / `user_profiles` are skipped via the tolerant path).
    4. **Track B document workspace routes** — port `/documents/[id]/page.tsx` + `/documents/[id]/workspace/*` from LTM. 9 of the 12 ported handlers spawn documents but no UI surfaces them yet.

**Option B — `/admin/tools` getOwedMigrations() extension for migration 11.**
- **Why this:** Closes the in-product-UX-matches-chat-rule gap from this batch. ~30 minutes scope.
- **First read:** `src/app/admin/tools/page.tsx` (existing `getOwedMigrations()` pattern that auto-detects migration 10 via `prisma.avatarEvalRun.count()`).
- **Plan:** add migration 11 detection via `try { await prisma.documentCollection.count() } catch` + inline the full SQL body in the banner. Migration 11's SQL is in § 4 above + in the SESSION_LOG; copy-paste into the page component.

**Option C — AGENT_DEFINITIONS registry row for G1-033.**
- **Why this:** Lets schedulers auto-run G1-033. Today the handler is registered (`getHandler("G1-033")` returns the real impl) but the agent isn't in the `AGENT_DEFINITIONS` array in `src/lib/agents/registry.ts`, so schedulers iterating over that list won't see it.
- **First read:** `src/lib/agents/registry.ts` — pattern from existing entries.
- **Plan:** add one row with agentId="G1-033", group="1F" (or whichever Legal & Compliance group code is canonical), `defaultSchedule: "on_demand"`, `defaultModel: "claude-sonnet-4-6"`, etc.

**Option D — Track B carry-forwards (document workspace routes).**
- **Why this:** The DPIA document G1-033 spawns has the right shape but no UI surfaces it yet. Porting `/documents/[id]/page.tsx` + `/documents/[id]/workspace/...` from LTM makes the agent end-to-end visible.
- **First read:** LTM's `documents/[id]/page.tsx` (16.9 KB) + `documents/[id]/workspace/{page,layout,DocumentWorkspaceClient}.tsx`.
- **Caveat:** Use `Copy-Item -LiteralPath` to avoid the PowerShell `[id]` bracket wildcard issue documented in `§ 7`.

**Option E — Track N4 (generative UI / 3D scenes; multi-session).**
- **First read:** `src/components/home/reply-renderer/MarkdownReply.tsx` (existing manifest fence pattern) + `lib/services/model-cascade.ts buildSystemPrompt()`.
- **Plan:** pick ~5 safe React components Olivia can reference (Card / Stat / Progress / Button / Form), define the JSON contract, parse + render.

**Option F — Track N2 (Mapbox 3D fly-to animation; flagged risky).**
- **First read:** `src/components/map/GoogleMap3DView.tsx` + `src/components/map/MapView.tsx`.
- I judged this too risky in this batch — surface it again only with appetite to read both files cold first.

**Option G — Pre-launch (S30 production deploy).**
- **First read:** `docs/RUNBOOK.md` end-to-end.
- **Action:** apply the **9 SQL migrations** in § 4 (04, 05, 06, 07, 08, 09, 10, 11, seed-investor-reputations), set the env vars in § 4, run the smoke tests in RUNBOOK § 5.

**Recommended pick (updated 2026-05-17, end of batch):** **Track G is fully closed** (S19 3/3 → `c2106e3`, S20 → `18bd216`). Next sensible pick is **Track C 11** (first of 4 Studio UI rebuild sessions) — replace the Studio v1 chrome ported in Track B 8c with the GrandMaster prototype shell. Pure frontend, no migrations needed, single session. Alternative: **Track L** cluesintelligence Unification (FLAGSHIP, ~10 sessions, this is what `00_PRODUCT_TRUTH.md` calls priority-2-but-the-company-is-built-on-it). Phase 4 injector remains deferred until a concrete consumer surface lands (Track L is the leading candidate to surface it).

---

## § 7 · Don't repeat the prior agent's mistakes

The agent before Track U was terminated 2026-05-08 for these patterns. They still apply:

1. **Reporting state from mental model rather than verifying.** Wrote "pushed" when uncommitted; "compiles cleanly" for files that didn't exist. Verify with `git status`, `git log`, actual `npx tsc --noEmit` output. **The prior handoff at `de4fef7` did exactly this** — claimed clean main, but verification this session showed 7 typecheck errors + 3 failing tests. Always run §0 verify on arrival.
2. **Phantom completion via failed PowerShell.** `Copy-Item "$src\[id]\page.tsx"` silently no-ops because PS treats `[id]` as wildcard. Use `Copy-Item -LiteralPath` after every copy and verify with `Test-Path`.
3. **Designing schema without checking LTM first.** Cost a full session of rework. Always grep LTM's schema for the equivalent before adding a new model.
4. **Skipping verification under time pressure.** When the user says "go fast," verification is MORE important, not less.
5. **Long hopeful summaries** describing intent rather than verified state. Match summary tense to verification level — "wrote, typecheck pending" not "shipped."
6. **Pushing broken code without flagging in the commit message.** If you push something broken, the commit message must say so.
7. **(NEW this session) Vite alias config can break in non-obvious ways on Windows.** O5a's first attempt aliased `server-only` to its package's `empty.js` via `path.resolve` — typecheck passed, but 14 unrelated route tests started timing out at module load. Reverted to `vi.mock("server-only", () => ({}))` in `vitest.setup.ts` (cleaner, targeted, well-tested in the React/Next ecosystem). If you reach for vite alias on Windows, prefer `vi.mock` first.

9. **(NEW 2026-05-09) NEVER reference an unapplied migration without inlining the SQL body.** This is now codified in `README.md` "ABSOLUTE RULE FOR EVERY CLAUDE SESSION" at the top of the file, and complemented in `~/CLAUDE.md`. The trigger was founder rage at being asked to "apply prisma/sql/10-add-avatar-eval-run.sql" without the SQL printed in the chat. Every reference — new file, end-of-session operator-action list, in-line in conversation — gets the full SQL printed inline in the same message. **`/admin/tools` now auto-detects unapplied migrations server-side and renders the SQL with a Copy button**, so the in-product UX matches the chat rule. If you find yourself typing "apply prisma/sql/" in chat, STOP and paste the SQL body first.

10. **(NEW 2026-05-09) ASCII-only inside SQL comments.** Founder hit `ERROR: 42601: syntax error at or near "§5"` because a line `-- (lands in O5c session 3 — see ... §5)` had an em dash + section sign in the comment. Some chat → clipboard → Supabase paste path autocorrected the leading `--` into a single en/em dash, postgres no longer treated the line as a comment, and tried to execute `§5`). This is now codified as a sub-rule under the README ABSOLUTE RULE. Use `*` for multiplication, `->` for arrows, `--` (two ASCII hyphens) for dashes inside prose, plain ASCII quotes. Identifiers and string literals can use Unicode; this only constrains COMMENT lines.

11. **(NEW 2026-05-09) Prior estimate of "1 session per LTM agent port" is wrong.** The bridge's v1 LTM API exposes only `organizations` and `districts` endpoints. Real LTM agents (e.g., g1-005) need `districtScoreHistory`, time-windowed `organization` groupings, and LTM-only utilities like `computeTechGravityScore`. Each port realistically takes ~2 sessions (degraded narrative-only OR extend the v1 API). See § 6 Option B for the corrected guidance. Don't promise "1 agent per session" without re-reading both ends.
8. **(NEW this session) Don't trust your own research memo's vendor claims without code verification.** O5's research memo said "Simli explicitly accepts viseme/phoneme metadata" — turned out OB's wrapper sends raw PCM only; that capability isn't in our integration. The O5d follow-up grounded the rejection in actual code paths (`src/lib/avatar/simli.ts:135-143`), not memory of vendor docs. **Always verify the integration before reasoning about its capabilities.**

This agent (the one writing this handoff) followed all 8 rules. Read every commit message — they're explicit about verification state.

---

## § 8 · Test gate

Run `npm test` to verify the suite is green before writing any new code. Last verified at HEAD `b4aa78f`: **93 test files / 1014 tests, all passing.**

This session's verification trail:
- Starting state at `de4fef7`: 92 files / 1009 tests, **3 failing** (V7 valuation route smokes — server-only import in client). Caught by §0 verify.
- After `949a97f` (server-only mock): back to 92/92, 1009/1009 (recovered the 3 V7 tests).
- After `d793fa9` (O5a + 5 new smoke tests for `/api/olivia/liveavatar/speak-stream`): **93/93, 1014/1014.**
- O5b, O5e, O5d: no test count delta (behavioral refinements + research-only memo).

Coverage from prior sessions still holds:
- chart-spec / GammaCard / TimelineFromSpec / CitationStrip parsers (manifest contract integrity)
- vertical-adapter detection + addendum content
- spoke-router classification across all 7 spokes + precedence rules
- golden-cases structural integrity

Don't break any of these. If you legitimately need to relax a check, update the test in the same commit and explain the change in the commit message. **Especially don't remove the `server-only` mock without a replacement** — 14+ route test files depend on it.

---

*End of handoff. Good luck.*
