/**
 * Cristiano AI Analysis Pipeline
 *
 * Two-phase pipeline:
 *   Phase 1 — Gemini structures the user's DNA Builder input into a company profile
 *   Phase 2 — Opus judges top 20 pre-filtered orgs and selects the best 3 matches
 *
 * Uses the same API patterns as src/lib/cascade/providers/ (direct fetch).
 */

// ─── Local constants + types (inlined from LTM `analysis/constants.ts`) ─────────
//
// Cristiano is the LLM half of the matchmaking pipeline. The deterministic
// pre-filter (org list + per-org scoring) is LTM-domain and lives upstream
// in the calling track — it reaches Olivia Brain through a
// `UniversalKnowledgeProvider` (the bridge), or any equivalent injectable
// `LoadCandidateOrgsFn` callback. Olivia Brain itself does not own an
// `Organization` Prisma model and never queries one directly. See memory
// `project_ltm_types_no_speculative_generalization` for the rationale.

export const DNA_PARAGRAPH_IDS = [
  "p1", "p2", "p3", "p4", "p5",
  "p6", "p7", "p8", "p9", "p10",
] as const;

export const PARAGRAPH_LABELS: Record<string, string> = {
  p1: "Company Genesis",
  p2: "Product & Technology",
  p3: "Business Model",
  p4: "London Market Opportunity",
  p5: "Traction & Metrics",
  p6: "Team & Advisors",
  p7: "Competitive Landscape",
  p8: "Financial Snapshot",
  p9: "Use of Funds",
  p10: "Vision & Exit Strategy",
};

/**
 * Outreach goal — string-typed in OB rather than an LTM Prisma enum so this
 * file can compile without an `Organization`-bearing schema. Caller validates
 * upstream.
 */
export type OutreachGoal = string;

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CristianoDNAInput {
  paragraphs: Record<string, string>;
  metadata: {
    legalName: string;
    fundingRound: string;
    sectorTags: string[];
  };
  outreachGoal: string;
}

export interface CompanyProfile {
  companyName: string;
  sector: string[];
  stage: string;
  fundingNeed: string;
  productSummary: string;
  teamStrength: string;
  tractionLevel: string;
  idealEntityTypes: string[];
  keyStrengths: string[];
  keyRisks: string[];
  // Financial fields for valuation (extracted from DNA Builder P2, P5, P8, P10)
  annualRevenue?: number;
  arr?: number;
  growthRate?: number;
  grossMargin?: number;
  ebitda?: number;
  ebitdaMarginPct?: number;
  burnRate?: number;
  runway?: number;
  churnPct?: number;
  netRevenueRetentionPct?: number;
  cashOnHand?: number;
  tam?: number;
  sam?: number;
  capitalRaised?: number;
  lastValuation?: number;
  capitalizedBuildCost?: number;
  replacementCost?: number;
  patentCount?: number;
  exitTimeline?: string;
}

export interface CristianoMatch {
  organizationId: string;
  rank: number;
  matchScore: number;
  rationale: string;
  strengths: string[];
  concerns: string[];
  approachStrategy: string;
  matchVectors: {
    sectorAlignment: number;
    strategicFit: number;
    capitalFit: number;
    responseLikelihood: number;
    valuationSynergyFit: number;
  };
  // Synergy data for the valuation engine's strategic synergy method
  valuationSynergy?: {
    annualSynergyValue: number;
    synergyRealizationProbability: number;
    buyerPremiumPct: number;
    synergyRationale: string;
  };
}

export interface CristianoResult {
  companyProfile: CompanyProfile;
  topMatches: CristianoMatch[];
  orgNames: Record<string, { name: string; orgType: string; district: string }>;
  processedAt: string;
  timings: { geminiMs: number; opusMs: number; totalMs: number };
  mode: "preliminary" | "final";
}

/** Valuation data passed to Opus so it can calibrate match recommendations */
export interface ValuationContext {
  enterpriseValue: { low: number; base: number; high: number };
  equityValue?: { low: number; base: number; high: number };
  confidence?: number;
  methods?: Array<{ method: string; enabled: boolean; weight: number; value?: number }>;
  narrative?: string;
}

