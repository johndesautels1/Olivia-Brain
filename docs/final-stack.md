# Olivia Brain Final Stack

This document captures the target end-state stack for Olivia Brain after all phases are implemented. It is aligned to the roadmap artifact in `clues-agent-stack-championship (1).html`, with two explicit decisions applied:

- Twilio is the telephony backbone.
- ATTOM is removed from the target real-estate data layer.

## Governing rule

The avatar is the face, not the brain.

Olivia's intelligence must live in the orchestration layer and model cascade, not inside any avatar vendor. Avatar providers remain presentation surfaces that can be swapped without changing the core intelligence system.

---

## 9-Model Cascade Architecture

**ACTUAL FIRING ORDER:**

| Order | Model | Role |
|-------|-------|------|
| ① | **Gemini 3.1 Pro** | Biographical/paragraphical extraction, massive context |
| ② | **Claude Sonnet 4.6** | Primary city evaluator, report generation, agentic workflows |
| ③ | **GPT-5.4 Pro** | Secondary evaluator, multimodal execution |
| ④ | **Gemini 3.1 Pro** | Verification pass with Google Search integration |
| ⑤ | **Grok 4** | Math/equations specialist ONLY |
| ⑥ | **Perplexity Sonar Reasoning Pro** | Module questionnaires + citations, fact verification |
| ⑦ | **Tavily** | Web research MCP, real-time search |
| ⑧ | **Claude Opus 4.6 (Cristiano™)** | THE JUDGE - Final verdict (unilateral only) |
| ⑨ | **Mistral Large** | Multilingual reasoning for international clients |

---

## Final stack

| Layer | Final choice | Notes |
|---|---|---|
| Source control and deploy | GitHub, GitHub Actions, Vercel | GitHub is source of truth. Vercel handles preview and production deploys. |
| Frontend | Next.js App Router, React, TypeScript | One primary web app. Capacitor can wrap it later for native distribution. |
| API and backend runtime | Next.js server routes, Node runtime | Central API surface for orchestration, integrations, and admin actions. |
| Core orchestration | LangGraph, Composio | Stateful workflows, tool invocation, and multi-step routing. |
| LLM control plane | Vercel AI SDK | One abstraction across providers. |
| Primary model layer | **Claude Sonnet 4.6**, **Claude Opus 4.6** judge | Sonnet handles most reasoning. Opus/Cristiano™ remains final judge. |
| Full model cascade | **Gemini 3.1 Pro**, **Sonnet 4.6**, **GPT-5.4 Pro**, **Grok 4**, **Perplexity Sonar Reasoning Pro**, **Mistral Large**, **Tavily** | 9-model cascade with specialized routing based on task class. |
| Durable execution | Trigger.dev, Inngest, Upstash QStash | Long-running report builds, scheduled jobs, large research tasks. |
| Short and medium-term memory | Supabase Postgres, pgvector, Mem0 | Conversation history, semantic recall, personalization. |
| Advanced memory | Zep or Graphiti | Episodic, semantic, procedural, graph-aware memory in later phases. |
| CRM and client ops | HubSpot, Nylas, Resend, Instantly.ai, Clay | CRM authority, inbox/calendar workflows, transactional and outbound email. |
| Telephony backbone | Twilio | Canonical phone numbers, SMS, SIP, routing, status callbacks, fallback control. |
| AI call runtime | Twilio ConversationRelay first, Vapi or Retell only if needed | Twilio stays authoritative. Vapi or Retell are optional acceleration layers, not the brain. |
| Browser realtime | LiveKit | Browser-based realtime voice/video sessions. |
| Premium voice | ElevenLabs, OpenAI TTS fallback | Persona voice synthesis and fallback speech generation. |
| Avatar layer | **Simli** primary (Olivia™), **Replicate SadTalker** (Cristiano™), HeyGen and D-ID fallback | Olivia/Cristiano/Emelia presentation layer only. |
| RAG and ingestion | Firecrawl, Unstructured, Cohere Rerank, Jina AI Reader, citation-first retrieval | Evidence-grounded retrieval and document processing. |
| Real-estate data | MLS feeds, Zillow, HouseCanary, BatchData, PropertyRadar, Plunk, Rentcast, Regrid | ATTOM removed. Prefer cleaner or more controllable feeds. |
| Relocation data | Numbeo, Teleport, WalkScore, GreatSchools, Visadb.io, InterNations, Expatistan, Wise API | Relocation and quality-of-life data layer. |
| Environmental data | NOAA, FEMA, AirNow, HowLoud, OpenWeatherMap, ClimateCheck | Climate, flood, air, noise, weather signals. |
| Reports and deliverables | **Gamma** ("The Cadillac") | Branded long-form 50+ page reports and presentation output. |
| Observability and eval | Langfuse, Ragas, Braintrust, Patronus AI, Cleanlab, red-team harness, QA scorecards, model bake-offs | Tracing, RAG quality, hallucination detection, regression checking. |
| Compliance and safety | Fair Housing validators, NeMo Guardrails, Presidio, Guardrails AI | Safety, policy guardrails, PII handling. |
| Human approval | HITL confidence gates and approval queues | Required for high-liability actions. |
| Persona system | **Olivia™** (client-facing), **Cristiano™** (judge), **Emelia™** (back-end support) | See persona specifications below. |

