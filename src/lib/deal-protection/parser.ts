/**
 * Track P Session P3 — term-sheet parser.
 *
 * Heuristic-first hybrid. The parser tries section-marker splitting
 * first (free, deterministic, fast). When that produces fewer than
 * `MIN_HEURISTIC_CLAUSE_COUNT` clauses, it falls back to cascade-driven
 * extraction (Sonnet via `intent: "operations"`) which handles
 * unstructured / informal term sheets.
 *
 * # Three soft-failure modes
 *
 *   1. **Cascade returns mock-mode** (no provider keys) — fall back
 *      to a single-clause shape with the verbatim text. The classifier
 *      will tag it `other` but the report is structurally complete.
 *   2. **Cascade text is not valid JSON** — same single-clause fallback.
 *   3. **Cascade JSON doesn't match the schema** — same single-clause
 *      fallback. Never throws on the happy path.
 */
import { z } from 'zod';

import { runModelCascade } from '@/lib/services/model-cascade';
import { withTraceSpan } from '@/lib/observability/tracer';

import type { ClauseClassificationAttempt } from './clause-types';
import { buildParserPrompt } from './parser-prompts';
import {
  CLAUSE_TEXT_CHAR_LIMIT,
  MIN_HEURISTIC_CLAUSE_COUNT,
  PARSER_TEXT_CHAR_LIMIT,
  type TermSheetClause,
  type TermSheetRoundContext,
  type TermSheetTerms,
} from './parser-types';

// ─────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────

export interface ParseTermSheetOptions {
  /** Raw term-sheet text. Capped at `PARSER_TEXT_CHAR_LIMIT` internally. */
  readonly termSheetText: string;
  /** Conversation id used for the cascade trace. */
  readonly conversationId: string;
}

/**
 * Parse a term sheet into a structured shape. Always resolves; never
 * throws on the happy path.
 */
export async function parseTermSheet(
  opts: ParseTermSheetOptions,
): Promise<TermSheetTerms> {
  return withTraceSpan(
    'olivia.deal_protection.parse_term_sheet',
    {
      'olivia.term_sheet_chars': opts.termSheetText.length,
    },
    async () => {
      const fullText = opts.termSheetText.slice(0, PARSER_TEXT_CHAR_LIMIT).trim();
      if (fullText.length === 0) {
        return emptyResult(fullText);
      }

      /* Heuristic-first happy path. */
      const heuristic = heuristicParse(fullText);
      if (heuristic.clauses.length >= MIN_HEURISTIC_CLAUSE_COUNT) {
        return heuristic;
      }

      /* Cascade fallback. */
      return cascadeParse(fullText, opts.conversationId, heuristic);
    },
  );
}

// ─────────────────────────────────────────────────────────────────────
// Heuristic strategy
// ─────────────────────────────────────────────────────────────────────

/**
 * Split on three common patterns:
 *   - "Section 1", "Section 2", …
 *   - Numbered list items "1.", "2.", … followed by a capitalised word
 *   - Heading-style markers ("Liquidation Preference:", "Vesting:")
 *
 * The split happens BEFORE each match (lookahead) so the marker stays
 * with its clause body.
 */
const SECTION_SPLIT_RE =
  /(?:^|\n)(?=\s*(?:Section\s+\d+|\d+\.\s*[A-Z]|[A-Z][A-Za-z][A-Za-z\s\-&/]{2,40}:\s))/g;

const HEADING_PARSE_RE =
  /^(?:Section\s+\d+\s*[:\-.]\s*|\d+\.\s+)?([A-Z][A-Za-z][A-Za-z\s\-&/]{2,40}):\s+([\s\S]*)$/;

const MIN_CLAUSE_BODY_CHARS = 20 as const;

