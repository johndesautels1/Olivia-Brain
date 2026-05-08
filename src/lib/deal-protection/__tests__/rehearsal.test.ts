/**
 * Track P Session P7 — `generateRehearsalTurn` orchestrator tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateRehearsalTurn } from '../rehearsal';
import type { ClauseAnalysis } from '../clause-types';
import type { CriticalIssue } from '../report-types';
import type { ProviderAttempt, ProviderId } from '@/lib/foundation/types';

vi.mock('@/lib/services/model-cascade', () => ({
  runModelCascade: vi.fn(),
}));

import { runModelCascade } from '@/lib/services/model-cascade';

const MOCK_CASCADE_BASE: {
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
    { providerId: 'anthropic', modelId: 'claude-sonnet-4-6', success: true, durationMs: 220 },
  ],
  runtimeMode: 'live',
};

const SAMPLE_CRITICAL: CriticalIssue = {
  clauseType: 'leaver_provisions',
  summary: 'Punitive bad-leaver clause.',
  toxicity: 88,
};

const SAMPLE_CLAUSE: ClauseAnalysis = {
  text: 'Bad-leaver: 100% unvested forfeit; 50% vested at par.',
  clauseType: 'leaver_provisions',
  severity: 'critical',
  toxicity: 88,
  summary: 'Punitive bad-leaver clause.',
  founderFriendlyAlternative: 'Bad-leaver forfeits unvested only.',
  opusJudged: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateRehearsalTurn — happy path', () => {
  it('returns the parsed cascade payload with stance', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: JSON.stringify({
        investorMessage:
          "I hear your point about the bad-leaver clause, but our IC has been very firm on this — it's not something we can revisit at this stage of underwriting.",
        stance: 'pushback',
      }),
    });

    const result = await generateRehearsalTurn({
      band: 'red',
      smartScore: 12,
      criticalIssues: [SAMPLE_CRITICAL],
      clauseAnalyses: [SAMPLE_CLAUSE],
      history: [],
      founderTurn: 'I would like to revisit the bad-leaver clause.',
      conversationId: 'p7-rehearsal-live',
    });

    expect(result.runtimeMode).toBe('live');
    expect(result.stance).toBe('pushback');
    expect(result.investorMessage).toContain('IC');
  });
});

describe('generateRehearsalTurn — soft-failure fallbacks', () => {
  it('falls back to template when cascade mocks', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });
    const result = await generateRehearsalTurn({
      band: 'red',
      smartScore: 12,
      criticalIssues: [SAMPLE_CRITICAL],
      clauseAnalyses: [SAMPLE_CLAUSE],
      history: [],
      founderTurn: 'Push back on the bad-leaver clause.',
      conversationId: 'p7-rehearsal-mock',
    });
    expect(result.runtimeMode).toBe('mock');
    expect(result.stance).toBe('pushback');
    expect(result.investorMessage.length).toBeGreaterThan(40);
  });

  it('falls back when cascade text is not valid JSON', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: 'I cannot draft a response right now.',
    });
    const result = await generateRehearsalTurn({
      band: 'orange',
      smartScore: 30,
      criticalIssues: [SAMPLE_CRITICAL],
      clauseAnalyses: [SAMPLE_CLAUSE],
      history: [],
      founderTurn: 'Counter the indemnity clause.',
      conversationId: 'p7-rehearsal-bad-json',
    });
    expect(result.runtimeMode).toBe('mock');
  });

  it('falls back when JSON valid but body too short', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: JSON.stringify({
        investorMessage: 'too short',
        stance: 'pushback',
      }),
    });
    const result = await generateRehearsalTurn({
      band: 'orange',
      smartScore: 30,
      criticalIssues: [SAMPLE_CRITICAL],
      clauseAnalyses: [SAMPLE_CLAUSE],
      history: [],
      founderTurn: 'Counter clause.',
      conversationId: 'p7-rehearsal-bad-schema',
    });
    expect(result.runtimeMode).toBe('mock');
  });
});

describe('generateRehearsalTurn — band-derived fallback voice', () => {
  it('green band fallback expresses concession', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });
    const result = await generateRehearsalTurn({
      band: 'green',
      smartScore: 92,
      criticalIssues: [],
      clauseAnalyses: [],
      history: [],
      founderTurn: 'We are aligned.',
      conversationId: 'p7-rehearsal-green',
    });
    expect(result.stance).toBe('concede');
    expect(result.investorMessage.toLowerCase()).toMatch(/move to definitive|happy/);
  });

  it('red band fallback signals firm pushback', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });
    const result = await generateRehearsalTurn({
      band: 'red',
      smartScore: 12,
      criticalIssues: [SAMPLE_CRITICAL],
      clauseAnalyses: [SAMPLE_CLAUSE],
      history: [],
      founderTurn: 'Drop the bad-leaver.',
      conversationId: 'p7-rehearsal-red',
    });
    expect(result.stance).toBe('pushback');
    expect(result.investorMessage.toLowerCase()).toMatch(/cannot|not.*revisit/);
  });
});
