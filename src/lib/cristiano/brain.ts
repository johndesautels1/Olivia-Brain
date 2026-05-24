/**
 * OLIVIA BRAIN — CRISTIANO JUDGE BRAIN
 * =====================================
 *
 * Per-kind verdict renderers. Each handler:
 *   1. Accepts a Zod-validated request payload.
 *   2. Builds a verdict prompt using kind-specific instructions.
 *   3. Calls Opus 4.7 via `callLLM()` (per Law 3 — no raw fetches to
 *      LLM APIs).
 *   4. Parses + Zod-validates the LLM JSON response.
 *   5. Returns a Result-typed envelope `{ ok, body | reason }`.
 *
 * Prompts adapted from LTM `src/lib/analysis/cristiano.ts:381-521`
 * (startup match Opus prompt) and lifescore `api/judge.ts:341-403` +
 * `api/cristiano/storyboard.ts:137-251` (city compare + cinematic
 * narration), with shape locked to OB's `CristianoVerdictBody`
 * envelope in `types.ts`.
 *
 * Persona voice rules — citation locked from
 * `src/lib/avatar/identity.ts:52-78` (CRISTIANO_IDENTITY):
 *   "Distinguished man in his 40s with commanding presence."
 *   "James Bond aesthetic — confident, decisive, elegant."
 *   "Deep, authoritative tone with measured delivery."
 *   "Statements, not questions."
 *   "British-influenced English suggesting refinement."
 *
 * Per founder direction 2026-05-25: "He doesnt talk to people just
 * like a judge he renders decsioins verdicts and reccomendations."
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import { callLLM, type LLMCallResult } from "@/lib/agents/llm";

import {
  CristianoCityCompareVerdictSchema,
  CristianoFreeformVerdictSchema,
  CristianoStartupMatchVerdictSchema,
  type CristianoCityCompareRequest,
  type CristianoCityCompareVerdict,
  type CristianoFreeformRequest,
  type CristianoFreeformVerdict,
  type CristianoStartupMatchRequest,
  type CristianoStartupMatchVerdict,
  type CristianoVerdictKind,
} from "@/lib/cristiano/types";

// ─── Result type for brain calls ─────────────────────────────────────────────

/**
 * Reasons a brain call can fail. Each is mapped to a user-facing
 * status code at the route boundary (`/api/cristiano/judge`).
 */
export type CristianoBrainErrorReason =
  | "llm_unavailable" // callLLM returned null (API key missing or upstream failure)
  | "llm_timeout" // network or model timeout
  | "parse_failure" // LLM didn't return parseable JSON
  | "validation_failure"; // LLM returned JSON but it failed Zod validation

export interface CristianoBrainErrorDetail {
  reason: CristianoBrainErrorReason;
  message: string;
  rawText?: string;
}

/**
 * Result returned by every per-kind handler. Mirrors the 2026 "typed
 * Result at module boundaries" bar — never throws across this surface.
 */
export type CristianoBrainResult<TVerdict> =
  | {
      ok: true;
      verdict: TVerdict;
      telemetry: {
        modelUsed: string;
        inputTokens: number;
        outputTokens: number;
        latencyMs: number;
      };
    }
  | { ok: false; error: CristianoBrainErrorDetail };

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * The Cristiano judge always runs on Opus. Locked per founder direction
 * 2026-05-25 ("the face of the opus judge as the decision maker").
 */
export const CRISTIANO_JUDGE_MODEL = "claude-opus-4-7" as const;

const CRISTIANO_TEMPERATURE = 0.2;
const CRISTIANO_MAX_TOKENS = 8192;
const CRISTIANO_TIMEOUT_MS = 90_000; // Opus is slow on long judgments — 90s gives headroom.

// ─── Shared system-prompt header (persona voice) ─────────────────────────────

const CRISTIANO_SYSTEM_PROMPT = `You are Cristiano, THE JUDGE — the verdict authority for the CLUES ecosystem. You render decisions and recommendations; you do not converse, ask questions, or chat. Your job is to deliver a single, structured verdict that is read aloud by an avatar narrator.

VOICE:
- Confident. Decisive. Authoritative. James Bond aesthetic — distinguished, measured, elegant.
- British-influenced English. Refined diction. "Tends to," "often," "designed to" — never "guarantees."
- Statements, not questions. Address the user in the second person when relevant ("your company", "your application", "your decision").
- Avoid legal-advice phrasing. This is judgment, not counsel.

OUTPUT CONTRACT:
- Return ONLY a JSON object that matches the schema in the user prompt. No markdown fences, no preamble, no explanation around the JSON.
- The "spokenScript" field is what the avatar will read aloud. Keep it 60–180 seconds when read at conversational pace (~150–400 words). Begin with "Good day. I am Cristiano." Close with a clear final statement that signals the verdict is rendered.
- The "verdictTitle" field is a short summary used in list view. Maximum 240 characters. No trailing punctuation.
- The "confidence" field is "high", "medium", or "low". Use "high" only when the data unambiguously supports the verdict.

HONESTY:
- Do not fabricate organisations, scores, places, or financial figures. Use only what the user prompt provides.
- If the data is insufficient to render a confident verdict, set confidence to "low" and say so in the rationale.`;

