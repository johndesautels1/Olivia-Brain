/**
 * G1-076: Pitch Deck London Filter
 *
 * Rewrites a US-centric pitch deck into language London / UK investors
 * actually respond to. Converts hyperbole into measured framing,
 * USD into GBP with FX context, US market sizing into UK + Europe
 * + global addressable markets, US accelerator / VC name-drops into
 * London equivalents, and adds UK regulatory anchors (FCA, ICO,
 * AISI, Patent Box, EIS / SEIS) where they strengthen the pitch.
 *
 * Schedule: on_demand. Two input shapes are supported:
 *   - userProfileId (resolves UserCompanyProfile) + deckText — the
 *     handler uses the company's actual sector / stage / regulator
 *     to ground the rewrite; the deckText is what gets adapted.
 *   - explicit companyName / sector / + deckText — for ad-hoc admin
 *     runs (no founder attached) or testing.
 *
 * Output: a fully rewritten markdown deck, a list of key changes
 * with reasoning, tone notes, UK-specific additions, and any red
 * flags in the original that would hurt with UK investors.
 *
 * When `userProfileId` is supplied the rewritten markdown is
 * mirrored to the founder's My Documents tile in the `pitch-decks`
 * collection (`investor_deck` / `investor` / `fundraising`).
 *
 * Ported byte-for-byte from London-Tech-Map src/lib/agents/impl/
 * g1-076-pitch-deck-london-filter.ts. Third per-company handler ported
 * to OB after G1-033 + G1-048.
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

const TARGET_AUDIENCE_VALUES = ["vc", "angel", "strategic_partner"] as const;
const TARGET_SECTION_VALUES = [
  "all",
  "problem",
  "solution",
  "market",
  "traction",
  "team",
  "ask",
] as const;

/** G1-076-specific extension fields. Strict — base fields are
 *  validated by the shared resolver. */
const G076ExtensionSchema = z.object({
  deckText: z.string().min(1).max(40_000).optional(),
  targetAudience: z.enum(TARGET_AUDIENCE_VALUES).optional(),
  targetSection: z.enum(TARGET_SECTION_VALUES).optional(),
  fundingStage: z.string().min(1).max(80).optional(),
});

interface ResolvedDeckInput {
  companyName: string;
  sector: string;
  headquartersLocation: string;
  fundingStage: string | null;
  arr: number | null;
  totalRaised: number | null;
  regulatoryBody: string | null;
  deckText: string | null;
  targetAudience: (typeof TARGET_AUDIENCE_VALUES)[number];
  targetSection: (typeof TARGET_SECTION_VALUES)[number];
  source: CompanySource;
}

async function resolveDeckInput(raw: unknown): Promise<ResolvedDeckInput> {
  const base: ResolvedCompanyBase = await resolveUserCompany(raw);
  const ext = G076ExtensionSchema.safeParse(raw).data ?? {};

  const hasExtFields =
    Boolean(ext.deckText) ||
    Boolean(ext.targetAudience) ||
    Boolean(ext.targetSection) ||
    Boolean(ext.fundingStage);
  let source = base.source;
  if (source === "default" && hasExtFields) source = "input";
  else if (source === "profile" && hasExtFields) source = "input+profile";

  return {
    companyName: base.companyName,
    sector: base.sector,
    headquartersLocation: base.headquartersLocation,
    fundingStage: ext.fundingStage?.trim() ?? null,
    arr: base.arr,
    totalRaised: base.totalRaised,
    regulatoryBody: base.regulatoryBody,
    deckText: ext.deckText?.trim() ?? null,
    targetAudience: ext.targetAudience ?? "vc",
    targetSection: ext.targetSection ?? "all",
    source,
  };
}

// ─────────────────────────────────────────────
// Output contract
// ─────────────────────────────────────────────

const OUTPUT_SCHEMA_VERSION = "1" as const;

interface DeckChange {
  original: string;
  rewritten: string;
  why: string;
}

export interface FilteredDeck {
  schemaVersion: typeof OUTPUT_SCHEMA_VERSION;
  companyName: string;
  targetAudience: ResolvedDeckInput["targetAudience"];
  targetSection: ResolvedDeckInput["targetSection"];
  originalDeckSummary: string;
  rewrittenDeckMarkdown: string;
  keyChanges: DeckChange[];
  toneNotes: string[];
  ukSpecificAdditions: string[];
  redFlags: string[];
  recommendedNextSteps: string[];
  notes: string;
}

