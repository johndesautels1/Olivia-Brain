/**
 * G1-130: Build-vs-Buy Decision Agent
 *
 * Founder describes a capability need ("we need a feature flag system",
 * "we need a vendor risk module") and the agent scores six options —
 * build in-house, buy UK SaaS, buy US SaaS, open-source, UK
 * consultancy, fractional / contract — against cost, time-to-value,
 * UK compliance fit, talent lock-in, and the founder's specific
 * constraints. Returns a recommended option, a weighted decision
 * rubric, a compliance check, and the conditions under which the
 * founder should switch options later.
 *
 * Briefing-only — no document spawn.
 *
 * Schedule: on_demand. Inputs:
 *   - userProfileId (founder context)
 *   - capabilityNeed (required, free-form)
 *   - timelineWeeks (when needed)
 *   - budgetRangeGbp { min, max }
 *   - mustHaves
 *   - complianceConstraints (UK GDPR, FCA, ICO, AISI, sovereign-
 *     data, sub-processor restrictions, etc.)
 *   - existingStack (current tools, languages, infrastructure)
 *   - teamSkillsAvailable (what the team can ship in-house)
 *
 * LLM: claude-sonnet-4-6 — structured reasoning + cost analysis.
 *
 * Ported byte-for-byte from London-Tech-Map src/lib/agents/impl/
 * g1-130-build-vs-buy-decision-agent.ts. Eighth per-company handler.
 * First handler that is briefing-only (no document mirror). First
 * handler to use "critical" severity. First handler with self-
 * validation of LLM output (rubric weight sum + option coverage).
 */

import { z } from "zod";
import type { AgentHandler, AgentRunContext, AgentRunResult } from "../handlers";
import { callLLM } from "../llm";
import {
  resolveUserCompany,
  type CompanySource,
  type ResolvedCompanyBase,
} from "../resolve-company";

// ─────────────────────────────────────────────
// Input contract
// ─────────────────────────────────────────────

const OPTION_VALUES = [
  "build_in_house",
  "buy_uk_saas",
  "buy_us_saas",
  "open_source",
  "uk_consultancy",
  "fractional",
] as const;

const RISK_PROFILE_VALUES = ["low", "medium", "high"] as const;
const COMPLIANCE_FIT_VALUES = [
  "blocks",
  "extra_work",
  "neutral",
  "advantage",
] as const;

const G130ExtensionSchema = z.object({
  capabilityNeed: z.string().min(10).max(3000).optional(),
  timelineWeeks: z.number().int().min(1).max(208).optional(),
  budgetRangeGbp: z
    .object({
      min: z.number().nonnegative(),
      max: z.number().nonnegative(),
    })
    .optional(),
  mustHaves: z.array(z.string().min(1).max(200)).max(20).optional(),
  complianceConstraints: z.array(z.string().min(1).max(200)).max(20).optional(),
  existingStack: z.array(z.string().min(1).max(120)).max(40).optional(),
  teamSkillsAvailable: z.array(z.string().min(1).max(120)).max(40).optional(),
});

interface ResolvedBuildBuyInput {
  companyName: string;
  sector: string;
  headquartersLocation: string;
  arr: number | null;
  totalRaised: number | null;
  regulatoryBody: string | null;
  capabilityNeed: string | null;
  timelineWeeks: number | null;
  budgetRangeGbp: { min: number; max: number } | null;
  mustHaves: string[];
  complianceConstraints: string[];
  existingStack: string[];
  teamSkillsAvailable: string[];
  source: CompanySource;
}

async function resolveBuildBuyInput(
  raw: unknown,
): Promise<ResolvedBuildBuyInput> {
  const base: ResolvedCompanyBase = await resolveUserCompany(raw);
  const ext = G130ExtensionSchema.safeParse(raw).data ?? {};

  const hasExtFields =
    Boolean(ext.capabilityNeed) ||
    typeof ext.timelineWeeks === "number" ||
    Boolean(ext.budgetRangeGbp) ||
    Array.isArray(ext.mustHaves) ||
    Array.isArray(ext.complianceConstraints) ||
    Array.isArray(ext.existingStack) ||
    Array.isArray(ext.teamSkillsAvailable);
  let source = base.source;
  if (source === "default" && hasExtFields) source = "input";
  else if (source === "profile" && hasExtFields) source = "input+profile";

  return {
    companyName: base.companyName,
    sector: base.sector,
    headquartersLocation: base.headquartersLocation,
    arr: base.arr,
    totalRaised: base.totalRaised,
    regulatoryBody: base.regulatoryBody,
    capabilityNeed: ext.capabilityNeed?.trim() ?? null,
    timelineWeeks: ext.timelineWeeks ?? null,
    budgetRangeGbp: ext.budgetRangeGbp ?? null,
    mustHaves: ext.mustHaves ?? [],
    complianceConstraints: ext.complianceConstraints ?? [],
    existingStack: ext.existingStack ?? [],
    teamSkillsAvailable: ext.teamSkillsAvailable ?? [],
    source,
  };
}

