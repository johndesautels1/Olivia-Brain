/**
 * G1-136: Second-Order Consequence Modeler
 *
 * Maps the cascading effects of a strategic decision across three
 * orders of consequence (first / second / third), traces specific
 * cascading chains end-to-end, and flags compounding risks +
 * compounding upsides.
 *
 * Briefing-only — no document spawn.
 *
 * Ported byte-for-byte from London-Tech-Map. TWELFTH per-company
 * handler — closes the queue of per-company doc-spawn agents that
 * can be ported without LTM data access.
 */

import { z } from "zod";
import type { AgentHandler, AgentRunContext, AgentRunResult } from "../handlers";
import { callLLM } from "../llm";
import {
  resolveUserCompany,
  type CompanySource,
  type ResolvedCompanyBase,
} from "../resolve-company";

const DOMAIN_VALUES = [
  "finance",
  "team",
  "product",
  "market",
  "regulator",
  "brand",
  "customers",
  "network",
] as const;

const G136ExtensionSchema = z.object({
  decisionUnderConsideration: z.string().min(20).max(5000).optional(),
  timeHorizonMonths: z.number().int().min(1).max(120).optional(),
  focusDomains: z.array(z.enum(DOMAIN_VALUES)).max(8).optional(),
  constraints: z.array(z.string().min(1).max(300)).max(20).optional(),
  knownAssumptions: z.array(z.string().min(1).max(300)).max(20).optional(),
});

interface ResolvedConsequenceInput {
  companyName: string;
  sector: string;
  headquartersLocation: string;
  arr: number | null;
  totalRaised: number | null;
  regulatoryBody: string | null;
  decisionUnderConsideration: string | null;
  timeHorizonMonths: number;
  focusDomains: (typeof DOMAIN_VALUES)[number][];
  constraints: string[];
  knownAssumptions: string[];
  source: CompanySource;
}

async function resolveConsequenceInput(
  raw: unknown,
): Promise<ResolvedConsequenceInput> {
  const base: ResolvedCompanyBase = await resolveUserCompany(raw);
  const ext = G136ExtensionSchema.safeParse(raw).data ?? {};

  const hasExtFields =
    Boolean(ext.decisionUnderConsideration) ||
    typeof ext.timeHorizonMonths === "number" ||
    Array.isArray(ext.focusDomains) ||
    Array.isArray(ext.constraints) ||
    Array.isArray(ext.knownAssumptions);
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
    decisionUnderConsideration: ext.decisionUnderConsideration?.trim() ?? null,
    timeHorizonMonths: ext.timeHorizonMonths ?? 24,
    focusDomains: ext.focusDomains ?? [...DOMAIN_VALUES],
    constraints: ext.constraints ?? [],
    knownAssumptions: ext.knownAssumptions ?? [],
    source,
  };
}

const OUTPUT_SCHEMA_VERSION = "1" as const;

const LIKELIHOOD_VALUES = ["unlikely", "possible", "likely", "near_certain"] as const;
const MAGNITUDE_VALUES = ["negligible", "small", "material", "large", "company_defining"] as const;

interface Consequence {
  consequence: string;
  domain: (typeof DOMAIN_VALUES)[number];
  likelihood: (typeof LIKELIHOOD_VALUES)[number];
  timeframeMonths: number;
  magnitude: (typeof MAGNITUDE_VALUES)[number];
  isPositive: boolean;
  triggeringIndex?: number;
}

interface CascadingChain {
  firstOrderIndex: number;
  secondOrderIndex: number;
  thirdOrderIndex: number;
  narrativeDescription: string;
  watchSignals: string[];
  compounding: "amplifying" | "dampening" | "neutral";
}

