/**
 * G1-150: Procurement Agent
 *
 * Founder says: "Need fractional CMO with fintech experience" -- the
 * agent returns a Statement of Work (SOW) draft plus a ranked
 * shortlist of 5 candidate vendors / agencies / fractionals /
 * advisors, with fit scores, indicative price ranges, and a
 * selection rubric.
 *
 * Schedule: on_demand. Inputs:
 *   - userProfileId -- pulls UserCompanyProfile for SOW grounding.
 *   - procurementNeed (required, free-form).
 *   - engagementType (fractional | agency | saas_vendor | advisor |
 *     freelance | consultant).
 *   - budgetRangeGbp (optional).
 *   - timelineWeeks (optional).
 *   - mustHaves / niceToHaves / exclusions.
 *
 * When userProfileId is supplied the SOW markdown is mirrored to
 * licensing-commercial (proposal / internal / partnership) -- first
 * handler using the licensing-commercial collection.
 *
 * Ported byte-for-byte from London-Tech-Map. Tenth per-company
 * handler. Third handler with web-search opt-in.
 */

import { z } from "zod";
import type { AgentHandler, AgentRunContext, AgentRunResult } from "../handlers";
import { callLLM } from "../llm";
import { spawnDocumentFromAgent } from "../document-mirror";
import {
  resolveUserCompany,
  type CompanySource,
  type ResolvedCompanyBase,
} from "../resolve-company";

// ─────────────────────────────────────────────
// Input contract
// ─────────────────────────────────────────────

const ENGAGEMENT_TYPE_VALUES = [
  "fractional",
  "agency",
  "saas_vendor",
  "advisor",
  "freelance",
  "consultant",
] as const;

const G150ExtensionSchema = z.object({
  procurementNeed: z.string().min(10).max(2000).optional(),
  engagementType: z.enum(ENGAGEMENT_TYPE_VALUES).optional(),
  budgetRangeGbp: z
    .object({
      min: z.number().nonnegative(),
      max: z.number().nonnegative(),
    })
    .optional(),
  timelineWeeks: z.number().int().min(1).max(208).optional(),
  mustHaves: z.array(z.string().min(1).max(200)).max(20).optional(),
  niceToHaves: z.array(z.string().min(1).max(200)).max(20).optional(),
  exclusions: z.array(z.string().min(1).max(200)).max(20).optional(),
  startUrgency: z.enum(["asap", "next_quarter", "flexible"]).optional(),
});

interface ResolvedProcurementInput {
  companyName: string;
  sector: string;
  headquartersLocation: string;
  arr: number | null;
  totalRaised: number | null;
  regulatoryBody: string | null;
  procurementNeed: string | null;
  engagementType: (typeof ENGAGEMENT_TYPE_VALUES)[number];
  budgetRangeGbp: { min: number; max: number } | null;
  timelineWeeks: number | null;
  mustHaves: string[];
  niceToHaves: string[];
  exclusions: string[];
  startUrgency: "asap" | "next_quarter" | "flexible";
  source: CompanySource;
}

async function resolveProcurementInput(
  raw: unknown,
): Promise<ResolvedProcurementInput> {
  const base: ResolvedCompanyBase = await resolveUserCompany(raw);
  const ext = G150ExtensionSchema.safeParse(raw).data ?? {};

  const hasExtFields =
    Boolean(ext.procurementNeed) ||
    Boolean(ext.engagementType) ||
    Boolean(ext.budgetRangeGbp) ||
    typeof ext.timelineWeeks === "number" ||
    Array.isArray(ext.mustHaves) ||
    Array.isArray(ext.niceToHaves) ||
    Array.isArray(ext.exclusions);
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
    procurementNeed: ext.procurementNeed?.trim() ?? null,
    engagementType: ext.engagementType ?? "fractional",
    budgetRangeGbp: ext.budgetRangeGbp ?? null,
    timelineWeeks: ext.timelineWeeks ?? null,
    mustHaves: ext.mustHaves ?? [],
    niceToHaves: ext.niceToHaves ?? [],
    exclusions: ext.exclusions ?? [],
    startUrgency: ext.startUrgency ?? "next_quarter",
    source,
  };
}

