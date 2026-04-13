/**
 * A/B Test Avatar Personalities
 * Sprint 4.5 — Evaluation & Observability (Item 7)
 *
 * Framework for A/B testing Olivia's personality parameters and
 * measuring their impact on conversation quality. Enables data-driven
 * tuning of Olivia's persona across dimensions like:
 *
 * - **Warmth** — How emotionally supportive vs matter-of-fact
 * - **Assertiveness** — How strongly she pushes recommendations
 * - **Humor** — Whether she uses light humor to build rapport
 * - **Formality** — Professional register vs conversational casual
 * - **Detail level** — Comprehensive deep-dives vs concise summaries
 * - **Proactivity** — How much she volunteers info vs waits for questions
 *
 * The framework supports:
 * 1. Creating experiments with named variants
 * 2. Deterministic user-variant assignment (consistent per user)
 * 3. Recording conversation outcomes (quality scores, user satisfaction)
 * 4. Statistical comparison of variants (mean, std dev, significance)
 *
 * All state is held in-memory (no DB dependency). For persistence,
 * results can be exported and logged to Braintrust via the eval module.
 *
 * Usage:
 *   const service = getAvatarABTestService();
 *   const exp = service.createExperiment({
 *     name: "warmth-high-vs-low",
 *     variants: [warmVariant, neutralVariant],
 *   });
 *   const variant = service.assignVariant(exp.experimentId, "user-123");
 *   // ... run conversation with variant's personality ...
 *   service.recordOutcome(exp.experimentId, "user-123", { qualityScore: 85 });
 *   const results = service.getExperimentResults(exp.experimentId);
 */

import { getServerEnv } from "@/lib/config/env";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Personality dimensions that can be tuned for Olivia. */
export type PersonalityDimension =
  | "warmth"
  | "assertiveness"
  | "humor"
  | "formality"
  | "detail-level"
  | "proactivity"
  | "empathy"
  | "directness";

/**
 * A personality configuration — a specific combination of dimension
 * values that defines how Olivia behaves in conversations.
 */
export interface PersonalityVariant {
  /** Unique variant identifier (e.g., "warm-assertive-v1") */
  variantId: string;
  /** Human-readable label */
  label: string;
  /** Personality dimension values (0-100 scale per dimension) */
  dimensions: Partial<Record<PersonalityDimension, number>>;
  /** The system prompt that implements this personality */
  systemPrompt: string;
  /** Optional model temperature override */
  temperature?: number;
  /** Traffic allocation weight (default: 1 = equal split) */
  weight?: number;
}

/** Configuration for creating a new A/B experiment. */
export interface ABTestConfig {
  /** Experiment name (human-readable) */
  name: string;
  /** Description of what's being tested */
  description: string;
  /** The personality variants to compare */
  variants: PersonalityVariant[];
  /** Minimum conversations per variant before results are meaningful */
  minSampleSize?: number;
  /** When this experiment was created */
  startDate?: string;
  /** When to stop enrolling new users (ISO date) */
  endDate?: string;
}

/** An outcome recorded for one user in one experiment. */
export interface ConversationOutcome {
  /** User identifier */
  userId: string;
  /** Which variant the user was assigned */
  variantId: string;
  /** Overall quality score (0-100, from QA scorecards or manual) */
  qualityScore?: number;
  /** User satisfaction rating (1-5 scale, if collected) */
  satisfactionRating?: number;
  /** Whether the user completed their stated goal */
  taskCompleted?: boolean;
  /** Conversation length in turns */
  turnCount?: number;
  /** Conversation duration in seconds */
  durationSeconds?: number;
  /** Whether the user returned for another conversation */
  returnVisit?: boolean;
  /** Any custom metrics */
  customMetrics?: Record<string, number>;
  /** When this outcome was recorded */
  timestamp: string;
}

