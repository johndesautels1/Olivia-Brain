# 11 · FEATURE × LLM/API MATRIX — exhaustive inventory + cross-reference

> **Date:** 2026-05-26. **Author:** Claude Opus 4.7 (1M context).
> **Purpose:** single-page picture of every shipped + planned Olivia
> Brain feature, every LLM / API / endpoint that feeds her brain, and
> the cross-reference between the two — so the founder can see at a
> glance what is fully wired, what is partial, and what is still
> missing for "fully feeding her brain."
>
> **Sources synthesised:**
> - `docs/FEATURE_INVENTORY.md` (capability domains, last refresh
>   2026-05-09 — stale on Track V valuation, Cristiano dashboard,
>   Track G/H/B closures since)
> - `src/lib/config/env.ts` (canonical env-var schema — current)
> - `src/lib/agents/llm.ts` (callLLM bridge + provider routing)
> - `README.md` Visual Manifestation Stack (Tier 1-4 planned APIs)
> - `docs/HANDOFF.md` + `HANDOFF_2026-05-25.md` + `HANDOFF_2026-05-26.md`
>   (recent closures: Cristiano dashboard, persona-aware LiveAvatar,
>   FIX-1/2/3/4/5)
>
> **Relation to `docs/FEATURE_INVENTORY.md`:** this file is the
> feature × API matrix angle. `FEATURE_INVENTORY.md` is the
> session-tracking + roadmap angle. Both coexist; refresh both on
> material change.
>
> **Status legend:**
> - ✅ shipped + wired (code, tests, env var declared)
> - 🟡 partial / stub / planned-but-not-wired
> - 🔴 documented in roadmap but no code yet
>
> **Honest verification posture:** built from the canonical docs +
> env.ts + sampling a few `src/lib/*` paths. NOT a byte-level audit
> of every "shipped" claim — where the canonical doc lagged, I
> supplemented from recent commits. Specific rows can be verified
> against `git grep` on demand.

---

## A · Feature inventory (alphabetical, 76 rows)

