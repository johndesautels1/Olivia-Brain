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

## Visual Manifestation Stack

The interaction model is **split-screen Olivia + Canvas**. User talks → cascade emits a `manifest({ type, payload })` tool call → `<OliviaCanvas>` renders the right surface → Olivia narrates while it animates.

**Gamma is the canonical presentation runtime — partner, integral, never an alternative.** When Olivia needs to ship a deck, doc, webpage, or social post, she calls Gamma. Olivia's value is knowing what to put in the Gamma deck via the 75 archetypes + 12 plan templates + Cristiano™ judge.

### Tier 1 — Core (every CLUES product)

| API | What Olivia summons | Status |
|---|---|---|
| **Gamma** | Decks, docs, webpages, social posts | ✅ Wired (`src/lib/reports/gamma.ts` + Gamma MCP) — needs deeper Studio integration (Track N5) |
| **Mapbox GL JS + Mapbox 3D Tiles** | Maps, 3D city flyovers, transit overlays | ❌ Not in deps — Track N2 |
| **Mermaid.js** | Architecture diagrams, flowcharts, sequence, gantt | ❌ Not in deps — Track N3 |
| **Recharts + Tremor** | Data viz, score gauges, comparison radars, sparklines | ❌ Not in deps — Track N3 |
| **tldraw + tldraw-ai-module** | Live whiteboard Olivia draws on | ❌ Not in deps — Track N4 |
| **Vercel v0 API** | Generative React component on demand | ❌ Not in deps — Track N4 |

### Tier 2 — Domain-specific

| API | Surfaces it powers |
|---|---|
| **CesiumJS** | cluesintelligence 3D globe / city flyovers during relocation reveal |
| **Spline embed** | Pitch deck hero visuals, brand 3D moments |
| **Sketchfab API** | Property matterport-style + HEARTBEAT 3D anatomy |
| **BioDigital Human** | HEARTBEAT cardiac visualization (clinical-grade) |
| **Google Street View Static** | clues-property-search location previews |
| **Mapillary** | Open-source street imagery for London transit + budget property views |
| **Plotly.js** | clueslondon valuation charts (financials need more than Recharts) |
| **Vis-timeline** | Pitch milestones, HEARTBEAT recovery timeline |
| **Cytoscape.js** | "See Olivia's brain" — knowledge graph viewer |
| **Deck.gl** | Large-scale geo overlays (transit ridership, climate) |

### Tier 3 — Generative media

| API | Why |
|---|---|
| **fal.ai** | Fast image/video gen (FLUX, SDXL, Veo). Lower latency than Replicate |
| **Runway Gen-4 / Luma Dream Machine** | Short video clips for pitch B-roll |
| **Cartesia Sonic 2** | **Sub-300ms TTS** — replaces ElevenLabs in real-time path; ElevenLabs stays for premium async. **Voice-latency fix (W-003).** |
| **Tavus** | Better lip-sync; evaluation + add as fallback in cascade (W-005) |
| **Krea Realtime** | Live brainstorming canvas (real-time AI image gen) |
| **OpenAI Realtime API** | Sub-300ms voice + parallel tool dispatch |

### Tier 4 — Tool dispatch (agentic-credibility fix)

| API | Why |
|---|---|
| **Composio** | 200+ pre-built tool integrations. Already in `package.json` (`@composio/core`), not wired. Closes tool-use depth gap vs Claude Computer Use / OpenAI Operator (W-001). |

Full env-var declarations and provider-file targets are tracked in `docs/API_INTEGRATION_BACKLOG.md` §10. Implementation lands in `docs/BUILD_SEQUENCE.md` Track N + Track O.

---

## Weakness Backlog

Append-only. Items resolve only on explicit user say-so. New observations from competitive analysis, code review, or build sessions land here and fold into `docs/BUILD_SEQUENCE.md` as new sessions.

