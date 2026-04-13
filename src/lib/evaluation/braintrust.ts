/**
 * Braintrust Evals + Prompt Playground
 * Sprint 4.5 — Evaluation & Observability (Item 4)
 *
 * Integrates the Braintrust SDK for three key capabilities:
 *
 * 1. **Structured Eval Logging** — Log every Olivia evaluation (red-team,
 *    QA scorecard, bake-off) to Braintrust for tracking, comparison,
 *    and regression detection over time.
 *
 * 2. **Prompt Versioning** — Load, store, and version Olivia's prompts
 *    through Braintrust's prompt management system. Each prompt change
 *    is tracked with metadata so we can roll back if quality drops.
 *
 * 3. **A/B Prompt Experiments** — Run controlled experiments comparing
 *    prompt variants (e.g., "warmer Olivia" vs "more direct Olivia")
 *    on the same inputs, scored by the same criteria, with statistical
 *    comparison of results.
 *
 * All functions are NoOp-safe: if BRAINTRUST_API_KEY is missing, they
 * return sensible defaults without throwing. This lets the app run
 * in development without Braintrust configured.
 *
 * Usage:
 *   const service = getBraintrustService();
 *   await service.logEval({ ... });
 *   const experiment = await service.runPromptExperiment({ ... });
 *   const versions = await service.getPromptVersions("olivia-system");
 */

import * as braintrust from "braintrust";

import { getServerEnv } from "@/lib/config/env";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Evaluation types that can be logged to Braintrust. */
export type EvalType =
  | "red-team"
  | "qa-scorecard"
  | "model-bakeoff"
  | "hallucination"
  | "data-quality"
  | "ab-test"
  | "custom";

/** A single evaluation log entry sent to Braintrust. */
export interface EvalLogEntry {
  /** Which type of evaluation produced this result */
  evalType: EvalType;
  /** Input that was evaluated (prompt, conversation, dataset) */
  input: string;
  /** Output from the model being evaluated */
  output: string;
  /** Expected/ideal output (if available) */
  expected?: string;
  /** Scores — flexible record of metric names to 0-1 normalized values */
  scores: Record<string, number>;
  /** Additional metadata (model name, prompt version, etc.) */
  metadata?: Record<string, string | number | boolean>;
  /** Tags for filtering and grouping */
  tags?: string[];
}

/** Result of logging an eval to Braintrust. */
export interface EvalLogResult {
  /** Whether the log was successfully sent */
  success: boolean;
  /** Braintrust span/log ID (if successful) */
  id?: string;
  /** Error message (if failed) */
  error?: string;
}

/** A prompt variant for A/B testing. */
export interface PromptVariant {
  /** Unique variant identifier (e.g., "warm-v2", "direct-v1") */
  variantId: string;
  /** Human-readable label */
  label: string;
  /** The system prompt text */
  systemPrompt: string;
  /** The user prompt template (use {{input}} for variable substitution) */
  userPromptTemplate: string;
  /** Additional model parameters */
  temperature?: number;
  maxOutputTokens?: number;
}

/** Test case for a prompt experiment. */
export interface ExperimentTestCase {
  /** Unique test case ID */
  id: string;
  /** The user input to test */
  input: string;
  /** Expected/ideal output for scoring */
  expected?: string;
  /** Tags for categorization */
  tags?: string[];
}

/** Options for running a prompt experiment. */
export interface PromptExperimentOptions {
  /** Experiment name (shown in Braintrust dashboard) */
  experimentName: string;
  /** The prompt variants to compare */
  variants: PromptVariant[];
  /** Test cases to run through each variant */
  testCases: ExperimentTestCase[];
  /** Model function: takes (systemPrompt, userPrompt) → response */
  modelFn: (systemPrompt: string, userPrompt: string) => Promise<string>;
  /** Scoring function: takes (output, expected?) → scores record */
  scoreFn: (
    output: string,
    expected?: string
  ) => Promise<Record<string, number>>;
}

