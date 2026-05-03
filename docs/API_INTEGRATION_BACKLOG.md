# API Integration Backlog

Canonical list of external APIs Olivia Brain pulls from (or should pull from) to inform her reasoning, enrichment, and data layers. Captured 2026-05-02 from the user's research brief.

> **How to use this doc.** When picking up an enrichment task, look up the API here first. The "Status in `env.ts`" column says whether a key is already declared in `src/lib/config/env.ts` — if yes, the wiring is half-done; if no, you need to add the env var (and, if the key is sensitive, set it in Vercel **Production + Preview only, marked Sensitive**, per `~/CLAUDE.md`). The "Provider file" column points at the existing implementation in `src/lib/cascade/providers/` or `src/lib/bridge/providers/` — if it's "—", the implementation is open work.
>
> **Where new providers belong.**
> - **LLM / inference providers** (cascade-routable text generation, embeddings) → `src/lib/cascade/providers/<name>.ts`, registered in the cascade.
> - **Data providers** (read structured data Olivia answers questions from) → `src/lib/bridge/providers/<name>.ts`, implementing `UniversalKnowledgeProvider` against a domain (`uk-companies`, `news`, `events`, `geo`, etc.) and registered in `knowledgeRegistry`.
> - **Enrichment / utility providers** (one-shot lookups, validation, geocoding) → `src/lib/enrichment/<name>.ts` (new directory, light wrappers, no domain registration).

---

## 1. UK Company & Legal Data (highest leverage for clueslondon.com)

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 1 | **Companies House** | Official UK company data, officers, filings, charges | Free with API key | ❌ not declared | — | data |
| 2 | **OpenCorporates** | Global + UK company registry, better search | Free tier | ❌ not declared | — | data |

Notes: Companies House is referenced in `MERGE_PLAN.md` Phase 2 as a coming cascade provider — declare `COMPANIES_HOUSE_API_KEY` in `env.ts` when wiring. Both belong in `src/lib/bridge/providers/` under domain `uk-companies`.

---

## 2. News, Intelligence & Sentiment

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 3 | **NewsData.io** | Real-time + historical news | 200 credits/day | ❌ not declared | — | data |
| 4 | **NewsCatcher API** | Business & tech news with NER | Strong free tier | ❌ not declared | — | data |
| 5 | **GNews API** | Google News-style search | 100 req/day | ❌ not declared | — | data |
| 6 | **Mediastack** | Global news aggregation | 500 req/month | ❌ not declared | — | data |

Notes: One bridge provider with domain `news`, multi-source under the hood. Pick NewsData.io as primary, NewsCatcher as fallback, GNews as quota-conserving secondary.

---

## 3. Events & Networking

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 7 | **Eventbrite API** | Tech events, conferences, meetups | Free for public events | ❌ not declared | — | data |
| 8 | **Meetup GraphQL API** | Local tech meetups & groups | Limited free / Pro | ❌ not declared | — | data |

Notes: Bridge provider with domain `events`. Critical for the "London Tech Week / AI Summit / Fintech" calendar surfaces in LTM.

---

## 4. Maps, Location & Geocoding

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 9 | **OpenStreetMap Nominatim** | Geocoding & reverse geocoding | Completely free | n/a (no key) | — | enrichment |
| 10 | **Mapbox** | Interactive maps + location intelligence | 50,000 map loads/month | ❌ not declared | — | enrichment |
| 11 | **ip-api.com** | IP geolocation | Unlimited free | n/a (no key) | — | enrichment |

Notes: Light wrappers in `src/lib/enrichment/`. Nominatim has a 1 req/sec rate-limit — wrapper must enforce this server-side.

---

## 5. AI & Intelligence Layer

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 12 | **Groq API** | Ultra-fast LLM inference | Generous free tier | ✅ `GROQ_API_KEY` + `GROQ_MODEL_PRIMARY` | (via cascade) | inference |
| 13 | **Hugging Face Inference API** | 100,000+ open models | Free tier | ❌ not declared | — | inference |
| 14 | **Google Gemini API** | Multimodal (text + vision) | Generous free tier | ✅ `GOOGLE_GENERATIVE_AI_API_KEY` + `GOOGLE_MODEL_PRIMARY` | (via cascade) | inference |
| 15 | **Cohere API** | Embeddings + RAG | Good free tier | ✅ `COHERE_API_KEY` | — | inference |

