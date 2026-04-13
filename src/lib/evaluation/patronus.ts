/**
 * Patronus AI Hallucination Detection
 * Sprint 4.5 — Evaluation & Observability (Item 5)
 *
 * Integrates the Patronus API for automated hallucination scoring on
 * Olivia's responses. Patronus provides production-grade evaluators
 * for detecting:
 *
 * 1. **Hallucinations** — Claims not grounded in the provided context
 * 2. **Factual consistency** — Whether output contradicts retrieved sources
 * 3. **Answer relevance** — Whether the response addresses the question
 * 4. **Context sufficiency** — Whether retrieved context supports the answer
 *
 * This is critical for Olivia because she provides relocation advice
 * involving real estate prices, visa regulations, tax implications, and
 * safety statistics — areas where hallucinated data causes real harm.
 *
 * All functions are NoOp-safe: if PATRONUS_API_KEY is missing, they
 * return sensible defaults without throwing.
 *
 * Usage:
 *   const service = getPatronusService();
 *   const result = await service.detectHallucinations({
 *     input: "What's the average rent in Lisbon?",
 *     output: "The average rent in Lisbon is €1,200/month for a 1-bedroom.",
 *     context: ["Lisbon rental data 2025: 1BR avg €1,150-€1,300/month"],
 *   });
 *   console.log(`Hallucination pass: ${result.passed}`);
 */

import { PatronusAPI } from "patronus-api";

import { getServerEnv } from "@/lib/config/env";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Patronus evaluator types used for Olivia's quality checks. */
export type PatronusEvaluator =
  | "hallucination"
  | "factual-consistency"
  | "answer-relevance"
  | "context-sufficiency"
  | "toxicity"
  | "pii";

/** Input for a hallucination detection check. */
export interface HallucinationCheckInput {
  /** The user's question/prompt */
  input: string;
  /** Olivia's response to evaluate */
  output: string;
  /** Retrieved context (RAG sources, knowledge base entries) that should ground the response */
  context?: string[];
  /** The ideal/expected answer (if available) */
  goldAnswer?: string;
  /** Olivia's system prompt (for persona evaluation) */
  systemPrompt?: string;
  /** Which evaluators to run (default: hallucination + factual-consistency) */
  evaluators?: PatronusEvaluator[];
  /** Whether to capture results in Patronus dashboard (default: true) */
  capture?: boolean;
  /** Request explanations for failures (default: on-fail) */
  explainStrategy?: "never" | "on-fail" | "on-success" | "always";
}

/** Result from a single Patronus evaluator. */
export interface EvaluatorResult {
  /** Which evaluator produced this result */
  evaluator: string;
  /** Whether the response passed this check */
  passed: boolean | null;
  /** Raw score from the evaluator (0-1 scale) */
  score: number | null;
  /** Human-readable explanation of why it passed/failed */
  explanation: string | null;
  /** The evaluator's criteria name */
  criteria: string | null;
  /** Whether the evaluation succeeded (vs errored) */
  success: boolean;
  /** Error message if the evaluation itself failed */
  error?: string;
}

/** Full hallucination detection result across all evaluators. */
export interface HallucinationResult {
  /** Unique result identifier */
  resultId: string;
  /** When the check was run */
  timestamp: string;
  /** Individual results per evaluator */
  evaluatorResults: EvaluatorResult[];
  /** Overall pass: true only if ALL evaluators pass */
  overallPassed: boolean;
  /** Average score across all evaluators (0-100 scale) */
  overallScore: number;
  /** Total evaluation duration in ms */
  durationMs: number;
  /** Whether Patronus was available */
  patronusAvailable: boolean;
  /** Summary of detected issues */
  issues: string[];
}

/** Input for scoring factual consistency of a batch of responses. */
export interface FactualConsistencyBatchInput {
  /** Array of input/output/context triples to evaluate */
  items: Array<{
    input: string;
    output: string;
    context?: string[];
    goldAnswer?: string;
  }>;
  /** Capture results in Patronus (default: true) */
  capture?: boolean;
}