| Feature | Status | Notes |
|---|---|---|
| Acquisition Mirror (valuation) | ✅ | Part of Track V — `src/components/valuation/AcquisitionMirror*.tsx` |
| Admin dashboard (`/admin`, `/admin/*`) | ✅ | 250-agent registry, integration tests, Mem0 cleanup, migrations runner, feature toggles, approval queue, traces dashboard, avatar-eval harness |
| Agentic learning / 250-agent registry | ✅ | `AGENT_DEFINITIONS` (141 active rows of planned 250), Law 5 guard locked 2026-05-26 |
| Bridge / Universal Knowledge Protocol | ✅ | `OliviaSelfProvider` + `LtmKnowledgeProvider` over `/api/v1/*` Bearer |
| Calendar engine (full LTM port) | ✅ | 14 Prisma models, Google + Outlook + Calendly OAuth sync, webhook subs, conflict resolution, NLP entry parse, daily brief cron, travel-time estimator, voice capture, prep-task auto-gen |
| Cascade orchestration (9-model) | ✅ | `runModelCascade` + `runModelCascadeStream`; 8 providers + Opus judge; intent-driven routing; AbortSignal timeouts; Langfuse traces |
| Cascade trace dashboard (`/admin/traces`) | ✅ | Bloomberg-style table of last 30 runs; 5s polling |
| Chart manifest (` ```chart ` fence) | ✅ | Recharts bar/line/area/pie; lazy-loaded via `next/dynamic` 2026-05-26 (FIX-3 `ebfe272`) |
| Citation-first RAG / sources manifest (` ```sources ` fence) | ✅ | Track O O4; W-004 closed |
| Clerk authentication | ✅ | Track F S18; presence-gated middleware; `STUB_USER_ID` fallback for dev/test/preview |
| CLUES domain intelligence (embedded) | 🟡 | 30 paragraphs + 23 modules + ~2,486 questions fixtured; adaptive + scoring engines partial; full Track L unification post-clueslondon |
| Comparison manifest (` ```comparison ` fence) | ✅ | 2-3 column side-by-side + verdict + winner — the cluesxscore primitive |
| Compliance + guardrails | ✅ | PII detection, Fair Housing, RAG provenance, content guardrails (admin-editable + hardcoded) |
| Composio tool dispatch (agentic) | ✅ | Approval gate + confidence gate; 7 read-only integrations wired (Stripe, GitHub, LinkedIn, QuickBooks, Xero, Companies House, Supabase) |
| Conversation persistence + multi-turn (streaming) | ✅ | 4-turn recall + `SafeConversationStore` + `X-Olivia-Conversation-Id` header |
| Cristiano™ persona — Ask sub-tab | ✅ | `/cristiano` dashboard tab 1; 3-kind picker (startup_match / city_compare / freeform) |
| Cristiano™ persona — Verdict Library sub-tab | ✅ | `/cristiano` tab 2; idempotent via `(userId, requestHash)` SHA256 |
| Cristiano™ persona — Gateway Inbox sub-tab | ✅ | `/cristiano` tab 3; 30s polling for cross-app pushes |
| Cristiano™ cinematic verdict (Studio re-evaluation) | ✅ | Mounted in `CristianoReEvaluation` (commit `cc03204`) |
| Cristiano™ judge endpoint (`/api/judge` + `/api/cristiano/judge`) | ✅ | Opus 4.7 unilateral verdict |
| Cristiano™ mount in WarRoom / WarRoomBriefing / ValuationWorkbench / PreparationStudio | 🟡 | Deferred per `HANDOFF_2026-05-26 § 6` until founder picks up |
| Daily / weekly briefs (Olivia) | ✅ | Calendar plan cron + agent-briefing pipeline |
| Deal Protection (Smart Score + offer eval) | ✅ | Track P CLOSED — P1 5-band ladder → P7 consensus (analyze, dilution, email, counter-draft, rehearsal, versioning, consensus) |
| Deal Room (negotiation surface) | ✅ | `/api/valuation/deal-room/session` + `/score-rubric` |
| Documents + Packages + Sharing | ✅ | Track B S8 + S8b + S8b-routes + S8d; doc workspace + blocks + bookmarks + packages + token-based share |
| Documents heavy app routes (S8d-routes-2) | 🟡 | 4 routes still on carry-forward per `HANDOFF.md § 3` |
| Durable execution (Inngest + Trigger.dev) | ✅ | `/api/inngest` serve + action budgets per conversation |
| Email — HubSpot CRM client | ✅ | `src/lib/hubspot/*` |
| Email — Instantly campaign client | ✅ | `src/lib/instantly/*` |
| Email — Nylas grants/messages/threads | ✅ | `src/lib/nylas/*` |
| Email — Resend (HTML escape, attachments, tags) | ✅ | `src/lib/resend/*` |
| Emelia™ persona (voice + text, no video) | ✅ | Routed in `personas/`; voice id `H3Q2a7I32K2D9dOOWwV0` |
| Equity Waterfall (valuation) | ✅ | Part of Track V — `src/components/valuation/EquityWaterfall*.tsx` |
| Founder Intake — Quantara 56-field | ✅ | Q1-Q7 all closed; auto-fill (Q3) + truth-score (Q4) + metamorphic UI (Q5) + verticals (Q6) + voice + persona synth (Q7) |
| Gamma deck preview manifest (` ```gamma ` fence) | ✅ | Card with title + summary + slides + Open-in-Gamma |
| Gamma presentation generation (server-side) | ✅ | Paid Pro tier; route at `src/app/api/analysis/[runId]/presentation/route.ts` |
| Gateway push (cross-app verdict channel) | ✅ | `POST /api/gateway/cristiano/verdicts` with constant-time bearer auth |
| GDPR / consent | ✅ | `OliviaConsent` per-user; grant/revoke + IP audit + erasure |
| Generative UI manifest (` ```ui ` fence) | ✅ | Card / stat / progress / button registry (N4-foundations) |
| Home page composition (voice-first agentic CIO) | ✅ | Track U CLOSED — 240px AvatarOrb, Bloomberg score chips, ⌘K palette, KPI tiles, Recent Work, Inspector, LiveAgentStream, `/voice` takeover |
| Inspector — Olivia / Library / Audit tabs | ✅ | + Artifacts tab + Cristiano embedded as 7th tab |
| Keyboard shortcuts overlay (`?` global) | ✅ | Polish work; 3 groups (Global / Workspace / Voice) |
| LangGraph cascade wrap (5-node retry-escalate) | ✅ | Track G S20; `runCascadeGraph` |
| LiveAvatar (video — Olivia + Cristiano on persona-aware LITE) | ✅ | Persona-aware pipeline 2026-05-24; LITE mode preserved; LiveKit + WebSocket control channel |
| London Tech Map view (28 districts) | ✅ | Mapbox + Google Maps 3D dual-impl; cluster cards; street view modal |
| LTM bridge (Olivia↔LTM via `/api/v1/*` + `/api/internal/olivia/*`) | ✅ | Two-channel: public v1 bridge + internal calendar adapter |
| Map manifest (` ```map ` fence) | ✅ | Mapbox view with pins + flyTo; fallback list when no token |
| Markdown reply pipeline | ✅ | react-markdown + remark-gfm + 7 custom fence treatments |
| Memory — 6-layer stack | ✅ | Episodic, semantic, procedural, graph (entities + relationships), journey, Mem0 external — all Prisma-backed |
| Multi-tenant + white-label | ✅ | `tenants` + `tenant_configs` + `tenant_adapter_overrides` + `tenant_model_overrides` + `tenant_policies` + `tenant_api_keys` + theme generator |
| Observability (Langfuse + OTel) | ✅ | Tracing on every cascade op + recent-traces admin endpoint |
| Olivia™ persona — client-facing | ✅ | Routed everywhere; voice id `rVk0ZvRulp6xrYJkGztP` (LTM-prod aligned) |
| Pitch coaching surface (Track D PitchCoachTab) | ✅ | Inspector tab + 4 cascade-routed helpers (optimize / draft / analyze / askOlivia) |
| Pitch deck + business plan studio | ✅ | 75 archetypes, 12 templates, 16 slide types, stage/industry scoring |
| Realtime transport (LiveKit + Vapi + Retell) | ✅ | Unified abstraction + WebRTC credential issuance |
| Reply-renderer barrel (7 fences total) | ✅ | chart / gamma / sources / timeline / map / ui / comparison |
| Reports — branded PDF/PPTX | ✅ | `src/lib/reports/*` |
| SMART Score (per-app scoring math) | ✅ | City matching, category, comparison engines; per-app math (no universal formula) |
| Spoke router (7 spokes) | ✅ | FL real estate / international relocation / London tech / xscore / heart recovery / London transit / general fallback |
| Streaming chat (token-level) | ✅ | Track O O3 — W-003 closed; `/api/olivia/chat/stream` |
| Studio (PreparationStudio / WarRoom) | 🟡 | Track B S8c shipped Studio v1 engine (38 files); Track C 11-14 (GrandMaster UI rebuild) carries forward |
| Studio polish (CSS fidelity for ported LTM surfaces) | 🟡 | W-013 open — rolling polish in Track C |
| Telephony — SMS + WhatsApp + voice | ✅ | Twilio full surface; signature-validated inbound webhook |
| Tenant config + adaptive surface suppression | ✅ | Track I S24 — `ui.suppressedSurfaces` + `ui.brandName` + `ui.accentColor` |
| Timeline manifest (` ```timeline ` fence) | ✅ | Vertical rail; 4 tones (neutral/positive/warning/danger) |
| Tools page (`/admin/tools` operator landing) | ✅ | Auto-detects unapplied migrations + inline SQL + Copy button |
| Valuation engine (10-method) | ✅ | Track V CLOSED — DCF, VC method, multiples, scorecard, precedent transactions, strategic synergy, cost-to-duplicate, liquidation, real-options binomial, Monte Carlo + sensitivity tornado |
| Verdict library (`cristiano_verdicts` model + idempotency) | 🟡 | Code shipped; **migration 15 (`captionsUrl`) not yet applied to production DB** per `HANDOFF_2026-05-26 § 5` |
| Vertical adapters (4: AI/SaaS, HealthTech, ClimateTech, PropTech) | ✅ | Track J S25-S26 CLOSED |
| Voice mode (`/voice` STT→chat→TTS chain) | ✅ | Track E S17 — MediaRecorder → Deepgram/Whisper → cascade → ElevenLabs/OpenAI TTS |
| Voice presentation route (Gamma generation from voice) | ✅ | `/api/olivia/voice/presentation` |
| War Room (negotiation simulator) | ✅ | Track V V9; `src/components/valuation/WarRoom*.tsx` |
| `match_calendar_memory()` Postgres function (pgvector) | 🟡 | W-014 open — SQL function not yet installed in Supabase; semantic search degrades to empty array |
| `SystemAlert` Prisma model + alerting wiring | 🟡 | W-016 — `lib/system-alerts.ts` is console-only |
| **Brain Enrichment Engine (BEE)** — schema/data/knowledge event pipeline across spokes | 🔴 | `docs/03_BRAIN_ENRICHMENT_ENGINE.md` is spec only; phases B1-B7 not yet built |
| **Track L — cluesintelligence Unification (FLAGSHIP)** | 🔴 | ~10 sessions remaining; verdict + persona + what-if endpoints; `CluesIntelligenceProvider` bridge; BEE phase B1-B3; questionnaire-engine fold-in |
| **Track N2 — Mapbox 3D enhancement (fly-to animation)** | 🔴 | Documented in README Tier 1; not built |
| **Track N4 — Generative UI + 3D scenes (Vercel v0, Spline, Cesium, etc.)** | 🟡 | N4-foundations (`ui` fence) shipped; full v0/Spline/Cesium remaining |
| **Phase 3 — data-source orchestration (precedence / provenance / confidence / conflict)** | 🔴 | `03_BRAIN_ENRICHMENT_ENGINE.md § 14a` spec only |

---

## B · LLM + API + endpoint inventory (alphabetical, 87 rows)

| Provider / endpoint | Env var(s) | Status | Notes |
|---|---|---|---|
| **AirNow** (air quality) | `AIRNOW_API_KEY` | 🟡 | Env declared; adapter not yet wired |
| **Anthropic — Claude Opus 4.7** (judge) | `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL_JUDGE=claude-opus-4-7` | ✅ | Cristiano judge brain; `parseLlmJson` consumer |
| **Anthropic — Claude Sonnet 4.6** (primary) | `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL_PRIMARY=claude-sonnet-4-6` | ✅ | Cascade primary; tool-calling enabled via `callLLMWithTools` |
| **BatchData** (real estate) | `BATCHDATA_API_KEY` | 🟡 | Env declared; not yet wired |
| **BioDigital Human** (cardiac viz) | (none yet) | 🔴 | README Tier 2; HEARTBEAT spoke |
| **Braintrust** (eval) | `BRAINTRUST_API_KEY` | 🟡 | Scaffolded; not producing weekly numbers (W-002) |
| **Bridge API** (real estate) | `BRIDGE_API_KEY` | 🟡 | Env declared; not yet wired |
| **Brokerage** (CLUES sister app) | `BROKERAGE_BASE_URL` + `BROKERAGE_INTERNAL_API_KEY` | 🟡 | Env declared; bridge integration pending |
| **Cartesia** (sub-300ms TTS) | (none yet) | 🔴 | README Tier 3 (W-003 voice latency); not yet wired |
| **CesiumJS** (3D globe) | (none — client lib) | 🔴 | README Tier 2 |
| **Cleanlab** (data quality) | `CLEANLAB_API_KEY` | 🟡 | Scaffolded only |
| **CLUES Intelligence** (sister app) | `CLUES_INTELLIGENCE_API_KEY` + `CLUES_INTELLIGENCE_BASE_URL` | 🟡 | Env declared; Track L not yet built |
| **CLUES Lifescore** (sister app) | `CLUES_LIFESCORE_INTERNAL_API_KEY` + `CLUES_LIFESCORE_BASE_URL` | 🟡 | Env declared; gateway publisher backport pending |
| **CLUES London (LTM) — internal `/api/internal/olivia/*`** | `CLUES_LONDON_INTERNAL_API_KEY` + custom `x-olivia-signature` | ✅ | Used by calendar adapter |
| **CLUES London (LTM) — public `/api/v1/*`** | `CLUES_LONDON_V1_API_KEY` (Bearer) | ✅ | Used by `LtmKnowledgeProvider` |
| **Clerk** (auth) | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | ✅ | Track F S18; presence-gated |
| **Cohere** (embeddings / RAG) | `COHERE_API_KEY` | 🟡 | Env declared; not yet wired |
| **Companies House** (UK registry) | `COMPANIES_HOUSE_API_KEY` | ✅ | `src/lib/companies-house/*` (rate-limit retry); cascade provider |
| **Composio** (tool dispatch) | `COMPOSIO_API_KEY` | ✅ | 7 read-only integrations wired |
| **Crimeometer** (relocation) | `CRIMEOMETER_API_KEY` | 🟡 | Env declared; not yet wired |
| **Cytoscape.js** (knowledge graph) | (client lib) | 🔴 | README Tier 2 |
| **D-ID** (avatar fallback) | `DID_API_KEY` | ✅ | Adapter at `src/lib/avatar/*` |
| **Deck.gl** (geo overlays) | (client lib) | 🔴 | README Tier 2 |
| **Deepgram** (STT primary) | `DEEPGRAM_API_KEY` | ✅ | `/api/voice/transcribe` |
| **ElevenLabs** (TTS) | `ELEVENLABS_API_KEY` + 5 voice IDs (Olivia/Cristiano/Emelia × 2 variants) | ✅ | LiveAvatar LITE PCM path + `/api/voice/synthesize` |
| **fal.ai** (fast image/video) | (none yet) | 🔴 | README Tier 3 |
| **Firecrawl** (scraping for RAG) | `FIRECRAWL_API_KEY` | 🟡 | Env declared; not yet wired |
| **Gamma** (presentations) | `GAMMA_API_KEY` | ✅ | Paid Pro tier; route at `/api/analysis/[runId]/presentation` |
| **Gateway tokens — clueslondon / cluesintelligence / cluesxscore / heart-recovery / lifescore / LTM / property-search / transit** | 8 × `GATEWAY_TOKEN_*` | 🟡 | Env declared; tokens not yet set per `HANDOFF_2026-05-26 § 5` |
| **GitHub** (Composio read-only) | `GITHUB_TOKEN` | ✅ | Composio integration |
| **Google Gemini 3.1 Pro** | `GOOGLE_GENERATIVE_AI_API_KEY` + `GOOGLE_MODEL_PRIMARY=gemini-3.1-pro` | ✅ | Cascade provider; multimodal + long-context |
| **Google Maps JS API** | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (declared in code, not in env.ts schema) | ✅ | `/map` view; 3D Tiles |
| **Google Places** | `GOOGLE_PLACES_API_KEY` | 🟡 | Env declared; not yet wired |
| **Groq Llama 3.3 70B** | `GROQ_API_KEY` + `GROQ_MODEL_PRIMARY=llama-3.3-70b-versatile` | 🟡 | Env declared; not in default cascade fan-out |
| **HeyGen** (async video gen) | `HEYGEN_API_KEY` + 4 avatar/voice IDs | ✅ | Legacy Cristiano analysis path (LTM); same vendor account as LiveAvatar |
| **HouseCanary** (real estate) | `HOUSECANARY_API_KEY` + `HOUSECANARY_API_SECRET` | 🟡 | Env declared; not yet wired |
| **HowLoud** (environmental) | `HOWLOUD_API_KEY` | 🟡 | Env declared; not yet wired |
| **HubSpot** (CRM) | `HUBSPOT_ACCESS_TOKEN` | ✅ | `src/lib/hubspot/*` |
| **Inngest** (durable execution) | (none — embedded SDK) | ✅ | `/api/inngest` serve endpoint |
| **Instantly** (email warmup) | `INSTANTLY_API_KEY` | ✅ | `src/lib/instantly/*` |
| **Invideo** (script→video) | (none yet) | 🔴 | Mentioned in MCP server list; not wired |
| **Jina** (RAG embeddings) | `JINA_API_KEY` | 🟡 | Env declared; not yet wired |
| **Krea Realtime** (live AI image gen) | (none yet) | 🔴 | README Tier 3 |
| **Langfuse** (LLM observability) | `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` + `LANGFUSE_BASE_URL` | ✅ | `src/lib/observability/*` |
| **LinkedIn** (Composio read-only) | `LINKEDIN_API_KEY` | ✅ | Composio integration |
| **LiveAvatar** (HeyGen LITE realtime) | `LIVEAVATAR_API_KEY` + 2 avatar IDs | ✅ | Persona-aware pipeline 2026-05-24; same account as HeyGen |
| **LiveKit** (WebRTC) | `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` | ✅ | LiveAvatar transport + realtime |
| **Luma Dream Machine** (video) | (none yet) | 🔴 | README Tier 3 |
| **Mapbox GL JS** | `NEXT_PUBLIC_MAPBOX_TOKEN` (declared in code, not env.ts schema) | ✅ | `/map` + `map` manifest |
| **Mapillary** (street imagery) | (none yet) | 🔴 | README Tier 2 |
| **Mem0** (external memory) | `MEM0_API_KEY` | ✅ | One of 6 memory layers |
| **Mermaid.js** (diagrams) | (none — client lib) | 🔴 | README Tier 1 — `mermaid` fence reserved in MarkdownReply but renderer not built |
| **Mistral Large** | `MISTRAL_API_KEY` + `MISTRAL_MODEL_PRIMARY=mistral-large-latest` | ✅ | Cascade provider; multilingual |
| **MLS RESO** (real estate) | `MLS_RESO_BASE_URL` + `MLS_RESO_BEARER_TOKEN` + `MLS_RESO_API_KEY` | 🟡 | Env declared; not yet wired |
| **Numbeo / Mercer** (relocation cost) | (none yet) | 🔴 | Spoke-router cites these as authoritative; not yet wired |
| **Nylas** (email API) | `NYLAS_API_KEY` | ✅ | `src/lib/nylas/*` |
| **OpenAI Embeddings** | `OPENAI_API_KEY` (shared) | ✅ | `src/lib/video/embeddings.ts` (transcript chunking) |
| **OpenAI GPT-4o** | `OPENAI_API_KEY` + `OPENAI_MODEL_PRIMARY=gpt-4o` | ✅ | Cascade provider; tool-calling via Responses API |
| **OpenAI o1 / Reasoning** | `OPENAI_MODEL_REASONING=gpt-5.4-pro` (default) | 🟡 | Default points at unreleased model name; live key unverified |
| **OpenAI Realtime API** (sub-300ms voice) | `OPENAI_API_KEY` (shared) | 🔴 | README Tier 3; not wired |
| **OpenAI TTS-1-HD** | `OPENAI_API_KEY` + `OPENAI_TTS_MODEL=tts-1-hd` + `OPENAI_TTS_VOICE=nova` | ✅ | Fallback TTS |
| **OpenAI Whisper** (STT fallback) | `OPENAI_API_KEY` + `OPENAI_WHISPER_MODEL=whisper-1` | ✅ | `/api/voice/transcribe` fallback |
| **OpenAQ** (air quality) | (none yet) | 🔴 | LTM-wired only |
| **Open Exchange Rates** | `OPEN_EXCHANGE_RATES_APP_ID` | 🟡 | Env declared; not yet wired |
| **OpenWeatherMap** | `OPENWEATHERMAP_API_KEY` | 🟡 | Env declared; not yet wired |
| **Patronus** (eval / red-team) | `PATRONUS_API_KEY` | 🟡 | Scaffolded only — W-002 |
| **Perplexity Sonar Reasoning Pro** | `PERPLEXITY_API_KEY` + `PERPLEXITY_MODEL_PRIMARY=sonar-reasoning-pro` | ✅ | Cascade provider; search baked in |
| **Plotly.js** (financial charts) | (client lib) | 🔴 | README Tier 2 |
| **Plunk** (real estate) | `PLUNK_API_KEY` | 🟡 | Env declared; not yet wired |
| **PropertyRadar** (real estate) | `PROPERTYRADAR_API_TOKEN` | 🟡 | Env declared; not yet wired |
| **QuickBooks** (Composio read-only) | `QUICKBOOKS_API_KEY` | ✅ | Composio integration |
| **Recharts** (charts) | (no key — bundled lib) | ✅ | Now lazy-loaded (FIX-3) |
| **Regrid** (parcels) | `REGRID_API_KEY` | 🟡 | Env declared; not yet wired |
| **Rentcast** (rent estimates) | `RENTCAST_API_KEY` | 🟡 | Env declared; not yet wired |
| **Replicate** (SadTalker / image gen) | `REPLICATE_API_TOKEN` | ✅ | Avatar adapter + image gen |
| **Resend** (email) | `RESEND_API_KEY` | ✅ | `src/lib/resend/*` |
| **Retell** (voice transport) | `RETELL_API_KEY` | ✅ | Realtime transport |
| **Runway Gen-4** (video) | (none yet) | 🔴 | README Tier 3 |
| **SchoolDigger** (relocation) | `SCHOOLDIGGER_API_KEY` + `SCHOOLDIGGER_APP_ID` | 🟡 | Env declared; not yet wired |
| **Simli** (avatar) | `SIMLI_API_KEY` | ✅ | Avatar adapter |
| **Sketchfab** (3D models) | (none yet) | 🔴 | README Tier 2 |
| **Spline** (3D hero) | (client lib) | 🔴 | README Tier 2 |
| **Stay or Sell** (CLUES sister app) | `STAY_OR_SELL_API_KEY` + `STAY_OR_SELL_BASE_URL` | 🟡 | Env declared; not yet wired |
| **Stripe** (Composio read-only) | `STRIPE_API_KEY` | ✅ | Composio integration |
| **Supabase** (DB + auth + RPC) | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Prisma + pgvector RPC pending (W-014) |
| **Tavily** (web search) | `TAVILY_API_KEY` | ✅ | Cascade Phase 2; `/api/search` |
| **Tavus** (avatar candidate) | `TAVUS_API_KEY` | 🟡 | O5c-S1 adapter shipped; O5d REJECTED phoneme claim; full lift deferred |
| **Temporal** (crash-proof workflows) | `TEMPORAL_ADDRESS` + `TEMPORAL_NAMESPACE` | 🟡 | Env declared; not yet wired |
| **Three.js** (3D) | (no key — bundled lib) | ✅ | Via `@react-three/fiber` in valuation/CompanyIntelligenceNexus |
| **tldraw + tldraw-ai** (live whiteboard) | (none yet) | 🔴 | README Tier 1 |
| **Travel Buddy** (relocation) | `TRAVEL_BUDDY_API_KEY` | 🟡 | Env declared; not yet wired |
| **Tremor** (data viz) | (no key — bundled lib) | 🔴 | README Tier 1; not yet installed |
| **Trigger.dev** (durable execution) | `TRIGGER_SECRET_KEY` + `TRIGGER_API_URL` | ✅ | Co-exists with Inngest |
| **Twilio** (SMS / WhatsApp / voice) | `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_API_KEY` + `TWILIO_API_SECRET` + `TWILIO_PHONE_NUMBER` + `TWILIO_MESSAGING_SERVICE_SID` + 3 callback URLs | ✅ | Full telephony surface |
| **Unstructured** (RAG parsing) | `UNSTRUCTURED_API_KEY` | 🟡 | Env declared; not yet wired |
| **Vapi** (voice transport) | `VAPI_API_KEY` | ✅ | Realtime transport |
| **Vercel v0** (generative React) | (none yet) | 🔴 | README Tier 1; Track N4 |
| **Vis-timeline** (timelines) | (client lib) | 🔴 | README Tier 2 |
| **WalkScore** (relocation) | `WALKSCORE_API_KEY` | 🟡 | Env declared; not yet wired |
| **xAI Grok 4** | `XAI_API_KEY` + `XAI_MODEL_PRIMARY=grok-4` | ✅ | Cascade provider; math/X-search specialist |
| **Xero** (Composio read-only) | `XERO_API_KEY` | ✅ | Composio integration |

---

## C · Cross-reference (feature → APIs/LLMs it consumes)

| Feature | LLMs | APIs / vendors |
|---|---|---|
| Acquisition Mirror | Anthropic Sonnet · Opus | Supabase |
| Admin dashboard | (none) | Supabase, Langfuse (traces panel) |
| Agentic learning / 250-agent registry | All 8 cascade LLMs | Supabase, Langfuse |
| Bridge / Universal Knowledge Protocol | (none — data layer) | CLUES London v1, Supabase |
| Calendar engine | Anthropic Sonnet (NLP entry parse), Gemini (multimodal) | Twilio (call reminders), Resend (email reminders), Google Calendar OAuth, Outlook OAuth, Calendly, Supabase, **`match_calendar_memory()` pgvector RPC ⚠ W-014** |
| Cascade orchestration (9-model) | Anthropic Sonnet + Opus, OpenAI GPT-4o, Gemini, Grok, Perplexity, Mistral, Tavily, Companies House | Langfuse |
| Cascade trace dashboard | (none) | Supabase |
| Chart manifest fence | (none — client render) | Recharts |
| Citation-first RAG / sources fence | Tavily, Perplexity | (consumes cascade output) |
| Clerk authentication | (none) | Clerk |
| CLUES domain intelligence (embedded) 🟡 | Gemini (paragraphical extraction), Anthropic Sonnet (scoring) | Supabase |
| Comparison manifest fence | (none — client render) | (none) |
| Compliance + guardrails | (none — heuristics + regex) | (none) |
| Composio tool dispatch | (model-routed via cascade) | Composio, Stripe, GitHub, LinkedIn, QuickBooks, Xero, Companies House |
| Conversation persistence + multi-turn | (none — storage) | Supabase |
| Cristiano™ Ask sub-tab | Anthropic Opus 4.7 | Supabase |
| Cristiano™ Verdict Library | (none — read-only) | Supabase |
| Cristiano™ Gateway Inbox | (none — pull from gateway pushes) | 8 gateway tokens (LTM, lifescore, etc.) |
| Cristiano™ cinematic verdict (Studio) | Anthropic Opus 4.7 | LiveAvatar + ElevenLabs (Cristiano voice) |
| Cristiano™ judge endpoint | Anthropic Opus 4.7 | Supabase, Langfuse |
| Daily / weekly briefs | Anthropic Sonnet (narrative) | Resend, Twilio (SMS), Supabase |
| Deal Protection (P1-P7) | Anthropic Sonnet (analyze) + Opus (judge for critical) | Supabase, Langfuse |
| Deal Room | Anthropic Sonnet | Supabase |
| Documents + Packages + Sharing | (none for core CRUD) | Supabase, Resend (share notifications) |
| Documents heavy app routes 🟡 | (deferred) | (deferred) |
| Durable execution | (none) | Inngest, Trigger.dev, Temporal (planned) |
| Email — HubSpot | (none — direct CRM) | HubSpot |
| Email — Instantly | (none) | Instantly |
| Email — Nylas | (none) | Nylas |
| Email — Resend | (none) | Resend |
| Emelia™ persona | OpenAI GPT-4o (planned) | ElevenLabs (Emelia voice `H3Q2a7I32K2D9dOOWwV0`) |
| Equity Waterfall | (none — math only) | Supabase |
| Founder Intake — Quantara (Q1-Q7) | Anthropic Sonnet (extraction + personas) | Companies House (Q3 auto-fill), Stripe / GitHub (Q3), Deepgram + Whisper (Q7 voice), ElevenLabs (Q7 voice playback), Supabase |
| Gamma deck preview fence | (none — embed) | Gamma |
| Gamma presentation generation | Anthropic Sonnet + Opus (deck planning) | Gamma |
| Gateway push (cross-app) | (none — bearer auth) | 8 gateway tokens |
| GDPR / consent | (none) | Supabase |
| Generative UI fence | (none — registry render) | (none) |
| Home page composition | Anthropic Sonnet (chat) | Supabase (dashboard aggregator) |
| Inspector tabs (Olivia / Library / Audit / Artifacts / Cristiano embed) | Cascade for chat tab | Supabase, Langfuse |
| Keyboard shortcuts overlay | (none) | (none) |
| LangGraph cascade wrap | (cascade-routed) | Langfuse (span emission) |
| LiveAvatar (Olivia + Cristiano) | (no LLM in path — speaks pre-rendered text) | LiveAvatar (HeyGen LITE), LiveKit (WebRTC), ElevenLabs (PCM 24kHz) |
| London Tech Map view | (none) | Mapbox GL JS, Google Maps JS, Google Maps 3D Tiles, LTM `/api/v1/*` (district + org data) |
| LTM bridge | (none — data layer) | CLUES London v1 (Bearer), CLUES London internal (`x-olivia-signature`) |
| Map manifest fence | (none) | Mapbox GL JS |
| Markdown reply pipeline | (none — pure render) | (none) |
| Memory — 6-layer stack | Cohere / Jina (planned for embeddings) | Mem0, Supabase pgvector, OpenAI embeddings |
| Multi-tenant + white-label | (none) | Supabase, per-tenant model + adapter overrides |
| Observability | (none) | Langfuse, OTel |
| Olivia™ persona | Cascade (Sonnet primary) | ElevenLabs (Olivia voice `rVk0ZvRulp6xrYJkGztP`) |
| Pitch coaching surface | Anthropic Sonnet (4 helpers) + Tavily (pre-search) | Supabase |
| Pitch deck + business plan studio | Anthropic Sonnet | Supabase, Gamma (export path) |
| Realtime transport | (none) | LiveKit, Vapi, Retell, Twilio |
| Reply-renderer barrel | (none — pure render) | Recharts (chart fence), Mapbox GL JS (map fence), Gamma (gamma fence) |
| Reports — branded PDF/PPTX | Cascade (narrative) | (none — generation in-process) |
| SMART Score (per-app) | (none — pure math) | (none) |
| Spoke router | (none — regex) | (none) |
| Streaming chat | Cascade with `streamText` | Supabase (persistence) |
| Studio (PreparationStudio + WarRoom) 🟡 | Anthropic Sonnet + Opus | LiveAvatar + ElevenLabs (Cristiano cinematic) |
| Telephony — SMS / WhatsApp / voice | Cascade (call response synthesis) | Twilio, Deepgram (STT), ElevenLabs (TTS) |
| Tenant config + adaptive surface suppression | (none) | Supabase |
| Timeline manifest fence | (none — client render) | (none) |
| Tools page (`/admin/tools`) | (none) | Supabase |
| Valuation engine (10-method) | Sonnet + Opus (14 specialist agents) | Companies House, Supabase, Langfuse |
| Verdict library 🟡 | (read-only after judge writes) | Supabase + **migration 15 owed** |
| Vertical adapters | Cascade (prompt-routed) + provider hints (Perplexity for HealthTech, Tavily for PropTech) | (none new) |
| Voice mode (`/voice`) | Cascade (chat) | Deepgram + Whisper (STT), ElevenLabs + OpenAI TTS-1-HD, Supabase |
| Voice presentation route | Sonnet + Opus | Gamma, Deepgram, Whisper, ElevenLabs |
| War Room | Sonnet + Opus | LiveAvatar (Cristiano) + ElevenLabs, Supabase |
| `match_calendar_memory()` RPC 🟡 | (none — Postgres function) | Supabase pgvector — **W-014 not installed** |
| `SystemAlert` model + alerting 🟡 | (none) | Resend (planned), Twilio (planned) |
| **Brain Enrichment Engine (BEE)** 🔴 | (cascade for knowledge events) | Inngest + Trigger.dev (outbound deliveries) |
| **Track L cluesintelligence Unification** 🔴 | Gemini 3.1 (extraction), Sonnet (eval), Opus (verdict), Perplexity (research), Tavily | Supabase + CLUES Intelligence + clues-questionnaire-engine repo |
| **Track N2 — Mapbox 3D fly-to** 🔴 | (none) | Mapbox GL JS + Google Maps 3D Tiles |
| **Track N4 — Generative UI + 3D scenes (full)** 🟡 | Cascade | Vercel v0, Spline, CesiumJS, Sketchfab, BioDigital Human, tldraw |
| **Phase 3 — data-source orchestration** 🔴 | Cascade (tie-breaking) | All 15+ external vendors (precedence/provenance/confidence/conflict) |

---

## D · Bottom-line gap summary (what's "fully feeding her brain" vs not)

**Fully wired + active (✅ × 60+ features, ✅ × ~40 APIs):** the
9-model cascade, all 8 LLM providers, all 7 reply-renderer fences,
calendar + valuation + deal-protection + pitch + Quantara +
Cristiano + LiveAvatar + voice + telephony + multi-tenant + memory
+ Composio tool dispatch + LTM bridge + Olivia persona stack +
admin dashboard.

**Partial (🟡 × ~20):** Tavus (avatar candidate), Patronus /
Braintrust / Cleanlab (eval), Temporal, Cartesia (sub-300ms TTS
unreached), CLUES sister-app bridges (Intelligence + Lifescore +
Stay-or-Sell + Brokerage), CLUES domain intelligence engine,
Cristiano multi-surface mount, 18 of the Sprint 3.3-3.6 data APIs
(real estate + relocation + environmental + RAG) have env vars
declared but no adapter wiring, 8 gateway tokens declared but unset,
Studio polish (W-013), `match_calendar_memory()` (W-014),
`SystemAlert` (W-016), verdict captions migration 15.

**Missing (🔴 × ~15):** Brain Enrichment Engine phases B1-B7, Track
L cluesintelligence Unification (FLAGSHIP), Phase 3 data-source
orchestration (precedence/provenance/confidence/conflict), Mermaid
renderer, full Track N4 (Vercel v0 / Spline / Cesium / Sketchfab /
BioDigital / tldraw / Plotly / Vis-timeline / Cytoscape / Deck.gl),
fal.ai + Runway + Luma + Krea (generative video), OpenAI Realtime
API, Mapillary + Numbeo + Mercer + OpenAQ.

---

## E · Attestation

Held to Apple / IBM / Microsoft / Google 2026 leading coding
practices per `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md`
section 10.4. 100% no breaking changes (additive documentation
file only — zero production code touched). 100% no partial coding
(every row cite-able to either an env-var declaration, a `src/lib/`
path, or an explicit roadmap entry; no row left as TODO).

**Verification posture:** built from `FEATURE_INVENTORY.md` (stale
2026-05-09 — supplemented for Track V / Cristiano / Track G/H/B),
`env.ts` (current), `agents/llm.ts`, `README.md` Visual
Manifestation Stack, and the recent HANDOFFs. NOT a byte-level
audit of every "shipped" claim — sample-verified, source-cited.
Specific rows can be confirmed against `git grep` on demand.
