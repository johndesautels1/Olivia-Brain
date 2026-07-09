# Studio Olivia — LTM ⇄ Olivia Brain Gateway Integration Plan

> **Status:** Plan / not started. **Owner repo for this doc:** Olivia Brain (the hub).
> **Scope rule (hard):** London Tech Map (LTM) is **read-only** from this repo. Every
> LTM-side change described here is a *specification for a separate LTM session*; this
> plan writes **zero** code into LTM. Grounded in a full read of both trees (Olivia
> Brain @ `2641998`, LTM @ `0d479a7`) 2026-07-09.

---

## 0. Thesis (one paragraph) — AUGMENTATION, NOT REPLACEMENT

**LTM is a walled garden with a mature brain of its own, and it stays that way.** Olivia
Brain does **not** replace, repoint, or proxy LTM's chat (GPT-4o), its Cristiano matching
engine, or its native valuation engine — all of that is well-developed and remains
untouched and sealed (LTM already declares itself "walled-garden-safe — imports NOTHING
from Olivia Brain"). Instead, Olivia Brain **plugs in additively as a capability layer for
the three things LTM lacks natively: advanced business-document generation, advanced
valuation/deal reasoning, and reasoning assistance.** The delivery vehicle is **"Studio
Olivia" — an interface ported *from* Olivia Brain *into* LTM** (the frontend/avatar
experience travels; LTM hosts it natively) that sits *alongside* LTM's existing Olivia and
calls out to the hub **only for those advanced capabilities**, on-behalf-of the shared
Clerk user, over a narrow token-authed gateway. Being the *full* brain is a **separate
mode** Olivia Brain uses only for **future spoke apps that have no brain yet** (§2).

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

### 1.2 LTM's embedded Olivia surface — stays as-is; Studio Olivia sits *beside* it
LTM's entire Olivia widget (bubble, panel, `/olivia` page, Preparation Studio) is driven
by `OliviaProvider.sendMessage()` (`src/components/olivia/OliviaProvider.tsx:228-309`) →
`POST /api/olivia/chat`. **This is NOT the integration seam — it is untouched.** LTM's
first-party assistant keeps working exactly as today. Studio Olivia is a *new, parallel*
surface (the ported OB interface) that invokes the hub only for the advanced-capability
gaps; the two coexist.
- LTM chat brain (unchanged): **OpenAI GPT-4o via the raw `openai` SDK** (`src/lib/olivia/chat.ts:224,291`); 40 Prisma-direct tools in `src/lib/olivia/tools.ts`. **We leave this alone.**
- Reused (not replaced): `OliviaConversation` / `OliviaMessage` / `OliviaUserMemory` / `OliviaConsent` (`prisma/schema.prisma:3433+, 4346+, 4307+`) — LTM keeps owning its conversation state.
- What Studio Olivia *reads* from LTM's existing state, via the provider's structured
  context, so the advanced surface is context-aware: `documentContext`, `pipelineContext`
  (already carries `cristianoPass`, `valuationSummary`), `compareContext`.

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

## 2. Target architecture — two distinct modes

Olivia Brain relates to a spoke in **one of two modes**, and this plan is almost entirely
about the first:

**Mode A — AUGMENT (brained apps, e.g. LTM).** The spoke keeps its own brain, data, auth,
and UI. Olivia Brain contributes only the advanced-capability delta and ships a Studio
Olivia interface that sits beside the spoke's native assistant. The spoke stays a walled
garden; the plug-in is narrow and additive.

**Mode B — BE THE BRAIN (greenfield spokes with no brain yet).** For future apps that
don't have their own orchestration, Olivia Brain *is* the full brain (cascade, personas,
memory, tools) and the spoke is a thin client. Not in scope for LTM; noted so the gateway
contract is designed once and reused.

