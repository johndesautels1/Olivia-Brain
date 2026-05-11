/**
 * G1-033: Data Protection Orchestrator
 *
 * Generates a UK GDPR Data Protection Impact Assessment (DPIA) for a
 * single founder's company. DPIAs are mandatory under Article 35 when
 * processing is likely to result in a high risk to the rights and
 * freedoms of natural persons; the ICO publishes nine criteria the
 * agent reasons over.
 *
 * Schedule: on_demand. Two input shapes are supported:
 *   - userProfileId — pulls UserCompanyProfile (companyName, sector,
 *     employeeCount, certifications, regulatoryBody, customerCount,
 *     etc.) and uses that as context.
 *   - explicit companyName / sector / employeeCount / techStack /
 *     processesSpecialCategoryData / customerCount.
 *
 * Output: an assessment of whether a DPIA is required, a full DPIA
 * markdown document covering the four Article 35(7) areas, a data-
 * mapping checklist, recommended safeguards, and next actions.
 *
 * When `userProfileId` is supplied, the markdown document is mirrored
 * into the founder's My Documents tile (legal-compliance collection)
 * so the founder can edit + version + publish it. The briefing detail
 * page renders a "View full document →" CTA via the embedded
 * documentId in `briefing.details` once the workspace routes are
 * ported (Track B carry-forward).
 *
 * Ported byte-for-byte from London-Tech-Map src/lib/agents/impl/
 * g1-033-data-protection-orchestrator.ts as the canonical OB agent
 * handler. Future per-company handlers should mirror this structure:
 *   - Strict Zod extension schema (BaseCompanyInputSchema.extend or
 *     standalone)
 *   - Versioned output schema (OUTPUT_SCHEMA_VERSION constant)
 *   - isXxxDocument() type guard
 *   - parseLlmJson() with fence-and-brace fallback
 *   - Structured fallback briefing when LLM is unavailable / JSON
 *     parse fails
 *   - spawnDocumentFromAgent() when userProfileId is present
 *   - Provenance surfaced in outputData.inputSource
 *
 * (Locked 2026-05-08 per feedback memory: every new agent handler mirrors
 * this structure.)
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

/** G1-033-specific extension fields. Strict — base fields are validated
 *  by the shared resolver. */
const G033ExtensionSchema = z.object({
  techStack: z.array(z.string().min(1).max(80)).max(50).optional(),
  processesSpecialCategoryData: z.boolean().optional(),
  customerCount: z.number().int().nonnegative().optional(),
});

interface ResolvedDpiaCompany {
  companyName: string;
  sector: string;
  employeeCount: number | null;
  headquartersLocation: string;
  techStack: string[];
  certifications: string[];
  regulatoryBody: string | null;
  customerCount: number | null;
  processesSpecialCategoryData: boolean | null;
  source: CompanySource;
  ownerClerkUserId: string | null;
}

async function resolveDpiaCompany(raw: unknown): Promise<ResolvedDpiaCompany> {
  const base: ResolvedCompanyBase = await resolveUserCompany(raw);
  const ext = G033ExtensionSchema.safeParse(raw).data ?? {};

  // G1-033-specific fields count for "input" provenance.
  const hasExtFields =
    Array.isArray(ext.techStack) ||
    typeof ext.processesSpecialCategoryData === "boolean" ||
    typeof ext.customerCount === "number";
  let source = base.source;
  if (source === "default" && hasExtFields) source = "input";
  else if (source === "profile" && hasExtFields) source = "input+profile";

  return {
    companyName: base.companyName,
    sector: base.sector,
    employeeCount: base.employeeCount,
    headquartersLocation: base.headquartersLocation,
    techStack: ext.techStack ?? [],
    certifications: base.certifications,
    regulatoryBody: base.regulatoryBody,
    customerCount: ext.customerCount ?? base.customerCount,
    processesSpecialCategoryData: ext.processesSpecialCategoryData ?? null,
    source,
    ownerClerkUserId: base.ownerClerkUserId,
  };
}

// ─────────────────────────────────────────────
// Output contract
// ─────────────────────────────────────────────

const OUTPUT_SCHEMA_VERSION = "1" as const;

interface DpiaAssessment {
  dpiaRequired: boolean;
  reason: string;
  applicableHighRiskCriteria: string[];
  legalBasisGuidance: string;
}

export interface DpiaDocument {
  schemaVersion: typeof OUTPUT_SCHEMA_VERSION;
  companyName: string;
  assessmentDateLabel: string;
  assessment: DpiaAssessment;
  dpiaMarkdown: string;
  dataMappingChecklist: string[];
  recommendedSafeguards: string[];
  nextActions: string[];
  reviewCadenceNote: string;
  notes: string;
}

