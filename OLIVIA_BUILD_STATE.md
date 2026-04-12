# OLIVIA BRAIN — BUILD STATE & INDEPENDENT TASK REFERENCE

> **PURPOSE**: This document tracks which build items can be worked on NOW (independent of other apps)
> versus which are BLOCKED until other apps in the portfolio are live.
> Every AI assistant working on Olivia MUST read this file to avoid wasting time on blocked items.
>
> **Last Updated**: 2026-04-12
> **Master Build Plan**: `BATTLE_PLAN.md` (173 total features, ~56% complete)

---

## GOVERNING ARCHITECTURE PRINCIPLE

**Olivia = the brain, not the warehouse.**

- Olivia has the orchestration intelligence — the 9-model cascade, reasoning, judgment
- She does NOT store or duplicate proprietary data from the other apps
- When she needs domain knowledge, she calls OUT to those apps through the Universal Knowledge Protocol (UKP) bridge
- Each app remains the system of record for its own domain
- The Gemini extraction / 30-paragraph system already exists in CLUES Main — Olivia invokes it remotely
- The `clues-intelligence/data/` folder contains embedded reference knowledge (the question library), NOT proprietary client data
- Proprietary data (client answers, scores, property records) stays in source apps and gets queried on demand

**NEVER:**
- Duplicate another app's database into Olivia
- Build domain logic that belongs in a domain app
- Claim Olivia needs API keys she doesn't have (they're in Vercel env vars)
- Build a second copy of something that already exists in another app (e.g., Gemini extraction)

---

## PORTFOLIO APPS — CURRENT STATUS

| App | Status | Olivia Dependency |
|-----|--------|-------------------|
| CLUES Intelligence (`cluesintelligence.com`) | In development, close to ready | UKP provider needed when live |
| London Tech Map (`clueslondon.com`) | In development, close to ready | UKP provider needed when live |
| CLUES LifeScore (`clueslifescore.com`) | In development, close to ready | UKP provider needed when live |
| HEARTBEAT (cardiac recovery) | Long way out | UKP provider needed when live |
| Transit & Environment (CLUES-TES) | Long way out | UKP provider needed when live |
| Desautels Brokerage | Operational | UKP provider needed when live |

---

## BRIDGE INFRASTRUCTURE STATUS (UKP)

The bridge infrastructure is ~85% built. What exists:

| Component | File | Status |
|-----------|------|--------|
| UKP Type Definitions | `src/lib/bridge/types.ts` (432 lines) | COMPLETE |
| Knowledge Registry | `src/lib/bridge/registry.ts` (411 lines) | COMPLETE |
| Bridge Index | `src/lib/bridge/index.ts` | STUB (exports only) |
| Domain App Registry | `src/lib/adapters/registry.ts` (84 lines) | COMPLETE |
| CLUES Intelligence Provider | `src/lib/clues-intelligence/` | DATA ONLY — no provider.ts |
| Other App Providers | — | NOT IMPLEMENTED |
| Provider Registration | — | Registry exists, no providers registered |

**What's missing**: Actual `UniversalKnowledgeProvider` implementations for each app. These are blocked until apps are live and expose internal API surfaces.

---

## BLOCKED ITEMS (need other apps live)

### Sprint 3.1 — Remaining (3 items) — BLOCKED
- `[ ]` Universal Knowledge Protocol (UKP) provider implementation — needs apps to implement provider interface
- `[ ]` Connect embedded knowledge to Olivia orchestration layer — wiring ready, providers need apps
- `[ ]` Build Gemini extraction service — already exists in CLUES Main, do not duplicate

### Sprint 3.2 — SMART Score Engine (5 items) — PARTIALLY BLOCKED
- `[ ]` 5-category weighted algorithm implementation — could build with mock inputs
- `[ ]` City scoring calculation — needs real data
- `[ ]` LifeScore metrics integration — BLOCKED on LifeScore app
- `[ ]` Comparison output generation — needs scoring to work
- `[ ]` Cristiano verdict integration — judge endpoint exists, but needs real inputs

### Sprint 4.6 — CLUES Product Integration (10 items) — ALL BLOCKED
- All items require specific app hookups (CLUES Intelligence, London Tech Map, LifeScore, HEARTBEAT, CLUES-TES, Stay or Sell, Tampa Bay, Predictive Analytics, CORPUS)

---

## APP-INDEPENDENT ITEMS (can build NOW)

### Sprint 3.3 — Real Estate Data Layer (8 items) — ALL INDEPENDENT
External third-party APIs, zero dependency on portfolio apps:
- `[ ]` MLS Data Feeds integration (RETS/WebAPI)
- `[ ]` Zillow / Bridge API connection
- `[ ]` HouseCanary AVMs + investment analytics
- `[ ]` BatchData API for property records
- `[ ]` PropertyRadar owner data + targeting
- `[ ]` Plunk AI property valuation
- `[ ]` Rentcast rental estimates
- `[ ]` Regrid / LandGrid parcel data

### Sprint 3.7 — Report Generation (5 items) — ALL INDEPENDENT
- `[ ]` Gamma integration ("The Cadillac")
- `[ ]` 50+ page branded PDF/PPTX reports
- `[ ]` Client Relocation Report Generator (100 pages)
- `[ ]` Per-Market FAQ Generation
- `[ ]` Meeting Prep Packet Generator

