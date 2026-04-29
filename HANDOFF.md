# OLIVIA BRAIN - AGENT HANDOFF

## CRITICAL: READ THESE FILES FIRST
1. **`BATTLE_PLAN.md`** — 186-item roadmap, current sprint status, checkbox tracking
2. **`OLIVIA_BUILD_STATE.md`** — Which items are independent vs blocked on other apps
3. **`docs/final-stack.md`** — 9-model cascade, persona specs, target architecture
4. **`docs/olivia-core-architecture.md`** — Multi-app integration patterns

## REPO LOCATIONS
- **GitHub:** https://github.com/johndesautels1/Olivia-Brain
- **Local:** `D:\Olivia Brain`

## CURRENT STATUS (~65% complete — 120/186 items)

| Phase | Status |
|-------|--------|
| Phase 1: Foundation (5 sprints) | ✅ Complete |
| Phase 2: Voice & Avatar (4 sprints) | ✅ Complete |
| Phase 3: Domain Intelligence (7 sprints) | 🔄 4/7 sprints complete |
| Phase 4: Multi-Agent Beast Mode (6 sprints) | 🔄 3/6 sprints complete, Sprint 4.6 in progress |
| Phase 5: Multi-Tenant & White-Label (3 sprints) | ⏳ Pending |

**Current Sprint:** 4.6 — CLUES Product Integration (6/10 items done)

**Next independent work (not blocked on other apps):**
- Sprint 3.3 — Real Estate Data Layer (8 items)
- Sprint 3.7 — Report Generation (5 items)
- Sprint 4.1 — Persona System (14 items)
- Sprint 4.2 — 250-Agent Dashboard (12 items)
- Phase 5 — Multi-Tenant & White-Label (15 items)

## 9-MODEL CASCADE (MEMORIZE THIS)
| # | Model | Role |
|---|-------|------|
| ① | Gemini 3.1 Pro | Biographical extraction |
| ② | Sonnet 4.6 | Primary evaluator |
| ③ | GPT-5.4 Pro | Secondary evaluator |
| ④ | Gemini 3.1 Pro | Verification + Google Search |
| ⑤ | Grok 4 | Math/equations ONLY |
| ⑥ | Perplexity Sonar Reasoning Pro | Questionnaires + citations |
| ⑦ | Tavily | Web research MCP |
| ⑧ | Opus 4.6 (Cristiano™) | THE JUDGE |
| ⑨ | Mistral Large | Multilingual fallback |

## KEY FILES
- `src/lib/services/model-cascade.ts` — Cascade implementation
- `src/lib/orchestration/phase1-graph.ts` — LangGraph workflow
- `src/lib/config/env.ts` — Environment configuration
- `src/lib/memory/store.ts` — Memory layer
- `src/lib/bridge/` — UKP bridge infrastructure
- `src/lib/adapters/registry.ts` — Domain app registry
- `src/lib/clues-intelligence/` — Embedded CLUES reference data
- `supabase/migrations/` — Database schemas

## RULES
1. Commit + push after EVERY task
2. No corner cutting
3. Update BATTLE_PLAN.md as you complete items
4. NEVER run local builds — Vercel builds from git
5. Read OLIVIA_BUILD_STATE.md to know what's blocked vs independent

## START COMMAND
```
cd "D:\Olivia Brain"
git pull origin main
npm install
```

Then read BATTLE_PLAN.md and pick up from the current sprint.