/** Result of one variant on one test case. */
export interface VariantTestResult {
  /** Which variant was used */
  variantId: string;
  /** Which test case was run */
  testCaseId: string;
  /** The model's output */
  output: string;
  /** Scores from the scoring function */
  scores: Record<string, number>;
  /** Latency in ms */
  latencyMs: number;
  /** Whether the call succeeded */
  success: boolean;
  /** Error if failed */
  error?: string;
}

/** Aggregate result for one variant across all test cases. */
export interface VariantSummary {
  /** Which variant */
  variantId: string;
  /** Variant label */
  label: string;
  /** Average score per metric */
  avgScores: Record<string, number>;
  /** Average latency */
  avgLatencyMs: number;
  /** Success count */
  successCount: number;
  /** Failure count */
  failureCount: number;
}

/** Full experiment report. */
export interface PromptExperimentReport {
  /** Experiment name */
  experimentName: string;
  /** When the experiment was run */
  timestamp: string;
  /** Number of variants tested */
  variantCount: number;
  /** Number of test cases */
  testCaseCount: number;
  /** Per-variant summaries, ranked by average overall score */
  variantSummaries: VariantSummary[];
  /** All individual results */
  results: VariantTestResult[];
  /** Winning variant ID (highest avg score) */
  winnerVariantId: string;
  /** Whether results were logged to Braintrust */
  loggedToBraintrust: boolean;
  /** Total duration in ms */
  durationMs: number;
}

/** Prompt version info from Braintrust. */
export interface PromptVersionInfo {
  /** Prompt slug/ID */
  promptId: string;
  /** Version identifier */
  version: string;
  /** The prompt content */
  content: string;
  /** When this version was created */
  createdAt: string;
  /** Metadata attached to this version */
  metadata: Record<string, string | number | boolean>;
}

// ─── Braintrust Client Initialization ───────────────────────────────────────

/** Whether Braintrust is available (API key present). */
function isBraintrustAvailable(): boolean {
  const env = getServerEnv();
  return typeof env.BRAINTRUST_API_KEY === "string" && env.BRAINTRUST_API_KEY.length > 0;
}

/** Project name used in Braintrust for all Olivia evals. */
const BT_PROJECT = "olivia-brain";

/** Initialize Braintrust login. Returns true if successful. */
async function ensureLoggedIn(): Promise<boolean> {
  if (!isBraintrustAvailable()) return false;

  try {
    const env = getServerEnv();
    await braintrust.login({ apiKey: env.BRAINTRUST_API_KEY });
    return true;
  } catch (error) {
    console.warn(
      `[Braintrust] Login failed: ${error instanceof Error ? error.message : "unknown"}`
    );
    return false;
  }
}

// ─── Eval Logging ───────────────────────────────────────────────────────────

/**
 * Log a single evaluation result to Braintrust.
 *
 * Sends the input/output/scores to Braintrust's logging API for
 * tracking and comparison over time. NoOp-safe if no API key.
 */
