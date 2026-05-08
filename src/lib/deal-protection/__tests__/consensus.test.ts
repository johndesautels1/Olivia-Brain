/**
 * Track P Session P7 — `generateConsensus` orchestrator tests.
 *
 * Cascade is mocked; verifies parallel evaluation + Opus judge merge,
 * agreement-level computation in the deterministic fallback, and the
 * three soft-failure modes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateConsensus } from '../consensus';
import type { ClauseAnalysis } from '../clause-types';
import type { ProviderAttempt, ProviderId } from '@/lib/foundation/types';

vi.mock('@/lib/services/model-cascade', () => ({
  runModelCascade: vi.fn(),
}));

import { runModelCascade } from '@/lib/services/model-cascade';

const BASE: {
  text: string;
  providerId: ProviderId | 'mock';
  modelId: string;
  attempts: ProviderAttempt[];
  runtimeMode: 'live' | 'mock';
} = {
  text: 'unused',
  providerId: 'anthropic',
  modelId: 'claude-sonnet-4-6',
  attempts: [
    { providerId: 'anthropic', modelId: 'claude-sonnet-4-6', success: true, durationMs: 250 },
  ],
  runtimeMode: 'live',
};

const SAMPLE_CLAUSE: ClauseAnalysis = {
  text: 'Series A liquidation pref 1x non-participating.',
  clauseType: 'liquidation_preference',
  severity: 'low',
  toxicity: 12,
  summary: 'Standard 1x non-participating.',
  founderFriendlyAlternative: 'Accept.',
  opusJudged: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateConsensus — happy path with strong agreement', () => {
  it('runs evaluators in parallel + merges via Opus judge', async () => {
    /* Each cascade call returns either an evaluator JSON (smartScore +
       headline) OR an Opus consensus JSON (consensusScore + dissent).
       Differentiate by intent: 'judge' is the Opus call. */
    vi.mocked(runModelCascade).mockImplementation(async ({ intent }) => {
      if (intent === 'judge') {
        return {
          ...BASE,
          text: JSON.stringify({
            consensusScore: 72,
            consensusBand: 'blue',
            dissentSummary: 'All three evaluators landed within ±3 points (70-73). Consensus blue with strong agreement.',
            agreementLevel: 'strong',
          }),
        };
      }
      return {
        ...BASE,
        text: JSON.stringify({
          smartScore: 72,
          smartBand: 'blue',
          headline: 'Standard Series A terms; mostly fair.',
        }),
      };
    });

    const result = await generateConsensus({
      companyName: 'Acme Co',
      companySector: 'AI/SaaS',
      investorNames: ['Atomico'],
      clauseAnalyses: [SAMPLE_CLAUSE],
      conversationId: 'p7-consensus-strong',
    });

    expect(result.evaluators.length).toBe(3);
    expect(result.evaluators.every((e) => e.runtimeMode === 'live')).toBe(true);
    expect(result.verdict.consensusScore).toBe(72);
    expect(result.verdict.consensusBand).toBe('blue');
    expect(result.verdict.agreementLevel).toBe('strong');
    expect(result.runtimeMode).toBe('live');
  });
});

describe('generateConsensus — evaluator-count override', () => {
  it('respects evaluatorCount when provided', async () => {
    vi.mocked(runModelCascade).mockImplementation(async ({ intent }) => {
      if (intent === 'judge') {
        return {
          ...BASE,
          text: JSON.stringify({
            consensusScore: 60,
            consensusBand: 'blue',
            dissentSummary: 'Five evaluators agreed within range.',
            agreementLevel: 'moderate',
          }),
        };
      }
      return {
        ...BASE,
        text: JSON.stringify({
          smartScore: 60,
          smartBand: 'blue',
          headline: 'Generally fair.',
        }),
      };
    });

    const result = await generateConsensus({
      investorNames: [],
      clauseAnalyses: [],
      evaluatorCount: 5,
      conversationId: 'p7-consensus-five',
    });
    expect(result.evaluators.length).toBe(5);
  });

  it('clamps evaluatorCount below 2 to 2', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });
    const result = await generateConsensus({
      investorNames: [],
      clauseAnalyses: [SAMPLE_CLAUSE],
      evaluatorCount: 1,
      conversationId: 'p7-consensus-clamp',
    });
    expect(result.evaluators.length).toBe(2);
  });
});