/** A running experiment with all its state. */
export interface ABExperiment {
  /** Unique experiment ID */
  experimentId: string;
  /** Configuration */
  config: ABTestConfig;
  /** User → variant assignment map */
  assignments: Map<string, string>;
  /** All recorded outcomes */
  outcomes: ConversationOutcome[];
  /** Current status */
  status: "active" | "paused" | "completed";
  /** When created */
  createdAt: string;
}

/** Statistical summary for one variant in an experiment. */
export interface VariantStats {
  /** Which variant */
  variantId: string;
  /** Variant label */
  label: string;
  /** Number of users assigned */
  assignmentCount: number;
  /** Number of outcomes recorded */
  outcomeCount: number;
  /** Average quality score */
  avgQualityScore: number | null;
  /** Standard deviation of quality scores */
  stdQualityScore: number | null;
  /** Average satisfaction rating */
  avgSatisfactionRating: number | null;
  /** Task completion rate (0-100%) */
  taskCompletionRate: number | null;
  /** Average turn count */
  avgTurnCount: number | null;
  /** Average conversation duration in seconds */
  avgDurationSeconds: number | null;
  /** Return visit rate (0-100%) */
  returnVisitRate: number | null;
  /** Custom metric averages */
  customMetricAverages: Record<string, number>;
}

/** Full experiment results with statistical comparison. */
export interface ABTestResults {
  /** Experiment ID */
  experimentId: string;
  /** Experiment name */
  experimentName: string;
  /** Per-variant statistics */
  variantStats: VariantStats[];
  /** Which variant is currently winning (by quality score) */
  leadingVariantId: string | null;
  /** Confidence that the difference is real (0-1, crude Z-test) */
  statisticalConfidence: number | null;
  /** Whether we have enough data (minSampleSize met for all variants) */
  sufficientData: boolean;
  /** Total outcomes recorded */
  totalOutcomes: number;
  /** Experiment status */
  status: "active" | "paused" | "completed";
}

// ─── In-Memory Store ────────────────────────────────────────────────────────

/** All active experiments, keyed by experiment ID. */
const experiments = new Map<string, ABExperiment>();

// ─── Deterministic Assignment ───────────────────────────────────────────────

/**
 * Simple deterministic hash for user → variant assignment.
 * Same user always gets the same variant within an experiment.
 * Uses FNV-1a hash for speed and good distribution.
 */
function hashAssign(
  userId: string,
  experimentId: string,
  variantCount: number
): number {
  const input = `${experimentId}:${userId}`;
  let hash = 2166136261; // FNV offset basis

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0; // FNV prime, keep as uint32
  }

  return hash % variantCount;
}

/**
 * Weighted random assignment respecting variant weights.
 * Deterministic for a given user+experiment pair.
 */
function weightedAssign(
  userId: string,
  experimentId: string,
  variants: PersonalityVariant[]
): string {
  const totalWeight = variants.reduce(
    (sum, v) => sum + (v.weight ?? 1),
    0
  );

  // Use hash to get a deterministic position in [0, totalWeight)
  const hashValue = hashAssign(userId, experimentId, 10000);
  const position = (hashValue / 10000) * totalWeight;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight ?? 1;
    if (position < cumulative) {
      return variant.variantId;
    }
  }

  // Fallback: last variant
  return variants[variants.length - 1].variantId;
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Create a new A/B experiment.
 *
 * Sets up the experiment with its variants and begins accepting
 * user assignments. Returns the experiment object with its generated ID.
 */
