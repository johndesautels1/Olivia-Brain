# Studio Olivia — LTM ⇄ Olivia Brain Gateway Integration Plan

> **Status:** Plan / not started. **Owner repo for this doc:** Olivia Brain (the hub).
> **Scope rule (hard):** London Tech Map (LTM) is **read-only** from this repo. Every
> LTM-side change described here is a *specification for a separate LTM session*; this
> plan writes **zero** code into LTM. Grounded in a full read of both trees (Olivia
> Brain @ `2641998`, LTM @ `0d479a7`) 2026-07-09.

---

## 0. Thesis (one paragraph)

Olivia Brain is the **hub**. "Studio Olivia" is the hub's face **rendered inside LTM**
(`clueslondon.com`) as a native surface. Today LTM already ships a first-party Olivia
widget with its *own* brain (GPT-4o), its *own* Cristiano matching engine, and a
valuation/War-Room UI whose live negotiation endpoint **does not exist** (it was ported
out to Olivia Brain). The integration replaces LTM's local brain with the hub's brain
over a **bidirectional, token-authed gateway**, keeps LTM's polished avatar/voice/UI
shells, and unifies identity through the Clerk `userId` both apps already share. The
work is mostly **wiring, not rebuilding** — one provider function on the LTM side and a
set of new gateway endpoints on the OB side are the whole spine.

---

## 1. What already exists (the seams are real)

### 1.1 Three trust channels are already scaffolded in OB config
`src/lib/config/env.ts` already declares all three directions:

| Channel | Direction | Var (OB side) | LTM side | Purpose |
|---|---|---|---|---|
| Public data read | OB → LTM | `CLUES_LONDON_V1_API_KEY` (Bearer) | `/api/v1/*` | orgs/districts/news |
| Internal signed | OB → LTM | `CLUES_LONDON_INTERNAL_API_KEY` | `/api/internal/olivia/*` | shared-secret machine calls |
| Verdict push | LTM → OB | `GATEWAY_TOKEN_LTM` (Bearer) | `/api/gateway/*` | push Cristiano verdicts into OB |

**What's missing** is the fourth, load-bearing channel: **LTM → OB compute** (chat,
valuation, Deal Room, avatar-script) — the direction that makes Studio Olivia *think*.
That's the core net-new work.

### 1.2 LTM's embedded Olivia surface — the single repoint
LTM's entire Olivia widget (bubble, panel, `/olivia` page, Preparation Studio) is driven
by **one function**: `OliviaProvider.sendMessage()` (`src/components/olivia/OliviaProvider.tsx:228-309`),
which `POST`s `/api/olivia/chat`. Every UI is a props-less `useOlivia()` consumer, so
**repointing that one fetch at the OB gateway swaps the brain without touching any UI**.
- LTM chat brain today: **OpenAI GPT-4o via the raw `openai` SDK** (`src/lib/olivia/chat.ts:224,291`) — it bypasses LTM's own `callLLM`/cascade and metering. 40 tools in `src/lib/olivia/tools.ts` query Prisma directly.
- Voice/telephony path already routes through `callLLM` (Anthropic `claude-sonnet-4-6`).
- Persistence: `OliviaConversation` / `OliviaMessage` / `OliviaUserMemory` / `OliviaConsent` (`prisma/schema.prisma:3433+, 4346+, 4307+`).
- Context injection contract to preserve: `documentContext`, `pipelineContext` (already carries `cristianoPass`, `valuationSummary`), `compareContext`.

### 1.3 LTM public API + auth — and a stale contract to fix
`/api/v1/*` = 5 read-only GET routes (orgs list/[slug], districts, news, usage), single
auth impl `src/lib/api/public-v1.ts`. **Inbound auth changed 2026-07-03:** the old
`LTCI_API_KEYS` env layer was **retired** and replaced by a `cll_`-prefixed **`ApiKey`
Prisma table** (SHA-256 stored) owned by a `UserProfile`, gated live on the `rest-api`
entitlement + `apiCallsPerMonth`. **OB's `LtmKnowledgeProvider` doc + `env.ts` comment
still reference `LTCI_API_KEYS` — now false on both sides** (see §10, correction C-1).