// ─────────────────────────────────────────────
// Output contract
// ─────────────────────────────────────────────

const OUTPUT_SCHEMA_VERSION = "1" as const;

interface ScoredOption {
  option: (typeof OPTION_VALUES)[number];
  scoreOutOf100: number;
  costRangeGbp: string;
  timeToValueWeeks: number;
  complianceFit: (typeof COMPLIANCE_FIT_VALUES)[number];
  talentLockIn: (typeof RISK_PROFILE_VALUES)[number];
  riskProfile: (typeof RISK_PROFILE_VALUES)[number];
  pros: string[];
  cons: string[];
  whenToPick: string;
}

interface RubricCriterion {
  criterion: string;
  weight: number;
  rationale: string;
}

export interface BuildBuyDecisionPackage {
  schemaVersion: typeof OUTPUT_SCHEMA_VERSION;
  companyName: string;
  capabilityNeed: string;
  options: ScoredOption[];
  recommendedOption: (typeof OPTION_VALUES)[number];
  recommendationConfidence: number;
  decisionRubric: RubricCriterion[];
  complianceCheck: string;
  redFlags: string[];
  escapeHatchTriggers: string[];
  notes: string;
}

function isScoredOption(o: unknown): o is ScoredOption {
  if (!o || typeof o !== "object") return false;
  const oo = o as Record<string, unknown>;
  return (
    (OPTION_VALUES as readonly string[]).includes(oo.option as string) &&
    typeof oo.scoreOutOf100 === "number" &&
    oo.scoreOutOf100 >= 0 &&
    oo.scoreOutOf100 <= 100 &&
    typeof oo.costRangeGbp === "string" &&
    typeof oo.timeToValueWeeks === "number" &&
    oo.timeToValueWeeks >= 0 &&
    (COMPLIANCE_FIT_VALUES as readonly string[]).includes(
      oo.complianceFit as string,
    ) &&
    (RISK_PROFILE_VALUES as readonly string[]).includes(
      oo.talentLockIn as string,
    ) &&
    (RISK_PROFILE_VALUES as readonly string[]).includes(
      oo.riskProfile as string,
    ) &&
    Array.isArray(oo.pros) &&
    oo.pros.every((p) => typeof p === "string") &&
    Array.isArray(oo.cons) &&
    oo.cons.every((c) => typeof c === "string") &&
    typeof oo.whenToPick === "string"
  );
}

function isRubricCriterion(c: unknown): c is RubricCriterion {
  if (!c || typeof c !== "object") return false;
  const cc = c as Record<string, unknown>;
  return (
    typeof cc.criterion === "string" &&
    typeof cc.weight === "number" &&
    cc.weight >= 0 &&
    cc.weight <= 1 &&
    typeof cc.rationale === "string"
  );
}

export function isBuildBuyDecisionPackage(
  obj: unknown,
): obj is BuildBuyDecisionPackage {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.schemaVersion === OUTPUT_SCHEMA_VERSION &&
    typeof o.companyName === "string" &&
    typeof o.capabilityNeed === "string" &&
    Array.isArray(o.options) &&
    (o.options as unknown[]).every(isScoredOption) &&
    (OPTION_VALUES as readonly string[]).includes(
      o.recommendedOption as string,
    ) &&
    typeof o.recommendationConfidence === "number" &&
    o.recommendationConfidence >= 0 &&
    o.recommendationConfidence <= 100 &&
    Array.isArray(o.decisionRubric) &&
    (o.decisionRubric as unknown[]).every(isRubricCriterion) &&
    typeof o.complianceCheck === "string" &&
    Array.isArray(o.redFlags) &&
    Array.isArray(o.escapeHatchTriggers) &&
    typeof o.notes === "string"
  );
}