export interface ConsequenceMap {
  schemaVersion: typeof OUTPUT_SCHEMA_VERSION;
  companyName: string;
  decisionUnderConsideration: string;
  timeHorizonMonths: number;
  firstOrder: Consequence[];
  secondOrder: Consequence[];
  thirdOrder: Consequence[];
  cascadingChains: CascadingChain[];
  compoundingRisks: string[];
  compoundingUpsides: string[];
  whatToWatch: string[];
  decisionMattersIf: string[];
  assumptionsProbed: string[];
  notes: string;
}

function isConsequence(c: unknown): c is Consequence {
  if (!c || typeof c !== "object") return false;
  const cc = c as Record<string, unknown>;
  return (
    typeof cc.consequence === "string" &&
    (DOMAIN_VALUES as readonly string[]).includes(cc.domain as string) &&
    (LIKELIHOOD_VALUES as readonly string[]).includes(cc.likelihood as string) &&
    typeof cc.timeframeMonths === "number" &&
    cc.timeframeMonths >= 0 &&
    (MAGNITUDE_VALUES as readonly string[]).includes(cc.magnitude as string) &&
    typeof cc.isPositive === "boolean" &&
    (cc.triggeringIndex === undefined ||
      (typeof cc.triggeringIndex === "number" && cc.triggeringIndex >= 0))
  );
}

function isCascadingChain(c: unknown): c is CascadingChain {
  if (!c || typeof c !== "object") return false;
  const cc = c as Record<string, unknown>;
  return (
    typeof cc.firstOrderIndex === "number" &&
    typeof cc.secondOrderIndex === "number" &&
    typeof cc.thirdOrderIndex === "number" &&
    cc.firstOrderIndex >= 0 &&
    cc.secondOrderIndex >= 0 &&
    cc.thirdOrderIndex >= 0 &&
    typeof cc.narrativeDescription === "string" &&
    Array.isArray(cc.watchSignals) &&
    cc.watchSignals.every((s) => typeof s === "string") &&
    ["amplifying", "dampening", "neutral"].includes(cc.compounding as string)
  );
}

export function isConsequenceMap(obj: unknown): obj is ConsequenceMap {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.schemaVersion === OUTPUT_SCHEMA_VERSION &&
    typeof o.companyName === "string" &&
    typeof o.decisionUnderConsideration === "string" &&
    typeof o.timeHorizonMonths === "number" &&
    Array.isArray(o.firstOrder) &&
    (o.firstOrder as unknown[]).every(isConsequence) &&
    Array.isArray(o.secondOrder) &&
    (o.secondOrder as unknown[]).every(isConsequence) &&
    Array.isArray(o.thirdOrder) &&
    (o.thirdOrder as unknown[]).every(isConsequence) &&
    Array.isArray(o.cascadingChains) &&
    (o.cascadingChains as unknown[]).every(isCascadingChain) &&
    Array.isArray(o.compoundingRisks) &&
    Array.isArray(o.compoundingUpsides) &&
    Array.isArray(o.whatToWatch) &&
    Array.isArray(o.decisionMattersIf) &&
    Array.isArray(o.assumptionsProbed) &&
    typeof o.notes === "string"
  );
}

export function parseLlmJson(raw: string): ConsequenceMap | null {
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
      if (isConsequenceMap(obj)) return obj;
    } catch {
      continue;
    }
  }
  return null;
}