export function isDpiaDocument(obj: unknown): obj is DpiaDocument {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  const a = o.assessment as Record<string, unknown> | undefined;
  return (
    o.schemaVersion === OUTPUT_SCHEMA_VERSION &&
    typeof o.companyName === "string" &&
    typeof o.assessmentDateLabel === "string" &&
    !!a &&
    typeof a.dpiaRequired === "boolean" &&
    typeof a.reason === "string" &&
    Array.isArray(a.applicableHighRiskCriteria) &&
    typeof a.legalBasisGuidance === "string" &&
    typeof o.dpiaMarkdown === "string" &&
    Array.isArray(o.dataMappingChecklist) &&
    Array.isArray(o.recommendedSafeguards) &&
    Array.isArray(o.nextActions) &&
    typeof o.reviewCadenceNote === "string" &&
    typeof o.notes === "string"
  );
}

export function parseLlmJson(raw: string): DpiaDocument | null {
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
      if (isDpiaDocument(obj)) return obj;
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
  "You are a UK data protection counsel and ICO-aligned privacy engineer drafting Data Protection Impact Assessments (DPIAs) for technology companies.",
  "Decide whether a DPIA is required under UK GDPR Article 35 by reasoning over the ICO's nine high-risk criteria and the company's actual processing activities.",
  "When you draft the DPIA, cover all four mandatory areas of Article 35(7): description of processing, necessity & proportionality, risk assessment, and mitigating measures.",
  "Be concrete and honest about gaps in the company's current state — never claim controls that the input does not support.",
  "Always return ONLY the JSON object the user requests — no preamble, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(c: ResolvedDpiaCompany, todayLabel: string): string {
  const employeeLine =
    c.employeeCount === null
      ? "  employees: not provided"
      : `  employees: ${c.employeeCount}`;
  const customerLine =
    c.customerCount === null
      ? "  data subjects (customers / users): not provided"
      : `  data subjects (customers / users): ${c.customerCount.toLocaleString()}`;
  const techLine =
    c.techStack.length === 0
      ? "  techStack: not provided"
      : `  techStack: ${c.techStack.join(", ")}`;
  const certsLine =
    c.certifications.length === 0
      ? "  certifications: none recorded"
      : `  certifications: ${c.certifications.join(", ")}`;
  const regulatorLine =
    c.regulatoryBody === null
      ? "  regulatoryBody: not provided"
      : `  regulatoryBody: ${c.regulatoryBody}`;
  const specialCategoryLine =
    c.processesSpecialCategoryData === null
      ? "  processesSpecialCategoryData: not asserted (infer from sector + tech)"
      : `  processesSpecialCategoryData: ${c.processesSpecialCategoryData ? "yes" : "no"}`;

  return [
    `Generate a UK GDPR Article 35 DPIA for the following company. Today: ${todayLabel}.`,
    "",
    "Company context:",
    `  name: ${c.companyName}`,
    `  sector: ${c.sector}`,
    `  HQ: ${c.headquartersLocation}`,
    employeeLine,
    customerLine,
    techLine,
    certsLine,
    regulatorLine,
    specialCategoryLine,
    "",
    "1. Decide whether a DPIA is required. Cite which of the ICO's nine high-risk criteria apply (e.g., systematic monitoring, processing on a large scale, special category data, innovative tech, vulnerable data subjects, evaluation/scoring, automated decisions with legal effects, matching/combining datasets, denying users their rights). Be specific about the company's actual context — not generic.",
    "2. Suggest the appropriate Article 6 lawful basis (and Article 9 condition if special category data is processed).",
    "3. Write the DPIA in markdown, with H2 sections for the four Article 35(7) areas: (a) Description of processing operations and purposes, (b) Necessity & proportionality assessment, (c) Risks to rights and freedoms (likelihood × severity), (d) Mitigating measures and safeguards.",
    "4. Include a data-mapping checklist (data categories the company likely processes — e.g., contact data, financial data, behavioural analytics, biometric, health, location, etc.) and recommended safeguards (encryption at rest / in transit, role-based access, retention schedules, DPO appointment, sub-processor audit, transfer safeguards, etc.).",
    "5. Recommend concrete next actions and a review cadence (when the DPIA must be revisited).",
    "",
    "Return ONLY a JSON object matching this schema (no markdown fences, no commentary):",
    "{",
    `  "schemaVersion": "${OUTPUT_SCHEMA_VERSION}",`,
    `  "companyName": string,`,
    `  "assessmentDateLabel": string,                  // e.g. "DPIA — November 2026"`,
    `  "assessment": {`,
    `    "dpiaRequired": boolean,`,
    `    "reason": string,                             // 2-3 sentences citing Article 35 + the ICO criteria that apply`,
    `    "applicableHighRiskCriteria": string[],       // ICO criteria names that apply (subset of the nine)`,
    `    "legalBasisGuidance": string                  // recommended Article 6 lawful basis (+ Article 9 if applicable)`,
    `  },`,
    `  "dpiaMarkdown": string,                          // full DPIA document, H2 sections for the four 35(7) areas`,
    `  "dataMappingChecklist": string[],                // 6-12 data categories the company likely processes`,
    `  "recommendedSafeguards": string[],               // 5-10 measures, prioritised`,
    `  "nextActions": string[],                         // 4-8 concrete next actions with owner role hints`,
    `  "reviewCadenceNote": string,                     // when the DPIA must be reviewed (e.g. on each new processing activity, annually, after a major release)`,
    `  "notes": string                                  // 1-2 sentences on caveats or gaps in the data provided`,
    "}",
  ].join("\n");
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

class DataProtectionOrchestratorHandler implements AgentHandler {
  agentId = "G1-033";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    const company = await resolveDpiaCompany(context.input);
    const now = new Date();
    const todayLabel = now.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const userPrompt = buildUserPrompt(company, todayLabel);

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
        outputSummary: `G1-033: LLM unavailable (provider key missing or call failed). company=${company.companyName}.`,
        outputData: {
          companyName: company.companyName,
          inputSource: company.source,
          mode: "llm_unavailable",
          schemaVersion: OUTPUT_SCHEMA_VERSION,
        },
        costUsd: 0,
        tokensUsed: 0,
        briefing: {
          type: "alert",
          title: `DPIA unavailable — ${company.companyName}`,
          summary: `G1-033 could not reach ${context.llmModel}. Verify the relevant provider API key in Vercel env, then re-trigger.`,
          severity: "warning",
        },
      };
    }

    const dpia = parseLlmJson(llmResult.text);

    if (!dpia) {
      return {
        outputSummary: `G1-033: narrative-only output (JSON parse failed). company=${company.companyName}, ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
        outputData: {
          companyName: company.companyName,
          inputSource: company.source,
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
          title: `DPIA (draft) — ${company.companyName}`,
          summary: llmResult.text.slice(0, 600),
          severity: "info",
        },
      };
    }

    // Mirror the DPIA markdown to My Documents (legal-compliance) so the
    // founder can edit + version + publish from /documents/[id]/studio.
    // Best-effort — agent run completes regardless.
    const userProfileId =
      typeof context.input?.userProfileId === "string" &&
      context.input.userProfileId.length > 0
        ? context.input.userProfileId
        : null;
    const linkedDocument = userProfileId
      ? await spawnDocumentFromAgent({
          userProfileId,
          agentRunId: context.runId,
          agentId: context.agentId,
          collectionSlug: "legal-compliance",
          title: `DPIA — ${dpia.companyName}`,
          body: dpia.dpiaMarkdown,
          documentType: "legal_agreement",
          audienceType: "internal",
          purposeType: "diligence",
          confidentiality: "internal",
          summary: `${dpia.assessment.dpiaRequired ? "DPIA REQUIRED" : "DPIA not required (voluntary draft)"} — ${dpia.companyName}.`,
        })
      : null;

    const severity: "info" | "warning" = dpia.assessment.dpiaRequired
      ? "warning"
      : "info";

    return {
      outputSummary: `G1-033: ${dpia.companyName} — ${dpia.assessment.dpiaRequired ? "DPIA REQUIRED" : "voluntary/draft"}, ${dpia.assessment.applicableHighRiskCriteria.length} ICO criteria applicable, ${dpia.recommendedSafeguards.length} safeguards.${linkedDocument ? ` Document=${linkedDocument.slug}.` : ""} ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
      outputData: {
        ...dpia,
        inputSource: company.source,
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
        title: `DPIA (${dpia.assessment.dpiaRequired ? "required" : "voluntary"}) — ${dpia.companyName}`,
        summary: [
          dpia.assessment.reason,
          `Top safeguards: ${dpia.recommendedSafeguards.slice(0, 3).join("; ")}.`,
          `Review: ${dpia.reviewCadenceNote}`,
          dpia.notes,
        ]
          .filter(Boolean)
          .join(" "),
        severity,
        details: {
          ...dpia,
          inputSource: company.source,
          ...(linkedDocument && { linkedDocument }),
        },
      },
      learnings: [
        {
          type: "insight",
          title: `DPIA outcome — ${dpia.companyName}`,
          description: `${dpia.assessment.dpiaRequired ? "Required" : "Not required"}. Criteria: ${dpia.assessment.applicableHighRiskCriteria.join(", ") || "none"}. Lawful basis: ${dpia.assessment.legalBasisGuidance}.`,
          confidence: 0.7,
        },
      ],
    };
  }
}

export const dataProtectionOrchestratorHandler =
  new DataProtectionOrchestratorHandler();
