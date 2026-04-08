# OLIVIA BRAIN - AGENT HANDOFF

## CRITICAL: READ THESE FILES FIRST
1. **`D:\Olivia Brain\BATTLE_PLAN.md`** - Full roadmap, 173 features, current sprint status
2. **`D:\Olivia Brain\docs\final-stack.md`** - 9-model cascade, persona specs, target architecture
3. **`D:\Olivia Brain\clues-agent-stack-championship (1).html`** - Master reference (190+ tools)

## REPO LOCATIONS
- **GitHub:** https://github.com/johndesautels1/Olivia-Brain
- **Local:** `D:\Olivia Brain`

## CURRENT STATUS
- **Sprint 1.1:** COMPLETE (Foundation)
- **Sprint 1.2:** COMPLETE (Model Cascade Enhancement)
- **Sprint 1.3:** START NOW (Memory & Personalization)

## 9-MODEL CASCADE (MEMORIZE THIS)
| # | Model | Role |
|---|-------|------|
| ① | Gemini 3.1 Pro | Biographical extraction |
| ② | Sonnet 4.6 | Primary evaluator |
| ③ | GPT-5.4 Pro | Secondary evaluator |
| ④ | Grok 4 | Math/equations ONLY |
| ⑤ | Perplexity Sonar Reasoning Pro | Questionnaires + citations |
| ⑥ | Groq LPU | Near-instant responses |
| ⑦ | Tavily | Web research MCP |
| ⑧ | Opus 4.6 (Cristiano™) | THE JUDGE |
| ⑨ | Mistral Large | Multilingual fallback |

## SPRINT 1.3 TASKS - DO THESE NOW
```
[ ] Apply Supabase migrations to production
[ ] Connect Mem0 for cross-session personalization
[ ] Implement knowledge_chunks table population
[ ] Add semantic search over conversation history
[ ] Implement Memory TTL / forgetting rules
[ ] Add permission-aware indexing (Client A ≠ Client B)
```

## KEY FILES
- `src/lib/services/model-cascade.ts` - Cascade implementation
- `src/lib/memory/store.ts` - Memory layer (UPDATE THIS)
- `src/lib/config/env.ts` - Environment config
- `supabase/migrations/` - Database schemas

## RULES
1. Commit + push after EVERY task
2. No corner cutting
3. Update BATTLE_PLAN.md as you complete items
4. Run `npm run build` to verify

## START COMMAND
```
cd "D:\Olivia Brain"
git pull origin main
npm install
```

Then read BATTLE_PLAN.md and start Sprint 1.3.
