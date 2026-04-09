# CLUES INTELLIGENCE ARCHITECTURE — OLIVIA BRAIN MASTER REFERENCE

> **PURPOSE**: This document burns the complete CLUES domain intelligence architecture into Olivia Brain.
> Every AI assistant working on Olivia MUST read this file FIRST before any questionnaire, extraction,
> adaptive, or evaluation work.
>
> **Source of Truth**: `D:\Clues Main` (fully built system)
> **Question Library**: `D:\clues-questionnaire-engine` (2,486 questions)
> **Last Updated**: 2026-04-09

---

## 1. THE COMPLETE CLUES FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLUES DECISION PIPELINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: PARAGRAPHICAL (30 free-form paragraphs)                          │
│      │                                                                      │
│      ▼                                                                      │
│  GEMINI 3.1 PRO PREVIEW extracts 100-250 numbered metrics                  │
│      │                                                                      │
│      ▼                                                                      │
│  PHASE 2: MAIN MODULE (200 structured questions)                           │
│      │   ├── Demographics (34Q)                                            │
│      │   ├── Do Not Wants / Dealbreakers (33Q)                             │
│      │   ├── Must Haves / Non-Negotiables (33Q)                            │
│      │   ├── Trade-offs (50Q)                                              │
│      │   └── General Questions (50Q)                                       │
│      │                                                                      │
│      ▼                                                                      │
│  MODULE RELEVANCE ENGINE determines which specialty modules needed          │
│      │                                                                      │
│      ▼                                                                      │
│  PHASE 3: SPECIALTY MODULES (23 modules, ~100Q each)                       │
│      │   Adaptive Engine (CAT) selects questions per user                  │
│      │   Target: MOE ≤ 2%                                                  │
│      │   User sees 150-587+ questions (varies per person)                  │
│      │                                                                      │
│      ▼                                                                      │
│  5-LLM PARALLEL EVALUATION + TAVILY RESEARCH                               │
│      │                                                                      │
│      ▼                                                                      │
│  OPUS/CRISTIANO JUDGE renders verdict                                       │
│      │                                                                      │
│      ▼                                                                      │
│  OUTPUT: Country → Top 3 Cities → Top 3 Towns → Top 3 Neighborhoods        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. PHASE 1: THE PARAGRAPHICAL (30 Paragraphs)

### 2.1 Paragraph Structure

The Paragraphical follows the CLUES decision pipeline across 6 phases:

| Phase | Paragraphs | Section | Purpose |
|-------|------------|---------|---------|
| 1 | P1-P2 | Your Profile | Demographics, current situation |
| 2 | P3 | Do Not Wants | Dealbreakers (hard walls) |
| 3 | P4 | Must Haves | Non-negotiables (requirements) |
| 4 | P5 | Trade-offs | Priority weighting |
| 5 | P6-P28 | Module Deep Dives | 23 paragraphs (1 per category module) |
| 6 | P29-P30 | Your Vision | Dream day, anything else |

### 2.2 Module Deep Dive Paragraphs (P6-P28)

Organized by funnel tier (Survival → Foundation → Infrastructure → Lifestyle → Connection → Identity):

**TIER 1: SURVIVAL**
- P6: Safety & Security (`safety_security`)
- P7: Health & Wellness (`health_wellness`)
- P8: Climate & Weather (`climate_weather`)

**TIER 2: FOUNDATION**
- P9: Legal & Immigration (`legal_immigration`)
- P10: Financial & Banking (`financial_banking`)
- P11: Housing & Property (`housing_property`)
- P12: Professional & Career (`professional_career`)

**TIER 3: INFRASTRUCTURE**
- P13: Technology & Connectivity (`technology_connectivity`)
- P14: Transportation & Mobility (`transportation_mobility`)
- P15: Education & Learning (`education_learning`)
- P16: Social Values & Governance (`social_values_governance`)

**TIER 4: LIFESTYLE**
- P17: Food & Dining (`food_dining`)
- P18: Shopping & Services (`shopping_services`)
- P19: Outdoor & Recreation (`outdoor_recreation`)
- P20: Entertainment & Nightlife (`entertainment_nightlife`)

