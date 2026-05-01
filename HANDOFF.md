# OLIVIA BRAIN — NEXT AGENT HANDOFF

**Date:** 2026-05-01
**Last Session:** Studio-Olivia Integration (Phase 1 complete)
**Latest Commit:** `ce6f677` — feat: Add Pitch Intelligence module backported from Studio-Olivia

---

## REPO LOCATIONS

| What | Where |
|------|-------|
| **Primary Repo** | `D:\Olivia Brain` |
| **GitHub** | https://github.com/johndesautels1/Olivia-Brain |
| **Studio-Olivia Alternates** | `D:\Studio-Olivia\` (3 files, 70-95KB each) |
| **LTM Olivia Reference** | `D:\London-Tech-Map\src\lib\olivia\` |

---

## WHAT WAS BUILT THIS SESSION

### Pitch Intelligence Module (2,417 lines, 9 files)

**Commit:** `ce6f677`

| File | Lines | Content |
|------|-------|---------|
| `src/lib/pitch/types.ts` | 110 | Type definitions |
| `src/lib/pitch/constants.ts` | 85 | Colors, 5 themes |
| `src/lib/pitch/personas.ts` | 50 | 5 investor personas |
| `src/lib/pitch/slides.ts` | 180 | 16 slide types + fields + feedback |
| `src/lib/pitch/documents.ts` | 140 | 10 doc categories, 16 plan sections |
| `src/lib/pitch/archetypes.ts` | 800 | **75 pitch deck archetypes** |
| `src/lib/pitch/templates.ts` | 130 | **12 business plan templates** |
| `src/lib/pitch/scoring.ts` | 230 | scoreDecks(), scoreTemplates() |
| `src/lib/pitch/index.ts` | 75 | Module exports |

### What's Now Available
```typescript
import {
  scoreDecks,
  getTopDecks,
  DECKS,           // 75 archetypes (Airbnb, Uber, Sequoia, YC, etc.)
  BIZ_TEMPLATES,   // 12 templates
  PERSONAS,        // 5 investor personas
  THEMES,          // 5 London themes
  SLIDE_META,      // 16 slide types
  SLIDE_FIELDS,    // Field schemas per slide
  FEEDBACK_SEEDS,  // Coaching hints
  DOC_CATEGORIES,  // 10 categories, 100+ docs
} from "@/lib/pitch";
```

---

## YOUR TASK: Complete Studio-Olivia Integration (6 remaining items)

### HIGH PRIORITY (Do First)

| # | Task | Effort | Files to Create |
|---|------|--------|-----------------|
| 1 | **Auto-optimize LLM rewrite logic** | Medium | `src/lib/pitch/optimize.ts` |
| 2 | **Create agent group 2H — Pitch Intelligence** | Medium | Update `registry.ts` |
| 3 | **Wire pitch system to architecture** | High | API routes, handlers |

### MEDIUM/LOW PRIORITY

| # | Task | Effort | Files to Create |
|---|------|--------|-----------------|
| 4 | Port UI components (AvatarOrb, CompletionRing, Badge, ConsensusDots) | Low | `src/components/pitch/` |
| 5 | Port auto-save + workspace persistence hooks | Low | `src/hooks/useAutoSave.ts` |
| 6 | Port keyboard shortcuts (J/K nav, Ctrl+T, Escape) | Low | `src/hooks/useKeyboardNav.ts` |

---

## ULTIMATE OLIVIA COMPARISON TABLE (Reference)

### Architecture Summary

| Dimension | **Olivia Brain** (Source) | **Studio-Olivia** | **LTM Olivia** |
|-----------|---------------------------|-------------------|----------------|
| Agent Count | 119 (targeting 250) | None (monolithic) | 22 (G1-xxx) |
| 9-Model Cascade | ✅ Full | ❌ | ✅ Via orchestrator |
| Personas | 3 (Olivia/Cristiano/Emelia) | ✅ In chat | ✅ Entity persona |
| Memory | Episodic/Semantic/Procedural | localStorage | OliviaUserMemory |
| Voice | ElevenLabs + OpenAI TTS | ❌ | OpenAI TTS |
| Avatar | Simli → HeyGen → D-ID | AvatarOrb UI | HeyGen 240px |

### Pitch System (Now in Olivia Brain)

| Feature | **Olivia Brain** | **Studio-Olivia** | **LTM** |
|---------|------------------|-------------------|---------|
| 75 Archetypes | ✅ `archetypes.ts` | ✅ Source | ❌ |
| 12 Templates | ✅ `templates.ts` | ✅ Source | ❌ |
| 5 Personas | ✅ `personas.ts` | ✅ Source | ❌ |
| 5 Themes | ✅ `constants.ts` | ✅ Source | ❌ |
| 16 Slide Types | ✅ `slides.ts` | ✅ Source | ❌ |
| Scoring | ✅ `scoring.ts` | ✅ Source | ❌ |
| Auto-Optimize | ⏳ Pending | ✅ Source | ❌ |
| UI Components | ⏳ Pending | ✅ Source | ❌ |

### Still Only in Studio-Olivia (Backport Needed)

| Feature | Description |
|---------|-------------|
| `askOlivia()` | Live Anthropic API call with web_search tool |
| `runAutoOptimize()` | Per-slide LLM rewrite with confidence scoring |
| AvatarOrb | Animated gradient orb component |
| CompletionRing | SVG completion indicator |
| ConsensusDots | 5-dot consensus display |
| Badge | Color-coded percentage badge |
| DeckDetailModal | Full archetype detail modal |
| War Room UI | 3-column command center layout |
| Auto-save | 1.5s debounce + localStorage |
| J/K Navigation | Slide/section keyboard nav |

### Still Only in LTM Olivia (Backport Needed)

| Feature | Description |
|---------|-------------|
| Consent Model | `OliviaConsent` table for learning |
| Calendar Tools | G1-165/166/167/168 agents |
| SMS via Twilio | `send_sms` tool |
| Entity Persona | `buildEntityPersonaPrompt()` |
| Valuation Tools | 6 tools (run, get, explain, compare, gaps, suggest) |

---

## BUILD STATUS (Updated)

| Phase | Status | Items |
|-------|--------|-------|
| Phase 1: Foundation | Complete | 39/39 |
| Phase 2: Voice & Avatar | Complete | 25/25 |
| Phase 3: Domain Intelligence | In Progress | 44/52 (8 remaining) |
| Phase 4: Multi-Agent Beast Mode | In Progress | 24/54 (30 remaining) |
| **Phase 4.5: Studio-Olivia Integration** | **In Progress** | **10/16** |
| Phase 5: Multi-Tenant & White-Label | Pending | 0/15 |
| **TOTAL** | | **143/202** (~71%) |

### Phase 4.5: Studio-Olivia Integration (NEW)

| # | Task | Status |
|---|------|--------|
| 1 | Extract 75 pitch deck archetypes | ✅ |
| 2 | Extract 12 business plan templates | ✅ |
| 3 | Extract 5 investor personas | ✅ |
| 4 | Extract 5 London themes | ✅ |
| 5 | Extract 16 slide types + SLIDE_META | ✅ |
| 6 | Extract SLIDE_FIELDS schema | ✅ |
| 7 | Extract FEEDBACK_SEEDS coaching | ✅ |
| 8 | Extract 10 document categories | ✅ |
| 9 | Port scoreDecks() + scoreTemplates() | ✅ |
| 10 | Commit to GitHub | ✅ `ce6f677` |
| 11 | Port auto-optimize LLM logic | ⏳ |
| 12 | Port UI components | ⏳ |
| 13 | Port auto-save hooks | ⏳ |
| 14 | Port keyboard shortcuts | ⏳ |
| 15 | Create agent group 2H | ⏳ |
| 16 | Wire to architecture | ⏳ |

---

## DATABASE MIGRATION STATUS

- Prisma schema updated with 8 new tables ✓
- Prisma client regenerated ✓
- **DB migration NOT yet run** — needs `npx prisma db push` with DATABASE_URL

---

## KEY FILES TO READ

### Pitch Module (Just Built)
```
D:\Olivia Brain\src\lib\pitch\
├── index.ts          # Main exports
├── types.ts          # Type definitions
├── constants.ts      # Colors, themes
├── personas.ts       # 5 investor personas
├── slides.ts         # 16 slide types
├── documents.ts      # 10 doc categories
├── archetypes.ts     # 75 decks
├── templates.ts      # 12 templates
└── scoring.ts        # Scoring algorithms
```

### Agent System (Reference)
```
D:\Olivia Brain\src\lib\agents\
├── registry.ts       # 119 agent definitions
├── engine.ts         # Execution engine
├── handlers.ts       # Handler interface
└── types.ts          # Type definitions
```

### Studio-Olivia Source (For Remaining Backports)
```
D:\Studio-Olivia\GrokVersionStudioOlivia.tsx
Lines 174-207: askOlivia() + runAutoOptimize()
Lines 47-56: UI components (ConsensusDots, Badge, CompletionRing, AvatarOrb)
Lines 200-207: Keyboard shortcuts
```

---

## BEHAVIORAL RULES

1. **Read `src/lib/pitch/` first** — Understand what's already ported
2. **One task at a time** — Complete one, report, wait for direction
3. **Commit + Push after any changes** — Vercel deploys from git
4. **Read CLAUDE.md** at `C:\Users\broke\CLAUDE.md` for master rules
5. **Update this handoff** before ending session

---

## START SEQUENCE

```bash
cd "D:\Olivia Brain"
git pull origin main
```

Then complete the remaining 6 Studio-Olivia integration tasks in priority order.
