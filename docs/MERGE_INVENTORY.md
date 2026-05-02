# GRAND MASTER OLIVIA — MERGE INVENTORY

> **Purpose:** Exhaustive feature/technology/tool inventory across the three Olivia codebases that will be unified into one Grand Master Olivia (standalone + LTM-embedded).
>
> **Sources:**
> 1. **Olivia Brain** — `D:\Olivia Brain` (~80K LOC, infrastructure-heavy, Next 16, Prisma 7, AI SDK 6, 33 Prisma models, 250-agent registry scaffold)
> 2. **LTM Olivia + Studio** — `D:\London-Tech-Map\src` (~70K LOC of Olivia/Studio relevant code inside the wider LTM app, Next 14.2, Prisma 5, ~120 model schema)
> 3. **Studio Prototype** — `D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx` analysed via `D:\Olivia Brain\docs\STUDIO_OLIVIA_DESIGN.md`
>
> Last updated: 2026-05-02

---

## 1. TOP SUMMARY MATRIX (60+ rows)

Legend: ✓ has it · ~ partial · ✗ missing · — N/A

| # | Capability | Olivia Brain | LTM Olivia+Studio | Studio Prototype | Notes |
|---|---|---|---|---|---|
| 1 | Next.js App Router shell | ✓ Next 16 | ✓ Next 14.2 | ✗ (single .jsx) | Brain is 2 majors ahead. |
| 2 | React 19 / Concurrent | ✓ React 19.2 | ✗ React 18 | ~ React (any) | Brain on bleeding edge. |
| 3 | Tailwind / design tokens | ✗ inline `sty.*` | ✓ Tailwind + tokens | ✗ inline-style only | Studio uses `C` token map. |
| 4 | Vercel AI SDK | ✓ ai 6 + 7 providers | ✗ raw `openai` SDK | ✗ raw fetch | Brain unifies, LTM is per-vendor. |
| 5 | Anthropic provider | ✓ `@ai-sdk/anthropic` | ✓ `cascade/providers/anthropic.ts` | ~ raw fetch (no auth) | Both real. Prototype call is imaginary. |
| 6 | OpenAI provider | ✓ `@ai-sdk/openai` | ✓ `openai` 6.32 + cascade | ✗ | LTM uses raw openai too. |
| 7 | Google Gemini provider | ✓ AI SDK | ✓ `cascade/providers/google.ts` | ✗ | Brain primary on Gemini 3.1. |
| 8 | xAI Grok | ✓ AI SDK | ✓ `cascade/providers/xai.ts` | ✗ | Both. |
| 9 | Mistral | ✓ AI SDK | ✗ | ✗ | Brain only. |
| 10 | Perplexity | ✓ AI SDK | ✓ `cascade/providers/perplexity.ts` | ✗ | Both. |
| 11 | Tavily web search | ✓ `@tavily/core` + `/api/search` | ✓ `cascade/providers/tavily.ts` | ✗ | Both. |
| 12 | Companies House | ✗ | ✓ `cascade/providers/companies-house.ts` | ✗ | LTM unique. |
| 13 | Kimi (Moonshot) | ✗ | ✓ `cascade/providers/kimi.ts` | ✗ | LTM unique. |
| 14 | Groq LPU | ✓ `@ai-sdk/groq` | ✗ | ✗ | Brain unique. |
| 15 | 9-model cascade orchestrator | ✓ `services/model-cascade.ts` + LangGraph | ✓ `cascade/orchestrator.ts` 4-phase | ✗ | DIFFERENT shapes — see § 11. |
| 16 | LangGraph | ✓ `@langchain/langgraph` 1.x | ✗ | ✗ | Brain unique. |
| 17 | Cascade prompts catalog | ~ inside cascade | ✓ `cascade/prompts/index.ts` (15) | ✗ | LTM unique. |
| 18 | Cascade event bus | ✗ | ✓ `cascade/events.ts` | ✗ | LTM unique. |
| 19 | Cascade DB injector | ✗ | ✓ `cascade/injector.ts` | ✗ | LTM-specific (writes to Prisma). |
| 20 | Personas (3): Olivia/Cristiano/Emelia | ✓ `lib/personas/` + handlers | ~ Olivia + EmiliaConversation only | ✗ | LTM has Olivia + Emilia models. |
| 21 | Investor personas (5): Angel/Seed/A/Strategic/Buyout | ✓ `lib/pitch/personas.ts` | ✗ | ✓ `PERSONAS` const | Brain ported them. |
| 22 | Entity-mode personas (VC/Accelerator/Acquirer/Angel/Corporate/General) | ✗ | ✓ `lib/studio/entityModes.ts` | ✗ | LTM unique — different concept from Brain personas. |
| 23 | Persona orchestrator | ✓ `personas/orchestrator.ts` | ✗ | ✗ | Brain unique. |
| 24 | Mem0 memory | ✓ `mem0ai` 2.4 + `memory/mem0.ts` | ✗ | ✗ | Brain only. |
| 25 | pgvector knowledge_chunks | ✓ Prisma `knowledge_chunks` | ~ knowledge tables in voice domain | ✗ | Brain has dedicated table. |
| 26 | Episodic memory | ✓ `episodes` model + memory layer | ✗ | ✗ | Brain only. |
| 27 | Semantic memory + contradiction | ✓ `semantic_memories` model | ✗ | ✗ | Brain only. |
| 28 | Procedural memory | ✓ `procedural_memories` | ✗ | ✗ | Brain only. |
| 29 | Knowledge graph (entities+relations) | ✓ `graph_entities` + `graph_relationships` + BFS | ✗ | ✗ | Brain only. |
| 30 | Voice memory (per-user, per-call) | ~ via memory layer | ✓ `voice-memory.ts` + `OliviaUserMemory` model | ✗ | LTM has the dedicated voice flavor. |
| 31 | Conversation event sourcing | ✓ `conversation_events` (11 typed events) | ~ `OliviaMessage`/`OliviaConversation` | ✗ | Brain richer. |
| 32 | Journey snapshots / resume | ✓ `journey_snapshots` model | ✗ | ✗ | Brain only. |
| 33 | Conversation history API | ✓ `/api/traces` | ✓ `/api/olivia/history` & `/conversation` | ✗ | Both. |
| 34 | Voice synthesis (TTS) | ✓ ElevenLabs + OpenAI TTS | ~ TTS player component | ✗ | Brain has provider abstraction. |
| 35 | Speech-to-text (STT) | ✓ Deepgram + Whisper | ✓ via voice routes (browser SR + Whisper assumed) | ✗ | Brain has explicit Deepgram. |
| 36 | Avatar (Simli) | ✓ `avatar/simli.ts` | ✗ | ✗ | Brain only. |
| 37 | Avatar (HeyGen) | ✓ `avatar/heygen.ts` | ✓ `@heygen/streaming-avatar` 2.1 + LiveAvatar SDK | ✗ | LTM uses LiveAvatar UI, Brain has API client. |
| 38 | Avatar (D-ID) | ✓ `avatar/did.ts` | ✗ | ✗ | Brain only. |
| 39 | Avatar (SadTalker / Replicate) | ✓ `avatar/sadtalker.ts` | ✗ | ✗ | Brain only — Cristiano judge. |
| 40 | Avatar Identity Bible | ✓ `avatar/identity.ts` | ✗ | ✗ | Brain only. |
| 41 | Avatar Emotion/Gesture policy | ✓ `avatar/emotions.ts` | ✗ | ✗ | Brain only. |
| 42 | Avatar single-orb visual identity | ✗ | ✗ | ✓ `AvatarOrb` primitive | Studio prototype unique. |
| 43 | Realtime LiveKit transport | ✓ `realtime/livekit.ts` | ✓ `livekit-client` 2.18 | ✗ | Both. |
| 44 | Twilio ConversationRelay | ✓ `realtime/twilio-relay.ts` | ✗ | ✗ | Brain only. |
| 45 | Vapi inbound voice AI | ✓ `realtime/vapi.ts` | ✗ | ✗ | Brain only. |
| 46 | Retell outbound voice AI | ✓ `realtime/retell.ts` | ✗ | ✗ | Brain only. |
| 47 | STT→LLM→TTS→Avatar pipeline | ✓ `realtime/pipeline.ts` (sub-800ms target) | ✗ | ✗ | Brain only. |
| 48 | Twilio SMS | ✓ `telephony/sms.ts` + `/api/telephony/sms` | ✓ `/api/olivia/sms` | ✗ | Both. |
| 49 | Twilio voice inbound webhook | ✓ `/api/twilio/voice/inbound` | ✓ `/api/olivia/call/*` (twiml/audio/inbound/outbound/recording/gather/status/extract/reminder) | ✗ | LTM has FAR more granular call flow. |
| 50 | Outbound calls | ✓ via Retell/Vapi | ✓ `/api/olivia/call/outbound` | ✗ | Different mechanisms. |
| 51 | Call recording + consent | ✓ `telephony/recording.ts` + `compliance/consent.ts` | ✓ `/api/olivia/call/recording` + `/consent` | ✗ | Both. |
| 52 | Call extract / summary | ✗ | ✓ `/api/olivia/call/extract` | ✗ | LTM unique. |
| 53 | Voice action items | ✗ | ✓ `VoiceActionItem` model | ✗ | LTM unique. |
| 54 | Voice contacts | ✗ | ✓ `VoiceContact` model | ✗ | LTM unique. |
| 55 | Voice transcription log | ✗ | ✓ `VoiceTranscriptionLog` model | ✗ | LTM unique. |
| 56 | Voice → document pipeline | ✗ | ✓ `/api/olivia/voice/to-document` + `voice-document.ts` | ✗ | LTM unique. |
| 57 | Voice → package pipeline | ✗ | ✓ `/api/olivia/voice/to-package` | ✗ | LTM unique. |
| 58 | Voice presentation generation | ✗ | ✓ `/api/olivia/voice/presentation` | ✗ | LTM unique. |
| 59 | Voice quick-action detection | ✗ | ✓ `voice-conversation.ts:detectQuickAction` | ✗ | LTM unique. |
| 60 | Dictation detection | ✗ | ✓ `voice-conversation.ts:detectDictation` | ✗ | LTM unique. |
| 61 | WhatsApp channel | ✗ | ✓ `/api/olivia/whatsapp` | ✗ | LTM unique. |
| 62 | Email channel (Olivia) | ✗ | ✓ `/api/olivia/email` + Resend 6.9 | ✗ | LTM unique. |
| 63 | Conversation→email summary | ✗ | ✓ `/api/olivia/conversations/[id]/email` | ✗ | LTM unique. |
| 64 | Olivia consent UI | ✗ | ✓ `OliviaConsentModal` + `OliviaConsent` model | ✗ | LTM unique. |
| 65 | Olivia chat panel/page chat | ✗ (admin only) | ✓ `OliviaChatPanel`/`OliviaPageChat`/`OliviaQuickChat` | ✗ | LTM unique. |
| 66 | Olivia presentation generator (UI) | ✗ | ✓ `OliviaPresentationGenerator` + `OliviaPresentation` model | ✗ | LTM unique. |
| 67 | Olivia video avatar | ✗ | ✓ `OliviaVideoAvatar` | ✗ | LTM unique. |
| 68 | Olivia knowledge base (LTM-aware) | ✗ | ✓ `olivia/knowledge-base.ts` (Studio entity prompt) | ✗ | LTM unique. |
| 69 | Olivia tools registry | ✗ | ✓ `olivia/tools.ts` | ✗ | LTM unique (server-side function-call layer). |
| 70 | Calendar adapter (London) | ✓ `adapters/london-calendar.ts` (10 endpoints) | ✓ Native — ~14 calendar Prisma models | ✗ | Brain calls LTM as adapter. |
| 71 | Calendar Olivia route | ✗ | ✓ `/api/calendar/olivia/route.ts` | ✗ | LTM unique. |
| 72 | OliviaCalendarRecommendation model | ✗ | ✓ Prisma model | ✗ | LTM unique. |
| 73 | CalendarPrepTask / CalendarReminder | ✗ | ✓ models | ✗ | LTM unique. |
| 74 | FullCalendar UI | ✗ | ✓ `@fullcalendar/*` 6.1 (5 packages) | ✗ | LTM unique. |
| 75 | Founder Week tracker | ✗ | ✓ `FounderWeek` model | ✗ | LTM unique. |
| 76 | Composio (200+ tools) | ✓ `@composio/core` + `services/composio.ts` | ✗ | ✗ | Brain only. |
| 77 | Nylas (inbox/calendar) | ✓ `nylas/client.ts` | ✗ | ✗ | Brain only. |
| 78 | HubSpot CRM | ✓ `hubspot/server.ts` | ✗ | ✗ | Brain only. |
| 79 | Resend transactional | ✓ `resend/server.ts` | ✓ `resend` 6.9 | ✗ | Both. |
| 80 | Instantly outbound sequencer | ✓ `instantly/server.ts` | ✗ | ✗ | Brain only. |
| 81 | Stripe billing | ✗ | ✓ `stripe` 20 + `@stripe/stripe-js` 8.9 | ✗ | LTM only. |
| 82 | Clerk auth | ✗ | ✓ `@clerk/nextjs` 5.7 | ✗ | LTM only. |
| 83 | Inngest event functions | ✓ `inngest` 4.2 + `/api/inngest` | ✗ | ✗ | Brain only. |
| 84 | Trigger.dev jobs | ✓ `@trigger.dev/sdk` 4.4 | ✗ | ✗ | Brain only. |
| 85 | Upstash QStash queue | ✓ `@upstash/qstash` 2.10 | ✗ | ✗ | Brain only. |
| 86 | Temporal workflows | ✓ `@temporalio/*` 1.16 | ✗ | ✗ | Brain only. |
| 87 | Action budgets | ✓ `action_budgets` model | ✗ | ✗ | Brain only. |
| 88 | Pending approvals (HITL) | ✓ `pending_approvals` model + `tools/approval-gate.ts` | ✗ | ✗ | Brain only. |
| 89 | Confidence gate | ✓ `tools/confidence-gate.ts` | ✗ | ✗ | Brain only. |
| 90 | Tool execution logs | ✓ `tool_execution_logs` model | ✗ | ✗ | Brain only. |
| 91 | Langfuse observability | ✓ `@langfuse/otel` 5.0 + tracer | ✗ | ✗ | Brain only. |
| 92 | OpenTelemetry | ✓ `@opentelemetry/*` 1.9 | ✗ | ✗ | Brain only. |
| 93 | Foundation traces table | ✓ `foundation_traces` | ✗ | ✗ | Brain only. |
| 94 | Braintrust evals | ✓ `braintrust` 3.8 | ✗ | ✗ | Brain only. |
| 95 | Patronus hallucination eval | ✓ `patronus-api` 0.3 | ✗ | ✗ | Brain only. |
| 96 | Cleanlab data quality | ~ via env config | ✗ | ✗ | Brain only. |
| 97 | Presidio PII redaction | ✓ `compliance/pii-redactor.ts` | ✗ | ✗ | Brain only. |
| 98 | Fair Housing validators | ✓ `compliance/fair-housing.ts` | ✗ | ✗ | Brain only. |
| 99 | NeMo guardrails | ✓ `compliance/guardrails.ts` | ✓ `/api/olivia/guardrails` | ✗ | Both, different impls. |
| 100 | RAG accuracy scoring (Ragas) | ✓ `compliance/rag-scoring.ts` | ✗ | ✗ | Brain only. |
| 101 | Data residency routing (EU/UK/AP) | ✓ `compliance/data-residency.ts` | ✗ | ✗ | Brain only. |
| 102 | Consent/forgotten | ✓ `compliance/consent.ts` | ✓ `OliviaConsent` model | ✗ | Both. |
| 103 | Compliance subflows (visa/tax) | ✓ `compliance/subflows.ts` | ✗ | ✗ | Brain only. |
| 104 | Knowledge versioning | ✓ `compliance/knowledge-versioning.ts` | ✗ | ✗ | Brain only. |
| 105 | Multi-tenant DB schema | ✓ 7 tenant models | ✗ | ✗ | Brain only. |
| 106 | Tenant isolation (AsyncLocalStorage) | ✓ `tenant/context.ts` | ✗ | ✗ | Brain only. |
| 107 | Per-tenant adapter overrides | ✓ `tenant/adapters.ts` | ✗ | ✗ | Brain only. |
| 108 | Per-tenant model routing | ✓ `tenant/models.ts` | ✗ | ✗ | Brain only. |
| 109 | Per-tenant policies/limits | ✓ `tenant/policies.ts` | ✗ | ✗ | Brain only. |
| 110 | White-label branding pack | ✓ `white-label/branding.ts` | ✗ | ~ `THEMES` (5 London themes) | Brain has runtime, prototype has token presets. |
| 111 | White-label persona overrides | ✓ `white-label/personas.ts` | ✗ | ✗ | Brain only. |
| 112 | White-label prompt packs | ✓ `white-label/prompts.ts` | ✗ | ✗ | Brain only. |
| 113 | Entitlements/quotas/tiers | ✓ `white-label/entitlements.ts` | ✗ | ✗ | Brain only. |
| 114 | White-label deployment (domains/SSL) | ✓ `white-label/deployment.ts` | ✗ | ✗ | Brain only. |
| 115 | 250-agent registry (defs) | ✓ `agents/registry.ts` (~250 entries) | ✓ ~120 g1-/g2- impl files + valuation suite | ✗ | DIFFERENT — Brain is metadata, LTM is runnable. See § 12. |
| 116 | Agent dashboard UI | ✓ `admin/AdminDashboardClient.tsx` (1006 LOC) | ✗ | ✗ | Brain only. |
| 117 | Agent run engine | ✓ `agents/engine.ts` + `/api/admin/agents/run` | ✓ `agents/seed-agents.ts` + per-agent runners | ✗ | Different patterns. |
| 118 | Per-agent learning | ✓ `agent_learnings` model | ✗ | ✗ | Brain only. |
| 119 | Agent metrics | ✓ `agent_metrics` model | ✗ | ✗ | Brain only. |
| 120 | Agent groups | ✓ `agent_groups` (23 groups) | ~ implicit g1/g2 prefix | ✗ | Brain richer. |
| 121 | District intelligence agent | ✗ | ✓ `agents/district-intelligence.ts` | ✗ | LTM unique. |
| 122 | Valuation agent suite (10+) | ✗ | ✓ `agents/valuation/*` (truth-score, DCF mirror, evidence, validation, pre-mortem, financial-extractor, method-selection, llm-adapter, acquisition-mirror) | ✗ | LTM unique — huge. |
| 123 | Memory agent | ✗ | ✓ `g1-153-memory-agent.ts` | ✗ | LTM unique. |
| 124 | Chief of staff agent | ✗ | ✓ `g1-147-chief-of-staff.ts` | ✗ | LTM unique. |
| 125 | Calendar gatekeeper / NLP / prep / conflicts | ✗ | ✓ `g1-148/-165/-166/-167` | ✗ | LTM unique. |
| 126 | Behavior analyst agent | ✗ | ✓ `g1-168-behavior-analyst.ts` | ✗ | LTM unique. |
| 127 | Crisis response / negotiation prep / KPI engine | ✗ | ✓ `g1-162/-155/-140` | ✗ | LTM unique. |
| 128 | Video ingest/transcript/NER/relevance/cleanup | ✗ | ✓ `g2-222..230` (8 video agents) | ✗ | LTM unique. |
| 129 | Real-estate adapters (MLS/Zillow/HouseCanary/Bridge/PropertyRadar/Plunk/Rentcast/Regrid/BatchData) | ✓ 9 adapter files | ✗ | ✗ | Brain only. |
| 130 | Relocation adapters (Places/WalkScore/FX/Visa/Crime/COL/Schools) | ✓ 7 adapter files | ✗ | ✗ | Brain only. |
| 131 | Environmental adapters (NOAA/FEMA/AirNow/HowLoud/OWM) | ✓ 5 adapter files | ✗ | ✗ | Brain only. |
| 132 | RAG adapters (Firecrawl/Unstructured/Cohere Rerank/Jina) | ✓ 4 adapter files | ✗ | ✗ | Brain only. |
| 133 | CLUES Intelligence (paragraphs+modules+questions) | ✓ `lib/clues-intelligence/*` (30 paragraphs, 23 specialty modules, ~2300Q) | ✗ | ✗ | Brain only. |
| 134 | Adaptive engine (CAT) | ✓ `engines/adaptiveEngine.ts` | ✗ | ✗ | Brain only. |
| 135 | Module relevance engine | ✓ `engines/moduleRelevanceEngine.ts` | ✗ | ✗ | Brain only. |
| 136 | SMART Score engine | ✓ `engines/smartScoreEngine.ts` | ✗ | ✗ | Brain only. |
| 137 | Coverage tracker | ✓ `engines/coverageTracker.ts` | ✗ | ✗ | Brain only. |
| 138 | Pitch decks: 75 archetypes | ✓ `pitch/archetypes.ts` (DECKS, 75) | ✗ | ✓ `DECKS` const (75) | Brain ported from prototype. |
| 139 | Pitch business plans: 12 templates | ✓ `pitch/templates.ts` (BIZ_TEMPLATES, 12) | ✗ | ✓ `BIZ_TEMPLATES` const (12) | Brain ported. |
| 140 | 16-slide schema (HOOK..DEMO) | ✓ `pitch/slides.ts` (SLIDE_META, SLIDE_FIELDS) | ✗ | ✓ `SLIDE_META`/`SLIDE_FIELDS` | Brain ported. |
| 141 | 10 doc categories / ~65 docs | ✓ `pitch/documents.ts` (`DOC_CATEGORIES`) | ✗ | ✓ `DOC_CATEGORIES` | Brain ported. |
| 142 | 14 frameworks | ✓ `pitch/constants.ts`/scoring | ✗ | ✓ `FRAMEWORKS` | Brain ported. |
| 143 | 16 plan sections | ✓ `pitch/documents.ts:PLAN_SECTIONS` | ✗ | ✓ `PLAN_SECTIONS` | Brain ported. |
| 144 | Score: clarity/impact/moat/all | ✓ `pitch/scoring.ts` | ✗ | ✓ `deckScores` useMemo | Brain ported. |
| 145 | Apply-archetype regenerate slides | ✓ `pitch/optimize.ts:generateDeckFromArchetype` | ✗ | ✓ `applyArchetype` | Brain ported. |
| 146 | Pitch optimize/draft/analyze/chat APIs | ✓ `/api/pitch/{draft,analyze,optimize,chat,archetypes,templates}` | ✗ | ~ stubbed `fetch` calls | Brain wired up. |
| 147 | Studio Preparation Studio component | ✗ (Brain ports DATA only) | ✓ `components/studio/PreparationStudio.tsx` | ✓ inline Pitch view | LTM has the Studio shell already. |
| 148 | Studio question engine + sequencer | ✗ | ✓ `lib/studio/questionMapper.ts` + `types.ts` | ✗ | LTM unique. |
| 149 | Bayesian prior stub | ✗ | ✓ in `studio/types.ts` | ✗ | LTM unique. |
| 150 | Cross-doc consistency flags | ✗ | ✓ `ConsistencyFlag` interface | ✗ | LTM unique. |
| 151 | EngagementMetrics / SessionMetrics | ✗ | ✓ in `studio/types.ts` | ✗ | LTM unique. |
| 152 | Streak / micro-rewards / completion ceremony | ✗ | ✓ `MicroReward` / `CompletionCeremony` | ✗ | LTM unique. |
| 153 | Skip-nudge modal | ✗ | ✓ `SkipNudgeModal` | ✗ | LTM unique. |
| 154 | Pre-submit check | ✗ | ✓ `PreSubmitCheck` | ✗ | LTM unique. |
| 155 | Cristiano re-evaluation panel | ✗ | ✓ `CristianoReEvaluation` | ✗ | LTM unique (UI). |
| 156 | Pitch Polish modal | ✗ | ✓ `PitchPolishModal` | ✗ | LTM unique. |
| 157 | Why-This panel | ✗ | ✓ `WhyThisPanel` | ✗ | LTM unique. |
| 158 | Suggestion chips | ✗ | ✓ `SuggestionChips` | ✗ | LTM unique. |
| 159 | Deep research panel | ✗ | ✓ `DeepResearchPanel` | ✗ | LTM unique. |
| 160 | Research history | ✗ | ✓ `ResearchHistory` | ✗ | LTM unique. |
| 161 | Studio formatting toolbar | ✗ | ✓ `StudioFormattingToolbar` | ✗ | LTM unique. |
| 162 | Studio voice commands | ✗ | ✓ `StudioVoiceCommands` | ✗ | LTM unique. |
| 163 | Studio voice input / TTS player | ✗ | ✓ `StudioVoiceInput`, `StudioTTSPlayer` | ✗ | LTM unique. |
| 164 | Studio Olivia avatar/chat | ✗ | ✓ `StudioOliviaAvatar`, `StudioOliviaChat` | ✗ | LTM unique. |
| 165 | Studio top/bottom bar | ✗ | ✓ `StudioTopBar`, `StudioBottomBar` | ~ header/toolbar | Both have shells. |
| 166 | Studio answer editor / answer ribbon | ✗ | ✓ `StudioAnswerEditor`, `AnswerRibbon` | ✗ | LTM unique. |
| 167 | Studio question card | ✗ | ✓ `StudioQuestionCard` | ✗ | LTM unique. |
| 168 | Story review | ✗ | ✓ `StoryReview` | ✗ | LTM unique. |
| 169 | Document transition | ✗ | ✓ `DocumentTransition` | ✗ | LTM unique. |
| 170 | Studio keyboard shortcuts | ✗ | ✓ `StudioKeyboardShortcuts` | ✓ J/K/Esc/Tab rover | Both. |
| 171 | Library (Decks/Plans, search, scoring) | ✓ data only | ~ via Studio components | ✓ full UI | Prototype has the full inventory tab. |
| 172 | Preview tab (light theme inversion) | ✗ | ✗ | ✓ unique inversion | Prototype unique. |
| 173 | Themes tab (5 London themes) | ~ data in `THEMES` const port | ✗ | ✓ full | Prototype + Brain port. |
| 174 | Audit log tab | ✗ (admin audit logs via DB) | ✗ | ✓ `auditLog` state | Prototype has visible UI. |
| 175 | Mode toggle Guided/Freeform | ✗ | ✗ | ✓ | Prototype unique. |
| 176 | Inline-editable project name | ✗ | ✗ | ✓ | Prototype unique. |
| 177 | Score chips header HUD (CLR/IMP/MOT/ALL) | ✗ | ✗ | ✓ | Prototype unique. |
| 178 | DeckDetailModal with Apply | ✗ | ✗ | ✓ | Prototype unique. |
| 179 | Document blocks (Hero/Stat/Metric/Pie/Bar/Table/Quote/Callout/Timeline/etc) | ✗ | ✓ 17 block components in `components/documents/blocks/` | ✗ | LTM unique. |
| 180 | Document workspace + editor | ✗ | ✓ `DocumentWorkspace`, `DocumentEditor`, `DocumentBody`, `DocumentRenderer` | ✗ | LTM unique. |
| 181 | Document quick view + provider | ✗ | ✓ `DocumentQuickView` + `Provider` | ✗ | LTM unique. |
| 182 | Document filters / action bar / source panel | ✗ | ✓ components | ✗ | LTM unique. |
| 183 | Document bookmark / bookmarkButton | ✗ | ✓ `BookmarkButton` + `DocumentBookmark` model | ✗ | LTM unique. |
| 184 | Save-to-package modal | ✗ | ✓ `SaveToPackageModal` | ✗ | LTM unique. |
| 185 | Package progress bar | ✗ | ✓ `PackageProgressBar` | ✗ | LTM unique. |
| 186 | Package model/template/recipient/event | ✗ | ✓ `Package`, `PackageDocument`, `PackageRecipient`, `PackageEvent`, `PackageTemplate` | ✗ | LTM unique — 5 models. |
| 187 | Target lists / matches | ✗ | ✓ `TargetList`, `TargetListItem`, `TargetMatch` | ✗ | LTM unique. |
| 188 | Outreach campaigns | ✗ | ✓ `OutreachCampaign`, `OutreachCampaignTarget` | ✗ | LTM unique. |
| 189 | Receiver session (recipient view) | ✗ | ✓ `ReceiverSession`, `ReceiverQuestion`, `FollowUpTask` | ✗ | LTM unique. |
| 190 | Print / Org map provider | ✗ | ✓ `PrintButton`, `OrgMapProvider` | ✗ | LTM unique. |
| 191 | DocumentTemplatePreview | ✗ | ✓ component | ✗ | LTM unique. |
| 192 | Bridge / Universal Knowledge Provider | ✓ `lib/bridge/registry.ts` (registry, mode, cache, health) | ✗ | ✗ | Brain unique — KEY for embedded mode. |
| 193 | Foundation status / catalog | ✓ `lib/foundation/{status,types,catalog}.ts` | ✗ | ✗ | Brain unique. |
| 194 | LTM org/event/people/funding/program domain models | ✗ | ✓ 30+ models (Organization, Person, Event, FundingRound, Program, etc.) | ✗ | LTM unique. |
| 195 | District scores / history | ✗ | ✓ `DistrictScore`, `DistrictScoreHistory` | ✗ | LTM unique. |
| 196 | Mapbox + Three.js 3D | ✗ | ✓ `mapbox-gl` 3.19, `three` 0.170, `@react-three/*` | ✗ | LTM unique. |
| 197 | Sankey / charts (recharts/d3) | ✗ | ✓ recharts 3.8, d3-sankey, d3-shape | ✗ | LTM unique. |
| 198 | Framer Motion | ✗ | ✓ 12.38 | ✗ | LTM unique. |
| 199 | Phosphor + Lucide icons | ✗ | ✓ both | ✗ | LTM unique. |
| 200 | DnD Kit | ✗ | ✓ core/sortable/utilities | ✗ | LTM unique. |
| 201 | next-intl | ✗ | ✓ 4.8 | ✗ | LTM unique (multilingual UI). |
| 202 | Phone input (intl) | ✗ | ✓ `react-international-phone` | ✗ | LTM unique. |
| 203 | rrule recurring | ✗ | ✓ for calendar | ✗ | LTM unique. |
| 204 | html2canvas screenshot | ✗ | ✓ for export | ✗ | LTM unique. |
| 205 | Markdown rendering | ✗ | ✓ react-markdown + remark-gfm | ✗ | LTM unique. |
| 206 | Public homepage | ✓ `app/page.tsx` (Phase1 Studio) | ✓ rich landing | ✗ | Brain has admin-only-style landing. |
| 207 | Admin dashboard | ✓ `/admin` + integrations | ✗ | ✗ | Brain only. |
| 208 | Admin: integrations panel | ✓ `/admin/integrations` + `/api/admin/integrations` | ✗ | ✗ | Brain only. |
| 209 | Admin: memory inspector | ✓ `/api/admin/memory` | ✗ | ✗ | Brain only. |
| 210 | Admin: migrations runner | ✓ `/api/admin/migrations` | ✗ | ✗ | Brain only. |
| 211 | Admin: approvals queue | ✓ `/api/admin/approvals` | ✗ | ✗ | Brain only. |
| 212 | Admin: feature toggles | ✓ `/api/admin/toggles` + `feature_toggles` model | ~ `FeatureToggle` model | ✗ | Both have model, only Brain has UI/API. |
| 213 | Admin emails | ✓ `admin_emails` model | ✓ `AdminEmail` model | ✗ | Both. |
| 214 | Admin audit logs | ✓ `admin_audit_logs` model | ✗ | ✗ | Brain only. |
| 215 | Cascade events DB log | ✗ | ✓ `CascadeEvent` model | ✗ | LTM unique. |
| 216 | Dynamic content / analysis result | ✗ | ✓ `DynamicContent`, `AnalysisResult` models | ✗ | LTM unique. |
| 217 | Valuation persistence (Subject/Run/Sensitivity/FinancialSnapshot) | ✗ | ✓ 4 models | ✗ | LTM unique. |
| 218 | Deal room (Session/Message) | ✗ | ✓ 2 models | ✗ | LTM unique. |
| 219 | Newsletter subscription | ✗ | ✓ model | ✗ | LTM unique. |
| 220 | User saved item / district follow / event RSVP | ✗ | ✓ models | ✗ | LTM unique. |
| 221 | UserProfile (rich) | ✗ | ✓ model | ✗ | LTM unique. |
| 222 | Comment | ✗ | ✓ model | ✗ | LTM unique. |
| 223 | Org suggestion / video alert / removal request | ✗ | ✓ 3 models | ✗ | LTM unique. |
| 224 | Content hub | ✗ | ✓ `ContentHub` model + `g2-229-content-hub-recomputer` | ✗ | LTM unique. |
| 225 | Health endpoint | ✓ `/api/health` | ✗ | ✗ | Brain only. |
| 226 | Judge endpoint (Cristiano verdict) | ✓ `/api/judge` | ✗ | ✗ | Brain only. |
| 227 | Search endpoint (Tavily wrap) | ✓ `/api/search` | ✗ | ✗ | Brain only. |
| 228 | Deepgram STT API | ✓ `/api/voice/transcribe` | ✗ | ✗ | Brain only. |
| 229 | Avatar generate / session | ✓ `/api/avatar/{generate,session}` | ✗ | ✗ | Brain only. |
| 230 | Realtime session / WebRTC | ✓ `/api/realtime/{session,webrtc}` | ✗ | ✗ | Brain only. |
| 231 | Inngest endpoint | ✓ `/api/inngest` | ✗ | ✗ | Brain only. |
| 232 | LTM scan-codebase build step | ✗ | ✓ `scripts/scan-codebase.ts` runs at build | ✗ | LTM unique. |
| 233 | Prisma seed | ✗ | ✓ `prisma/seed/index.ts` | ✗ | LTM unique. |