**TIER 5: CONNECTION**
- P21: Family & Children (`family_children`)
- P22: Neighborhood & Urban Design (`neighborhood_urban_design`)
- P23: Environment & Community Appearance (`environment_community_appearance`)

**TIER 6: IDENTITY**
- P24: Religion & Spirituality (`religion_spirituality`)
- P25: Sexual Beliefs, Practices & Laws (`sexual_beliefs_practices_laws`)
- P26: Arts & Culture (`arts_culture`)
- P27: Cultural Heritage & Traditions (`cultural_heritage_traditions`)
- P28: Pets & Animals (`pets_animals`)

### 2.3 Gemini Extraction Output

Gemini 3.1 Pro Preview extracts **100-250 numbered metrics** from paragraphs:

```typescript
interface GeminiMetricObject {
  id: string;                      // "M1", "M2", etc.
  fieldId: string;                 // Machine-readable field ID
  description: string;             // "Average winter temperature 20-25C"
  category: string;                // One of 23 module IDs
  source_paragraph: number;        // Which paragraph (1-30)
  score: number;                   // 0-100
  user_justification: string;      // Why this matters to the user
  data_justification: string;      // Real-world data backing the score
  source: string;                  // Data source attribution
  data_type: 'numeric' | 'boolean' | 'ranking' | 'index';
  research_query: string;          // What Tavily should search
  threshold?: {
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
    value: number | [number, number];
    unit: string;
  };
}
```

**Key principle**: Every metric is:
- **Numbered** (M1, M2, M3...)
- **Categorized** (maps to one of 23 modules)
- **Sourced to a paragraph** (P3, P10, P14)
- **Researchable** (Tavily can find real data)
- **Scorable** (number, boolean, or ranking)

---

## 3. PHASE 2: MAIN MODULE (200 Questions)

### 3.1 Structure

The Main Module is 200 questions across 5 sections in 3 files:

| File | Section | Questions | Range |
|------|---------|-----------|-------|
| `main_module.ts` | Demographics | 34 | Q1-Q34 |
| `main_module.ts` | Do Not Wants (Dealbreakers) | 33 | Q35-Q67 |
| `main_module.ts` | Must Haves (Non-Negotiables) | 33 | Q68-Q100 |
| `tradeoff_questions.ts` | Trade-offs | 50 | Q1-Q50 |
| `general_questions.ts` | General Questions | 50 | Q1-Q50 |

**Total: 200 questions**

### 3.2 Demographics Section (34 Questions)

Covers foundational facts:
- Nationality, citizenship, dual citizenship (Q1-Q3)
- Age, relationship status, partner relocation (Q4-Q7)
- Children: count, ages, special needs (Q8-Q11)
- Education, skilled trades, military (Q12-Q15)
- Employment: current status, plan, industry, work arrangement (Q16-Q19)
- Income, housing situation, housing cost, bedrooms (Q20-Q24)
- Current area type, population (Q25-Q26)
- Health conditions, medical needs (Q27-Q28)
- Transportation modes (Q29)
- Pets: type, count, breed restrictions (Q30-Q32)
- Languages, relocation timeline (Q33-Q34)

### 3.3 Do Not Wants / Dealbreakers Section (33 Questions)

**Type**: `Dealbreaker` (severity scale)

These are HARD WALLS. If a city hits any, it's eliminated regardless of score.

Categories covered:
- Climate extremes: heat, cold, humidity, natural disasters, air pollution, water quality (Q35-Q40)
- Cultural: language barriers, restrictive laws, lack of diversity, hostility to foreigners (Q41-Q44)
- Social: gender/LGBTQ+ discrimination, religious intolerance (Q45-Q46)
- Infrastructure: poor healthcare, unreliable utilities, poor internet (Q47-Q49)
- Financial: high taxes without services, high COL, unstable economy (Q50-Q52)
- Governance: authoritarian, corruption, political instability (Q53-Q55)
- Safety: high crime, safety concerns for women/minorities (Q56-Q57)
- Legal: complex visa, car-dependent, poor transit (Q58-Q60)
- Career: lack of opportunities (Q61)
- Lifestyle: no specific foods, isolation from family, limited education (Q62-Q64)
- Environment: limited airport access, noise/overcrowding, no green space (Q65-Q67)

