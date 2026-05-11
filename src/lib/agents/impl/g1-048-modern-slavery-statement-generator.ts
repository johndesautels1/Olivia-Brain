/**
 * G1-048: Modern Slavery Statement Generator
 *
 * Generates a UK Modern Slavery Act 2015 (s.54) compliant statement for
 * a company. Companies with turnover >= £36M must publish an annual
 * statement; smaller companies often choose to publish voluntarily as
 * an enterprise-buyer-readiness signal.
 *
 * Schedule: on_demand. Two input shapes are supported:
 *   - userProfileId — pulls UserCompanyProfile (companyName, sector,
 *     employeeCount, ARR, totalRaised, etc.) and uses that as context
 *   - explicit companyName / turnoverGbp / financialYearEnd / sector etc.
 *
 * Output: requirementCheck (whether the statement is legally required),
 * a markdown statement covering all six s.54 areas, recommended KPIs,
 * and the next publication deadline.
 *
 * When `userProfileId` is supplied, the markdown is mirrored into the
 * founder's My Documents tile (legal-compliance collection) so the
 * founder can edit + version + publish from /documents/[id]/studio
 * (Track B carry-forward port lands those routes).
 *
 * Ported byte-for-byte from London-Tech-Map src/lib/agents/impl/
 * g1-048-modern-slavery-statement-generator.ts. Second per-company
 * handler in OB after G1-033; mirrors G1-033's structure (canonical
 * pattern per feedback memory locked 2026-05-08).
 */

import { z } from "zod";
import type { AgentHandler, AgentRunContext, AgentRunResult } from "../handlers";
import { callLLM } from "../llm";
import { spawnDocumentFromAgent } from "../document-mirror";
import {
  resolveUserCompany,
  type CompanySource,
} from "../resolve-company";

// ─────────────────────────────────────────────
// Input contract
// ─────────────────────────────────────────────

const TURNOVER_THRESHOLD_GBP = 36_000_000; // s.54 statutory threshold

/** G1-048-specific fields layered on top of the shared base schema.
 *  Strict (no passthrough) — base fields are validated by the helper. */
const G048ExtensionSchema = z.object({
  turnoverGbp: z.number().nonnegative().optional(),
  financialYearEnd: z.string().min(4).max(20).optional(),
  publishVoluntarily: z.boolean().optional(),
});

interface ResolvedCompany {
  companyName: string;
  sector: string;
  turnoverGbp: number | null;
  employeeCount: number | null;
  financialYearEnd: string | null;
  headquartersLocation: string;
  publishVoluntarily: boolean;
  source: CompanySource;
}

async function resolveCompany(raw: unknown): Promise<ResolvedCompany> {
  const base = await resolveUserCompany(raw);
  const ext = G048ExtensionSchema.safeParse(raw).data ?? {};

  // Explicit turnover wins; otherwise ARR is the closest proxy on
  // UserCompanyProfile (the prompt flags the caveat).
  const turnoverGbp = ext.turnoverGbp ?? base.arr ?? null;

  // G1-048-specific input fields also count as "input" provenance —
  // preserve the pre-helper behaviour where an explicit turnoverGbp
  // (without any base fields) was tagged as input rather than default.
  const hasExtFields =
    typeof ext.turnoverGbp === "number" ||
    Boolean(ext.financialYearEnd) ||
    typeof ext.publishVoluntarily === "boolean";
  let source = base.source;
  if (source === "default" && hasExtFields) source = "input";
  else if (source === "profile" && hasExtFields) source = "input+profile";

  return {
    companyName: base.companyName,
    sector: base.sector,
    turnoverGbp,
    employeeCount: base.employeeCount,
    financialYearEnd: ext.financialYearEnd?.trim() ?? null,
    headquartersLocation: base.headquartersLocation,
    publishVoluntarily: ext.publishVoluntarily ?? false,
    source,
  };
}

// ─────────────────────────────────────────────
// Output contract
// ─────────────────────────────────────────────