---

## 2. DETAILED CATEGORY INVENTORY

### 2.1 Core Orchestration

#### Olivia Brain
- **Model cascade** — `src/lib/services/model-cascade.ts` — 9-model firing order: Gemini 3.1 Pro → Sonnet 4.6 → GPT-5.4 → Gemini verify → Grok 4 → Perplexity Sonar Reasoning → Tavily → Opus 4.6 (judge) → Mistral Large.
- **LangGraph workflow** — `src/lib/orchestration/phase1-graph.ts` — 5-node graph (hydrate → recall → classify intent → generate → persist).
- **Provider catalog** — `src/lib/foundation/catalog.ts` — `PROVIDER_CATALOG` (9 providers with envKey, modelKey, defaultModel, priority, purpose) + `INTEGRATION_CATALOG` (18+ integrations).
- **Intent classifier** — within phase1-graph (planning, research, operations, general, questionnaire, math, judge).
- **Bridge / KnowledgeRegistry** — `src/lib/bridge/registry.ts` — Universal Knowledge Provider pattern with `embedded | live | hybrid` modes, TTL cache, health checks, event aggregation, priority routing per domain.

#### LTM Olivia + Studio
- **Cascade orchestrator** — `src/lib/cascade/orchestrator.ts` — DIFFERENT shape: 4-phase cascade (LLM search → gap-fill → Opus judge → DB inject).
- **Cascade providers** — `src/lib/cascade/providers/{anthropic,openai,google,xai,perplexity,tavily,kimi,companies-house}.ts`. Plus `index.ts`.
- **Cascade prompts** — `src/lib/cascade/prompts/index.ts` — 15 task prompts pre-written.
- **Cascade events** — `src/lib/cascade/events.ts`.
- **Cascade injector** — `src/lib/cascade/injector.ts` — writes cascade outputs into Prisma models.
- **CascadeEvent model** — Prisma table for replay/audit.