---

## Persona System Specifications

### Olivia™ - Client-Facing Avatar Executive
- **Role:** All bilateral client communication. "Ask Olivia" everywhere.
- **Tech Stack:** Simli (primary) + D-ID/HeyGen (fallback) + ElevenLabs voice + GPT-5.4 brain
- **Personality:** Beautiful, multicultural, lives in London. Warm, professional, decisive.

### Cristiano™ - Universal Judge
- **Role:** UNILATERAL ONLY — no interaction. Final word on financial packages, city match, LifeScore verdicts.
- **Tech Stack:** Replicate SadTalker + D-ID/HeyGen (fallback) + ElevenLabs voice + **Claude Opus 4.6** brain
- **Personality:** James Bond aesthetic. Authoritative, decisive, final.

### Emelia™ - Back-End Support Beast
- **Role:** NO VIDEO — voice + text only. Customer service, tech support, full architecture knowledge.
- **Tech Stack:** GPT brain + ElevenLabs voice + Manual knowledge base
- **Personality:** Filipina/British/American, Princeton MSE. Technical, helpful, thorough.

---

## 250-Agent Dashboard System

Multi-LLM, multi-variable select specialty agents via admin dashboard:
- Each agent configurable by model, prompt, variables, and domain
- Agent types: Property Search, Immigration, Negotiation, Email Drafter, Document Chaser, domain-specific
- Powers specific app tools and Olivia™ brain

---

## CLUES-Specific Systems

| System | Description |
|--------|-------------|
| **CLUES Questionnaire Engine** | 2,500 questions → 37-38 paragraphical Gemini extraction → 200-question main module → 23 topic-specific modules. Bayesian paired-reasoning funnel (MCAT-style). Target: <2% margin of error. |
| **SMART Score™ Engine** | Proprietary 5-category weighted algorithm |
| **CORPUS™ Document Suite** | 84-doc Company DNA Engine + funder match |
| **CLUES Intelligence LTD** | UK flagship. International Buyer Relocation Engine. |
| **CLUES LifeScore** | 100 freedom metrics, 200 metros. Cristiano™ as judge/summarizer. |
| **London Tech Map** | Multi-modal tech ecosystem tool. Mind-to-market in London. |
| **CLUES-TES™** | London Transit Environmental Systems platform |
| **HEARTBEAT™** | Mammoth heart health app. Cardiac recovery tracking. |
| **Stay or Sell™** | Florida coastal property decision engine |
| **Tampa Bay Brokerage** | John E. Desautels & Associates - 35+ years licensed |

## Data-layer note

ATTOM is intentionally removed. The preferred target is:

- MLS feeds where permitted
- Zillow where appropriate
- HouseCanary for valuation and market signals
- BatchData for enrichment

If an additional national property data provider is needed later, it should be evaluated fresh rather than restoring ATTOM by default.

## Telephony note

Twilio remains the canonical telephony system because it gives the strongest control over:

- phone numbers
- SMS
- SIP
- status callbacks
- recordings
- routing and fallbacks

If Vapi or Retell are introduced, they should sit on top of Twilio or alongside it for specific workflows. They should not replace Twilio as the system of record for telephony.

## Deployment model

- `main` deploys to Vercel production
- feature branches deploy to Vercel previews
- GitHub Actions verifies lint, typecheck, and build on push and pull request

## Current-phase note

The current repository only implements the Phase 1 foundation. This file describes the final intended stack, not the current runtime state.
