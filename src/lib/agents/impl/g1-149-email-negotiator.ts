/**
 * G1-149: Email Negotiator
 *
 * Reads an inbound partnership / investment / acquisition / vendor /
 * customer / media email, classifies it, scores the leverage, and
 * drafts a reply in the founder's voice that follows their
 * negotiation playbook (red lines, must-haves, fallback positions).
 *
 * The reply is editable — the agent never sends. Instead it
 * mirrors the draft into the founder's My Documents tile so they
 * can polish + send via their own email client.
 *
 * Schedule: on_demand. Inputs:
 *   - userProfileId — founder voice + company context.
 *   - inboundEmail (required, the email text or markdown).
 *   - senderContext (optional — anything the founder already
 *     knows about the sender / firm).
 *   - requestType (partnership | investment | acquisition |
 *     vendor_offer | customer_inbound | media_request | other).
 *   - founderPlaybook (red lines, must-haves, fallback positions —
 *     the agent honours these).
 *   - desiredOutcome (optional).
 *
 * Output: classification + leverage assessment + recommended
 * stance (engage_warm | engage_cool | negotiate | deflect |
 * decline | ignore) + draft reply markdown + lever points +
 * counter-offer structure (if negotiating) + follow-up strategy +
 * red flags + escalateToFounder flag.
 *
 * When userProfileId is supplied AND the stance results in a reply,
 * the draft is mirrored to sales-marketing — audienceType +
 * purposeType routed by detectedRequestType.
 *
 * Ported byte-for-byte from London-Tech-Map. Ninth per-company
 * handler in OB. Second three-level-severity handler (critical /
 * warning / info). First handler to type the audience/purpose
 * routing via @prisma/client enums.
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
import type {
  DocAudienceType,
  PurposeType,
} from "@prisma/client";

// ─────────────────────────────────────────────
// Input contract
// ─────────────────────────────────────────────

const REQUEST_TYPE_VALUES = [
  "partnership",
  "investment",
  "acquisition",
  "vendor_offer",
  "customer_inbound",
  "media_request",
  "other",
] as const;

const STANCE_VALUES = [
  "engage_warm",
  "engage_cool",
  "negotiate",
  "deflect",
  "decline",
  "ignore",
] as const;

const URGENCY_VALUES = ["low", "medium", "high", "critical"] as const;
const LEVERAGE_VALUES = ["sender", "balanced", "founder"] as const;

const G149ExtensionSchema = z.object({
  inboundEmail: z.string().min(20).max(15_000).optional(),
  senderContext: z.string().min(1).max(2000).optional(),
  requestType: z.enum(REQUEST_TYPE_VALUES).optional(),
  founderPlaybook: z.string().min(1).max(5000).optional(),
  desiredOutcome: z.string().min(1).max(1000).optional(),
});

interface ResolvedNegotiationInput {
  companyName: string;
  sector: string;
  headquartersLocation: string;
  arr: number | null;
  totalRaised: number | null;
  regulatoryBody: string | null;
  inboundEmail: string | null;
  senderContext: string | null;
  requestType: (typeof REQUEST_TYPE_VALUES)[number] | null;
  founderPlaybook: string | null;
  desiredOutcome: string | null;
  source: CompanySource;
}

async function resolveNegotiationInput(
  raw: unknown,
): Promise<ResolvedNegotiationInput> {
  const base: ResolvedCompanyBase = await resolveUserCompany(raw);
  const ext = G149ExtensionSchema.safeParse(raw).data ?? {};

  const hasExtFields =
    Boolean(ext.inboundEmail) ||
    Boolean(ext.senderContext) ||
    Boolean(ext.requestType) ||
    Boolean(ext.founderPlaybook) ||
    Boolean(ext.desiredOutcome);
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
    inboundEmail: ext.inboundEmail?.trim() ?? null,
    senderContext: ext.senderContext?.trim() ?? null,
    requestType: ext.requestType ?? null,
    founderPlaybook: ext.founderPlaybook?.trim() ?? null,
    desiredOutcome: ext.desiredOutcome?.trim() ?? null,
    source,
  };
}

// ─────────────────────────────────────────────
// Output contract
// ─────────────────────────────────────────────

const OUTPUT_SCHEMA_VERSION = "1" as const;

interface NegotiationAssessment {
  detectedIntent: string;
  leverage: (typeof LEVERAGE_VALUES)[number];
  urgency: (typeof URGENCY_VALUES)[number];
  senderHooks: string[];
  founderRedLines: string[];
  founderHooks: string[];
}

export interface NegotiationPackage {
  schemaVersion: typeof OUTPUT_SCHEMA_VERSION;
  companyName: string;
  senderSummary: string;
  detectedRequestType: (typeof REQUEST_TYPE_VALUES)[number];
  assessment: NegotiationAssessment;
  recommendedStance: (typeof STANCE_VALUES)[number];
  draftReplyMarkdown: string;
  negotiationLeverPoints: string[];
  counterOfferStructure: string | null;
  followUpStrategy: string;
  redFlags: string[];
  escalateToFounder: boolean;
  escalationReason: string;
  notes: string;
}

function isAssessment(a: unknown): a is NegotiationAssessment {
  if (!a || typeof a !== "object") return false;
  const aa = a as Record<string, unknown>;
  return (
    typeof aa.detectedIntent === "string" &&
    (LEVERAGE_VALUES as readonly string[]).includes(aa.leverage as string) &&
    (URGENCY_VALUES as readonly string[]).includes(aa.urgency as string) &&
    Array.isArray(aa.senderHooks) &&
    aa.senderHooks.every((s) => typeof s === "string") &&
    Array.isArray(aa.founderRedLines) &&
    aa.founderRedLines.every((s) => typeof s === "string") &&
    Array.isArray(aa.founderHooks) &&
    aa.founderHooks.every((s) => typeof s === "string")
  );
}

export function isNegotiationPackage(obj: unknown): obj is NegotiationPackage {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.schemaVersion === OUTPUT_SCHEMA_VERSION &&
    typeof o.companyName === "string" &&
    typeof o.senderSummary === "string" &&
    (REQUEST_TYPE_VALUES as readonly string[]).includes(
      o.detectedRequestType as string,
    ) &&
    isAssessment(o.assessment) &&
    (STANCE_VALUES as readonly string[]).includes(
      o.recommendedStance as string,
    ) &&
    typeof o.draftReplyMarkdown === "string" &&
    Array.isArray(o.negotiationLeverPoints) &&
    (o.counterOfferStructure === null ||
      typeof o.counterOfferStructure === "string") &&
    typeof o.followUpStrategy === "string" &&
    Array.isArray(o.redFlags) &&
    typeof o.escalateToFounder === "boolean" &&
    typeof o.escalationReason === "string" &&
    typeof o.notes === "string"
  );
}

export function parseLlmJson(raw: string): NegotiationPackage | null {
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
      if (isNegotiationPackage(obj)) return obj;
    } catch {
      continue;
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// Audience / purpose routing per request type
// ─────────────────────────────────────────────

export function routeAudienceAndPurpose(
  requestType: (typeof REQUEST_TYPE_VALUES)[number],
): { audienceType: DocAudienceType; purposeType: PurposeType } {
  switch (requestType) {
    case "investment":
      return { audienceType: "investor", purposeType: "fundraising" };
    case "acquisition":
      return { audienceType: "acquirer", purposeType: "acquisition" };
    case "partnership":
      return { audienceType: "strategic_partner", purposeType: "partnership" };
    case "vendor_offer":
      return { audienceType: "internal", purposeType: "outreach" };
    case "customer_inbound":
      return { audienceType: "enterprise_client", purposeType: "outreach" };
    case "media_request":
      return { audienceType: "media", purposeType: "outreach" };
    case "other":
    default:
      return { audienceType: "internal", purposeType: "outreach" };
  }
}

// ─────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────

const DEFAULT_SYSTEM_PROMPT = [
  "You are a London-tech founder's chief-of-staff drafting reply emails to inbound partnership / investment / acquisition / vendor / customer / media requests.",
  "Honour the founder's playbook absolutely. Never breach a stated red line. Match the founder's voice — measured, specific, UK English.",
  "Score leverage honestly. If the sender holds the leverage, the draft must be courteous and curious; if the founder holds it, the draft can be more direct without being adversarial.",
  "Set escalateToFounder to true ONLY when the situation genuinely needs the founder's personal touch — pre-existing relationship, board-level matter, sensitive negotiation, or anything where a generic chief-of-staff voice would damage trust.",
  "If the inboundEmail is suspicious (impersonation signals, vague flattery, off-platform crypto-style asks), flag it in redFlags and recommend the 'deflect' or 'ignore' stance.",
  "Always return ONLY the JSON object the user requests — no preamble, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(c: ResolvedNegotiationInput): string {
  const arrLine =
    c.arr === null ? "  ARR: not provided" : `  ARR: £${Math.round(c.arr).toLocaleString()}`;
  const totalRaisedLine =
    c.totalRaised === null
      ? "  totalRaised: not provided"
      : `  totalRaised: £${Math.round(c.totalRaised).toLocaleString()}`;
  const regulatorLine = c.regulatoryBody
    ? `  regulatoryBody: ${c.regulatoryBody}`
    : "  regulatoryBody: not provided";
  const senderLine = c.senderContext
    ? `\nSender context (everything the founder already knows about the sender):\n---\n${c.senderContext}\n---`
    : "\nSender context: not provided.";
  const playbookBlock = c.founderPlaybook
    ? `\nFounder's negotiation playbook (honour absolutely):\n---\n${c.founderPlaybook}\n---`
    : "\nNo founder playbook provided. Use sensible UK-tech defaults: never commit to data sharing without DPA; never accept first-offer in investment / acquisition; protect founder time by default.";
  const outcomeLine = c.desiredOutcome
    ? `  desiredOutcome: ${c.desiredOutcome}`
    : "  desiredOutcome: not stated — infer from context";
  const requestTypeLine = c.requestType
    ? `  requestType (founder asserted): ${c.requestType} — confirm or correct in detectedRequestType`
    : "  requestType: not asserted — classify from email content";

  const emailBlock = c.inboundEmail
    ? `\nInbound email:\n---\n${c.inboundEmail}\n---\n`
    : "\nNo inboundEmail provided. Set notes to explain that inboundEmail is required, return empty fields, and exit.\n";

  return [
    `Read this inbound email to ${c.companyName} and draft a reply that follows the founder's playbook.`,
    "",
    "Company context:",
    `  name: ${c.companyName}`,
    `  sector: ${c.sector}`,
    `  HQ: ${c.headquartersLocation}`,
    arrLine,
    totalRaisedLine,
    regulatorLine,
    requestTypeLine,
    outcomeLine,
    senderLine,
    playbookBlock,
    emailBlock,
    "Classify the request, score leverage, choose a stance, and write the reply.",
    "",
    "Return ONLY a JSON object matching this schema (no markdown fences, no commentary):",
    "{",
    `  "schemaVersion": "${OUTPUT_SCHEMA_VERSION}",`,
    `  "companyName": string,`,
    `  "senderSummary": string,`,
    `  "detectedRequestType": "${REQUEST_TYPE_VALUES.join(`"|"`)}",`,
    `  "assessment": {`,
    `    "detectedIntent": string,`,
    `    "leverage": "${LEVERAGE_VALUES.join(`"|"`)}",`,
    `    "urgency": "${URGENCY_VALUES.join(`"|"`)}",`,
    `    "senderHooks": string[],`,
    `    "founderRedLines": string[],`,
    `    "founderHooks": string[]`,
    `  },`,
    `  "recommendedStance": "${STANCE_VALUES.join(`"|"`)}",`,
    `  "draftReplyMarkdown": string,`,
    `  "negotiationLeverPoints": string[],`,
    `  "counterOfferStructure": string | null,`,
    `  "followUpStrategy": string,`,
    `  "redFlags": string[],`,
    `  "escalateToFounder": boolean,`,
    `  "escalationReason": string,`,
    `  "notes": string`,
    "}",
  ].join("\n");
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

class EmailNegotiatorHandler implements AgentHandler {
  agentId = "G1-149";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    const input = await resolveNegotiationInput(context.input);

    if (!input.inboundEmail) {
      return {
        outputSummary: `G1-149: inboundEmail not provided. company=${input.companyName}.`,
        outputData: {
          companyName: input.companyName,
          inputSource: input.source,
          mode: "missing_inbound_email",
          schemaVersion: OUTPUT_SCHEMA_VERSION,
        },
        costUsd: 0,
        tokensUsed: 0,
        briefing: {
          type: "alert",
          title: `Email Negotiator — inboundEmail required`,
          summary: `G1-149 needs the inbound email content in the run input. Re-trigger with inboundEmail set.`,
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
        outputSummary: `G1-149: LLM unavailable. company=${input.companyName}.`,
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
          title: `Email reply unavailable — ${input.companyName}`,
          summary: `G1-149 could not reach ${context.llmModel}. Verify the relevant provider API key in Vercel env, then re-trigger.`,
          severity: "warning",
        },
      };
    }

    const pkg = parseLlmJson(llmResult.text);

    if (!pkg) {
      return {
        outputSummary: `G1-149: narrative-only output (JSON parse failed). company=${input.companyName}, ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
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
          title: `Email reply (draft) — ${input.companyName}`,
          summary: llmResult.text.slice(0, 600),
          severity: "info",
        },
      };
    }

    // Document spawn — only if the founder is going to send something
    // (skip if stance is ignore / decline with no reply text).
    const userProfileId =
      typeof context.input?.userProfileId === "string" &&
      context.input.userProfileId.length > 0
        ? context.input.userProfileId
        : null;
    const willSendReply =
      pkg.recommendedStance !== "ignore" && pkg.draftReplyMarkdown.length > 0;
    const { audienceType, purposeType } = routeAudienceAndPurpose(
      pkg.detectedRequestType,
    );
    const linkedDocument =
      userProfileId && willSendReply
        ? await spawnDocumentFromAgent({
            userProfileId,
            agentRunId: context.runId,
            agentId: context.agentId,
            collectionSlug: "sales-marketing",
            title: `Email reply — ${pkg.companyName} (${pkg.detectedRequestType.replace(/_/g, " ")})`,
            body: pkg.draftReplyMarkdown,
            documentType: "marketing_doc",
            audienceType,
            purposeType,
            confidentiality: "internal",
            summary: `Stance: ${pkg.recommendedStance}. Leverage: ${pkg.assessment.leverage}. ${pkg.escalateToFounder ? "ESCALATE — founder review required." : "Ready to edit and send."}`,
          })
        : null;

    // Severity routing:
    // critical when escalateToFounder=true OR red flags > 1
    // warning when redFlags=1 OR sender holds leverage on a non-trivial stance
    // info otherwise
    const severity: "info" | "warning" | "critical" =
      pkg.escalateToFounder || pkg.redFlags.length > 1
        ? "critical"
        : pkg.redFlags.length === 1 ||
            (pkg.assessment.leverage === "sender" &&
              pkg.recommendedStance !== "ignore" &&
              pkg.recommendedStance !== "decline")
          ? "warning"
          : "info";

    return {
      outputSummary: `G1-149: ${pkg.companyName} — ${pkg.detectedRequestType} → stance=${pkg.recommendedStance}, leverage=${pkg.assessment.leverage}, urgency=${pkg.assessment.urgency}.${pkg.escalateToFounder ? " ESCALATE." : ""} ${pkg.redFlags.length} red flags.${linkedDocument ? ` Document=${linkedDocument.slug}.` : ""} ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
      outputData: {
        ...pkg,
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
        type: "alert",
        title: `Inbound: ${pkg.detectedRequestType.replace(/_/g, " ")} — ${pkg.companyName} (${pkg.recommendedStance})`,
        summary: [
          pkg.senderSummary,
          `Recommended stance: ${pkg.recommendedStance}. Leverage: ${pkg.assessment.leverage}. Urgency: ${pkg.assessment.urgency}.`,
          pkg.escalateToFounder
            ? `ESCALATE: ${pkg.escalationReason}.`
            : "",
          pkg.redFlags.length > 0
            ? `Red flags: ${pkg.redFlags.slice(0, 2).join("; ")}.`
            : "",
          pkg.followUpStrategy,
        ]
          .filter(Boolean)
          .join(" "),
        severity,
        details: {
          ...pkg,
          inputSource: input.source,
          ...(linkedDocument && { linkedDocument }),
        },
      },
      learnings: [
        {
          type: "insight",
          title: `Inbound classified — ${pkg.detectedRequestType}`,
          description: `${pkg.companyName} received a ${pkg.detectedRequestType} request. Stance: ${pkg.recommendedStance}. Leverage: ${pkg.assessment.leverage}. Escalated: ${pkg.escalateToFounder}.`,
          confidence: 0.7,
        },
      ],
    };
  }
}

export const emailNegotiatorHandler = new EmailNegotiatorHandler();