// ─────────────────────────────────────────────
// Output contract
// ─────────────────────────────────────────────

const OUTPUT_SCHEMA_VERSION = "1" as const;

interface VendorCandidate {
  vendor: string;
  vendorType: string;
  location: string;
  relevantExperience: string;
  indicativeRangeGbp: string;
  contactHint: string;
  fitScore: number;
  pros: string[];
  cons: string[];
}

interface RubricCriterion {
  criterion: string;
  weight: number;
  rationale: string;
}

export interface ProcurementPackage {
  schemaVersion: typeof OUTPUT_SCHEMA_VERSION;
  companyName: string;
  procurementNeed: string;
  engagementType: ResolvedProcurementInput["engagementType"];
  sowMarkdown: string;
  vendorShortlist: VendorCandidate[];
  selectionRubric: RubricCriterion[];
  recommendedNextSteps: string[];
  redFlags: string[];
  notes: string;
}

function isVendorCandidate(v: unknown): v is VendorCandidate {
  if (!v || typeof v !== "object") return false;
  const vv = v as Record<string, unknown>;
  return (
    typeof vv.vendor === "string" &&
    typeof vv.vendorType === "string" &&
    typeof vv.location === "string" &&
    typeof vv.relevantExperience === "string" &&
    typeof vv.indicativeRangeGbp === "string" &&
    typeof vv.contactHint === "string" &&
    typeof vv.fitScore === "number" &&
    vv.fitScore >= 0 &&
    vv.fitScore <= 1 &&
    Array.isArray(vv.pros) &&
    vv.pros.every((p) => typeof p === "string") &&
    Array.isArray(vv.cons) &&
    vv.cons.every((c) => typeof c === "string")
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

export function isProcurementPackage(obj: unknown): obj is ProcurementPackage {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.schemaVersion === OUTPUT_SCHEMA_VERSION &&
    typeof o.companyName === "string" &&
    typeof o.procurementNeed === "string" &&
    typeof o.engagementType === "string" &&
    typeof o.sowMarkdown === "string" &&
    Array.isArray(o.vendorShortlist) &&
    (o.vendorShortlist as unknown[]).every(isVendorCandidate) &&
    Array.isArray(o.selectionRubric) &&
    (o.selectionRubric as unknown[]).every(isRubricCriterion) &&
    Array.isArray(o.recommendedNextSteps) &&
    Array.isArray(o.redFlags) &&
    typeof o.notes === "string"
  );
}

export function parseLlmJson(raw: string): ProcurementPackage | null {
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
      if (isProcurementPackage(obj)) return obj;
    } catch {
      continue;
    }
  }
  return null;
}