Notes: Three of four are already keyed. Hugging Face is the gap — useful for cheap NER + embeddings without locking in to Cohere. Cascade routing for Groq + Gemini already lives in `src/lib/services/model-cascade.ts`.

---

## 6. Company Enrichment & Web Data

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 16 | **SerpApi** | Google search scraping | Free tier | ❌ not declared | — | data |
| 17 | **Clearbit (HubSpot)** | Company & contact enrichment | Free tier | partial — `HUBSPOT_ACCESS_TOKEN` only | — | enrichment |
| 18 | **Hunter.io** | Email finding & verification | Limited free searches | ❌ not declared | — | enrichment |

Notes: SerpApi often catches funding news that the structured news APIs miss — pair with NewsData.io. Hunter.io should be gated behind a tenant entitlement (Track I).

---

## 7. Social & Community Signals

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 19 | **Reddit API** | Tech discussions & sentiment | Free | ❌ not declared | — | data |
| 20 | **X (Twitter) API v2** | Real-time founder & investor chatter | Free tier | ❌ not declared | — | data |

Notes: X v2 free tier is now extremely tight (500 reads/month basic). Validate quotas before committing significant feature work.

---

## 8. Open Government & London-Specific Data

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 21 | **London Datastore** | Official London open data | Completely free | n/a (no key) | — | data |
| 22 | **Office for National Statistics (ONS)** | UK economic & demographic data | Free | n/a (no key) | — | data |
| 23 | **data.gov.uk** | UK government open datasets | Free | n/a (no key) | — | data |

Notes: All three are no-key, public HTTP APIs. One bridge provider with domain `uk-public-data`, multi-source. Heavy hitter for the LTM map's borough-level overlays.

---

## 9. Bonus High-Utility Free APIs

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 24 | **Abstract API** | Email validation, IBAN, VAT, etc. | Multiple free endpoints | ❌ not declared | — | enrichment |
| 25 | **ipgeolocation.io** | Advanced IP intelligence | 30,000 req/month | ❌ not declared | — | enrichment |

---

## 10. Visual Manifestation & Tool Dispatch (Track N + Track O)

Olivia summons visuals on demand alongside her voice. The cascade emits `manifest: { type, payload }` tool calls; the `<OliviaCanvas>` component renders the right surface. **Gamma is the canonical presentation runtime — partner, integral, never an alternative.**

### Tier 1 — Core (every product)

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 26 | **Gamma** | Decks, docs, webpages, social posts | Free tier + paid | partial — via MCP | `src/lib/reports/gamma.ts` ✅ | data |
| 27 | **Mapbox GL JS + 3D Tiles** | Maps, 3D city flyovers | 50K loads/month | ❌ not declared | — | enrichment |
| 28 | **Mermaid.js** (npm) | Diagrams from text | n/a (JS lib) | n/a | — (Track N3) | enrichment |
| 29 | **Recharts** (npm) | React charts | n/a (JS lib) | n/a | — (Track N3) | enrichment |
| 30 | **Tremor** (npm) | Dashboard blocks | n/a (JS lib) | n/a | — (Track N3) | enrichment |
| 31 | **tldraw + tldraw-ai-module** | Whiteboard canvas | Free tier (commercial paid) | ❌ not declared | — | enrichment |
| 32 | **Vercel v0 API** | Generative React UI | Pro plan | ❌ not declared | — | inference |

### Tier 2 — Domain-specific

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 33 | **CesiumJS + Cesium ion** | 3D globe, city flyovers | Free tier (5GB assets) | ❌ not declared | — | enrichment |
| 34 | **Spline** | Embedded 3D scenes | Free tier | ❌ not declared | — | enrichment |
| 35 | **Sketchfab API** | Embedded 3D models | Free tier | ❌ not declared | — | enrichment |
| 36 | **BioDigital Human** | 3D anatomy (HEARTBEAT) | Educational/dev tier | ❌ not declared | — | enrichment |
| 37 | **Google Street View Static** | Property previews | $7/1000 (after free) | ❌ not declared | — | enrichment |
| 38 | **Mapillary** | Open street imagery | Completely free | ❌ not declared | — | enrichment |
| 39 | **Plotly.js** (npm) | Financial charts | n/a (JS lib) | n/a | — | enrichment |
| 40 | **Vis-timeline** (npm) | Timelines | n/a (JS lib) | n/a | — | enrichment |
| 41 | **Cytoscape.js** (npm) | Knowledge graphs | n/a (JS lib) | n/a | — | enrichment |
| 42 | **Deck.gl** (npm) | Large-scale geo viz | n/a (JS lib) | n/a | — | enrichment |

