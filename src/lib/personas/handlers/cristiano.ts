/**
 * Cristiano™ Handler
 * Sprint 4.1 — Persona Orchestration Layer
 *
 * Specialized handler for Cristiano™ - THE JUDGE.
 * Delivers final, authoritative verdicts. UNILATERAL ONLY.
 */

import type { PersonaInvocation, PersonaResponse } from "../types";
import { getActivePersona, invokePersona } from "../orchestrator";

/**
 * Verdict types that Cristiano can deliver.
 */
export type VerdictType =
  | "city_match"           // Final city recommendation
  | "financial_package"    // Financial viability assessment
  | "lifescore"           // LifeScore™ evaluation
  | "comparison"          // Head-to-head comparison
  | "recommendation"      // General recommendation verdict
  | "approval"            // Go/no-go decision
  | "ranking";            // Ordered ranking with scores

/**
 * Verdict request structure.
 */
export interface VerdictRequest {
  type: VerdictType;
  /** The subject being judged (city name, package ID, etc.) */
  subject: string;
  /** Data to evaluate */
  evaluationData: Record<string, unknown>;
  /** Client profile for context */
  clientProfile: Record<string, unknown>;
  /** Specific criteria to evaluate against */
  criteria: VerdictCriteria[];
  /** Session metadata */
  sessionId: string;
  clientId: string;
  tenantId: string | null;
}

export interface VerdictCriteria {
  name: string;
  weight: number; // 0-1
  threshold?: number; // Minimum acceptable score
}

/**
 * Structured verdict response.
 */
export interface Verdict {
  type: VerdictType;
  subject: string;
  /** The definitive verdict */
  decision: "approved" | "rejected" | "conditional";
  /** Overall score (0-100) */
  score: number;
  /** Confidence level */
  confidence: number;
  /** Brief verdict statement */
  summary: string;
  /** Detailed rationale */
  rationale: string;
  /** Key factors that drove the decision */
  keyFactors: Array<{
    factor: string;
    impact: "positive" | "negative" | "neutral";
    weight: number;
    score: number;
  }>;
  /** Any conditions or caveats */
  conditions: string[];
  /** Timestamp */
  deliveredAt: Date;
}

/**
 * Cristiano's verdict prompt templates.
 */
const VERDICT_PROMPTS: Record<VerdictType, string> = {
  city_match: `Evaluate {{subject}} as a relocation destination for this client.

CLIENT PROFILE:
{{clientProfile}}

CITY DATA:
{{cityData}}

EVALUATION CRITERIA:
{{criteria}}

Deliver your FINAL VERDICT:
1. DECISION: Approved, Rejected, or Conditional
2. OVERALL SCORE: 0-100
3. SUMMARY: One authoritative statement
4. RATIONALE: Key factors driving your decision
5. CONCERNS: Any material risks or issues
6. CONDITIONS: If conditional, what must be met

Speak with absolute conviction. This is your FINAL verdict.`,

  financial_package: `Evaluate this financial package for viability.

CLIENT PROFILE:
{{clientProfile}}

PACKAGE DETAILS:
{{packageData}}

EVALUATION CRITERIA:
{{criteria}}

Deliver your FINAL VERDICT on financial viability:
1. DECISION: Approved, Rejected, or Conditional
2. OVERALL SCORE: 0-100
3. SUMMARY: One definitive statement
4. RATIONALE: Financial factors considered
5. RISKS: Material financial risks
6. CONDITIONS: Requirements for approval

Your verdict is FINAL.`,

  lifescore: `Evaluate this LifeScore assessment.

CLIENT PROFILE:
{{clientProfile}}

ASSESSMENT DATA:
{{assessmentData}}

SCORING DIMENSIONS:
{{criteria}}

Deliver the FINAL LifeScore:
1. OVERALL SCORE: 0-100
2. DIMENSION SCORES: Break down by category
3. SUMMARY: What this score means
4. STRENGTHS: Top 3 positive factors
5. CONCERNS: Top 3 areas of concern
6. VERDICT: Clear recommendation

This is the DEFINITIVE LifeScore.`,

  comparison: `Compare these options and deliver a verdict.

OPTIONS:
{{options}}

CLIENT PROFILE:
{{clientProfile}}

COMPARISON CRITERIA:
{{criteria}}

Deliver your FINAL COMPARATIVE VERDICT:
1. RANKING: Ordered from best to worst
2. WINNER: The clear recommendation
3. MARGIN: How decisive is the winner
4. RATIONALE: Why this ranking
5. TRADE-OFFS: What the client gives up
6. VERDICT: Final recommendation

Your ranking is FINAL and AUTHORITATIVE.`,

  recommendation: `Evaluate and deliver your recommendation.

SUBJECT:
{{subject}}

CONTEXT:
{{context}}

CRITERIA:
{{criteria}}

Deliver your RECOMMENDATION:
1. DECISION: Your clear recommendation
2. CONFIDENCE: How certain you are
3. SUMMARY: One authoritative statement
4. RATIONALE: Supporting factors
5. ALTERNATIVES: If applicable
6. VERDICT: Final word

This is your DEFINITIVE recommendation.`,

  approval: `Evaluate for approval.

REQUEST:
{{subject}}

DETAILS:
{{details}}

APPROVAL CRITERIA:
{{criteria}}

Deliver your APPROVAL DECISION:
1. DECISION: APPROVED or REJECTED
2. SUMMARY: One clear statement
3. RATIONALE: Basis for decision
4. CONDITIONS: If any
5. NEXT STEPS: Required actions

This decision is FINAL.`,

  ranking: `Rank these items definitively.

ITEMS:
{{items}}

RANKING CRITERIA:
{{criteria}}

Deliver your FINAL RANKING:
1. ORDERED RANKING: Best to worst
2. SCORES: Score for each item
3. SUMMARY: Key insight
4. RATIONALE: Why this order
5. TIER BREAKS: Where quality drops
6. VERDICT: The champion

This ranking is AUTHORITATIVE and FINAL.`,
};