/** Document evidence summary passed to Opus for richer context */
export interface DocumentEvidenceContext {
  documentCount: number;
  financialMetrics?: {
    annualRevenue?: number;
    arr?: number;
    growthRate?: number;
    grossMargin?: number;
    ebitda?: number;
    ebitdaMarginPct?: number;
    burnRate?: number;
    runway?: number;
    churnPct?: number;
    netRevenueRetentionPct?: number;
    cashOnHand?: number;
    tam?: number;
    sam?: number;
    capitalRaised?: number;
    capitalizedBuildCost?: number;
    replacementCost?: number;
  };
  completenessScore?: number;
  keyFindings?: string[];
}

// ─── Retry Logic ─────────────────────────────────────────────────────────────────

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/**
 * Fetch with exponential backoff retry for transient API failures.
 * Only retries on status codes known to be transient (429, 5xx).
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { maxRetries: number; baseDelayMs: number; label: string },
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const res = await fetch(url, init);

      if (res.ok || !RETRYABLE_STATUS_CODES.has(res.status)) {
        return res; // Success or non-retryable error — return as-is
      }

      // Retryable status — read body for error context, then retry if attempts remain
      const errText = await res.text().catch(() => "");
      lastError = new Error(`${opts.label} API error ${res.status}: ${errText.slice(0, 200)}`);

      if (attempt < opts.maxRetries) {
        const delay = opts.baseDelayMs * Math.pow(2, attempt);
        console.warn(`[cristiano] ${opts.label} returned ${res.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${opts.maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
      }
    } catch (err) {
      // Network error or timeout — retry if attempts remain
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < opts.maxRetries) {
        const delay = opts.baseDelayMs * Math.pow(2, attempt);
        console.warn(`[cristiano] ${opts.label} network error, retrying in ${delay}ms (attempt ${attempt + 1}/${opts.maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error(`${opts.label} failed after ${opts.maxRetries} retries`);
}

// ─── Gemini: Company Profile Structuring ────────────────────────────────────────

function buildGeminiPrompt(input: CristianoDNAInput): string {
  const p = input.paragraphs;
  return `You are Cristiano, an AI analysis engine for the London Tech Capital Index.

A user has described their company/application across 10 sections. Your job is to extract and structure this into a standardized company profile for entity matching.

USER INPUT:
${DNA_PARAGRAPH_IDS.map((id) => `${id.toUpperCase()} - ${PARAGRAPH_LABELS[id]}: ${p[id] || "(not provided)"}`).join("\n")}

METADATA:
Legal Name: ${input.metadata.legalName || "(not provided)"}
Funding Round: ${input.metadata.fundingRound || "(not provided)"}
Sector Tags: ${input.metadata.sectorTags.length > 0 ? input.metadata.sectorTags.join(", ") : "(not provided)"}
Outreach Goal: ${input.outreachGoal.replace(/_/g, " ")}

Return ONLY a JSON object (no markdown fences, no explanation) with this exact structure:
{
  "companyName": "string",
  "sector": ["string"],
  "stage": "pre_seed|seed|series_a|series_b|growth|mature",
  "fundingNeed": "string (e.g. '£750K seed round')",
  "productSummary": "string (2-3 sentences)",
  "teamStrength": "weak|moderate|strong|exceptional",
  "tractionLevel": "pre-revenue|early-revenue|growing|scaling|profitable",
  "idealEntityTypes": ["vc_firm", "angel_network", "accelerator", "enterprise", "scaleup", "corporate_venture", "family_office"],
  "keyStrengths": ["string", "string", "string"],
  "keyRisks": ["string", "string", "string"],
  "annualRevenue": number_or_null,
  "arr": number_or_null,
  "growthRate": number_or_null,
  "grossMargin": number_or_null,
  "ebitda": number_or_null,
  "ebitdaMarginPct": number_or_null,
  "burnRate": number_or_null,
  "runway": number_or_null,
  "churnPct": number_or_null,
  "netRevenueRetentionPct": number_or_null,
  "cashOnHand": number_or_null,
  "tam": number_or_null,
  "sam": number_or_null,
  "capitalRaised": number_or_null,
  "lastValuation": number_or_null,
  "capitalizedBuildCost": number_or_null,
  "replacementCost": number_or_null,
  "patentCount": number_or_null,
  "exitTimeline": "string_or_null"
}

FINANCIAL FIELD RULES:
- Extract financial values from the user's input paragraphs. P5 (Traction & Metrics) and P8 (Financial Snapshot) are the richest sources. P3 (Business Model) has margins. P4 (Market) has TAM/SAM. P2 (Product & Technology) may mention patents/build costs. P10 (Vision & Exit Strategy) may mention exit timeline.
- annualRevenue: Annual revenue in GBP (£). Convert from monthly (MRR×12) if needed.
- arr: Annual recurring revenue in GBP (£). Only for SaaS/subscription businesses.
- growthRate: Year-over-year revenue growth as a percentage (e.g. 120 means 120% YoY).
- grossMargin: Gross margin as a percentage (e.g. 75 means 75%).
- ebitda: Annual EBITDA in GBP (£). If only EBITDA margin is given, compute from revenue.
- ebitdaMarginPct: EBITDA margin as a percentage (e.g. 20 means 20%).
- burnRate: Monthly cash burn in GBP (£).
- runway: Months of remaining runway.
- churnPct: Monthly or annual churn rate as a percentage (e.g. 5 means 5%).
- netRevenueRetentionPct: Net revenue retention as a percentage (e.g. 120 means 120% NRR).
- cashOnHand: Cash on hand / cash balance in GBP (£). Can be derived from burn × runway.
- tam: Total Addressable Market in GBP (£). Convert from billions/millions.
- sam: Serviceable Addressable Market in GBP (£). Convert from billions/millions.
- capitalRaised: Total capital raised to date in GBP (£).
- lastValuation: Last round pre-money valuation in GBP (£).
- capitalizedBuildCost: Cost to build/replicate the technology in GBP (£). Look for R&D spend or development cost mentions.
- replacementCost: Asset replacement value in GBP (£). Look for infrastructure or asset cost mentions.
- patentCount: Number of patents filed or granted.
- exitTimeline: Estimated exit timeline (e.g. "3-5 years").
- If a value is not mentioned or cannot be inferred, use null. Do NOT guess or fabricate numbers.`;
}

async function callGeminiStructure(input: CristianoDNAInput): Promise<CompanyProfile> {
  const prompt = buildGeminiPrompt(input);

  // Try Gemini first, fall back to Anthropic Claude if Gemini is blocked/disabled
  let rawText = "";
  const geminiKey = process.env.GOOGLE_AI_API_KEY;

  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const res = await fetchWithRetry(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(60_000),
        },
        { maxRetries: 1, baseDelayMs: 2_000, label: "Gemini" },
      );

      if (res.ok) {
        const json = await res.json();
        rawText = json.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("\n") ?? "";
      } else {
        console.warn(`[cristiano] Gemini failed (${res.status}), falling back to Claude`);
      }
    } catch (err) {
      console.warn(`[cristiano] Gemini error, falling back to Claude:`, err instanceof Error ? err.message : err);
    }
  }

  // Fallback: use Anthropic Claude (Sonnet) — always available
  if (!rawText) {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) throw new Error("No LLM provider available (both Gemini and Anthropic keys missing)");

    const res = await fetchWithRetry(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(60_000),
      },
      { maxRetries: 2, baseDelayMs: 2_000, label: "Claude-Sonnet" },
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const json = await res.json();
    rawText = json.content?.[0]?.text ?? "";
  }

  const parsed = extractJson<CompanyProfile>(rawText);
  if (!parsed) throw new Error("Failed to parse LLM response as CompanyProfile");

  // Ensure required fields have safe defaults if Gemini omits them
  return {
    companyName: parsed.companyName || "Unknown Company",
    sector: Array.isArray(parsed.sector) ? parsed.sector : [],
    stage: parsed.stage || "seed",
    fundingNeed: parsed.fundingNeed || "",
    productSummary: parsed.productSummary || "",
    teamStrength: parsed.teamStrength || "moderate",
    tractionLevel: parsed.tractionLevel || "pre-revenue",
    idealEntityTypes: Array.isArray(parsed.idealEntityTypes) ? parsed.idealEntityTypes : [],
    keyStrengths: Array.isArray(parsed.keyStrengths) ? parsed.keyStrengths : [],
    keyRisks: Array.isArray(parsed.keyRisks) ? parsed.keyRisks : [],
    // Financial fields — pass through only valid numbers, null → undefined
    annualRevenue: typeof parsed.annualRevenue === "number" ? parsed.annualRevenue : undefined,
    arr: typeof parsed.arr === "number" ? parsed.arr : undefined,
    growthRate: typeof parsed.growthRate === "number" ? parsed.growthRate : undefined,
    grossMargin: typeof parsed.grossMargin === "number" ? parsed.grossMargin : undefined,
    ebitda: typeof parsed.ebitda === "number" ? parsed.ebitda : undefined,
    ebitdaMarginPct: typeof parsed.ebitdaMarginPct === "number" ? parsed.ebitdaMarginPct : undefined,
    burnRate: typeof parsed.burnRate === "number" ? parsed.burnRate : undefined,
    runway: typeof parsed.runway === "number" ? parsed.runway : undefined,
    churnPct: typeof parsed.churnPct === "number" ? parsed.churnPct : undefined,
    netRevenueRetentionPct: typeof parsed.netRevenueRetentionPct === "number" ? parsed.netRevenueRetentionPct : undefined,
    cashOnHand: typeof parsed.cashOnHand === "number" ? parsed.cashOnHand : undefined,
    tam: typeof parsed.tam === "number" ? parsed.tam : undefined,
    sam: typeof parsed.sam === "number" ? parsed.sam : undefined,
    capitalRaised: typeof parsed.capitalRaised === "number" ? parsed.capitalRaised : undefined,
    lastValuation: typeof parsed.lastValuation === "number" ? parsed.lastValuation : undefined,
    capitalizedBuildCost: typeof parsed.capitalizedBuildCost === "number" ? parsed.capitalizedBuildCost : undefined,
    replacementCost: typeof parsed.replacementCost === "number" ? parsed.replacementCost : undefined,
    patentCount: typeof parsed.patentCount === "number" ? parsed.patentCount : undefined,
    exitTimeline: typeof parsed.exitTimeline === "string" ? parsed.exitTimeline : undefined,
  };
}

// ─── Opus: Entity Matching & Judgment ───────────────────────────────────────────

/** Format a number into compact £ notation for the Opus prompt */
function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

