# OLIVIA BRAIN - BATTLE PLAN

> **Last Updated:** 2026-04-09
> **Current Phase:** Phase 3 Domain Intelligence (Sprint 3.1 IN PROGRESS)
> **Total Features:** 173 identified, 79 implemented (~46% complete)

---

## GOVERNING PRINCIPLE

**The avatar is the face, not the brain.**

Olivia's intelligence lives in the orchestration layer and model cascade, not inside any avatar vendor. Avatar providers remain presentation surfaces that can be swapped without changing the core intelligence system.

---

## 9-MODEL CASCADE ARCHITECTURE

**ACTUAL FIRING ORDER:**
1. **Gemini 3.1 Pro** - Biographical/paragraphical extraction, massive context
2. **Claude Sonnet 4.6** - Primary city evaluator, report generation, agentic workflows
3. **GPT-5.4 Pro** - Secondary evaluator, multimodal execution
4. **Gemini 3.1 Pro** - Verification pass with Google Search integration
5. **Grok 4** - Math/equations specialist ONLY
6. **Perplexity Sonar Reasoning Pro** - Module questionnaires + citations, fact verification
7. **Tavily** - Web research MCP, real-time search
8. **Claude Opus 4.6 (Cristiano™)** - THE JUDGE - Final verdict (unilateral only)
9. **Mistral Large** - Multilingual reasoning for international clients

---

## PHASE 1: FOUNDATION

### Sprint 1.1 - Core Infrastructure (COMPLETE)
- [x] React + TypeScript app shell with Next.js App Router
- [x] Vercel deployment configuration
- [x] LangGraph 5-node orchestration workflow
- [x] 6-provider model cascade (Anthropic, OpenAI, Google, xAI, Perplexity, Mistral)
- [x] Supabase memory layer with pgvector-ready schema
- [x] In-memory fallback for development
- [x] Intent classification (planning, research, operations, general)
- [x] Admin integrations dashboard
- [x] Health & status API endpoints
- [x] Trace recording with local store
- [x] London Calendar adapter client (10 endpoints)
- [x] Twilio voice webhook (basic)
- [x] HubSpot, Resend, Instantly adapters (read operations)

### Sprint 1.2 - Model Cascade Enhancement (COMPLETE)
- [x] Update model names to correct versions (Sonnet 4.6, Opus 4.6, GPT-5.4, Gemini 3.1 Pro)
- [x] Add Tavily as provider
- [x] Add Opus 4.6 as Judge model (Cristiano™)
- [x] Implement 9-model cascade firing order
- [x] Add new intents: questionnaire, math, judge
- [x] Add Tavily search integration (web research MCP) - `/api/search`
- [x] Implement judge endpoint for Cristiano™ verdicts - `/api/judge`
- [x] Add Groq for LPU inference (near-instant responses)

### Sprint 1.3 - Memory & Personalization (COMPLETE)
- [x] Apply Supabase migrations to production
- [x] Connect Mem0 for cross-session personalization
- [x] Implement knowledge_chunks table population
- [x] Add semantic search over conversation history
- [x] Implement Memory TTL / forgetting rules
- [x] Add permission-aware indexing (Client A ≠ Client B)

### Sprint 1.4 - Tool Integration (COMPLETE)
- [x] Add Composio for 200+ pre-built tool integrations
- [x] Implement approval-gated LangGraph tools
- [x] Add HITL confidence gates
- [x] Connect Nylas for unified inbox/calendar
- [x] Production email sends via Resend
- [x] Outbound sequences via Instantly.ai

### Sprint 1.5 - Observability & Compliance (COMPLETE)
- [x] Full Langfuse tracing integration
- [x] Ragas RAG accuracy scoring
- [x] Add Presidio PII detection/redaction
- [x] Implement Fair Housing validators
- [x] Add NeMo Guardrails for hallucination prevention
- [x] Redact Before Logging implementation

---

## PHASE 2: VOICE & AVATAR

### Sprint 2.1 - Voice Synthesis (COMPLETE)
- [x] ElevenLabs integration for persona voices
  - [x] Olivia™ voice profile
  - [x] Cristiano™ voice profile
  - [x] Emelia™ voice profile