/** Batch factual consistency result. */
export interface FactualConsistencyBatchResult {
  /** Per-item results */
  items: Array<{
    index: number;
    passed: boolean;
    score: number;
    explanation: string | null;
    issues: string[];
  }>;
  /** How many passed */
  passCount: number;
  /** How many failed */
  failCount: number;
  /** Average score across all items (0-100) */
  avgScore: number;
  /** Total duration in ms */
  durationMs: number;
}

// ─── Patronus Client ────────────────────────────────────────────────────────

/** Whether Patronus is available (API key present). */
function isPatronusAvailable(): boolean {
  const env = getServerEnv();
  return (
    typeof env.PATRONUS_API_KEY === "string" &&
    env.PATRONUS_API_KEY.length > 0
  );
}

/** Get a configured Patronus client. Returns null if unavailable. */
function getClient(): PatronusAPI | null {
  if (!isPatronusAvailable()) return null;

  const env = getServerEnv();
  return new PatronusAPI({
    apiKey: env.PATRONUS_API_KEY,
  });
}

// ─── Evaluator Mapping ──────────────────────────────────────────────────────

/** Maps our evaluator names to Patronus evaluator identifiers. */
const EVALUATOR_MAP: Record<PatronusEvaluator, string> = {
  hallucination: "hallucination",
  "factual-consistency": "factual-consistency",
  "answer-relevance": "answer-relevance",
  "context-sufficiency": "context-sufficiency",
  toxicity: "toxicity",
  pii: "pii",
};

// ─── Core: Detect Hallucinations ────────────────────────────────────────────

/**
 * Run hallucination detection on a single Olivia response.
 *
 * Process:
 * 1. Send input/output/context to Patronus evaluate endpoint
 * 2. Run selected evaluators (default: hallucination + factual-consistency)
 * 3. Aggregate results: overall pass requires ALL evaluators to pass
 * 4. Collect explanations for any failures
 *
 * NoOp-safe: returns a default "unavailable" result if no API key.
 */
async function detectHallucinations(
  check: HallucinationCheckInput
): Promise<HallucinationResult> {
  const start = Date.now();
  const resultId = `pat-${Date.now()}`;

  const {
    input,
    output,
    context,
    goldAnswer,
    systemPrompt,
    evaluators = ["hallucination", "factual-consistency"],
    capture = true,
    explainStrategy = "on-fail",
  } = check;

  // NoOp if Patronus unavailable
  if (!isPatronusAvailable()) {
    console.log("[Patronus] API key not configured — returning NoOp result");
    return {
      resultId,
      timestamp: new Date().toISOString(),
      evaluatorResults: [],
      overallPassed: true,
      overallScore: -1,
      durationMs: Date.now() - start,
      patronusAvailable: false,
      issues: ["Patronus API key not configured — hallucination check skipped"],
    };
  }

  const client = getClient();
  if (!client) {
    return {
      resultId,
      timestamp: new Date().toISOString(),
      evaluatorResults: [],
      overallPassed: true,
      overallScore: -1,
      durationMs: Date.now() - start,
      patronusAvailable: false,
      issues: ["Failed to create Patronus client"],
    };
  }

  console.log(
    `[Patronus] Running ${evaluators.length} evaluators on response (${output.length} chars)`
  );

  try {
    const response = await client.evaluations.evaluate({
      evaluators: evaluators.map((e) => ({
        evaluator: EVALUATOR_MAP[e] ?? e,
        explain_strategy: explainStrategy,
      })),
      task_input: input,
      task_output: output,
      task_context: context ?? null,
      gold_answer: goldAnswer ?? null,
      system_prompt: systemPrompt ?? null,
      capture: capture ? "all" : "none",
      project_name: "olivia-brain",
      app: "olivia-hallucination-check",
    });

    // Parse results
    const evaluatorResults: EvaluatorResult[] = [];
    const issues: string[] = [];

    for (const result of response.results) {
      const evalResult = result.evaluation_result;

      const passed = evalResult?.pass ?? null;
      const score = evalResult?.score_raw ?? null;
      const explanation = evalResult?.explanation ?? result.error_message;

      evaluatorResults.push({
        evaluator: result.evaluator_id,
        passed,
        score,
        explanation,
        criteria: result.criteria,
        success: result.status === "success",
        error:
          result.status !== "success"
            ? result.error_message ?? "Evaluation failed"
            : undefined,
      });

      if (passed === false) {
        issues.push(
          `${result.evaluator_id}: FAILED${explanation ? ` — ${explanation}` : ""}`
        );
      }

      if (result.status !== "success") {
        issues.push(
          `${result.evaluator_id}: ERROR — ${result.error_message ?? "unknown error"}`
        );
      }

      console.log(
        `[Patronus]   ${result.evaluator_id}: ${passed ? "PASS" : passed === false ? "FAIL" : "N/A"} (score: ${score ?? "N/A"})`
      );
    }

    // Overall pass: all successful evaluators must pass
    const successfulResults = evaluatorResults.filter((r) => r.success);
    const overallPassed =
      successfulResults.length > 0 &&
      successfulResults.every((r) => r.passed !== false);

    // Average score (scale to 0-100)
    const scores = successfulResults
      .map((r) => r.score)
      .filter((s): s is number => s !== null);
    const overallScore =
      scores.length > 0
        ? Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
          )
        : -1;

    const hallucinationResult: HallucinationResult = {
      resultId,
      timestamp: new Date().toISOString(),
      evaluatorResults,
      overallPassed,
      overallScore,
      durationMs: Date.now() - start,
      patronusAvailable: true,
      issues,
    };

    console.log(
      `[Patronus] Complete: ${overallPassed ? "PASS" : "FAIL"} (score: ${overallScore}/100) in ${hallucinationResult.durationMs}ms`
    );

    return hallucinationResult;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    console.error(`[Patronus] Evaluation failed: ${msg}`);

    return {
      resultId,
      timestamp: new Date().toISOString(),
      evaluatorResults: [],
      overallPassed: false,
      overallScore: 0,
      durationMs: Date.now() - start,
      patronusAvailable: true,
      issues: [`Patronus API error: ${msg}`],
    };
  }
}