// ─── Shared LLM call wrapper ─────────────────────────────────────────────────

interface BrainCallInputs {
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
}

interface BrainCallSuccess {
  ok: true;
  rawText: string;
  result: LLMCallResult;
}

interface BrainCallFailure {
  ok: false;
  error: CristianoBrainErrorDetail;
}

async function callJudge(
  inputs: BrainCallInputs,
): Promise<BrainCallSuccess | BrainCallFailure> {
  const start = Date.now();
  let result: LLMCallResult | null;
  try {
    result = await callLLM({
      model: CRISTIANO_JUDGE_MODEL,
      systemPrompt: inputs.systemPrompt,
      userPrompt: inputs.userPrompt,
      temperature: CRISTIANO_TEMPERATURE,
      maxTokens: CRISTIANO_MAX_TOKENS,
      timeoutMs: inputs.timeoutMs ?? CRISTIANO_TIMEOUT_MS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown LLM error";
    const isAbort = /abort|timeout/i.test(message);
    return {
      ok: false,
      error: {
        reason: isAbort ? "llm_timeout" : "llm_unavailable",
        message,
      },
    };
  }

  if (!result) {
    return {
      ok: false,
      error: {
        reason: "llm_unavailable",
        message: `callLLM returned null for model ${CRISTIANO_JUDGE_MODEL} after ${Date.now() - start}ms`,
      },
    };
  }

  return { ok: true, rawText: result.text, result };
}

/**
 * Tolerant JSON extractor matching the LTM cristiano.ts pattern
 * (lines 674-727). Strips markdown fences, falls back to greedy
 * regex match if the model wrapped the JSON in explanatory text.
 */
function extractJson<T>(text: string): T | null {
  const cleaned = text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* fall through */
  }

  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]) as T;
    } catch {
      /* fall through */
    }
  }

  return null;
}

// ─── Kind 1: startup_match ───────────────────────────────────────────────────

/**
 * Render a startup-match verdict. Simplified vs LTM's two-phase
 * pipeline (LTM goes Gemini → Opus with org pre-filtering). For OB
 * standalone we accept the DNA paragraphs + metadata + goal and let
 * Opus produce a verdict directly without an org lookup. When the
 * LTM backport pushes verdicts in via the gateway, it already has
 * the LTM-side top-3 baked in — that path skips this brain entirely.
 */
function buildStartupMatchPrompt(req: CristianoStartupMatchRequest): string {
  const paragraphLines = Object.entries(req.paragraphs)
    .filter(([, text]) => text && text.trim().length > 0)
    .map(([id, text]) => `${id.toUpperCase()}: ${text.trim()}`)
    .join("\n");

  return `Render a startup-match verdict for the following company.

COMPANY METADATA:
- Legal name: ${req.metadata.legalName || "(not provided)"}
- Funding round: ${req.metadata.fundingRound || "(not provided)"}
- Sector tags: ${req.metadata.sectorTags.length ? req.metadata.sectorTags.join(", ") : "(not provided)"}
- Outreach goal: ${req.outreachGoal.replace(/_/g, " ")}

USER-DESCRIBED COMPANY (DNA paragraphs):
${paragraphLines || "(no paragraphs provided)"}

TASK:
1. Synthesise the user's DNA into a single "companyProfile" object (companyName, sector list, stage).
2. Render up to 3 archetypal investor / partner matches with rank, matchScore, rationale, strengths, concerns, approachStrategy. organizationId can be a stable slug like "vc-archetype-growth-1" since OB standalone doesn't enumerate real London orgs (LTM does that and pushes its verdicts via the gateway).
3. Write a 60–180 second spokenScript Cristiano will read aloud delivering the verdict.
4. Title the verdict in <= 240 chars.

RETURN ONLY VALID JSON matching this exact shape (no markdown fences, no explanation):
{
  "spokenScript": "string",
  "verdictTitle": "string",
  "confidence": "high" | "medium" | "low",
  "companyProfile": { "companyName": "string", "sector": ["string"], "stage": "string" },
  "topMatches": [
    {
      "organizationId": "string",
      "organizationName": "string",
      "rank": 1,
      "matchScore": 87,
      "rationale": "string",
      "strengths": ["string"],
      "concerns": ["string"],
      "approachStrategy": "string"
    }
  ]
}`;
}

