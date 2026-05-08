/**
 * Track P Session P6 — `generateCounterDraft` orchestrator tests.
 *
 * Cascade is mocked; the three soft-failure modes are exercised
 * directly. Live happy-path coverage validates the JSON output is
 * preserved and the markdown render reflects it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateCounterDraft } from '../counter-term-sheet';
import type { ClauseAnalysis } from '../clause-types';
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
    { providerId: 'anthropic', modelId: 'claude-sonnet-4-6', success: true, durationMs: 280 },
  ],
  runtimeMode: 'live',
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const SAMPLE_CLAUSE: ClauseAnalysis = {
  text: 'Investor appoints two of three board seats.',
  clauseType: 'board_control',
  severity: 'high',
  toxicity: 65,
  summary: 'Investor majority control at Series A.',
  founderFriendlyAlternative: 'Counter for 2 founder + 1 investor + 1 independent.',
  opusJudged: false,
};

const LIVE_PAYLOAD = JSON.stringify({
  preamble:
    'Hi Lead Partner, our team has reviewed the term sheet and would like to propose the redlines below before we move to definitive docs.',
  changes: [
    {
      clauseType: 'board_control',
      originalText: 'Investor appoints two of three board seats.',
      counterText: 'Counter for 2 founder + 1 investor + 1 independent — preserves founder voice on most votes.',
      rationale: 'Investor-majority Series A boards are above market and shift control prematurely.',
    },
  ],
  closing: 'Happy to discuss on a call this week. Best, the founding team',
});

describe('generateCounterDraft — happy path (live cascade)', () => {
  it('returns the parsed payload + markdown render with runtimeMode=live', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: LIVE_PAYLOAD,
    });

    const result = await generateCounterDraft({
      band: 'yellow',
      smartScore: 50,
      clauseAnalyses: [SAMPLE_CLAUSE],
      companyName: 'Acme Co',
      companySector: 'AI/SaaS',
      recipientName: 'Lead Partner',
      founderName: 'Jane',
      conversationId: 'p6-live',
    });

    expect(result.runtimeMode).toBe('live');
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].clauseType).toBe('board_control');
    expect(result.redlinedMarkdown).toContain('### 1. Board Control');
    expect(result.redlinedMarkdown).toContain('Investor appoints two of three board seats.');
  });
});

describe('generateCounterDraft — soft-failure fallbacks', () => {
  it('falls back to template when cascade mocks', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });

    const result = await generateCounterDraft({
      band: 'orange',
      smartScore: 30,
      clauseAnalyses: [SAMPLE_CLAUSE],
      companyName: 'Acme Co',
      conversationId: 'p6-mock',
    });
    expect(result.runtimeMode).toBe('mock');
    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.redlinedMarkdown.length).toBeGreaterThan(80);
  });

  it('falls back to template when cascade returns invalid JSON', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: 'I cannot draft a counter at this time, sorry.',
    });
    const result = await generateCounterDraft({
      band: 'orange',
      smartScore: 30,
      clauseAnalyses: [SAMPLE_CLAUSE],
      conversationId: 'p6-bad-json',
    });
    expect(result.runtimeMode).toBe('mock');
  });

  it('falls back to template when JSON is valid but schema fails (preamble too short)', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: JSON.stringify({
        preamble: 'too short',
        changes: [
          {
            clauseType: 'board_control',
            originalText: 'long enough text here',
            counterText: 'long enough text here too',
            rationale: 'long enough rationale text',
          },
        ],
        closing: 'long enough closing text here',
      }),
    });
    const result = await generateCounterDraft({
      band: 'orange',
      smartScore: 30,
      clauseAnalyses: [SAMPLE_CLAUSE],
      conversationId: 'p6-bad-schema',
    });
    expect(result.runtimeMode).toBe('mock');
  });
});

describe('generateCounterDraft — markdown shape', () => {
  it('renders the preamble, redlines header, change blocks, and closing in order', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: LIVE_PAYLOAD,
    });
    const result = await generateCounterDraft({
      band: 'yellow',
      smartScore: 50,
      clauseAnalyses: [SAMPLE_CLAUSE],
      conversationId: 'p6-md',
    });
    const md = result.redlinedMarkdown;
    /* Order check — preamble before Redlines header before change before closing. */
    const preambleIdx = md.indexOf('Hi Lead Partner');
    const redlinesIdx = md.indexOf('## Redlines');
    const changeIdx = md.indexOf('### 1. Board Control');
    const closingIdx = md.indexOf('Happy to discuss');
    expect(preambleIdx).toBeGreaterThanOrEqual(0);
    expect(preambleIdx).toBeLessThan(redlinesIdx);
    expect(redlinesIdx).toBeLessThan(changeIdx);
    expect(changeIdx).toBeLessThan(closingIdx);
  });
});

describe('generateCounterDraft — attempts trail', () => {
  it('forwards cascade attempts onto the result', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: LIVE_PAYLOAD,
      attempts: [
        { providerId: 'anthropic', modelId: 'sonnet', success: true, durationMs: 100 },
        { providerId: 'openai', modelId: 'gpt-5', success: false, durationMs: 80 },
      ],
    });
    const result = await generateCounterDraft({
      band: 'yellow',
      smartScore: 50,
      clauseAnalyses: [SAMPLE_CLAUSE],
      conversationId: 'p6-attempts',
    });
    expect(result.attempts).toHaveLength(2);
  });
});