- [x] OpenAI TTS fallback
- [x] Deepgram STT integration (sub-200ms latency)
- [x] Whisper multilingual transcription

### Sprint 2.2 - Avatar Layer (COMPLETE)
- [x] Simli integration (primary Olivia™ avatar)
- [x] Replicate SadTalker for Cristiano™ Judge presentations
- [x] HeyGen fallback avatar
- [x] D-ID interactive avatar fallback
- [x] Avatar Identity Bible implementation
- [x] Emotion/Gesture State Policy

### Sprint 2.3 - Realtime Transport (COMPLETE)
- [x] LiveKit WebRTC integration for browser sessions
- [x] Twilio ConversationRelay for AI calls
- [x] Vapi for inbound phone AI agents
- [x] Retell AI for outbound voice agents
- [x] Voice-Only Fallback Mode
- [x] Pipeline: STT → LLM → TTS → Avatar (sub-800ms TTFB target)

### Sprint 2.4 - Telephony Completion (COMPLETE)
- [x] Full Twilio SMS integration
- [x] Twilio SIP trunk
- [x] Call recording with consent flows
- [x] Status callbacks implementation
- [x] Barge-In Handling (interruption as first-class design)
- [x] Turn-Taking Policy (natural silence handling)

---

## PHASE 3: DOMAIN INTELLIGENCE

### Sprint 3.1 - CLUES Questionnaire Engine
- [x] Clone CLUES intelligence into Olivia Brain (standalone operation)
- [x] 30-paragraph Paragraphical system (user writes biographical text)
- [x] Gemini extraction architecture (100-250 metrics from paragraphs)
- [x] 200-question Main Module structure:
  - [x] Demographics (34Q) - main_module.ts Q1-Q34
  - [x] Do Not Wants / Dealbreakers (33Q) - main_module.ts Q35-Q67
  - [x] Must Haves / Non-Negotiables (33Q) - main_module.ts Q68-Q100
  - [x] Trade-offs (50Q) - tradeoff_questions.ts
  - [x] General Questions (50Q) - general_questions.ts
- [x] 23 topic-specific specialty modules (~100Q each, ~2,300 total)
- [x] Adaptive Engine (CAT) - pure math question selection
- [x] Module Relevance Engine - pure math module recommendation
- [x] Target: MOE ≤ 2% (150-587 questions per user, varies)
- [ ] Universal Knowledge Protocol (UKP) provider implementation
- [ ] Connect embedded knowledge to Olivia orchestration layer
- [ ] Build Gemini extraction service (call existing prompts)

### Sprint 3.2 - SMART Score™ Engine
- [ ] 5-category weighted algorithm implementation
- [ ] City scoring calculation
- [ ] LifeScore metrics integration
- [ ] Comparison output generation
- [ ] Cristiano™ verdict integration

### Sprint 3.3 - Real Estate Data Layer
- [ ] MLS Data Feeds integration (RETS/WebAPI)
- [ ] Zillow / Bridge API connection
- [ ] HouseCanary AVMs + investment analytics
- [ ] BatchData API for property records
- [ ] PropertyRadar owner data + targeting
- [ ] Plunk AI property valuation
- [ ] Rentcast rental estimates
- [ ] Regrid / LandGrid parcel data

### Sprint 3.4 - Relocation Data Layer
- [ ] Numbeo API (cost-of-living)
- [ ] Teleport API (quality of life)
- [ ] WalkScore API (transit + walkability)
- [ ] GreatSchools API (education)
- [ ] Google Places API (local amenities)
- [ ] Visadb.io (visa requirements)
- [ ] OANDA API (currency exchange)
- [ ] SpotCrime (neighborhood safety)
- [ ] ClimateCheck (climate risk)

### Sprint 3.5 - Environmental Data Layer
- [ ] NOAA API (storms, tornado risk, sea levels)
- [ ] FEMA Flood Data (flood zones, disaster data)
- [ ] AirNow API (air quality)
- [ ] HowLoud API (noise pollution)
- [ ] OpenWeatherMap (real-time weather)

### Sprint 3.6 - RAG Pipeline
- [ ] Firecrawl web crawling + structured extraction
- [ ] Unstructured ETL for PDFs, Word, HTML
- [ ] Cohere Rerank for precision boost
- [ ] Jina AI Reader (URL-to-clean-text)
- [ ] Citation-First RAG implementation
- [ ] Graph-RAG with knowledge graph