### 3.4 Must Haves / Non-Negotiables Section (33 Questions)

**Type**: `Likert-Importance` (importance scale)

These are REQUIREMENTS. Unlike dealbreakers (what you reject), these are what must be PRESENT.

Categories covered:
- Language, welcoming attitude (Q68-Q69)
- Career: job opportunities, legal work authorization (Q70-Q71)
- Financial: affordable COL, affordable housing, stable economy (Q72-Q74)
- Legal: legal protection, property rights (Q75)
- Health: quality healthcare (Q76)
- Safety: low crime (Q77)
- Governance: political stability (Q78)
- Environment: clean air/water/streets (Q79-Q80)
- Tech: high-speed internet, reliable utilities (Q81-Q82)
- Transit: public transportation, walkable, airport access (Q83-Q85)
- Lifestyle: outdoor recreation, food scene, culture, fitness, nightlife (Q86-Q90)
- Education: good schools (Q91)
- Career: networking, professional development (Q92)
- Family: family-friendly environment (Q93)
- Community: expat/international community, religious community (Q94-Q95)
- Pets: pet-friendly (Q96)
- Climate: suitable weather (Q97)
- Values: happiness/life satisfaction, diversity/inclusion, proximity to family (Q98-Q100)

### 3.5 Trade-offs Section (50 Questions)

**Type**: `Slider` (0-100, left-right extremes)

Trade-offs pit categories against each other to determine priority weighting.

| Subsection | Questions | Trade-off Theme |
|------------|-----------|-----------------|
| Safety vs. Lifestyle | Q1-Q6 | Cost for safety, excitement for safety, freedom for safety |
| Cost vs. Quality | Q7-Q12 | Pay more for better infrastructure, smaller home for walkability |
| Climate vs. Opportunity | Q13-Q18 | Tolerate bad climate for career, perfect weather vs. career |
| Career & Financial vs. Lifestyle | Q19-Q24 | Pay cut for quality of life, tax situation vs. lifestyle |
| Social & Cultural vs. Practical | Q25-Q30 | Language barriers, cultural unfamiliarity, distance from family |
| Healthcare & Wellness vs. Other | Q31-Q36 | Distance to hospitals, public healthcare vs. freedom |
| Housing & Neighborhood vs. Location | Q37-Q42 | Worse home for better neighborhood, rent vs. own |
| Freedom & Values vs. Convenience | Q43-Q50 | Bureaucracy for civil liberties, religion for family, censorship |

### 3.6 General Questions Section (50 Questions)

Mixed types: `Single-select`, `Multi-select`, `Slider`, `Text`, `Yes/No`, `Likert-Importance`

| Subsection | Questions | Theme |
|------------|-----------|-------|
| Household & Decision Dynamics | Q1-Q5 | Decision-maker, alignment, family obligations |
| Personality & Psychology | Q6-Q12 | Risk approach, uncertainty tolerance, primary driver |
| Readiness & Key Priorities | Q13-Q17 | International experience, religion, budget split, fears |
| Cultural Adaptation & Integration | Q18-Q23 | Cultural tolerance, language comfort, expat vs. local |
| Social Identity & Community | Q24-Q30 | Social environment, communities needed, support systems |
| Lifestyle Philosophy | Q31-Q36 | Work-life balance, weekend preferences, noise, community size |
| Vision, Planning & Living | Q37-Q44 | Settlement plans, exit strategy, retirement, dwelling type |
| Lifestyle & Values Preferences | Q45-Q50 | Setting preference, gun laws, nightlife, LGBTQ+, political values |

---

## 4. PHASE 3: SPECIALTY MODULES (23 Modules)

### 4.1 The 23 Modules

Each module has ~100 questions. Users only see modules determined relevant by the Module Relevance Engine.

**TIER 1: SURVIVAL**
| Module ID | Name | Questions |
|-----------|------|-----------|
| `safety_security` | Safety & Security | ~100 |
| `health_wellness` | Health & Wellness | ~100 |
| `climate_weather` | Climate & Weather | ~100 |