### Tier 3 — Generative media (real-time)

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 43 | **fal.ai** | Fast image/video gen (FLUX, SDXL, Veo) | Pay-as-you-go | ❌ not declared | — | inference |
| 44 | **Runway Gen-4** | Short video clips | Paid tier | ❌ not declared | — | inference |
| 45 | **Luma Dream Machine** | Short video clips | Limited free | ❌ not declared | — | inference |
| 46 | **Cartesia Sonic 2** | Sub-300ms TTS (W-003 fix) | Free tier | ❌ not declared | `src/lib/voice/cartesia.ts` (Track O3) | inference |
| 47 | **Tavus** | Better lip-sync (W-005 fix) | Pay-as-you-go | ❌ not declared | `src/lib/avatar/tavus.ts` (Track O5) | inference |
| 48 | **Krea Realtime** | Real-time AI image gen | Paid tier | ❌ not declared | — | inference |
| 49 | **OpenAI Realtime API** | Voice + tool agent | Uses `OPENAI_API_KEY` | ✅ (existing key) | — | inference |

### Tier 4 — Tool dispatch (W-001 fix)

| # | API | Best for | Free tier | Status in `env.ts` | Provider file | Tier |
|---|-----|----------|-----------|--------------------|---------------|------|
| 50 | **Composio** | 200+ tool integrations | Free tier | ✅ `COMPOSIO_API_KEY` (catalog only, not wired) | `src/lib/tools/composio.ts` (Track O1) | inference |

### §10 status summary

| Bucket | Count | Notes |
|--------|-------|-------|
| ✅ Already wired or keyed | 3 | Gamma (`src/lib/reports/gamma.ts` + MCP), OpenAI Realtime (uses existing `OPENAI_API_KEY`), Composio (key in `INTEGRATION_CATALOG`, library not wired) |
| n/a — npm package, no key | 8 | Mermaid, Recharts, Tremor, Plotly, Vis-timeline, Cytoscape, Deck.gl, Mapillary public endpoints |
| ❌ New env var needed | 14 | Mapbox, tldraw paid, Vercel v0, Cesium ion, Spline, Sketchfab, BioDigital, Google Street View, fal.ai, Runway, Luma, Cartesia, Tavus, Krea |

This block does NOT yet roll into the global Status summary below (kept separate so the original 25-API count stays auditable).

---

## Status summary

| Bucket | Count | APIs |
|--------|-------|------|
| ✅ Keys already in `env.ts` | 3 | Groq, Gemini, Cohere |
| n/a — no key needed (public) | 5 | Nominatim, ip-api.com, London Datastore, ONS, data.gov.uk |
| ❌ New env var needed | 17 | All others |

## Recommended starter combos (from the source brief)

| Use case | Stack |
|----------|-------|
| Core company data | Companies House + OpenCorporates + Clearbit |
| Daily intelligence | NewsData.io + NewsCatcher + Groq (summarize) |
| Events & networking | Eventbrite + Meetup + Mapbox |
| Olivia AI brain | Groq + Hugging Face + Cohere |
| Location features | Nominatim + Mapbox + London Datastore |
| Valuation signals | Companies House + NewsData.io + SerpApi |

## How this list moves into the codebase

1. **Pick a target API**, confirm it isn't already covered (column "Status in `env.ts`").
2. **Declare the env var** in `src/lib/config/env.ts` using the existing `optionalSecret` / `optionalUrl` helpers. Set the actual value in Vercel **Production + Preview only, marked Sensitive** (per `~/CLAUDE.md`).
3. **Decide the tier** (data / inference / enrichment) — that determines the destination directory and whether it registers with `knowledgeRegistry`.
4. **Implement the provider** following the same world-class bar as `OliviaSelfProvider` and `LtmKnowledgeProvider`: `AbortSignal.timeout` on every call, `withTraceSpan` wrapping queries, JSDoc on every public symbol, graceful unconfigured-mode fallback, no PII in span attributes.
5. **Update this doc** — flip the status column from ❌ to ✅ and fill in the provider-file path.

When a provider lands, this row's status moves to ✅. The list shrinks from the bottom up.