### Sprint 3.7 - Report Generation
- [ ] Gamma integration ("The Cadillac")
- [ ] 50+ page branded PDF/PPTX reports
- [ ] Client Relocation Report Generator (100 pages)
- [ ] Per-Market FAQ Generation
- [ ] Meeting Prep Packet Generator

---

## PHASE 4: MULTI-AGENT BEAST MODE

### Sprint 4.1 - Persona System
- [ ] **Olivia™** - Client-facing avatar executive
  - [ ] All bilateral communication
  - [ ] "Ask Olivia" everywhere
  - [ ] Simli + D-ID/HeyGen + ElevenLabs + GPT-5.4 brain
- [ ] **Cristiano™** - Universal Judge
  - [ ] UNILATERAL ONLY (no interaction)
  - [ ] Final verdicts on city match, financial packages, LifeScore
  - [ ] Replicate SadTalker + ElevenLabs + Opus 4.6 brain
  - [ ] James Bond aesthetic
- [ ] **Emelia™** - Back-end support beast
  - [ ] NO VIDEO (voice + text only)
  - [ ] Customer service, tech support
  - [ ] Full architecture knowledge
  - [ ] GPT brain + ElevenLabs

### Sprint 4.2 - 250-Agent Dashboard System
- [ ] Admin dashboard for agent management
- [ ] Multi-LLM agent configuration
- [ ] Multi-variable select specialty agents
- [ ] Per-agent prompt configuration
- [ ] Per-agent domain assignment
- [ ] Agent types:
  - [ ] Property Search agents
  - [ ] Immigration agents
  - [ ] Negotiation agents
  - [ ] Email Drafter agents
  - [ ] Document Chaser agents
  - [ ] Domain-specific agents (20+ per domain)

### Sprint 4.3 - Advanced Memory
- [ ] Zep / Graphiti knowledge graph
- [ ] Episodic memory layer
- [ ] Semantic memory layer
- [ ] Procedural memory layer
- [ ] Event-Sourced Conversation Ledger
- [ ] Snapshot-Resume State (journeys persist weeks/months)

### Sprint 4.4 - Durable Execution
- [ ] Trigger.dev for long-running jobs
- [ ] Temporal for crash-proof workflows
- [ ] Inngest event-driven functions (Vercel-native)
- [ ] Upstash QStash serverless queue
- [ ] Action Budgets (prevent expensive loops)

### Sprint 4.5 - Evaluation & Observability
- [ ] Red-Team Eval Harness
- [ ] Conversation QA Scorecards
- [ ] Weekly Model Bake-Off system
- [ ] Braintrust evals + prompt playground
- [ ] Patronus AI hallucination detection
- [ ] Cleanlab data quality scoring
- [ ] A/B Test Avatar Personalities

### Sprint 4.6 - CLUES Product Integration
- [ ] CLUES Intelligence LTD adapter (UK flagship)
- [ ] CLUES London Tech Map integration
- [ ] CLUES LifeScore (clueslifescore.com)
- [ ] 20 LifeScore Module Apps
- [ ] CLUES-TES™ (Transit Environmental Systems)
- [ ] HEARTBEAT™ (cardiac recovery)
- [ ] Stay or Sell™ Advisor (FL coastal)
- [ ] Tampa Bay Brokerage Stack
- [ ] Predictive Analytics Engine
- [ ] CORPUS™ Document Suite (84-doc DNA Engine)

---

## PHASE 5: MULTI-TENANT & WHITE-LABEL

### Sprint 5.1 - Tenant Architecture
- [ ] Multi-tenant database schema
- [ ] Tenant isolation
- [ ] Per-tenant adapter selection
- [ ] Per-tenant model routing overrides
- [ ] Per-tenant policy/approval rules

### Sprint 5.2 - White-Label System
- [ ] Branding pack system
- [ ] Custom persona configuration per tenant
- [ ] Custom prompt packs per tenant
- [ ] Entitlements system
- [ ] White-label Olivia deployment

