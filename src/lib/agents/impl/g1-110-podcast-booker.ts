/**
 * G1-110: Podcast Booker
 *
 * Matches a London-tech founder to relevant tech / business
 * podcasts (Sifted Audio, 20 Minute VC, EUVC, This Much I Know,
 * Working Hard, the AI Daily Brief, the Pivot, Founders Stories
 * EU, etc.) and drafts a tailored pitch hook per show plus one
 * master outreach email.
 *
 * Schedule: on_demand. Inputs:
 *   - userProfileId — pulls UserCompanyProfile.
 *   - founderBio (required — short bio + 1-2 talking points).
 *   - pitchAngle (the headline angle; the agent picks one if not
 *     supplied).
 *   - desiredFormat (interview | panel | case_study | quick_take).
 *   - desiredAudience (founders | investors | operators |
 *     general_tech).
 *   - exclusions (podcasts / hosts to skip).
 *
 * Output: 5-8 ranked podcast matches each with 3 tailored hooks,
 * master pitch email, 3 subject-line options, follow-up strategy,
 * booking expectations, red flags.
 *
 * Opt-in web search: shows come and go; sonar-pro grounds the
 * matches in podcasts that are actually still publishing.
 *
 * Ported byte-for-byte from London-Tech-Map src/lib/agents/impl/
 * g1-110-podcast-booker.ts. Seventh per-company handler ported.
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

const FORMAT_VALUES = [
  "interview",
  "panel",
  "case_study",
  "quick_take",
] as const;
const AUDIENCE_VALUES = [
  "founders",
  "investors",
  "operators",
  "general_tech",
] as const;

const G110ExtensionSchema = z.object({
  founderBio: z.string().min(20).max(5000).optional(),
  founderName: z.string().min(1).max(120).optional(),
  pitchAngle: z.string().min(3).max(500).optional(),
  desiredFormat: z.enum(FORMAT_VALUES).optional(),
  desiredAudience: z.enum(AUDIENCE_VALUES).optional(),
  exclusions: z.array(z.string().min(1).max(120)).max(20).optional(),
});

interface ResolvedPodcastInput {
  companyName: string;
  sector: string;
  headquartersLocation: string;
  arr: number | null;
  totalRaised: number | null;
  regulatoryBody: string | null;
  founderBio: string | null;
  founderName: string | null;
  pitchAngle: string | null;
  desiredFormat: (typeof FORMAT_VALUES)[number];
  desiredAudience: (typeof AUDIENCE_VALUES)[number];
  exclusions: string[];
  source: CompanySource;
}

async function resolvePodcastInput(
  raw: unknown,
): Promise<ResolvedPodcastInput> {
  const base: ResolvedCompanyBase = await resolveUserCompany(raw);
  const ext = G110ExtensionSchema.safeParse(raw).data ?? {};

  const hasExtFields =
    Boolean(ext.founderBio) ||
    Boolean(ext.founderName) ||
    Boolean(ext.pitchAngle) ||
    Boolean(ext.desiredFormat) ||
    Boolean(ext.desiredAudience) ||
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
    founderBio: ext.founderBio?.trim() ?? null,
    founderName: ext.founderName?.trim() ?? null,
    pitchAngle: ext.pitchAngle?.trim() ?? null,
    desiredFormat: ext.desiredFormat ?? "interview",
    desiredAudience: ext.desiredAudience ?? "founders",
    exclusions: ext.exclusions ?? [],
    source,
  };
}

// ─────────────────────────────────────────────
// Output contract
// ─────────────────────────────────────────────

const OUTPUT_SCHEMA_VERSION = "1" as const;

interface PodcastMatch {
  podcast: string;
  host: string;
  audienceSizeSignal: string;
  recentEpisodeRelevance: string;
  whyMatch: string;
  hooksTailored: string[];
  contactHint: string;
  confidence: number;
}

export interface PodcastBookingPackage {
  schemaVersion: typeof OUTPUT_SCHEMA_VERSION;
  companyName: string;
  founderName: string;
  pitchAngle: string;
  desiredFormat: ResolvedPodcastInput["desiredFormat"];
  matches: PodcastMatch[];
  pitchDraftMarkdown: string;
  subjectLineOptions: string[];
  followUpStrategy: string;
  bookingExpectations: string;
  redFlags: string[];
  notes: string;
}

function isPodcastMatch(m: unknown): m is PodcastMatch {
  if (!m || typeof m !== "object") return false;
  const mm = m as Record<string, unknown>;
  return (
    typeof mm.podcast === "string" &&
    typeof mm.host === "string" &&
    typeof mm.audienceSizeSignal === "string" &&
    typeof mm.recentEpisodeRelevance === "string" &&
    typeof mm.whyMatch === "string" &&
    Array.isArray(mm.hooksTailored) &&
    mm.hooksTailored.every((h) => typeof h === "string") &&
    typeof mm.contactHint === "string" &&
    typeof mm.confidence === "number" &&
    mm.confidence >= 0 &&
    mm.confidence <= 1
  );
}

export function isPodcastBookingPackage(
  obj: unknown,
): obj is PodcastBookingPackage {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.schemaVersion === OUTPUT_SCHEMA_VERSION &&
    typeof o.companyName === "string" &&
    typeof o.founderName === "string" &&
    typeof o.pitchAngle === "string" &&
    typeof o.desiredFormat === "string" &&
    Array.isArray(o.matches) &&
    (o.matches as unknown[]).every(isPodcastMatch) &&
    typeof o.pitchDraftMarkdown === "string" &&
    Array.isArray(o.subjectLineOptions) &&
    typeof o.followUpStrategy === "string" &&
    typeof o.bookingExpectations === "string" &&
    Array.isArray(o.redFlags) &&
    typeof o.notes === "string"
  );
}

export function parseLlmJson(raw: string): PodcastBookingPackage | null {
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
      if (isPodcastBookingPackage(obj)) return obj;
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
  "You are a London tech booker who has placed founders on Sifted Audio, 20 Minute VC, EUVC, This Much I Know, Working Hard, the AI Daily Brief, the Pivot, and credible Substack-distributed shows.",
  "Match each founder to specific named podcasts that are still actively publishing. Never invent shows, hosts, or episode references — if you can't be confident a podcast is still active, say so in the contactHint and lower the confidence score.",
  "For each match, write 3 tailored hook angles in the show's voice — short, specific, single-sentence. The hooks must be different per show: a generic hook means a low confidence score.",
  "Use UK English. Prioritise UK / European podcasts where the founder's market is UK-first; only suggest US shows when the angle genuinely warrants it.",
  "Always return ONLY the JSON object the user requests — no preamble, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(c: ResolvedPodcastInput): string {
  const arrLine =
    c.arr === null ? "  ARR: not provided" : `  ARR: £${Math.round(c.arr).toLocaleString()}`;
  const totalRaisedLine =
    c.totalRaised === null
      ? "  totalRaised: not provided"
      : `  totalRaised: £${Math.round(c.totalRaised).toLocaleString()}`;
  const regulatorLine = c.regulatoryBody
    ? `  regulatoryBody: ${c.regulatoryBody}`
    : "  regulatoryBody: not provided";
  const exclusionsLine =
    c.exclusions.length === 0
      ? "  exclusions: none"
      : `  exclusions: ${c.exclusions.join(", ")}`;
  const founderName = c.founderName ?? "(founder name not provided)";
  const pitchAngle =
    c.pitchAngle ??
    "(no specific angle provided — pick one anchored on the company's UK / sector position that podcast hosts will actually want to book)";

  const bioBlock = c.founderBio
    ? `\nFounder bio:\n---\n${c.founderBio}\n---\n`
    : "\nNo founder bio provided. Set notes to explain that founderBio is required, return an empty matches array and an empty pitchDraftMarkdown, then exit.\n";

  return [
    `Match ${founderName} (${c.companyName}) to London-tech podcasts and draft a master pitch email.`,
    "",
    "Company context:",
    `  name: ${c.companyName}`,
    `  sector: ${c.sector}`,
    `  HQ: ${c.headquartersLocation}`,
    arrLine,
    totalRaisedLine,
    regulatorLine,
    `  desiredFormat: ${c.desiredFormat}`,
    `  desiredAudience: ${c.desiredAudience}`,
    `  pitchAngle: ${pitchAngle}`,
    exclusionsLine,
    bioBlock,
    "Return 5-8 ranked podcast matches. For each: name the podcast and host, an audience-size signal (general — \"large industry pod\", \"niche but high-credibility\", etc., NOT a fabricated download number), what recent-episode topic the founder's angle would hook into, why-this-fits, three tailored single-sentence hook angles (different per show), a contact hint (host's published booking address or LinkedIn — never invent an email), and a 0-1 confidence score.",
    "Then write ONE master pitch email markdown that the founder can adapt per show (mark the per-show variable sections clearly with `<<HOOK>>` placeholders). Provide three subject-line options (under 70 chars each), a 2-3 sentence follow-up strategy, booking expectations (typical lead time, prep ask, equipment), and any red flags about the founder's pitch angle.",
    "",
    "Return ONLY a JSON object matching this schema (no markdown fences, no commentary):",
    "{",
    `  "schemaVersion": "${OUTPUT_SCHEMA_VERSION}",`,
    `  "companyName": string,`,
    `  "founderName": string,`,
    `  "pitchAngle": string,`,
    `  "desiredFormat": "${c.desiredFormat}",`,
    `  "matches": [`,
    `    {`,
    `      "podcast": string,`,
    `      "host": string,`,
    `      "audienceSizeSignal": string,                    // qualitative — never invent download counts`,
    `      "recentEpisodeRelevance": string,                // a real recent topic the founder's angle would hook into`,
    `      "whyMatch": string,`,
    `      "hooksTailored": string[],                       // exactly 3, single-sentence, different per show`,
    `      "contactHint": string,                           // booking email or LinkedIn — never invented`,
    `      "confidence": number                             // 0-1`,
    `    }`,
    `  ],`,
    `  "pitchDraftMarkdown": string,                         // master pitch with <<HOOK>> placeholders`,
    `  "subjectLineOptions": string[],                       // 3 alternatives, each < 70 chars`,
    `  "followUpStrategy": string,                           // 2-3 sentences with timing`,
    `  "bookingExpectations": string,                        // typical lead time, prep, equipment`,
    `  "redFlags": string[],                                 // 0-5 concerns about the angle itself`,
    `  "notes": string                                       // 1-2 sentences on caveats`,
    "}",
  ].join("\n");
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

class PodcastBookerHandler implements AgentHandler {
  agentId = "G1-110";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    const input = await resolvePodcastInput(context.input);

    if (!input.founderBio) {
      return {
        outputSummary: `G1-110: founderBio not provided. company=${input.companyName}.`,
        outputData: {
          companyName: input.companyName,
          inputSource: input.source,
          mode: "missing_founder_bio",
          schemaVersion: OUTPUT_SCHEMA_VERSION,
        },
        costUsd: 0,
        tokensUsed: 0,
        briefing: {
          type: "alert",
          title: `Podcast Booker — founderBio required`,
          summary: `G1-110 needs the founder's short bio + talking points in the run input. Re-trigger with founderBio set.`,
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
        outputSummary: `G1-110: LLM unavailable. company=${input.companyName}.`,
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
          title: `Podcast matches unavailable — ${input.companyName}`,
          summary: `G1-110 could not reach ${context.llmModel}. Verify the relevant provider API key in Vercel env, then re-trigger.`,
          severity: "warning",
        },
      };
    }

    const booking = parseLlmJson(llmResult.text);

    if (!booking) {
      return {
        outputSummary: `G1-110: narrative-only output (JSON parse failed). company=${input.companyName}, ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
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
          title: `Podcast pitch (draft) — ${input.companyName}`,
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
      userProfileId && booking.pitchDraftMarkdown.length > 0
        ? await spawnDocumentFromAgent({
            userProfileId,
            agentRunId: context.runId,
            agentId: context.agentId,
            collectionSlug: "sales-marketing",
            title: `Podcast pitch — ${booking.companyName} (${booking.desiredFormat})`,
            body: booking.pitchDraftMarkdown,
            documentType: "marketing_doc",
            audienceType: "media",
            purposeType: "outreach",
            confidentiality: "internal",
            summary: `${booking.matches.length} podcast matches; top: ${booking.matches[0]?.podcast ?? "n/a"}.`,
          })
        : null;

    const severity: "info" | "warning" =
      booking.redFlags.length > 0 ? "warning" : "info";

    return {
      outputSummary: `G1-110: ${booking.companyName} — ${booking.matches.length} podcast matches; top: ${booking.matches[0]?.podcast ?? "n/a"} (${booking.matches[0]?.host ?? "n/a"}). ${booking.redFlags.length} red flags.${linkedDocument ? ` Document=${linkedDocument.slug}.` : ""} ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
      outputData: {
        ...booking,
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
        title: `Podcast matches — ${booking.companyName} (${booking.matches.length})`,
        summary: [
          `Angle: ${booking.pitchAngle}.`,
          `Top match: ${booking.matches[0]?.podcast ?? "n/a"} (${booking.matches[0]?.host ?? "n/a"}).`,
          booking.redFlags.length > 0
            ? `Red flags: ${booking.redFlags.slice(0, 2).join("; ")}.`
            : "",
          booking.bookingExpectations,
        ]
          .filter(Boolean)
          .join(" "),
        severity,
        details: {
          ...booking,
          inputSource: input.source,
          ...(linkedDocument && { linkedDocument }),
        },
      },
      learnings: [
        {
          type: "insight",
          title: `Podcast slate — ${booking.companyName}`,
          description: `${booking.matches.length} matches for ${booking.desiredFormat} format. Top podcasts: ${booking.matches.slice(0, 3).map((m) => m.podcast).join(", ")}.`,
          confidence: 0.6,
        },
      ],
    };
  }
}

export const podcastBookerHandler = new PodcastBookerHandler();