/**
 * Generate a verdict prompt from template.
 */
function generateVerdictPrompt(request: VerdictRequest): string {
  const template = VERDICT_PROMPTS[request.type];

  return template
    .replace("{{subject}}", request.subject)
    .replace("{{clientProfile}}", JSON.stringify(request.clientProfile, null, 2))
    .replace("{{criteria}}", formatCriteria(request.criteria))
    .replace(/\{\{[a-zA-Z]+\}\}/g, (match) => {
      const key = match.replace(/[{}]/g, "");
      const value = request.evaluationData[key];
      return value ? JSON.stringify(value, null, 2) : "[Not provided]";
    });
}

function formatCriteria(criteria: VerdictCriteria[]): string {
  return criteria
    .map((c) => `- ${c.name}: Weight ${(c.weight * 100).toFixed(0)}%${c.threshold ? `, Minimum ${c.threshold}` : ""}`)
    .join("\n");
}

/**
 * Request a verdict from Cristiano.
 */
export async function requestVerdict(request: VerdictRequest): Promise<Verdict> {
  const persona = getActivePersona("cristiano");
  const prompt = generateVerdictPrompt(request);

  const invocation: PersonaInvocation = {
    personaId: "cristiano",
    input: prompt,
    context: {
      recentTurns: [],
      memories: [],
      knowledgeContext: null,
      emotionalContext: "confident",
      metadata: {
        verdictType: request.type,
        subject: request.subject,
      },
    },
    outputModalities: ["text"], // Cristiano is text-first, video optional
    sessionId: request.sessionId,
    clientId: request.clientId,
    tenantId: request.tenantId,
  };

  const response = await invokePersona(invocation);

  // Parse the verdict from the response
  const verdict = parseVerdictResponse(request.type, request.subject, response.text);

  return verdict;
}

/**
 * Parse Cristiano's response into a structured verdict.
 */
function parseVerdictResponse(type: VerdictType, subject: string, responseText: string): Verdict {
  // In production, this would parse the structured response from the LLM
  // For now, return a placeholder structure

  return {
    type,
    subject,
    decision: "approved",
    score: 85,
    confidence: 0.9,
    summary: `${subject} has been evaluated and approved.`,
    rationale: responseText,
    keyFactors: [
      { factor: "Overall quality", impact: "positive", weight: 0.4, score: 88 },
      { factor: "Cost efficiency", impact: "positive", weight: 0.3, score: 82 },
      { factor: "Risk profile", impact: "neutral", weight: 0.3, score: 80 },
    ],
    conditions: [],
    deliveredAt: new Date(),
  };
}

/**
 * Request a city match verdict.
 */
export async function judgeCityMatch(
  cityName: string,
  cityData: Record<string, unknown>,
  clientProfile: Record<string, unknown>,
  criteria: VerdictCriteria[],
  session: { sessionId: string; clientId: string; tenantId: string | null }
): Promise<Verdict> {
  return requestVerdict({
    type: "city_match",
    subject: cityName,
    evaluationData: { cityData },
    clientProfile,
    criteria,
    ...session,
  });
}

/**
 * Request a LifeScore verdict.
 */
export async function judgeLifeScore(
  assessmentData: Record<string, unknown>,
  clientProfile: Record<string, unknown>,
  dimensions: VerdictCriteria[],
  session: { sessionId: string; clientId: string; tenantId: string | null }
): Promise<Verdict> {
  return requestVerdict({
    type: "lifescore",
    subject: "LifeScore Assessment",
    evaluationData: { assessmentData },
    clientProfile,
    criteria: dimensions,
    ...session,
  });
}

/**
 * Request a comparison verdict.
 */
export async function judgeComparison(
  options: Array<{ name: string; data: Record<string, unknown> }>,
  clientProfile: Record<string, unknown>,
  criteria: VerdictCriteria[],
  session: { sessionId: string; clientId: string; tenantId: string | null }
): Promise<Verdict> {
  return requestVerdict({
    type: "comparison",
    subject: `Comparison: ${options.map((o) => o.name).join(" vs ")}`,
    evaluationData: { options },
    clientProfile,
    criteria,
    ...session,
  });
}

/**
 * Generate Cristiano's verdict video presentation.
 */
export async function generateVerdictPresentation(
  verdict: Verdict,
  options: {
    includeVideo: boolean;
    includeAudio: boolean;
    sessionId: string;
  }
): Promise<PersonaResponse> {
  const persona = getActivePersona("cristiano");

  const presentationScript = `
The verdict is in.

${verdict.summary}

Score: ${verdict.score} out of 100.

${verdict.rationale}

This decision is final.
`.trim();

  const invocation: PersonaInvocation = {
    personaId: "cristiano",
    input: presentationScript,
    context: {
      recentTurns: [],
      memories: [],
      knowledgeContext: null,
      emotionalContext: "confident",
      metadata: { verdict },
    },
    outputModalities: [
      "text",
      ...(options.includeAudio ? ["audio" as const] : []),
      ...(options.includeVideo ? ["video" as const] : []),
    ],
    sessionId: options.sessionId,
    clientId: "",
    tenantId: null,
  };

  return invokePersona(invocation);
}