### Sprint 5.3 - Compliance & Security
- [ ] Data Residency Routing (EU servers for EU clients)
- [ ] Call Recording Consent Flows
- [ ] Consent-Based Memory Sync (GDPR)
- [ ] Deterministic Compliance Subflows (Fair Housing, visa, tax)
- [ ] Multi-Market Knowledge Versioning

---

## SUMMARY STATS

| Phase | Sprints | Items | Status |
|-------|---------|-------|--------|
| Phase 1: Foundation | 5 | 42 | Complete |
| Phase 2: Voice & Avatar | 4 | 28 | Complete |
| Phase 3: Domain Intelligence | 7 | 54 | Pending |
| Phase 4: Multi-Agent Beast Mode | 6 | 38 | Pending |
| Phase 5: Multi-Tenant | 3 | 11 | Pending |
| **TOTAL** | **25** | **173** | **~28% Complete** |

---

## ESTIMATED MONTHLY COSTS

**Current:** ~$565+/mo across 101+ applications

**With Olivia™ additions:**
- Mem0, Langfuse, Nylas, Instantly.ai, LiveKit: +$200-400/mo
- Avatar providers (Simli, HeyGen, D-ID): +$100-200/mo
- Additional API usage: +$100-300/mo

**Estimated Total (MVP):** ~$900-1,400/mo

**Deprecating:**
- TypeForm ($35) → Moving in-house
- Zapier ($29) → Moving in-house

---

## QUICK REFERENCE

### Key Files
- `src/lib/services/model-cascade.ts` - 9-model cascade implementation
- `src/lib/orchestration/phase1-graph.ts` - LangGraph workflow
- `src/lib/config/env.ts` - Environment configuration
- `src/lib/foundation/catalog.ts` - Provider & integration catalog
- `src/lib/adapters/london-calendar.ts` - Calendar adapter client
- `src/lib/voice/index.ts` - Unified voice TTS/STT interface
- `src/lib/voice/elevenlabs.ts` - ElevenLabs persona voices
- `src/lib/voice/deepgram.ts` - Deepgram STT (sub-200ms)
- `src/lib/avatar/index.ts` - Unified avatar interface
- `src/lib/avatar/identity.ts` - Avatar Identity Bible (Olivia™, Cristiano™, Emelia™)
- `src/lib/avatar/emotions.ts` - Emotion/Gesture State Policy
- `src/lib/avatar/simli.ts` - Primary Olivia™ avatar
- `src/lib/avatar/sadtalker.ts` - Cristiano™ Judge presentations
- `src/lib/realtime/index.ts` - Unified realtime transport interface
- `src/lib/realtime/pipeline.ts` - STT→LLM→TTS→Avatar pipeline (sub-800ms)
- `src/lib/realtime/livekit.ts` - LiveKit WebRTC integration
- `src/lib/realtime/twilio-relay.ts` - Twilio ConversationRelay
- `docs/final-stack.md` - Target architecture
- `docs/olivia-core-architecture.md` - Multi-app patterns

### Environment Keys Required
See `.env.full.example` for complete list (23+ keys)

### API Endpoints
```
GET  /api/health                    - Foundation status
POST /api/chat                      - Main orchestration
GET  /api/traces                    - Trace history
GET  /api/admin/integrations        - Admin dashboard
POST /api/admin/integrations/test   - Live integration test
POST /api/twilio/voice/inbound      - Twilio voice webhook
POST /api/search                    - Tavily web search
POST /api/judge                     - Cristiano™ verdicts
GET  /api/voice                     - Voice service status
POST /api/voice/synthesize          - Text-to-Speech (ElevenLabs/OpenAI)
POST /api/voice/transcribe          - Speech-to-Text (Deepgram/Whisper)
GET  /api/avatar                    - Avatar service status
POST /api/avatar/generate           - Generate avatar video
POST /api/avatar/session            - Create realtime avatar session
GET  /api/realtime                  - Realtime transport status
POST /api/realtime/session          - Create realtime session
POST /api/realtime/webrtc           - Get WebRTC connection info
```

---

## HOW TO CONTINUE

1. Pick up at the **CURRENT SPRINT** marker above
2. Complete items in order (no cherry-picking)
3. After each item: mark `[x]`, commit + push
4. Run `npm run build` at end of each sprint
5. At 70% token usage: finish item, update this file, commit, warn user
