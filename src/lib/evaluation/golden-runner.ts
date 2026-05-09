/**
 * `golden-runner` — execute GOLDEN_CASES against the cascade and
 * score them.
 *
 * Pure orchestration — no IO except via the cascade. Returns a
 * structured report the route layer or test runner can render.
 */

import { runModelCascade } from "@/lib/services/model-cascade";
import { detectSpokeFromMessage } from "@/lib/orchestration/spoke-router";
import { inferIntent } from "@/lib/orchestration/intent";
import {
  GOLDEN_CASES,
  type GoldenCase,
  type ManifestFence,
} from "./golden-cases";

export interface CaseResult {
  caseId: string;
  label: string;
  passed: boolean;
  /** Per-criterion pass/fail map for diagnostic readability. */
  checks: {
    spoke?: { expected: readonly string[]; actual: string; passed: boolean };
    manifests?: {
      expected: readonly ManifestFence[];
      actual: ManifestFence[];
      passed: boolean;
    };
    mustContain?: {
      expected: readonly string[];
      missing: string[];
      passed: boolean;
    };
    mustNotContain?: {
      expected: readonly string[];
      hit: string[];
      passed: boolean;
    };
    duration?: { ms: number; max: number; passed: boolean };
  };
  cascadeText: string;
  durationMs: number;
  providerId: string;
  modelId: string;
  runtimeMode: string;
  error?: string;
}

export interface GoldenReport {
  startedAt: string;
  finishedAt: string;
  totalMs: number;
  passed: number;
  failed: number;
  total: number;
  results: CaseResult[];
}

const FENCE_PATTERNS: Record<ManifestFence, RegExp> = {
  chart: /```chart\b/i,
  timeline: /```timeline\b/i,
  sources: /```sources\b/i,
  gamma: /```gamma\b/i,
};

function detectManifests(text: string): ManifestFence[] {
  const out: ManifestFence[] = [];
  for (const [fence, pattern] of Object.entries(FENCE_PATTERNS) as [ManifestFence, RegExp][]) {
    if (pattern.test(text)) out.push(fence);
  }
  return out;
}

function evaluateCase(
  caseDef: GoldenCase,
  spoke: ReturnType<typeof detectSpokeFromMessage>,
  text: string,
  durationMs: number,
): CaseResult["checks"] {
  const checks: CaseResult["checks"] = {};
  const lc = text.toLowerCase();

  if (caseDef.expect.spoke) {
    checks.spoke = {
      expected: caseDef.expect.spoke,
      actual: spoke,
      passed: caseDef.expect.spoke.includes(spoke),
    };
  }

  if (caseDef.expect.manifests !== undefined) {
    const actual = detectManifests(text);
    if (caseDef.expect.manifests.length === 0) {
      /* Forbid manifests. */
      checks.manifests = {
        expected: caseDef.expect.manifests,
        actual,
        passed: actual.length === 0,
      };
    } else {
      const hit = actual.filter((m) => caseDef.expect.manifests!.includes(m));
      checks.manifests = {
        expected: caseDef.expect.manifests,
        actual,
        passed: hit.length > 0,
      };
    }
  }

  if (caseDef.expect.mustContain) {
    const missing = caseDef.expect.mustContain.filter((s) => !lc.includes(s.toLowerCase()));
    checks.mustContain = {
      expected: caseDef.expect.mustContain,
      missing,
      passed: missing.length === 0,
    };
  }

  if (caseDef.expect.mustNotContain) {
    const hit = caseDef.expect.mustNotContain.filter((s) => lc.includes(s.toLowerCase()));
    checks.mustNotContain = {
      expected: caseDef.expect.mustNotContain,
      hit,
      passed: hit.length === 0,
    };
  }

  const max = caseDef.expect.maxDurationMs ?? 30_000;
  checks.duration = {
    ms: durationMs,
    max,
    passed: durationMs <= max,
  };

  return checks;
}

function allPassed(checks: CaseResult["checks"]): boolean {
  for (const v of Object.values(checks)) {
    if (v && !v.passed) return false;
  }
  return true;
}

/**
 * Run a single golden case. Reusable so the route layer can run a
 * subset (e.g. ?ids=foo,bar query).
 */
export async function runSingleCase(caseDef: GoldenCase): Promise<CaseResult> {
  const startedAt = Date.now();
  const intent = inferIntent(caseDef.prompt);
  const spoke = detectSpokeFromMessage(caseDef.prompt);

  try {
    const cascade = await runModelCascade({
      conversationId: `eval-${caseDef.id}-${startedAt}`,
      message: caseDef.prompt,
      intent,
      spoke,
      recalledContext: [],
      integrationSnapshot: {},
    });
    const durationMs = Date.now() - startedAt;
    const checks = evaluateCase(caseDef, spoke, cascade.text, durationMs);
    return {
      caseId: caseDef.id,
      label: caseDef.label,
      passed: allPassed(checks),
      checks,
      cascadeText: cascade.text,
      durationMs,
      providerId: cascade.providerId,
      modelId: cascade.modelId,
      runtimeMode: cascade.runtimeMode,
    };
  } catch (err) {
    return {
      caseId: caseDef.id,
      label: caseDef.label,
      passed: false,
      checks: {},
      cascadeText: "",
      durationMs: Date.now() - startedAt,
      providerId: "error",
      modelId: "error",
      runtimeMode: "error",
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

export async function runGoldenSuite(
  options?: { ids?: readonly string[] },
): Promise<GoldenReport> {
  const filter = options?.ids;
  const cases = filter
    ? GOLDEN_CASES.filter((c) => filter.includes(c.id))
    : GOLDEN_CASES;

  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  /* Run sequentially to avoid blowing through provider rate limits. */
  const results: CaseResult[] = [];
  for (const caseDef of cases) {
    results.push(await runSingleCase(caseDef));
  }

  const finishedAt = new Date().toISOString();
  return {
    startedAt,
    finishedAt,
    totalMs: Date.now() - t0,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    total: results.length,
    results,
  };
}