**TIER 2: FOUNDATION**
| Module ID | Name | Questions |
|-----------|------|-----------|
| `legal_immigration` | Legal & Immigration | ~100 |
| `financial_banking` | Financial & Banking | ~100 |
| `housing_property` | Housing & Property | ~100 |
| `professional_career` | Professional & Career | ~100 |

**TIER 3: INFRASTRUCTURE**
| Module ID | Name | Questions |
|-----------|------|-----------|
| `technology_connectivity` | Technology & Connectivity | ~100 |
| `transportation_mobility` | Transportation & Mobility | ~100 |
| `education_learning` | Education & Learning | ~100 |
| `social_values_governance` | Social Values & Governance | ~100 |

**TIER 4: LIFESTYLE**
| Module ID | Name | Questions |
|-----------|------|-----------|
| `food_dining` | Food & Dining | ~100 |
| `shopping_services` | Shopping & Services | ~100 |
| `outdoor_recreation` | Outdoor & Recreation | ~100 |
| `entertainment_nightlife` | Entertainment & Nightlife | ~100 |

**TIER 5: CONNECTION**
| Module ID | Name | Questions |
|-----------|------|-----------|
| `family_children` | Family & Children | ~100 |
| `neighborhood_urban_design` | Neighborhood & Urban Design | ~100 |
| `environment_community_appearance` | Environment & Community | ~100 |

**TIER 6: IDENTITY**
| Module ID | Name | Questions |
|-----------|------|-----------|
| `religion_spirituality` | Religion & Spirituality | ~100 |
| `sexual_beliefs_practices_laws` | Sexual Beliefs & Laws | ~100 |
| `arts_culture` | Arts & Culture | ~100 |
| `cultural_heritage_traditions` | Cultural Heritage | ~100 |
| `pets_animals` | Pets & Animals | ~100 |

### 4.2 Total Question Library

**2,486 questions** in `D:\clues-questionnaire-engine`:
- Main Module: 200 questions
- 23 Specialty Modules: ~2,286 questions
- Each question has `field_map_key` for LLM reference
- Each question has `modules[]` array showing which modules it informs

---

## 5. THE ADAPTIVE ENGINE (CAT)

### 5.1 What It Does

**Computerized Adaptive Testing** — same math as GRE/GMAT.

The engine selects which questions to ask within recommended modules, maximizing information gain per question. It is **PURE MATH — no LLM calls**. Runs client-side, instant, free.

### 5.2 Core Algorithm

**Expected Information Gain (EIG)**:
```
EIG = predictionUncertainty × smartScoreImpact × moduleWeight
```

- **predictionUncertainty** (0-1): How uncertain we are about this question's answer
- **smartScoreImpact** (0-1): How much this answer affects SMART Scores
- **moduleWeight** (0-1): How relevant this module is for this user

### 5.3 Question Selection

1. Sort all questions by EIG descending
2. Pick the highest-EIG unanswered question
3. User answers
4. Recalculate EIG for remaining questions (answered questions reduce uncertainty for related questions)
5. Reduce module MOE based on information gained
6. Repeat until MOE ≤ 2%

### 5.4 Key Constants

```typescript
const MOE_REDUCTION_PER_ANSWER = 0.15;    // Full answer
const MOE_REDUCTION_PER_PREFILL = 0.10;   // Pre-filled from upstream
const TARGET_MOE = 0.02;                   // 2% margin of error
```

### 5.5 Smart Score Impact by Question Type

| Type | Impact | Reason |
|------|--------|--------|
| Ranking | 0.9 | Explicitly orders user priorities |
| Dealbreaker | 0.85 | Critical for filtering |
| Likert-Importance/Concern | 0.75 | Severity/importance scores |
| Slider/Range | 0.7 | Quantitative nuance |
| Single-select | 0.65 | Clear choice |
| Multi-select | 0.6 | Coverage breadth |
| Likert-Frequency | 0.55 | Behavioral pattern |
| Yes/No | 0.5 | Binary, less nuance |
| Open-text | 0.3 | Requires LLM interpretation |

### 5.6 Pre-fills and Skips