export async function judgeStartupMatch(
  payload: CristianoStartupMatchRequest,
): Promise<CristianoBrainResult<CristianoStartupMatchVerdict>> {
  const call = await callJudge({
    systemPrompt: CRISTIANO_SYSTEM_PROMPT,
    userPrompt: buildStartupMatchPrompt(payload),
  });
  if (!call.ok) return { ok: false, error: call.error };

  const parsed = extractJson<unknown>(call.rawText);
  if (parsed === null) {
    return {
      ok: false,
      error: {
        reason: "parse_failure",
        message: "LLM did not return parseable JSON",
        rawText: call.rawText.slice(0, 500),
      },
    };
  }

  const validated = CristianoStartupMatchVerdictSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: {
        reason: "validation_failure",
        message: validated.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        rawText: call.rawText.slice(0, 500),
      },
    };
  }

  return {
    ok: true,
    verdict: validated.data,
    telemetry: {
      modelUsed: call.result.modelId,
      inputTokens: call.result.inputTokens,
      outputTokens: call.result.outputTokens,
      latencyMs: call.result.durationMs,
    },
  };
}

// ─── Kind 2: city_compare ────────────────────────────────────────────────────

function buildCityComparePrompt(req: CristianoCityCompareRequest): string {
  const scoresLine = req.precomputedScores
    ? `Pre-computed consensus scores from the upstream evaluator pool:
- ${req.city1} = ${req.precomputedScores.city1Score}
- ${req.city2} = ${req.precomputedScores.city2Score}${
        req.precomputedScores.overallAgreement != null
          ? `\n- Overall LLM agreement: ${req.precomputedScores.overallAgreement}%`
          : ""
      }`
    : "No pre-computed scores provided — use general world-knowledge of the two cities to estimate.";

  return `Render a city-comparison verdict — which city offers more lived + legal freedom.

CITIES:
- City 1: ${req.city1}${req.city1Country ? ` (${req.city1Country})` : ""}
- City 2: ${req.city2}${req.city2Country ? ` (${req.city2Country})` : ""}

${scoresLine}

TASK:
1. Decide the winner: "city1" | "city2" | "tie".
2. State each city's score (0–100). If pre-computed scores were provided, use them; otherwise estimate based on general knowledge.
3. State the margin (absolute difference).
4. Write a 1–2 paragraph rationale.
5. List 3–6 key factors that drove the verdict.
6. Optional: 1 paragraph future outlook.
7. Write a 60–180 second spokenScript Cristiano reads aloud.
8. Title the verdict in <= 240 chars (e.g. "London 82 vs Paris 76").

RETURN ONLY VALID JSON matching this exact shape (no markdown fences, no explanation):
{
  "spokenScript": "string",
  "verdictTitle": "string",
  "confidence": "high" | "medium" | "low",
  "winner": "city1" | "city2" | "tie",
  "city1Score": 82,
  "city2Score": 76,
  "margin": 6,
  "rationale": "string",
  "keyFactors": ["string"],
  "futureOutlook": "string"
}`;
}

export async function judgeCityCompare(
  payload: CristianoCityCompareRequest,
): Promise<CristianoBrainResult<CristianoCityCompareVerdict>> {
  const call = await callJudge({
    systemPrompt: CRISTIANO_SYSTEM_PROMPT,
    userPrompt: buildCityComparePrompt(payload),
  });
  if (!call.ok) return { ok: false, error: call.error };

  const parsed = extractJson<unknown>(call.rawText);
  if (parsed === null) {
    return {
      ok: false,
      error: {
        reason: "parse_failure",
        message: "LLM did not return parseable JSON",
        rawText: call.rawText.slice(0, 500),
      },
    };
  }

  const validated = CristianoCityCompareVerdictSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: {
        reason: "validation_failure",
        message: validated.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        rawText: call.rawText.slice(0, 500),
      },
    };
  }

  return {
    ok: true,
    verdict: validated.data,
    telemetry: {
      modelUsed: call.result.modelId,
      inputTokens: call.result.inputTokens,
      outputTokens: call.result.outputTokens,
      latencyMs: call.result.durationMs,
    },
  };
}

// ─── Kind 3: freeform ────────────────────────────────────────────────────────