### Sprint 4.1 — Persona System (3 personas) — ALL INDEPENDENT
- `[ ]` Olivia persona completion (bilateral comms, "Ask Olivia", Simli + D-ID/HeyGen + ElevenLabs + GPT-5.4)
- `[ ]` Cristiano persona (unilateral judge, Replicate SadTalker + ElevenLabs + Opus 4.6)
- `[ ]` Emelia persona (voice + text only, customer service, tech support, GPT brain)

### Sprint 4.2 — 250-Agent Dashboard (6 items) — ALL INDEPENDENT
- `[ ]` Admin dashboard for agent management
- `[ ]` Multi-LLM agent configuration
- `[ ]` Multi-variable select specialty agents
- `[ ]` Per-agent prompt configuration
- `[ ]` Per-agent domain assignment
- `[ ]` Agent type templates (Property Search, Immigration, Negotiation, Email Drafter, Document Chaser, Domain-specific)

### Sprint 4.3 — Advanced Memory (6 items) — ALL INDEPENDENT
- `[ ]` Zep / Graphiti knowledge graph
- `[ ]` Episodic memory layer
- `[ ]` Semantic memory layer
- `[ ]` Procedural memory layer
- `[ ]` Event-Sourced Conversation Ledger
- `[ ]` Snapshot-Resume State (journeys persist weeks/months)

### Sprint 4.4 — Durable Execution (5 items) — ALL INDEPENDENT
- `[ ]` Trigger.dev for long-running jobs
- `[ ]` Temporal for crash-proof workflows
- `[ ]` Inngest event-driven functions (Vercel-native)
- `[ ]` Upstash QStash serverless queue
- `[ ]` Action Budgets (prevent expensive loops)

### Sprint 4.5 — Evaluation & Observability (7 items) — ALL INDEPENDENT
- `[ ]` Red-Team Eval Harness
- `[ ]` Conversation QA Scorecards
- `[ ]` Weekly Model Bake-Off system
- `[ ]` Braintrust evals + prompt playground
- `[ ]` Patronus AI hallucination detection
- `[ ]` Cleanlab data quality scoring
- `[ ]` A/B Test Avatar Personalities

### Sprint 5.1 — Tenant Architecture (5 items) — ALL INDEPENDENT
- `[ ]` Multi-tenant database schema
- `[ ]` Tenant isolation
- `[ ]` Per-tenant adapter selection
- `[ ]` Per-tenant model routing overrides
- `[ ]` Per-tenant policy/approval rules

### Sprint 5.2 — White-Label System (5 items) — ALL INDEPENDENT
- `[ ]` Branding pack system
- `[ ]` Custom persona configuration per tenant
- `[ ]` Custom prompt packs per tenant
- `[ ]` Entitlements system
- `[ ]` White-label Olivia deployment

### Sprint 5.3 — Compliance & Security (5 items) — ALL INDEPENDENT
- `[ ]` Data Residency Routing (EU servers for EU clients)
- `[ ]` Call Recording Consent Flows
- `[ ]` Consent-Based Memory Sync (GDPR)
- `[ ]` Deterministic Compliance Subflows (Fair Housing, visa, tax)
- `[ ]` Multi-Market Knowledge Versioning

---

## SUMMARY

| Category | Item Count |
|----------|-----------|
| Completed | ~97 items |
| Blocked (needs other apps) | ~18 items |
| App-Independent (build now) | ~60 items |
| **Total** | **~173 items** |

---

## KEY FILES

| File | Purpose |
|------|---------|
| `BATTLE_PLAN.md` | Master build plan with all 173 features and sprint tracking |
| `CLUES_INTELLIGENCE_ARCHITECTURE.md` | Full CLUES domain pipeline (paragraphical → extraction → modules → evaluation → verdict) |
| `UNIVERSAL_ARCHITECTURE_ANALYSIS.md` | 3-layer architecture (Immortal Core → Bridge Protocol → Domain Plugins) |
| `HANDOFF.md` | Quick-start handoff with key files and cascade reference |
| `docs/olivia-core-architecture.md` | Portfolio integration model and adapter rules |
| `docs/final-stack.md` | 9-model cascade, persona specs, target architecture |
| `src/lib/bridge/` | UKP bridge infrastructure (types, registry, index) |
| `src/lib/adapters/registry.ts` | Domain app registry (6 apps defined) |
| `src/lib/clues-intelligence/` | Embedded CLUES reference data (2,400+ questions, engines, types) |
| `src/lib/services/model-cascade.ts` | 9-model cascade implementation |
| `src/lib/orchestration/phase1-graph.ts` | LangGraph workflow |

---

## HOW TO USE THIS DOCUMENT

1. **Before starting work**: Read this file to know what's independent vs blocked
2. **Pick items from the "APP-INDEPENDENT" section** — these are safe to build
3. **Do NOT attempt blocked items** — they will result in hollow implementations or architecture violations
4. **When an app comes online**: Move its related items from "BLOCKED" to "INDEPENDENT" and build the UKP provider
5. **After completing items**: Mark them `[x]` in both this file AND `BATTLE_PLAN.md`, then commit + push
6. **Discuss each function in detail before coding** — no assumptions, no jumping ahead