function createExperiment(config: ABTestConfig): ABExperiment {
  const experimentId = `ab-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const experiment: ABExperiment = {
    experimentId,
    config: {
      ...config,
      minSampleSize: config.minSampleSize ?? 30,
      startDate: config.startDate ?? new Date().toISOString(),
    },
    assignments: new Map(),
    outcomes: [],
    status: "active",
    createdAt: new Date().toISOString(),
  };

  experiments.set(experimentId, experiment);

  console.log(
    `[AB Avatar] Created experiment "${config.name}" (${experimentId}) with ${config.variants.length} variants`
  );

  return experiment;
}

/**
 * Assign a user to a variant in an experiment.
 *
 * Assignment is deterministic: same user always gets the same variant.
 * Returns the full PersonalityVariant so the caller can use its
 * systemPrompt and dimensions immediately.
 *
 * Returns null if the experiment doesn't exist or is not active.
 */
function assignVariant(
  experimentId: string,
  userId: string
): PersonalityVariant | null {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== "active") {
    console.warn(
      `[AB Avatar] Experiment ${experimentId} not found or not active`
    );
    return null;
  }

  // Check if already assigned
  const existingAssignment = experiment.assignments.get(userId);
  if (existingAssignment) {
    const variant = experiment.config.variants.find(
      (v) => v.variantId === existingAssignment
    );
    return variant ?? null;
  }

  // New assignment
  const variantId = weightedAssign(
    userId,
    experimentId,
    experiment.config.variants
  );

  experiment.assignments.set(userId, variantId);

  const variant = experiment.config.variants.find(
    (v) => v.variantId === variantId
  );

  console.log(
    `[AB Avatar] Assigned user ${userId} → variant "${variantId}" in experiment ${experimentId}`
  );

  return variant ?? null;
}

/**
 * Record the outcome of a conversation for a user in an experiment.
 *
 * The outcome captures quality metrics that will be used to compare
 * variants statistically. Call this after each conversation ends.
 */
function recordOutcome(
  experimentId: string,
  userId: string,
  outcome: Omit<ConversationOutcome, "userId" | "variantId" | "timestamp">
): boolean {
  const experiment = experiments.get(experimentId);
  if (!experiment) {
    console.warn(`[AB Avatar] Experiment ${experimentId} not found`);
    return false;
  }

  const variantId = experiment.assignments.get(userId);
  if (!variantId) {
    console.warn(
      `[AB Avatar] User ${userId} not assigned in experiment ${experimentId}`
    );
    return false;
  }

  const fullOutcome: ConversationOutcome = {
    ...outcome,
    userId,
    variantId,
    timestamp: new Date().toISOString(),
  };

  experiment.outcomes.push(fullOutcome);

  console.log(
    `[AB Avatar] Recorded outcome for user ${userId} (variant: ${variantId}, quality: ${outcome.qualityScore ?? "N/A"})`
  );

  return true;
}

// ─── Statistical Analysis ───────────────────────────────────────────────────

/** Calculate mean of a number array. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Calculate standard deviation of a number array. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squareDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Crude two-sample Z-test for comparing two variant means.
 * Returns a confidence level (0-1) that the difference is real.
 * This is approximate — for production use, consider a proper stats library.
 */
function zTestConfidence(
  meanA: number,
  stdA: number,
  nA: number,
  meanB: number,
  stdB: number,
  nB: number
): number {
  if (nA < 2 || nB < 2 || (stdA === 0 && stdB === 0)) return 0;

  const se = Math.sqrt((stdA ** 2) / nA + (stdB ** 2) / nB);
  if (se === 0) return 0;

  const z = Math.abs(meanA - meanB) / se;

  // Approximate p-value from Z-score using the complementary error function
  // confidence = 1 - p_value
  // Using a simple approximation: P(Z > z) ≈ e^(-z²/2) / (z * √(2π))
  if (z < 0.01) return 0;
  if (z > 4) return 0.999;

  // Simple lookup for common Z thresholds
  if (z >= 2.576) return 0.99;
  if (z >= 1.96) return 0.95;
  if (z >= 1.645) return 0.9;
  if (z >= 1.282) return 0.8;
  if (z >= 0.842) return 0.6;

  return Math.min(0.5, z * 0.3);
}

/**
 * Get the full results and statistical comparison for an experiment.
 *
 * Computes per-variant statistics, identifies the leading variant,
 * and calculates a crude confidence level for the observed difference.
 */
function getExperimentResults(experimentId: string): ABTestResults | null {
  const experiment = experiments.get(experimentId);
  if (!experiment) {
    console.warn(`[AB Avatar] Experiment ${experimentId} not found`);
    return null;
  }

  const variantStats: VariantStats[] = [];

  for (const variant of experiment.config.variants) {
    const variantOutcomes = experiment.outcomes.filter(
      (o) => o.variantId === variant.variantId
    );
    const assignmentCount = [...experiment.assignments.values()].filter(
      (v) => v === variant.variantId
    ).length;

    // Quality scores
    const qualityScores = variantOutcomes
      .map((o) => o.qualityScore)
      .filter((s): s is number => s !== undefined);

    // Satisfaction ratings
    const satRatings = variantOutcomes
      .map((o) => o.satisfactionRating)
      .filter((s): s is number => s !== undefined);

    // Task completion
    const taskOutcomes = variantOutcomes.filter(
      (o) => o.taskCompleted !== undefined
    );
    const taskCompletionRate =
      taskOutcomes.length > 0
        ? Math.round(
            (taskOutcomes.filter((o) => o.taskCompleted).length /
              taskOutcomes.length) *
              100
          )
        : null;

    // Turn counts
    const turnCounts = variantOutcomes
      .map((o) => o.turnCount)
      .filter((t): t is number => t !== undefined);

    // Duration
    const durations = variantOutcomes
      .map((o) => o.durationSeconds)
      .filter((d): d is number => d !== undefined);

    // Return visits
    const returnOutcomes = variantOutcomes.filter(
      (o) => o.returnVisit !== undefined
    );
    const returnVisitRate =
      returnOutcomes.length > 0
        ? Math.round(
            (returnOutcomes.filter((o) => o.returnVisit).length /
              returnOutcomes.length) *
              100
          )
        : null;

    // Custom metrics
    const customMetricAverages: Record<string, number> = {};
    const allCustomKeys = new Set<string>();
    for (const o of variantOutcomes) {
      if (o.customMetrics) {
        for (const key of Object.keys(o.customMetrics)) {
          allCustomKeys.add(key);
        }
      }
    }
    for (const key of allCustomKeys) {
      const values = variantOutcomes
        .map((o) => o.customMetrics?.[key])
        .filter((v): v is number => v !== undefined);
      if (values.length > 0) {
        customMetricAverages[key] = Math.round(mean(values) * 100) / 100;
      }
    }

    variantStats.push({
      variantId: variant.variantId,
      label: variant.label,
      assignmentCount,
      outcomeCount: variantOutcomes.length,
      avgQualityScore:
        qualityScores.length > 0
          ? Math.round(mean(qualityScores) * 10) / 10
          : null,
      stdQualityScore:
        qualityScores.length > 1
          ? Math.round(stdDev(qualityScores) * 10) / 10
          : null,
      avgSatisfactionRating:
        satRatings.length > 0
          ? Math.round(mean(satRatings) * 10) / 10
          : null,
      taskCompletionRate,
      avgTurnCount:
        turnCounts.length > 0
          ? Math.round(mean(turnCounts) * 10) / 10
          : null,
      avgDurationSeconds:
        durations.length > 0
          ? Math.round(mean(durations))
          : null,
      returnVisitRate,
      customMetricAverages,
    });
  }

  // Find leading variant (by quality score)
  const variantsWithScores = variantStats.filter(
    (v) => v.avgQualityScore !== null
  );
  const leadingVariant =
    variantsWithScores.length > 0
      ? variantsWithScores.sort(
          (a, b) => (b.avgQualityScore ?? 0) - (a.avgQualityScore ?? 0)
        )[0]
      : null;

  // Statistical confidence (compare top 2 variants if both have data)
  let statisticalConfidence: number | null = null;

  if (variantsWithScores.length >= 2) {
    const sorted = [...variantsWithScores].sort(
      (a, b) => (b.avgQualityScore ?? 0) - (a.avgQualityScore ?? 0)
    );
    const top = sorted[0];
    const second = sorted[1];

    if (
      top.avgQualityScore !== null &&
      top.stdQualityScore !== null &&
      second.avgQualityScore !== null &&
      second.stdQualityScore !== null &&
      top.outcomeCount >= 2 &&
      second.outcomeCount >= 2
    ) {
      statisticalConfidence = zTestConfidence(
        top.avgQualityScore,
        top.stdQualityScore,
        top.outcomeCount,
        second.avgQualityScore,
        second.stdQualityScore,
        second.outcomeCount
      );
    }
  }

  // Sufficient data check
  const minSampleSize = experiment.config.minSampleSize ?? 30;
  const sufficientData = variantStats.every(
    (v) => v.outcomeCount >= minSampleSize
  );

  const results: ABTestResults = {
    experimentId,
    experimentName: experiment.config.name,
    variantStats,
    leadingVariantId: leadingVariant?.variantId ?? null,
    statisticalConfidence,
    sufficientData,
    totalOutcomes: experiment.outcomes.length,
    status: experiment.status,
  };

  console.log(
    `[AB Avatar] Results for "${experiment.config.name}": leader=${results.leadingVariantId ?? "N/A"}, confidence=${statisticalConfidence?.toFixed(2) ?? "N/A"}, sufficient=${sufficientData}`
  );

  return results;
}

// ─── Experiment Management ──────────────────────────────────────────────────

/** Pause an active experiment (stops new assignments). */
function pauseExperiment(experimentId: string): boolean {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== "active") return false;
  experiment.status = "paused";
  console.log(`[AB Avatar] Paused experiment ${experimentId}`);
  return true;
}

/** Resume a paused experiment. */
function resumeExperiment(experimentId: string): boolean {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== "paused") return false;
  experiment.status = "active";
  console.log(`[AB Avatar] Resumed experiment ${experimentId}`);
  return true;
}

/** Complete an experiment (no more assignments or outcomes). */
function completeExperiment(experimentId: string): boolean {
  const experiment = experiments.get(experimentId);
  if (!experiment) return false;
  experiment.status = "completed";
  console.log(`[AB Avatar] Completed experiment ${experimentId}`);
  return true;
}

/** List all experiments. */
function listExperiments(): Array<{
  experimentId: string;
  name: string;
  status: string;
  variantCount: number;
  outcomeCount: number;
}> {
  return [...experiments.values()].map((e) => ({
    experimentId: e.experimentId,
    name: e.config.name,
    status: e.status,
    variantCount: e.config.variants.length,
    outcomeCount: e.outcomes.length,
  }));
}

/** Get an experiment by ID. */
function getExperiment(experimentId: string): ABExperiment | null {
  return experiments.get(experimentId) ?? null;
}

// ─── Built-In Personality Variants ──────────────────────────────────────────

/**
 * Returns a set of pre-built Olivia personality variants for common
 * A/B tests. These cover the most impactful personality dimensions.
 */
export function getBuiltInPersonalityVariants(): PersonalityVariant[] {
  return [
    {
      variantId: "olivia-balanced",
      label: "Balanced (Control)",
      dimensions: {
        warmth: 65,
        assertiveness: 50,
        humor: 30,
        formality: 60,
        "detail-level": 65,
        proactivity: 55,
        empathy: 70,
        directness: 50,
      },
      systemPrompt:
        "You are Olivia, a professional and empathetic relocation advisor. You balance warmth with efficiency, providing thorough analysis while remaining personable. You recommend licensed professionals for legal and tax matters.",
      temperature: 0.3,
      weight: 1,
    },
    {
      variantId: "olivia-high-warmth",
      label: "High Warmth",
      dimensions: {
        warmth: 90,
        assertiveness: 40,
        humor: 45,
        formality: 40,
        "detail-level": 60,
        proactivity: 60,
        empathy: 95,
        directness: 35,
      },
      systemPrompt:
        "You are Olivia, a deeply caring relocation advisor who treats every client like a close friend. You lead with emotional connection and validate feelings before diving into data. You use warm, conversational language and light humor to build rapport. Moving is one of life's biggest stressors — you make it feel manageable.",
      temperature: 0.4,
      weight: 1,
    },
    {
      variantId: "olivia-high-assertiveness",
      label: "High Assertiveness",
      dimensions: {
        warmth: 55,
        assertiveness: 90,
        humor: 20,
        formality: 70,
        "detail-level": 75,
        proactivity: 85,
        empathy: 50,
        directness: 85,
      },
      systemPrompt:
        "You are Olivia, a confident and decisive relocation strategist. You give clear, strong recommendations backed by data. You don't hedge excessively — when the data points in a direction, you say so. You proactively flag risks and opportunities the client hasn't considered. You respect the client's time by being efficient and direct.",
      temperature: 0.2,
      weight: 1,
    },
    {
      variantId: "olivia-high-detail",
      label: "High Detail",
      dimensions: {
        warmth: 60,
        assertiveness: 55,
        humor: 15,
        formality: 75,
        "detail-level": 95,
        proactivity: 70,
        empathy: 55,
        directness: 60,
      },
      systemPrompt:
        "You are Olivia, a meticulous relocation advisor who leaves no stone unturned. You provide comprehensive analysis with specific numbers, comparisons, and sourced data. You structure your advice with clear frameworks, decision matrices, and step-by-step plans. You anticipate follow-up questions and address them proactively.",
      temperature: 0.25,
      weight: 1,
    },
    {
      variantId: "olivia-casual-humor",
      label: "Casual with Humor",
      dimensions: {
        warmth: 75,
        assertiveness: 45,
        humor: 80,
        formality: 25,
        "detail-level": 55,
        proactivity: 50,
        empathy: 65,
        directness: 60,
      },
      systemPrompt:
        "You are Olivia, a relocation advisor who makes the stressful process of moving actually enjoyable. You use light humor and relatable observations to keep things fun while still delivering solid advice. You're like the friend who happens to know everything about moving — casual, funny, but secretly an expert.",
      temperature: 0.45,
      weight: 1,
    },
  ];
}

// ─── Service Interface ──────────────────────────────────────────────────────

export interface AvatarABTestService {
  /** Create a new A/B experiment */
  createExperiment(config: ABTestConfig): ABExperiment;
  /** Assign a user to a variant (deterministic) */
  assignVariant(
    experimentId: string,
    userId: string
  ): PersonalityVariant | null;
  /** Record a conversation outcome */
  recordOutcome(
    experimentId: string,
    userId: string,
    outcome: Omit<ConversationOutcome, "userId" | "variantId" | "timestamp">
  ): boolean;
  /** Get statistical results for an experiment */
  getExperimentResults(experimentId: string): ABTestResults | null;
  /** Get an experiment by ID */
  getExperiment(experimentId: string): ABExperiment | null;
  /** List all experiments */
  listExperiments(): Array<{
    experimentId: string;
    name: string;
    status: string;
    variantCount: number;
    outcomeCount: number;
  }>;
  /** Pause an experiment */
  pauseExperiment(experimentId: string): boolean;
  /** Resume a paused experiment */
  resumeExperiment(experimentId: string): boolean;
  /** Complete an experiment */
  completeExperiment(experimentId: string): boolean;
  /** Get built-in personality variants */
  getBuiltInVariants(): PersonalityVariant[];
}

// ─── Singleton Factory ──────────────────────────────────────────────────────

let avatarABTestService: AvatarABTestService | undefined;

/**
 * Get the avatar A/B test service singleton.
 */
export function getAvatarABTestService(): AvatarABTestService {
  if (!avatarABTestService) {
    avatarABTestService = {
      createExperiment,
      assignVariant,
      recordOutcome,
      getExperimentResults,
      getExperiment,
      listExperiments,
      pauseExperiment,
      resumeExperiment,
      completeExperiment,
      getBuiltInVariants: getBuiltInPersonalityVariants,
    };
  }

  return avatarABTestService;
}