#### Studio Prototype
- Single AI surface: 4 raw `fetch("api.anthropic.com")` calls (no auth headers — imaginary) for `optimizeAll`, `askOliviaToDraft`, `sendChat`, `runAnalysis`. Uses `claude-sonnet-4-6` with `web_search_20250305` tool.

---

### 2.2 AI Capabilities

#### Olivia Brain
- **Chat orchestration** — `/api/chat/route.ts` (LangGraph entry).
- **Search** — `/api/search/route.ts` (Tavily wrap).
- **Judge verdicts** — `/api/judge/route.ts` (Cristiano via Opus).
- **Pitch optimize/draft/analyze/chat** — full `/api/pitch/*` suite (`draft`, `analyze`, `optimize`, `chat`, `archetypes`, `templates`) → `lib/pitch/optimize.ts`.
- **CLUES SMART Score engine** — `engines/smartScoreEngine.ts`.
- **CLUES adaptive engine (CAT)** — `engines/adaptiveEngine.ts`.
- **CLUES module relevance** — `engines/moduleRelevanceEngine.ts`.
- **CLUES coverage tracker** — `engines/coverageTracker.ts`.
- **Voice synthesis** — ElevenLabs (`voice/elevenlabs.ts`) + OpenAI TTS (`voice/openai-tts.ts`) behind unified `voice/index.ts`.
- **STT** — Deepgram (`voice/deepgram.ts`, sub-200ms) + Whisper (`voice/whisper.ts`).
- **Avatar generation** — Simli, HeyGen, D-ID, SadTalker via `avatar/*.ts` behind unified `avatar/index.ts`.
- **Realtime pipeline** — STT→LLM→TTS→Avatar in `realtime/pipeline.ts` targeting sub-800ms TTFB.
- **Scoring (city)** — `lib/scoring/{algorithm,comparison,verdict}.ts`.