```
             ┌──────────────────── clueslondon.com — LTM (WALLED GARDEN, untouched) ───────────────────┐
 Clerk       │  LTM's own Olivia widget + GPT-4o brain ....................... (stays, untouched)       │
 (shared     │  LTM's own Cristiano matching + native valuation engine ....... (stays, untouched)       │
  userId =   │                                                                                          │
  join key)  │  ★ STUDIO OLIVIA  — interface PORTED FROM Olivia Brain, hosted natively in LTM ─┐        │
             │    (advanced documents · advanced valuation/deal reasoning · reasoning assist)  │        │
             └────────────────────────────────────────────────────────────────────┬───────────┴────────┘
        OB → LTM read (exists): bridge/providers/ltm.ts → /api/v1 (orgs/districts)  │  LTM → OB, GAP-ONLY
                                                                                     ▼  (NET-NEW, narrow)
        ┌──────────────────────────── Olivia Brain (hub) — Mode A: AUGMENT ────────────────────────────┐
        │  /api/gateway/documents/generate  → advanced business-document suite (CORPUS / deal-protection)│
        │  /api/gateway/valuation/reason    → ADVANCED valuation reasoning ON TOP of LTM's own numbers   │
        │  /api/gateway/dealroom/message    → Cristiano negotiation (the ported-out brain LTM is missing)│
        │  /api/gateway/reasoning/assist    → reasoning assistance for the Studio surface                │
        │  /api/gateway/cristiano/verdicts  (EXISTS — verdict push, keep)                                │
        │  NOT provided to LTM: general chat, base valuation math, matching — LTM already has those.     │
        └──────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Embedding.** Studio Olivia is a **ported interface hosted natively inside LTM** (same
origin), not a cross-origin iframe — required anyway by LTM's `X-Frame-Options: SAMEORIGIN`
and needed so the avatar's mic/camera work. OB keeps its own DB (no shared Prisma; avoids
the Prisma 5↔7 / Next 14↔15 coupling in risks #1/#2). The gateway carries only the
gap-capability calls, on-behalf-of the shared Clerk user.

---

## 3. The gateway contract to build (Olivia Brain side)

OB's gateway today has exactly one endpoint (`/api/gateway/cristiano/verdicts`, inbound
verdict push, per-app bearer + `X-Cristiano-User-Id`, idempotent). Generalize that proven
pattern into a small **capability gateway** that serves **only the gaps** — never general
chat, base valuation math, or matching, which LTM already owns. All new routes:
`Authorization: Bearer GATEWAY_TOKEN_LTM`, `X-OB-User-Id` (shared Clerk userId, §4), Zod at
the boundary, rate-limited, `sourceApp` verification reused from `src/lib/gateway/auth.ts`.

| New OB endpoint | The LTM gap it fills | Body → returns | Reuses in OB |
|---|---|---|---|
| `POST /api/gateway/documents/generate` | LTM has no advanced business-document suite | `{kind, subjectId, context}` → `{document, provenance}` | `src/lib/reports/*`, deal-protection, CORPUS docs |
| `POST /api/gateway/dealroom/message` | LTM's `/api/valuation/deal-room` **is missing** (404 → canned) | `{sessionId, buyerType, message, valuationRunId}` → `{reply, rubricDelta}` | Cristiano challenge persona (`src/lib/personas/handlers/cristiano.ts`) |
| `POST /api/gateway/valuation/reason` | LTM has the *math*; lacks the advanced *reasoning* layer | `{ltmValuationRun, question}` → `{narrative, challenges, synergy}` | `src/lib/agents/valuation` intelligence agents |
| `POST /api/gateway/reasoning/assist` | Reasoning assistance for the Studio surface | `{task, context}` → streamed `{reply, citations}` | `runModelCascade` |
| `POST /api/gateway/avatar/script` | Persona script text for the ported Studio avatar | `{text, persona}` → `{ssml/plainText, emotion}` | `src/lib/avatar/identity.ts` |

**Scope guard:** LTM's own `/api/olivia/chat` (GPT-4o), `/api/valuation/run` (math), and
`/api/analysis/process` (matching) are **not** proxied or replaced. The gateway is invoked
by the Studio Olivia surface for advanced work the native app can't do.

Design notes:
- **Streaming** where the avatar wants low TTFB (SSE); the Studio surface reads the stream.
- **State.** LTM keeps owning its `OliviaConversation`/`OliviaMessage`; OB persists only its
  own advanced artifacts (documents, valuation reasoning) and can push a compact record back
  via the existing verdict channel.
- **Versioning.** `/api/gateway/**` is v1; add `X-OB-Gateway-Version`.
- **Consent.** OB honors an inbound `X-OB-Consent` header derived from LTM's `OliviaConsent`;
  PII redaction (`src/lib/compliance`) runs before any cross-app persistence (risk #5).

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

**Nothing in LTM's existing brain is repointed.** LTM's `OliviaProvider.sendMessage`,
GPT-4o chat, native valuation math, and Cristiano matching are all left exactly as they are.
The LTM-side work is purely *additive*: host the ported Studio Olivia surface and give it a
narrow client to OB for gap capabilities.

### 5.1 Port the Studio Olivia interface into LTM (additive, same-origin)
- Introduce `NEXT_PUBLIC_OLIVIA_BRAIN_URL` + a server-only `OLIVIA_BRAIN_GATEWAY_TOKEN`
  (LTM has no cross-app URL var today).
- Add an outbound client under `src/lib/integrations/olivia-brain/` (per LTM Law 2) — the
  only new HTTP client, used **only** for the gap-capability gateway calls (§3).
- Port OB's Studio Olivia interface as a **new** surface: a `/studio-olivia` route mirroring
  `/olivia` (server page → client shell) and/or a new provider+launcher in `layout.tsx`'s
  nested stack + a `MyToolsDock` entry. It sits **beside** LTM's existing Olivia, not over it.
- Reuse `src/components/studio/*` + `OliviaVideoAvatar`/`StudioOliviaAvatar` for the avatar
  and `/api/olivia/liveavatar[/speak]` unchanged; only the *advanced script/answer* comes
  from the OB gateway. Same-origin ⇒ `X-Frame-Options: SAMEORIGIN` + mic/camera all satisfied.
- Net LTM diff: ~1 new integration dir + 1 new surface. **Zero edits to LTM's brain.**

### 5.2 Fill the Deal Room gap (the beachhead)
- Point `DealRoomSimulator.tsx` at `POST /api/gateway/dealroom/message` (via the new client)
  so War Room negotiation stops falling back to canned rebuttals. This is advanced valuation
  *reasoning* LTM lacks — the textbook augmentation case, most user-visible win, validates the
  whole gateway, and touches nothing else in LTM.

### 5.3 Advanced documents + valuation reasoning
- The Studio surface offers "generate advanced document" / "explain & challenge this
  valuation" actions that call `documents/generate` and `valuation/reason`, passing LTM's
  *own* valuation run as input — OB reasons on top of LTM's numbers, never replaces them.

---

## 6. Reconciliation decisions (the collisions)

| Collision | Decision |
|---|---|
| **GPT-4o chat vs OB cascade** | **Coexist.** LTM's GPT-4o assistant is untouched and remains the primary chat. OB's cascade is invoked only for gap capabilities via the Studio surface. No swap, no fallback-flag needed. |
| **Two Cristianos** (matching vs valuation-challenge) | Keep separate. LTM's matching stays LTM's; OB supplies the *challenge/negotiation* reasoning via `dealroom/message`. |
| **Two Olivias** (assistant vs justification voice) | Keep separate axes per MERGE_PLAN risk #3: personas = who speaks; investor archetypes = who listens; entity modes = doc layout. LTM's assistant is not the OB persona. |
| **DB split vs shared** | **Separate DBs.** OB keeps its DB; LTM keeps its. Cross-reads via gateway/`/api/v1`. Avoids Prisma 5↔7 + Next 14↔15 coupling (risks #1/#2). |
| **`OliviaProvider` name clash** (both repos) | No shared import; the ported Studio surface is namespaced (`StudioOlivia*`) so it never collides with LTM's `OliviaProvider`. |
| **LTM tools (40, Prisma-direct)** | Untouched — they belong to LTM's brain. OB never proxies them. |

---

## 7. Phased delivery

- **Phase 0 — Corrections (do now, OB-side, this repo).** Fix the stale `LTCI_API_KEYS`
  references (§10 C-1) so the OB→LTM read channel is documented truthfully before building on it.
- **Phase 1 — Capability gateway MVP (OB).** Ship `POST /api/gateway/dealroom/message`
  (the missing brain LTM is calling for), `GATEWAY_TOKEN_LTM` + `X-OB-User-Id`, Zod,
  rate-limit, consent header, contract test + mock-mode. Exit: an authenticated curl returns
  a real Cristiano rebuttal + rubric delta.
- **Phase 2 — Advanced documents + valuation reasoning (OB).** `documents/generate` +
  `valuation/reason` + `reasoning/assist` + `avatar/script`. Exit: given an LTM valuation run,
  OB returns narrative/challenges/synergy and a generated document, without touching LTM math.
- **Phase 3 — Port Studio Olivia into LTM (separate LTM session).** §5.1 new surface + §5.2
  Deal Room wire. **No edits to LTM's brain.** Exit: Studio Olivia lives beside LTM's Olivia,
  answers advanced tasks with avatar+voice.
- **Phase 4 — Backpush + polish (OB).** Consent-gated push of OB artifacts back to LTM profile
  surfaces via the verdict channel.
- **Phase 5 — Mode B, greenfield spokes.** For a *brainless* future spoke, reuse the same
  gateway but in full-brain mode (spoke is a thin client). Spoke-readiness moves past 1/6.

Each phase is independently shippable and leaves both apps green.

---

## 8. Risk register (new findings + folded MERGE_PLAN risks)

| # | Risk | Mitigation |
|---|---|---|
| 1 | Prisma 5↔7 / Next 14↔15 divergence | Separate DBs; gateway HTTP only; no shared Prisma. |
| 2 | Cross-origin iframe blocked by `X-Frame-Options: SAMEORIGIN` | Same-origin path-mount surface; avoid iframing LTM. |
| 3 | Scope creep — pressure to let OB answer general chat too | Hold the line: gateway serves gaps only; LTM's GPT-4o stays primary. Studio surface routes only advanced tasks to OB. |
| 4 | Studio Olivia advanced answers feel disjoint from LTM's native Olivia | Share context (`documentContext`/`pipelineContext`) and persona/voice styling so the two read as one assistant with a "deep mode". |
| 5 | PII / GDPR on cross-app persistence | `compliance/pii-redactor` before backpush; honor `OliviaConsent` via header; `data_storage` revoke = erasure. |
| 6 | Avatar/voice vendor split (LiveAvatar vs OB HeyGen REST) | Avatar stays LTM-local; OB supplies only script text. |
| 7 | Streaming mismatch (LTM expects single reply) | SSE with a non-stream fallback shape. |
| 8 | Founder's "retire TDs before new features" rule (LTM CLAUDE.md) | All Phase-3 LTM work is net-new files w/ committed consumers; sequence after founder authorization. |

---

## 9. Open questions for the founder

1. **Embedding:** same-origin `/studio-olivia` path-mount (recommended) vs a dedicated
   subdomain (`studio.clueslondon.com`) reverse-proxied to OB?
2. **Surface shape:** should Studio Olivia be a *separate* launcher/page beside LTM's Olivia,
   or a "deep mode" toggle *inside* LTM's existing Olivia panel that routes advanced tasks to
   the gateway (more unified, but touches LTM's widget)?
3. **Capability boundary:** confirm the exact gap list — advanced documents + valuation
   reasoning + Deal Room + reasoning assist. Anything else LTM lacks (e.g. Quantara founder
   intake, deal-protection) that Studio Olivia should surface?
4. **Backpush:** should OB's generated documents/valuation reasoning appear on LTM
   profile/deal pages (needs consent + redaction), or stay in the Studio surface for v1?
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