interface RequirementCheck {
  legallyRequired: boolean;
  reason: string;
  publicationDeadlineNote: string;
}

export interface ModernSlaveryStatement {
  companyName: string;
  financialYearReference: string;
  requirementCheck: RequirementCheck;
  statementMarkdown: string;
  recommendedKpis: string[];
  signOffGuidance: string;
  notes: string;
}

export function isStatement(obj: unknown): obj is ModernSlaveryStatement {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  const req = o.requirementCheck as Record<string, unknown> | undefined;
  return (
    typeof o.companyName === "string" &&
    typeof o.financialYearReference === "string" &&
    !!req &&
    typeof req.legallyRequired === "boolean" &&
    typeof req.reason === "string" &&
    typeof req.publicationDeadlineNote === "string" &&
    typeof o.statementMarkdown === "string" &&
    Array.isArray(o.recommendedKpis) &&
    typeof o.signOffGuidance === "string" &&
    typeof o.notes === "string"
  );
}

export function parseLlmJson(raw: string): ModernSlaveryStatement | null {
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
      if (isStatement(obj)) return obj;
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
  "You are a UK corporate-compliance counsel drafting Modern Slavery Act 2015 (s.54) statements for technology companies.",
  "Cover all six required areas (organisational structure, supply chains, policies, due diligence, risk assessment, KPIs / training) at a length appropriate to a London-tech business.",
  "Be honest about what the company can and cannot say at its current stage; never claim due-diligence processes that don't exist.",
  "Always return ONLY the JSON object the user requests — no preamble, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(c: ResolvedCompany): string {
  const turnoverLine =
    c.turnoverGbp === null
      ? "  turnover: not provided (assume below £36M threshold unless otherwise stated)"
      : `  turnover: £${Math.round(c.turnoverGbp).toLocaleString()} GBP`;
  const employeeLine =
    c.employeeCount === null
      ? "  employees: not provided"
      : `  employees: ${c.employeeCount}`;
  const fyLine =
    c.financialYearEnd === null
      ? "  financialYearEnd: not provided"
      : `  financialYearEnd: ${c.financialYearEnd}`;

  return [
    "Generate a Modern Slavery Act 2015 s.54 statement for the following company.",
    "",
    "Company context:",
    `  name: ${c.companyName}`,
    `  sector: ${c.sector}`,
    `  HQ: ${c.headquartersLocation}`,
    turnoverLine,
    employeeLine,
    fyLine,
    `  publishVoluntarily: ${c.publishVoluntarily ? "yes" : "no"}`,
    "",
    "Determine whether this company is legally required to publish a statement (turnover threshold £36M) and explain the reasoning.",
    "Then write the statement itself in markdown, covering ALL SIX areas required by s.54: (1) organisational structure & supply chains, (2) policies, (3) due diligence processes, (4) risk assessment & management, (5) effectiveness KPIs, (6) training.",
    "If turnover is below the threshold and publishVoluntarily is yes, write a voluntary statement framed as enterprise-buyer-readiness.",
    "If turnover is below the threshold and publishVoluntarily is no, still produce a statement but mark it as draft-only and explicitly note in `notes` that publication is not legally required.",
    "",
    "Return ONLY a JSON object matching this schema (no markdown fences, no commentary):",
    "{",
    `  "companyName": string,`,
    `  "financialYearReference": string,         // e.g. "FY ending 31 March 2026"`,
    `  "requirementCheck": {`,
    `    "legallyRequired": boolean,`,
    `    "reason": string,                       // 1-2 sentences citing s.54 threshold`,
    `    "publicationDeadlineNote": string       // when must this be on the public website`,
    `  },`,
    `  "statementMarkdown": string,              // the full markdown statement, with H2 sections for each of the six s.54 areas`,
    `  "recommendedKpis": string[],              // 4-6 measurable KPIs the company should track and report next year`,
    `  "signOffGuidance": string,                // who should sign and how (board approval, director signature)`,
    `  "notes": string                           // 1-2 sentences on caveats: voluntary vs required, gaps in data provided`,
    "}",
  ].join("\n");
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

class ModernSlaveryStatementGeneratorHandler implements AgentHandler {
  agentId = "G1-048";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    const company = await resolveCompany(context.input);
    const userPrompt = buildUserPrompt(company);

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
        outputSummary: `G1-048: LLM unavailable (provider key missing or call failed). company=${company.companyName}.`,
        outputData: {
          companyName: company.companyName,
          inputSource: company.source,
          mode: "llm_unavailable",
        },
        costUsd: 0,
        tokensUsed: 0,
        briefing: {
          type: "alert",
          title: `Modern Slavery Statement unavailable — ${company.companyName}`,
          summary: `G1-048 could not reach ${context.llmModel}. Verify the relevant provider API key in Vercel env, then re-trigger.`,
          severity: "warning",
        },
      };
    }

    const statement = parseLlmJson(llmResult.text);

    if (!statement) {
      return {
        outputSummary: `G1-048: narrative-only output (JSON parse failed). company=${company.companyName}, ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
        outputData: {
          companyName: company.companyName,
          inputSource: company.source,
          narrative: llmResult.text,
          parseFailed: true,
          provider: llmResult.provider,
          modelId: llmResult.modelId,
        },
        costUsd: llmResult.costUsd,
        tokensUsed: llmResult.tokensUsed,
        briefing: {
          type: "weekly",
          title: `Modern Slavery Statement (draft) — ${company.companyName}`,
          summary: llmResult.text.slice(0, 600),
          severity: "info",
        },
      };
    }

    const thresholdState = (() => {
      if (company.turnoverGbp === null) return "turnover-not-provided";
      return company.turnoverGbp >= TURNOVER_THRESHOLD_GBP
        ? "above-threshold"
        : "below-threshold";
    })();

    // Mirror to My Documents tile so the founder can edit + version + publish
    // the markdown statement from /documents/[id]. Best-effort.
    const userProfileId =
      typeof context.input?.userProfileId === "string" &&
      context.input.userProfileId.length > 0
        ? context.input.userProfileId
        : null;
    const linkedDocument =
      userProfileId
        ? await spawnDocumentFromAgent({
            userProfileId,
            agentRunId: context.runId,
            agentId: context.agentId,
            collectionSlug: "legal-compliance",
            title: `Modern Slavery Statement — ${statement.companyName}`,
            body: statement.statementMarkdown,
            documentType: "legal_agreement",
            audienceType: "internal",
            purposeType: "diligence",
            confidentiality: "internal",
            summary: `${statement.requirementCheck.legallyRequired ? "REQUIRED" : "voluntary"} statement for ${statement.companyName} — ${thresholdState}.`,
          })
        : null;

    return {
      outputSummary: `G1-048: ${statement.companyName} — ${statement.requirementCheck.legallyRequired ? "REQUIRED" : "voluntary/draft"}, threshold=${thresholdState}, ${statement.recommendedKpis.length} KPIs.${linkedDocument ? ` Document=${linkedDocument.slug}.` : ""} ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
      outputData: {
        ...statement,
        inputSource: company.source,
        thresholdState,
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
        title: `Modern Slavery Statement (${statement.requirementCheck.legallyRequired ? "required" : "voluntary"}) — ${statement.companyName}`,
        summary: [
          statement.requirementCheck.reason,
          `Publication: ${statement.requirementCheck.publicationDeadlineNote}.`,
          `Recommended KPIs: ${statement.recommendedKpis.slice(0, 3).join("; ")}.`,
          statement.notes,
        ]
          .filter(Boolean)
          .join(" "),
        severity: statement.requirementCheck.legallyRequired ? "warning" : "info",
        details: {
          ...statement,
          thresholdState,
          ...(linkedDocument && { linkedDocument }),
        },
      },
    };
  }
}

export const modernSlaveryStatementGeneratorHandler =
  new ModernSlaveryStatementGeneratorHandler();