#### LTM Olivia + Studio
- **Olivia chat** — `/api/olivia/chat` + `lib/olivia/chat.ts` (`processOliviaMessage`, `createConversation`, `getConversationHistory`, `getConversationMessages`).
- **Olivia voice (full pipeline)** — `/api/olivia/voice/{route,process,presentation,to-document,to-package}`.
- **Voice document drafting** — `lib/olivia/voice-document.ts` (`processDictation`, `generatePresentationContent`, `generateDocumentOutline`, `isDocumentSuitable`).
- **Voice memory** — `lib/olivia/voice-memory.ts` (`storeVoiceMemories`, `getVoiceMemories`).
- **Voice prompts** — `lib/olivia/voice-prompts.ts` (`buildConversationPrompt`, `buildExtractionPrompt`, `buildQuickActionPrompt`, `buildIntentPrompt`, `OLIVIA_GREETINGS`, `OLIVIA_FALLBACKS`, `QUICK_ACTION_PATTERNS`, `DICTATION_PROMPTS`).
- **Voice conversation** — `lib/olivia/voice-conversation.ts` (`generateResponse`, `extractFromTranscript`, `processQuickAction`, `detectQuickAction`, `detectDictation`).
- **Olivia tools (function-call layer)** — `lib/olivia/tools.ts` (`executeOliviaTool`).
- **Olivia knowledge base** — `lib/olivia/knowledge-base.ts` (`buildOliviaSystemPrompt`, `buildEntityPersonaPrompt`, `buildStudioOliviaPrompt`, `OLIVIA_SYSTEM_PROMPT`).
- **LiveAvatar SDK wiring** — `lib/olivia/liveavatar.ts` (`createSessionToken`, `startSession`, `createAndStartSession`).
- **Olivia presentation generator (UI)** — `OliviaPresentationGenerator.tsx` + `/api/olivia/presentation`.
- **Olivia consent / guardrails / memory** — `/api/olivia/{consent,guardrails,memory}`.
- **Studio question engine** — `lib/studio/{types,entityModes,questionMapper}.ts`.
- **Pitch Polish modal** — `components/studio/PitchPolishModal.tsx` (LLM-powered rewrite per entity tone).
- **Deep research panel** — `components/studio/DeepResearchPanel.tsx`.
- **Valuation suite** — `lib/agents/valuation/{evidence-mapper,method-selection,truth-score-agent,llm-adapter,acquisition-mirror,financial-extractor,validation-agent,pre-mortem-agent}.ts`.

