# OLIVIA BRAIN — NEXT AGENT HANDOFF

## REPO LOCATIONS
- **GitHub:** https://github.com/johndesautels1/Olivia-Brain
- **Local:** `D:\Olivia Brain`

---

## ABSOLUTE FIRST PRIORITY: FIX VERCEL ENV VARS

**A prior agent set environment variables incorrectly in Vercel, causing API failures in production.** This MUST be fixed before any other work begins.

### The Problem
The codebase has 60+ env vars defined in `src/lib/config/env.ts`. Many of these were either:
- Set to "All Environments" when they should be Production + Preview only
- Not set at all despite being needed
- Set with wrong values

### The Rules (from CLAUDE.md — read it)
- **Secret keys** (`*_API_KEY`, `*_SECRET*`, `*_TOKEN`, `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) → **Production + Preview only, marked Sensitive**
- **`SUPABASE_SERVICE_ROLE_KEY`** → **Production ONLY** (not even Preview) — this key bypasses all Row Level Security
- **`NEXT_PUBLIC_*` vars** → All Environments (designed to be public)
- **Non-secret IDs** (voice IDs, avatar IDs, site URLs) → All Environments is fine
- **NEVER set secrets to "All Environments"** — this is a security violation
- **Local development** → use `.env.local` (gitignored), NEVER expose production secrets in Vercel's Development environment

### What You Must Do
1. Read `src/lib/config/env.ts` to see every env var the app expects
2. Read `.env.example` and `.env.full.example` for the complete list with descriptions
3. Walk the user through setting each var correctly in Vercel with the right scope
4. Do ONE variable at a time — confirm with user before moving to the next

### Env Vars by Category (from env.ts)

**LLM Provider Keys (Production + Preview, Sensitive):**
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`
- `XAI_API_KEY`, `PERPLEXITY_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`
- `TAVILY_API_KEY`, `MEM0_API_KEY`

**Infrastructure Keys (Production + Preview, Sensitive):**
- `SUPABASE_URL` (Production + Preview)
- `SUPABASE_SERVICE_ROLE_KEY` (**Production ONLY** — bypasses RLS)
- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`

**Telephony & Voice (Production + Preview, Sensitive):**
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`
- `ELEVENLABS_API_KEY`, `DEEPGRAM_API_KEY`
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `VAPI_API_KEY`, `RETELL_API_KEY`

**Avatar (Production + Preview, Sensitive):**
- `SIMLI_API_KEY`, `HEYGEN_API_KEY`, `DID_API_KEY`, `REPLICATE_API_TOKEN`

**CRM & Tools (Production + Preview, Sensitive):**
- `COMPOSIO_API_KEY`, `NYLAS_API_KEY`, `RESEND_API_KEY`
- `INSTANTLY_API_KEY`, `HUBSPOT_ACCESS_TOKEN`

**Real Estate Data Layer — Sprint 3.3 (Production + Preview, Sensitive):**
- `MLS_RESO_BASE_URL`, `MLS_RESO_BEARER_TOKEN`, `MLS_RESO_API_KEY`
- `BRIDGE_API_KEY`, `HOUSECANARY_API_KEY`, `HOUSECANARY_API_SECRET`
- `BATCHDATA_API_KEY`, `PROPERTYRADAR_API_TOKEN`
- `PLUNK_API_KEY`, `RENTCAST_API_KEY`, `REGRID_API_KEY`

**Report Generation — Sprint 3.7 (Production + Preview, Sensitive):**
- `GAMMA_API_KEY`

**Relocation & Environmental Data (Production + Preview, Sensitive):**
- `GOOGLE_PLACES_API_KEY`, `WALKSCORE_API_KEY`, `OPEN_EXCHANGE_RATES_APP_ID`
- `TRAVEL_BUDDY_API_KEY`, `CRIMEOMETER_API_KEY`
- `SCHOOLDIGGER_API_KEY`, `SCHOOLDIGGER_APP_ID`
- `AIRNOW_API_KEY`, `HOWLOUD_API_KEY`, `OPENWEATHERMAP_API_KEY`

**RAG Pipeline (Production + Preview, Sensitive):**
- `FIRECRAWL_API_KEY`, `UNSTRUCTURED_API_KEY`, `COHERE_API_KEY`, `JINA_API_KEY`

**Evaluation (Production + Preview, Sensitive):**
- `BRAINTRUST_API_KEY`, `PATRONUS_API_KEY`, `CLEANLAB_API_KEY`

**Execution (Production + Preview, Sensitive):**
- `TRIGGER_SECRET_KEY`, `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`

**CLUES Product Integration — Sprint 4.6 (Production + Preview, Sensitive):**
- `CLUES_INTELLIGENCE_API_KEY`, `CLUES_INTELLIGENCE_BASE_URL`
- `CLUES_LIFESCORE_INTERNAL_API_KEY`, `CLUES_LIFESCORE_BASE_URL`
- `CLUES_LONDON_INTERNAL_API_KEY`, `CLUES_LONDON_BASE_URL`
- `STAY_OR_SELL_API_KEY`, `STAY_OR_SELL_BASE_URL`
- `BROKERAGE_INTERNAL_API_KEY`, `BROKERAGE_BASE_URL`

**Non-Secret / Public (All Environments OK):**
- `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`
- `ELEVENLABS_VOICE_OLIVIA`, `ELEVENLABS_VOICE_CRISTIANO`, `ELEVENLABS_VOICE_EMELIA` (voice IDs, not secrets)
- `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `OPENAI_WHISPER_MODEL` (model names)
- `LANGFUSE_BASE_URL` (public URL)
- Model name vars: `ANTHROPIC_MODEL_PRIMARY`, `ANTHROPIC_MODEL_JUDGE`, `OPENAI_MODEL_PRIMARY`, etc.

---

## CRITICAL: READ THESE FILES BEFORE ANY WORK
1. **`C:\Users\broke\CLAUDE.md`** — Master rules. Read EVERY section. Non-negotiable.
2. **`BATTLE_PLAN.md`** — 186-item roadmap, current sprint status
3. **`OLIVIA_BUILD_STATE.md`** — What's independent vs blocked
4. **`README.md`** — Architecture overview, 3-layer system, persona specs
5. **`docs/final-stack.md`** — Target-state technology stack

---

## CURRENT BUILD STATUS (~72% complete — 133/186 items)

| Phase | Status | Done |
|-------|--------|------|
| Phase 1: Foundation (5 sprints) | Complete | 39/39 |
| Phase 2: Voice & Avatar (4 sprints) | Complete | 25/25 |
| Phase 3: Domain Intelligence (7 sprints) | 6/7 sprints complete | 44/52 |
| Phase 4: Multi-Agent Beast Mode (6 sprints) | 3/6 sprints complete | 24/54 |
| Phase 5: Multi-Tenant & White-Label (3 sprints) | Pending | 0/15 |
| **TOTAL** | | **133/186** |

### What Was Just Built (This Session)
- **Sprint 3.3 — Real Estate Data Layer (8/8):** MLS, Bridge/Zillow, HouseCanary, BatchData, PropertyRadar, Plunk AI, Rentcast, Regrid — all in `src/lib/adapters/`
- **Sprint 3.7 — Report Generation (5/5):** Gamma AI, PDF/PPTX engine, Relocation Report, Market FAQ, Meeting Prep — all in `src/lib/reports/`

### What's Next (After Fixing Env Vars)
1. **Sprint 4.1** — Persona System (Olivia, Cristiano, Emelia — 14 items)
2. **Sprint 4.2** — 250-Agent Dashboard System (12 items)
3. **Sprint 4.6** — Remaining CLUES Product Integration (4 items: CLUES-TES, HEARTBEAT, Predictive Analytics, CORPUS)
4. **Phase 5** — Multi-Tenant & White-Label (15 items)

---

## BEHAVIORAL RULES — FOLLOW EXACTLY

1. **NO PLAN MODE.** Do not use EnterPlanMode. Ever. Just do the work.
2. **NO MULTIPLE AGENTS.** Do not use Task tool with subagent_type. Do the work yourself directly.
3. **NO PARALLEL TOOL CALLS.** One tool call at a time. Sequential only.
4. **ONE TASK AT A TIME.** Complete one item, report back, wait for go-ahead.
5. **COMMIT + PUSH AFTER EVERY TASK.** Vercel deploys from git. Local commits are useless.
6. **NEVER RUN LOCAL BUILDS.** No `npm run build`, no `next build`. Vercel handles it.
7. **NEVER SET SECRETS TO "ALL ENVIRONMENTS" IN VERCEL.**
8. **READ CLAUDE.md FIRST.** It has rules that override everything else.

---

## 9-MODEL CASCADE
| # | Model | Role |
|---|-------|------|
| 1 | Gemini 3.1 Pro | Biographical extraction |
| 2 | Sonnet 4.6 | Primary evaluator |
| 3 | GPT-5.4 Pro | Secondary evaluator |
| 4 | Gemini 3.1 Pro | Verification + Google Search |
| 5 | Grok 4 | Math/equations ONLY |
| 6 | Perplexity Sonar Reasoning Pro | Questionnaires + citations |
| 7 | Tavily | Web research MCP |
| 8 | Opus 4.6 (Cristiano) | THE JUDGE |
| 9 | Mistral Large | Multilingual fallback |

---

## KEY FILES
| File | Purpose |
|------|---------|
| `src/lib/config/env.ts` | All env var definitions (Zod schema) |
| `src/lib/services/model-cascade.ts` | 9-model cascade implementation |
| `src/lib/orchestration/phase1-graph.ts` | LangGraph workflow |
| `src/lib/adapters/` | All data layer adapters (Sprint 3.3-3.5) |
| `src/lib/reports/` | Report generation engine (Sprint 3.7) |
| `src/lib/bridge/` | UKP bridge infrastructure |
| `src/lib/memory/store.ts` | Memory layer |
| `src/lib/clues-intelligence/` | Embedded CLUES reference data |
| `.env.example` | Env var template (minimal) |
| `.env.full.example` | Env var template (complete with descriptions) |

---

## START SEQUENCE
```
cd "D:\Olivia Brain"
git pull origin main
```
Then read CLAUDE.md, then this file, then fix Vercel env vars with the user.