Questions can be pre-filled from upstream data (Paragraphical or earlier Main Module answers):
- Pre-filled questions contribute partial information gain (67% of a full answer)
- Questions are skipped when module MOE target is reached
- User can still see 150-587+ questions depending on their profile complexity

---

## 6. THE MODULE RELEVANCE ENGINE

### 6.1 What It Does

Determines which of the 23 specialty modules are most relevant for a specific user, based on upstream data.

**PURE MATH — no LLM calls** (except Gemini for Paragraphical extraction).

### 6.2 Core Algorithm

**Priority Score**:
```
Priority = relevance × (1 - confidence)
```

- **relevance** (0-1): How important this module is for this user
- **confidence** (0-1): How much data we already have for this module

**High relevance + Low confidence = ASK MORE QUESTIONS**
**High relevance + High confidence = SKIP (already covered)**
**Low relevance = SKIP (doesn't matter for this user)**

### 6.3 Input Sources

1. **Gemini Paragraphical Extraction**: `module_relevance` field (strongest signal)
2. **Demographics Answers**: Deterministic rules (children → family module, pets → pets module)
3. **DNW Answers**: Severity 4-5 = strong signal for related modules
4. **MH Answers**: Importance 4-5 = strong signal for related modules
5. **Trade-off Answers**: Non-neutral sliders boost involved modules
6. **General Answers**: Modest confidence boost across all modules

### 6.4 Demographic Rules (Examples)

| Condition | Module | Boost | Reason |
|-----------|--------|-------|--------|
| has_children = true | family_children | +0.5 | Family services critical |
| has_children = true | education_learning | +0.35 | Education matters |
| has_pets = true | pets_animals | +0.5 | Pet-friendly policies matter |
| employment = remote | technology_connectivity | +0.4 | Internet critical |
| employment = remote | professional_career | +0.3 | Coworking spaces matter |
| employment = retired | health_wellness | +0.35 | Healthcare priority |
| employment = retired | professional_career | -0.3 | Career less relevant |
| age >= 55 | health_wellness | +0.3 | Healthcare more important |
| age < 35 | entertainment_nightlife | +0.2 | Nightlife matters more |

### 6.5 Recommendation Thresholds

```typescript
const RELEVANCE_THRESHOLD = 0.35;   // Below this, don't recommend
const CONFIDENCE_THRESHOLD = 0.75;  // Above this, already covered
```

Module is recommended if: `relevance >= 0.35 AND confidence < 0.75`

---

## 7. THE EVALUATION PIPELINE

### 7.1 5-LLM Parallel Evaluation

| LLM | Web Search Method | Role |
|-----|------------------|------|
| Claude Sonnet 4.6 | Native (Anthropic tool) + Tavily | Balanced analysis |
| GPT-5.4 | Tavily injected | Deep reasoning |
| Gemini 3.1 Pro | Google Search grounding + Tavily | Web data extraction |
| Grok 4.1 Fast Reasoning | X/Twitter + Tavily | Real-time social data |
| Perplexity Sonar Reasoning Pro High | Native search + Tavily | Research synthesis |

### 7.2 Tavily Research

Two APIs:
1. **Research API** (`/research`): Baseline comparison report
2. **Search API** (`/search`): Metric-specific real-time data per city

Every data point has multiple sources with direct URLs.

### 7.3 Opus/Cristiano Judge

**Opus judges EVERY stage** — including Paragraphical-only Discovery tier.

Opus does NOT have web search by design. He judges purely on math, evidence, and reasoning — like a courtroom judge who doesn't do his own investigation.

**What Opus CAN do**:
- Upscore/downscore any metric's consensusScore
- Update legalScore and enforcementScore
- Provide judgeExplanation per metric
- Weigh which LLM to trust more for specific metrics

**What Opus CANNOT do**:
- Override confidence level (must match actual StdDev)
- Override the computed winner (anti-hallucination safeguard)

---

## 8. OUTPUT: LOCATION HIERARCHY

The recommendation structure follows a strict hierarchy:

```
1 COUNTRY (primary, up to 3)
    │
    └── 3 CITIES (top 3 in winning country)
            │
            └── [WINNING CITY]
                    │
                    └── 3 TOWNS (top 3 in winning city)
                            │
                            └── [WINNING TOWN]
                                    │
                                    └── 3 NEIGHBORHOODS (top 3 in winning town)
```

**Country comes first.** The system identifies the best country, THEN drills into cities within that country, THEN towns within the winning city, THEN neighborhoods within the winning town.

---

## 9. KEY FILES IN D:\Clues Main

### 9.1 Data Files

| File | Purpose |
|------|---------|
| `src/data/paragraphs.ts` | 30 paragraph definitions |
| `src/data/modules.ts` | 23 module definitions |
| `src/data/questions/main_module.ts` | Main Module (100Q) |
| `src/data/questions/tradeoff_questions.ts` | Trade-offs (50Q) |
| `src/data/questions/general_questions.ts` | General Questions (50Q) |
| `src/data/questions/*.ts` | 23 specialty module question files |

### 9.2 Intelligence Engines

| File | Purpose |
|------|---------|
| `src/lib/adaptiveEngine.ts` | CAT question selection (pure math) |
| `src/lib/moduleRelevanceEngine.ts` | Module recommendation (pure math) |
| `src/lib/coverageTracker.ts` | Signal strength tracking |
| `src/lib/smartScoreEngine.ts` | SMART Score calculation |
| `src/lib/evaluationPipeline.ts` | 5-LLM parallel evaluation |
| `src/lib/judgeOrchestrator.ts` | Opus/Cristiano judge |
| `src/lib/tavilyClient.ts` | Tavily research integration |

### 9.3 Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useParagraphAdaptive.ts` | Paragraph → adaptive flow |
| `src/hooks/useMainModuleAdaptive.ts` | Main Module adaptive logic |
| `src/hooks/useSkipLogic.ts` | Question skip logic |
| `src/hooks/useModuleState.ts` | Module state management |

### 9.4 Types

| File | Purpose |
|------|---------|
| `src/types/questionnaire.ts` | Questionnaire types |
| `src/types/evaluation.ts` | Evaluation types |
| `src/types/smartScore.ts` | SMART Score types |
| `src/types/judge.ts` | Judge types |

---

## 10. KEY FILES IN D:\clues-questionnaire-engine

| File | Purpose |
|------|---------|
| `src/core/questionLibrary.ts` | 2,486 questions (1.4MB) |
| `src/core/engine.ts` | Core questionnaire flow engine |
| `src/core/scoring.ts` | Bayesian scoring with 12 dimensions |
| `src/types/question.ts` | Question type definitions |
| `src/types/answer.ts` | Answer type definitions |
| `src/types/scoring.ts` | Scoring type definitions |

---

## 11. NON-NEGOTIABLE RULES

1. **30 paragraphs** in Paragraphical (NOT 38)
2. **200 questions** in Main Module (5 sections)
3. **23 specialty modules** (~100 questions each)
4. **2,486 total questions** in library
5. **Target MOE ≤ 2%** — stop when achieved
6. **100-250 metrics** extracted from paragraphs (minimum 100)
7. **Every data point has multiple sources with direct URLs**
8. **Opus judges every stage** — no web search, pure reasoning
9. **Country first** → Cities → Towns → Neighborhoods
10. **Pure math engines** — Adaptive and Relevance engines have NO LLM calls
11. **Users see 150-587+ questions** depending on profile complexity
12. **Pre-fills reduce questions** — upstream data skips redundant questions

---

## 12. OLIVIA'S ROLE

Olivia is the **conversational interface** that:
1. Guides users through the 30 paragraphs
2. Delivers questions selected by the Adaptive Engine
3. Explains why each question was selected
4. Shows progress toward MOE target
5. Speaks the verdict (Simli real-time, HeyGen cinematic)

Olivia does NOT:
- Select questions herself (Adaptive Engine does this)
- Determine module relevance (Module Relevance Engine does this)
- Score cities (Evaluation Pipeline does this)
- Judge results (Opus does this)

Olivia DOES:
- Make the experience conversational and human
- Explain complex concepts simply
- Encourage completion without forcing
- Deliver the emotional "WOW moment" at the end

---

*This file must be read by any AI assistant before working on Olivia Brain questionnaire, extraction, adaptive, or evaluation code. It supersedes any conflicting information.*