#### Studio Prototype
- 4 stubbed Anthropic calls (see § 2.1).
- Pure-local `scoreDecks` / `scoreTemplates` / `applyLibraryFilter` scoring math (no LLM).
- `askOliviaToMatch` — pure-local; produces top-3 decks + top-2 templates as a chat message.
- 8 `CHAT_ACTIONS` quick-action chips that pre-fill chatInput.

---

### 2.3 Data / Memory

#### Olivia Brain (Prisma 7 — 33 models)
Models grouped:
- Conversation: `conversations`, `conversation_turns`, `conversation_events` (event-sourced ledger).
- Trace: `foundation_traces`, `integration_test_runs`.
- Knowledge: `knowledge_chunks` (pgvector-ready), `mem0_memories`, `graph_entities`, `graph_relationships` (BFS-ready).
- Multi-layer memory: `episodes`, `semantic_memories` (with contradiction + decay), `procedural_memories` (success/fail), `journey_snapshots`.
- HITL/governance: `action_budgets`, `pending_approvals`, `tool_execution_logs`.
- Agents: `agent_groups`, `agents`, `agent_runs`, `agent_configs`, `agent_briefings`, `agent_learnings`, `agent_metrics`, `system_alerts`, `feature_toggles`, `admin_emails`, `admin_audit_logs`.
- Multi-tenant: `tenants`, `tenant_members`, `tenant_configs`, `tenant_adapter_overrides`, `tenant_model_overrides`, `tenant_policies`, `tenant_api_keys`.

Implementation libraries:
- `lib/memory/store.ts` (in-memory fallback).
- `lib/memory/semantic-search.ts`.
- `lib/memory/embeddings.ts`.
- `lib/memory/knowledge.ts`.
- `lib/memory/ttl.ts` (forgetting rules).
- `lib/memory/mem0.ts` (Mem0 SaaS integration).

#### LTM Olivia + Studio (Prisma 5 — Olivia/Studio-relevant slice of ~120 models)
- Olivia: `OliviaConversation`, `OliviaMessage`, `OliviaPresentation`, `OliviaConsent`, `OliviaGuardrail`, `OliviaUserMemory`, `OliviaCalendarRecommendation`.
- Emilia (their spelling): `EmiliaConversation`, `EmiliaMessage`.
- Voice: `VoiceConversation`, `VoiceContact`, `VoiceActionItem`, `VoiceTranscriptionLog`.
- Calendar: `CalendarEntry`, `CalendarPreferences`, `CalendarPrepTask`, `CalendarReminder`, `CalendarEntryAttendee`, `CalendarInteraction`, `CalendarSyncAccount`, `CalendarSyncConflict`, `CalendarWebhookState`, `CalendarMemoryChunk`, `CalendarNote`, `FounderWeek`.
- Agents: `AgentGroup`, `Agent`, `AgentRun`, `AgentMetric`, `AgentConfig`, `AgentBriefing`, `AgentLearning`, `SystemAlert`, `CascadeEvent`.
- Documents: `DocumentCollection`, `Document`, `DocumentVersion`, `DocumentModule`, `DocumentRelationship`, `DocumentBookmark`.
- Packages/outreach: `PackageTemplate`, `Package`, `PackageDocument`, `PackageRecipient`, `PackageEvent`, `OutreachCampaign`, `OutreachCampaignTarget`, `ReceiverSession`, `ReceiverQuestion`, `FollowUpTask`, `TargetList`, `TargetListItem`, `TargetMatch`.
- Valuation: `ValuationSubject`, `ValuationRun`, `ValuationSensitivity`, `FinancialSnapshot`, `DealRoomSession`, `DealRoomMessage`.

#### Studio Prototype
- All in-memory React state (no DB). Persisted via `window.storage.{get,set,delete}` (1.5s debounce) — Anthropic artifact-runtime affordance, not a real browser API.
- Storage shape: `slides[]`, `planSections[]`, `chatMessages[]`, `auditLog[]`, `docCompletions{}`, `deckConfig`, `persona`, `outputTheme`, `expandedCats`, `activeFrameworks`, etc.

---

### 2.4 Tools / Integrations

#### Olivia Brain
- **Composio** — 200+ integrations (`@composio/core` + `lib/services/composio.ts`).
- **Nylas** — unified inbox/calendar (`lib/nylas/client.ts`).
- **HubSpot** — CRM (`lib/hubspot/server.ts`).
- **Resend** — transactional email (`lib/resend/server.ts`).
- **Instantly** — outbound sequencer (`lib/instantly/server.ts`).
- **Twilio** — voice + SMS + SIP + recording + status callbacks (`lib/twilio/server.ts` + `lib/telephony/{sms,recording,sip,callbacks,turn-taking}.ts`).
- **LiveKit** — WebRTC (`lib/realtime/livekit.ts`).
- **Vapi** — inbound voice AI (`lib/realtime/vapi.ts`).
- **Retell** — outbound voice AI (`lib/realtime/retell.ts`).
- **Inngest** — event functions (`@inngest` + `/api/inngest`).
- **Trigger.dev** — long-running jobs.
- **Upstash QStash** — serverless queue.
- **Temporal** — durable workflows.
- **Tavily** — web search.
- **Real-estate adapters** — `adapters/{mls,bridge,housecanary,batchdata,propertyradar,plunk,rentcast,regrid}.ts`.
- **Relocation adapters** — `adapters/{google-places,walkscore,open-exchange-rates,travel-buddy-visa,fbi-crime-data,wherenext-col,schooldigger}.ts`.
- **Environmental adapters** — `adapters/{noaa,fema,airnow,howloud,openweathermap}.ts`.
- **RAG adapters** — `adapters/{firecrawl,unstructured,cohere-rerank,jina-reader}.ts`.
- **CLUES London Calendar adapter** — `adapters/london-calendar.ts` (10 endpoints) + `london-calendar-contract.ts`.
- **Approval gate** — `tools/approval-gate.ts`.
- **Confidence gate** — `tools/confidence-gate.ts`.

