/**
 * Track P Session P6 — Counter term sheet type contracts.
 *
 * The counter is a founder-side redline of the investor's term sheet:
 * for each clause, captures the original investor language alongside
 * the proposed counter language plus a one-line rationale. Stored as
 * both a structured `changes` array (for side-by-side UI rendering)
 * AND a rendered markdown blob (for direct paste into email / lawyer
 * redlines).
 *
 * Versioned 1:N from `DealAnalysis` so the founder can iterate as the
 * negotiation evolves.
 */
import { z } from 'zod';

import { CLAUSE_TYPES_ORDERED, type ClauseType } from './clause-types';

/** A single redline — one investor clause + one founder counter. */
export interface CounterChange {
  readonly clauseType: ClauseType;
  /** Investor's proposed clause text (verbatim). */
  readonly originalText: string;
  /** Founder's counter text. */
  readonly counterText: string;
  /** One-line rationale for the change ("Market is 1x non-participating"). */
  readonly rationale: string;
}

/** Structured cascade output. */
export interface CounterDraftPayload {
  /** Intro paragraph framing the counter. */
  readonly preamble: string;
  /** Per-clause redlines in source order. */
  readonly changes: ReadonlyArray<CounterChange>;
  /** Closing paragraph (sign-off, next-steps). */
  readonly closing: string;
}

/** Rendered + structured counter draft ready for persistence. */
export interface CounterDraftResult extends CounterDraftPayload {
  /** Rendered markdown — preamble + per-change "Clause / Original / Counter / Rationale" blocks + closing. */
  readonly redlinedMarkdown: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly runtimeMode: 'live' | 'mock';
  readonly attempts: ReadonlyArray<{
    readonly providerId: string;
    readonly modelId: string;
    readonly success: boolean;
    readonly durationMs: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────────────────

const ClauseTypeSchema = z.enum(
  CLAUSE_TYPES_ORDERED as unknown as readonly [ClauseType, ...ClauseType[]],
);

export const CounterChangeSchema = z.object({
  clauseType: ClauseTypeSchema,
  originalText: z.string().min(8).max(2000),
  counterText: z.string().min(8).max(2000),
  rationale: z.string().min(8).max(500),
});

const PREAMBLE_MIN = 40 as const;
const PREAMBLE_MAX = 1500 as const;
const CLOSING_MIN = 20 as const;
const CLOSING_MAX = 1000 as const;
const CHANGES_MIN = 1 as const;
const CHANGES_MAX = 25 as const;

export const COUNTER_DRAFT_LIMITS = Object.freeze({
  PREAMBLE_MIN,
  PREAMBLE_MAX,
  CLOSING_MIN,
  CLOSING_MAX,
  CHANGES_MIN,
  CHANGES_MAX,
});

export const CounterDraftPayloadSchema = z.object({
  preamble: z.string().min(PREAMBLE_MIN).max(PREAMBLE_MAX),
  changes: z.array(CounterChangeSchema).min(CHANGES_MIN).max(CHANGES_MAX),
  closing: z.string().min(CLOSING_MIN).max(CLOSING_MAX),
});

/** POST body schema for `/api/deal-protection/counter-draft`. */
export const CounterDraftPostBodySchema = z.object({
  dealAnalysisId: z.string().min(1),
  founderName: z.string().min(1).max(120).optional(),
  companyName: z.string().min(1).max(120).optional(),
  recipientName: z.string().min(1).max(120).optional(),
});