### 1.4 LTM valuation + Cristiano — and the missing endpoint
- **`/api/valuation/deal-room` does not exist.** `DealRoomSimulator.tsx:101` POSTs to it → 404 → canned keyword rebuttals (`:126-160`). **This is the port-out gap** and the cleanest first gateway win.
- Two engines share each name: **Cristiano** = entity-matching (`src/lib/analysis/cristiano.ts`, Gemini-2.0-flash structure → Opus-4-7 judge) *and* the valuation challenge persona (`src/lib/agents/valuation/challenge-agent.ts`). **Olivia** = platform assistant *and* the valuation justification voice (`justification-agent.ts` / `OliviaNarrative.tsx`). Do not merge these axes.
- All LTM LLM now flows through `callLLM` (`src/lib/agents/llm.ts`) **except** the GPT-4o Olivia chat. Valuation engine (`src/lib/valuation/engine.ts`, 10 methods) is pure math; Olivia's `run_valuation` tool calls it in-process (math only, no cascade).
- 56-field founder intake (`public/assets/founder-valuation-form.html`) is a **static prototype**, not wired.

### 1.5 Design + embedding constraints
- **Shared palette already:** LTM `--surface-base #0a0e1a` + gold `--color-aurum-primary #c4a96a` + glass tiers (`.glass-elevated`, `.glass-focal`) = the same Aurum/Aether language OB uses. Studio Olivia can look native with existing tokens + the `src/components/studio/*` family (which already includes `StudioOliviaChat.tsx`, `StudioOliviaAvatar.tsx`).
- **Embedding hard constraint:** LTM sets `X-Frame-Options: SAMEORIGIN` on *every* response (`next.config.mjs:118`), no CSP `frame-ancestors`. **Cross-origin iframing of LTM is blocked; same-origin embedding is strongly preferred.** The generic `ExternalOverlayProvider` iframe sandbox omits mic/camera, so voice/avatar can't live inside it.
- **Avatar pipeline is complete and reusable:** LiveAvatar LITE → LiveKit → ElevenLabs PCM-24k (`src/lib/olivia/liveavatar.ts`, `OliviaVideoAvatar.tsx`, `/api/olivia/liveavatar[/speak]`), auth-gated (credits).
- **Identity join key = Clerk `userId`** (`UserProfile.clerkUserId @unique`). Same Clerk instance ⇒ same user across both apps. No cross-app identity table exists yet.

---

## 2. Target architecture

```
                 ┌──────────────────────── clueslondon.com (LTM, Next 14) ─────────────────────┐
   Clerk (shared)│  OliviaProvider.sendMessage ─┐        DealRoomSimulator ─┐   War Room ─┐     │
   userId is the │  StudioOliviaChat / Avatar    │        (missing route)    │            │     │
   join key      │  (existing UI shells, reused) │                           │            │     │
                 └──────────────┼────────────────┴───────────┼───────────────┴────────────┼─────┘
                                │  (4) LTM → OB COMPUTE gateway (NET-NEW)                   │
                                ▼  Authorization: Bearer GATEWAY_TOKEN_LTM + X-OB-User-Id   │
        ┌──────────────────────────────── Olivia Brain (hub, Next 15) ───────────────────────────┐
        │  /api/gateway/olivia/chat      → cascade brain (chat)                                   │
        │  /api/gateway/valuation/run    → valuation engine + intelligence agents                 │
        │  /api/gateway/dealroom/message → Cristiano negotiation (the ported-out brain)           │
        │  /api/gateway/avatar/script    → persona-driven avatar/voice script                     │
        │  /api/gateway/cristiano/verdicts (EXISTS — verdict push, keep)                          │
        │                                                                                          │
        │  bridge/providers/ltm.ts  ── (1) OB → LTM /api/v1 read (orgs/districts/news) ───────────┼──▶ LTM
        │  (its own DB; conversations/memory/valuation live here)                                 │
        └──────────────────────────────────────────────────────────────────────────────────────┘
```

