/**
 * G1-107: Thought Leadership Ghostwriter
 *
 * Drafts a long-form thought-leadership article (essay, blog post,
 * LinkedIn thought post, op-ed) in the founder's voice, grounded in
 * their company context. The handler stays honest about what the
 * input supports — if the founder hasn't supplied a hot take or
 * source material, the prompt steers toward a "field-of-view"
 * essay rather than fabricating quotes or stats.
 *
 * Schedule: on_demand. Input shapes:
 *   - userProfileId — pulls UserCompanyProfile (sector, stage,
 *     ARR, etc.) and uses that as voice context.
 *   - explicit companyName / sector / + topic / sourceMaterial.
 *
 * Output: title + hook + full markdown article + key arguments
 * + claims-to-verify + pull-quotes + CTA + distribution
 * suggestions.
 *
 * When `userProfileId` is supplied the article markdown is
 * mirrored to the founder's My Documents tile in `sales-marketing`
 * (`marketing_doc` / `media` / `outreach`).
 *
 * Ported byte-for-byte from London-Tech-Map src/lib/agents/impl/
 * g1-107-thought-leadership-ghostwriter.ts. Fourth per-company
 * handler ported to OB after G1-033 / G1-048 / G1-076.
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
  "essay",
  "blog_post",
  "linkedin_thought_post",
  "op_ed",
] as const;
const AUDIENCE_VALUES = [
  "founders",
  "investors",
  "policymakers",
  "operators",
  "general_tech",
] as const;
const TONE_VALUES = ["measured", "punchy", "academic", "personal"] as const;

const G107ExtensionSchema = z.object({
  topic: z.string().min(3).max(500).optional(),
  format: z.enum(FORMAT_VALUES).optional(),
  audience: z.enum(AUDIENCE_VALUES).optional(),
  tone: z.enum(TONE_VALUES).optional(),
  desiredWordCount: z.number().int().min(200).max(5000).optional(),
  sourceMaterial: z.string().min(1).max(20_000).optional(),
  existingDraft: z.string().min(1).max(20_000).optional(),
});

interface ResolvedArticleInput {
  companyName: string;
  sector: string;
  headquartersLocation: string;
  arr: number | null;
  totalRaised: number | null;
  regulatoryBody: string | null;
  topic: string | null;
  format: (typeof FORMAT_VALUES)[number];
  audience: (typeof AUDIENCE_VALUES)[number];
  tone: (typeof TONE_VALUES)[number];
  desiredWordCount: number;
  sourceMaterial: string | null;
  existingDraft: string | null;
  source: CompanySource;
}

async function resolveArticleInput(
  raw: unknown,
): Promise<ResolvedArticleInput> {
  const base: ResolvedCompanyBase = await resolveUserCompany(raw);
  const ext = G107ExtensionSchema.safeParse(raw).data ?? {};

  const hasExtFields =
    Boolean(ext.topic) ||
    Boolean(ext.format) ||
    Boolean(ext.audience) ||
    Boolean(ext.tone) ||
    typeof ext.desiredWordCount === "number" ||
    Boolean(ext.sourceMaterial) ||
    Boolean(ext.existingDraft);
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
    topic: ext.topic?.trim() ?? null,
    format: ext.format ?? "essay",
    audience: ext.audience ?? "founders",
    tone: ext.tone ?? "measured",
    // Default reduced from 1200 → 1000 words to keep the JSON
    // response size + LLM generation time inside the 45s call
    // budget. G1-107 was timing out at 1200 words on Sonnet.
    desiredWordCount: ext.desiredWordCount ?? 1000,
    sourceMaterial: ext.sourceMaterial?.trim() ?? null,
    existingDraft: ext.existingDraft?.trim() ?? null,
    source,
  };
}

// ─────────────────────────────────────────────
// Output contract
// ─────────────────────────────────────────────

const OUTPUT_SCHEMA_VERSION = "1" as const;

export interface DraftedArticle {
  schemaVersion: typeof OUTPUT_SCHEMA_VERSION;
  companyName: string;
  topic: string;
  format: ResolvedArticleInput["format"];
  audience: ResolvedArticleInput["audience"];
  articleTitle: string;
  articleHook: string;
  articleMarkdown: string;
  keyArguments: string[];
  claimsToVerify: string[];
  pullQuotes: string[];
  callToAction: string;
  distributionSuggestions: string[];
  estimatedReadTimeMinutes: number;
  notes: string;
}

export function isDraftedArticle(obj: unknown): obj is DraftedArticle {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.schemaVersion === OUTPUT_SCHEMA_VERSION &&
    typeof o.companyName === "string" &&
    typeof o.topic === "string" &&
    typeof o.format === "string" &&
    typeof o.audience === "string" &&
    typeof o.articleTitle === "string" &&
    typeof o.articleHook === "string" &&
    typeof o.articleMarkdown === "string" &&
    Array.isArray(o.keyArguments) &&
    Array.isArray(o.claimsToVerify) &&
    Array.isArray(o.pullQuotes) &&
    typeof o.callToAction === "string" &&
    Array.isArray(o.distributionSuggestions) &&
    typeof o.estimatedReadTimeMinutes === "number" &&
    typeof o.notes === "string"
  );
}

export function parseLlmJson(raw: string): DraftedArticle | null {
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
      if (isDraftedArticle(obj)) return obj;
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
  "You are a senior London tech writer who has ghostwritten for founders published in Sifted, the FT, TechCrunch EU, Wired UK, the Observer, and the New Statesman.",
  "Write in the founder's voice — first person, specific, never generic — and ground every argument in the company context the user supplies.",
  "Match UK English (organisation, programme, recognise) and avoid US idioms unless the founder's voice is explicitly American.",
  "Your default tone is measured British confidence: claims are concrete, hedges are honest, hyperbole is rare.",
  "Be honest about what the input supports — if the founder hasn't given you a hot take, source material, or proprietary data, write a 'field-of-view' essay (the founder's perspective on a question) rather than fabricating customers, ARR, or partnerships.",
  "Always return ONLY the JSON object the user requests — no preamble, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(c: ResolvedArticleInput): string {
  const arrLine = c.arr === null ? "  ARR: not provided" : `  ARR: £${Math.round(c.arr).toLocaleString()}`;
  const totalRaisedLine =
    c.totalRaised === null
      ? "  totalRaised: not provided"
      : `  totalRaised: £${Math.round(c.totalRaised).toLocaleString()}`;
  const regulatorLine = c.regulatoryBody
    ? `  regulatoryBody: ${c.regulatoryBody}`
    : "  regulatoryBody: not provided";
  const sourceLine = c.sourceMaterial
    ? `\nSource material the founder wants you to incorporate:\n---\n${c.sourceMaterial}\n---\n`
    : "\nNo source material supplied — write from the founder's likely field-of-view given the company context.\n";
  const draftLine = c.existingDraft
    ? `\nExisting draft to refine (rewrite end-to-end, do not append):\n---\n${c.existingDraft}\n---\n`
    : "";

  return [
    `Draft a thought-leadership ${c.format.replace(/_/g, " ")} for ${c.audience} on the topic: ${c.topic ?? "(no topic supplied — pick one anchored on the company's sector and stage that the audience will care about)"}.`,
    "",
    "Company context (the voice you are writing in):",
    `  name: ${c.companyName}`,
    `  sector: ${c.sector}`,
    `  HQ: ${c.headquartersLocation}`,
    arrLine,
    totalRaisedLine,
    regulatorLine,
    `  desiredWordCount: ${c.desiredWordCount}`,
    `  tone: ${c.tone}`,
    sourceLine,
    draftLine,
    "Write a clear, memorable, opinionated piece. Open with a hook the audience cannot scroll past. Make exactly 3-5 key arguments — flag every empirical claim that would need fact-checking before publication. Add 3-5 quotable lines suitable for pull-quotes. Close with a CTA that fits the audience.",
    "",
    "Return ONLY a JSON object matching this schema (no markdown fences, no commentary):",
    "{",
    `  "schemaVersion": "${OUTPUT_SCHEMA_VERSION}",`,
    `  "companyName": string,`,
    `  "topic": string,`,
    `  "format": "${c.format}",`,
    `  "audience": "${c.audience}",`,
    `  "articleTitle": string,                              // <= 90 chars`,
    `  "articleHook": string,                               // 1-2 sentences, opens the piece`,
    `  "articleMarkdown": string,                           // full article body, markdown, ~${c.desiredWordCount} words`,
    `  "keyArguments": string[],                            // 3-5 bullets`,
    `  "claimsToVerify": string[],                          // every empirical claim that needs fact-checking before publishing`,
    `  "pullQuotes": string[],                              // 3-5 quotable single-sentence lines from the article`,
    `  "callToAction": string,                              // 1 sentence`,
    `  "distributionSuggestions": string[],                 // 3-5 specific outlets / channels / formats — Sifted, FT Tech, Substack, LinkedIn, founder podcast, etc.`,
    `  "estimatedReadTimeMinutes": number,                  // round to nearest minute (~250 wpm)`,
    `  "notes": string                                      // 1-2 sentences on assumptions made or gaps in the data provided`,
    "}",
  ].join("\n");
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

class ThoughtLeadershipGhostwriterHandler implements AgentHandler {
  agentId = "G1-107";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    const input = await resolveArticleInput(context.input);
    const userPrompt = buildUserPrompt(input);

    // Cap maxTokens at 5000 — a ~1000-word article in JSON is
    // ~2-2.5K output tokens, so 5000 is comfortable headroom and
    // keeps Sonnet's generation under the 45s timeout. Higher
    // values from the agent registry (default 8192) made the
    // call run long enough to hit the timeout intermittently.
    const cappedMaxTokens = Math.min(context.maxTokens, 5000);
    const llmResult = await callLLM({
      model: context.llmModel,
      systemPrompt: context.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      userPrompt,
      temperature: context.temperature,
      maxTokens: cappedMaxTokens,
      timeoutMs: 45_000,
    });

    if (!llmResult) {
      return {
        outputSummary: `G1-107: LLM unavailable. company=${input.companyName}, topic=${input.topic ?? "(none)"}.`,
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
          title: `Article draft unavailable — ${input.companyName}`,
          summary: `G1-107 could not reach ${context.llmModel}. Verify the relevant provider API key in Vercel env, then re-trigger.`,
          severity: "warning",
        },
      };
    }

    const article = parseLlmJson(llmResult.text);

    if (!article) {
      return {
        outputSummary: `G1-107: narrative-only output (JSON parse failed). company=${input.companyName}, ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
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
          title: `Article (draft) — ${input.companyName}`,
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
      userProfileId && article.articleMarkdown.length > 0
        ? await spawnDocumentFromAgent({
            userProfileId,
            agentRunId: context.runId,
            agentId: context.agentId,
            collectionSlug: "sales-marketing",
            title: `Thought leadership — ${article.articleTitle}`,
            body: article.articleMarkdown,
            documentType: "marketing_doc",
            audienceType: "media",
            purposeType: "outreach",
            confidentiality: "internal",
            summary: `${article.format.replace(/_/g, " ")} for ${article.audience}. ${article.estimatedReadTimeMinutes} min read. ${article.claimsToVerify.length} claims to verify.`,
          })
        : null;

    return {
      outputSummary: `G1-107: ${article.companyName} — "${article.articleTitle}", ${article.estimatedReadTimeMinutes} min read, ${article.keyArguments.length} arguments, ${article.claimsToVerify.length} claims to verify.${linkedDocument ? ` Document=${linkedDocument.slug}.` : ""} ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
      outputData: {
        ...article,
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
        title: `Thought leadership — ${article.articleTitle}`,
        summary: [
          article.articleHook,
          `Key arguments: ${article.keyArguments.slice(0, 2).join("; ")}.`,
          article.claimsToVerify.length > 0
            ? `Verify before publishing: ${article.claimsToVerify.slice(0, 2).join("; ")}.`
            : "",
          article.notes,
        ]
          .filter(Boolean)
          .join(" "),
        severity: "info",
        details: {
          ...article,
          inputSource: input.source,
          ...(linkedDocument && { linkedDocument }),
        },
      },
      learnings: [
        {
          type: "insight",
          title: `Article drafted — ${article.articleTitle}`,
          description: `${article.format} (${article.estimatedReadTimeMinutes} min) for ${article.audience}. ${article.keyArguments.length} key arguments; ${article.claimsToVerify.length} claims pending verification.`,
          confidence: 0.6,
        },
      ],
    };
  }
}

export const thoughtLeadershipGhostwriterHandler =
  new ThoughtLeadershipGhostwriterHandler();
