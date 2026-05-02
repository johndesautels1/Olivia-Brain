# GRAND MASTER OLIVIA — MERGE PLAN

> Companion to `MERGE_INVENTORY.md`. Read that first for the feature/tech inventory across the three sources.
>
> **Goal:** Unify Olivia Brain + LTM Olivia/Studio + Studio Prototype into one product ("Grand Master Olivia") that runs in two deployment modes:
> 1. **Standalone** — Olivia Brain repo as a complete SaaS (own homepage, own DB, multi-tenant, white-label).
> 2. **Embedded** — same codebase, drop-in replacement for LTM-internal Olivia, sharing LTM's PostgreSQL/Prisma layer for Organization/Person/Event/etc.
>
> Last updated: 2026-05-02

---

## 1. ARCHITECTURE DIAGRAM (proposed unified module layout)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        GRAND MASTER OLIVIA (this repo)                          │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                       PRESENTATION (Next.js App Router)                  │  │
│  │                                                                          │  │
│  │  /app/(public)/page.tsx         ← StudioOlivia GrandMaster homepage      │  │
│  │  /app/(public)/studio/...       ← Studio shell (Pitch / Plan / Docs)     │  │
│  │  /app/(admin)/admin/...         ← 250-agent dashboard, integrations,     │  │
│  │                                    tenants, white-label, audit, memory   │  │
│  │  /app/(embed)/widget/[shellId]  ← LTM-embedded iframe variant            │  │
│  │                                                                          │  │
│  │  src/components/                                                         │  │
│  │   ├── studio/        (PreparationStudio + 27 LTM components, refactored) │  │
│  │   ├── pitch/         (Library, DeckDetailModal, score-chip HUD, themes)  │  │
│  │   ├── documents/     (workspace + 17 block types)                        │  │
│  │   ├── olivia/        (chat, voice, presentation, video avatar)           │  │
│  │   ├── primitives/    (AvatarOrb, ConsensusDots, Badge, CompletionRing)   │  │
│  │   └── admin/         (AdminDashboardClient + integrations panel)         │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                  │                                              │
│  ┌───────────────────────────────▼──────────────────────────────────────────┐  │
│  │                          API ROUTE LAYER                                  │  │
│  │   /api/olivia/{chat,voice/*,call/*,sms,email,whatsapp,presentation,...}  │  │
│  │   /api/studio/{question,polish,analyze,research,polish}                  │  │
│  │   /api/pitch/{archetypes,templates,draft,analyze,optimize,chat}          │  │
│  │   /api/judge,  /api/search,  /api/health,  /api/inngest                  │  │
│  │   /api/admin/{integrations,memory,migrations,approvals,agents,toggles}   │  │
│  │   /api/bridge/{query,subscribe}     ← embedded-mode contract             │  │
│  └───────────────────────────────┬──────────────────────────────────────────┘  │
│                                  │                                              │
│  ┌───────────────────────────────▼──────────────────────────────────────────┐  │
│  │                  CORE BRAIN (provider-agnostic)                           │  │
│  │                                                                          │  │
│  │  src/lib/orchestration/  → LangGraph 5-node + intent router              │  │
│  │  src/lib/services/       → 9-model cascade (Brain) + cascade-events bus  │  │
│  │  src/lib/cascade/        → 4-phase orchestrator (LTM port) + 15 prompts  │  │
│  │  src/lib/personas/       → Olivia/Cristiano/Emelia + orchestrator        │  │
│  │  src/lib/pitch/          → 75 archetypes + 12 templates + scoring        │  │
│  │  src/lib/studio/         → question engine, entity modes, suggestions    │  │
│  │  src/lib/agents/         → registry (250) + runner (Brain) + g1/g2/val   │  │
│  │  src/lib/clues-intel/    → paragraphs + 23 modules + adaptive engine     │  │
│  │  src/lib/scoring/        → SMART score / verdict / comparison            │  │
│  └───────────────────────────────┬──────────────────────────────────────────┘  │
│                                  │                                              │
│  ┌───────────────────────────────▼──────────────────────────────────────────┐  │
│  │            INFRA LAYER (memory, voice, avatar, telephony, compliance)    │  │
│  │                                                                          │  │
│  │  memory/ (5 layers)  voice/ (TTS+STT)  avatar/ (4 vendors)              │  │
│  │  realtime/ (LiveKit/Vapi/Retell/Twilio)  telephony/ (sms/sip/recording) │  │
│  │  compliance/ (PII/FairHousing/Guardrails/Consent/DataResidency)         │  │
│  │  observability/ (Langfuse/OTel/Braintrust/Patronus)                     │  │
│  │  tenant/ + white-label/ + entitlements/                                 │  │
│  └───────────────────────────────┬──────────────────────────────────────────┘  │
│                                  │                                              │
│  ┌───────────────────────────────▼──────────────────────────────────────────┐  │
│  │           BRIDGE / UNIVERSAL KNOWLEDGE PROVIDER                          │  │
│  │                                                                          │  │
│  │   src/lib/bridge/registry.ts      ← embedded | live | hybrid             │  │
│  │   src/lib/bridge/adapters/        ← one per consumer (LTM, CLUES, ...)   │  │
│  │                                                                          │  │
│  │   ┌─────────────────────┐           ┌─────────────────────┐             │  │
│  │   │ Standalone mode     │           │ Embedded mode       │             │  │
│  │   │ → own Prisma 7 DB   │           │ → reads LTM DB      │             │  │
│  │   │ → own homepage      │           │ → embedded in LTM   │             │  │
│  │   │ → multi-tenant      │           │ → tenant=ltm-prod   │             │  │
│  │   │ → cron via Inngest  │           │ → no cron (LTM has) │             │  │
│  │   └─────────────────────┘           └─────────────────────┘             │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘

                         ▲                                  ▲
                         │ HTTP/JSON                        │ Direct import
                         │ (CORS + OAuth)                   │ (npm package)
                         │                                  │
            ┌────────────┴───────────┐         ┌────────────┴─────────────┐
            │  External SaaS clients │         │   London-Tech-Map repo   │
            │  (Realtor, brokerage)  │         │  (consumes Olivia as a   │
            │                        │         │   workspace package)     │
            └────────────────────────┘         └──────────────────────────┘
```

Key architectural decisions:
- **One repo, two run modes.** A single env flag (`OLIVIA_RUN_MODE=standalone|embedded`) toggles the bridge providers and which Prisma client is bound.
- **Studio is a feature, not an app.** All Studio code lives in `src/components/studio/` + `src/lib/studio/` and is mounted at `/studio` in standalone mode and exposed as a publishable React module in embedded mode.
- **Bridge is the contract.** LTM never imports Olivia internals directly — it imports `@grand-master-olivia/bridge` and configures a registry. Same package supports CLUES London Calendar, CLUES LifeScore, Tampa Bay, etc.

---

## 2. STANDALONE vs EMBEDDED MODE

### Standalone mode
- **Process:** Vercel deployment of the unified repo.
- **DB:** Brain's Prisma 7 schema (33 models + new Studio/Documents/Package models migrated from LTM).
- **Auth:** Clerk (LTM bring-along) wired into `tenant/context.ts`.
- **Homepage:** rebuild prototype layout in React 19 + dark theme.
- **Calendar:** standalone CalendarService Prisma models (migrated subset of LTM's 14 calendar models).
- **Cron:** Inngest + Trigger.
- **Pricing:** Stripe (LTM bring-along) tied to `white-label/entitlements.ts` tiers.
- **All 27 vertical adapters live.**
- **All 250 agents live, runnable from admin dashboard.**

### Embedded mode (drop into LTM)
- **Distribution:** Olivia repo publishes:
  1. `@grand-master-olivia/server` — server code (route handlers, lib, prisma extensions).
  2. `@grand-master-olivia/widget` — React component (`<OliviaWorkspace>`) for hosts.
  3. `@grand-master-olivia/bridge` — the registry contract.
- **Mount point in LTM:** LTM continues to own homepage/landing/map/maps/3D. Olivia mounts at:
  - `/olivia/*` — chat, voice, calls, SMS, email, presentation (replaces existing `src/app/api/olivia/*` routes).
  - `/studio/*` — studio shell (replaces existing `src/components/studio/*`).
  - `/app/api/calendar/olivia` — LTM continues to host its calendar; Olivia calls it via the bridge.
- **DB:** Olivia uses **LTM's Prisma client**, not its own. Olivia's models (Conversations, Memory layers, Tenants, etc.) are added via Prisma's multi-schema feature (`olivia` schema namespace) so LTM models stay untouched.
- **Tenant binding:** `OLIVIA_EMBED_TENANT=ltm-production` resolves at boot from env. All Olivia traffic runs in this fixed tenant.
- **Cron:** disabled (LTM owns scheduling).
- **Billing:** disabled (LTM owns Stripe).
- **Adapters:** LTM provides a Bridge implementation for `Organization`, `Person`, `Event`, `FundingRound`, `District`, `Document`, `Package` so Olivia agents can read/write without owning the schema.

---

## 3. FEATURE RETENTION MATRIX (which source's implementation wins)

| Capability | Winner | Reason |
|---|---|---|
| 9-model cascade | **Brain** | LangGraph + AI SDK is more mature; LTM cascade orchestrator becomes a special-case caller of it. |
| Cascade prompts catalog (15 prebuilt) | **LTM** | Brain has no equivalent; copy `cascade/prompts/index.ts` into `lib/orchestration/prompts/`. |
| Cascade events DB log + injector | **LTM** | Useful pattern. Move to `lib/orchestration/events.ts` + new Prisma model. |
| Olivia chat handler | **LTM** | `processOliviaMessage` is richer (intent sniffing, tool calling). Wrap as a LangGraph node. |
| Olivia knowledge base + system prompt | **LTM** | `buildOliviaSystemPrompt` + `buildStudioOliviaPrompt` more sophisticated. |
| Olivia tools registry | **LTM** | `lib/olivia/tools.ts` integrates better with LTM data. |
| Personas (Olivia/Cristiano/Emelia) | **Brain** | Three-persona orchestration is better-modelled. Spelling: "Emelia". |
| Investor personas (5) | **Brain port from Prototype** | `lib/pitch/personas.ts` already canonical. |
| Entity-mode personas (6) | **LTM** | `lib/studio/entityModes.ts` is a different axis — keep both. |
| TTS / STT | **Brain** | Provider abstraction wins. LTM uses browser SR which can't do real outbound voice. |
| LiveAvatar UI client | **LTM** | `@heygen/liveavatar-web-sdk` integration; Brain only has REST clients. |
| Avatar server abstraction | **Brain** | 4-vendor unified `avatar/index.ts`. |
| AvatarOrb visual identity | **Prototype** | Single-orb gradient is the brand anchor. |
| Twilio call routes | **LTM** | 10 sub-routes are battle-tested. Move under `lib/telephony/` namespace. |
| WhatsApp / Email / SMS channels | **LTM** | Brain has SMS only. |
| Voice → document pipeline | **LTM** | Brain has nothing equivalent. |
| Calendar (data) | **LTM** | 14 models > Brain's adapter. Migrate models to Olivia schema. |
| Calendar Olivia recommendation | **LTM** | `OliviaCalendarRecommendation` model. |
| Memory: episodic/semantic/procedural/graph/journey | **Brain** | Far richer. Migrate `OliviaUserMemory` data into Brain schema. |
| Mem0 cross-session | **Brain** | LTM has none. |
| Multi-tenant | **Brain** | LTM has none. |
| White-label | **Brain** | LTM has none. |
| Compliance (PII/FH/guardrails/data-residency/consent/subflows) | **Brain** | Far richer. Migrate `OliviaConsent` model. |
| RAG pipeline | **Brain** | Firecrawl/Unstructured/Cohere/Jina + citation-first + Graph-RAG. |
| 250 agents (metadata) | **Brain** | Registry + admin dashboard. |
| ~120 runnable agents (impl) | **LTM** | Real code. Move under `lib/agents/impl/` keeping g1-/g2- prefixes. |
| Valuation suite | **LTM** | 8 specialised agents, no Brain equivalent. Move under `lib/agents/valuation/`. |
| Video pipeline (g2-222..230) | **LTM** | 8 video agents. |
| District intelligence | **LTM** | LTM-specific; only used in embedded mode. |
| Studio question engine | **LTM** | `lib/studio/questionMapper.ts` + `types.ts`. |
| Studio components (27) | **LTM** | Becomes the Studio shell. |
| Document blocks (17) | **LTM** | Library of renderable blocks. |
| Document workspace + editor | **LTM** | Full editing UX. |
| Package + outreach + receiver flows | **LTM** | 12+ models. Migrate to Olivia schema. |
| Pitch module data (75/12/16/14/10) | **Brain port from Prototype** | Already done. |
| Pitch scoring + optimize | **Brain** | LLM wiring is real, not stubbed. |
| Library / DeckDetailModal / Apply-archetype | **Prototype layout + Brain backend** | Rebuild as React 19 component using `lib/pitch/*` data. |
| Score chips header HUD (CLR/IMP/MOT/ALL) | **Prototype** | Recompute from Brain's `scoreDecks`. |
| Mode toggle Guided/Freeform | **Prototype** | Add to PreparationStudio. |
| Themes (5 London) | **Brain port from Prototype** | `pitch/constants.ts:THEMES`. |
| Audit log tab | **Prototype UI + Brain DB** | Pull `admin_audit_logs` filtered to user/session. |
| Preview tab (light inversion) | **Prototype** | Unique design. |
| 250-agent admin dashboard | **Brain** | LTM has none. |
| Cron / durable execution | **Brain** | Inngest + Trigger + Temporal + QStash. |
| Observability (Langfuse + Braintrust + Patronus) | **Brain** | LTM has none. |
| HITL (approvals + confidence gate + action budgets) | **Brain** | LTM has none. |
| Stripe billing | **LTM** | Brain has none. Optional in standalone. |
| Clerk auth | **LTM** | Brain has none. Wire into `tenant/`. |
| Map / 3D visualisation | **LTM** | Embedded mode only — out of scope for Grand Master Olivia. |
| Companies House / Kimi providers | **LTM** | Add to Brain's cascade. |

---

## 4. MIGRATION PHASES

### Phase 0 — Foundation freeze (Week 0)
**Deliverables:**
- Lock Brain at Next 16.2 / React 19.2 / Prisma 7.7 / TS 6 / AI SDK 6.
- Decide: LTM components targeted at React 19. Refactor any React 18-isms (no `useFormState` ergonomic changes; check `useId`, `useTransition`).
- Decide: LTM's `openai` 6.32 raw client → port to `@ai-sdk/openai`.
- Confirm: Studio prototype is REFERENCE ONLY, not code-imported.

**Dependencies:** none.
**Exit criteria:** `package.json` of Grand Master Olivia covers all required deps; matrix of LTM-vs-Brain version conflicts resolved.

### Phase 1 — Bridge contract first (Week 1-2)
**Deliverables:**
- Finalise `lib/bridge/types.ts` — `UniversalKnowledgeProvider`, `NaturalLanguageQuery`, `QueryResult`, `ProviderMetadata`.
- Implement `OliviaSelfProvider` (standalone mode reads its own DB).
- Implement `LtmBridgeProvider` (embedded mode wraps LTM's Prisma).
- Add Prisma multi-schema to LTM repo: `olivia` namespace alongside `public`.
- Build a smoke test: same query (`getOrganizationByName('Stripe')`) returns identical shape from both providers.

**Dependencies:** Phase 0.
**Exit criteria:** integration test passes against both modes.

### Phase 2 — Backend consolidation (Week 3-5)
**Deliverables:**
- Port LTM's `lib/cascade/prompts/index.ts` → `lib/orchestration/prompts/` in Brain.
- Port LTM's `cascade/events.ts` + `cascade/injector.ts` → Brain `lib/orchestration/events.ts` + new Prisma `cascade_events` model.
- Add Companies House + Kimi providers under `lib/services/providers/`.
- Move LTM's `lib/olivia/{chat,knowledge-base,tools,voice-*}.ts` → Brain `lib/olivia/`. Refactor to call Brain's cascade + memory + persona system.
- Migrate LTM Prisma models → Brain schema (under `olivia` schema namespace if embedded):
  - `OliviaConversation` → align with Brain's `conversations`.
  - `OliviaMessage` → align with `conversation_turns`.
  - `OliviaPresentation` (new in Brain).
  - `OliviaConsent` (new in Brain — bridge to `compliance/consent.ts`).
  - `OliviaGuardrail` → fold into `compliance/guardrails`.
  - `OliviaUserMemory` → fold into `mem0_memories` + episodic/semantic/procedural.
  - Voice: `VoiceConversation`, `VoiceContact`, `VoiceActionItem`, `VoiceTranscriptionLog` (new).
  - Calendar: 14 models (new — namespaced).
  - Document/Package/Outreach/Target/Receiver models (new — under `studio` schema).
  - Valuation: 6 models (new — under `studio` schema).
- Move LTM's call routes → Brain `app/api/olivia/call/*` (10 sub-routes). Reuse Brain's Twilio server lib.
- Move LTM's WhatsApp / Email channels → Brain.

**Dependencies:** Phase 1.
**Exit criteria:** Brain alone can serve every existing LTM-Olivia API. Embedded smoke test still passes.

### Phase 3 — Studio shell rebuild (Week 6-8)
**Deliverables:**
- Move `src/lib/studio/{types,entityModes,questionMapper}.ts` → Brain unchanged.
- Move 27 studio components → Brain `src/components/studio/`. Refactor to Tailwind-or-inline-style decision (recommended: keep Tailwind in components, use prototype `C` token map only for the Library/DeckDetailModal/AvatarOrb primitives).
- Move 17 document block components + workspace → Brain `src/components/documents/`.
- Build new primitives in `src/components/primitives/`:
  - `AvatarOrb` (from prototype).
  - `ConsensusDots` (from prototype).
  - Reuse existing `Badge` and `CompletionRing` (Brain already has them).
- Build the 3-region homepage at `app/(public)/page.tsx` matching prototype layout:
  - Header with AvatarOrb + score chips HUD + Match/Export.
  - Left aside (264px): project name (inline-editable), Investor Persona (5 pills), Deck Config (2x2 selects), Avatar pad, Section nav (4 buttons), Documents tree, Frameworks panel, Plan section nav.
  - Center main: mode toggle + section content (Pitch/Plan/Documents/General).
  - Right aside (320px): Olivia | Library | Preview | Themes | Audit tabs.
- Wire all 4 stubbed Anthropic calls to real Brain endpoints: `/api/pitch/optimize`, `/api/pitch/draft`, `/api/pitch/chat`, `/api/pitch/analyze`.
- Implement J/K nav, focus-trap modal, arrow-key tab rover.
- Implement Audit tab pulling `admin_audit_logs` filtered to user/session.

**Dependencies:** Phase 2.
**Exit criteria:** Studio loads in standalone mode at `/`; user can apply an archetype, edit slides, run analysis, see live score chips, draft a plan section, switch themes, replay audit log.

### Phase 4 — Agents consolidation (Week 9-10)
**Deliverables:**
- Move LTM's ~120 runnable agents (`g1-001..168`, `g2-222..230`, `valuation/*`, `district-intelligence`, `seed-agents`) into Brain `lib/agents/impl/` preserving filenames.
- Reconcile with Brain's `agents/registry.ts` — every g1-/g2- file maps to a Brain registry entry. Where missing, create new registry entries.
- Wire `agents/engine.ts` to discover impl files dynamically and call them.
- Surface every LTM agent in the admin dashboard with category/group/status/run-button.
- Move LTM's video pipeline (g2-222..230) and gate behind a feature toggle; only relevant in embedded mode.
- Move valuation suite to `lib/agents/valuation/` and surface in admin under "Studio / Valuation" group.

**Dependencies:** Phase 2.
**Exit criteria:** running `g1-117-state-of-london-tech` from the admin dashboard succeeds in both modes.

### Phase 5 — Voice + Avatar unification (Week 11-12)
**Deliverables:**
- Adopt Brain's voice provider abstraction (`voice/index.ts`).
- Adopt Brain's avatar provider abstraction (`avatar/index.ts`).
- Replace LTM's HeyGen-streaming-avatar-only pipeline with: server-side session creation via Brain's `avatar/heygen.ts`; client-side rendering via `@heygen/liveavatar-web-sdk` (move LTM's `OliviaVideoAvatar` + `liveavatar.ts`).
- Wire STT→LLM→TTS→Avatar pipeline (`realtime/pipeline.ts`) into Studio's chat composer.
- Adopt the AvatarOrb visual everywhere (header, sidebar pad, Olivia tab) — visual identity = brain layer is hidden, the orb is the face.
- Connect 4 voice agent platforms (LiveKit, Vapi, Retell, Twilio Relay) to Olivia's persona orchestrator so a phone call routes through Cristiano if the intent is "judge".

**Dependencies:** Phase 3.
**Exit criteria:** browser session and inbound phone call both yield same Olivia response with sub-800ms TTFB; HeyGen avatar speaks; Cristiano judge unilateral path produces voice + video on demand.

### Phase 6 — Multi-tenant + white-label hardening (Week 13-14)
**Deliverables:**
- Wire Clerk into Brain's `tenant/context.ts` (port from LTM).
- Bind every API route through `withTenantContext()`.
- Test 3 tenants: (a) `clueslondon-prod` (embedded in LTM), (b) `tampa-brokerage` (standalone), (c) `demo-acme` (white-labeled with custom Olivia personality).
- Validate per-tenant adapter overrides for one real adapter (e.g. Tampa uses Twilio account A, London uses Twilio account B).
- Validate per-tenant model overrides (e.g. demo-acme cheaper-model fallback).
- Validate entitlements (Free tier blocks `/api/avatar/generate`).
- Stripe billing wired into entitlements via webhook.

**Dependencies:** Phase 2.
**Exit criteria:** all three tenants deployed; cross-tenant data leak test fails as expected (tenant A cannot read tenant B's conversation history).

### Phase 7 — LTM repo cutover (Week 15-16)
**Deliverables:**
- LTM repo upgrades: Prisma 5→7 (or pins Olivia to a separate database), Next 14→16 (tracked in MASTER_BUILD_ORDER), React 18→19.
- LTM's `src/components/olivia/*` and `src/components/studio/*` and `src/components/documents/*` deleted.
- LTM's `src/lib/olivia/*`, `src/lib/studio/*`, `src/lib/cascade/*`, `src/lib/agents/*`, `src/lib/documents/*` deleted.
- LTM's `src/app/api/olivia/*` deleted (replaced with rewrites to Olivia-as-package).
- LTM's `src/app/api/calendar/olivia` becomes a thin wrapper that calls Olivia-as-package.
- LTM imports `<OliviaWorkspace>` widget from `@grand-master-olivia/widget` and mounts it at `/studio` and `/olivia`.
- LTM provides bridge implementations for Organization/Person/Event/FundingRound/Program/District/Document/Package.

**Dependencies:** Phases 1-6.
**Exit criteria:** LTM repo builds with Olivia-as-package; LTM `/studio` page works identically to before.

### Phase 8 — Documentation, evaluation, retire (Week 17)
**Deliverables:**
- Update `BATTLE_PLAN.md`, `BOOTSTRAP.md`, `STUDIO_OLIVIA_DESIGN.md` to reference Grand Master architecture.
- Run Brain's red-team eval harness, conversation QA scorecards, weekly bake-off across all merged personas.
- Run Patronus hallucination eval on Olivia/Cristiano/Emelia.
- Decommission Studio Prototype `D:\Studio-Olivia` (archive only).
- Deprecation notice for any legacy LTM-Olivia routes that still get traffic.

**Dependencies:** Phase 7.
**Exit criteria:** every persona passes evals; archived prototype repo; Olivia v1.0 release tag.

---

## 5. BRIDGE CONTRACT (TypeScript stubs)

Concrete interfaces for how London-Tech-Map talks to Olivia when Olivia replaces LTM-embedded Olivia.

```ts
// src/lib/bridge/types.ts

/** Universal addressing for any data domain. */
export type DomainId =
  | "organization"
  | "person"
  | "event"
  | "funding"
  | "program"
  | "district"
  | "document"
  | "package"
  | "valuation"
  | "calendar"
  | "olivia.conversation"
  | "olivia.memory";

/** Natural-language or structured query. */
export interface NaturalLanguageQuery {
  /** Plain-English intent, e.g. "find Stripe in London". */
  intent: string;
  /** Optional structured filters. */
  filters?: Record<string, unknown>;
  /** Hint at expected return shape. */
  expects?: "single" | "list" | "graph" | "scalar";
  /** Tenant/user context hash (set by middleware). */
  contextHash?: string;
}

/** Structured query result. */
export interface QueryResult<T = unknown> {
  success: boolean;
  data: T | null;
  /** Human-readable summary (also used in chat surfaces). */
  summary: string;
  /** Source/citation chain. */
  citations?: Citation[];
  /** Provenance: provider id, mode, timestamp. */
  provenance?: Provenance;
  /** Confidence 0–100 (Brain's standard scale). */
  confidence?: number;
}

export interface Citation {
  source: string;
  url?: string;
  refKey?: string;
  retrievedAt?: string;
}

export interface Provenance {
  appId: string;
  mode: "embedded" | "live" | "hybrid";
  domain: DomainId;
  cached: boolean;
  fetchedAt: string;
}

/** Provider metadata registered with the registry. */
export interface ProviderMetadata {
  appId: string;
  domain: DomainId;
  version: string;
  description: string;
  /** Whether writes are supported (some providers are read-only). */
  writable: boolean;
}

/** Event subscription contract. */
export interface EventBus {
  subscribe(eventType: string, callback: (event: unknown) => void): void;
  unsubscribe(eventType: string): void;
  publish(eventType: string, payload: unknown): void;
}

/** Read-write data surface. */
export interface DataPort {
  query(q: NaturalLanguageQuery): Promise<QueryResult>;
  /** Optional write — providers can throw NotImplemented. */
  write?(domain: DomainId, payload: unknown): Promise<QueryResult>;
}

/** What a host like LTM provides to Olivia. */
export interface UniversalKnowledgeProvider {
  metadata: ProviderMetadata;
  data: DataPort;
  events: EventBus;

  initialize?(): Promise<void>;
  shutdown?(): Promise<void>;
  healthCheck?(): Promise<boolean>;
}

// ── Concrete provider stub LTM would supply ──────────────────────────────

export class LtmKnowledgeProvider implements UniversalKnowledgeProvider {
  metadata: ProviderMetadata = {
    appId: "ltm-london-tech-map",
    domain: "organization", // also registers for person, event, funding, program, district
    version: "1.0.0",
    description: "London Tech Map domain provider: orgs, people, events, districts, funding, valuations.",
    writable: true,
  };

  events: EventBus;
  data: DataPort;

  constructor(private prisma: PrismaClient) {
    /* wire EventBus to Inngest or QStash; wire DataPort to LTM's Prisma client. */
  }

  async healthCheck() { return true; }
}

// ── Olivia consumes via the registry ─────────────────────────────────────

import { knowledgeRegistry } from "@grand-master-olivia/bridge";
import { LtmKnowledgeProvider } from "@/lib/bridge/ltm-provider";

await knowledgeRegistry.register(
  new LtmKnowledgeProvider(prisma),
  { mode: "embedded", priority: 1 }
);

// Inside any Olivia agent:
const result = await knowledgeRegistry.routeQuery("organization", {
  intent: "Find Stripe in London with their last funding round and 5 most recent events.",
  expects: "single",
});
```

Bridge contract obligations:
- LTM MUST implement `LtmKnowledgeProvider` with read coverage for: Organization, Person, Event, FundingRound, Program, District, Document, Package, Valuation.
- LTM SHOULD implement write coverage for: Document, Package, OliviaConversation, OliviaMessage.
- LTM events: SHOULD publish `org.created`, `event.created`, `funding.recorded`, `package.sent`, `valuation.run.completed` so Olivia agents can subscribe.
- Olivia provides: `OliviaConversation` and `OliviaMessage` reads back to LTM via its own provider, so LTM can show user history on user profile pages.

---

## 6. RISK REGISTER

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Prisma 5 → 7 migration in LTM.** Prisma 7 changed client engine bundling, removed Rust binary, broke certain JSON null behaviours, and altered foreign-key cascade behaviour for some adapters. | High | High | Keep Olivia on Prisma 7 in its own database. LTM stays on Prisma 5 short-term and reads Olivia data through bridge HTTP calls only. Plan a separate LTM Prisma 7 upgrade epic post-cutover. |
| 2 | **Next 14 → 16 in LTM.** Next 16 changed App Router cache semantics (`revalidate` defaults), breaking changes in `cookies()`/`headers()` async API, and removed older Pages-Router compat shims. | High | High | Same as #1 — Olivia on Next 16, LTM stays on 14 short-term. Olivia widget published as a stable React component that doesn't depend on the host's Next version. |
| 3 | **Persona model divergence.** Brain has 3 branded execs + 5 investor types; LTM has 6 entity modes; user spec says "investor personas (Angel/Seed/SeriesA/Strategic/Buyout) from prototype". Risk of conflating two orthogonal axes. | Medium | High | Document explicitly: `personas/` = WHO speaks (Olivia/Cristiano/Emelia). `pitch/personas.ts` = WHO listens (5 investor archetypes used to tone the AI output). `studio/entityModes.ts` = HOW THE DOC IS LAID OUT (6 entity modes). All three coexist; don't merge. |
| 4 | **Voice/avatar adapter gaps.** LTM uses `@heygen/liveavatar-web-sdk` (browser SDK), Brain uses HeyGen REST. The two are different products. | Medium | Medium | Use both. Server creates session via Brain's REST `avatar/heygen.ts`. Client renders via LTM's web SDK in `OliviaVideoAvatar.tsx`. Identity Bible (`avatar/identity.ts`) parameters drive both. |
| 5 | **Bidirectional knowledge backpush.** LTM expects user history visible on user profile pages → Olivia must expose conversations back. Risk: PII, GDPR, tenant-isolation breach. | Medium | High | Backpush ONLY through Olivia's bridge with explicit `OliviaConsent` model. PII redaction via `compliance/pii-redactor.ts` always runs before backpush. Tenant ID enforced in bridge middleware. |
| 6 | **Cascade orchestrator semantic mismatch.** Brain LangGraph 5-node vs LTM 4-phase have different state shapes, error semantics, retry behaviour. Code that expects LTM's cascade events won't see them on Brain's cascade. | Medium | Medium | Adopt LTM's `cascade/events.ts` event names as the canonical event vocabulary (Brain's cascade emits the same events). Keep Brain LangGraph as the runtime graph; LTM's 4-phase reduces to a special-case LangGraph subgraph. |
| 7 | **Schema collisions on duplicate models.** Brain has `feature_toggles`, `admin_emails`, `agent_groups`, `agents`, `agent_runs`. LTM has `FeatureToggle`, `AdminEmail`, `AgentGroup`, `Agent`, `AgentRun` with different fields. | High | Medium | Prisma multi-schema. All Olivia tables in `olivia` schema. LTM tables stay in `public`. Same table name allowed without conflict. Migration scripts then transform one to the other. |
| 8 | **Studio prototype drift.** Prototype is a single 95KB JSX file with unique design choices (J/K nav, 3-region inline-style shell, score chips). Risk: rebuild loses the "Bloomberg-terminal" feel by adopting Tailwind/component libs. | Medium | Medium | Keep the inline-style `C` color-token map for the homepage shell + 5 reusable primitives. Tailwind for everything else (LTM Studio components). Document the boundary in `docs/STUDIO_OLIVIA_DESIGN.md`. |
| 9 | **OpenAI client mismatch.** LTM uses raw `openai` 6.32 in many call sites; Brain uses `@ai-sdk/openai` 3.0. The two have different request/response shapes. | Medium | Low | Phase-2 sweep: replace every LTM `import OpenAI from 'openai'` with `import { openai } from '@ai-sdk/openai'` and unified `generateText()` call. Estimate: ~30 files. |
| 10 | **LiveAvatar SDK + WebRTC pipeline conflict.** LTM uses HeyGen-LiveAvatar pipeline that internally uses LiveKit. Brain has its own LiveKit pipeline (`realtime/livekit.ts`). Two LiveKit clients running in the same browser tab will fight over the audio device. | Medium | Medium | Single LiveKit client at the page level via `OliviaProvider.tsx` (already exists in LTM). Brain's `realtime/pipeline.ts` becomes a server-side coordinator; client SDK is HeyGen-LiveAvatar only. |

---

## 7. OPEN QUESTIONS FOR THE USER

Before work proceeds I need explicit answers on:

1. **Database split or shared?** In embedded mode, do you want Olivia to use a SEPARATE database (clean isolation, write its own schema, sync via bridge events) or a SHARED database with LTM (Prisma multi-schema, simpler but couples version upgrades)? Recommendation: separate database in production, shared in dev for fast iteration.

2. **Prisma/Next upgrade path for LTM.** Are you OK with LTM staying on Prisma 5 / Next 14 for ~3 months while the merger lands, then doing a separate LTM-only upgrade epic? Or do you want both repos upgraded simultaneously?

3. **Persona branding lockdown.** "Olivia / Cristiano / Emelia" (Brain spelling) vs "Olivia / Cristiano / Emilia" (LTM spelling). Pick one. Recommendation: **Emelia**.

4. **Studio Olivia chat backend.** Right now LTM's Studio chat hits `/api/olivia/chat`. Brain's pitch chat hits `/api/pitch/chat`. After merge, should Studio chat default to:
   - (a) `/api/pitch/chat` when in pitch context, fall back to `/api/olivia/chat` otherwise
   - (b) one unified `/api/olivia/chat` that routes internally based on `studio.context`
   Recommendation: (b) — single endpoint, LangGraph routes.

5. **Investor persona vs Entity mode UX.** The prototype's left aside has the 5-pill "Investor Persona" picker. LTM's Studio has the 6-mode "Entity Mode" picker (plus a separate `EntityPerspectiveModal`). Should the merged Studio show:
   - (a) two pickers (5 personas + 6 entity modes)
   - (b) one merged 11-option picker
   - (c) the entity mode picks the persona automatically (VC → Series A; Accelerator → Seed; etc.)
   Recommendation: (a) — they're orthogonal, users will appreciate seeing the difference.

6. **AvatarOrb adoption.** Should the Bloomberg-style AvatarOrb (orange→purple→pink gradient) replace LTM's `OliviaVideoAvatar` everywhere, or only on the standalone homepage?

7. **Standalone homepage deployment.** What domain? Reuse `clueslondon.com`? New `olivia.clues.io`? This affects Vercel project setup, Stripe webhook URLs, Twilio status callback URLs, etc.

8. **Bridge package distribution.** npm public, npm private (GitHub Packages), or vendored as a git submodule into LTM? Recommendation: GitHub Packages until v1.0, then npm public.

9. **Deprecation of /api/olivia/call/* in LTM.** These 10 sub-routes are battle-tested and may be hooked to live Twilio numbers right now. Cutover plan: parallel running for 14 days with feature toggle, then delete?

10. **Memory backpush scope.** Is LTM allowed to read Olivia's `OliviaUserMemory` directly (for showing "what Olivia remembers about you" on user profiles)? Or only summary data? Affects bridge contract scope.

---

*End of merge plan. Pair with `MERGE_INVENTORY.md`.*
