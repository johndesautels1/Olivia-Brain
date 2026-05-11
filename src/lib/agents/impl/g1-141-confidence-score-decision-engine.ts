/**
 * G1-141: Confidence Score Decision Engine
 *
 * Founder describes a major decision (office move, fundraise, hire,
 * pivot, partnership, geographic expansion, product launch) and the
 * options on the table; the agent scores each option with a 0-100
 * confidence number, lists key factors for / against, flags
 * unknowns, and surfaces the recommendation plus an overall
 * confidence score for that recommendation.
 *
 * Briefing-only — no document spawn.
 *
 * Ported byte-for-byte from London-Tech-Map. Eleventh per-company
 * handler. Second briefing-only handler (after G1-130). Three-level
 * severity (critical when low confidence on hard-to-reverse decision).
 */

import { z } from "zod";
import type { AgentHandler, AgentRunContext, AgentRunResult } from "../handlers";
import { callLLM } from "../llm";
import {
  resolveUserCompany,
  type CompanySource,
  type ResolvedCompanyBase,
} from "../resolve-company";

const DECISION_TYPE_VALUES = [
  "office_move",
  "fundraise",
  "hire",
  "pivot",
  "partnership",
  "geographic_expansion",
  "product_launch",
  "other",
] as const;

const REVERSIBILITY_VALUES = ["easy", "medium", "hard"] as const;

const G141ExtensionSchema = z.object({
  decisionDescription: z.string().min(10).max(4000).optional(),
  decisionType: z.enum(DECISION_TYPE_VALUES).optional(),
  options: z.array(z.string().min(1).max(500)).min(1).max(10).optional(),
  timeframeWeeks: z.number().int().min(0).max(208).optional(),
  knownConstraints: z.array(z.string().min(1).max(300)).max(20).optional(),
  reversibility: z.enum(REVERSIBILITY_VALUES).optional(),
});

interface ResolvedDecisionInput {
  companyName: string;
  sector: string;
  headquartersLocation: string;
  arr: number | null;
  totalRaised: number | null;
  regulatoryBody: string | null;
  decisionDescription: string | null;
  decisionType: (typeof DECISION_TYPE_VALUES)[number];
  options: string[];
  timeframeWeeks: number | null;
  knownConstraints: string[];
  reversibility: (typeof REVERSIBILITY_VALUES)[number];
  source: CompanySource;
}

async function resolveDecisionInput(
  raw: unknown,
): Promise<ResolvedDecisionInput> {
  const base: ResolvedCompanyBase = await resolveUserCompany(raw);
  const ext = G141ExtensionSchema.safeParse(raw).data ?? {};

  const hasExtFields =
    Boolean(ext.decisionDescription) ||
    Boolean(ext.decisionType) ||
    Array.isArray(ext.options) ||
    typeof ext.timeframeWeeks === "number" ||
    Array.isArray(ext.knownConstraints) ||
    Boolean(ext.reversibility);
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
    decisionDescription: ext.decisionDescription?.trim() ?? null,
    decisionType: ext.decisionType ?? "other",
    options: ext.options ?? [],
    timeframeWeeks: ext.timeframeWeeks ?? null,
    knownConstraints: ext.knownConstraints ?? [],
    reversibility: ext.reversibility ?? "medium",
    source,
  };
}

const OUTPUT_SCHEMA_VERSION = "1" as const;

interface ScoredOption {
  option: string;
  confidenceScore: number;
  keyFactorsFor: string[];
  keyFactorsAgainst: string[];
  unknowns: string[];
  expectedValueRange: string;
  timeToReverseWeeks: number;
}

export interface DecisionAssessment {
  schemaVersion: typeof OUTPUT_SCHEMA_VERSION;
  companyName: string;
  decisionDescription: string;
  decisionType: ResolvedDecisionInput["decisionType"];
  options: ScoredOption[];
  recommendedOption: string;
  recommendationConfidence: number;
  decisionFraming: string;
  preconditionsToCheck: string[];
  redFlags: string[];
  whatChangesTheAnswer: string[];
  notes: string;
}

function isScoredOption(o: unknown): o is ScoredOption {
  if (!o || typeof o !== "object") return false;
  const oo = o as Record<string, unknown>;
  return (
    typeof oo.option === "string" &&
    typeof oo.confidenceScore === "number" &&
    oo.confidenceScore >= 0 &&
    oo.confidenceScore <= 100 &&
    Array.isArray(oo.keyFactorsFor) &&
    oo.keyFactorsFor.every((s) => typeof s === "string") &&
    Array.isArray(oo.keyFactorsAgainst) &&
    oo.keyFactorsAgainst.every((s) => typeof s === "string") &&
    Array.isArray(oo.unknowns) &&
    oo.unknowns.every((s) => typeof s === "string") &&
    typeof oo.expectedValueRange === "string" &&
    typeof oo.timeToReverseWeeks === "number" &&
    oo.timeToReverseWeeks >= 0
  );
}