| # | Weakness | Source | Folded into |
|---|---|---|---|
| W-001 | Composio dependency present but not wired — tool-use / computer-use depth missing | 2026-05-03 competitive analysis | Track O Session O1 |
| W-002 | Eval runtime (Braintrust, Patronus, Cleanlab, red-team) is scaffolded, not producing weekly numbers | 2026-05-03 competitive analysis | Track O Session O2 (extends Track K Session 27) |
| W-003 | Voice latency ~1.2s end-to-end; sub-600ms is 2026 table stakes | 2026-05-03 competitive analysis | Track O Session O3 (extends Track E Session 17) |
| W-004 | `src/lib/rag/citation-first.ts` (~20 KB) is unwired — no clickable citations on Olivia's claims, parity gap vs Hebbia | 2026-05-03 competitive analysis | Track O Session O4 |
| W-005 | LiveAvatar lip-sync at parity, not leadership — Tavus / HeyGen Interactive Avatar quality is ahead | 2026-05-03 competitive analysis | Track O Session O5 |
| W-006 | 250-agent registry is specs not behavior — risk of "library of facades" until Track H lands | OLIVIA_BUILD_STATE audit | Track H Sessions 21–23 (already scoped) |
| W-007 | UI polish discipline session-over-session is the determinant on whether `01_UI_DESIGN_SYSTEM.md` ceiling actually gets hit | 2026-05-03 competitive analysis | Spread across Tracks C / N (no single fix; gate every session on visual review) |
| W-008 | LTM map links to `/directory/{id}` and `/videos/{id}` routes that don't exist in Olivia Brain — clicks 404 until route stubs ship | 2026-05-03 Session 7 typecheck | Track J (vertical adapters) or earlier — stub routes in `src/app/directory/[slug]/page.tsx` + `src/app/videos/[id]/page.tsx` |
| W-009 | LTM documents subsystem entanglement — port surfaced 3 missed LTM utility files (`@/types/blocks`, `@/lib/autolinker`, `@/lib/documents/content`); Clerk dependencies in BookmarkButton + DocumentActionBar; OrgMapProvider used by 4 blocks (not 2 as manifest claimed); react-markdown + remark-gfm dependencies; DocumentRenderer routes break when any block defers; cannot ship clean without Clerk strategy | 2026-05-03 Session 7 attempted port | Session 8 with explicit Clerk plan first (either pull Track F Session 18 forward or build a Clerk-stub provider) |
| W-010 | `ExternalOverlayProvider` (from `src/components/ExternalLinkFrame.tsx`) not yet wrapped in `src/app/layout.tsx` — clicks on external links from `StreetViewModal` are inert (graceful no-op due to default-context fallback) | 2026-05-03 Session 7 map port | Layout integration session (precedes Track C UI rebuild) |
| W-011 ✅ | Olivia Brain has **no Tailwind** installed; LTM map files use 223+ Tailwind classes (`flex items-center`, `text-brand-400`, `bg-[#0a0e1a]`, etc.) that are **inert** in Olivia Brain — they render as HTML attributes without styling. Map renders structurally (3D Google Maps + Mapbox SDK do their own styling) but the React-rendered control panels / overlays / search bar lack visual fidelity. | 2026-05-03 Session 7 styling audit | **RESOLVED Session 14 (commit `21fbecf`):** Tailwind v4 installed via `@tailwindcss/postcss`; `@theme` block in `src/styles/tokens.css` exposes canonical Aurum + Aether tokens as utility classes; map's 223+ classes now render correctly. |
| W-012 ✅ | CSS token names diverge between LTM `globals.css` and Olivia Brain `globals.css`. LTM: `--background`, `--foreground`, `--card-bg`, `--card-border`, `--accent`. Olivia Brain: `--bg`, `--text`, `--panel`, `--border`, `--gold`. Only `--muted` matches. LTM also imports a separate `app/design-tokens.css` not ported. `var(--xxx)` references in ported files mostly resolve to nothing. | 2026-05-03 Session 7 styling audit | **RESOLVED Session 14 (commit `21fbecf`):** `src/styles/tokens.css` declares backward-compat aliases (`--background → --canvas-base-srgb`, `--card-bg → --surface-1-srgb`, `--card-border → --border-default`, `--accent → --aurum-primary-srgb`, `--bg → --canvas-base-srgb`, `--text → --fg-primary-srgb`, `--gold → --aurum-primary-srgb`, `--brand-50` … `--brand-900`). All `var(--xxx)` references in ported files now resolve. |
| W-014 | `match_calendar_memory()` PostgreSQL function not installed in Olivia Brain Supabase. `src/lib/calendar/calendar-memory.searchCalendarMemory()` calls it via `prisma.$queryRawUnsafe` for cosine-similarity semantic search over `calendar_memory_chunks.embedding` (pgvector). Wrapped in try/catch — degrades gracefully to empty array + console warning. No runtime crash, but semantic search returns nothing until the SQL function is installed. | 2026-05-03 Session 9 (Track Calendar C2) port | Operator action: write + apply SQL function to Olivia Brain Supabase when calendar memory becomes a user-facing feature. LTM reference for the function body: search `D:\London-Tech-Map\prisma\sql\` for `match_calendar_memory`. Likely lands alongside C5 (calendar UI) or C6 (smoke tests). |
| W-015 | Clerk auth STUB at `src/lib/auth/session.ts`. C4 routes (Twilio user-facing endpoints) call `getAuthSession()` instead of Clerk's `auth()`. Stub reads `STUB_USER_ID` env var in dev/preview, throws clearly when env unset OR in production. NOT a band-aid — throws-loudly-on-missing prevents accidental auth-less deploys. Cannot run in production until replaced. | 2026-05-03 Session 11 (Track Calendar C4) port | Track F Session 18 wires Clerk: `npm install @clerk/nextjs`, configure middleware, replace body of `getAuthSession()` with `const { userId } = await auth(); return { userId };` (one-line change). Route code stays identical. |
| W-013 ✅ | Calendar UI ports use Tailwind classes that are inert in Olivia Brain (same gap as W-011/W-012 for the map). 15 components in `src/components/calendar/*` + `OliviaConsentModal` use Tailwind utility classes throughout (`flex`, `text-[var(--muted)]`, `bg-brand-600`, etc.). Without Tailwind installed, classes render as HTML attributes without styling — components mount, FullCalendar event grid renders structurally, but visual fidelity is degraded. | 2026-05-03 Session 12 (Track Calendar C5) port | **RESOLVED Session 14 (commit `21fbecf`):** same fix as W-011 + W-012 — Tailwind v4 + backward-compat aliases unblock both Tailwind utility classes and `var(--xxx)` token references on calendar UI files. |
| W-016 | `SystemAlert` Prisma model not in Olivia Brain schema. `src/lib/system-alerts.ts` (ported in C5 for cron route alerting) was adapted from LTM's `prisma.systemAlert.create` to a console-only stub. Cron failures log to stderr but are not persisted — no admin dashboard visibility. | 2026-05-03 Session 12 (Track Calendar C5) port | Add `SystemAlert` model to `prisma/schema.prisma` (LTM reference at `D:\London-Tech-Map\prisma\schema.prisma:2320` — 9 fields: id, source, severity, title, message, metadata Json, isRead, isArchived, createdAt) + restore the `prisma.systemAlert.create` call from LTM. Likely Track O (Weakness Closure) or whenever an admin-alerts dashboard is built. |

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
- `D:\London-Tech-Map` — **READ-ONLY external codebase**

### Working with London-Tech-Map (LTM) — ABSOLUTE RULES

LTM is a separate, live, production app. Olivia Brain has its own roadmap that involves
**copying** Olivia and Studio components out of LTM into this repo so Olivia can ship as a
standalone service. While this work is in progress:

1. **NO file in `D:\London-Tech-Map` may be deleted, renamed, edited, moved, or altered
   in any way.** Read-only. Always.
2. **Components are COPIED, never moved.** When this repo ports `OliviaVideoAvatar.tsx`
   from LTM, the LTM original stays exactly where it is, untouched. LTM's live
   integration with LiveAvatar must keep working at all times.
3. **Olivia integrates with CLUES domain data via adapters**, not by copying domain logic.
   The Olivia/Studio UI port is the only category of LTM code that comes into this repo.
4. **No PRs, branches, or commits target the LTM repo from Olivia Brain sessions.**
   If LTM ever needs a change, that's a separate session in the LTM repo — and only with
   explicit user approval.

See `docs/HEYGEN_LTM_CONFIG.md` for the LiveAvatar contracts that must be preserved
byte-for-byte during the port, and `docs/MERGE_PLAN.md` for the full migration plan.

---

## Deployment

- `main` deploys to Vercel production
- Feature branches deploy to Vercel previews
- GitHub Actions verifies lint, typecheck, and build on push
