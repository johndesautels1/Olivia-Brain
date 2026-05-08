# Olivia Brain — Comprehensive Feature Inventory

> **Snapshot of every shipped capability + the remaining roadmap.**
>
> Last refreshed: **2026-05-09** at HEAD `f463ebc` (continuous batch — Tracks D, E, I, J ALL CLOSED; Track N at 3/5; **W-004 closed via O4**; polish wave: SuggestionChips + KeyboardShortcuts).
> Track U / D / E / I / J **closed**; Track N **partial (N1+N3+N5 ✅, N2/N4 remaining)**; Track O **partial (O4 ✅)**; Track Q closed; Track P closed; Track F closed. **Track U CLOSED (7/7 ✅); Track Q closed; Track P CLOSED (7/7 ✅); Track F CLOSED (1/1 ✅); Track B Sessions 8 + 8b + 8b-routes + 8b-routes-components + 8d data foundation + 8d-routes (partial) ✅.** The home page (`/`) is no longer a Session-14 scaffolding placeholder — it now ships as a voice-first agentic CIO surface (Bond × Bentley × mid-century × Fortune-50 × modern aesthetic): 240px hero AvatarOrb wired to `/api/olivia/chat`, Bloomberg-style live score chips (CSC / AGO / CSR), Linear ⌘K command palette with fzf fuzzy match, mid-century KPI tile grid + Recent Work strip pulling from a single dashboard aggregator, Inspector with Olivia-default tab + Artifacts + LiveAgentStream Devin-style footer, `/voice` Pi-orb full-screen takeover, responsive shell. **What still defers:** 4 heavy Track-B app routes (index, [id]/detail, saved, workspace/*) carry forward to **S8d-routes-2**; studio/* defers to **S8c**.
> Test gate: **929/929 across 85 suites** (Track U did not add tests for the new home components). Typecheck: **clean** (every U1-U7 commit verified with `npx tsc --noEmit`).
>
> This file is a snapshot — refresh it at end of each batch (after the SESSION_LOG entry lands) so the next session opens to a current view of the codebase. It's a complement to `BUILD_SEQUENCE.md` (which is the session-by-session plan) and `HANDOFF.md` (which is the resume-point doc).

---

## A · Capability domains — what Olivia can DO today

| # | Domain | Capability summary |
|---|---|---|
| 1 | **Conversation (chat)** | `/api/olivia/chat` runs the 9-model cascade (Sonnet 4.6 primary → GPT-5.4 → Gemini → Grok / Perplexity / Mistral / Tavily / Opus judge). Intent classifier routes per turn. 4-turn context recall. PII-clean tracing. |
| 2 | **Voice + telephony** | Inbound/outbound calls via Twilio + ElevenLabs TTS. Speech-to-text via Deepgram/Whisper. WhatsApp send. SMS send + receive (opt-in/opt-out). Voicemail recording playback. Reminder calls. Twilio TwiML response builder. |
| 3 | **LiveAvatar (video)** | Simli primary, HeyGen + D-ID + SadTalker fallbacks. Browser-side `OliviaVideoAvatar` + `OliviaProvider` cascade-chat state. ElevenLabs PCM streaming wired. `/test-avatar` smoke route. |
| 4 | **Memory (6 layers)** | Episodic (auto-summarised conversations), semantic (versioned facts), procedural (workflows), graph (entities + relationships), journey (resume snapshots), Mem0 external store. All Prisma + Supabase-backed. |
| 5 | **Cascade orchestration** | 9-model fallback chain, intent-driven routing, `AbortSignal` timeouts on every call, full Langfuse traces. Mock-mode degraded path so UI never blanks. |
| 6 | **Tool dispatch (agentic)** | Composio-based dispatch with approval gate + confidence gate. 7 read-only integrations live (Stripe, GitHub, LinkedIn, QuickBooks, Xero, Companies House, Supabase). Pending-approval queue. Per-conversation action budgets. |
| 7 | **Agentic learning** | 250-agent registry with on-demand / realtime / cron / event-driven scheduling. Daily/weekly briefings auto-generated. Per-agent metrics dashboard data. Continuous learning patterns persisted. |
| 8 | **Calendar + scheduling** | Full LTM-ported calendar engine. Google + Outlook + Calendly OAuth sync. Webhook subscriptions. Conflict resolution. NLP-parsed entries. Daily briefing cron. Travel-time estimator. Voice-driven entry capture. Prep-task auto-generation. |
| 9 | **Map (London tech districts)** | Mapbox + Google Maps 3D dual-implementation. 28 districts with sector filtering. Cluster cards. Street view modal. Layer/category/stats panels. Draggable controls. |
| 10 | **Pitch deck + business plan studio** | 75 archetypes, 12 templates, 16 slide types. Scoring by stage/industry. LLM draft + optimize endpoints. Investor-readiness analyzer. |
| 11 | **Valuation engine (10-method)** | DCF, VC method, multiples, scorecard, precedent transactions, strategic synergy, cost-to-duplicate, liquidation, real-options binomial. Monte Carlo + sensitivity tornado. 14 specialist agents. War Room (negotiation simulator) + Deal Room + Acquisition Mirror + Equity Waterfall. |
| 12 | **Quantara founder intake** | 56-field weighted form at `/founder-intake` inside canonical workspace shell. Per-section completion rings, field-N/56 chip, IntersectionObserver scroll sync, save round-trip via `mergeQuantaraIntoSubject`. **Q3 auto-fill** populates 38/56 fields from APIs + industry benchmarks with per-field accept/reject. **Q4 truth-score cascade** surfaces coral discrepancy chips when founder values disagree with API references by >5% (19-field overlap with V5 agent), with Trust API / Keep mine reconcile flow. **Q5 metamorphic UI** — selecting `f23 — Target Round Type` re-orders sections by per-field investor-class relevance (primary first, ≥ 0.5 threshold, canonical-order tiebreak) and mounts an Aether-tinted supplementary block with 3 round-specific fields per round (18 total across Seed / Series A / Series B / Series C / Growth / Strategic). Multi-round preservation: switching rounds keeps prior entries on disk. Storage: `quantaraJson.supplementary[roundType][subkey]`. **Q6 vertical schedules** — independent vertical-axis selector in the hero mounts a sky-info-tinted schedule block when the founder picks AI/SaaS · HealthTech · ClimateTech · PropTech (Generic = none by design). 5 fields per non-generic vertical = 20 total. Multi-vertical preservation. Storage: `quantaraJson.vertical[verticalId][subkey]`; the chosen vertical persists to top-level `ValuationSubject.sector` (whitelisted on both write + read). **Q7 voice + personas** — `VoiceCaptureCard` in the rail captures audio via MediaRecorder, posts to `/api/voice/transcribe` then `/api/founder-intake/voice-extract`, surfaces cascade-derived field suggestions through the same Q3 chip flow. At ≥ 80% completeness, FinalCTA's "Generate persona" button calls `/api/founder-intake/personas` to synthesise a coherent founder + company persona pair via the cascade; results persist to two new Prisma tables (`founder_personas` + `company_personas`) and render in the inline `PersonaPanel`. Mock-mode runs visibly labelled. |
| 13 | **Bridge / Universal Knowledge Protocol** | `UniversalKnowledgeProvider` interface. Two providers shipped: `OliviaSelfProvider` (Supabase) + `LtmKnowledgeProvider` (LTM `/api/v1/*` over Bearer auth). |
| 14 | **Multi-tenant + white-label** | Tenant isolation, member roster, per-tenant config + adapter overrides + model overrides + policies + API keys. White-label theme generator. Branding packs, custom personas, prompt packs, entitlements. |
| 15 | **Personas (Olivia + Cristiano + Emelia)** | Routing logic. Cristiano™ judge endpoint at `/api/judge` (Opus 4.6 unilateral verdicts). Emelia (back-end support) and Olivia (client-facing) personas wired. |
| 16 | **Reports + Gamma** | Branded PDF/PPTX generation. Gamma presentation generation from voice conversations. |
| 17 | **Email** | Resend client (HTML escape, attachments, tags). Nylas grants/messages/threads. HubSpot + Instantly campaign clients. Conversation transcript email. |
| 18 | **Realtime transport** | Unified abstraction over LiveKit, Vapi, Retell. WebRTC credential issuance for browser sessions. |
| 19 | **Compliance + guardrails** | PII detection, Fair Housing compliance, content guardrails (admin-editable + hardcoded defaults), citation-first RAG with provenance. |
| 20 | **Observability** | Langfuse tracing, OTel spans on every cascade op, recent-traces admin endpoint, integration health checks, audit logs. |
| 21 | **GDPR / consent** | `OliviaConsent` per-user (data_storage, ai_processing, learning) with grant/revocation + IP audit. Erasure endpoint. |
| 22 | **Admin dashboard** | Agent runs management, integration test runner, Mem0 cleanup/decay/embed/sync, Supabase migrations runner, feature toggles, approval queue. |
| 23 | **Durable execution** | Inngest functions (`/api/inngest`) + Trigger.dev. Action budgets per conversation. Queue + retry. |
| 24 | **CLUES domain intelligence (embedded)** | 30 paragraphical prompts, 23 modules, ~2,486 questions in fixture data — adaptive engine + scoring engine wiring partial; full Track L unification post-clueslondon. |
| 25 | **Documents + Packages + Sharing (Track B)** | Document workspace: `Document` + `UserProfile` Prisma models, document blocks (Hero / BarChart / PieChart / ComparisonTable / MetricCards / StatCards / Team/ProductCards / Quote / Callout / Timeline / etc.), bookmarks, packages, sharing (token-based public links + per-share permissions), save-from-template, document quick view, source panel, Olivia workspace panel, OrgMapProvider, print, read-aloud. |
| 27 | **Pitch coaching surface (Track D)** | Server-side: 4 cascade-routed pitch helpers (`optimizeSlide`/`draftPlanSection`/`analyzeContent`/`askOlivia`) replace direct Anthropic API calls — they now flow through the 9-model cascade with intent-keyed routing + Tavily pre-search. Client-side: `PitchCoachTab` Inspector tab with collapsible config form (project/persona/industry/tone/stage, localStorage-persistent), three action buttons (Analyze / Draft / Optimize) firing the matching `/api/pitch/*` routes against the active surface (slides for Optimize/Analyze, current plan section for Draft), and a pitch-specific chat composer. ⌘K → "Open Pitch Coach". |
| 28 | **Voice mode wired (Track E)** | `/voice` Pi-orb takeover wires the full STT → chat → TTS chain end-to-end. `MediaRecorder` (webm/opus → webm → mp4 fallback) → `/api/voice/transcribe` (Deepgram primary / Whisper fallback) → `/api/olivia/chat` (9-model cascade) → `/api/voice/synthesize` (ElevenLabs / OpenAI TTS) → `<audio>` playback. State machine maps to AvatarOrb states. Esc returns home; Space toggles mic. Each stage degrades gracefully (no STT key → "STT not configured" alert; no TTS key → text reply still surfaces). |
| 29 | **Adaptive surface suppression (Track I)** | When Olivia is embedded in a host that already provides a surface (LTM map + calendar), Olivia hides her own. Per-tenant config in `tenant_configs`: `ui.suppressedSurfaces` (JSON array of route paths/surface ids), `ui.brandName` (header wordmark override), `ui.accentColor` (LCH override). `/api/home/tenant-ui` aggregator + `useTenantUi()` hook + `isSurfaceSuppressed` helper. Standalone mode (no `x-tenant-slug` header, no `?tenant=slug` query) returns empty defaults — every surface visible. Filters RailLeft links + ⌘K nav targets. |
| 30 | **Visual manifestation — markdown + charts + Gamma decks (Track N N1+N3+N5)** | Olivia replies render through a markdown pipeline (react-markdown + remark-gfm) with three custom code-fence treatments: ` ```chart ` (recharts bar/line/area/pie, token-keyed colors aurum/aether/mint/sky/amber/coral), ` ```gamma ` (Gamma deck preview card with title + summary + slide count + Open-in-Gamma action — accepts bare URL or full JSON), and standard markdown for everything else. Mounted in HomeHero `lastReply`, OliviaChatTab + PitchCoachTab message bubbles. Cascade system prompt teaches all three fence contracts. 25 unit tests across chart-spec (14) + GammaCard (11). N2 (Mapbox 3D enhancement) + N4 (generative UI / 3D scenes) carry forward. |
| 32 | **Citation-first RAG (Track O O4 — W-004 closed)** | Olivia replies that draw on web research surface their sources via a fenced ` ```sources ` block — JSON array of `{ title, url, source? }` entries. UI renders a numbered citation strip beneath the narrative; in-prose `[1]`/`[2]` references map to entries by position. Filters invalid entries (drops malformed ones, keeps valid ones), only fails when ALL entries are invalid. 8 unit tests. The cascade system prompt teaches Olivia to append a sources block whenever Tavily / Perplexity / regulatory documents / peer-reviewed studies underpin a factual claim. |
| 33 | **Keyboard shortcuts overlay (polish)** | `?` key from anywhere on the home page opens a glass overlay listing every keybind across 3 groups (Global / Workspace / Voice mode). Skips trigger when the user is typing in an input/textarea/contenteditable. Closable via `?` again, Escape, or backdrop click. ⌘K palette includes "Show keyboard shortcuts" command that dispatches a synthetic `?` keydown to the same global handler. |
| 31 | **Vertical adapters (Track J)** | Per-vertical system-prompt augmentation routes industry-specific diligence framing into the cascade. 4 finalized verticals (AI/SaaS, HealthTech, ClimateTech, PropTech) each carry a 5-point investor diligence frame as a system-prompt addendum, plus provider preference hints (Perplexity for HealthTech regulatory citations, Tavily for PropTech property data, etc.). Auto-detection from free-form industry strings via cheap regex (HealthTech > AI precedence). Wired into `runModelCascade` via `vertical?: VerticalId` and threaded through all 4 pitch helpers via `usePitchConfig.industry`. 16 unit tests. The Quantara metamorphic catalog already defined the 5 vertical ids; this adapter makes them load-bearing in the cascade. |
| 26 | **Home page composition (Track U)** | `/` is now a voice-first agentic CIO surface (Bond × Bentley × mid-century × Fortune-50 × modern). 240px hero `AvatarOrb` (state-reactive idle/listening/thinking/speaking) + Cursor-style composer wired to `/api/olivia/chat` with auto-grow textarea, AbortController, audit, error fallback + `lastReply` blockquote (aurum left-border, italic). Bloomberg-style live score chips in header (CSC / AGO / CSR with tabular-num gold values, polled every 30s from `/api/home/score-chips`). Linear-style ⌘K command palette: glass-backdrop overlay, fzf-style fuzzy match, ~25 commands across 3 groups (actions / navigate / workspace), keyboard-first (↑↓⏎ Esc), global ⌘K binding. Mid-century KPI tile grid (Today / Agents / Next) + Recent Work strip (deal analyses / valuations / docs / decks) with honest empty states, single dashboard fetch via `/api/home/dashboard` (11 parallel Prisma queries in `Promise.allSettled`, 60s polling). Inspector reorg: Olivia chat = default tab, "Preview" reframed as "Artifacts" (Claude pattern), `LiveAgentStream` Devin-style footer renders 3 most-recent items beneath any active tab. `/voice` route is a Pi-orb full-screen takeover (radial-gradient canvas, 88px mic toggle, Esc/Space bindings). Responsive shell via `responsive.css` — inspector hides ≤1280px, rail ≤1024px, KPI tiles stack ≤768px, reduced-motion respected. |

---

## B · Library subsystems (50 modules under `src/lib/`)

| Subsystem | What it does | Status |
|---|---|---|
| `adapters/` | 3rd-party API adapters (AirNow, London Calendar, etc.) | SHIPPED |
| `admin/` | Audit logging, integration test results, dashboard data | SHIPPED |
| `agents/` | 250-agent registry + handlers + execution engine | SHIPPED |
| `analysis/` | Cristiano synergy valuation bridge | SHIPPED |
| `auth/` | Clerk session helper. Track F Session 18 ✅ — Clerk wired via `@clerk/nextjs`; presence-gated fallback to `STUB_USER_ID` for dev/test/preview without keys. | SHIPPED |
| `avatar/` | Unified avatar interface; Simli/HeyGen/D-ID fallback | SHIPPED |
| `bridge/` | Universal Knowledge Protocol; provider registry | SHIPPED |
| `calendar/` | Olivia engine: NLP parsing, prep plans, daily briefs | SHIPPED |
| `cascade/` | (LTM port pending — Track G S19-S20) | PENDING |
| `clues-intelligence/` | 30 paragraphs, 23 modules, ~2,486 questions, scoring | PARTIAL |
| `companies-house/` | UK Companies House client (rate-limit retry) | LTM-PORTED |
| `compliance/` | PII detection, Fair Housing, RAG provenance | SHIPPED |
| `config/` | Env schema + multi-mode validation | SHIPPED |
| `db/` | Prisma client wrapper (multi-tenant compliance) | SHIPPED |
| `elevenlabs/` | Voice synthesis client (TTS) | SHIPPED |
| `email/` | Resend client (HTML escape, configurable from) | SHIPPED |
| `evaluation/` | Red-team, QA scorecards, model bake-off, Braintrust | SHIPPED |
| `execution/` | Durable execution (Inngest, Trigger.dev), action budgets | SHIPPED |
| `foundation/` | Catalog, types, readiness surfaces | SHIPPED |
| `hubspot/` | HubSpot CRM client | SHIPPED |
| `instantly/` | Instantly.ai email warmup + campaign client | SHIPPED |
| `integrations/` | Admin integration status, health snapshots | SHIPPED |
| `liveavatar/` | LiveAvatar LITE WebSocket client | SHIPPED |
| `memory/` | Mem0 + 6-layer memory stack | SHIPPED |
| `nylas/` | Nylas email API client | SHIPPED |
| `observability/` | Langfuse tracing client | SHIPPED |
| `olivia/` | Conversation CRUD, message persistence | SHIPPED |
| `orchestration/` | Intent classification + chat router | SHIPPED |
| `personas/` | Olivia / Cristiano / Emelia routing | SHIPPED |
| `pitch/` | 75 archetypes, 12 templates, 16 slide types, scoring | SHIPPED |
| `quantara/` | 56-field schema + sections + field-mapping + types | SHIPPED |
| `quantara/auto-fill/` | Q3 orchestrator + 7 extractors + founder defaults | SHIPPED |
| `quantara/discrepancy/` | Q4 truth-score wrapper + 19-field mapping + detection | SHIPPED |
| `quantara/metamorphic/` | Q5 round-axis (buyer-class map + section reorder + 18 supplementary fields) + Q6 vertical-axis (5 verticals + 20 vertical fields + projection); shared `MetamorphicFieldShape` powers a single field renderer across both axes | SHIPPED |
| `quantara/voice/` | Q7 cascade-driven voice extraction — prompt builder with field manifest + filled hints + transcript truncation; `extractFromTranscript` orchestrator with 3-soft-failure-mode fallback to empty extractions (mock-mode / parse failure / schema failure — never fabricates) | SHIPPED |
| `quantara/personas/` | Q7 cascade-driven persona synthesis — `CombinedPersonaPayloadSchema` (bounded archetype + risk-tolerance enums); prompt builder; deterministic mock fallback; `synthesizePersonas` orchestrator with 3-soft-failure-mode fallback that always preserves the cascade attempts trail for ops review | SHIPPED |
| `deal-protection/` | Track P Smart Score primitives — 5-band ladder (red/orange/yellow/blue/green) covering 0-100 contiguously with module-load runtime invariants; pure helpers `clampSmartScore` / `getSmartBand` / `getSmartBandRecord` / `bandsAgree`; per-band UI copy + design-system color tokens. **P2** adds clause classifier — 20-value `ClauseType` enum, severity ladder + per-tier `SEVERITY_TOXICITY_RANGE`, 20 canonical fixture clauses, two-pass cascade orchestration (Sonnet primary + Opus judge for critical) with three-mode soft-failure fixture fallback. **P3** adds the term-sheet parser + analyze API — heuristic-first hybrid parser (section-marker split → cascade fallback → single-clause fallback) with investor names + round context extraction; severity-weighted aggregation with hard caps (any critical → ≤ 39, any high → ≤ 79) so a single dealbreaker can't be averaged away; analyze orchestrator + `DealRiskReport` shape; deterministic walk-away derivation (no extra cascade call); 0.95 live / 0.40 mock confidence scoring. New `POST /api/deal-protection/analyze` route — 5/min rate limit, own-row ValuationSubject lookup, persists `band.action` enum (not label) so P5 email drafts can pattern-match. **P4** adds the investor reputation surface — 15 fully-anonymized archetype seed entries spanning all 5 bands (admins clone + curate); slug-based lookup helper with DB-failure soft fallback; cap-aware reputation tilt formula (`computeReputationTilt` ±8 max, `applyReputationTilt` enforces P3 caps over positive tilt — a famous investor cannot lift a critical-clause deal out of orange); analyzer wiring with new `reputationLookup` field on `DealRiskReport`; idempotent seed loader (preserves admin edits to isActive/isArchived/notes); 5 new routes — admin CRUD (`/api/admin/investors`, `/api/admin/investors/[id]`), seed (`/api/admin/investors/seed`), moderation queue (`/api/admin/investors/moderation`), public submission (`/api/deal-protection/investor-submission` rate-limited 3/5min, lands as `founder_submitted`+inactive). **P5** adds multi-round dilution projection (pure math, share-based — full ratchet `oldPPS/newPPS` with defensive `MAX_RATCHET_FACTOR=100` cap; weighted-average `(A+C)/(A+B)` with broad/narrow distinction) and band-specific email drafts (5 tones one-to-one with bands; cascade-driven via Sonnet with deterministic per-band template fallback; tone band-derived even on live responses so model hallucinations can't leak through; templates interpolate criticalIssues / clauseAnalyses for specifics). 2 new routes — `POST /api/deal-protection/dilution` (stateless, 10/min) and `POST /api/deal-protection/email-draft` (looks up own DealAnalysis, ephemeral draft, 10/min). P6 WarRoom integration + counter term sheet auto-draft lands in the next session. | SHIPPED (P1+P2+P3+P4+P5) |
| `queries/` | Calendar queries (CRUD, filters, sync) | SHIPPED |
| `rag/` | Citation-first RAG with source ranking | SHIPPED |
| `realtime/` | Unified transport: LiveKit, Twilio, Vapi, Retell | SHIPPED |
| `reports/` | Branded PDF/PPTX engine | SHIPPED |
| `require-tier.ts` | Plan-tier gating (W-015 stub) | STUB |
| `resend/` | Resend client with tags + attachments | SHIPPED |
| `scoring/` | SMART Score: city matching, category, comparison | SHIPPED |
| `services/` | Composio tool execution framework | SHIPPED |
| `studio/` | Pitch archetypes, doc categories, persistence | PARTIAL |
| `system-alerts.ts` | Console-only stub (W-016 — needs SystemAlert model) | STUB |
| `telephony/` | SMS, recording, SIP, barge-in, turn-taking | SHIPPED |
| `tenant/` | Multi-tenant identity, context, policies, overrides | SHIPPED |
| `theme/generate.ts` | White-label theme generator (LCH-aware) | SHIPPED |
| `tools/` | Approval gates, confidence gates, Composio integrations | SHIPPED |
| `twilio/` | Twilio (SMS/WhatsApp/Voice) dynamic-import client | SHIPPED |
| `valuation/` | 10-method engine + 14 agents + bridge | SHIPPED |
| `video/embeddings.ts` | Transcript chunking + OpenAI embeddings | SHIPPED |
| `voice/` | Unified TTS (ElevenLabs/OpenAI) + STT (Deepgram/Whisper) | SHIPPED |
| `white-label/` | Branding packs, custom personas, prompt packs | SHIPPED |

**51 subsystems · 44 SHIPPED · 1 LTM-PORTED · 2 PARTIAL · 3 STUB · 1 PENDING**

---

## C · HTTP API surface — 86 routes across 16 domains

| Domain | Routes | Notable surface |
|---|---|---|
| **`/api/olivia/*` (chat + voice + calls)** | 24 | `chat` (cascade), `liveavatar` + `liveavatar/speak`, `voice` + `voice/process` + `voice/presentation`, `email`, `sms`, `whatsapp`, `consent`, full `call/*` family (12 routes for inbound/outbound/recording/gather/twiml/reminder/extract/audio/status), `calls` + `calls/[id]`, `conversations/[id]/email` |
| **`/api/calendar/*`** | 16 | `entries`, `attendees`, `notes`, `prep-tasks`, `analytics`, `memory` (semantic search), `olivia` (recommendations + NLP), `plan` (daily brief), `travel`, `sync` + `sync/{calendly,google,outlook,conflicts,webhooks}` |
| **`/api/valuation/*`** | 8 | `run` (full or math-mode), `subject`, `[runId]`, `latest`, `compare`, `sensitivity`, `export`, `deal-room/{session,score-rubric}` |
| **`/api/admin/*`** | 8 | `agents/[agentId]`, `agents/run`, `approvals`, `integrations`, `integrations/test`, `memory`, `migrations`, `toggles` |
| **`/api/pitch/*`** | 6 | `archetypes`, `templates`, `analyze`, `chat`, `draft`, `optimize` |
| **`/api/founder-intake/*`** (Q2 + Q3 + Q7) | 4 | `POST/GET /api/founder-intake`, `POST /api/founder-intake/auto-fill`, `POST /api/founder-intake/voice-extract`, `POST/GET /api/founder-intake/personas` |
| **`/api/deal-protection/*`** (P3+P4+P5+P6+P7) | 9 | `POST/GET /api/deal-protection/analyze` (P3+P4 + P6 GET extension); `POST /api/deal-protection/investor-submission` (P4); `POST /api/deal-protection/dilution` (P5); `POST /api/deal-protection/email-draft` (P5); `POST/GET /api/deal-protection/counter-draft` (P6); `GET/PATCH /api/deal-protection/counter-draft/[id]` (P6); `POST /api/deal-protection/rehearsal` (P7 — cascade-driven negotiation training partner); `POST /api/deal-protection/versioning` (P7 — pure-function diff between two analyses); `POST /api/deal-protection/consensus` (P7 — N parallel evaluators + Opus judge) |
| **`/api/admin/investors/*`** (P4) | 4 | `GET/POST /api/admin/investors`, `PATCH/DELETE /api/admin/investors/[id]`, `POST /api/admin/investors/seed`, `GET/PATCH /api/admin/investors/moderation` |
| **`/api/avatar/*`** | 3 | Generate, status, session create/manage |
| **`/api/realtime/*`** | 3 | Status, session create, WebRTC credentials |
| **`/api/voice/*`** | 2 | `synthesize`, `transcribe` |
| **`/api/home/*`** (Track U + I) | 3 | `score-chips` (header CSC/AGO/CSR aggregator, U3) · `dashboard` (KPI tiles + recent work, 11-query allSettled aggregator, U4) · `tenant-ui` (suppressedSurfaces + brand override aggregator, S24) |
| **`/api/cron/*`** | 2 | `calendar-plan` (daily brief), `calendar-sync` (Google/Outlook) |
| **`/api/twilio/*`** | 1 | `voice/inbound` (signature-validated) |
| **`/api/telephony/*`** | 2 | Status, `sms` (send/receive + opt-in) |
| **`/api/judge`** | 1 | Cristiano™ Opus 4.6 unilateral verdict |
| **`/api/inngest`** | 1 | Inngest serve endpoint |
| **`/api/search`** | 1 | Tavily web search |
| **`/api/health` + `/api/traces`** | 2 | Foundation health + recent traces |

---

## D · UI pages (9)

| Route | Purpose |
|---|---|
| `/` | Three-region Studio Olivia workspace shell with library, section nav, audit log |
| `/admin` | 250-agent dashboard (registry sync, status, briefings) |
| `/admin/integrations` | Integration configuration dashboard |
| `/admin/phase1` | Phase-1 readiness + status tracking |
| `/founder-intake` | **Q2/Q3 — Quantara 56-field intake** with live auto-fill suggestions |
| `/analysis/valuation` | Valuation Workbench (DCF + Monte Carlo + Deal Room + War Room) |
| `/calendar` | Personal calendar (voice scheduling + daily briefs + Google/Outlook/Calendly sync) |
| `/map` | Interactive 28-district London tech map (Google + Mapbox dual-impl) |
| `/test-avatar` | LiveAvatar lip-sync smoke test |
| `/voice` 🆕 | **Track U** — Pi-style voice-mode full-screen takeover (240px orb, 88px mic toggle, Esc/Space bindings, radial-gradient canvas) |

---

## E · Component families (10 under `src/components/`)

| Family | Files | What ships |
|---|---|---|
| `valuation/` | 46 | Workbench + 31 zone tiles (KPI / waterfall / heatmap / timeline / sensitivity / tornado / Monte Carlo / sankey / benchmark / fingerprint / narrative / evidence room / negotiation anchor) + War Room family (briefing / transcript / document bridge / session / simulator / acquisition mirror) + motion primitives |
| `calendar/` | 14 | Calendar view, agenda rail, entry modals, voice input, sync panels, focus mode, prep task list |
| `map/` | 14 | Mapbox + Google 3D + layer/sector/category controls + cluster grid + street-view modal + legend |
| `studio/` | 9 | Library archetype search, section nav, frameworks, plan nav, doc tree, 3 right-pane tabs |
| `quantara/` | 9 | **Q2 + Q3 + Q4** — IntakeForm + IntakeSidebar + IntakeSectionBlock + IntakeField (with suggestion row + discrepancy row) + IntakeOliviaPanel + IntakeVerdictPanel + section/field meta + completeness math |
| `primitives/` | 5 | AvatarOrb, Badge, ConsensusDots, CompletionRing, DeckDetailModal |
| `workspace/` | 5 | WorkspaceShell + Header + RailLeft + Center + Inspector |
| `olivia/` | 4 | OliviaProvider, OliviaVideoAvatar, OliviaConsentModal, OliviaDisplayScreen |
| `pitch/` | 2 | Badge + CompletionRing re-exports |
| (top-level) | 3 | `phase1-studio`, `admin-integrations-dashboard`, `ExternalLinkFrame` |
| 🆕 `home/` (Track U + N1+N3) | 16 | `HomeCenter` (orchestrates the center pane) · `HomeHero` (240px state-reactive orb + MarkdownReply lastReply) · `HomeComposer` (Cursor-style chips + chat wiring) · `ActivityTicker` (Bloomberg-style /api/health poll) · `KpiTileGrid` (Today/Agents/Next live tiles) · `RecentWorkStrip` (artifact cards) · `LiveAgentStream` (Devin-style 3-line footer) · `CommandPaletteButton` (header ⌘K entry) · plus `command-palette/` subdir (3 files: `CommandPalette` overlay UI · `commands.ts` registry · `fuzzy.ts` scoring) · plus `reply-renderer/` subdir (4 files: `MarkdownReply` · `ChartFromSpec` · `chart-spec.ts` parser · barrel) |
| 🆕 `studio/PitchCoachTab.tsx` (Track D S16) | 1 | New Inspector tab. Config form + Analyze/Draft/Optimize action buttons + pitch-specific chat composer wired to `/api/pitch/*`. |

**~111 component files** plus tests.

---

## F · Database (Prisma) models — 60+

| Domain | Models | Purpose |
|---|---|---|
| **Conversation + chat** | `conversations`, `conversation_turns`, `conversation_events`, `OliviaConversation`, `OliviaMessage` | Top-level sessions + turns + event-sourced ledger |
| **Olivia surface** | `OliviaPresentation`, `OliviaConsent`, `OliviaGuardrail`, `OliviaUserMemory`, `OliviaCalendarRecommendation` | Gamma decks + GDPR + guardrails + cross-session facts + AI suggestions |
| **Voice + calls** | `VoiceConversation`, `VoiceContact`, `VoiceActionItem`, `VoiceTranscriptionLog` | Twilio call transcripts + extracted CRM contacts + action items + capture audit |
| **Memory (6 layers)** | `mem0_memories`, `knowledge_chunks`, `episodes`, `semantic_memories`, `procedural_memories`, `journey_snapshots`, `graph_entities`, `graph_relationships` | All 6 memory layers |
| **Tools + agents** | `pending_approvals`, `tool_execution_logs`, `action_budgets`, `agents`, `agent_groups`, `agent_runs`, `agent_configs`, `agent_briefings`, `agent_learnings`, `agent_metrics` | 250-agent system, Composio dispatch audit |
| **Calendar (full LTM port)** | `CalendarEntry`, `CalendarPreferences`, `CalendarPrepTask`, `CalendarReminder`, `CalendarEntryAttendee`, `CalendarInteraction`, `CalendarSyncAccount`, `CalendarSyncConflict`, `CalendarWebhookState`, `CalendarMemoryChunk`, `CalendarNote`, `FounderWeek` | Full calendar surface |
| **Valuation (V1+)** | `ValuationSubject` (+ Q1's `quantaraJson`), `ValuationRun`, `ValuationSensitivity`, `FinancialSnapshot`, `DealRoomSession`, `DealRoomMessage` | 10-method engine + War Room |
| **Multi-tenant** | `tenants`, `tenant_members`, `tenant_configs`, `tenant_adapter_overrides`, `tenant_model_overrides`, `tenant_policies`, `tenant_api_keys` | Full tenant isolation |
| **Admin + ops** | `admin_audit_logs`, `admin_emails`, `feature_toggles`, `system_alerts`, `integration_test_runs`, `foundation_traces` | Compliance + ops + observability |

---

## G · Open weaknesses (4 active stubs)

| ID | What | Closes in |
|---|---|---|
| W-013 | LTM-port Tailwind/CSS fidelity gaps in some surfaces | Track C polish (rolling) |
| W-014 | `match_calendar_memory()` Postgres function not yet installed in Supabase | Operator action when calendar memory becomes user-facing |
| W-015 | `lib/auth/session.ts` is a Clerk STUB (uses `STUB_USER_ID`); `require-tier.ts` is also a stub | **Track F Session 18** |
| W-016 | `lib/system-alerts.ts` is console-only (no `SystemAlert` model wiring yet) | Future track |

Plus **operator action carried** from Q1: apply `prisma/sql/04-add-quantara-foundation.sql` to Supabase (Q2/Q3 saves 500 until done).

---

## H · Remaining roadmap — ~53 sessions across 14 tracks

| Track | Sessions remaining | Scope summary |
|---|---|---|
| **Track U (Home page overhaul)** — U1 → U7 | **CLOSED** | All 7 sessions ✅. Home page now ships as voice-first agentic CIO surface — strip dev metadata · hero+composer wired to /api/olivia/chat · Bloomberg score chips · live KPI tiles + recent work · Inspector reorg (Olivia default + Artifacts + LiveAgentStream) · ⌘K palette · /voice takeover + responsive. |
| **Track D (Studio↔Brain wiring)** — S15 → S16 | **CLOSED** | Both sessions ✅. Pitch routes cascade-routed (S15) + PitchCoachTab Inspector with config + 3 action buttons + chat composer (S16). |
| **Track E (Voice input)** — S17 | **CLOSED** | ✅. Full STT → chat → TTS chain on `/voice` with state-machine orb. |
| **Track I (Multi-tenant + suppression)** — S24 | **CLOSED** | ✅. `ui.suppressedSurfaces` + `ui.brandName` + `ui.accentColor` config keys, `/api/home/tenant-ui` aggregator, `useTenantUi` hook, RailLeft + ⌘K filters. |
| **Track N (Visual Manifestation)** — N1+N3+N5 of 5 | 🟡 **PARTIAL** | N1 (manifest contract) ✅. N3 (charts) ✅. N5 (Gamma deck preview) ✅. **Remaining:** N2 (Mapbox 3D enhancement), N4 (generative UI / 3D scenes). |
| **Track J (Vertical adapters)** — S25+S26 | **CLOSED** | S25 ✅ AI/SaaS final + framework. S26 ✅ HealthTech / ClimateTech / PropTech promoted to final. 16 tests passing. |
| **Track O (Weakness closure)** — O4 of 4 | 🟡 **PARTIAL** | **O4 ✅** (W-004 citation-first RAG closed at manifest layer; cascade-side fact-binding still open). O2 (Patronus eval runtime), O3 (sub-600ms voice latency), O5 (avatar lip-sync upgrade) remaining. |
| **Track Q (Quantara)** — Q5 → Q7 | **3** | Q5 investor-class metamorphic UI · Q6 vertical-specific schedules (AI/SaaS, HealthTech, ClimateTech, PropTech) · Q7 voice-first paragraphical capture + persona generation |
| **Track P (Deal Protection)** | **CLOSED** | All 7 sessions ✅. Olivia Brain offer-evaluation surface complete (P1 schema + Smart Score · P2 clause classifier · P3 parser + analyze API · P4 investor reputation · P5 dilution + email · P6 counter draft + WarRoom panel · P7 rehearsal + versioning + consensus). |
| **Track D (Studio↔Brain wiring)** — S15-S16 | **2** | Re-point Studio "Ask Olivia / Analyze / Optimize" to OB cascade |
| **Track E (Voice input, S17)** | **1** | Voice-driven Studio capture |
| **Track F (Clerk auth, S18)** | **CLOSED** | ✅ S18 — `@clerk/nextjs` wired with presence-gated middleware + conditional `<ClerkProvider>` + three-mode `getAuthSession()` resolution. W-015 closed. |
| **Track G (Cascade orchestrator)** — S19-S20 | **2** | Port LTM `lib/cascade/` orchestrator + 8 providers; LangGraph wrap |
| **Track H (Agents consolidation)** — S21-S23 | **3** | Port LTM's 94 named agents; agent dashboard UI; auto-learning |
| **Track I (Multi-tenant + adaptive surface suppression, S24)** | **1** | Tenant isolation enforcement; white-label CSS; suppress Olivia surfaces in hosts that ship their own (LTM map/calendar) |
| **Track J (Vertical adapters)** — S25-S26 | **2** | AI/SaaS · HealthTech · ClimateTech · PropTech adapter routing |
| **Track K (Hardening + launch prep)** — S27-S29 | **3** | Security audit + Patronus eval runtime · perf + caching · launch docs/runbooks |
| **Launch — S30** | **1** | Production deploy (target 2026-06-02 — clueslondon + Olivia core) |
| **Track N (Visual Manifestation)** — N1-N5 | **5** | Canvas + manifest contract · Mapbox 3D · diagrams + charts · Generative UI + 3D scenes · Gamma deck manifestation |
| **Track O (Weakness closure)** — O2-O5 | **4** | Eval runtime weekly (W-002) · sub-600ms voice latency (W-003) · citation-first RAG wired (W-004) · avatar lip-sync upgrade (W-005) |
| **Track L (cluesintelligence Unification, post-launch)** | **~10** | Verdict + persona + what-if endpoints · `CluesIntelligenceProvider` bridge · BEE phase B1-B3 · enrichment-client · verdict pipeline · Olivia narration · GAMMA + Simli + HeyGen · what-if simulator · Patronus + load test · launch readiness |
| **Other / buffer** | ~7 | cluesxscore mini-app session breakdown not yet expanded; cross-track contingency |
| | **~52 sessions** | |

**At ~4 sessions/day pace ≈ 13 working days, or ~3 calendar weeks.**

---

## I · Bottom-line numbers

| Metric | Value |
|---|---|
| **Sessions complete** | 49 (V1-V9 + Track Calendar C2-C6 + Sessions 4-6 chat + 7-10 Studio + S14 + O1 + Q1-Q7 + P1-P7 + Track F S18 + Track B S8 atoms + S8b workspace-shell-atoms + S8b-routes data-layer + S8b-routes-components + S8d data foundation + S8d-routes partial) |
| **Sessions remaining (priorities 1-4 + Track L)** | **~42** (Track B S8 + S8b + S8b-routes + S8b-routes-components + S8d + S8d-routes partial shipped; S8c Studio v1 engine + S8d-routes-2 heavy routes carry forward) |
| **Total sessions in plan** | ~85 |
| **% complete** | ~49% by session count |
| **Tests passing** | 875/875 across 76 suites |
| **Typecheck** | clean |
| **Open weaknesses** | 3 (W-013/14/16) |
| **Library subsystems** | 50 (43 shipped, 1 LTM-ported, 2 partial, 3 stub, 1 pending) |
| **API routes** | 86 across 16 domains |
| **UI pages** | 9 |
| **Component families** | 10 (~111 component files) |
| **Prisma models** | 60+ |
| **Pace** | ~4 sessions/day (founder direction, 2026-05-07) |
| **June-8 demo target** | clueslondon demo (not full ship); OB is canonical impl, LTM port-back post-launch |
| **Production deploy target** | **2026-06-02** (Track K-S30) |
| **cluesintelligence flagship target** | post-2026-06-02 (Track L, ~10 sessions) |

---

## How this file gets refreshed

At the end of each batch, after the SESSION_LOG entry lands and BUILD_SEQUENCE row is marked ✅:

1. Bump the **HEAD** + date in the header.
2. Update the test count (e.g. `494 → 5xx`) and any new subsystems / API routes / pages / components / models that landed.
3. Subtract the closed sessions from the "Remaining roadmap" table.
4. Update the bottom-line numbers.
5. Commit alongside the batch's docs commit.
