# Olivia Brain — Comprehensive Feature Inventory

> **Snapshot of every shipped capability + the remaining roadmap.**
>
> Last refreshed: **2026-05-08** at HEAD `bb58863` (post-P1 feat commit). **Track Q closed; Track P 1/7 ✅.**
> Test gate: **676/676 across 51 suites**. Typecheck: **clean**.
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

---

## B · Library subsystems (50 modules under `src/lib/`)

| Subsystem | What it does | Status |
|---|---|---|
| `adapters/` | 3rd-party API adapters (AirNow, London Calendar, etc.) | SHIPPED |
| `admin/` | Audit logging, integration test results, dashboard data | SHIPPED |
| `agents/` | 250-agent registry + handlers + execution engine | SHIPPED |
| `analysis/` | Cristiano synergy valuation bridge | SHIPPED |
| `auth/` | Auth session helper (Clerk stub, W-015) | STUB |
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
| `deal-protection/` | Track P Smart Score primitives — 5-band ladder (red/orange/yellow/blue/green) covering 0-100 contiguously with module-load runtime invariants; pure helpers `clampSmartScore` / `getSmartBand` / `getSmartBandRecord` / `bandsAgree`; per-band UI copy + design-system color tokens. P2 clause classifier + P3 cascade analyzer + P4 investor reputation seed land in subsequent sessions. | SHIPPED (P1) |
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
| **`/api/founder-intake/*`** (Q2 + Q3) | 2 | `POST/GET /api/founder-intake`, `POST /api/founder-intake/auto-fill` |
| **`/api/avatar/*`** | 3 | Generate, status, session create/manage |
| **`/api/realtime/*`** | 3 | Status, session create, WebRTC credentials |
| **`/api/voice/*`** | 2 | `synthesize`, `transcribe` |
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
| **Track Q (Quantara)** — Q5 → Q7 | **3** | Q5 investor-class metamorphic UI · Q6 vertical-specific schedules (AI/SaaS, HealthTech, ClimateTech, PropTech) · Q7 voice-first paragraphical capture + persona generation |
| **Track P (Deal Protection)** — P1 → P7 | **7** | Smart Score + bands · clause classifier (20 types) · term-sheet parser API · Investor Reputation DB + admin CRUD · multi-round dilution + email drafts · WarRoom integration + counter term sheet · negotiation rehearsal + versioning + multi-LLM consensus |
| **Track D (Studio↔Brain wiring)** — S15-S16 | **2** | Re-point Studio "Ask Olivia / Analyze / Optimize" to OB cascade |
| **Track E (Voice input, S17)** | **1** | Voice-driven Studio capture |
| **Track F (Clerk auth, S18)** | **1** | Replace `getAuthSession` stub with real Clerk — closes W-015 |
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
| **Sessions complete** | 32 (V1-V9 + Track Calendar C2-C6 + Sessions 4-6 chat + 7-10 Studio + S14 + O1 + Q1 + Q2 + Q3) |
| **Sessions remaining (priorities 1-4 + Track L)** | **~53** |
| **Total sessions in plan** | ~85 |
| **% complete** | ~38% by session count |
| **Tests passing** | 494/494 across 37 suites |
| **Typecheck** | clean |
| **Open weaknesses** | 4 (W-013/14/15/16) |
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
