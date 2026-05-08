/**
 * Track P Session P5 — `generateEmailDraft` orchestrator tests.
 *
 * Cascade is mocked; the orchestrator's three soft-failure modes are
 * exercised directly. Tone is always derived from the band — even on
 * a happy-path live response, the model's tone (if any) is overridden
 * with the canonical mapping.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateEmailDraft } from '../email-drafts';
import { SMART_BANDS_BY_ID } from '../bands';
import type { EmailDraftContext } from '../email-templates';
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
    { providerId: 'anthropic', modelId: 'claude-sonnet-4-6', success: true, durationMs: 240 },
  ],
  runtimeMode: 'live',
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function context(): EmailDraftContext {
  return {
    report: {
      smartScore: 30,
      band: SMART_BANDS_BY_ID.orange,
      criticalIssues: [
        {
          clauseType: 'leaver_provisions',
          summary: 'Punitive bad-leaver.',
          toxicity: 85,
        },
      ],
      walkAwayReasons: [],
      clauseAnalyses: [],
    },
    founderName: 'Jane',
    companyName: 'Acme',
    recipientName: 'Lead Partner',
  };
}

describe('generateEmailDraft — happy path', () => {
  it('returns the cascade payload with band-derived tone', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: JSON.stringify({
        subject: 'Re: term sheet — material concerns',
        body: 'Hi Lead Partner,\n\nThank you for the offer. We have material concerns we would like to discuss before we can move forward. Specifically, the punitive bad-leaver clause is something our counsel has flagged as outside market norms.\n\nCould we set up a call this week to walk through? If we can land on workable language we would be excited to continue.\n\nBest,\nJane',
      }),
    });

    const result = await generateEmailDraft({
      conversationId: 'p5-orange',
      context: context(),
    });

    expect(result.runtimeMode).toBe('live');
    expect(result.tone).toBe('caution'); // band=orange → tone=caution (not whatever cascade says)
    expect(result.subject).toContain('material concerns');
    expect(result.body).toContain('Lead Partner');
  });
});

describe('generateEmailDraft — soft-failure fallbacks', () => {
  it('falls back to template when cascade mocks', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });
    const result = await generateEmailDraft({
      conversationId: 'p5-orange-mock',
      context: context(),
    });
    expect(result.runtimeMode).toBe('mock');
    expect(result.tone).toBe('caution');
    /* Template still produces a meaningful body. */
    expect(result.body.length).toBeGreaterThan(80);
  });

  it('falls back to template when cascade text is not valid JSON', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: 'I cannot draft an email at this time, sorry.',
    });
    const result = await generateEmailDraft({
      conversationId: 'p5-orange-bad-json',
      context: context(),
    });
    expect(result.runtimeMode).toBe('mock');
    expect(result.tone).toBe('caution');
  });

  it('falls back to template when JSON is valid but schema fails (subject too short)', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: JSON.stringify({
        subject: 'OK',
        body: 'Some body that is plenty long enough to satisfy the body min length but the subject is too short.',
      }),
    });
    const result = await generateEmailDraft({
      conversationId: 'p5-orange-bad-schema',
      context: context(),
    });
    expect(result.runtimeMode).toBe('mock');
  });
});

describe('generateEmailDraft — cascade attempts trail', () => {
  it('forwards cascade attempts onto the result', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: JSON.stringify({
        subject: 'Re: term sheet',
        body: 'Body that is plenty long enough to satisfy the eighty character minimum body requirement.',
      }),
      attempts: [
        { providerId: 'anthropic', modelId: 'sonnet', success: true, durationMs: 100 },
      ],
    });
    const result = await generateEmailDraft({
      conversationId: 'p5-attempts',
      context: context(),
    });
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].providerId).toBe('anthropic');
  });
});
