# Olivia Brain Phase 1

This repository turns the roadmap artifact into a real Phase 1 foundation application.

## What Phase 1 includes

- React + TypeScript application shell built for Vercel deployment
- Server-side chat API with a typed multi-provider model cascade
- LangGraph orchestration flow for runtime hydration, memory recall, intent routing, response generation, and persistence
- Supabase-ready memory layer with local in-memory fallback
- Readiness tracking for Supabase, Mem0, Composio, Nylas, Resend, Instantly, HubSpot, and Langfuse
- Private adapter client for the CLUES London calendar system so Olivia can consume that subsystem without duplicating it
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
- `src/lib/adapters`: cross-app adapter registry and contract types
- `src/lib/adapters/london-calendar.ts`: server-to-server client for the CLUES London calendar adapter
- `src/lib/foundation`: static Phase 1 metadata and readiness summaries
- `src/lib/hubspot`: HubSpot server adapter for account details and CRM object operations
- `src/lib/instantly`: Instantly server adapter for outbound account, campaign, and lead workflows
- `src/lib/memory`: Supabase and in-memory conversation storage
- `src/lib/orchestration`: LangGraph request pipeline
- `src/lib/resend`: Resend server adapter for transactional email and domain health checks
- `src/lib/services`: model routing and provider execution
- `src/lib/twilio`: Twilio server helpers, client bootstrapping, webhook validation, and TwiML generation
- `src/lib/observability`: tracing helpers and local trace store
- `supabase/migrations`: schema for conversations, traces, and vector-ready knowledge chunks

## Twilio inbound voice webhook

The first Twilio voice entrypoint is available at `/api/twilio/voice/inbound`.

- In development, you can hit the route directly and it will return TwiML even without a Twilio signature.
- In production, if `TWILIO_AUTH_TOKEN` is configured, the route validates `X-Twilio-Signature`.
- If `TWILIO_CONVERSATION_RELAY_URL` is configured, the route connects the caller into Twilio ConversationRelay.
- Otherwise, it returns a fallback spoken message and hangs up cleanly.

## Admin integrations dashboard

The admin integrations dashboard is available at `/admin/integrations`.

- It shows required and optional environment keys per integration.
- It can run environment validation for every integration.
- It can run safe live checks for selected integrations such as Supabase, CLUES London Calendar, Twilio, Tavily, HubSpot, Resend, and Instantly.
- It stores recent integration test history and admin audit events in Supabase when the admin audit tables are available.
- If Supabase is not configured for this app yet, it falls back to local in-memory history so the dashboard still works during setup.
- In production, set `ADMIN_API_KEY` so the admin APIs are not exposed without a shared secret.

## CLUES London calendar adapter client

The Olivia-side client for the London calendar system lives in `src/lib/adapters/london-calendar.ts`.

- It targets the private `/api/internal/olivia/calendar/*` contract documented in `docs/london-calendar-adapter-contract.md`.
- It uses `CLUES_LONDON_BASE_URL` and `CLUES_LONDON_INTERNAL_API_KEY` for server-to-server auth.
- It supports health, entry list/create/update/archive, attendee replacement, prep-task reads and writes, parser delegation, and recommendations.
- The admin live check only calls the health endpoint so it stays read-only.

## HubSpot server adapter

The HubSpot integration lives in `src/lib/hubspot/server.ts`.

- It supports account detail lookup plus generic contact, company, and deal record operations.
- The admin live check stays read-only and only fetches account details plus up to one visible contact, company, and deal.
- Keep the token scoped to the CRM objects this app actually needs. The read paths work with object read scopes, and create or update paths need the corresponding write scopes.

## Resend server adapter

The Resend integration lives in `src/lib/resend/server.ts`.

- It supports transactional sends through a typed server-side helper.
- The admin live check stays read-only and only queries Resend domains.
- If the API key is valid but no domains are configured yet, the live check returns a clean warning instead of pretending email is production-ready.

## Instantly server adapter

The Instantly integration lives in `src/lib/instantly/server.ts`.

- It supports account and campaign listing plus lead and campaign write primitives for later workflow wiring.
- The admin live check stays read-only and only queries accounts and campaigns.
- Outbound writes such as campaign creation, activation, and lead uploads are available to the server adapter, but they are not triggered by the admin dashboard.

Apply both Supabase migrations before expecting durable storage:

- `supabase/migrations/20260407_phase1_foundation.sql`
- `supabase/migrations/20260408_admin_integration_logs.sql`

## Notes on provider choices

The implementation uses the Vercel AI SDK provider surface because it keeps Anthropic, OpenAI, Google, xAI, Perplexity, and Mistral behind one interface. Defaults are environment-driven so model IDs can be tuned without code changes.

## Long-term stack planning

- `docs/final-stack.md`: target-state architecture aligned to the master roadmap
- `docs/olivia-core-architecture.md`: multi-app core architecture for Olivia across the CLUES portfolio
- `docs/london-calendar-adapter-contract.md`: recommended private adapter contract for the London calendar system
- `.env.full.example`: full target environment contract for later phases

## Suggested next steps after Phase 1

1. Apply the Supabase migration and connect service credentials.
2. Add at least one live model provider key and validate the cascade.
3. Build the Olivia UI surface that wraps the CLUES London calendar in a native-feeling shell.
4. Add approval-gated LangGraph tools on top of the calendar, CRM, and communications adapters.