#### LTM Olivia + Studio
- **Twilio** (calls + SMS + WhatsApp) — extensive `/api/olivia/call/*` (10 endpoints), `/api/olivia/sms`, `/api/olivia/whatsapp`.
- **Resend** — emails (`/api/olivia/email`, `/api/olivia/conversations/[id]/email`).
- **HeyGen** — `@heygen/streaming-avatar` + `@heygen/liveavatar-web-sdk`.
- **LiveKit** — `livekit-client`.
- **Stripe** — billing.
- **Clerk** — auth.
- **Mapbox + Three.js + R3F** — 3D map.
- **FullCalendar** — calendar UI (5 packages).
- **Companies House** + **Kimi** — cascade providers.
- **Olivia tool registry** — `lib/olivia/tools.ts` (function-calling).
- **District intelligence** — `lib/agents/district-intelligence.ts`.
- **Seed agents** — `lib/agents/seed-agents.ts`.

#### Studio Prototype
- None — single-file React. No real integrations.

---

### 2.5 Document / Studio Capabilities

#### Olivia Brain
- **Pitch module data** — fully ported from prototype:
  - 75 deck archetypes (`pitch/archetypes.ts`).
  - 12 business plan templates (`pitch/templates.ts`).
  - 16 slide types + field schemas (`pitch/slides.ts`: SLIDE_META, SLIDE_FIELDS, FEEDBACK_SEEDS).
  - 10 doc categories / ~100 docs (`pitch/documents.ts:DOC_CATEGORIES`).
  - 16 plan sections (`pitch/documents.ts:PLAN_SECTIONS`).
  - 14 frameworks (`pitch/constants.ts`).
  - 5 personas (`pitch/personas.ts`: Angel/Seed/SeriesA/Strategic/Buyout).
  - 5 themes (`pitch/constants.ts:THEMES`).
- **Scoring** — `pitch/scoring.ts` (`scoreDecks`, `scoreTemplates`, `applyLibraryFilter`, `getTopDecks`, `getTopTemplates`).
- **Optimize** — `pitch/optimize.ts` (`optimizeSlide`, `optimizeAllSlides`, `draftPlanSection`, `analyzeContent`, `askOlivia`, `generateDeckFromArchetype`, `extractApiText`, `safeParseJson`, `buildPrompt`).
- **APIs** — `/api/pitch/{archetypes,templates,draft,analyze,optimize,chat}`.
- **UI primitives** — `components/pitch/{Badge,CompletionRing}.tsx`. (No full Studio UI.)

#### LTM Olivia + Studio
- **PreparationStudio** — `components/studio/PreparationStudio.tsx` (the Studio shell).
- **27 Studio components** (full list above in summary matrix rows 147-170).
- **Document blocks** — 17 block components (`components/documents/blocks/*`).
- **Document workspace + editor** — `DocumentWorkspace`, `DocumentEditor`, `DocumentBody`, `DocumentRenderer`, `DocumentFieldEditor`, `DocumentSourcePanel`, `DocumentActionBar`, `DocumentCard`, `DocumentFilters`, `DocumentQuickView` (+ provider).
- **Workspace Olivia panel** — `WorkspaceOliviaPanel.tsx`.
- **Document templates** — `DocumentTemplatePreview`, `documents/content.ts`.
- **Bookmark / save-to-package** — `BookmarkButton`, `AddToPackageButton`, `SaveToPackageModal`, `PackageProgressBar`.
- **Print + Org map** — `PrintButton`, `OrgMapProvider`.
- **Question engine** — `lib/studio/{types.ts,questionMapper.ts,entityModes.ts}` — `QuestionState` wraps each `WorkspaceBlock` with: presentation metadata, Bayesian prior stub, suggestion sources, consistency flags, engagement metrics, session metrics, studio config.
- **Entity modes** — VC, Accelerator, Acquirer, Angel, Corporate, General — each with `priorityBlockTypes`, `supplementaryBlockTypes`, `priorityFieldKeys`, `oliviaPersonaHint`, `keyQuestions`, `toneLabel`.

#### Studio Prototype
- Three-region shell (header / left aside / center main / right aside).
- Five reusable primitives: `ConsensusDots`, `Badge`, `CompletionRing`, `AvatarOrb`, `DeckDetailModal`.
- Inline-style design system (color token map `C`, typography stack DM Sans + Syne + JetBrains Mono).
- 4 sections (Pitch / Plan / Documents / General) + 5 right-aside tabs (Olivia / Library / Preview / Themes / Audit).
- Mode toggle: Guided vs Freeform.
- Inline-editable project name.
- Score chips header HUD: CLR / IMP / MOT / ALL (mono numbers, recomputed every render).
- DeckDetailModal with focus trap, Esc + arrow-key tab rover, J/K slide nav.
- Apply-archetype = regenerate slides.
- Reset Workspace destructive button (window.confirm).
- Library tab: search → Decks/Plans toggle → relevance line → cards (3px left bar, score number, ConsensusDots).
- Preview tab: light theme inversion (only place in app).
- Themes tab: 5 London-themed palettes (Canary-Sapphire, Gherkin-Polished, Barbican-Raw, Battersea-Resilient, Shard-Ambitious).
- Audit tab: timestamped audit log entries.

---

### 2.6 Personas

#### Olivia Brain — Branded executive personas (3)
- **Olivia™** — `lib/personas/handlers/olivia.ts` — bilateral client-facing, intent classification, greeting, assessment flows. Stack: Simli + ElevenLabs + Sonnet 4.6.
- **Cristiano™** — `lib/personas/handlers/cristiano.ts` — UNILATERAL judge only, James Bond aesthetic. Stack: Replicate SadTalker + ElevenLabs + Opus 4.6.
- **Emelia™** — `lib/personas/handlers/emelia.ts` — text-only, customer support / tech, ticket creation. Stack: GPT-4 + ElevenLabs (no video).
- **PersonaService** — `lib/personas/orchestrator.ts` — unified `invoke()`.
- **Definitions** — `lib/personas/definitions.ts`.

#### Olivia Brain — Investor personas (5, ported from prototype)
- Angel, Seed VC, Series A, Strategic, Buyout/PE — `lib/pitch/personas.ts`.
- Each has `key`, `label`, `color`, `desc`. Used to interpolate prompts in `pitch/optimize.ts`.

#### LTM Olivia + Studio — Entity-mode personas (6)
- VC, Accelerator, Acquirer, Angel, Corporate, General — `lib/studio/entityModes.ts`.
- Each has: `priorityBlockTypes`, `supplementaryBlockTypes`, `priorityFieldKeys`, `oliviaPersonaHint`, `keyQuestions`, `toneLabel`. DIFFERENT concept — these affect document layout AND Olivia tone.
- LTM also has an "Olivia" chat surface and `EmiliaConversation`/`EmiliaMessage` Prisma models (note spelling discrepancy).

#### Studio Prototype — Investor personas (5, source of truth)
- Angel, SeedVC, SeriesA, Strategic, Buyout — `PERSONAS` const. Drives Olivia chat system prompt, deck scoring, archetype matching.

> **CONFLICT:** Brain has 3 branded personas + 5 investor personas. LTM has 6 entity-mode personas + Olivia + Emilia. Prototype has 5 investor personas. The merger needs a clean reconciliation — see § 5 of MERGE_PLAN.

---

### 2.7 Multi-tenant / White-Label / Compliance

Brain only — no LTM equivalent.
- **Tenant** — `lib/tenant/{types,context,service,adapters,models,policies}.ts` + `lib/tenant/index.ts`. AsyncLocalStorage tenant context, `withTenantContext()`, `resolveAdapter()`, `resolveModel()`, approval rules, rate limits, feature gates, data residency.
- **White-label** — `lib/white-label/{branding,personas,prompts,entitlements,deployment}.ts`. Brand pack (colors/typography/logos/voice), per-tenant persona override, prompt packs (onboarding/analysis/reports/compliance), entitlements (Free/Starter/Pro/Enterprise + quotas), deployment (domains/SSL/CDN/health).
- **Compliance** — `lib/compliance/{pii-redactor,fair-housing,guardrails,rag-scoring,data-residency,consent,subflows,knowledge-versioning}.ts`. EU/UK/AP routing, all-party/one-party recording consent, GDPR right-to-be-forgotten, deterministic visa/tax/immigration subflows, market-specific rules with version lifecycle.

