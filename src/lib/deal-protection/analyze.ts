/**
 * Track P Session P3 — analyze orchestrator.
 *
 * Pipeline: parser → clause classifier → aggregate → bundle DealRiskReport.
 * Pure orchestration — no Prisma writes here. Persistence lives in the
 * `/api/deal-protection/analyze` route.
 *
 * Always resolves; never throws on the happy path. Each downstream
 * stage already has its own soft-failure mode; the aggregate
 * `runtimeMode` is `'live'` only when every sub-stage stayed live AND
 * the input was structurally parseable.
 */
import { withTraceSpan } from '@/lib/observability/tracer';

import {
  aggregateClauseAnalyses,
  deriveWalkAwayReasons,
} from './aggregate';
import { classifyClauses } from './clause-intel';
import { lookupInvestorReputations } from './investor-lookup';
import { applyReputationTilt } from './investor-score-impact';
import { parseTermSheet } from './parser';
import {
  CONFIDENCE_LIVE,
  CONFIDENCE_MOCK,
  type DealRiskReport,
} from './report-types';
import { getSmartBandRecord } from './smart-score';
import type { SmartBandRecord } from './types';

/** Options accepted by `analyzeTermSheet`. */
export interface AnalyzeTermSheetOptions {
  /** ValuationSubject the analysis belongs to. */
  readonly valuationSubjectId: string;
  /** Raw term-sheet text. */
  readonly termSheetText: string;
  /** Conversation id — used as a prefix for cascade trace ids. */
  readonly conversationId: string;
}

/** Report payload without `dealAnalysisId` — that is set by the caller after persistence. */
export type DealRiskReportPayload = Omit<DealRiskReport, 'dealAnalysisId'>;

/**
 * Run the analyze pipeline on raw term-sheet text. Returns the report
 * payload (without `dealAnalysisId`); the caller persists then fills it in.
 */
export async function analyzeTermSheet(
  opts: AnalyzeTermSheetOptions,
): Promise<DealRiskReportPayload> {
  return withTraceSpan(
    'olivia.deal_protection.analyze_term_sheet',
    {
      'olivia.term_sheet_chars': opts.termSheetText.length,
    },
    async () => {
      const parsed = await parseTermSheet({
        termSheetText: opts.termSheetText,
        conversationId: `${opts.conversationId}-parse`,
      });

      const clauseTexts = parsed.clauses.map((c) => c.text);
      const classified = await classifyClauses({
        texts: clauseTexts,
        conversationId: `${opts.conversationId}-classify`,
      });

      const aggregate = aggregateClauseAnalyses(classified.analyses);

      /* P4 reputation lookup runs in parallel with the rest of the
         post-classification work — non-blocking: an empty / failed
         lookup tilts the score by 0 and the analyzer continues. */
      const reputationLookup = await lookupInvestorReputations(
        parsed.investorNames,
      );

      /* Apply the cap-aware reputation tilt. Negative tilt always
         allowed (a bad investor on a bad deal reinforces the verdict);
         positive tilt cannot lift past the clause-level severity
         ceilings. Single dealbreakers stay dealbreakers. */
      const tiltedScore = applyReputationTilt({
        aggregatedScore: aggregate.smartScore,
        tilt: reputationLookup.reputationTilt,
        hadCriticalCap: aggregate.hadCriticalCap,
        hadHighCap: aggregate.hadHighCap,
      });

      const baseBand: SmartBandRecord = getSmartBandRecord(tiltedScore);

      let band: SmartBandRecord = baseBand;
      let walkAwayReasons: ReadonlyArray<string> = [];

      if (aggregate.emptyInput) {
        band = {
          ...baseBand,
          language:
            'No substantive clauses were extracted from the term sheet. Manual review with counsel is recommended before acting on this analysis.',
          investorSignal: 'Unparsed',
        };
      } else if (band.band === 'red') {
        walkAwayReasons = deriveWalkAwayReasons(
          classified.analyses,
          band.language,
        );
      }

      const allLive =
        parsed.runtimeMode === 'live' &&
        classified.runtimeMode === 'live' &&
        !aggregate.emptyInput;
      const runtimeMode: 'live' | 'mock' = allLive ? 'live' : 'mock';
      const confidenceScore = allLive ? CONFIDENCE_LIVE : CONFIDENCE_MOCK;

      const attempts = [...parsed.attempts, ...classified.attempts];

      return {
        valuationSubjectId: opts.valuationSubjectId,
        smartScore: tiltedScore,
        band,
        clauseAnalyses: classified.analyses,
        criticalIssues: aggregate.criticalIssues,
        walkAwayReasons,
        investorNames: parsed.investorNames,
        reputationLookup,
        confidenceScore,
        runtimeMode,
        attempts,
        generatedAt: new Date().toISOString(),
      };
    },
  );
}
