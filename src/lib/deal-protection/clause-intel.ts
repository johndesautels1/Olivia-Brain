/**
 * Track P Session P2 — clause classifier orchestrator.
 *
 * `classifyClause` runs a single clause through the cascade:
 *
 *   1. **Primary pass** (Sonnet via `intent: "operations"`) classifies
 *      the clause into the 20-type taxonomy + severity + toxicity +
 *      counter-language.
 *   2. **Judge pass** (Opus via `intent: "judge"`) — invoked ONLY when
 *      the primary pass flagged the clause as `critical`. Opus either
 *      confirms or downgrades the severity; the orchestrator merges
 *      the result into the primary record (judge overrides on
 *      severity / toxicity / summary; counter-language stays from
 *      primary unless judge supplies a non-empty alternative).
 *
 * `classifyClauses` runs the per-clause flow over a list. Each clause
 * is independent so the calls fan out in parallel.
 *
 * # Soft-failure handling
 *
 * Three failure modes return the closest mock fixture rather than
 * throwing — never break the founder's flow over a parse glitch:
 *   - Cascade returns `runtimeMode: "mock"` (no provider keys)
 *   - Cascade text is not valid JSON
 *   - JSON valid but doesn't match the Zod schema (or violates the
 *     severity↔toxicity calibration invariant)
 *
 * The mock fallback preserves the original clause `text` and uses the
 * fixture nearest by text-prefix match — exact text match wins, then
 * the `other` fixture as the universal fallback.
 */
import { z } from 'zod';

import { runModelCascade } from '@/lib/services/model-cascade';
import { withTraceSpan } from '@/lib/observability/tracer';

import { CLAUSE_FIXTURES, CLAUSE_FIXTURES_BY_TYPE } from './clause-fixtures';
import {
  buildClassificationPrompt,
  buildJudgePrompt,
} from './clause-prompts';
import {
  CLAUSE_TYPES_ORDERED,
  SEVERITIES_ORDERED,
  SEVERITY_TOXICITY_RANGE,
  type ClauseAnalysis,
  type ClauseAnalysisResult,
  type ClauseClassificationAttempt,
  type ClauseType,
  type Severity,
} from './clause-types';

// ── Zod schema (cascade output validation) ─────────────────────────────

const ClauseTypeSchema = z.enum(
  CLAUSE_TYPES_ORDERED as unknown as readonly [ClauseType, ...ClauseType[]],
);
const SeveritySchema = z.enum(
  SEVERITIES_ORDERED as unknown as readonly [Severity, ...Severity[]],
);

const ClauseClassificationSchema = z.object({
  clauseType: ClauseTypeSchema,
  severity: SeveritySchema,
  toxicity: z.number().int().min(0).max(100),
  summary: z.string().min(8).max(500),
  founderFriendlyAlternative: z.string().min(8).max(800),
  reasoning: z.string().min(0).max(800).optional(),
});
type ClauseClassification = z.infer<typeof ClauseClassificationSchema>;

/**
 * Verify severity↔toxicity calibration. A model that returns
 * `severity: "low", toxicity: 80` is structurally invalid even though
 * the JSON parsed cleanly.
 */
function calibrationOk(c: ClauseClassification): boolean {
  const range = SEVERITY_TOXICITY_RANGE[c.severity];
  return c.toxicity >= range.min && c.toxicity <= range.max;
}

// ── Entry point: single clause ─────────────────────────────────────────

export interface ClassifyClauseOptions {
  /** Clause text to classify (verbatim from the term sheet). */
  readonly text: string;
  /** Conversation id for the cascade trace. */
  readonly conversationId: string;
}

interface SingleClauseResult {
  analysis: ClauseAnalysis;
  attempts: ClauseClassificationAttempt[];
  providerId: string;
  modelId: string;
  runtimeMode: 'live' | 'mock';
}

/**
 * Classify one clause. Always resolves; never throws on the happy path.
 */