export function parseLlmJson(raw: string): BuildBuyDecisionPackage | null {
  const trimmed = raw.trim();
  const candidates: string[] = [];
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) candidates.push(fence[1].trim());
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }
  candidates.push(trimmed);
  for (const candidate of candidates) {
    try {
      const obj = JSON.parse(candidate);
      if (isBuildBuyDecisionPackage(obj)) return obj;
    } catch {
      continue;
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────

const DEFAULT_SYSTEM_PROMPT = [
  "You are a London-tech CTO advisor who has made hundreds of build-vs-buy calls for early-stage UK startups across fintech, healthtech, AI, climate, and SaaS.",
  "Score every one of the six options (build_in_house, buy_uk_saas, buy_us_saas, open_source, uk_consultancy, fractional) against the founder's actual constraints. Be honest — most options will score in the 30-70 range; only the right pick should clear 80.",
  "Take UK compliance seriously. Mark complianceFit='blocks' when an option is fundamentally incompatible with the constraint (e.g., US SaaS for sovereign-data workloads). 'extra_work' when it requires a DPA + transfer impact assessment + sub-processor audit. 'neutral' when no UK angle either way. 'advantage' when the option specifically helps with UK compliance.",
  "Use UK English. Cost ranges in GBP. Indicative ranges should reflect 2026 London market rates.",
  "Selection rubric weights MUST sum to 1.0. Tie weights to the founder's mustHaves and complianceConstraints — never list a generic rubric.",
  "Always return ONLY the JSON object the user requests — no preamble, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(c: ResolvedBuildBuyInput): string {
  const arrLine =
    c.arr === null ? "  ARR: not provided" : `  ARR: £${Math.round(c.arr).toLocaleString()}`;
  const totalRaisedLine =
    c.totalRaised === null
      ? "  totalRaised: not provided"
      : `  totalRaised: £${Math.round(c.totalRaised).toLocaleString()}`;
  const regulatorLine = c.regulatoryBody
    ? `  regulatoryBody: ${c.regulatoryBody}`
    : "  regulatoryBody: not provided";
  const budgetLine = c.budgetRangeGbp
    ? `  budgetRangeGbp: £${c.budgetRangeGbp.min.toLocaleString()}–£${c.budgetRangeGbp.max.toLocaleString()}`
    : "  budgetRangeGbp: not provided (use sector + stage norms)";
  const timelineLine =
    c.timelineWeeks === null
      ? "  timelineWeeks: not provided (assume 12)"
      : `  timelineWeeks: ${c.timelineWeeks}`;
  const mustHavesLine =
    c.mustHaves.length === 0
      ? "  mustHaves: infer from capabilityNeed"
      : `  mustHaves: ${c.mustHaves.join(" | ")}`;
  const complianceLine =
    c.complianceConstraints.length === 0
      ? "  complianceConstraints: none stated"
      : `  complianceConstraints: ${c.complianceConstraints.join(" | ")}`;
  const stackLine =
    c.existingStack.length === 0
      ? "  existingStack: not provided"
      : `  existingStack: ${c.existingStack.join(", ")}`;
  const skillsLine =
    c.teamSkillsAvailable.length === 0
      ? "  teamSkillsAvailable: not provided"
      : `  teamSkillsAvailable: ${c.teamSkillsAvailable.join(", ")}`;

  const needBlock = c.capabilityNeed
    ? `\nCapability the founder needs:\n---\n${c.capabilityNeed}\n---\n`
    : "\nNo capabilityNeed provided. Set notes to explain that capabilityNeed is required, return empty options + empty rubric, and exit.\n";

  return [
    `Score build-vs-buy options for ${c.companyName} for the following capability.`,
    "",
    "Company context:",
    `  name: ${c.companyName}`,
    `  sector: ${c.sector}`,
    `  HQ: ${c.headquartersLocation}`,
    arrLine,
    totalRaisedLine,
    regulatorLine,
    timelineLine,
    budgetLine,
    mustHavesLine,
    complianceLine,
    stackLine,
    skillsLine,
    needBlock,
    `Score every one of the six options below. Choose the recommendedOption (highest scoring), give a recommendationConfidence (0-100), and explain the decisionRubric (4-6 weighted criteria summing to 1.0). Add a complianceCheck paragraph specific to UK constraints. List redFlags. List escapeHatchTriggers — concrete signals that would mean switching from the recommendedOption to another option later.`,
    "",
    `Options: ${OPTION_VALUES.join(", ")}.`,
    `Compliance fit values: ${COMPLIANCE_FIT_VALUES.join(" | ")}.`,
    `Risk profile values: ${RISK_PROFILE_VALUES.join(" | ")}.`,
    "",
    "Return ONLY a JSON object matching this schema (no markdown fences, no commentary):",
    "{",
    `  "schemaVersion": "${OUTPUT_SCHEMA_VERSION}",`,
    `  "companyName": string,`,
    `  "capabilityNeed": string,`,
    `  "options": [                                          // exactly 6 entries — one per OPTION_VALUES`,
    `    {`,
    `      "option": string,`,
    `      "scoreOutOf100": number,                          // 0-100`,
    `      "costRangeGbp": string,                           // e.g. "£12–24K / year" or "£0 + ~3 dev-weeks"`,
    `      "timeToValueWeeks": number,`,
    `      "complianceFit": "blocks" | "extra_work" | "neutral" | "advantage",`,
    `      "talentLockIn": "low" | "medium" | "high",`,
    `      "riskProfile": "low" | "medium" | "high",`,
    `      "pros": string[],                                 // 2-4`,
    `      "cons": string[],                                 // 2-4`,
    `      "whenToPick": string                              // 1 sentence — when this option becomes the right call`,
    `    }`,
    `  ],`,
    `  "recommendedOption": string,                           // verbatim from OPTION_VALUES`,
    `  "recommendationConfidence": number,                    // 0-100`,
    `  "decisionRubric": [                                    // 4-6 criteria; weights MUST sum to 1.0`,
    `    { "criterion": string, "weight": number, "rationale": string }`,
    `  ],`,
    `  "complianceCheck": string,                             // 2-4 sentences on UK-specific compliance angles`,
    `  "redFlags": string[],                                  // 0-5`,
    `  "escapeHatchTriggers": string[],                       // 3-5 signals that switch the recommendation`,
    `  "notes": string                                        // 1-2 sentences on caveats / assumptions`,
    "}",
  ].join("\n");
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

class BuildVsBuyDecisionAgentHandler implements AgentHandler {
  agentId = "G1-130";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    const input = await resolveBuildBuyInput(context.input);

    if (!input.capabilityNeed) {
      return {
        outputSummary: `G1-130: capabilityNeed not provided. company=${input.companyName}.`,
        outputData: {
          companyName: input.companyName,
          inputSource: input.source,
          mode: "missing_capability_need",
          schemaVersion: OUTPUT_SCHEMA_VERSION,
        },
        costUsd: 0,
        tokensUsed: 0,
        briefing: {
          type: "alert",
          title: `Build-vs-Buy — capabilityNeed required`,
          summary: `G1-130 needs the capability the founder is weighing in the run input. Re-trigger with capabilityNeed set.`,
          severity: "info",
        },
      };
    }

    const userPrompt = buildUserPrompt(input);

    const llmResult = await callLLM({
      model: context.llmModel,
      systemPrompt: context.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      userPrompt,
      temperature: context.temperature,
      maxTokens: context.maxTokens,
      timeoutMs: 45_000,
    });

    if (!llmResult) {
      return {
        outputSummary: `G1-130: LLM unavailable. company=${input.companyName}.`,
        outputData: {
          companyName: input.companyName,
          inputSource: input.source,
          mode: "llm_unavailable",
          schemaVersion: OUTPUT_SCHEMA_VERSION,
        },
        costUsd: 0,
        tokensUsed: 0,
        briefing: {
          type: "alert",
          title: `Build-vs-buy decision unavailable — ${input.companyName}`,
          summary: `G1-130 could not reach ${context.llmModel}. Verify the relevant provider API key in Vercel env, then re-trigger.`,
          severity: "warning",
        },
      };
    }

    const pkg = parseLlmJson(llmResult.text);

    if (!pkg) {
      return {
        outputSummary: `G1-130: narrative-only output (JSON parse failed). company=${input.companyName}, ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
        outputData: {
          companyName: input.companyName,
          inputSource: input.source,
          narrative: llmResult.text,
          parseFailed: true,
          schemaVersion: OUTPUT_SCHEMA_VERSION,
          provider: llmResult.provider,
          modelId: llmResult.modelId,
        },
        costUsd: llmResult.costUsd,
        tokensUsed: llmResult.tokensUsed,
        briefing: {
          type: "weekly",
          title: `Build-vs-buy (draft) — ${input.companyName}`,
          summary: llmResult.text.slice(0, 600),
          severity: "info",
        },
      };
    }

    // Sanity-check rubric weights + verify all 6 options scored
    const rubricWeightSum = pkg.decisionRubric.reduce(
      (a, c) => a + c.weight,
      0,
    );
    const rubricWeightOff = Math.abs(rubricWeightSum - 1) > 0.05;
    const optionsCovered = new Set(pkg.options.map((o) => o.option));
    const missingOptions = OPTION_VALUES.filter((o) => !optionsCovered.has(o));
    const allOptionsCovered = missingOptions.length === 0;

    // Severity: critical when recommended option has complianceFit='blocks'
    // (model contradicting itself) OR there's a 'blocks' on more than half
    // of options (compliance-impossible territory). Warning when red flags
    // > 0 OR rubric weights drift OR not all 6 options covered.
    const recOption = pkg.options.find(
      (o) => o.option === pkg.recommendedOption,
    );
    const recBlocks = recOption?.complianceFit === "blocks";
    const blocksCount = pkg.options.filter(
      (o) => o.complianceFit === "blocks",
    ).length;
    const severity: "info" | "warning" | "critical" =
      recBlocks || blocksCount >= 4
        ? "critical"
        : pkg.redFlags.length > 0 || rubricWeightOff || !allOptionsCovered
          ? "warning"
          : "info";

    return {
      outputSummary: `G1-130: ${pkg.companyName} — recommend "${pkg.recommendedOption}" @ ${pkg.recommendationConfidence}/100. ${pkg.options.length}/6 options scored; rubric Σ=${rubricWeightSum.toFixed(2)}.${rubricWeightOff ? " RUBRIC SUM OFF." : ""}${!allOptionsCovered ? ` Missing: ${missingOptions.join(",")}.` : ""} ${pkg.redFlags.length} red flags. ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
      outputData: {
        ...pkg,
        rubricWeightSum,
        rubricWeightOff,
        allOptionsCovered,
        missingOptions,
        inputSource: input.source,
        provider: llmResult.provider,
        modelId: llmResult.modelId,
        generatedAt: new Date().toISOString(),
      },
      costUsd: llmResult.costUsd,
      tokensUsed: llmResult.tokensUsed,
      briefing: {
        type: "weekly",
        title: `Build-vs-Buy: ${pkg.recommendedOption} (${pkg.recommendationConfidence}/100)`,
        summary: [
          pkg.capabilityNeed.slice(0, 120),
          `Recommend: ${pkg.recommendedOption}. Cost: ${recOption?.costRangeGbp ?? "?"}. Time-to-value: ${recOption?.timeToValueWeeks ?? "?"} weeks.`,
          recOption ? `Top pros: ${recOption.pros.slice(0, 2).join("; ")}.` : "",
          pkg.complianceCheck.slice(0, 200),
          pkg.escapeHatchTriggers.length > 0
            ? `Switch trigger: ${pkg.escapeHatchTriggers[0]}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
        severity,
        details: {
          ...pkg,
          rubricWeightSum,
          rubricWeightOff,
          allOptionsCovered,
          missingOptions,
          inputSource: input.source,
        },
      },
      learnings: [
        {
          type: "insight",
          title: `Build-vs-buy — ${pkg.recommendedOption}`,
          description: `${pkg.companyName} chose ${pkg.recommendedOption} for "${pkg.capabilityNeed.slice(0, 80)}…" @ ${pkg.recommendationConfidence}/100 confidence. Compliance: ${recOption?.complianceFit ?? "?"}. Talent lock-in: ${recOption?.talentLockIn ?? "?"}.`,
          confidence: pkg.recommendationConfidence / 100,
        },
      ],
    };
  }
}

export const buildVsBuyDecisionAgentHandler =
  new BuildVsBuyDecisionAgentHandler();
