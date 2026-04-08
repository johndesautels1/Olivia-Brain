# Olivia Brain Phase 1

This repository turns the roadmap artifact into a real Phase 1 foundation application.

## What Phase 1 includes

- React + TypeScript application shell built for Vercel deployment
- Server-side chat API with a typed multi-provider model cascade
- LangGraph orchestration flow for runtime hydration, memory recall, intent routing, response generation, and persistence
- Supabase-ready memory layer with local in-memory fallback
- Readiness tracking for Supabase, Mem0, Composio, Nylas, Resend, Instantly, HubSpot, and Langfuse
- Local trace store plus optional Langfuse OpenTelemetry export

## What is intentionally not in Phase 1

- Voice and avatar transport
- Telephony
- Domain-specific data ingestion
- Production outbound email or CRM write actions
- Mobile packaging beyond keeping the architecture ready for it later

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Add provider and integration keys as they become available.
3. Install dependencies with `npm install`.
4. Start development with `npm run dev`.

If no model keys are configured, the app still works in deterministic mock mode so the orchestration, memory, and UI surface can be tested before external services are connected.

## Architecture

- `src/app`: Next.js app shell and API routes
- `src/components`: frontend control surface
- `src/lib/config`: environment parsing
- `src/lib/foundation`: static Phase 1 metadata and readiness summaries
- `src/lib/memory`: Supabase and in-memory conversation storage
- `src/lib/orchestration`: LangGraph request pipeline
- `src/lib/services`: model routing and provider execution
- `src/lib/observability`: tracing helpers and local trace store
- `supabase/migrations`: schema for conversations, traces, and vector-ready knowledge chunks

## Notes on provider choices

The implementation uses the Vercel AI SDK provider surface because it keeps Anthropic, OpenAI, Google, xAI, Perplexity, and Mistral behind one interface. Defaults are environment-driven so model IDs can be tuned without code changes.

## Long-term stack planning

- `docs/final-stack.md`: target-state architecture aligned to the master roadmap
- `.env.full.example`: full target environment contract for later phases

## Suggested next steps after Phase 1

1. Apply the Supabase migration and connect service credentials.
2. Add at least one live model provider key and validate the cascade.
3. Wire HubSpot and Nylas with scoped server-side adapters.
4. Add Phase 2 voice and avatar transport on top of this foundation instead of mixing it into the core now.
