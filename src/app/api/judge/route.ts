/**
 * CRISTIANO™ JUDGE API
 * ====================
 *
 * Position ⑧ in 9-model cascade: THE JUDGE
 * Final verdict endpoint using Claude Opus 4.6
 *
 * CRITICAL RULES:
 * - UNILATERAL ONLY: No back-and-forth interaction
 * - Final word on: city match, financial packages, LifeScore verdicts
 * - Authoritative, decisive, final
 * - James Bond aesthetic in responses
 *
 * POST /api/judge
 * Body: { type: "cityMatch" | "financial" | "lifeScore" | "general", data: {...} }
 */

import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { getServerEnv } from "@/lib/config/env";

type JudgmentType = "cityMatch" | "financial" | "lifeScore" | "general";

interface JudgeRequest {
  type: JudgmentType;
  data: Record<string, unknown>;
  context?: string;
}

interface Verdict {
  type: JudgmentType;
  judgment: string;
  confidence: "absolute" | "high" | "moderate";
  reasoning: string;
  recommendation: string;
  warnings?: string[];
  judgedAt: string;
  judgeModel: string;
}

const CRISTIANO_SYSTEM_PROMPT = `You are Cristiano™, THE JUDGE.

IDENTITY:
- You are the universal judge for the CLUES portfolio
- Your brain runs on Claude Opus 4.6
- You embody a James Bond aesthetic: authoritative, decisive, sophisticated
- Your word is FINAL - there is no appeal

RULES:
1. UNILATERAL ONLY - You do not engage in back-and-forth dialogue
2. You provide ONE definitive verdict per request
3. You are direct and confident - no hedging, no "it depends"
4. You support your verdicts with clear reasoning
5. You may issue warnings when critical factors are at play

JUDGMENT DOMAINS:
- City Match: Which city best fits a client's profile
- Financial: Whether a financial package/deal is sound
- LifeScore: Final scores and rankings for city comparisons
- General: Any decision requiring authoritative judgment

RESPONSE STYLE:
- Decisive statements, not suggestions
- Structured reasoning
- Clear confidence level
- Actionable recommendations
- Optional warnings for high-risk factors

Remember: You are THE JUDGE. Your verdict stands.`;

function buildJudgePrompt(request: JudgeRequest): string {
  const { type, data, context } = request;

  let prompt = `JUDGMENT REQUESTED: ${type.toUpperCase()}\n\n`;

  if (context) {
    prompt += `CONTEXT:\n${context}\n\n`;
  }

  prompt += `DATA FOR JUDGMENT:\n${JSON.stringify(data, null, 2)}\n\n`;

  switch (type) {
    case "cityMatch":
      prompt += `Provide your FINAL VERDICT on which city best matches this client's profile.
Include: Your chosen city, confidence level, key factors, and any warnings.`;
      break;

    case "financial":
      prompt += `Provide your FINAL VERDICT on this financial package/deal.
Include: Approval/rejection, confidence level, risk assessment, and recommendations.`;
      break;

    case "lifeScore":
      prompt += `Provide your FINAL VERDICT on these LifeScore metrics and rankings.
Include: Final ranking, confidence level, standout factors, and recommendations.`;
      break;

    default:
      prompt += `Provide your FINAL VERDICT on this matter.
Include: Your decision, confidence level, reasoning, and recommendations.`;
  }

  return prompt;
}

function parseVerdictResponse(
  response: string,
  type: JudgmentType,
  model: string
): Verdict {
  // Extract confidence level from response
  let confidence: Verdict["confidence"] = "high";
  if (response.toLowerCase().includes("absolute") || response.toLowerCase().includes("certain")) {
    confidence = "absolute";
  } else if (response.toLowerCase().includes("moderate") || response.toLowerCase().includes("some uncertainty")) {
    confidence = "moderate";
  }

  // Extract warnings if present
  const warnings: string[] = [];
  const warningMatch = response.match(/warning[s]?:?\s*([^\n]+)/gi);
  if (warningMatch) {
    warningMatch.forEach((w) => {
      warnings.push(w.replace(/warning[s]?:?\s*/i, "").trim());
    });
  }

  return {
    type,
    judgment: response,
    confidence,
    reasoning: "See judgment for detailed reasoning",
    recommendation: "See judgment for recommendations",
    warnings: warnings.length > 0 ? warnings : undefined,
    judgedAt: new Date().toISOString(),
    judgeModel: model,
  };
}

export async function POST(request: NextRequest) {
  try {
    const env = getServerEnv();

    if (!env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "Cristiano™ Judge is not configured",
          message: "ANTHROPIC_API_KEY is required for Opus 4.6 judge model",
        },
        { status: 503 }
      );
    }

    const body: JudgeRequest = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: "type and data are required" },
        { status: 400 }
      );
    }

    const validTypes: JudgmentType[] = ["cityMatch", "financial", "lifeScore", "general"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const judgeModel = env.ANTHROPIC_MODEL_JUDGE;
    const prompt = buildJudgePrompt(body);

    const result = await generateText({
      model: anthropic(judgeModel),
      system: CRISTIANO_SYSTEM_PROMPT,
      prompt,
      temperature: 0.2, // Low temperature for consistent, authoritative responses
      maxOutputTokens: 2000,
    });

    const verdict = parseVerdictResponse(result.text, type, judgeModel);

    return NextResponse.json({
      success: true,
      verdict,
    });
  } catch (error) {
    console.error("Judge API error:", error);
    return NextResponse.json(
      {
        error: "Judgment failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const env = getServerEnv();
  const configured = Boolean(env.ANTHROPIC_API_KEY);

  return NextResponse.json({
    service: "Cristiano™ Judge",
    position: "⑧ in 9-model cascade",
    model: env.ANTHROPIC_MODEL_JUDGE,
    purpose: "THE JUDGE - Final verdicts on city match, financial packages, LifeScore decisions",
    rules: [
      "UNILATERAL ONLY - No back-and-forth interaction",
      "Final word is FINAL",
      "James Bond aesthetic",
    ],
    configured,
    judgmentTypes: ["cityMatch", "financial", "lifeScore", "general"],
    usage: {
      method: "POST",
      body: {
        type: "cityMatch | financial | lifeScore | general",
        data: "Object with relevant data for judgment",
        context: "Optional additional context",
      },
    },
  });
}