function buildFreeformPrompt(req: CristianoFreeformRequest): string {
  const contextBlock = req.context
    ? `\nBACKGROUND CONTEXT:\n${req.context}\n`
    : "";
  const criteriaBlock =
    req.criteria && req.criteria.length > 0
      ? `\nWEIGHTED CRITERIA the user wants you to consider:\n${req.criteria.map((c) => `- ${c}`).join("\n")}\n`
      : "";

  return `Render a verdict on the following question.

QUESTION:
${req.question}
${contextBlock}${criteriaBlock}
TASK:
1. Produce a single, decisive recommendation (one paragraph).
2. Write a 1–2 paragraph rationale.
3. List up to 6 key factors that drove the verdict.
4. Optional: list up to 6 risks.
5. Optional: list up to 6 next steps.
6. Write a 60–180 second spokenScript Cristiano reads aloud.
7. Title the verdict in <= 240 chars.

RETURN ONLY VALID JSON matching this exact shape (no markdown fences, no explanation):
{
  "spokenScript": "string",
  "verdictTitle": "string",
  "confidence": "high" | "medium" | "low",
  "recommendation": "string",
  "rationale": "string",
  "keyFactors": ["string"],
  "risks": ["string"],
  "nextSteps": ["string"]
}`;
}

export async function judgeFreeform(
  payload: CristianoFreeformRequest,
): Promise<CristianoBrainResult<CristianoFreeformVerdict>> {
  const call = await callJudge({
    systemPrompt: CRISTIANO_SYSTEM_PROMPT,
    userPrompt: buildFreeformPrompt(payload),
  });
  if (!call.ok) return { ok: false, error: call.error };

  const parsed = extractJson<unknown>(call.rawText);
  if (parsed === null) {
    return {
      ok: false,
      error: {
        reason: "parse_failure",
        message: "LLM did not return parseable JSON",
        rawText: call.rawText.slice(0, 500),
      },
    };
  }

  const validated = CristianoFreeformVerdictSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: {
        reason: "validation_failure",
        message: validated.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        rawText: call.rawText.slice(0, 500),
      },
    };
  }

  return {
    ok: true,
    verdict: validated.data,
    telemetry: {
      modelUsed: call.result.modelId,
      inputTokens: call.result.inputTokens,
      outputTokens: call.result.outputTokens,
      latencyMs: call.result.durationMs,
    },
  };
}

// ─── Dispatcher (used by /api/cristiano/judge) ───────────────────────────────

/**
 * Type-discriminated dispatch from kind → handler. Returned shape uses
 * the same discriminated union as the request so callers can branch
 * once and have a fully-typed verdict body.
 */
export type CristianoJudgeOutcome =
  | {
      ok: true;
      kind: CristianoVerdictKind;
      verdict:
        | CristianoStartupMatchVerdict
        | CristianoCityCompareVerdict
        | CristianoFreeformVerdict;
      telemetry: {
        modelUsed: string;
        inputTokens: number;
        outputTokens: number;
        latencyMs: number;
      };
    }
  | { ok: false; error: CristianoBrainErrorDetail };

/**
 * Render a verdict for any supported kind. Pure delegate to the
 * per-kind handler — kept exhaustive via the `never` switch default
 * so adding a new kind requires updating this dispatcher (TypeScript
 * fails the build otherwise).
 */
export async function renderVerdict(
  request:
    | { kind: "startup_match"; payload: CristianoStartupMatchRequest }
    | { kind: "city_compare"; payload: CristianoCityCompareRequest }
    | { kind: "freeform"; payload: CristianoFreeformRequest },
): Promise<CristianoJudgeOutcome> {
  switch (request.kind) {
    case "startup_match": {
      const result = await judgeStartupMatch(request.payload);
      if (!result.ok) return { ok: false, error: result.error };
      return {
        ok: true,
        kind: "startup_match",
        verdict: result.verdict,
        telemetry: result.telemetry,
      };
    }
    case "city_compare": {
      const result = await judgeCityCompare(request.payload);
      if (!result.ok) return { ok: false, error: result.error };
      return {
        ok: true,
        kind: "city_compare",
        verdict: result.verdict,
        telemetry: result.telemetry,
      };
    }
    case "freeform": {
      const result = await judgeFreeform(request.payload);
      if (!result.ok) return { ok: false, error: result.error };
      return {
        ok: true,
        kind: "freeform",
        verdict: result.verdict,
        telemetry: result.telemetry,
      };
    }
    default: {
      const exhaustive: never = request;
      throw new Error(
        `Unknown CristianoVerdictKind: ${JSON.stringify(exhaustive)}`,
      );
    }
  }
}
