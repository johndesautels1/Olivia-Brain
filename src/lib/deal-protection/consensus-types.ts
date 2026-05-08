/**
 * Track P Session P7 — Multi-LLM consensus type contracts.
 *
 * For high-stakes offers (>£5M, buyout) — the same term sheet is run
 * through multiple evaluators in parallel; Opus then renders a
 * consensus smart score + dissent breakdown. Caller decides when to
 * invoke (the route validates only that an analysis exists; threshold
 * gating is the caller's responsibility).
 */
import { z } from 'zod';

import { SMART_BANDS_ORDERED, type SmartBand } from './types';

/** A single evaluator's verdict on the deal. */
export interface EvaluatorVerdict {
  /** Provider id reported by the cascade — `anthropic` / `openai` / etc, or `mock`. */
  readonly providerId: string;
  readonly modelId: string;
  /** 0-100 smart score this evaluator returned. */
  readonly smartScore: number;
  readonly smartBand: SmartBand;
  /** One-line headline of the evaluator's reasoning. */
  readonly headline: string;
  /** Whether this evaluator's call ran live (vs fallback to mock fixture). */
  readonly runtimeMode: 'live' | 'mock';
}

const SmartBandSchema = z.enum(
  SMART_BANDS_ORDERED as unknown as readonly [SmartBand, ...SmartBand[]],
);

export const EvaluatorVerdictResponseSchema = z.object({
  smartScore: z.number().min(0).max(100),
  smartBand: SmartBandSchema,
  headline: z.string().min(8).max(500),
});

export const ConsensusVerdictSchema = z.object({
  consensusScore: z.number().min(0).max(100),
  consensusBand: SmartBandSchema,
  dissentSummary: z.string().min(20).max(2000),
  agreementLevel: z.enum(['strong', 'moderate', 'low', 'split']),
});

/** Structured Opus consensus output. */
export interface ConsensusVerdict {
  readonly consensusScore: number;
  readonly consensusBand: SmartBand;
  readonly dissentSummary: string;
  /** strong = all agree within 5 points; split = >20 points spread. */
  readonly agreementLevel: 'strong' | 'moderate' | 'low' | 'split';
}

/** Full consensus result returned to the API. */
export interface ConsensusResult {
  readonly evaluators: ReadonlyArray<EvaluatorVerdict>;
  readonly verdict: ConsensusVerdict;
  /** ISO 8601 timestamp the consensus was rendered. */
  readonly generatedAt: string;
  /** Aggregate runtime mode: 'live' iff every evaluator AND Opus stayed live. */
  readonly runtimeMode: 'live' | 'mock';
  readonly attempts: ReadonlyArray<{
    readonly providerId: string;
    readonly modelId: string;
    readonly success: boolean;
    readonly durationMs: number;
  }>;
}

/** POST body schema for `/api/deal-protection/consensus`. */
export const ConsensusPostBodySchema = z.object({
  dealAnalysisId: z.string().min(1),
  /** Optional override — by default we run 3 evaluators + 1 judge. */
  evaluatorCount: z.number().int().min(2).max(5).optional(),
});

export const CONSENSUS_DEFAULT_EVALUATORS = 3 as const;