export interface CandidateOrg {
  id: string;
  name: string;
  orgType: string;
  primarySector: string | null;
  descriptionShort: string | null;
  fundingStage: string | null;
  employeeRange: string | null;
  district: string | null;
  /** Pre-computed deterministic match score (0–100) supplied by caller. */
  deterministicScore: number;
}

/**
 * Caller-supplied loader for the pre-scored top-20 candidate org list.
 *
 * In LTM-embedded contexts this is wired to `getOrgsForScoring()` +
 * `computeMatchScores(org, goal)` from LTM, then `prisma.organization`
 * for the rich payload. In standalone or non-LTM tenants it routes through
 * the `UniversalKnowledgeProvider` registered in `src/lib/bridge/`.
 *
 * The function MUST return at most 20 entries, already sorted by
 * `deterministicScore` desc.
 */
export type LoadCandidateOrgsFn = (
  goal: OutreachGoal,
) => Promise<CandidateOrg[]>;

function buildOpusPrompt(
  profile: CompanyProfile,
  goal: string,
  candidates: CandidateOrg[],
  valuationData?: ValuationContext,
  documentEvidence?: DocumentEvidenceContext,
): string {
  const candidateList = candidates
    .map(
      (c, i) =>
        `${i + 1}. [ID: ${c.id}] ${c.name} — ${c.orgType.replace(/_/g, " ")}${c.primarySector ? ` | ${c.primarySector}` : ""}${c.fundingStage ? ` | ${c.fundingStage}` : ""}${c.employeeRange ? ` | ${c.employeeRange} employees` : ""}${c.district ? ` | ${c.district}` : ""}${c.descriptionShort ? `\n   ${c.descriptionShort}` : ""}${c.deterministicScore ? ` | Pre-score: ${c.deterministicScore}` : ""}`,
    )
    .join("\n");

  const isFullMode = !!(valuationData || documentEvidence);

  // Build optional VALUATION SUMMARY section
  let valuationSection = "";
  if (valuationData) {
    const ev = valuationData.enterpriseValue;
    const methods = valuationData.methods?.filter(m => m.enabled) ?? [];
    valuationSection = `

VALUATION SUMMARY (from the London Tech Capital Index valuation engine):
- Enterprise Value Range: £${formatCompact(ev.low)} – £${formatCompact(ev.base)} – £${formatCompact(ev.high)} (low / base / high)
${valuationData.equityValue ? `- Equity Value Range: £${formatCompact(valuationData.equityValue.low)} – £${formatCompact(valuationData.equityValue.base)} – £${formatCompact(valuationData.equityValue.high)}` : ""}
${valuationData.confidence != null ? `- Confidence Score: ${(valuationData.confidence * 100).toFixed(0)}%` : ""}
${methods.length > 0 ? `- Valuation Methods Used: ${methods.map(m => `${m.method} (weight: ${(m.weight * 100).toFixed(0)}%${m.value != null ? `, value: £${formatCompact(m.value)}` : ""})`).join(", ")}` : ""}
${valuationData.narrative ? `- Narrative: ${valuationData.narrative}` : ""}

USE THIS DATA to calibrate your match recommendations. A company valued at £200K seeking seed funding is very different from one valued at £50M seeking Series B. Factor the valuation into matchScore, synergyValues, and buyerPremiumPct.`;
  }

  // Build optional DOCUMENT EVIDENCE section
  let documentSection = "";
  if (documentEvidence && documentEvidence.documentCount > 0) {
    const fm = documentEvidence.financialMetrics;
    documentSection = `

DOCUMENT EVIDENCE (${documentEvidence.documentCount} documents analyzed${documentEvidence.completenessScore != null ? `, ${documentEvidence.completenessScore.toFixed(0)}% data completeness` : ""}):
${fm?.annualRevenue != null ? `- Annual Revenue: £${formatCompact(fm.annualRevenue)}` : ""}
${fm?.arr != null ? `- ARR: £${formatCompact(fm.arr)}` : ""}
${fm?.growthRate != null ? `- Growth Rate: ${(fm.growthRate * 100).toFixed(0)}%` : ""}
${fm?.grossMargin != null ? `- Gross Margin: ${(fm.grossMargin * 100).toFixed(0)}%` : ""}
${fm?.burnRate != null ? `- Monthly Burn Rate: £${formatCompact(fm.burnRate)}` : ""}
${fm?.runway != null ? `- Runway: ${fm.runway.toFixed(0)} months` : ""}
${fm?.capitalRaised != null ? `- Capital Raised to Date: £${formatCompact(fm.capitalRaised)}` : ""}
${documentEvidence.keyFindings?.length ? `- Key Findings: ${documentEvidence.keyFindings.join("; ")}` : ""}

USE THIS DATA to inform your analysis. These are verified financial metrics extracted from the user's actual documents — they are more reliable than self-reported DNA paragraph estimates.`.replace(/\n\n+/g, "\n");
  }

  // Mode instruction
  const modeInstruction = isFullMode
    ? `\nMODE: FULL EVALUATION — You have DNA + documents + valuation data. Produce a definitive top-3 recommendation with calibrated scores and specific synergy values grounded in the financial data above.`
    : `\nMODE: PRELIMINARY DIRECTION — You only have DNA paragraphs (no documents or valuation). Produce a directional top-3 recommendation. Note that scores and synergy values are estimates pending document review and valuation.`;

  return `You are Cristiano, the AI analyst for the London Tech Capital Index. You speak directly to the user in first person. The user has described THEIR company/application to you — you are evaluating it and recommending London entities that best fit THEIR goals.

IMPORTANT VOICE RULES:
- Address the user directly: "your company", "your application", "your proposal", "your goals"
- NEVER refer to the user's company as a third party (e.g. "XYZ company" or "the company")
- The 3 recommended entities ARE the third parties — refer to them by name
- Write rationale as though speaking to the user: "Based on your fintech platform, I recommend X because..."
- Approach strategies should say "you should..." or "I recommend you..."
${modeInstruction}

THE USER'S COMPANY PROFILE:
${JSON.stringify(profile, null, 2)}

THEIR OUTREACH GOAL: ${goal.replace(/_/g, " ")}
${valuationSection}${documentSection}

CANDIDATE ENTITIES (top 20 from London's tech ecosystem, pre-scored by deterministic algorithm):
${candidateList}

YOUR TASK: Evaluate the user's company against each candidate entity and select the TOP 3 best matches for their stated outreach goal of "${goal.replace(/_/g, " ")}".

For each of your top 3, provide:
1. A match score (0-100) reflecting overall fit for this user's company and goal
2. A 2-3 sentence rationale explaining WHY this entity is a top match — reference the user's actual product, sector, and needs. Address the user directly.
3. 2-3 specific strengths of the match
4. 1-2 concerns or risks
5. A recommended approach strategy (1-2 sentences telling the user how to engage this entity — use "you should")
6. Match vector scores: sectorAlignment, strategicFit, capitalFit, responseLikelihood, valuationSynergyFit (each 0-100)
7. Valuation synergy estimates: annualSynergyValue (£), synergyRealizationProbability (0-1), buyerPremiumPct (0-50), and a short rationale

Return ONLY a JSON array of exactly 3 objects (no markdown fences, no explanation):
[
  {
    "organizationId": "string (exact ID from candidate list)",
    "rank": 1,
    "matchScore": number,
    "rationale": "string",
    "strengths": ["string", "string"],
    "concerns": ["string"],
    "approachStrategy": "string",
    "matchVectors": {
      "sectorAlignment": number,
      "strategicFit": number,
      "capitalFit": number,
      "responseLikelihood": number,
      "valuationSynergyFit": number
    },
    "valuationSynergy": {
      "annualSynergyValue": number,
      "synergyRealizationProbability": number,
      "buyerPremiumPct": number,
      "synergyRationale": "string"
    }
  }
]

VALUATION SYNERGY RULES:
For each match, estimate synergy values that feed the valuation engine's strategic synergy method. These values quantify how much MORE the user's company is worth TO THIS SPECIFIC ENTITY vs. standalone fair value.

- annualSynergyValue: Estimated annual value (£) of synergies if the entity and user's company work together (e.g. combined revenue uplift, cost savings, distribution synergies). Use the user's financial context to calibrate — synergy should be proportional to the user's revenue scale. If no revenue data, estimate conservatively based on the deal type.
- synergyRealizationProbability: Probability (0.0 to 1.0) that these synergies actually materialize. Factor in execution risk, cultural fit, market conditions, and entity track record.
- buyerPremiumPct: Premium percentage (0 to 50) over standalone fair value that this entity would logically pay, based on buyer type:
  * Angel networks: 0-5%
  * VCs: 5-15%
  * Private equity: 15-30%
  * Strategic partners: 20-40%
  * Acquirers: 25-50%
  Adjust within these ranges based on specific fit quality — higher fit = higher premium.
- synergyRationale: 1-2 sentences explaining WHY these specific synergy values were chosen for this entity-user combination. Reference concrete factors (e.g. "Their distribution network across 12 EU markets would accelerate your SaaS growth, justifying a 25% premium").

VALUATION SYNERGY FIT VECTOR (matchVectors.valuationSynergyFit):
- This is a 0-100 score summarising financial synergy strength between the user's company and this entity.
- Derive it from the synergy data above: high annualSynergyValue + high realization probability + meaningful buyer premium = high score.
- 0 = no financial synergy at all. 100 = transformative financial synergy. Most matches should fall 20-70.

CRITICAL RULES:
- You MUST select from the provided candidate list only — use exact organizationId values
- Consider the outreach goal when ranking — a great VC is useless if the goal is white_label
- Be specific in rationale — reference the user's actual product, sector, and stated needs
- Always address the user directly (your company, your application, your goals)
- Be honest about concerns — do not sugarcoat
- Rank 1 should be the strongest match, rank 3 the weakest of the top 3
- Every match MUST include a valuationSynergy block — do not omit it`;
}

