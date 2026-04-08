# Olivia Brain Final Stack

This document captures the target end-state stack for Olivia Brain after all phases are implemented. It is aligned to the roadmap artifact in `clues-agent-stack-championship (1).html`, with two explicit decisions applied:

- Twilio is the telephony backbone.
- ATTOM is removed from the target real-estate data layer.

## Governing rule

The avatar is the face, not the brain.

Olivia's intelligence must live in the orchestration layer and model cascade, not inside any avatar vendor. Avatar providers remain presentation surfaces that can be swapped without changing the core intelligence system.

## Final stack

| Layer | Final choice | Notes |
|---|---|---|
| Source control and deploy | GitHub, GitHub Actions, Vercel | GitHub is source of truth. Vercel handles preview and production deploys. |
| Frontend | Next.js App Router, React, TypeScript | One primary web app. Capacitor can wrap it later for native distribution. |
| API and backend runtime | Next.js server routes, Node runtime | Central API surface for orchestration, integrations, and admin actions. |
| Core orchestration | LangGraph, Composio | Stateful workflows, tool invocation, and multi-step routing. |
| LLM control plane | Vercel AI SDK | One abstraction across providers. |
| Primary model layer | Claude Sonnet, Claude Opus judge | Sonnet handles most reasoning. Opus/Cristiano remains final judge. |
| Full model cascade | Anthropic, OpenAI, Google, xAI, Perplexity, Mistral, Tavily | Specialized routing based on task class and evidence requirements. |
| Durable execution | Trigger.dev | Long-running report builds, scheduled jobs, large research tasks. |
| Short and medium-term memory | Supabase Postgres, pgvector, Mem0 | Conversation history, semantic recall, personalization. |
| Advanced memory | Zep or Graphiti | Episodic, semantic, procedural, graph-aware memory in later phases. |
| CRM and client ops | HubSpot, Nylas, Resend, Instantly.ai | CRM authority, inbox/calendar workflows, transactional and outbound email. |
| Telephony backbone | Twilio | Canonical phone numbers, SMS, SIP, routing, status callbacks, fallback control. |
| AI call runtime | Twilio ConversationRelay first, Vapi or Retell only if needed | Twilio stays authoritative. Vapi or Retell are optional acceleration layers, not the brain. |
| Browser realtime | LiveKit | Browser-based realtime voice/video sessions. |
| Premium voice | ElevenLabs, OpenAI TTS fallback | Persona voice synthesis and fallback speech generation. |
| Avatar layer | Simli primary, HeyGen and D-ID fallback, Replicate SadTalker for judge surfaces | Olivia/Cristiano/Emelia presentation layer only. |
| RAG and ingestion | Firecrawl, Unstructured, Cohere Rerank, citation-first retrieval | Evidence-grounded retrieval and document processing. |
| Real-estate data | MLS feeds, Zillow, HouseCanary, BatchData | ATTOM removed. Prefer cleaner or more controllable feeds. |
| Relocation data | Numbeo, Teleport, WalkScore, GreatSchools, Visadb.io | Relocation and quality-of-life data layer. |
| Environmental data | NOAA, FEMA, AirNow, HowLoud, OpenWeatherMap | Climate, flood, air, noise, weather signals. |
| Reports and deliverables | Gamma | Branded long-form reports and presentation output. |
| Observability and eval | Langfuse, Ragas, red-team harness, QA scorecards, model bake-offs | Tracing, RAG quality, regression checking. |
| Compliance and safety | Fair Housing validators, NeMo Guardrails, Presidio | Safety, policy guardrails, PII handling. |
| Human approval | HITL confidence gates and approval queues | Required for high-liability actions. |
| Persona system | Olivia, Cristiano, Emelia | Olivia is client-facing. Cristiano is the judge. Emelia is back-end support. |

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