const DEFAULT_SYSTEM_PROMPT = [
  "You are a London-tech systems thinker who specialises in tracing the cascading consequences of strategic decisions across multiple time horizons and domains.",
  "Map first-order (direct), second-order (caused by first-order), and third-order (caused by second-order) consequences. Then identify the most important cascading chains where one consequence triggers another in a way that compounds.",
  "Be ruthlessly honest about likelihood and magnitude — most third-order effects are 'possible' and 'small' at best. Mark a consequence 'company_defining' only if it could plausibly determine whether the company exists in 2 years.",
  "Probe the founder's stated assumptions. List which ones the model would test before recommending the decision goes ahead.",
  "The most useful output is the cascadingChains: pick 3-6 specific chains worth watching, and for each list 2-4 watchSignals — leading indicators that this chain is starting to play out.",
  "Use UK English. Always return ONLY the JSON object the user requests — no preamble, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(c: ResolvedConsequenceInput): string {
  const arrLine =
    c.arr === null ? "  ARR: not provided" : `  ARR: £${Math.round(c.arr).toLocaleString()}`;
  const totalRaisedLine =
    c.totalRaised === null
      ? "  totalRaised: not provided"
      : `  totalRaised: £${Math.round(c.totalRaised).toLocaleString()}`;
  const regulatorLine = c.regulatoryBody
    ? `  regulatoryBody: ${c.regulatoryBody}`
    : "  regulatoryBody: not provided";
  const constraintsLine =
    c.constraints.length === 0
      ? "  constraints: none provided"
      : `  constraints: ${c.constraints.join(" | ")}`;
  const assumptionsLine =
    c.knownAssumptions.length === 0
      ? "  knownAssumptions: not provided"
      : `  knownAssumptions: ${c.knownAssumptions.join(" | ")}`;

  const decisionBlock = c.decisionUnderConsideration
    ? `\nDecision under consideration:\n---\n${c.decisionUnderConsideration}\n---\n`
    : "\nNo decisionUnderConsideration provided.\n";

  return [
    `Map the cascading consequences of this decision for ${c.companyName} over the next ${c.timeHorizonMonths} months.`,
    "",
    "Company context:",
    `  name: ${c.companyName}`,
    `  sector: ${c.sector}`,
    `  HQ: ${c.headquartersLocation}`,
    arrLine,
    totalRaisedLine,
    regulatorLine,
    `  timeHorizonMonths: ${c.timeHorizonMonths}`,
    `  focusDomains: ${c.focusDomains.join(", ")}`,
    constraintsLine,
    assumptionsLine,
    decisionBlock,
    "Map 4-6 first-order consequences, 5-8 second-order (with triggeringIndex pointing to firstOrder), 4-6 third-order (with triggeringIndex pointing to secondOrder).",
    "Then 3-6 cascading chains with 2-4 watchSignals each.",
    "Then compoundingRisks, compoundingUpsides, whatToWatch, decisionMattersIf, assumptionsProbed.",
    "",
    `Domains: ${DOMAIN_VALUES.join(" | ")}.`,
    `Likelihoods: ${LIKELIHOOD_VALUES.join(" | ")}.`,
    `Magnitudes: ${MAGNITUDE_VALUES.join(" | ")}.`,
    "",
    "Return ONLY a JSON object matching the schema (no markdown fences, no commentary):",
    "{",
    `  "schemaVersion": "${OUTPUT_SCHEMA_VERSION}",`,
    `  "companyName": string,`,
    `  "decisionUnderConsideration": string,`,
    `  "timeHorizonMonths": ${c.timeHorizonMonths},`,
    `  "firstOrder": [`,
    `    { "consequence": string, "domain": string, "likelihood": string, "timeframeMonths": number, "magnitude": string, "isPositive": boolean }`,
    `  ],`,
    `  "secondOrder": [ {...with triggeringIndex: number } ],`,
    `  "thirdOrder": [ {...with triggeringIndex: number } ],`,
    `  "cascadingChains": [`,
    `    {`,
    `      "firstOrderIndex": number,`,
    `      "secondOrderIndex": number,`,
    `      "thirdOrderIndex": number,`,
    `      "narrativeDescription": string,`,
    `      "watchSignals": string[],`,
    `      "compounding": "amplifying" | "dampening" | "neutral"`,
    `    }`,
    `  ],`,
    `  "compoundingRisks": string[],`,
    `  "compoundingUpsides": string[],`,
    `  "whatToWatch": string[],`,
    `  "decisionMattersIf": string[],`,
    `  "assumptionsProbed": string[],`,
    `  "notes": string`,
    "}",
  ].join("\n");
}

