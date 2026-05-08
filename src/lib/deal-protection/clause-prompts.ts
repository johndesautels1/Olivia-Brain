/**
 * Track P Session P2 — clause classifier cascade prompts.
 *
 * Two prompt builders:
 *
 *   - `buildClassificationPrompt` — Sonnet (intent: "operations") classifies
 *     a single clause into the 20-type taxonomy + severity + toxicity +
 *     counter-language.
 *
 *   - `buildJudgePrompt` — Opus (intent: "judge") re-validates ONLY when
 *     Sonnet's classification flagged the clause as `critical`. Opus
 *     either confirms or downgrades the severity; founders deserve the
 *     extra check before a "walk away" recommendation goes out.
 *
 * Both prompts ask for strict JSON output matching `ClauseAnalysisSchema`.
 */
import {
  CLAUSE_TYPES_ORDERED,
  SEVERITIES_ORDERED,
  SEVERITY_TOXICITY_RANGE,
} from './clause-types';

const CLAUSE_TYPE_LIST = CLAUSE_TYPES_ORDERED.join(' | ');
const SEVERITY_LIST = SEVERITIES_ORDERED.join(' | ');

const SEVERITY_RANGE_BLOCK = SEVERITIES_ORDERED.map((s) => {
  const r = SEVERITY_TOXICITY_RANGE[s];
  return `  - ${s}: toxicity ${r.min}-${r.max}`;
}).join('\n');

/**
 * Sonnet primary-pass prompt. Classifies one clause into the 20-type
 * taxonomy plus severity + toxicity + counter-language.
 */
export function buildClassificationPrompt(clauseText: string): string {
  return [
    'You are classifying a single term-sheet clause for a founder-side',
    'deal-protection engine. Your output anchors a downstream',
    'recommendation (walk-away / negotiate-hard / sign), so accuracy and',
    'calibration matter more than rhetorical flourish.',
    '',
    '## Clause text',
    clauseText.trim(),
    '',
    '## Output contract',
    'Return a SINGLE JSON object. No prose, no markdown, no code fences.',
    'Shape:',
    '',
    '```',
    '{',
    `  "clauseType": one of [ ${CLAUSE_TYPE_LIST} ],`,
    `  "severity": one of [ ${SEVERITY_LIST} ],`,
    '  "toxicity": integer 0-100,',
    '  "summary": string (one line, 8-280 chars),',
    '  "founderFriendlyAlternative": string (8-500 chars; concrete counter-language)',
    '}',
    '```',
    '',
    '## Severity → toxicity calibration (REQUIRED)',
    '',
    SEVERITY_RANGE_BLOCK,
    '',
    'Toxicity MUST fall within the band for the chosen severity. A',
    'mismatch (e.g. severity=low + toxicity=80) is a parse failure.',
    '',
    '## Rules',
    '- Match the clause to the SINGLE most specific clauseType. Use',
    '  `other` only when no named type fits (e.g. notice-and-service',
    '  boilerplate).',
    '- Severity is calibrated against London / US venture-deal norms,',
    '  founder-side perspective. A 1x non-participating liquidation',
    '  preference is `low`; a 2x participating preference is `critical`.',
    "- `founderFriendlyAlternative` is the counter the founder's lawyer",
    '  should table — be specific (numbers, named carve-outs) rather',
    '  than generic ("ask for better terms").',
    '- Output ONLY the JSON object. No commentary, no prefix, no suffix.',
  ].join('\n');
}

/**
 * Opus judge pass — only invoked when Sonnet flagged a clause as
 * `critical`. Opus either confirms the call or downgrades the severity
 * (with reasoning); the orchestrator merges the result into the
 * primary-pass record.
 *
 * The judge prompt explicitly invites Opus to push back on a too-
 * aggressive classification — "walk away" is the heaviest verdict the
 * engine produces and shouldn't fire on a borderline call.
 */
export function buildJudgePrompt(
  clauseText: string,
  primaryClassification: {
    clauseType: string;
    severity: string;
    toxicity: number;
    summary: string;
    founderFriendlyAlternative: string;
  },
): string {
  return [
    'You are Cristiano™, the unilateral judge. A primary classifier',
    'flagged the following clause as CRITICAL — your job is to confirm',
    'or downgrade. Founders deserve a second opinion before a "walk',
    'away" recommendation; rubber-stamping is not the goal.',
    '',
    '## Clause text',
    clauseText.trim(),
    '',
    '## Primary classification (Sonnet)',
    `- clauseType: ${primaryClassification.clauseType}`,
    `- severity: ${primaryClassification.severity}`,
    `- toxicity: ${primaryClassification.toxicity}`,
    `- summary: ${primaryClassification.summary}`,
    `- founder-friendly alternative: ${primaryClassification.founderFriendlyAlternative}`,
    '',
    '## Output contract',
    'Return a SINGLE JSON object. No prose, no markdown, no code fences.',
    'Same shape as the primary classifier, plus a `reasoning` field:',
    '',
    '```',
    '{',
    `  "clauseType": one of [ ${CLAUSE_TYPE_LIST} ],`,
    `  "severity": one of [ ${SEVERITY_LIST} ],`,
    '  "toxicity": integer 0-100,',
    '  "summary": string (one line, 8-280 chars),',
    '  "founderFriendlyAlternative": string (8-500 chars),',
    '  "reasoning": string (8-500 chars; why you confirmed or downgraded)',
    '}',
    '```',
    '',
    '## Severity → toxicity calibration (REQUIRED)',
    SEVERITY_RANGE_BLOCK,
    '',
    'Output ONLY the JSON object.',
  ].join('\n');
}