async function callOpusJudge(
  profile: CompanyProfile,
  goal: string,
  candidates: CandidateOrg[],
  valuationData?: ValuationContext,
  documentEvidence?: DocumentEvidenceContext,
): Promise<CristianoMatch[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const prompt = buildOpusPrompt(profile, goal, candidates, valuationData, documentEvidence);

  const res = await fetchWithRetry(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(120_000),
    },
    { maxRetries: 1, baseDelayMs: 3_000, label: "Opus" },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Opus API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const textBlocks = (json.content ?? []).filter(
    (b: { type: string }) => b.type === "text",
  );
  const rawText = textBlocks.map((b: { text: string }) => b.text).join("\n");

  const parsed = extractJsonArray<CristianoMatch>(rawText);
  if (!parsed || parsed.length === 0) {
    throw new Error("Failed to parse Opus response as CristianoMatch array");
  }

  // Validate that Opus returned IDs from the actual candidate list
  const candidateIds = new Set(candidates.map((c) => c.id));
  const validated = parsed.filter((m) => candidateIds.has(m.organizationId));

  if (validated.length === 0) {
    throw new Error("Opus returned no valid organization IDs from the candidate list");
  }

  return validated.slice(0, 3);
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────────

export async function runCristianoAnalysis(
  input: CristianoDNAInput,
  loadCandidateOrgs: LoadCandidateOrgsFn,
  valuationData?: ValuationContext,
  documentEvidence?: DocumentEvidenceContext,
): Promise<CristianoResult> {
  const totalStart = Date.now();

  // Phase 1: LLM structures the company profile (Gemini → Claude fallback)
  const structureStart = Date.now();
  const companyProfile = await callGeminiStructure(input);
  const geminiMs = Date.now() - structureStart;

  // Phase 2: Caller supplies the pre-scored top-20 candidate org list.
  // Olivia Brain does not own an Organization model — the deterministic
  // pre-filter runs upstream (in LTM-embedded contexts via getOrgsForScoring
  // + computeMatchScores; in standalone contexts via the bridge UKP).
  const candidates = (await loadCandidateOrgs(input.outreachGoal))
    .slice(0, 20)
    .sort((a, b) => b.deterministicScore - a.deterministicScore);

  // Phase 3: Opus judges and selects top 3
  const opusStart = Date.now();
  const topMatches = await callOpusJudge(companyProfile, input.outreachGoal, candidates, valuationData, documentEvidence);
  const opusMs = Date.now() - opusStart;

  // Build org name map so the frontend doesn't need a separate lookup
  const orgNames: Record<string, { name: string; orgType: string; district: string }> = {};
  for (const m of topMatches) {
    const cand = candidates.find((c) => c.id === m.organizationId);
    if (cand) {
      orgNames[m.organizationId] = {
        name: cand.name,
        orgType: cand.orgType,
        district: cand.district ?? "",
      };
    }
  }

  const mode = (valuationData || documentEvidence) ? "final" as const : "preliminary" as const;

  return {
    companyProfile,
    topMatches,
    orgNames,
    processedAt: new Date().toISOString(),
    timings: {
      geminiMs,
      opusMs,
      totalMs: Date.now() - totalStart,
    },
    mode,
  };
}

// ─── JSON Extraction Helpers ────────────────────────────────────────────────────

function extractJson<T>(text: string): T | null {
  const cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();

  // Try parsing cleaned text directly first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* fall through to regex */
  }

  // Fallback: find first balanced { ... } using lazy match
  const objMatch = cleaned.match(/\{[\s\S]*?\}(?=[^}]*$)/) || cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]) as T;
    } catch {
      /* fall through */
    }
  }
  return null;
}

function extractJsonArray<T>(text: string): T[] | null {
  const cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();

  // Try parsing cleaned text directly first
  try {
    const result = JSON.parse(cleaned);
    if (Array.isArray(result)) return result as T[];
  } catch {
    /* fall through to regex */
  }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T[];
    } catch {
      /* fall through */
    }
  }

  // Try wrapping object in array
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return [JSON.parse(objMatch[0]) as T];
    } catch {
      /* fall through */
    }
  }

  return null;
}