**Run mode.** Adopt the `MERGE_PLAN.md` `OLIVIA_RUN_MODE` idea but **default to
"gateway" (same-origin embed via a published surface), not "embedded" (shared Prisma).**
Reasons: LTM is Prisma 5 / Next 14, OB is Prisma 7 / Next 15 (risk register #1/#2);
`X-Frame-Options: SAMEORIGIN` makes a cross-origin iframe the worst option; and OB
already owns its own DB. **Recommended embedding = same-origin path mount** (see §5.2)
so the avatar/mic work and no CSP surgery is needed.

---

## 3. The gateway contract to build (Olivia Brain side)

OB's gateway today has exactly one endpoint (`/api/gateway/cristiano/verdicts`, inbound
verdict push, per-app bearer + `X-Cristiano-User-Id`, idempotent). Generalize that proven
pattern into a small **compute gateway**. All new routes: `Authorization: Bearer
GATEWAY_TOKEN_LTM`, `X-OB-User-Id` (resolved from shared Clerk userId, see §4), Zod at the
boundary, rate-limited, `sourceApp` verification reused from `src/lib/gateway/auth.ts`.

| New OB endpoint | Replaces / serves (LTM) | Body → returns | Reuses in OB |
|---|---|---|---|
| `POST /api/gateway/olivia/chat` | `OliviaProvider.sendMessage` → LTM `/api/olivia/chat` | `{message, conversationId?, context:{page,document,pipeline,compare}}` → streamed `{reply, conversationId, toolCalls}` | `src/app/api/olivia/chat` + `runModelCascade` |
| `POST /api/gateway/dealroom/message` | LTM's **missing** `/api/valuation/deal-room` | `{sessionId, buyerType, message, valuationRunId}` → `{reply, rubricDelta}` | Cristiano challenge persona (`src/lib/personas/handlers/cristiano.ts`) |
| `POST /api/gateway/valuation/run` | LTM `/api/valuation/run` full-cascade mode | `{subject, scenario, buyerType}` → `ValuationRunResponse` | `src/lib/valuation` + `src/lib/agents/valuation` |
| `POST /api/gateway/avatar/script` | LTM avatar reply text (feeds `/api/olivia/liveavatar/speak`) | `{text, persona}` → `{ssml/plainText, emotion}` | `src/lib/avatar/identity.ts` |

Design notes:
- **Streaming.** Chat must stream (LTM's UI expects a single reply today, but the avatar
  wants low TTFB). Ship SSE; LTM's `sendMessage` adapts to read the stream.
- **Stateless-ish.** OB owns conversation state in its DB; LTM passes `conversationId`
  and its structured context. OB writes back a compact record LTM can show on profile
  pages via the existing verdict-push channel or a new `/api/gateway/olivia/history` read.
