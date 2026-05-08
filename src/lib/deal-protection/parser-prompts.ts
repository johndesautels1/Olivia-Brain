/**
 * Track P Session P3 — term-sheet parser cascade prompt.
 *
 * Used as the fallback when heuristic clause splitting fails to
 * produce ≥ `MIN_HEURISTIC_CLAUSE_COUNT` clauses. Sonnet via
 * `intent: "operations"` returns a JSON object with clauses + investor
 * names + round context.
 */
import { CLAUSE_TEXT_CHAR_LIMIT } from './parser-types';

/**
 * Build the parser cascade prompt for a single term-sheet body.
 *
 * The prompt is deliberately strict on output shape — the orchestrator
 * downstream only soft-fails to a single-clause fallback, so a model
 * that returns prose loses the structured analysis entirely.
 */
export function buildParserPrompt(termSheetText: string): string {
  return [
    'You are extracting structured clauses from a venture-deal term sheet.',
    'Your output feeds a downstream clause classifier; accuracy on clause',
    'boundaries matters more than synthesis or paraphrase.',
    '',
    '## Term sheet text',
    termSheetText.trim(),
    '',
    '## Output contract',
    'Return a SINGLE JSON object. No prose, no markdown, no code fences.',
    'Shape:',
    '',
    '```',
    '{',
    '  "clauses": [',
    `    { "text": "<clause verbatim, ≤ ${CLAUSE_TEXT_CHAR_LIMIT} chars>", "heading": "<optional section heading>" }`,
    '  ],',
    '  "investorNames": [ "<investor or fund name>" ],',
    '  "roundContext": {',
    '    "roundType": "seed" | "series_a" | "series_b" | "series_c" | "growth" | "strategic" | null,',
    '    "amountGbp": <number, GBP> | null,',
    '    "preMoneyGbp": <number, GBP> | null',
    '  }',
    '}',
    '```',
    '',
    '## Rules',
    '- Each clause is a SUBSTANTIVE term (not headings, not signatures, not pure boilerplate).',
    '- Clause text is verbatim from the source — do not paraphrase or summarise.',
    '- `heading` is the section title if the clause sits under one ("Liquidation Preference:"). Omit when not present.',
    '- `investorNames` are the funds / firms / individuals leading or participating ("Atomico", "Octopus Ventures", "John Smith").',
    '- `roundContext` fields are NULL when not stated explicitly. Do NOT infer.',
    '- Output ONLY the JSON object. No commentary, no prefix, no suffix.',
  ].join('\n');
}