export function isFilteredDeck(obj: unknown): obj is FilteredDeck {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  if (o.schemaVersion !== OUTPUT_SCHEMA_VERSION) return false;
  if (typeof o.companyName !== "string") return false;
  if (typeof o.targetAudience !== "string") return false;
  if (typeof o.targetSection !== "string") return false;
  if (typeof o.originalDeckSummary !== "string") return false;
  if (typeof o.rewrittenDeckMarkdown !== "string") return false;
  if (!Array.isArray(o.keyChanges)) return false;
  for (const c of o.keyChanges as unknown[]) {
    if (!c || typeof c !== "object") return false;
    const cc = c as Record<string, unknown>;
    if (
      typeof cc.original !== "string" ||
      typeof cc.rewritten !== "string" ||
      typeof cc.why !== "string"
    )
      return false;
  }
  if (!Array.isArray(o.toneNotes)) return false;
  if (!Array.isArray(o.ukSpecificAdditions)) return false;
  if (!Array.isArray(o.redFlags)) return false;
  if (!Array.isArray(o.recommendedNextSteps)) return false;
  if (typeof o.notes !== "string") return false;
  return true;
}

export function parseLlmJson(raw: string): FilteredDeck | null {
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
      if (isFilteredDeck(obj)) return obj;
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
  "You are a London-tech pitch coach who has read every successful Series Seed–Series B deck closed in London since 2018.",
  "Your job is to rewrite US-centric pitch language so it lands with London / UK investors and operators.",
  "Concretely: convert USD figures to GBP with FX context (use 1 USD ≈ 0.79 GBP unless the user supplied a different rate); replace TAM-only US sizing with UK + Europe + global addressable framing; soften US hyperbole (\"crushing it\", \"the next $10B unicorn\") into UK-style understated confidence (\"meaningful traction\", \"a credible path to category leadership\"); swap US accelerator / VC name-drops for London equivalents where the analogue exists (e.g., Y Combinator → Entrepreneur First, Antler, Founders Factory; a16z → Index, Atomico, Octopus, LocalGlobe, Notion Capital); and add UK regulatory anchors (FCA, ICO, AISI, EIS / SEIS, Patent Box, R&D credits) where they materially strengthen the pitch.",
  "Be honest about what you cannot say with confidence — never invent customers, ARR, or partnerships that the input does not support.",
  "Always return ONLY the JSON object the user requests — no preamble, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(c: ResolvedDeckInput): string {
  const arrLine =
    c.arr === null
      ? "  ARR: not provided"
      : `  ARR: £${Math.round(c.arr).toLocaleString()} (use this rather than restating the input USD figure)`;
  const totalRaisedLine =
    c.totalRaised === null
      ? "  totalRaised: not provided"
      : `  totalRaised: £${Math.round(c.totalRaised).toLocaleString()}`;
  const stageLine = c.fundingStage
    ? `  fundingStage: ${c.fundingStage}`
    : "  fundingStage: not provided";
  const regulatorLine = c.regulatoryBody
    ? `  regulatoryBody: ${c.regulatoryBody}`
    : "  regulatoryBody: not provided";

  const sectionLine =
    c.targetSection === "all"
      ? "Rewrite the entire deck."
      : `Focus the rewrite on the "${c.targetSection}" section. Preserve the rest unchanged in the markdown output, but only emit keyChanges entries for the targeted section.`;

  const deckBlock = c.deckText
    ? `\nFounder's deck content (rewrite this):\n---\n${c.deckText}\n---\n`
    : "\nNo deck content was provided. Write `notes` explaining that deckText is required, return an empty rewrittenDeckMarkdown, and exit.\n";

  return [
    "Rewrite the following pitch deck for a London / UK audience.",
    "",
    "Company context:",
    `  name: ${c.companyName}`,
    `  sector: ${c.sector}`,
    `  HQ: ${c.headquartersLocation}`,
    arrLine,
    totalRaisedLine,
    stageLine,
    regulatorLine,
    `  targetAudience: ${c.targetAudience}`,
    "",
    sectionLine,
    deckBlock,
    "Return ONLY a JSON object matching this schema (no markdown fences, no commentary):",
    "{",
    `  "schemaVersion": "${OUTPUT_SCHEMA_VERSION}",`,
    `  "companyName": string,`,
    `  "targetAudience": "${c.targetAudience}",`,
    `  "targetSection": "${c.targetSection}",`,
    `  "originalDeckSummary": string,                     // 1-2 sentences on what the original deck claimed`,
    `  "rewrittenDeckMarkdown": string,                    // the full adapted deck, one H2 per slide`,
    `  "keyChanges": [                                     // 4-10 representative rewrites — quote the originals`,
    `    { "original": string, "rewritten": string, "why": string }`,
    `  ],`,
    `  "toneNotes": string[],                              // 2-5 notes on tone shifts (e.g. "softened growth claim", "added FCA disclosure")`,
    `  "ukSpecificAdditions": string[],                    // 2-6 UK signals added (district mentions, EIS / SEIS, FCA register, R&D credits, London accelerator credentials)`,
    `  "redFlags": string[],                               // 0-5 items in the original that would actively hurt with UK investors and need a deeper rewrite`,
    `  "recommendedNextSteps": string[],                   // 3-5 concrete next steps (e.g. "add a slide on UK regulator alignment", "replace US-only logo wall")`,
    `  "notes": string                                     // 1-2 sentences on caveats or assumptions made`,
    "}",
  ].join("\n");
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

class PitchDeckLondonFilterHandler implements AgentHandler {
  agentId = "G1-076";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    const input = await resolveDeckInput(context.input);

    if (!input.deckText) {
      return {
        outputSummary: `G1-076: deckText not provided. company=${input.companyName}.`,
        outputData: {
          companyName: input.companyName,
          inputSource: input.source,
          mode: "missing_deck_text",
          schemaVersion: OUTPUT_SCHEMA_VERSION,
        },
        costUsd: 0,
        tokensUsed: 0,
        briefing: {
          type: "alert",
          title: `Pitch Deck London Filter — deckText required`,
          summary: `G1-076 needs deckText (the founder's pitch content) in the run input. Re-trigger with deckText set.`,
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
        outputSummary: `G1-076: LLM unavailable (provider key missing or call failed). company=${input.companyName}.`,
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
          title: `Pitch Deck filter unavailable — ${input.companyName}`,
          summary: `G1-076 could not reach ${context.llmModel}. Verify the relevant provider API key in Vercel env, then re-trigger.`,
          severity: "warning",
        },
      };
    }

    const filtered = parseLlmJson(llmResult.text);

    if (!filtered) {
      return {
        outputSummary: `G1-076: narrative-only output (JSON parse failed). company=${input.companyName}, ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
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
          title: `Pitch Deck (draft) — ${input.companyName}`,
          summary: llmResult.text.slice(0, 600),
          severity: "info",
        },
      };
    }

    // Mirror the rewritten deck into pitch-decks so the founder can
    // edit + version + share from /documents/[id]/studio.
    const userProfileId =
      typeof context.input?.userProfileId === "string" &&
      context.input.userProfileId.length > 0
        ? context.input.userProfileId
        : null;
    const linkedDocument =
      userProfileId && filtered.rewrittenDeckMarkdown.length > 0
        ? await spawnDocumentFromAgent({
            userProfileId,
            agentRunId: context.runId,
            agentId: context.agentId,
            collectionSlug: "pitch-decks",
            title: `Pitch Deck (UK-filtered) — ${filtered.companyName}`,
            body: filtered.rewrittenDeckMarkdown,
            documentType: "investor_deck",
            audienceType: "investor",
            purposeType: "fundraising",
            confidentiality: "internal",
            summary: `London-filtered ${filtered.targetSection === "all" ? "full deck" : `"${filtered.targetSection}" section`} — ${filtered.keyChanges.length} key changes, ${filtered.redFlags.length} red flags.`,
          })
        : null;

    const severity: "info" | "warning" =
      filtered.redFlags.length > 0 ? "warning" : "info";

    return {
      outputSummary: `G1-076: ${filtered.companyName} — ${filtered.keyChanges.length} key changes, ${filtered.ukSpecificAdditions.length} UK additions, ${filtered.redFlags.length} red flags.${linkedDocument ? ` Document=${linkedDocument.slug}.` : ""} ${llmResult.tokensUsed} tokens, $${llmResult.costUsd}.`,
      outputData: {
        ...filtered,
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
        title: `Pitch Deck (UK-filtered) — ${filtered.companyName}`,
        summary: [
          filtered.originalDeckSummary,
          `Key changes: ${filtered.keyChanges.slice(0, 3).map((c) => c.why).join("; ")}.`,
          filtered.redFlags.length > 0
            ? `Red flags: ${filtered.redFlags.slice(0, 2).join("; ")}.`
            : "",
          filtered.notes,
        ]
          .filter(Boolean)
          .join(" "),
        severity,
        details: {
          ...filtered,
          inputSource: input.source,
          ...(linkedDocument && { linkedDocument }),
        },
      },
      learnings: [
        {
          type: "insight",
          title: `Pitch UK-fit — ${filtered.companyName}`,
          description: `${filtered.keyChanges.length} rewrites; ${filtered.ukSpecificAdditions.length} UK additions; ${filtered.redFlags.length} red flags. Tone notes: ${filtered.toneNotes.slice(0, 2).join("; ") || "(none)"}.`,
          confidence: 0.65,
        },
      ],
    };
  }
}

export const pitchDeckLondonFilterHandler = new PitchDeckLondonFilterHandler();