- **Versioning.** Namespace `/api/gateway/**` is v1 by construction; add `X-OB-Gateway-Version`.
- **Consent.** OB honors an inbound `X-OB-Consent: learning|ai_processing|data_storage`
  header derived from LTM's `OliviaConsent`; PII redaction (`src/lib/compliance`) runs
  before any cross-app persistence (risk #5).

---

## 4. Identity & trust model

1. **Shared Clerk instance.** Both apps use the same Clerk publishable/secret keys ⇒ a
   signed-in user carries the **same `userId`** in both. This is the join key.
2. **User resolution.** LTM sends the Clerk `userId` as `X-OB-User-Id`. OB maps it to (or
   lazily provisions) its own user row keyed by that Clerk id. No shared DB needed.
3. **Service auth.** `GATEWAY_TOKEN_LTM` (already in OB env) authenticates LTM-the-service;
   `X-OB-User-Id` authorizes on-behalf-of a user. The `verifyGatewayBearer` +
   `sourceApp`-match logic in `src/lib/gateway/auth.ts` extends verbatim.
4. **Reverse (OB→LTM) reads** continue via a `cll_` **Enterprise API key** (NOT the retired
   `LTCI_API_KEYS`) in `CLUES_LONDON_V1_API_KEY`, tracked against the 10k/mo quota; poll
   `GET /api/v1/usage` (free) for headroom.
5. **Tenancy.** All OB traffic from LTM runs in a fixed tenant (`OLIVIA_EMBED_TENANT=ltm-production`,
   per MERGE_PLAN) so multi-tenant policy/rate/branding apply.

---

## 5. LTM-side integration (specification for a separate LTM session — no code written here)

### 5.1 The minimal-diff brain swap (highest value, lowest risk)
- Introduce `NEXT_PUBLIC_OLIVIA_BRAIN_URL` + a server-only `OLIVIA_BRAIN_GATEWAY_TOKEN`
  (LTM has no cross-app URL var today).
- Add an outbound client under `src/lib/integrations/olivia-brain/` (per LTM Law 2) — the
  only new HTTP client; per Law 3 it does **not** go through `callLLM` (it *is* the brain).
- Repoint **`OliviaProvider.sendMessage`** at `POST {BRAIN_URL}/api/gateway/olivia/chat`
  with the Clerk `userId` header. Keep `/api/olivia/chat` as a thin fallback behind a flag.
- Net LTM diff: ~1 new dir + ~1 function edited. All widget UIs unchanged.

### 5.2 Studio Olivia surface (same-origin, avatar-capable)
- Add a `/studio-olivia` route mirroring `/olivia` (server page → client shell), OR mount
  a new provider+launcher in `layout.tsx`'s nested stack + a `MyToolsDock` entry — the
  documented pattern for global surfaces.
- Reuse `src/components/studio/*` + `OliviaVideoAvatar`/`StudioOliviaAvatar` for the avatar;
  reuse `/api/olivia/liveavatar[/speak]` unchanged (avatar stays LTM-local; only the
  *script text* comes from `POST /api/gateway/avatar/script`).
- Because it's same-origin, `X-Frame-Options: SAMEORIGIN` and the mic/camera grants are
  satisfied with no CSP change. (If a cross-origin iframe is ever required, LTM must add
  `frame-ancestors` and widen the overlay sandbox — avoid.)

### 5.3 Fill the Deal Room gap
- Point `DealRoomSimulator.tsx` at `POST /api/gateway/dealroom/message` (via the new
  integration client) so the War Room negotiation stops falling back to canned rebuttals.
  This is the single most user-visible win and validates the whole gateway.

---

## 6. Reconciliation decisions (the collisions)

| Collision | Decision |
|---|---|
| **GPT-4o chat vs OB cascade** | OB gateway becomes the brain; LTM's GPT-4o path retained only as flagged fallback. OB cascade already multi-provider. |
| **Two Cristianos** (matching vs valuation-challenge) | Keep separate. Gateway exposes matching via `verdicts` (exists) and challenge via `dealroom/message` (new). |
| **Two Olivias** (assistant vs justification voice) | Keep separate axes per MERGE_PLAN risk #3: personas = who speaks; investor archetypes = who listens; entity modes = doc layout. |
| **DB split vs shared** | **Separate DBs.** OB keeps its DB; LTM keeps its. Cross-reads via gateway/`/api/v1`. Avoids Prisma 5↔7 + Next 14↔15 coupling (risks #1/#2). |
| **`OliviaProvider` name clash** (both repos) | Namespaced by repo; only LTM's is touched. No shared module import. |
| **LTM tools (40, Prisma-direct) vs OB tools** | Phase 1 keeps LTM tools server-side (OB chat can call back to `/api/v1` for public data). Phase 3 migrates high-value tools behind the gateway. |

---

## 7. Phased delivery

- **Phase 0 — Corrections (do now, OB-side, this repo).** Fix the stale `LTCI_API_KEYS`
  references (§10 C-1) so the OB→LTM read channel is documented truthfully before building on it.
- **Phase 1 — Compute gateway MVP (OB).** Ship `POST /api/gateway/olivia/chat`
  (SSE, cascade-backed, `GATEWAY_TOKEN_LTM` + `X-OB-User-Id`, Zod, rate-limit, consent header).
  Contract test + mock-mode. Exit: an authenticated curl returns a streamed reply.
- **Phase 2 — Deal Room brain (OB).** `POST /api/gateway/dealroom/message` backed by the
  Cristiano challenge persona. Exit: returns a real rebuttal + rubric delta for a seeded run.
- **Phase 3 — LTM reference integration (separate LTM session).** §5.1 repoint + §5.3 Deal
  Room wire + `/studio-olivia` surface. Exit: Studio Olivia answers in LTM with avatar+voice.
- **Phase 4 — Valuation + avatar-script gateway (OB) + backpush.** `valuation/run` +
  `avatar/script` endpoints; OB → LTM conversation backpush for profile pages (consent-gated).
- **Phase 5 — Generalize to the other 5 spokes.** The same gateway contract, per-app token,
  proves out on lifescore/cluesintelligence/etc. (spoke-readiness moves past 1/6).

Each phase is independently shippable and leaves both apps green.

---

## 8. Risk register (new findings + folded MERGE_PLAN risks)

| # | Risk | Mitigation |
|---|---|---|
| 1 | Prisma 5↔7 / Next 14↔15 divergence | Separate DBs; gateway HTTP only; no shared Prisma. |
| 2 | Cross-origin iframe blocked by `X-Frame-Options: SAMEORIGIN` | Same-origin path-mount surface; avoid iframing LTM. |
| 3 | LTM chat is anonymous-capable today; gateway needs a user | Allow anonymous → OB "guest" tenant; upgrade on sign-in. |
| 4 | GPT-4o→cascade behavioral drift (tone, tools) | Keep LTM path behind a flag; A/B before full cutover. |
| 5 | PII / GDPR on cross-app persistence | `compliance/pii-redactor` before backpush; honor `OliviaConsent` via header; `data_storage` revoke = erasure. |
| 6 | Avatar/voice vendor split (LiveAvatar vs OB HeyGen REST) | Avatar stays LTM-local; OB supplies only script text. |
| 7 | Streaming mismatch (LTM expects single reply) | SSE with a non-stream fallback shape. |
| 8 | Founder's "retire TDs before new features" rule (LTM CLAUDE.md) | All Phase-3 LTM work is net-new files w/ committed consumers; sequence after founder authorization. |

---

## 9. Open questions for the founder

1. **Embedding:** same-origin `/studio-olivia` path-mount (recommended) vs a dedicated
   subdomain (`studio.clueslondon.com`) reverse-proxied to OB?
2. **Cutover:** hard-swap `OliviaProvider.sendMessage` to the gateway, or dual-run GPT-4o vs
   cascade behind a flag with A/B first (recommended)?
3. **Anonymous chat:** preserve LTM's no-auth chat through the gateway (guest tenant), or
   require sign-in for Studio Olivia?
4. **Backpush:** should OB conversations appear on LTM user-profile pages (needs consent +
   redaction), or stay hub-only for v1?
5. **Timing vs LTM's TD freeze:** Phase 3 touches LTM — sequence after the TD register drains,
   or carve out an authorized exception given Studio Olivia is a headline feature?

---

## 10. Immediate corrections surfaced by this study (OB-side, safe now)

- **C-1 (stale contract):** OB's `src/lib/bridge/providers/ltm.ts` header + `src/lib/config/env.ts`
  comment state the LTM key var is `LTCI_API_KEYS`. LTM **retired** that on 2026-07-03 in favor
  of `cll_` `ApiKey` rows gated on the `rest-api` entitlement. The OB→LTM read channel still works
  (Bearer is Bearer) but the docs are now false and will mislead the next agent. Fix the comments
  and note the key must be a `cll_` Enterprise key.
- **C-2 (missing endpoint is a feature hook, not a bug to fix in LTM):** LTM's
  `/api/valuation/deal-room` 404 is the port-out gap; do **not** rebuild it in LTM — serve it from
  the OB gateway (Phase 2).
```
