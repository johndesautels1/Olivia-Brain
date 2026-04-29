# Olivia Brain

> **The single most brilliant agentic agent ever programmatically programmed.**

Olivia is the omnipotent, all-knowing AI executive agent that serves as the front face of the CLUES ecosystem. She walks users through complex relocation decisions, financial analysis, and life optimization — delivering video reports, data visualizations, and Gamma presentations with a human touch.

---

## Universal Architecture

Olivia is built on a **Three-Layer Architecture** that enables her to:
- Plug-and-play into 5+ CLUES apps seamlessly
- Function as a standalone freestanding video agent
- Be white-labeled for other companies
- Integrate new apps with ZERO changes to her core

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: IMMORTAL CORE (Hardwired - Never Changes)            │
│  Identity • Voice/Avatar • Memory • Orchestration • Security   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: BRIDGE PROTOCOL (Universal Knowledge Protocol)       │
│  One interface ALL apps implement • Apps adapt to Olivia       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: DOMAIN PLUGINS (Swappable Knowledge Modules)         │
│  CLUES Main • LifeScore • London Tech Map • HEARTBEAT • ...    │
└─────────────────────────────────────────────────────────────────┘
```

**Key Principle**: The avatar is the face, not the brain. Olivia's intelligence lives in the orchestration layer and model cascade, not inside any avatar vendor.

---

## 9-Model Cascade Architecture

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

## Persona System

### Olivia™ - Client-Facing Avatar Executive
- **Role:** All bilateral client communication. "Ask Olivia" everywhere.
- **Tech Stack:** Simli (primary) + D-ID/HeyGen (fallback) + ElevenLabs voice + GPT-5.4 brain
- **Personality:** Beautiful, multicultural, lives in London. Warm, professional, decisive.

### Cristiano™ - Universal Judge
- **Role:** UNILATERAL ONLY — no interaction. Final word on city match, financial packages, LifeScore.
- **Tech Stack:** Replicate SadTalker + D-ID/HeyGen (fallback) + ElevenLabs voice + **Opus 4.6** brain
- **Personality:** James Bond aesthetic. Authoritative, decisive, final.

### Emelia™ - Back-End Support Beast
- **Role:** NO VIDEO — voice + text only. Customer service, tech support, full architecture knowledge.
- **Tech Stack:** GPT brain + ElevenLabs voice + Manual knowledge base
- **Personality:** Filipina/British/American, Princeton MSE. Technical, helpful, thorough.

---

## CLUES Intelligence (Embedded)

Olivia has a **cloned brain** from CLUES Main for standalone operation:

```
src/lib/clues-intelligence/
├── data/
│   ├── paragraphs.ts          # 30 paragraph definitions
│   ├── modules.ts             # 23 module definitions
│   └── questions/             # ~2,400 questions
│       ├── main_module.ts     # 100Q (Demographics, DNW, MH)
│       ├── tradeoff_questions.ts   # 50Q
│       ├── general_questions.ts    # 50Q
│       └── [23 specialty modules]  # ~100Q each
├── engines/
│   ├── adaptiveEngine.ts      # CAT question selection (pure math)
│   ├── moduleRelevanceEngine.ts    # Module recommendation (pure math)
│   └── smartScoreEngine.ts    # SMART Score calculation
└── types/
```

**The CLUES Flow:**
```
30 Paragraphs (user writes biographical text)
    ↓ Gemini extracts 100-250 metrics
200-Question Main Module (5 sections)
    ↓ Adaptive Engine (CAT) determines which questions to ask
23 Specialty Modules (user sees 150-587+ questions, varies per person)
    ↓ 5-LLM Parallel Evaluation + Tavily Research
Opus/Cristiano Judge renders verdict
    ↓
OUTPUT: Country → Top 3 Cities → Top 3 Towns → Top 3 Neighborhoods
```

---

## Build Status

| Phase | Status | Items | Done |
|-------|--------|-------|------|
| Phase 1: Foundation | ✅ Complete | 39 | 39 |
| Phase 2: Voice & Avatar | ✅ Complete | 25 | 25 |
| Phase 3: Domain Intelligence | 🔄 In Progress | 52 | 31 |
| Phase 4: Multi-Agent Beast Mode | 🔄 In Progress | 54 | 24 |
| Phase 5: Multi-Tenant & White-Label | ⏳ Pending | 15 | 0 |
| **TOTAL** | **~65%** | **186** | **120** |

See `BATTLE_PLAN.md` for the complete 186-item roadmap.

---

## Key Documentation

| File | Purpose |
|------|---------|
| `BATTLE_PLAN.md` | 173-feature roadmap with sprint tracking |
| `docs/CLUES_INTELLIGENCE_ARCHITECTURE.md` | Complete CLUES domain intelligence reference |
| `docs/UNIVERSAL_ARCHITECTURE_ANALYSIS.md` | Three-layer universal architecture design |
| `docs/final-stack.md` | Target-state technology stack |
| `docs/olivia-core-architecture.md` | Multi-app integration patterns |

---

## Run Locally

```bash
# Copy environment template
cp .env.example .env.local

# Install dependencies
npm install

# Start development
npm run dev
```

If no model keys are configured, the app works in mock mode for testing orchestration, memory, and UI.

---

## Architecture Overview

```
src/
├── app/                    # Next.js App Router
├── components/             # Frontend UI
├── lib/
│   ├── clues-intelligence/ # CLUES domain brain (embedded)
│   ├── config/             # Environment parsing
│   ├── adapters/           # Cross-app adapter registry
│   ├── foundation/         # Phase 1 metadata
│   ├── memory/             # Supabase + in-memory storage
│   ├── orchestration/      # LangGraph pipeline
│   ├── services/           # Model routing
│   ├── voice/              # TTS/STT (ElevenLabs, Deepgram, Whisper)
│   ├── avatar/             # Avatar layer (Simli, SadTalker, HeyGen, D-ID)
│   ├── realtime/           # Transport (LiveKit, Twilio, Vapi, Retell)
│   ├── telephony/          # SMS, SIP, Recording, Turn-taking
│   └── observability/      # Tracing (Langfuse)
└── supabase/migrations/    # Database schema
```

---

## Protected Repo Boundaries

- `D:\Clues Main` — Source of truth for CLUES domain intelligence
- `D:\clues-questionnaire-engine` — Source of truth for 2,486 questions
- `D:\london-tech-map` — Protected external codebase (do not edit from here)

Olivia integrates through adapters, not by copying domain logic.

---

## Deployment

- `main` deploys to Vercel production
- Feature branches deploy to Vercel previews
- GitHub Actions verifies lint, typecheck, and build on push
