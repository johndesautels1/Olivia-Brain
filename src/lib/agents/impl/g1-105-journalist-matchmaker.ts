/**
 * G1-105: Journalist Matchmaker
 *
 * Matches a founder's announcement (funding round, product launch,
 * milestone, partnership, policy response, research finding) to
 * specific journalists at UK tech-relevant outlets — Sifted, FT
 * Tech, The Times Tech, TechCrunch EU, Wired UK, Bloomberg
 * London, The Guardian Tech, the New Statesman, Sky News
 * Technology, the Standard, Substack writers covering London
 * tech, etc. — and drafts a personalised pitch email per match.
 *
 * Schedule: on_demand. Inputs:
 *   - userProfileId (founder voice + company context)
 *   - announcementText (required — the news to pitch)
 *   - announcementType (funding_round | product_launch | milestone
 *     | partnership | policy_response | research_finding | other)
 *   - desiredOutlets (optional list to focus on)
 *   - exclusions (optional list of outlets / journalists to skip)
 *
 * Output: ranked journalist matches (each with the journalist's
 * beat, recent relevant stories, why-this-fits, a contact hint,
 * and a confidence score), a personalised pitch markdown ready
 * to send, three subject-line options, a follow-up strategy, and
 * any red flags about the pitch itself.
 *
 * When `userProfileId` is supplied the pitch markdown is
 * mirrored to the founder's My Documents tile in `sales-marketing`
 * (`marketing_doc` / `media` / `outreach`).
 *
 * LLM: this handler opts into provider-native web search
 * (`enableWebSearch: true`) — journalist beats shift weekly and
 * the search-grounded path keeps the matches anchored to who's
 * actually publishing what this week. First ported handler that
 * exercises callLLM's search opt-in.
 *
 * Ported byte-for-byte from London-Tech-Map src/lib/agents/impl/
 * g1-105-journalist-matchmaker.ts. Fifth per-company handler ported.
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

const ANNOUNCEMENT_TYPE_VALUES = [
  "funding_round",
  "product_launch",
  "milestone",
  "partnership",
  "policy_response",
  "research_finding",
  "other",
] as const;

const G105ExtensionSchema = z.object({
  announcementText: z.string().min(20).max(8000).optional(),
  announcementType: z.enum(ANNOUNCEMENT_TYPE_VALUES).optional(),
  desiredOutlets: z.array(z.string().min(1).max(120)).max(20).optional(),
  exclusions: z.array(z.string().min(1).max(120)).max(20).optional(),
  embargoDate: z.string().min(1).max(40).optional(),
});

interface ResolvedPitchInput {
  companyName: string;
  sector: string;
  headquartersLocation: string;
  arr: number | null;
  totalRaised: number | null;
  regulatoryBody: string | null;
  announcementText: string | null;
  announcementType: (typeof ANNOUNCEMENT_TYPE_VALUES)[number];
  desiredOutlets: string[];
  exclusions: string[];
  embargoDate: string | null;
  source: CompanySource;
}

async function resolvePitchInput(raw: unknown): Promise<ResolvedPitchInput> {
  const base: ResolvedCompanyBase = await resolveUserCompany(raw);
  const ext = G105ExtensionSchema.safeParse(raw).data ?? {};

  const hasExtFields =
    Boolean(ext.announcementText) ||
    Boolean(ext.announcementType) ||
    Array.isArray(ext.desiredOutlets) ||
    Array.isArray(ext.exclusions) ||
    Boolean(ext.embargoDate);
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
    announcementText: ext.announcementText?.trim() ?? null,
    announcementType: ext.announcementType ?? "other",
    desiredOutlets: ext.desiredOutlets ?? [],
    exclusions: ext.exclusions ?? [],
    embargoDate: ext.embargoDate?.trim() ?? null,
    source,
  };
}

// ─────────────────────────────────────────────
// Output contract
// ─────────────────────────────────────────────

const OUTPUT_SCHEMA_VERSION = "1" as const;

interface JournalistMatch {
  journalist: string;
  outlet: string;
  beat: string;
  recentRelevantStories: string[];
  whyMatch: string;
  contactHint: string;
  confidence: number;
}

export interface PitchPackage {
  schemaVersion: typeof OUTPUT_SCHEMA_VERSION;
  companyName: string;
  announcementSummary: string;
  announcementType: ResolvedPitchInput["announcementType"];
  matches: JournalistMatch[];
  pitchDraftMarkdown: string;
  subjectLineOptions: string[];
  followUpStrategy: string;
  redFlags: string[];
  embargoNote: string;
  notes: string;
}

function isJournalistMatch(m: unknown): m is JournalistMatch {
  if (!m || typeof m !== "object") return false;
  const mm = m as Record<string, unknown>;
  return (
    typeof mm.journalist === "string" &&
    typeof mm.outlet === "string" &&
    typeof mm.beat === "string" &&
    Array.isArray(mm.recentRelevantStories) &&
    mm.recentRelevantStories.every((s) => typeof s === "string") &&
    typeof mm.whyMatch === "string" &&
    typeof mm.contactHint === "string" &&
    typeof mm.confidence === "number" &&
    mm.confidence >= 0 &&
    mm.confidence <= 1
  );
}

export function isPitchPackage(obj: unknown): obj is PitchPackage {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.schemaVersion === OUTPUT_SCHEMA_VERSION &&
    typeof o.companyName === "string" &&
    typeof o.announcementSummary === "string" &&
    typeof o.announcementType === "string" &&
    Array.isArray(o.matches) &&
    (o.matches as unknown[]).every(isJournalistMatch) &&
    typeof o.pitchDraftMarkdown === "string" &&
    Array.isArray(o.subjectLineOptions) &&
    typeof o.followUpStrategy === "string" &&
    Array.isArray(o.redFlags) &&
    typeof o.embargoNote === "string" &&
    typeof o.notes === "string"
  );
}

export function parseLlmJson(raw: string): PitchPackage | null {
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
      if (isPitchPackage(obj)) return obj;
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
  "You are a London tech PR strategist who has placed founder stories in Sifted, FT, The Times, Bloomberg London, TechCrunch EU, Wired UK, the Guardian, Sky News Technology, the New Statesman, the Standard, and key Substack writers.",
  "Match each announcement to specific named journalists at UK-relevant outlets — never invent journalists or stories. If you can't be confident a journalist still covers a beat, say so explicitly in the contactHint and lower the confidence score.",
  "Use UK English and the understated London-tech voice. Never claim a journalist will cover a story; recommend an angle they would plausibly take.",
  "For contactHints, prefer outlet press inboxes or the journalist's published email; fall back to LinkedIn / their public profile if that's the safest. Never fabricate an email.",
  "Always return ONLY the JSON object the user requests — no preamble, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(c: ResolvedPitchInput): string {
  const totalRaisedLine =
    c.totalRaised === null
      ? "  totalRaised: not provided"
      : `  totalRaised: £${Math.round(c.totalRaised).toLocaleString()}`;
  const arrLine =
    c.arr === null
      ? "  ARR: not provided"
      : `  ARR: £${Math.round(c.arr).toLocaleString()}`;
  const regulatorLine = c.regulatoryBody
    ? `  regulatoryBody: ${c.regulatoryBody}`
    : "  regulatoryBody: not provided";
  const desiredLine =
    c.desiredOutlets.length === 0
      ? "  desiredOutlets: (no preference — pick the best 5-8)"
      : `  desiredOutlets: ${c.desiredOutlets.join(", ")}`;
  const exclusionsLine =
    c.exclusions.length === 0
      ? "  exclusions: none"
      : `  exclusions: ${c.exclusions.join(", ")}`;
  const embargoLine = c.embargoDate
    ? `  embargoDate: ${c.embargoDate}`
    : "  embargoDate: none — story can be pitched immediately";

  const announcementBlock = c.announcementText
    ? `\nAnnouncement text:\n---\n${c.announcementText}\n---\n`
    : "\nNo announcement text provided. Set notes to explain that announcementText is required, return an empty matches array and an empty pitchDraftMarkdown, then exit.\n";

  return [
    `Match this ${c.announcementType.replace(/_/g, " ")} from ${c.companyName} to UK tech journalists and draft a single personalised pitch the founder can send.`,
    "",
    "Company context:",
    `  name: ${c.companyName}`,
    `  sector: ${c.sector}`,
    `  HQ: ${c.headquartersLocation}`,
    arrLine,
    totalRaisedLine,
    regulatorLine,
    desiredLine,
    exclusionsLine,
    embargoLine,
    announcementBlock,
    "Return 5-8 ranked journalist matches. For each, name the journalist, outlet, beat (2-6 words), 1-3 recent relevant stories the journalist published, why this announcement fits their beat, a contact hint (press inbox or LinkedIn — never invent an email), and a 0-1 confidence score.",
    "Then write ONE pitch email markdown that the founder can adapt slide-by-slide to each match. Provide three subject-line options (under 70 chars each), a 2-3 sentence follow-up strategy, and any red flags about the announcement itself (over-claiming, thin evidence, embargo problems, regulatory exposure).",
    "",
    "Return ONLY a JSON object matching this schema (no markdown fences, no commentary):",
    "{",
    `  "schemaVersion": "${OUTPUT_SCHEMA_VERSION}",`,
    `  "companyName": string,`,
    `  "announcementSummary": string,                       // 1 sentence, the journalist's-eye summary`,
    `  "announcementType": "${c.announcementType}",`,
    `  "matches": [                                         // 5-8 entries, ranked by confidence desc`,
    `    {`,
    `      "journalist": string,`,
    `      "outlet": string,`,
    `      "beat": string,`,
    `      "recentRelevantStories": string[],               // 1-3 specific stories`,
    `      "whyMatch": string,`,
    `      "contactHint": string,                           // press inbox or LinkedIn URL pattern`,
    `      "confidence": number                             // 0-1`,
    `    }`,
    `  ],`,
    `  "pitchDraftMarkdown": string,                         // ready-to-adapt pitch email`,
    `  "subjectLineOptions": string[],                       // 3 alternatives, each < 70 chars`,
    `  "followUpStrategy": string,                           // 2-3 sentences, includes timing`,
    `  "redFlags": string[],                                 // 0-5 concerns about the announcement itself`,
    `  "embargoNote": string,                                // how the embargo affects pitch timing`,
    `  "notes": string                                       // 1-2 sentences on caveats`,
    "}",
  ].join("\n");
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

class JournalistMatchmakerHandler implements AgentHandler {
  agentId = "G1-105";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    const input = await resolvePitchInput(context.input);

    if (!input.announcementText) {
      return {
        outputSummary: `G1-105: announcementText not provided. company=${input.companyName}.`,
        outputData: {
          companyName: input.companyName,
          inputSource: input.source,
          mode: "missing_announcement_text",
          schemaVersion: OUTPUT_SCHEMA_VERSION,
        },
        costUsd: 0,
        tokensUsed: 0,
        briefing: {
          type: "alert",
          title: `Journalist Matchmaker — announcementText required`,
          summary: `G1-105 needs the founder's announcement copy in the run input. Re-trigger with announcementText set.`,
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
      // Journalist beats shift weekly — let the LLM ground itself.
      enableWebSearch: true,
    });

    if (!llmResult) {
      return {
        outputSummary: `G1-105: LLM unavailable. company=${input.companyName}.`,
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
          title: `Journalist matches unavailable — ${input.companyName}`,
          summary: `G1-105 could not reach ${context.llmModel}. Verify the relevant provider API key in Vercel env, then re-trigger.`,
          severity: "warning",
        },
      };
    }

    const pitch = parseLlmJson(llmResult.text);

    if (!pitch) {
      return {
        outputSummary: `G1-105: narrative-only output (JSON parse failed). company=${input.companyName}, ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
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
          title: `Journalist pitch (draft) — ${input.companyName}`,
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
      userProfileId && pitch.pitchDraftMarkdown.length > 0
        ? await spawnDocumentFromAgent({
            userProfileId,
            agentRunId: context.runId,
            agentId: context.agentId,
            collectionSlug: "sales-marketing",
            title: `Journalist pitch — ${pitch.companyName} (${pitch.announcementType.replace(/_/g, " ")})`,
            body: pitch.pitchDraftMarkdown,
            documentType: "marketing_doc",
            audienceType: "media",
            purposeType: "outreach",
            confidentiality: "internal",
            summary: `${pitch.matches.length} journalist matches; top outlet: ${pitch.matches[0]?.outlet ?? "n/a"}.`,
          })
        : null;

    const severity: "info" | "warning" =
      pitch.redFlags.length > 0 ? "warning" : "info";

    return {
      outputSummary: `G1-105: ${pitch.companyName} — ${pitch.matches.length} journalist matches; top: ${pitch.matches[0]?.journalist ?? "n/a"} @ ${pitch.matches[0]?.outlet ?? "n/a"}. ${pitch.redFlags.length} red flags.${linkedDocument ? ` Document=${linkedDocument.slug}.` : ""} ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
      outputData: {
        ...pitch,
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
        title: `Journalist matches — ${pitch.companyName} (${pitch.matches.length})`,
        summary: [
          pitch.announcementSummary,
          `Top match: ${pitch.matches[0]?.journalist ?? "n/a"} (${pitch.matches[0]?.outlet ?? "n/a"}, ${pitch.matches[0]?.beat ?? ""}).`,
          pitch.redFlags.length > 0
            ? `Red flags: ${pitch.redFlags.slice(0, 2).join("; ")}.`
            : "",
          pitch.embargoNote,
        ]
          .filter(Boolean)
          .join(" "),
        severity,
        details: {
          ...pitch,
          inputSource: input.source,
          ...(linkedDocument && { linkedDocument }),
        },
      },
      learnings: [
        {
          type: "insight",
          title: `Journalist match — ${pitch.companyName}`,
          description: `${pitch.matches.length} matches for a ${pitch.announcementType} announcement. Top outlets: ${pitch.matches.slice(0, 3).map((m) => m.outlet).join(", ")}.`,
          confidence: 0.6,
        },
      ],
    };
  }
}

export const journalistMatchmakerHandler = new JournalistMatchmakerHandler();
