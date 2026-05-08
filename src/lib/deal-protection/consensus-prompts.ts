/**
 * Track P Session P7 — Multi-LLM consensus cascade prompts.
 *
 * Two prompts:
 *   1. **Evaluator prompt** — each parallel evaluator gets the same
 *      term-sheet + clause analyses and is asked to return a smart
 *      score / band / one-line headline. Different intents bias the
 *      cascade toward different primary providers (operations →
 *      Anthropic Sonnet, questionnaire → typically a different mix,
 *      research → Perplexity / Tavily-blended).
 *   2. **Opus judge prompt** — takes all N evaluator verdicts, renders
 *      a consensus score + agreement level + dissent summary.
 */
import type { ClauseAnalysis } from './clause-types';
import type { EvaluatorVerdict } from './consensus-types';

export interface EvaluatorPromptContext {
  readonly companyName?: string;
  readonly companySector?: string;
  readonly clauseAnalyses: ReadonlyArray<ClauseAnalysis>;
  readonly investorNames: ReadonlyArray<string>;
  readonly evaluatorIndex: number; // 0-based — surfaces in the prompt for traceability
}

export function buildEvaluatorPrompt(ctx: EvaluatorPromptContext): string {
  const company = ctx.companyName ?? '(unspecified company)';
  const sector = ctx.companySector ?? '(unspecified sector)';
  const investors =
    ctx.investorNames.length > 0 ? ctx.investorNames.slice(0, 5).join(', ') : '(unspecified)';

  const clausesBlock =
    ctx.clauseAnalyses.length > 0
      ? ctx.clauseAnalyses
          .slice()
          .sort((a, b) => b.toxicity - a.toxicity)
          .slice(0, 15)
          .map(
            (c, i) =>
              `${i + 1}. [${c.clauseType}] severity=${c.severity} toxicity=${c.toxicity} — ${c.summary}`,
          )
          .join('\n')
      : '(No clauses analysed.)';

  return [
    `You are evaluator #${ctx.evaluatorIndex + 1} in a multi-LLM consensus`,
    'process. You are scoring the founder-friendliness of a venture-deal',
    'term sheet on the standard 0-100 smart-score scale.',
    '',
    '## Company',
    `- Name: ${company}`,
    `- Sector: ${sector}`,
    `- Investors: ${investors}`,
    '',
    '## Clause analyses (top 15 by toxicity)',
    clausesBlock,
    '',
    '## Smart-band reference',
    '- 0-19   = red    (predatory / walk-away)',
    '- 20-39  = orange (aggressive / major concerns)',
    '- 40-59  = yellow (mixed / negotiate hard)',
    '- 60-79  = blue   (mostly fair / counter on a few items)',
    '- 80-100 = green  (founder-friendly / sign with confidence)',
    '',
    '## Output contract',
    'Return a SINGLE JSON object. No prose, no markdown, no code fences.',
    'Shape:',
    '',
    '```',
    '{',
    '  "smartScore": integer 0-100,',
    '  "smartBand": one of [red | orange | yellow | blue | green],',
    '  "headline":  string (8-280 chars; one-line reasoning summary)',
    '}',
    '```',
    '',
    '## Rules',
    '- Score must reflect founder-friendliness; lower = more hostile.',
    '- Band must match the score range above.',
    "- `headline` is one sentence — what's driving your score.",
    '- Output ONLY the JSON object.',
  ].join('\n');
}

export interface OpusJudgePromptContext {
  readonly evaluators: ReadonlyArray<EvaluatorVerdict>;
}

export function buildOpusJudgePrompt(ctx: OpusJudgePromptContext): string {
  const verdictsBlock = ctx.evaluators
    .map(
      (e, i) =>
        `${i + 1}. ${e.providerId} (${e.modelId}): score=${e.smartScore.toFixed(0)} band=${e.smartBand} — ${e.headline}`,
    )
    .join('\n');

  return [
    'You are Cristiano™, the unilateral judge. Multiple evaluators have',
    'scored the same term sheet. Your job: render a consensus smart',
    'score + dissent breakdown. Founders depend on this verdict to',
    'decide whether to walk, negotiate, or sign.',
    '',
    '## Evaluator verdicts',
    verdictsBlock,
    '',
    '## Output contract',
    'Return a SINGLE JSON object. No prose, no markdown, no code fences.',
    'Shape:',
    '',
    '```',
    '{',
    '  "consensusScore": integer 0-100,',
    '  "consensusBand":  one of [red | orange | yellow | blue | green],',
    '  "dissentSummary": string (20-1500 chars; where evaluators agreed and disagreed),',
    '  "agreementLevel": one of [strong | moderate | low | split]',
    '}',
    '```',
    '',
    '## Rules',
    '- `consensusScore` should reflect a defensible center (the median is a fine starting point; weight away from outliers if their reasoning is shallow).',
    '- `consensusBand` MUST match the score range.',
    '- `agreementLevel`:',
    '    strong   = all evaluators within ±5 points',
    '    moderate = within ±15 points',
    '    low      = within ±25 points',
    '    split    = >25 point spread (genuine disagreement)',
    '- `dissentSummary` calls out where evaluators diverged and the substantive reasons.',
    '- Output ONLY the JSON object.',
  ].join('\n');
}