const DEFAULT_SYSTEM_PROMPT = [
  "You are a London startup head-of-procurement / chief-of-staff who has hired hundreds of fractionals, agencies, advisors, and SaaS vendors for early-stage tech companies.",
  "Draft a tight SOW the founder can adapt directly: scope, deliverables, success metrics, term, payment structure, IP ownership, confidentiality, termination, governing law (England & Wales by default).",
  "Shortlist 5 specific named vendors / agencies / fractionals / advisors per the engagement type and need — never invent firms or people. If you can't be confident a vendor still takes the kind of work described, say so in contactHint and lower the fitScore.",
  "Use UK English. Indicative price ranges should be in GBP and reflect realistic London rates.",
  "Selection rubric weights MUST sum to 1.0 — keep weights honest and tied to the founder's mustHaves.",
  "Always return ONLY the JSON object the user requests — no preamble, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(c: ResolvedProcurementInput): string {
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
    : "  budgetRangeGbp: not provided (use sector norms)";
  const timelineLine =
    c.timelineWeeks === null
      ? "  timelineWeeks: not provided"
      : `  timelineWeeks: ${c.timelineWeeks}`;
  const mustHavesLine =
    c.mustHaves.length === 0
      ? "  mustHaves: not provided (infer from procurementNeed)"
      : `  mustHaves: ${c.mustHaves.join(" | ")}`;
  const niceToHavesLine =
    c.niceToHaves.length === 0
      ? "  niceToHaves: none"
      : `  niceToHaves: ${c.niceToHaves.join(" | ")}`;
  const exclusionsLine =
    c.exclusions.length === 0
      ? "  exclusions: none"
      : `  exclusions: ${c.exclusions.join(" | ")}`;

  const needBlock = c.procurementNeed
    ? `\nProcurement need:\n---\n${c.procurementNeed}\n---\n`
    : "\nNo procurementNeed provided.\n";

  return [
    `Draft an SOW + 5-vendor shortlist for ${c.companyName} for the following procurement need.`,
    "",
    "Company context:",
    `  name: ${c.companyName}`,
    `  sector: ${c.sector}`,
    `  HQ: ${c.headquartersLocation}`,
    arrLine,
    totalRaisedLine,
    regulatorLine,
    `  engagementType: ${c.engagementType}`,
    budgetLine,
    timelineLine,
    `  startUrgency: ${c.startUrgency}`,
    mustHavesLine,
    niceToHavesLine,
    exclusionsLine,
    needBlock,
    "Write the SOW with H2 sections: Scope, Deliverables, Success metrics, Term & schedule, Fees & payment, IP ownership, Confidentiality, Termination, Governing law. Then 5 vendor candidates ranked by fitScore desc. Then 4-6 weighted criteria summing to 1.0.",
    "",
    "Return ONLY a JSON object matching this schema (no markdown fences, no commentary):",
    "{",
    `  "schemaVersion": "${OUTPUT_SCHEMA_VERSION}",`,
    `  "companyName": string,`,
    `  "procurementNeed": string,`,
    `  "engagementType": "${c.engagementType}",`,
    `  "sowMarkdown": string,`,
    `  "vendorShortlist": [`,
    `    {`,
    `      "vendor": string,`,
    `      "vendorType": string,`,
    `      "location": string,`,
    `      "relevantExperience": string,`,
    `      "indicativeRangeGbp": string,`,
    `      "contactHint": string,`,
    `      "fitScore": number,`,
    `      "pros": string[],`,
    `      "cons": string[]`,
    `    }`,
    `  ],`,
    `  "selectionRubric": [ { "criterion": string, "weight": number, "rationale": string } ],`,
    `  "recommendedNextSteps": string[],`,
    `  "redFlags": string[],`,
    `  "notes": string`,
    "}",
  ].join("\n");
}

class ProcurementAgentHandler implements AgentHandler {
  agentId = "G1-150";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    const input = await resolveProcurementInput(context.input);

    if (!input.procurementNeed) {
      return {
        outputSummary: `G1-150: procurementNeed not provided. company=${input.companyName}.`,
        outputData: {
          companyName: input.companyName,
          inputSource: input.source,
          mode: "missing_procurement_need",
          schemaVersion: OUTPUT_SCHEMA_VERSION,
        },
        costUsd: 0,
        tokensUsed: 0,
        briefing: {
          type: "alert",
          title: `Procurement Agent — procurementNeed required`,
          summary: `G1-150 needs a procurementNeed in the run input.`,
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
      enableWebSearch: true,
    });

    if (!llmResult) {
      return {
        outputSummary: `G1-150: LLM unavailable. company=${input.companyName}.`,
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
          title: `Procurement package unavailable — ${input.companyName}`,
          summary: `G1-150 could not reach ${context.llmModel}. Verify the relevant provider API key in Vercel env, then re-trigger.`,
          severity: "warning",
        },
      };
    }

    const pkg = parseLlmJson(llmResult.text);

