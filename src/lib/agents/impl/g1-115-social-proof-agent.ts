/**
 * G1-115: Social Proof Agent
 *
 * Assembles a deck-ready "proof package" for the founder: customer
 * logos, partner signals, press mentions, investor logos, district
 * legitimacy markers (Knowledge Quarter, Tech City, Level39, EF /
 * Antler / Founders Factory cohort credentials), regulator
 * alignments (FCA register / ICO / AISI / Cyber Essentials Plus),
 * team credentials, and metric signals — across one of four use
 * contexts (investor deck, enterprise pitch, press kit, website).
 *
 * Schedule: on_demand. Inputs:
 *   - userProfileId — pulls UserCompanyProfile (companyName,
 *     sector, ARR, certifications, regulatoryBody, totalRaised,
 *     etc.)
 *   - explicit knownProofItems — array of items the founder
 *     already has (so the agent doesn't duplicate); the agent
 *     organises and recommends additions / next steps
 *
 * Output: organised proof categories, a slide-ready markdown
 * fragment, a gap analysis (what the founder needs but doesn't
 * yet have), a 0-100 legitimacy score, and concrete next actions.
 *
 * When `userProfileId` is supplied the proof-package markdown is
 * mirrored to the founder's My Documents tile in `sales-marketing`
 * with audience/purpose derived from targetUseContext.
 *
 * Ported byte-for-byte from London-Tech-Map src/lib/agents/impl/
 * g1-115-social-proof-agent.ts. Sixth per-company handler ported.
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

const USE_CONTEXT_VALUES = [
  "investor_deck",
  "enterprise_pitch",
  "press_kit",
  "website",
] as const;

const G115ExtensionSchema = z.object({
  targetUseContext: z.enum(USE_CONTEXT_VALUES).optional(),
  knownProofItems: z.array(z.string().min(1).max(300)).max(50).optional(),
  includeDistrictSignals: z.boolean().optional(),
  notableInvestors: z.array(z.string().min(1).max(120)).max(30).optional(),
});

interface ResolvedProofInput {
  companyName: string;
  sector: string;
  headquartersLocation: string;
  arr: number | null;
  totalRaised: number | null;
  customerCount: number | null;
  certifications: string[];
  regulatoryBody: string | null;
  targetUseContext: (typeof USE_CONTEXT_VALUES)[number];
  knownProofItems: string[];
  includeDistrictSignals: boolean;
  notableInvestors: string[];
  source: CompanySource;
}

async function resolveProofInput(raw: unknown): Promise<ResolvedProofInput> {
  const base: ResolvedCompanyBase = await resolveUserCompany(raw);
  const ext = G115ExtensionSchema.safeParse(raw).data ?? {};

  const hasExtFields =
    Boolean(ext.targetUseContext) ||
    Array.isArray(ext.knownProofItems) ||
    typeof ext.includeDistrictSignals === "boolean" ||
    Array.isArray(ext.notableInvestors);
  let source = base.source;
  if (source === "default" && hasExtFields) source = "input";
  else if (source === "profile" && hasExtFields) source = "input+profile";

  return {
    companyName: base.companyName,
    sector: base.sector,
    headquartersLocation: base.headquartersLocation,
    arr: base.arr,
    totalRaised: base.totalRaised,
    customerCount: base.customerCount,
    certifications: base.certifications,
    regulatoryBody: base.regulatoryBody,
    targetUseContext: ext.targetUseContext ?? "investor_deck",
    knownProofItems: ext.knownProofItems ?? [],
    includeDistrictSignals: ext.includeDistrictSignals ?? true,
    notableInvestors: ext.notableInvestors ?? [],
    source,
  };
}

// ─────────────────────────────────────────────
// Output contract
// ─────────────────────────────────────────────

const OUTPUT_SCHEMA_VERSION = "1" as const;

const PROOF_CATEGORY_VALUES = [
  "customer_logos",
  "partner_signals",
  "press_mentions",
  "investor_logos",
  "district_legitimacy",
  "regulator_alignments",
  "team_credentials",
  "metrics_signals",
] as const;

interface ProofCategory {
  category: (typeof PROOF_CATEGORY_VALUES)[number];
  items: string[];
  strengthLabel: "strong" | "moderate" | "weak" | "missing";
  rationale: string;
}

export interface ProofPackage {
  schemaVersion: typeof OUTPUT_SCHEMA_VERSION;
  companyName: string;
  targetUseContext: ResolvedProofInput["targetUseContext"];
  proofCategories: ProofCategory[];
  recommendedSlideMarkdown: string;
  gapAnalysis: string[];
  legitimacyScore: number;
  nextActions: string[];
  notes: string;
}

function isProofCategory(c: unknown): c is ProofCategory {
  if (!c || typeof c !== "object") return false;
  const cc = c as Record<string, unknown>;
  return (
    typeof cc.category === "string" &&
    (PROOF_CATEGORY_VALUES as readonly string[]).includes(cc.category) &&
    Array.isArray(cc.items) &&
    cc.items.every((i) => typeof i === "string") &&
    typeof cc.strengthLabel === "string" &&
    ["strong", "moderate", "weak", "missing"].includes(
      cc.strengthLabel as string,
    ) &&
    typeof cc.rationale === "string"
  );
}

export function isProofPackage(obj: unknown): obj is ProofPackage {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.schemaVersion === OUTPUT_SCHEMA_VERSION &&
    typeof o.companyName === "string" &&
    typeof o.targetUseContext === "string" &&
    Array.isArray(o.proofCategories) &&
    (o.proofCategories as unknown[]).every(isProofCategory) &&
    typeof o.recommendedSlideMarkdown === "string" &&
    Array.isArray(o.gapAnalysis) &&
    typeof o.legitimacyScore === "number" &&
    o.legitimacyScore >= 0 &&
    o.legitimacyScore <= 100 &&
    Array.isArray(o.nextActions) &&
    typeof o.notes === "string"
  );
}

export function parseLlmJson(raw: string): ProofPackage | null {
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
      if (isProofPackage(obj)) return obj;
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
  "You are a London-tech pitch coach who specialises in assembling social-proof packages — the slide investors and enterprise procurement teams use to decide whether to take a meeting.",
  "Be ruthless about strength labels: only mark a category 'strong' if the items genuinely move a UK investor or enterprise buyer; 'moderate' if they help; 'weak' if they're filler; 'missing' if the founder needs to acquire that proof.",
  "Never invent customers, press mentions, partnerships, or investors. If the input doesn't supply an item, mark the category 'missing' and put the gap in nextActions.",
  "Use UK English. Prioritise London / UK signals (Knowledge Quarter, Level39, EF / Antler / Founders Factory cohorts, FCA register status, ICO certifications, NCSC Cyber Essentials Plus, UK Patent Box) over US equivalents wherever both apply.",
  "Always return ONLY the JSON object the user requests — no preamble, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(c: ResolvedProofInput): string {
  const arrLine =
    c.arr === null ? "  ARR: not provided" : `  ARR: £${Math.round(c.arr).toLocaleString()}`;
  const totalRaisedLine =
    c.totalRaised === null
      ? "  totalRaised: not provided"
      : `  totalRaised: £${Math.round(c.totalRaised).toLocaleString()}`;
  const customerLine =
    c.customerCount === null
      ? "  customerCount: not provided"
      : `  customerCount: ${c.customerCount.toLocaleString()}`;
  const certsLine =
    c.certifications.length === 0
      ? "  certifications: none recorded"
      : `  certifications: ${c.certifications.join(", ")}`;
  const regulatorLine = c.regulatoryBody
    ? `  regulatoryBody: ${c.regulatoryBody}`
    : "  regulatoryBody: not provided";
  const investorsLine =
    c.notableInvestors.length === 0
      ? "  notableInvestors: not provided"
      : `  notableInvestors: ${c.notableInvestors.join(", ")}`;
  const knownLine =
    c.knownProofItems.length === 0
      ? "  knownProofItems: none provided"
      : `  knownProofItems: ${c.knownProofItems.join(" | ")}`;

  return [
    `Assemble a social-proof package for ${c.companyName} for use in a ${c.targetUseContext.replace(/_/g, " ")}.`,
    "",
    "Company context:",
    `  name: ${c.companyName}`,
    `  sector: ${c.sector}`,
    `  HQ: ${c.headquartersLocation}`,
    arrLine,
    totalRaisedLine,
    customerLine,
    certsLine,
    regulatorLine,
    investorsLine,
    knownLine,
    `  includeDistrictSignals: ${c.includeDistrictSignals}`,
    "",
    "Organise the proof into the eight categories below. For each: list the actual items the input supports, label the category strength honestly, and write a 1-sentence rationale. Then produce a slide-ready markdown fragment, a gap analysis, a 0-100 legitimacy score, and concrete next actions to close the largest gaps.",
    "",
    `Categories: ${PROOF_CATEGORY_VALUES.join(", ")}.`,
    "",
    "Return ONLY a JSON object matching this schema (no markdown fences, no commentary):",
    "{",
    `  "schemaVersion": "${OUTPUT_SCHEMA_VERSION}",`,
    `  "companyName": string,`,
    `  "targetUseContext": "${c.targetUseContext}",`,
    `  "proofCategories": [                                  // exactly the 8 categories above`,
    `    { "category": string, "items": string[], "strengthLabel": "strong"|"moderate"|"weak"|"missing", "rationale": string }`,
    `  ],`,
    `  "recommendedSlideMarkdown": string,                    // ready-to-paste slide content for the targetUseContext`,
    `  "gapAnalysis": string[],                               // 3-8 specific gaps the founder needs to close`,
    `  "legitimacyScore": number,                             // 0-100, weighted toward the categories that matter for targetUseContext`,
    `  "nextActions": string[],                               // 4-8 concrete next steps with owner role hints`,
    `  "notes": string                                        // 1-2 sentences on caveats or assumptions`,
    "}",
  ].join("\n");
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

class SocialProofAgentHandler implements AgentHandler {
  agentId = "G1-115";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    const input = await resolveProofInput(context.input);
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
        outputSummary: `G1-115: LLM unavailable. company=${input.companyName}.`,
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
          title: `Social proof package unavailable — ${input.companyName}`,
          summary: `G1-115 could not reach ${context.llmModel}. Verify the relevant provider API key in Vercel env, then re-trigger.`,
          severity: "warning",
        },
      };
    }

    const proof = parseLlmJson(llmResult.text);

    if (!proof) {
      return {
        outputSummary: `G1-115: narrative-only output (JSON parse failed). company=${input.companyName}, ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
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
          title: `Social proof (draft) — ${input.companyName}`,
          summary: llmResult.text.slice(0, 600),
          severity: "info",
        },
      };
    }

    const userProfileId =
      typeof context.input?.userProfileId === "string" &&
      context.input.userProfileId.length > 0
        ? context.input.userProfileId
        : null;
    const linkedDocument =
      userProfileId && proof.recommendedSlideMarkdown.length > 0
        ? await spawnDocumentFromAgent({
            userProfileId,
            agentRunId: context.runId,
            agentId: context.agentId,
            collectionSlug: "sales-marketing",
            title: `Social proof package — ${proof.companyName}`,
            body: proof.recommendedSlideMarkdown,
            documentType: "marketing_doc",
            audienceType:
              proof.targetUseContext === "enterprise_pitch"
                ? "enterprise_client"
                : proof.targetUseContext === "press_kit"
                  ? "media"
                  : "investor",
            purposeType:
              proof.targetUseContext === "investor_deck"
                ? "fundraising"
                : proof.targetUseContext === "enterprise_pitch"
                  ? "partnership"
                  : "outreach",
            confidentiality: "internal",
            summary: `${proof.targetUseContext.replace(/_/g, " ")} — legitimacyScore=${proof.legitimacyScore}/100, ${proof.gapAnalysis.length} gaps.`,
          })
        : null;

    // Severity: warning if score < 50 (founder has a real proof gap)
    const severity: "info" | "warning" =
      proof.legitimacyScore < 50 ? "warning" : "info";

    return {
      outputSummary: `G1-115: ${proof.companyName} — legitimacy ${proof.legitimacyScore}/100 for ${proof.targetUseContext}; ${proof.gapAnalysis.length} gaps; ${proof.proofCategories.filter((c) => c.strengthLabel === "missing").length} categories missing.${linkedDocument ? ` Document=${linkedDocument.slug}.` : ""} ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
      outputData: {
        ...proof,
        inputSource: input.source,
        provider: llmResult.provider,
        modelId: llmResult.modelId,
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
        title: `Social proof — ${proof.companyName} (${proof.legitimacyScore}/100)`,
        summary: [
          `Target: ${proof.targetUseContext.replace(/_/g, " ")}.`,
          `Strongest: ${proof.proofCategories.filter((c) => c.strengthLabel === "strong").map((c) => c.category.replace(/_/g, " ")).slice(0, 3).join(", ") || "none"}.`,
          proof.gapAnalysis.length > 0
            ? `Gaps: ${proof.gapAnalysis.slice(0, 2).join("; ")}.`
            : "",
          proof.notes,
        ]
          .filter(Boolean)
          .join(" "),
        severity,
        details: {
          ...proof,
          inputSource: input.source,
          ...(linkedDocument && { linkedDocument }),
        },
      },
      learnings: [
        {
          type: "insight",
          title: `Proof score — ${proof.companyName}`,
          description: `${proof.legitimacyScore}/100 legitimacy for ${proof.targetUseContext}. ${proof.proofCategories.filter((c) => c.strengthLabel === "missing").length} categories missing; ${proof.gapAnalysis.length} concrete gaps.`,
          confidence: 0.65,
        },
      ],
    };
  }
}

export const socialProofAgentHandler = new SocialProofAgentHandler();