class SecondOrderConsequenceModelerHandler implements AgentHandler {
  agentId = "G1-136";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    const input = await resolveConsequenceInput(context.input);

    if (!input.decisionUnderConsideration) {
      return {
        outputSummary: `G1-136: decisionUnderConsideration not provided. company=${input.companyName}.`,
        outputData: {
          companyName: input.companyName,
          inputSource: input.source,
          mode: "missing_decision_under_consideration",
          schemaVersion: OUTPUT_SCHEMA_VERSION,
        },
        costUsd: 0,
        tokensUsed: 0,
        briefing: {
          type: "alert",
          title: `Consequence Modeler — decisionUnderConsideration required`,
          summary: `G1-136 needs the strategic decision to model.`,
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
      timeoutMs: 50_000,
    });

    if (!llmResult) {
      return {
        outputSummary: `G1-136: LLM unavailable. company=${input.companyName}.`,
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
          title: `Consequence map unavailable — ${input.companyName}`,
          summary: `G1-136 could not reach ${context.llmModel}. Verify the relevant provider API key in Vercel env, then re-trigger.`,
          severity: "warning",
        },
      };
    }

    const map = parseLlmJson(llmResult.text);

    if (!map) {
      return {
        outputSummary: `G1-136: narrative-only output (JSON parse failed). company=${input.companyName}.`,
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
          title: `Consequence map (draft) — ${input.companyName}`,
          summary: llmResult.text.slice(0, 600),
          severity: "info",
        },
      };
    }

    const allConsequences = [
      ...map.firstOrder,
      ...map.secondOrder,
      ...map.thirdOrder,
    ];
    const hasCompanyDefiningNegative = allConsequences.some(
      (c) => c.magnitude === "company_defining" && !c.isPositive,
    );
    const hasLargeNegative = allConsequences.some(
      (c) => c.magnitude === "large" && !c.isPositive,
    );
    const severity: "info" | "warning" | "critical" =
      hasCompanyDefiningNegative
        ? "critical"
        : map.compoundingRisks.length > 0 || hasLargeNegative
          ? "warning"
          : "info";

    return {
      outputSummary: `G1-136: ${map.companyName} — ${map.firstOrder.length}+${map.secondOrder.length}+${map.thirdOrder.length} consequences across ${map.cascadingChains.length} chains; ${map.compoundingRisks.length} compounding risks, ${map.compoundingUpsides.length} compounding upsides. ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
      outputData: {
        ...map,
        inputSource: input.source,
        provider: llmResult.provider,
        modelId: llmResult.modelId,
        generatedAt: new Date().toISOString(),
        hasCompanyDefiningNegative,
        hasLargeNegative,
      },
      costUsd: llmResult.costUsd,
      tokensUsed: llmResult.tokensUsed,
      briefing: {
        type: "weekly",
        title: `Consequence map — ${map.companyName} (${map.cascadingChains.length} chains)`,
        summary: [
          `Decision: ${map.decisionUnderConsideration.slice(0, 120)}…`,
          `Top compounding risk: ${map.compoundingRisks[0] ?? "(none flagged)"}.`,
          `Top compounding upside: ${map.compoundingUpsides[0] ?? "(none flagged)"}.`,
          map.whatToWatch.length > 0
            ? `Watch: ${map.whatToWatch.slice(0, 2).join("; ")}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
        severity,
        details: {
          ...map,
          inputSource: input.source,
          hasCompanyDefiningNegative,
          hasLargeNegative,
        },
      },
      learnings: [
        {
          type: "insight",
          title: `Consequence cascade — ${map.companyName}`,
          description: `${map.cascadingChains.length} chains modelled across ${map.timeHorizonMonths} months. ${map.compoundingRisks.length} compounding risks; ${map.compoundingUpsides.length} compounding upsides.`,
          confidence: 0.6,
        },
      ],
    };
  }
}

export const secondOrderConsequenceModelerHandler =
  new SecondOrderConsequenceModelerHandler();