// ─── Factual Consistency Scoring ────────────────────────────────────────────

/**
 * Score factual consistency for a single response.
 *
 * Focused check: runs only the factual-consistency evaluator.
 * Returns a simplified pass/fail with score.
 */
async function scoreFactualConsistency(
  input: string,
  output: string,
  context?: string[]
): Promise<{
  passed: boolean;
  score: number;
  explanation: string | null;
}> {
  const result = await detectHallucinations({
    input,
    output,
    context,
    evaluators: ["factual-consistency"],
    capture: false,
    explainStrategy: "always",
  });

  const fcResult = result.evaluatorResults.find(
    (r) => r.evaluator === "factual-consistency"
  );

  return {
    passed: fcResult?.passed ?? result.overallPassed,
    score: result.overallScore >= 0 ? result.overallScore : 0,
    explanation: fcResult?.explanation ?? null,
  };
}

// ─── Batch Factual Consistency ──────────────────────────────────────────────

/**
 * Score factual consistency for a batch of responses.
 *
 * Runs each item through the factual-consistency evaluator sequentially.
 * Returns per-item results plus aggregate stats.
 */
async function scoreFactualConsistencyBatch(
  batchInput: FactualConsistencyBatchInput
): Promise<FactualConsistencyBatchResult> {
  const start = Date.now();
  const { items, capture = true } = batchInput;

  console.log(
    `[Patronus] Batch factual consistency: ${items.length} items`
  );

  const results: FactualConsistencyBatchResult["items"] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const result = await detectHallucinations({
      input: item.input,
      output: item.output,
      context: item.context,
      goldAnswer: item.goldAnswer,
      evaluators: ["factual-consistency"],
      capture,
      explainStrategy: "on-fail",
    });

    const fcResult = result.evaluatorResults.find(
      (r) => r.evaluator === "factual-consistency"
    );

    results.push({
      index: i,
      passed: fcResult?.passed ?? result.overallPassed,
      score: result.overallScore >= 0 ? result.overallScore : 0,
      explanation: fcResult?.explanation ?? null,
      issues: result.issues,
    });

    console.log(
      `[Patronus]   Item ${i}: ${results[i].passed ? "PASS" : "FAIL"} (${results[i].score}/100)`
    );
  }

  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.length - passCount;
  const avgScore =
    results.length > 0
      ? Math.round(
          results.reduce((s, r) => s + r.score, 0) / results.length
        )
      : 0;

  console.log(
    `[Patronus] Batch complete: ${passCount}/${results.length} passed, avg score: ${avgScore}/100`
  );

  return {
    items: results,
    passCount,
    failCount,
    avgScore,
    durationMs: Date.now() - start,
  };
}