export function isDecisionAssessment(obj: unknown): obj is DecisionAssessment {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.schemaVersion === OUTPUT_SCHEMA_VERSION &&
    typeof o.companyName === "string" &&
    typeof o.decisionDescription === "string" &&
    typeof o.decisionType === "string" &&
    Array.isArray(o.options) &&
    (o.options as unknown[]).every(isScoredOption) &&
    typeof o.recommendedOption === "string" &&
    typeof o.recommendationConfidence === "number" &&
    o.recommendationConfidence >= 0 &&
    o.recommendationConfidence <= 100 &&
    typeof o.decisionFraming === "string" &&
    Array.isArray(o.preconditionsToCheck) &&
    Array.isArray(o.redFlags) &&
    Array.isArray(o.whatChangesTheAnswer) &&
    typeof o.notes === "string"
  );
}

export function parseLlmJson(raw: string): DecisionAssessment | null {
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
      if (isDecisionAssessment(obj)) return obj;
    } catch {
      continue;
    }
  }
  return null;
}

const DEFAULT_SYSTEM_PROMPT = [
  "You are a London-tech founder coach who specialises in decision quality. You help founders score their major decisions with calibrated confidence numbers — not false precision.",
  "Your confidence scores must be honest: 95% means you'd bet your salary; 60% means it's barely better than a coin flip; below 40% means you'd recommend NOT doing the option.",
  "Always think about reversibility: a hard-to-reverse decision needs higher confidence than an easy-to-reverse one. Surface this in expectedValueRange and timeToReverseWeeks.",
  "Use UK English. Lean on the Bezos Type-1 / Type-2 framing without naming it: irreversible decisions deserve more deliberation than reversible ones.",
  "Never invent specifics about the founder's business — if the decision context omits something material, list it under unknowns and lower the confidence accordingly.",
  "Always return ONLY the JSON object the user requests — no preamble, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(c: ResolvedDecisionInput): string {
  const arrLine =
    c.arr === null ? "  ARR: not provided" : `  ARR: £${Math.round(c.arr).toLocaleString()}`;
  const totalRaisedLine =
    c.totalRaised === null
      ? "  totalRaised: not provided"
      : `  totalRaised: £${Math.round(c.totalRaised).toLocaleString()}`;
  const regulatorLine = c.regulatoryBody
    ? `  regulatoryBody: ${c.regulatoryBody}`
    : "  regulatoryBody: not provided";
  const timeframeLine =
    c.timeframeWeeks === null
      ? "  timeframeWeeks: not provided"
      : `  timeframeWeeks: ${c.timeframeWeeks}`;
  const constraintsLine =
    c.knownConstraints.length === 0
      ? "  knownConstraints: none provided"
      : `  knownConstraints: ${c.knownConstraints.join(" | ")}`;
  const optionsLine =
    c.options.length === 0
      ? "  options: not provided — pick 2-4 plausible options yourself"
      : `  options:\n${c.options.map((o, i) => `    ${i + 1}. ${o}`).join("\n")}`;

  const decisionBlock = c.decisionDescription
    ? `\nDecision context:\n---\n${c.decisionDescription}\n---\n`
    : "\nNo decisionDescription provided.\n";

  return [
    `Score the following decision for ${c.companyName}.`,
    "",
    "Company context:",
    `  name: ${c.companyName}`,
    `  sector: ${c.sector}`,
    `  HQ: ${c.headquartersLocation}`,
    arrLine,
    totalRaisedLine,
    regulatorLine,
    `  decisionType: ${c.decisionType}`,
    `  reversibility: ${c.reversibility}`,
    timeframeLine,
    constraintsLine,
    optionsLine,
    decisionBlock,
    "Score every option with a calibrated 0-100 confidence. List keyFactorsFor (2-4), keyFactorsAgainst (2-4), unknowns (1-4), an expectedValueRange (qualitative), and timeToReverseWeeks.",
    "Pick the recommendedOption (highest confidence beating no-action baseline). Set recommendationConfidence 0-100 in the pick.",
    "List preconditionsToCheck, redFlags, whatChangesTheAnswer.",
    "",
    "Return ONLY a JSON object matching this schema:",
    "{",
    `  "schemaVersion": "${OUTPUT_SCHEMA_VERSION}",`,
    `  "companyName": string,`,
    `  "decisionDescription": string,`,
    `  "decisionType": "${c.decisionType}",`,
    `  "options": [`,
    `    {`,
    `      "option": string,`,
    `      "confidenceScore": number,`,
    `      "keyFactorsFor": string[],`,
    `      "keyFactorsAgainst": string[],`,
    `      "unknowns": string[],`,
    `      "expectedValueRange": string,`,
    `      "timeToReverseWeeks": number`,
    `    }`,
    `  ],`,
    `  "recommendedOption": string,`,
    `  "recommendationConfidence": number,`,
    `  "decisionFraming": string,`,
    `  "preconditionsToCheck": string[],`,
    `  "redFlags": string[],`,
    `  "whatChangesTheAnswer": string[],`,
    `  "notes": string`,
    "}",
  ].join("\n");
}