LTM has only `OliviaConsent` model + `/api/olivia/{consent,guardrails}`.

---

### 2.8 UI Surfaces

#### Olivia Brain
- `app/page.tsx` — Phase 1 Studio landing (engineering-style).
- `app/admin/page.tsx` — `AdminDashboardClient.tsx` (1006 LOC) for 250 agents.
- `app/admin/integrations/page.tsx` — admin-integrations dashboard.
- 4 tsx components total (`phase1-studio`, `admin-integrations-dashboard`, `pitch/Badge`, `pitch/CompletionRing`).

#### LTM Olivia + Studio
- 12 Olivia components (chat panels, presentation generator, video avatar, voice player, suggestions, consent, display screen, message, provider).
- 27 Studio components (top/bottom bars, question card, voice input/TTS, formatting toolbar, suggestion chips, why-this, pitch polish, deep research, research history, entity brief, entity perspective, micro-reward, skip-nudge, completion ceremony, document transition, pre-submit, cristiano re-eval, answer ribbon, story review, keyboard shortcuts, preparation studio, studio Olivia avatar/chat, answer editor).
- 36 Document components (blocks + workspace + editor + filters + bookmark + package).

#### Studio Prototype
- One file. Header + 264px left aside + flex-1 center + 320px right aside. 5 reusable primitives. Light-theme Preview inversion.

---

### 2.9 APIs / Endpoints

#### Olivia Brain (33 routes)
```
GET  /api/health
POST /api/chat
GET  /api/traces
GET  /api/admin/integrations
POST /api/admin/integrations/test
GET  /api/admin/memory
POST /api/admin/migrations
GET  /api/admin/approvals
POST /api/admin/agents/run
GET/POST /api/admin/agents/[agentId]
POST /api/admin/toggles
POST /api/twilio/voice/inbound
POST /api/search
POST /api/judge
GET  /api/voice
POST /api/voice/synthesize
POST /api/voice/transcribe
GET  /api/avatar
POST /api/avatar/generate
POST /api/avatar/session
GET  /api/realtime
POST /api/realtime/session
POST /api/realtime/webrtc
GET  /api/telephony
POST /api/telephony/sms
POST /api/inngest
GET/POST /api/pitch
POST /api/pitch/draft
POST /api/pitch/analyze
GET  /api/pitch/archetypes
GET  /api/pitch/templates
POST /api/pitch/chat
POST /api/pitch/optimize
```

#### LTM Olivia + Studio (Olivia subset only — 32 routes)
```
POST /api/olivia/voice
POST /api/olivia/voice/process
POST /api/olivia/voice/presentation
POST /api/olivia/voice/to-document
POST /api/olivia/voice/to-package
POST /api/olivia/presentation
POST /api/olivia/video
GET  /api/olivia/liveavatar
POST /api/olivia/liveavatar/speak
POST /api/olivia/conversation
POST /api/olivia/consent
POST /api/olivia/guardrails
POST /api/olivia/memory
POST /api/olivia/conversations/[id]/email
GET  /api/olivia/history
GET  /api/olivia/history/[id]
POST /api/olivia/sms
POST /api/olivia/email
POST /api/olivia/whatsapp
POST /api/olivia/call/twiml
POST /api/olivia/call/audio
POST /api/olivia/call/inbound
POST /api/olivia/call/outbound
POST /api/olivia/call/recording
POST /api/olivia/call/status
POST /api/olivia/call/extract
POST /api/olivia/call/gather
POST /api/olivia/call/reminder
POST /api/olivia/call
GET  /api/olivia/calls
GET  /api/olivia/calls/[id]
POST /api/olivia/chat
POST /api/calendar/olivia
```

#### Studio Prototype
- 4 imaginary `fetch("api.anthropic.com/v1/messages")` calls with no auth headers.

---

### 2.10 Infra / Dev

| Layer | Olivia Brain | LTM Olivia+Studio |
|---|---|---|
| Framework | Next 16.2.2 (App Router) | Next 14.2.4 (App Router) |
| React | 19.2 | 18 |
| TypeScript | 6.0 | 5.x |
| ORM | Prisma 7.7 + `@prisma/adapter-pg` | Prisma 5.14 |
| DB | Supabase (PostgreSQL + pgvector-ready) | Supabase (PostgreSQL) |
| Build | `prisma generate && next build` | `prisma generate && tsx scripts/scan-codebase.ts && next build` |
| Auth | (none — admin route uses `lib/admin/auth.ts`) | Clerk 5.7 |
| AI SDK | Vercel `ai` 6.0 + 7 provider packages | `openai` 6.32 raw + cascade |
| Validation | zod 4.3 | zod 4.3 |
| Workflows | LangGraph 1.x + Inngest + Trigger + QStash + Temporal | (none beyond cron) |
| Observability | Langfuse OTel + OpenTelemetry SDK | (none) |
| Evals | Braintrust + Patronus | (none) |
| Memory SaaS | Mem0 2.4 | (none) |
| Map / 3D | (none) | Mapbox 3.19 + Three 0.170 + R3F + R3F drei + R3F postprocessing |
| Calendar UI | (none) | FullCalendar 6.1 (5 packages) |
| Avatar SDK | Simli/HeyGen/D-ID via REST | `@heygen/liveavatar-web-sdk` + `@heygen/streaming-avatar` |
| Realtime | LiveKit + Twilio Relay + Vapi + Retell | livekit-client only |
| Charts | (none) | recharts 3.8 + d3-sankey + d3-shape |
| Animations | (none) | framer-motion 12.38 |
| Markdown | (none) | react-markdown + remark-gfm |
| Icons | (none) | Phosphor + Lucide |
| Drag-drop | (none) | dnd-kit (3 packages) |
| Billing | (none) | Stripe 20 + stripe-js 8.9 |
| Email | Resend | Resend 6.9 |
| i18n | (none) | next-intl 4.8 |
| Phone | (twilio backend only) | twilio + react-international-phone |
| Recurring | (none) | rrule 2.8 |
| Screenshot | (none) | html2canvas 1.4 |

---

## 3. UNIQUE-TO-SOURCE LIST (most valuable to preserve)

### Unique to Olivia Brain
1. **9-model cascade** with LangGraph orchestration (Brain’s entire `services/model-cascade.ts` + `phase1-graph.ts`).
2. **Multi-tenant + white-label runtime** (12 files in `tenant/` + `white-label/`). Nothing in LTM or prototype.
3. **Compliance subsystem** — PII, Fair Housing, guardrails, RAG scoring, data residency, consent, deterministic visa/tax subflows, knowledge versioning.
4. **Multi-layer memory**: episodic + semantic + procedural + journey snapshots + knowledge graph + Mem0.
5. **Durable execution stack** — Inngest + Trigger + Temporal + QStash + Action Budgets + Approval gates.
6. **Avatar Identity Bible + Emotion/Gesture Policy** + 4-vendor avatar abstraction + STT→LLM→TTS→Avatar pipeline.
7. **Realtime voice agent stack** — LiveKit + Vapi + Retell + Twilio ConversationRelay.
8. **Composio (200+ tools), Nylas, HubSpot, Instantly** — integration breadth.
9. **CLUES Intelligence** — 30 paragraphs, 23 specialty modules, ~2,300 questions, adaptive engine, module relevance, SMART score.
10. **27 vertical adapters** — real estate (9), relocation (7), environmental (5), RAG (4), London Calendar (1), other (1).
11. **250-agent registry metadata** + admin dashboard with multi-LLM config.
12. **Bridge / Universal Knowledge Provider registry** — `lib/bridge/registry.ts` is the embedded/live/hybrid contract designed exactly for the Grand Master Olivia merge. KEY ASSET.
13. **Foundation status / catalog / health** introspection.
14. **Pitch module fully ported** (data + scoring + optimization + APIs).
15. **Langfuse + Braintrust + Patronus** observability/eval.
16. **Persona orchestrator** (`personas/orchestrator.ts`) — Olivia/Cristiano/Emelia handoff.