async function logEval(entry: EvalLogEntry): Promise<EvalLogResult> {
  if (!isBraintrustAvailable()) {
    return {
      success: false,
      error: "Braintrust API key not configured — eval logged locally only",
    };
  }

  try {
    const loggedIn = await ensureLoggedIn();
    if (!loggedIn) {
      return { success: false, error: "Braintrust login failed" };
    }

    const logger = braintrust.initLogger({
      projectName: BT_PROJECT,
      asyncFlush: true,
    });

    const logId = logger.log({
      input: entry.input,
      output: entry.output,
      expected: entry.expected,
      scores: entry.scores,
      metadata: {
        evalType: entry.evalType,
        ...entry.metadata,
      },
      tags: entry.tags,
    });

    await braintrust.flush();

    console.log(`[Braintrust] Logged eval (type: ${entry.evalType})`);

    return {
      success: true,
      id: typeof logId === "string" ? logId : undefined,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    console.warn(`[Braintrust] Log failed: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Log a batch of evaluation results to Braintrust.
 * More efficient than calling logEval() in a loop — uses a single flush.
 */
async function logEvalBatch(
  entries: EvalLogEntry[]
): Promise<{ successCount: number; failureCount: number }> {
  if (!isBraintrustAvailable() || entries.length === 0) {
    return { successCount: 0, failureCount: entries.length };
  }

  try {
    const loggedIn = await ensureLoggedIn();
    if (!loggedIn) {
      return { successCount: 0, failureCount: entries.length };
    }

    const logger = braintrust.initLogger({
      projectName: BT_PROJECT,
      asyncFlush: true,
    });

    let successCount = 0;

    for (const entry of entries) {
      try {
        logger.log({
          input: entry.input,
          output: entry.output,
          expected: entry.expected,
          scores: entry.scores,
          metadata: {
            evalType: entry.evalType,
            ...entry.metadata,
          },
          tags: entry.tags,
        });
        successCount++;
      } catch {
        // Individual entry failed — continue with rest
      }
    }

    await braintrust.flush();

    console.log(
      `[Braintrust] Batch logged ${successCount}/${entries.length} evals`
    );

    return {
      successCount,
      failureCount: entries.length - successCount,
    };
  } catch (error) {
    console.warn(
      `[Braintrust] Batch log failed: ${error instanceof Error ? error.message : "unknown"}`
    );
    return { successCount: 0, failureCount: entries.length };
  }
}

// ─── Prompt Versioning ──────────────────────────────────────────────────────

/**
 * Get all versions of a named prompt from Braintrust.
 *
 * Retrieves the version history for a prompt slug, showing how
 * the prompt has evolved over time.
 */
async function getPromptVersions(
  promptSlug: string
): Promise<PromptVersionInfo[]> {
  if (!isBraintrustAvailable()) {
    console.log(
      `[Braintrust] Not available — returning empty prompt versions for "${promptSlug}"`
    );
    return [];
  }

  try {
    const loggedIn = await ensureLoggedIn();
    if (!loggedIn) return [];

    const versions = await braintrust.getPromptVersions(
      BT_PROJECT,
      promptSlug
    );

    const result: PromptVersionInfo[] = [];

    for (const version of versions) {
      const v = version as Record<string, unknown>;
      result.push({
        promptId: promptSlug,
        version: String(v.version ?? "unknown"),
        content: JSON.stringify(v.prompt ?? {}),
        createdAt: String(v.created ?? new Date().toISOString()),
        metadata: (v.metadata ?? {}) as Record<
          string,
          string | number | boolean
        >,
      });
    }

    console.log(
      `[Braintrust] Found ${result.length} versions for prompt "${promptSlug}"`
    );

    return result;
  } catch (error) {
    console.warn(
      `[Braintrust] getPromptVersions failed: ${error instanceof Error ? error.message : "unknown"}`
    );
    return [];
  }
}

/**
 * Load the latest version of a prompt from Braintrust.
 * Returns null if not found or Braintrust unavailable.
 */
async function loadPrompt(
  promptSlug: string
): Promise<PromptVersionInfo | null> {
  if (!isBraintrustAvailable()) return null;

  try {
    const loggedIn = await ensureLoggedIn();
    if (!loggedIn) return null;

    const prompt = await braintrust.loadPrompt({
      projectName: BT_PROJECT,
      slug: promptSlug,
    });

    if (!prompt) return null;

    // Access prompt data through the prompt property
    const promptData = prompt.prompt ?? {};

    return {
      promptId: promptSlug,
      version: String(prompt.version ?? "latest"),
      content: JSON.stringify(promptData),
      createdAt: new Date().toISOString(),
      metadata: {},
    };
  } catch (error) {
    console.warn(
      `[Braintrust] loadPrompt failed: ${error instanceof Error ? error.message : "unknown"}`
    );
    return null;
  }
}

// ─── A/B Prompt Experiments ─────────────────────────────────────────────────

/**
 * Run an A/B experiment comparing prompt variants.
 *
 * Process:
 * 1. For each variant × test case combination:
 *    a. Substitute {{input}} in the user prompt template
 *    b. Call the model function
 *    c. Score the output
 * 2. Aggregate scores per variant
 * 3. Rank variants by average score
 * 4. Log all results to Braintrust (if available)
 * 5. Return full experiment report
 */
async function runPromptExperiment(
  options: PromptExperimentOptions
): Promise<PromptExperimentReport> {
  const start = Date.now();
  const {
    experimentName,
    variants,
    testCases,
    modelFn,
    scoreFn,
  } = options;

  console.log(
    `[Braintrust] Starting experiment "${experimentName}": ${variants.length} variants × ${testCases.length} test cases`
  );

  const results: VariantTestResult[] = [];

  for (const variant of variants) {
    for (const testCase of testCases) {
      const userPrompt = variant.userPromptTemplate.replace(
        /\{\{input\}\}/g,
        testCase.input
      );

      const callStart = Date.now();
      let result: VariantTestResult;

      try {
        const output = await modelFn(variant.systemPrompt, userPrompt);
        const scores = await scoreFn(output, testCase.expected);

        result = {
          variantId: variant.variantId,
          testCaseId: testCase.id,
          output,
          scores,
          latencyMs: Date.now() - callStart,
          success: true,
        };
      } catch (error) {
        result = {
          variantId: variant.variantId,
          testCaseId: testCase.id,
          output: "",
          scores: {},
          latencyMs: Date.now() - callStart,
          success: false,
          error: error instanceof Error ? error.message : "unknown",
        };
      }

      results.push(result);

      console.log(
        `[Braintrust]   ${variant.variantId} × ${testCase.id}: ${result.success ? "OK" : "FAIL"}`
      );
    }
  }

  // ── Aggregate per variant ───────────────────────────────────────────────

  const variantSummaries: VariantSummary[] = [];

  for (const variant of variants) {
    const variantResults = results.filter(
      (r) => r.variantId === variant.variantId
    );
    const successes = variantResults.filter((r) => r.success);

    // Collect all metric names
    const allMetrics = new Set<string>();
    for (const r of successes) {
      for (const key of Object.keys(r.scores)) {
        allMetrics.add(key);
      }
    }

    // Average per metric
    const avgScores: Record<string, number> = {};
    for (const metric of allMetrics) {
      const values = successes
        .map((r) => r.scores[metric])
        .filter((v): v is number => v !== undefined);
      avgScores[metric] =
        values.length > 0
          ? Math.round(
              (values.reduce((a, b) => a + b, 0) / values.length) * 100
            ) / 100
          : 0;
    }

    const avgLatencyMs =
      successes.length > 0
        ? Math.round(
            successes.reduce((s, r) => s + r.latencyMs, 0) / successes.length
          )
        : 0;

    variantSummaries.push({
      variantId: variant.variantId,
      label: variant.label,
      avgScores,
      avgLatencyMs,
      successCount: successes.length,
      failureCount: variantResults.length - successes.length,
    });
  }

  // Rank by average overall score (mean of all metrics)
  variantSummaries.sort((a, b) => {
    const aOverall = meanOfValues(a.avgScores);
    const bOverall = meanOfValues(b.avgScores);
    return bOverall - aOverall;
  });

  const winnerVariantId = variantSummaries[0]?.variantId ?? "none";

  // ── Log to Braintrust ───────────────────────────────────────────────────

  let loggedToBraintrust = false;

  if (isBraintrustAvailable()) {
    const entries: EvalLogEntry[] = results.map((r) => ({
      evalType: "ab-test" as EvalType,
      input: testCases.find((tc) => tc.id === r.testCaseId)?.input ?? "",
      output: r.output,
      expected: testCases.find((tc) => tc.id === r.testCaseId)?.expected,
      scores: r.scores,
      metadata: {
        experimentName,
        variantId: r.variantId,
        testCaseId: r.testCaseId,
        latencyMs: r.latencyMs,
      },
      tags: ["ab-test", experimentName, r.variantId],
    }));

    const batchResult = await logEvalBatch(entries);
    loggedToBraintrust = batchResult.successCount > 0;
  }

  const report: PromptExperimentReport = {
    experimentName,
    timestamp: new Date().toISOString(),
    variantCount: variants.length,
    testCaseCount: testCases.length,
    variantSummaries,
    results,
    winnerVariantId,
    loggedToBraintrust,
    durationMs: Date.now() - start,
  };

  console.log(
    `[Braintrust] Experiment "${experimentName}" complete: winner=${winnerVariantId} in ${report.durationMs}ms (logged: ${loggedToBraintrust})`
  );

  return report;
}

/** Compute the mean of all values in a record. */
function meanOfValues(record: Record<string, number>): number {
  const values = Object.values(record);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ─── Built-In Olivia Prompt Variants ────────────────────────────────────────

/**
 * Returns a set of Olivia personality variants for A/B testing.
 * These vary warmth, directness, and formality while keeping core
 * persona traits constant.
 */
export function getOliviaPromptVariants(): PromptVariant[] {
  return [
    {
      variantId: "olivia-baseline",
      label: "Olivia Baseline",
      systemPrompt:
        "You are Olivia, a warm and professional relocation advisor. You help clients evaluate cities, navigate international moves, and make data-driven decisions about where to live. You maintain a professional yet empathetic tone.",
      userPromptTemplate: "{{input}}",
      temperature: 0.3,
      maxOutputTokens: 600,
    },
    {
      variantId: "olivia-warmer",
      label: "Olivia Warmer",
      systemPrompt:
        "You are Olivia, a deeply empathetic and supportive relocation advisor. You treat every client like a close friend going through a major life change. You lead with emotional connection before practical advice. You use warm, conversational language and frequently validate feelings.",
      userPromptTemplate: "{{input}}",
      temperature: 0.4,
      maxOutputTokens: 600,
    },
    {
      variantId: "olivia-direct",
      label: "Olivia Direct",
      systemPrompt:
        "You are Olivia, a no-nonsense relocation advisor who values your client's time. You lead with data and concrete recommendations. You're friendly but efficient — you skip pleasantries when the client clearly wants answers. You give clear opinions backed by facts.",
      userPromptTemplate: "{{input}}",
      temperature: 0.2,
      maxOutputTokens: 600,
    },
    {
      variantId: "olivia-expert",
      label: "Olivia Expert Authority",
      systemPrompt:
        "You are Olivia, an elite relocation strategist with deep expertise in global mobility. You speak with confident authority, citing specific data and trends. You proactively identify risks and opportunities the client hasn't considered. You structure advice with clear frameworks and decision matrices.",
      userPromptTemplate: "{{input}}",
      temperature: 0.25,
      maxOutputTokens: 700,
    },
  ];
}

// ─── Service Interface ──────────────────────────────────────────────────────

export interface BraintrustService {
  /** Log a single evaluation result to Braintrust */
  logEval(entry: EvalLogEntry): Promise<EvalLogResult>;
  /** Log a batch of evaluation results to Braintrust */
  logEvalBatch(
    entries: EvalLogEntry[]
  ): Promise<{ successCount: number; failureCount: number }>;
  /** Run an A/B prompt experiment */
  runPromptExperiment(
    options: PromptExperimentOptions
  ): Promise<PromptExperimentReport>;
  /** Get all versions of a named prompt */
  getPromptVersions(promptSlug: string): Promise<PromptVersionInfo[]>;
  /** Load the latest version of a prompt */
  loadPrompt(promptSlug: string): Promise<PromptVersionInfo | null>;
  /** Get built-in Olivia prompt variants for A/B testing */
  getOliviaPromptVariants(): PromptVariant[];
  /** Check if Braintrust is available */
  isAvailable(): boolean;
}

// ─── Singleton Factory ──────────────────────────────────────────────────────

let braintrustService: BraintrustService | undefined;

/**
 * Get the Braintrust evaluation service singleton.
 */
export function getBraintrustService(): BraintrustService {
  if (!braintrustService) {
    braintrustService = {
      logEval,
      logEvalBatch,
      runPromptExperiment,
      getPromptVersions,
      loadPrompt,
      getOliviaPromptVariants,
      isAvailable: isBraintrustAvailable,
    };
  }

  return braintrustService;
}