class ConfidenceScoreDecisionEngineHandler implements AgentHandler {
  agentId = "G1-141";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    const input = await resolveDecisionInput(context.input);

    if (!input.decisionDescription) {
      return {
        outputSummary: `G1-141: decisionDescription not provided. company=${input.companyName}.`,
        outputData: {
          companyName: input.companyName,
          inputSource: input.source,
          mode: "missing_decision_description",
          schemaVersion: OUTPUT_SCHEMA_VERSION,
        },
        costUsd: 0,
        tokensUsed: 0,
        briefing: {
          type: "alert",
          title: `Decision Engine — decisionDescription required`,
          summary: `G1-141 needs the decision the founder is weighing.`,
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
        outputSummary: `G1-141: LLM unavailable. company=${input.companyName}.`,
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
          title: `Decision score unavailable — ${input.companyName}`,
          summary: `G1-141 could not reach ${context.llmModel}. Verify the relevant provider API key in Vercel env, then re-trigger.`,
          severity: "warning",
        },
      };
    }

    const assessment = parseLlmJson(llmResult.text);

    if (!assessment) {
      return {
        outputSummary: `G1-141: narrative-only output (JSON parse failed). company=${input.companyName}.`,
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
          title: `Decision score (draft) — ${input.companyName}`,
          summary: llmResult.text.slice(0, 600),
          severity: "info",
        },
      };
    }

    const recIsHardToReverse =
      input.reversibility === "hard" ||
      (assessment.options.find((o) => o.option === assessment.recommendedOption)
        ?.timeToReverseWeeks ?? 0) >= 26;
    const lowConfidence = assessment.recommendationConfidence < 60;
    const moderateConfidence =
      assessment.recommendationConfidence >= 60 &&
      assessment.recommendationConfidence < 80;
    const severity: "info" | "warning" | "critical" =
      lowConfidence && recIsHardToReverse
        ? "critical"
        : lowConfidence || moderateConfidence || assessment.redFlags.length > 0
          ? "warning"
          : "info";

    return {
      outputSummary: `G1-141: ${assessment.companyName} — ${assessment.decisionType} → ${assessment.recommendedOption} @ ${assessment.recommendationConfidence}/100. ${assessment.options.length} options scored; ${assessment.redFlags.length} red flags. ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
      outputData: {
        ...assessment,
        inputSource: input.source,
        provider: llmResult.provider,
        modelId: llmResult.modelId,
        generatedAt: new Date().toISOString(),
        recIsHardToReverse,
      },
      costUsd: llmResult.costUsd,
      tokensUsed: llmResult.tokensUsed,
      briefing: {
        type: "weekly",
        title: `Decision: ${assessment.recommendedOption} (${assessment.recommendationConfidence}/100)`,
        summary: [
          assessment.decisionFraming,
          `Recommendation: ${assessment.recommendedOption}.`,
          `Top factors for: ${assessment.options.find((o) => o.option === assessment.recommendedOption)?.keyFactorsFor.slice(0, 2).join("; ") ?? ""}.`,
          assessment.redFlags.length > 0
            ? `Red flags: ${assessment.redFlags.slice(0, 2).join("; ")}.`
            : "",
          assessment.whatChangesTheAnswer.length > 0
            ? `Watch for: ${assessment.whatChangesTheAnswer.slice(0, 2).join("; ")}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
        severity,
        details: {
          ...assessment,
          inputSource: input.source,
          recIsHardToReverse,
        },
      },
      learnings: [
        {
          type: "insight",
          title: `Decision recorded — ${assessment.decisionType}`,
          description: `${assessment.companyName} weighing "${assessment.decisionDescription.slice(0, 100)}…". Recommendation: ${assessment.recommendedOption} @ ${assessment.recommendationConfidence}/100. Reversibility: ${input.reversibility}.`,
          confidence: assessment.recommendationConfidence / 100,
        },
      ],
    };
  }
}

export const confidenceScoreDecisionEngineHandler =
  new ConfidenceScoreDecisionEngineHandler();