function heuristicParse(fullText: string): TermSheetTerms {
  const segments = fullText
    .split(SECTION_SPLIT_RE)
    .map((s) => s.trim())
    .filter(Boolean);

  const clauses: TermSheetClause[] = [];
  for (const seg of segments) {
    const headingMatch = seg.match(HEADING_PARSE_RE);
    let heading: string | undefined;
    let text: string;
    if (headingMatch) {
      heading = headingMatch[1].trim();
      text = headingMatch[2].trim();
    } else {
      text = seg;
    }
    text = text.slice(0, CLAUSE_TEXT_CHAR_LIMIT).trim();
    if (text.length < MIN_CLAUSE_BODY_CHARS) continue;
    clauses.push(heading ? { text, heading } : { text });
  }

  const ok = clauses.length >= MIN_HEURISTIC_CLAUSE_COUNT;
  return {
    fullText,
    clauses,
    investorNames: extractInvestorNames(fullText),
    roundContext: extractRoundContext(fullText),
    attempts: [],
    runtimeMode: ok ? 'live' : 'mock',
    extractionStrategy: ok ? 'heuristic' : 'fallback_single',
  };
}

const INVESTOR_LINE_RE =
  /(?:^|\n)\s*(?:Lead\s+)?Investors?\s*[:\-]\s*([^\n]+)/gi;

function extractInvestorNames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(INVESTOR_LINE_RE)) {
    const list = m[1];
    for (const part of list.split(/\s*(?:,|;|\band\b|&)\s+/i)) {
      const cleaned = part.trim().replace(/[.,;]+$/, '');
      if (cleaned.length < 2 || cleaned.length > 80) continue;
      if (!/^[A-Z]/.test(cleaned)) continue;
      const lower = cleaned.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      out.push(cleaned);
    }
  }
  return out;
}

const ROUND_TYPE_PATTERNS: ReadonlyArray<{ re: RegExp; value: string }> = [
  { re: /\bseries\s*c\b/i, value: 'series_c' },
  { re: /\bseries\s*b\b/i, value: 'series_b' },
  { re: /\bseries\s*a\b/i, value: 'series_a' },
  { re: /\b(?:pre[-\s]?seed|seed)\b/i, value: 'seed' },
  { re: /\bgrowth\s+round\b/i, value: 'growth' },
  { re: /\bstrategic\s+round\b/i, value: 'strategic' },
];

const AMOUNT_RE = /£\s*([\d,]+(?:\.\d+)?)\s*(m|million|k|thousand)?/gi;

function extractRoundContext(text: string): TermSheetRoundContext | undefined {
  let roundType: string | undefined;
  for (const { re, value } of ROUND_TYPE_PATTERNS) {
    if (re.test(text)) {
      roundType = value;
      break;
    }
  }

  let amountGbp: number | undefined;
  let preMoneyGbp: number | undefined;
  const lower = text.toLowerCase();
  for (const m of text.matchAll(AMOUNT_RE)) {
    const value = parseAmount(m[1], m[2]);
    if (value === undefined) continue;
    const idx = m.index ?? 0;
    const ctx = lower.slice(Math.max(0, idx - 40), idx);
    if (preMoneyGbp === undefined && /pre[-\s]?money|valuation/.test(ctx)) {
      preMoneyGbp = value;
    } else if (amountGbp === undefined) {
      amountGbp = value;
    }
    if (amountGbp !== undefined && preMoneyGbp !== undefined) break;
  }

  if (
    roundType === undefined &&
    amountGbp === undefined &&
    preMoneyGbp === undefined
  ) {
    return undefined;
  }
  return { roundType, amountGbp, preMoneyGbp };
}