### Unique to LTM Olivia + Studio
1. **Full Studio UI shell** — 27 Studio components (PreparationStudio, top/bottom bars, question card, etc).
2. **Document blocks library** — 17 block types (Hero/Stat/Metric/Pie/Bar/Table/Quote/Callout/Timeline/Comparison/Product/Section/Footer/Hero/Logo/Team/Divider/Paragraph/List).
3. **Document workspace** — workspace, editor, body, renderer, field editor, source panel, action bar, card, filters, quick-view, template preview.
4. **Studio question engine** — `lib/studio/questionMapper.ts` + `types.ts` (Bayesian prior stubs, consistency flags, engagement metrics, session metrics).
5. **Entity-mode personas** — VC/Accelerator/Acquirer/Angel/Corporate/General with priority/supplementary block hints.
6. **Voice → document / voice → package / voice → presentation pipelines** — full LLM-orchestrated dictation workflows.
7. **Quick-action / dictation detection** — utterance classifier producing structured intent.
8. **WhatsApp + Email + SMS + Call channels** — granular `/api/olivia/call/*` (10 sub-routes) with twiml/audio/recording/extract/reminder/gather/inbound/outbound/status.
9. **Calendar suite** — 14 Prisma models, Olivia recommendation engine, founder-week tracker, sync conflict resolver, prep tasks, reminders, memory chunks.
10. **Valuation suite (LTM agents)** — 8+ specialised agents (Truth Score, DCF Mirror, Evidence Mapper, Validation, Pre-Mortem, Financial Extractor, Method Selection, Acquisition Mirror, LLM Adapter).
11. **120+ runnable agents** — `g1-001..168` (~100+ agents) + `g2-222..230` (8 video agents).
12. **Video pipeline** — ingest → transcript → NER → relevance → entity-link → cleanup → content-hub recompute.
13. **Companies House + Kimi** providers in cascade.
14. **Cascade prompts catalog (15)** + cascade events DB log + cascade injector.
15. **Package + outreach + receiver flows** — Package, PackageDocument, PackageRecipient, PackageEvent, OutreachCampaign, OutreachCampaignTarget, ReceiverSession, ReceiverQuestion, FollowUpTask, TargetList, TargetListItem, TargetMatch.
16. **Map + 3D ecosystem visualisation** — Mapbox + Three + R3F suite.
17. **FullCalendar UI** + dnd-kit drag/drop.
18. **Stripe billing + Clerk auth.**
19. **Olivia knowledge base** with `buildEntityPersonaPrompt` + `buildStudioOliviaPrompt`.
20. **Olivia tools registry** (function-calling for Olivia).

### Unique to Studio Prototype
1. **AvatarOrb visual identity** — orange→purple→pink gradient, glow when connected, three-place placement (header / sidebar pad / Olivia tab).
2. **Score chips header HUD** — CLR / IMP / MOT / ALL recomputed every render.
3. **Mode toggle Guided/Freeform** — switchable mid-edit.
4. **Inline-editable project name** — click to enable input.
5. **Library scoring overlay with reasons** — every archetype card carries a numeric score AND human-readable match reasons.
6. **DeckDetailModal** — Apply-archetype CTA that regenerates slide list.
7. **Match button** — pure-local scoring producing top-3 decks + top-2 templates as Olivia chat message.
8. **Light-theme Preview tab inversion** — only place in app.
9. **5 London-themed palettes** — Canary-Sapphire, Gherkin-Polished, Barbican-Raw, Battersea-Resilient, Shard-Ambitious.
10. **Audit tab as first-class citizen** — every state change pushes a `{time,text}` entry; visible session replay.
11. **Three-region inline-style shell** with no Tailwind — color-token map `C` is the single design system.
12. **J/K global slide navigation, focus-trap on modal Tab cycling, focus-restore via `modalOpenerRef`.**
13. **`PERSONAS` const (5 investor types) + 5 themes + 14 frameworks + 9 cat-libs** — opinionated design data.

---

## 4. DUPLICATED / DIVERGENT LIST (most likely to cause merge conflicts)

| # | Feature | Brain | LTM | Prototype | Resolution Hint |
|---|---|---|---|---|---|
| 1 | Cascade orchestrator | LangGraph 5-node, 9-model | 4-phase, ~8 providers | none | Keep Brain’s LangGraph as the runtime; copy LTM’s prompt catalog (15) + cascade events DB log + injector pattern. |
| 2 | Anthropic provider | AI SDK 6 | raw cascade fetch | raw fetch (no auth) | Brain wins. |
| 3 | OpenAI provider | AI SDK 6 | `openai` 6.32 | none | Brain wins (unified). |
| 4 | Olivia chat handler | `processOliviaMessage` not present (uses `/api/chat` LangGraph) | `lib/olivia/chat.ts:processOliviaMessage` | `sendChat` raw fetch | LTM’s richer for tools/intent sniffing. Wrap LTM chat into Brain’s LangGraph node. |
| 5 | Personas | 3 branded execs + 5 investor | 6 entity-mode | 5 investor | Two distinct axes: WHO speaks (Brain) vs WHO listens (LTM). Keep both as orthogonal dimensions in `personas/` and `studio/entityModes`. |
| 6 | Voice synthesis (TTS) | Provider abstraction | UI player only | none | Brain wins. |
| 7 | STT | Deepgram + Whisper providers | (browser SR + Whisper assumed via routes) | none | Brain wins. |
| 8 | Avatar SDK | Simli/HeyGen/D-ID/SadTalker REST | LiveAvatar web SDK + streaming-avatar 2.1 | AvatarOrb visual only | Hybrid: Brain’s server abstraction + LTM’s LiveAvatar UI client. |
| 9 | Twilio voice | `/api/twilio/voice/inbound` (single) | `/api/olivia/call/{10 sub-routes}` | none | LTM granularity wins; rehome under Brain `lib/telephony/`. |
| 10 | Calendar | adapter calling LTM | native (14 models) | none | Standalone Brain keeps adapter (calls Grand Master’s own native calendar service); embedded mode short-circuits to LTM models. |
| 11 | Email | Resend server lib | Resend + olivia/email route + conversation→email | none | LTM’s endpoints win, wrap Brain’s server lib. |
| 12 | Memory | episodic+semantic+procedural+graph+mem0+journey | OliviaUserMemory (single Prisma model) + voice-memory.ts | none | Brain wins; migrate LTM data into Brain’s richer schema. |
| 13 | Consent | `compliance/consent.ts` + GDPR forgotten | OliviaConsent model + /api/olivia/consent | none | Merge: keep model in Brain schema, expose route via Brain. |
| 14 | Guardrails | NeMo guardrails | /api/olivia/guardrails | none | Use Brain’s NeMo, retire LTM stub. |
| 15 | Pitch module data | full port | none | source of truth | Brain’s port is the canonical version going forward. |
| 16 | Studio shell UI | 4 tsx | 27 tsx + 36 doc tsx | one .jsx (north-star) | LTM is the UI body; rebuild against Brain backend per prototype layout. |
| 17 | Question engine | (none) | `lib/studio/questionMapper.ts` | (slide-fields/plan-sections data only) | LTM wins; keep file as-is. |
| 18 | Document blocks | (none) | 17 block components | (none — text blob only) | LTM wins. |
| 19 | Themes | data port (`THEMES` const) | (none) | full UI + 5 themes | Use Brain data + Prototype UI. |
| 20 | Library tab | data only | (no inventory tab) | full UI | Build against Brain data + Prototype layout. |
| 21 | Audit log | `admin_audit_logs` model + admin scope | (none) | client-state visible tab | Plumb Brain DB → Prototype tab UI for the user-visible session. |
| 22 | Agent registry | 250-entry metadata in `agents/registry.ts` | ~120 runnable impl files g1-/g2-/valuation/ | (none) | Two-layer model: Brain registry = catalog/control plane; LTM agents = execution plane behind specific group codes. Keep both. |
| 23 | Avatar visual identity | (no orb) | OliviaVideoAvatar + StudioOliviaAvatar | AvatarOrb gradient | Adopt prototype’s AvatarOrb across all UIs. |
| 24 | Knowledge base / system prompt | persona system prompts | `OLIVIA_SYSTEM_PROMPT` + `buildStudioOliviaPrompt` | inline | LTM wins for studio; merge with Brain persona prompts. |
| 25 | Score chips HUD | (none) | (none) | CLR/IMP/MOT/ALL | Add to merged Studio header — pulls from Brain `pitch/scoring.ts`. |
| 26 | Feature toggles | `feature_toggles` model + `/api/admin/toggles` | `FeatureToggle` model | (none) | Keep Brain’s; LTM model is duplicate. |
| 27 | Admin emails | `admin_emails` model | `AdminEmail` model | (none) | One model. Keep Brain. |
| 28 | Emelia / Emilia spelling | "Emelia" | "Emilia" | (n/a) | Pick "Emelia" (matches branding doc). Migrate LTM tables. |
| 29 | OpenAI client | AI SDK 6 | raw `openai` 6.32 | (none) | Brain wins. Refactor LTM call sites. |
| 30 | Prisma versions | 7.7 | 5.14 | (none) | MAJOR — see risk register. |
| 31 | Next versions | 16.2 | 14.2 | (none) | MAJOR — see risk register. |
| 32 | React versions | 19.2 | 18 | any | LTM components must be React-19-compatible. |

---

## 5. SCALE NUMBERS (for the merge-effort estimate)

| Source | TS files (lib) | Components | API routes | Prisma models | LOC |
|---|---|---|---|---|---|
| Olivia Brain | ~120 | 4 | 33 | 33 | ~80,000 |
| LTM (Olivia/Studio slice) | ~110 olivia/studio/cascade/agents files | ~75 (12 olivia + 27 studio + 36 docs) | 32 olivia + 1 calendar/olivia | ~50 olivia/studio/voice/calendar/document/package/agent | ~70,000 of 200K+ total |
| Studio Prototype | 1 | 1 (5 sub-primitives) | 0 | 0 | ~3,000 logical LOC |

---

*End of inventory. See MERGE_PLAN.md for the unification strategy.*
