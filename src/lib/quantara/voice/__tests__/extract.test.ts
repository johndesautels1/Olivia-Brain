import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildVoiceExtractionPrompt, extractFromTranscript } from '../extract';
import type { ProviderAttempt, ProviderId } from '@/lib/foundation/types';

vi.mock('@/lib/services/model-cascade', () => ({
  runModelCascade: vi.fn(),
}));

import { runModelCascade } from '@/lib/services/model-cascade';

const TRANSCRIPT_BASIC =
  "Our ARR is around 2.4 million pounds, growing 40% year over year. " +
  "We have 85 paying customers and we're targeting an 8 million Series A round.";

const HAPPY_EXTRACTIONS = JSON.stringify({
  extractions: [
    { fieldId: 'f1', value: 2400000, confidence: 0.9, note: '"around 2.4 million"' },
    { fieldId: 'f3', value: 40, confidence: 0.95, note: '"40% year over year"' },
    { fieldId: 'f24', value: 85, confidence: 0.95, note: '"85 paying customers"' },
    { fieldId: 'f22', value: 8000000, confidence: 0.85, note: '"8 million Series A"' },
  ],
});

const MOCK_CASCADE_BASE: {
  text: string;
  providerId: ProviderId | 'mock';
  modelId: string;
  attempts: ProviderAttempt[];
  runtimeMode: 'live' | 'mock';
} = {
  text: 'unused',
  providerId: 'google',
  modelId: 'gemini-3.1-pro',
  attempts: [],
  runtimeMode: 'live',
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Prompt builder ────────────────────────────────────────────────────

describe('buildVoiceExtractionPrompt', () => {
  it('includes the transcript verbatim', () => {
    const prompt = buildVoiceExtractionPrompt(TRANSCRIPT_BASIC, []);
    expect(prompt).toContain('Our ARR is around 2.4 million pounds');
  });

  it('annotates already-filled fields so the cascade skips them', () => {
    const prompt = buildVoiceExtractionPrompt(TRANSCRIPT_BASIC, ['f1', 'f5']);
    expect(prompt).toContain('f1: Annual Recurring Revenue (ARR)');
    expect(prompt).toMatch(/f1:.*\[already filled\]/);
    expect(prompt).toMatch(/f5:.*\[already filled\]/);
  });

  it('truncates overly long transcripts', () => {
    const long = 'word '.repeat(2000); // ~10000 chars
    const prompt = buildVoiceExtractionPrompt(long, []);
    expect(prompt).toContain('… (truncated)');
  });

  it('lists every canonical field in the manifest', () => {
    const prompt = buildVoiceExtractionPrompt(TRANSCRIPT_BASIC, []);
    /* Spot-check a few across different sections. */
    expect(prompt).toContain('f1: Annual Recurring Revenue');
    expect(prompt).toContain('f23: Target Round Type');
    expect(prompt).toContain('f56: Target Exit Timeline');
  });
});

// ── extractFromTranscript: live happy path ────────────────────────────

describe('extractFromTranscript — happy path', () => {
  it('returns 3+ extractions when the transcript is rich', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: HAPPY_EXTRACTIONS,
    });

    const result = await extractFromTranscript(TRANSCRIPT_BASIC, {}, 'user-1');
    expect(result.runtimeMode).toBe('live');
    /* Q7 exit criterion: voice capture fills 3+ fields per utterance correctly. */
    expect(result.extractions.length).toBeGreaterThanOrEqual(3);
    const fieldIds = result.extractions.map((e) => e.fieldId);
    expect(fieldIds).toContain('f1');
    expect(fieldIds).toContain('f3');
    expect(fieldIds).toContain('f24');
  });

  it('strips a ```json code fence wrapping the response', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: '```json\n' + HAPPY_EXTRACTIONS + '\n```',
    });

    const result = await extractFromTranscript(TRANSCRIPT_BASIC, {}, 'user-1');
    expect(result.extractions.length).toBeGreaterThanOrEqual(3);
  });

  it('passes the founder current values as filled-field hints', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: HAPPY_EXTRACTIONS,
    });

    await extractFromTranscript(TRANSCRIPT_BASIC, { f1: 100 }, 'user-1');
    const call = vi.mocked(runModelCascade).mock.calls[0][0];
    expect(call.message).toMatch(/f1:.*\[already filled\]/);
  });
});

// ── extractFromTranscript: failure modes ──────────────────────────────

describe('extractFromTranscript — soft failures', () => {
  it('returns empty extractions on cascade mock-mode (no fabrication)', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });

    const result = await extractFromTranscript(TRANSCRIPT_BASIC, {}, 'user-1');
    expect(result.runtimeMode).toBe('mock');
    expect(result.extractions).toEqual([]);
  });

  it('returns empty extractions when cascade text is not JSON', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: 'sorry, I cannot extract field values from this',
    });

    const result = await extractFromTranscript(TRANSCRIPT_BASIC, {}, 'user-1');
    expect(result.runtimeMode).toBe('mock');
    expect(result.extractions).toEqual([]);
  });

  it('returns empty extractions when JSON does not match schema', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: JSON.stringify({
        extractions: [
          /* Invalid: confidence > 1.0 */
          { fieldId: 'f1', value: 100, confidence: 99 },
        ],
      }),
    });

    const result = await extractFromTranscript(TRANSCRIPT_BASIC, {}, 'user-1');
    expect(result.runtimeMode).toBe('mock');
    expect(result.extractions).toEqual([]);
  });

  it('returns empty extractions when fieldId regex fails', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: JSON.stringify({
        extractions: [
          /* Invalid: f99 is not a real field */
          { fieldId: 'f99', value: 1, confidence: 0.9 },
        ],
      }),
    });

    const result = await extractFromTranscript(TRANSCRIPT_BASIC, {}, 'user-1');
    expect(result.extractions).toEqual([]);
  });
});