export async function classifyClause(
  opts: ClassifyClauseOptions,
): Promise<SingleClauseResult> {
  return withTraceSpan(
    'olivia.deal_protection.classify_clause',
    {
      'olivia.clause_chars': opts.text.length,
    },
    async () => {
      const trail: ClauseClassificationAttempt[] = [];

      // ── Primary pass ────────────────────────────────────────────
      const primary = await runModelCascade({
        conversationId: opts.conversationId,
        message: buildClassificationPrompt(opts.text),
        intent: 'operations',
        recalledContext: [],
        integrationSnapshot: {},
      });
      for (const a of primary.attempts) {
        trail.push({
          providerId: a.providerId,
          modelId: a.modelId,
          success: a.success,
          durationMs: a.durationMs,
        });
      }

      const primaryParsed = parseAndValidate(primary.text);
      if (primary.runtimeMode === 'mock' || !primaryParsed) {
        return mockResult(opts.text, primary, trail);
      }

      // ── Judge pass (only on critical) ───────────────────────────
      if (primaryParsed.severity !== 'critical') {
        return {
          analysis: toAnalysis(opts.text, primaryParsed, false),
          attempts: trail,
          providerId: primary.providerId,
          modelId: primary.modelId,
          runtimeMode: 'live',
        };
      }

      const judge = await runModelCascade({
        conversationId: opts.conversationId,
        message: buildJudgePrompt(opts.text, primaryParsed),
        intent: 'judge',
        recalledContext: [],
        integrationSnapshot: {},
      });
      for (const a of judge.attempts) {
        trail.push({
          providerId: a.providerId,
          modelId: a.modelId,
          success: a.success,
          durationMs: a.durationMs,
        });
      }

      const judgeParsed = parseAndValidate(judge.text);
      if (judge.runtimeMode === 'mock' || !judgeParsed) {
        /* Primary pass survived; emit it as the verdict and flag that
           the judge couldn't validate — `opusJudged: false`. */
        return {
          analysis: toAnalysis(opts.text, primaryParsed, false),
          attempts: trail,
          providerId: primary.providerId,
          modelId: primary.modelId,
          runtimeMode: 'live',
        };
      }

      /* Judge pass succeeded — merge: judge overrides severity /
         toxicity / summary, takes counter-language only if non-empty. */
      const merged: ClauseClassification = {
        clauseType: judgeParsed.clauseType,
        severity: judgeParsed.severity,
        toxicity: judgeParsed.toxicity,
        summary: judgeParsed.summary,
        founderFriendlyAlternative:
          judgeParsed.founderFriendlyAlternative.trim().length > 0
            ? judgeParsed.founderFriendlyAlternative
            : primaryParsed.founderFriendlyAlternative,
        reasoning: judgeParsed.reasoning,
      };

      return {
        analysis: toAnalysis(opts.text, merged, true),
        attempts: trail,
        providerId: judge.providerId,
        modelId: judge.modelId,
        runtimeMode: 'live',
      };
    },
  );
}

// ── Entry point: batch ─────────────────────────────────────────────────

export interface ClassifyClausesOptions {
  /** Clause texts in display order. */
  readonly texts: ReadonlyArray<string>;
  /** Conversation id used for the cascade trace (per-clause id appended). */
  readonly conversationId: string;
}

/**
 * Classify a batch of clauses. Each clause runs independently in
 * parallel; the bundle's `runtimeMode` is `live` only if every
 * sub-call succeeded (otherwise `mock` so the UI labels the run
 * accurately).
 */
export async function classifyClauses(
  opts: ClassifyClausesOptions,
): Promise<ClauseAnalysisResult> {
  const results = await Promise.all(
    opts.texts.map((text, i) =>
      classifyClause({
        text,
        conversationId: `${opts.conversationId}-c${i}`,
      }),
    ),
  );

  const aggregateAttempts = results.flatMap((r) => r.attempts);
  const allLive = results.every((r) => r.runtimeMode === 'live');
  const headline = results[0];

  return {
    analyses: results.map((r) => r.analysis),
    providerId: headline?.providerId ?? 'mock',
    modelId: headline?.modelId ?? 'phase1-local-fallback',
    runtimeMode: allLive ? 'live' : 'mock',
    attempts: aggregateAttempts,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

function parseAndValidate(text: string): ClauseClassification | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  const validated = ClauseClassificationSchema.safeParse(parsed);
  if (!validated.success) return null;
  /* Calibration check — even if the JSON parsed and matched the schema,
     a severity/toxicity mismatch (e.g. low + 80) is structurally
     invalid. Re-route through the mock fallback. */
  if (!calibrationOk(validated.data)) return null;
  return validated.data;
}

function toAnalysis(
  text: string,
  c: ClauseClassification,
  opusJudged: boolean,
): ClauseAnalysis {
  return {
    text,
    clauseType: c.clauseType,
    severity: c.severity,
    toxicity: c.toxicity,
    summary: c.summary,
    founderFriendlyAlternative: c.founderFriendlyAlternative,
    reasoning: c.reasoning,
    opusJudged,
  };
}

/**
 * Fallback when the cascade is mock-mode or its output fails parse /
 * calibration. Picks the fixture whose text most closely matches the
 * input (case-insensitive substring containment with prefix-overlap
 * tiebreak), then falls back to the `other` fixture.
 */
function mockResult(
  text: string,
  cascade: { providerId: string; modelId: string },
  trail: ClauseClassificationAttempt[],
): SingleClauseResult {
  const fixture = pickFixture(text);
  return {
    analysis: {
      text,
      clauseType: fixture.clauseType,
      severity: fixture.severity,
      toxicity: fixture.toxicity,
      summary: fixture.summary,
      founderFriendlyAlternative: fixture.founderFriendlyAlternative,
      opusJudged: false,
    },
    attempts: trail,
    providerId: cascade.providerId,
    modelId: cascade.modelId,
    runtimeMode: 'mock',
  };
}

function pickFixture(text: string) {
  const lower = text.toLowerCase();
  /* Exact-text match (case-insensitive). */
  for (const f of CLAUSE_FIXTURES) {
    if (f.text.toLowerCase() === lower) return f;
  }
  /* Substring match — longest-fixture-first so a specific match wins
     over a generic one. */
  const sorted = [...CLAUSE_FIXTURES].sort(
    (a, b) => b.text.length - a.text.length,
  );
  for (const f of sorted) {
    const fLower = f.text.toLowerCase();
    if (lower.includes(fLower) || fLower.includes(lower)) return f;
  }
  /* Universal fallback. */
  return CLAUSE_FIXTURES_BY_TYPE.other;
}