describe('generateConsensus — soft-failure fallbacks', () => {
  it('every evaluator mocks → mock-mode with deterministic median consensus', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });
    const result = await generateConsensus({
      investorNames: [],
      clauseAnalyses: [SAMPLE_CLAUSE],
      conversationId: 'p7-consensus-all-mock',
    });
    expect(result.runtimeMode).toBe('mock');
    expect(result.evaluators.every((e) => e.runtimeMode === 'mock')).toBe(true);
    /* Deterministic consensus uses the median of evaluator scores. */
    expect(result.verdict.consensusScore).toBeCloseTo(88, 0);
    expect(result.verdict.consensusBand).toBe('green');
    /* Strong agreement — all three evaluators returned the same fallback. */
    expect(result.verdict.agreementLevel).toBe('strong');
  });

  it('one evaluator mocks → aggregate runtimeMode = mock', async () => {
    let callIndex = 0;
    vi.mocked(runModelCascade).mockImplementation(async ({ intent }) => {
      callIndex += 1;
      if (intent === 'judge') {
        return {
          ...BASE,
          text: JSON.stringify({
            consensusScore: 70,
            consensusBand: 'blue',
            dissentSummary: 'Mostly aligned.',
            agreementLevel: 'moderate',
          }),
        };
      }
      /* First evaluator mocks, others succeed. */
      if (callIndex === 1) {
        return {
          ...BASE,
          runtimeMode: 'mock',
          providerId: 'mock',
          modelId: 'phase1-local-fallback',
          text: '',
        };
      }
      return {
        ...BASE,
        text: JSON.stringify({ smartScore: 70, smartBand: 'blue', headline: 'Standard.' }),
      };
    });
    const result = await generateConsensus({
      investorNames: [],
      clauseAnalyses: [SAMPLE_CLAUSE],
      conversationId: 'p7-consensus-partial-mock',
    });
    expect(result.runtimeMode).toBe('mock');
  });

  it('Opus judge mocks → deterministic consensus from evaluator median', async () => {
    let evalCount = 0;
    vi.mocked(runModelCascade).mockImplementation(async ({ intent }) => {
      if (intent === 'judge') {
        return {
          ...BASE,
          runtimeMode: 'mock',
          providerId: 'mock',
          modelId: 'phase1-local-fallback',
          text: '',
        };
      }
      evalCount += 1;
      const score = [50, 60, 70][evalCount - 1] ?? 60;
      return {
        ...BASE,
        text: JSON.stringify({
          smartScore: score,
          smartBand: score >= 60 ? 'blue' : 'yellow',
          headline: `Score ${score}.`,
        }),
      };
    });

    const result = await generateConsensus({
      investorNames: [],
      clauseAnalyses: [SAMPLE_CLAUSE],
      conversationId: 'p7-consensus-judge-mock',
    });
    /* Median of 50/60/70 = 60. Spread 20 → low agreement. */
    expect(result.verdict.consensusScore).toBe(60);
    expect(result.verdict.agreementLevel).toBe('low');
    /* Opus judge fell to fallback → aggregate runtimeMode='mock'. */
    expect(result.runtimeMode).toBe('mock');
  });
});

describe('generateConsensus — agreement levels (deterministic fallback)', () => {
  function setupEvaluatorScores(scores: number[]) {
    let i = 0;
    vi.mocked(runModelCascade).mockImplementation(async ({ intent }) => {
      if (intent === 'judge') {
        return {
          ...BASE,
          runtimeMode: 'mock',
          providerId: 'mock',
          modelId: 'phase1-local-fallback',
          text: '',
        };
      }
      const score = scores[i % scores.length];
      i += 1;
      return {
        ...BASE,
        text: JSON.stringify({
          smartScore: score,
          smartBand: score >= 80 ? 'green' : score >= 60 ? 'blue' : 'yellow',
          headline: `Score ${score}.`,
        }),
      };
    });
  }

  it('strong: scores within ±5 points', async () => {
    setupEvaluatorScores([70, 72, 74]);
    const result = await generateConsensus({
      investorNames: [],
      clauseAnalyses: [SAMPLE_CLAUSE],
      conversationId: 'p7-strong',
    });
    expect(result.verdict.agreementLevel).toBe('strong');
  });

  it('split: scores spread > 25 points', async () => {
    setupEvaluatorScores([20, 60, 90]);
    const result = await generateConsensus({
      investorNames: [],
      clauseAnalyses: [SAMPLE_CLAUSE],
      conversationId: 'p7-split',
    });
    expect(result.verdict.agreementLevel).toBe('split');
  });
});