    if (!pkg) {
      return {
        outputSummary: `G1-150: narrative-only output (JSON parse failed). company=${input.companyName}.`,
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
          title: `Procurement (draft) — ${input.companyName}`,
          summary: llmResult.text.slice(0, 600),
          severity: "info",
        },
      };
    }

    const rubricWeightSum = pkg.selectionRubric.reduce(
      (a, c) => a + c.weight,
      0,
    );
    const rubricWeightOff = Math.abs(rubricWeightSum - 1) > 0.05;

    const userProfileId =
      typeof context.input?.userProfileId === "string" &&
      context.input.userProfileId.length > 0
        ? context.input.userProfileId
        : null;
    const linkedDocument =
      userProfileId && pkg.sowMarkdown.length > 0
        ? await spawnDocumentFromAgent({
            userProfileId,
            agentRunId: context.runId,
            agentId: context.agentId,
            collectionSlug: "licensing-commercial",
            title: `SOW — ${pkg.companyName} (${pkg.engagementType})`,
            body: pkg.sowMarkdown,
            documentType: "proposal",
            audienceType: "internal",
            purposeType: "partnership",
            confidentiality: "internal",
            summary: `SOW + ${pkg.vendorShortlist.length}-vendor shortlist for ${pkg.engagementType} engagement. Top fit: ${pkg.vendorShortlist[0]?.vendor ?? "n/a"}.`,
          })
        : null;

    const severity: "info" | "warning" =
      pkg.redFlags.length > 0 || rubricWeightOff ? "warning" : "info";

    return {
      outputSummary: `G1-150: ${pkg.companyName} — ${pkg.engagementType} SOW; ${pkg.vendorShortlist.length} vendors; top: ${pkg.vendorShortlist[0]?.vendor ?? "n/a"}; rubric Σ=${rubricWeightSum.toFixed(2)}.${rubricWeightOff ? " RUBRIC SUM OFF." : ""} ${pkg.redFlags.length} red flags.${linkedDocument ? ` Document=${linkedDocument.slug}.` : ""} ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
      outputData: {
        ...pkg,
        rubricWeightSum,
        rubricWeightOff,
        inputSource: input.source,
        provider: llmResult.provider,
        modelId: llmResult.modelId,
        webSearchUsed: llmResult.webSearchUsed,
        generatedAt: new Date().toISOString(),
        ...(linkedDocument && {
          documentId: linkedDocument.documentId,
          documentSlug: linkedDocument.slug,
          documentCreatedThisRun: linkedDocument.created,
        }),
      },
      costUsd: llmResult.costUsd,
      tokensUsed: llmResult.tokensUsed,
      briefing: {
        type: "weekly",
        title: `Procurement — ${pkg.companyName} (${pkg.engagementType})`,
        summary: [
          `Top vendor: ${pkg.vendorShortlist[0]?.vendor ?? "n/a"} (${pkg.vendorShortlist[0]?.location ?? "n/a"}, ${pkg.vendorShortlist[0]?.indicativeRangeGbp ?? "?"}).`,
          pkg.redFlags.length > 0
            ? `Red flags: ${pkg.redFlags.slice(0, 2).join("; ")}.`
            : "",
          rubricWeightOff
            ? `Rubric weights sum to ${rubricWeightSum.toFixed(2)} — review before using.`
            : "",
          pkg.notes,
        ]
          .filter(Boolean)
          .join(" "),
        severity,
        details: {
          ...pkg,
          rubricWeightSum,
          rubricWeightOff,
          inputSource: input.source,
          ...(linkedDocument && { linkedDocument }),
        },
      },
      learnings: [
        {
          type: "insight",
          title: `Procurement shortlist — ${pkg.engagementType}`,
          description: `${pkg.vendorShortlist.length} candidates for ${pkg.engagementType} engagement. Top fit: ${pkg.vendorShortlist[0]?.vendor ?? "n/a"} (${pkg.vendorShortlist[0]?.fitScore ?? 0}). Rubric weights Σ=${rubricWeightSum.toFixed(2)}.`,
          confidence: 0.65,
        },
      ],
    };
  }
}

export const procurementAgentHandler = new ProcurementAgentHandler();