// ─── Quick Check Helpers ────────────────────────────────────────────────────

/**
 * Quick hallucination check for a single claim.
 * Returns just pass/fail + score. Minimal overhead.
 */
async function quickCheck(
  claim: string,
  context: string[]
): Promise<{ passed: boolean; score: number }> {
  const result = await detectHallucinations({
    input: "Verify this claim.",
    output: claim,
    context,
    evaluators: ["hallucination"],
    capture: false,
    explainStrategy: "never",
  });

  return {
    passed: result.overallPassed,
    score: result.overallScore >= 0 ? result.overallScore : 0,
  };
}

/**
 * Check if a response contains PII that should be redacted.
 * Uses Patronus PII evaluator.
 */
async function checkPII(
  output: string
): Promise<{ hasPII: boolean; explanation: string | null }> {
  const result = await detectHallucinations({
    input: "Check for PII.",
    output,
    evaluators: ["pii"],
    capture: false,
    explainStrategy: "on-fail",
  });

  const piiResult = result.evaluatorResults.find(
    (r) => r.evaluator === "pii"
  );

  // PII evaluator: pass = no PII found, fail = PII detected
  return {
    hasPII: piiResult?.passed === false,
    explanation: piiResult?.explanation ?? null,
  };
}

/**
 * Check if a response contains toxic content.
 * Uses Patronus toxicity evaluator.
 */
async function checkToxicity(
  output: string
): Promise<{ isToxic: boolean; score: number; explanation: string | null }> {
  const result = await detectHallucinations({
    input: "Check for toxicity.",
    output,
    evaluators: ["toxicity"],
    capture: false,
    explainStrategy: "on-fail",
  });

  const toxResult = result.evaluatorResults.find(
    (r) => r.evaluator === "toxicity"
  );

  return {
    isToxic: toxResult?.passed === false,
    score: result.overallScore >= 0 ? result.overallScore : 0,
    explanation: toxResult?.explanation ?? null,
  };
}

// ─── Service Interface ──────────────────────────────────────────────────────

export interface PatronusService {
  /** Run full hallucination detection with multiple evaluators */
  detectHallucinations(
    check: HallucinationCheckInput
  ): Promise<HallucinationResult>;
  /** Score factual consistency for a single response */
  scoreFactualConsistency(
    input: string,
    output: string,
    context?: string[]
  ): Promise<{ passed: boolean; score: number; explanation: string | null }>;
  /** Score factual consistency for a batch of responses */
  scoreFactualConsistencyBatch(
    batchInput: FactualConsistencyBatchInput
  ): Promise<FactualConsistencyBatchResult>;
  /** Quick pass/fail hallucination check for a single claim */
  quickCheck(
    claim: string,
    context: string[]
  ): Promise<{ passed: boolean; score: number }>;
  /** Check for PII in a response */
  checkPII(
    output: string
  ): Promise<{ hasPII: boolean; explanation: string | null }>;
  /** Check for toxic content in a response */
  checkToxicity(
    output: string
  ): Promise<{ isToxic: boolean; score: number; explanation: string | null }>;
  /** Check if Patronus is available */
  isAvailable(): boolean;
}

// ─── Singleton Factory ──────────────────────────────────────────────────────

let patronusService: PatronusService | undefined;

/**
 * Get the Patronus hallucination detection service singleton.
 */
export function getPatronusService(): PatronusService {
  if (!patronusService) {
    patronusService = {
      detectHallucinations,
      scoreFactualConsistency,
      scoreFactualConsistencyBatch,
      quickCheck,
      checkPII,
      checkToxicity,
      isAvailable: isPatronusAvailable,
    };
  }

  return patronusService;
}