function parseAmount(rawNum: string, suffix: string | undefined): number | undefined {
  const n = Number.parseFloat(rawNum.replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const s = (suffix ?? '').toLowerCase();
  if (s === 'm' || s === 'million') return n * 1_000_000;
  if (s === 'k' || s === 'thousand') return n * 1_000;
  return n;
}

// ─────────────────────────────────────────────────────────────────────
// Cascade fallback
// ─────────────────────────────────────────────────────────────────────

const CascadeRoundContextSchema = z
  .object({
    roundType: z.string().nullable().optional(),
    amountGbp: z.number().positive().nullable().optional(),
    preMoneyGbp: z.number().positive().nullable().optional(),
  })
  .partial()
  .optional();

const CascadeParseSchema = z.object({
  clauses: z
    .array(
      z.object({
        text: z.string().min(8),
        heading: z.string().min(1).max(120).optional(),
      }),
    )
    .min(1),
  investorNames: z.array(z.string().min(2).max(80)).optional(),
  roundContext: CascadeRoundContextSchema,
});

async function cascadeParse(
  fullText: string,
  conversationId: string,
  heuristicSeed: TermSheetTerms,
): Promise<TermSheetTerms> {
  const cascade = await runModelCascade({
    conversationId,
    message: buildParserPrompt(fullText),
    intent: 'operations',
    recalledContext: [],
    integrationSnapshot: {},
  });

  const attempts: ClauseClassificationAttempt[] = cascade.attempts.map((a) => ({
    providerId: a.providerId,
    modelId: a.modelId,
    success: a.success,
    durationMs: a.durationMs,
  }));

  if (cascade.runtimeMode === 'mock') {
    return singleClauseFallback(fullText, attempts, heuristicSeed);
  }

  const parsed = parseAndValidateCascade(cascade.text);
  if (!parsed) {
    return singleClauseFallback(fullText, attempts, heuristicSeed);
  }

  const clauses: TermSheetClause[] = parsed.clauses
    .map((c) => {
      const text = c.text.slice(0, CLAUSE_TEXT_CHAR_LIMIT).trim();
      const heading = c.heading?.trim();
      return heading ? { text, heading } : { text };
    })
    .filter((c) => c.text.length >= MIN_CLAUSE_BODY_CHARS);

  if (clauses.length === 0) {
    return singleClauseFallback(fullText, attempts, heuristicSeed);
  }

  const investorNames =
    parsed.investorNames && parsed.investorNames.length > 0
      ? dedupePreserveOrder(
          parsed.investorNames.map((s) => s.trim()).filter(Boolean),
        )
      : heuristicSeed.investorNames;

  const ctx = mergeRoundContext(heuristicSeed.roundContext, parsed.roundContext);

  return {
    fullText,
    clauses,
    investorNames,
    roundContext: ctx,
    attempts,
    runtimeMode: 'live',
    extractionStrategy: 'cascade',
  };
}

function parseAndValidateCascade(
  text: string,
): z.infer<typeof CascadeParseSchema> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  const validated = CascadeParseSchema.safeParse(parsed);
  return validated.success ? validated.data : null;
}

function singleClauseFallback(
  fullText: string,
  attempts: ClauseClassificationAttempt[],
  heuristicSeed: TermSheetTerms,
): TermSheetTerms {
  const text = fullText.slice(0, CLAUSE_TEXT_CHAR_LIMIT).trim();
  return {
    fullText,
    clauses: text.length > 0 ? [{ text }] : [],
    investorNames: heuristicSeed.investorNames,
    roundContext: heuristicSeed.roundContext,
    attempts,
    runtimeMode: 'mock',
    extractionStrategy: 'fallback_single',
  };
}

function emptyResult(fullText: string): TermSheetTerms {
  return {
    fullText,
    clauses: [],
    investorNames: [],
    roundContext: undefined,
    attempts: [],
    runtimeMode: 'mock',
    extractionStrategy: 'fallback_single',
  };
}

function mergeRoundContext(
  a: TermSheetRoundContext | undefined,
  b:
    | {
        roundType?: string | null;
        amountGbp?: number | null;
        preMoneyGbp?: number | null;
      }
    | undefined,
): TermSheetRoundContext | undefined {
  if (!a && !b) return undefined;
  const roundType = b?.roundType ?? a?.roundType ?? undefined;
  const amountGbp = b?.amountGbp ?? a?.amountGbp ?? undefined;
  const preMoneyGbp = b?.preMoneyGbp ?? a?.preMoneyGbp ?? undefined;
  if (
    (roundType === undefined || roundType === null) &&
    (amountGbp === undefined || amountGbp === null) &&
    (preMoneyGbp === undefined || preMoneyGbp === null)
  ) {
    return undefined;
  }
  return {
    roundType: roundType ?? undefined,
    amountGbp: amountGbp == null ? undefined : amountGbp,
    preMoneyGbp: preMoneyGbp == null ? undefined : preMoneyGbp,
  };
}

function dedupePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const k = it.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}
