import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CombinedPersonaPayloadSchema,
  PERSONA_SCHEMA_VERSION,
} from '../types';
import {
  buildMockPersonaPayload,
  buildPersonaSynthesisPrompt,
  type PersonaSynthesisContext,
} from '../prompts';
import { synthesizePersonas } from '../synthesize';
import type { ProviderAttempt, ProviderId } from '@/lib/foundation/types';

/* The cascade is mocked per-test so we can drive synthesise outcomes
   deterministically — mock-mode, JSON parse failure, schema validation
   failure, and happy path. */
vi.mock('@/lib/services/model-cascade', () => ({
  runModelCascade: vi.fn(),
}));

import { runModelCascade } from '@/lib/services/model-cascade';

const ctx: PersonaSynthesisContext = {
  companyName: 'Quantara Ltd',
  targetRoundType: 'Series A',
  verticalId: 'ai_saas',
  facts: [
    { label: 'ARR', value: '2400000' },
    { label: 'Revenue Growth Rate YoY', value: '40' },
    { label: 'Number of Paying Customers', value: '85' },
    { label: 'Founder Domain Experience (years)', value: '12' },
  ],
};

const HAPPY_RESPONSE = JSON.stringify({
  founder: {
    summary:
      'Technical founder with 12 years of domain experience guiding a Series A AI/SaaS company through 40% YoY growth. Led the product from inception to ~£2.4M ARR.',
    narrativeAngle:
      'Domain expert turned operator-CEO scaling AI/SaaS through measured growth.',
    strengths: [
      'Deep domain experience (12 yrs) underpins product credibility.',
      'Growth discipline — 40% YoY at meaningful ARR.',
      'Established customer base (~85 paying).',
    ],
    workingStyle:
      'Hands-on with product; partners with operations + sales hires for scale.',
    archetype: 'domain_expert',
    riskTolerance: 'medium',
    gaps: ['Marketing and brand narrative are nascent.'],
    openQuestions: ['How does the founder plan to delegate sales execution?'],
  },
  company: {
    summary:
      'Quantara Ltd is a £2.4M ARR AI/SaaS company growing 40% YoY with ~85 paying customers; raising Series A capital to expand operations.',
    positioning: 'AI/SaaS for operators — purpose-built tools, not generic LLM wrappers.',
    tractionStory:
      'Grew from zero to £2.4M ARR with 85 paying customers, demonstrating disciplined GTM and product-market fit ahead of Series A.',
    differentiators: [
      'Founder domain depth (12 yrs).',
      'Strong customer retention signal at 85 customers.',
      'Capital efficiency — sustainable growth without burn-and-pray motion.',
    ],
    idealCustomer: 'Mid-market operators needing AI-assisted workflows.',
    defensibility:
      'Domain-specific data flywheel + founder credibility within the vertical.',
    watchOuts: ['Marketing function lags product/sales investment.'],
    openQuestions: ['What is the realistic Series A target post-money?'],
  },
});

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
    {
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      success: true,
      durationMs: 421,
    },
  ],
  runtimeMode: 'live',
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Prompt builder tests ──────────────────────────────────────────────

describe('buildPersonaSynthesisPrompt', () => {
  it('includes the company name and target round type', () => {
    const prompt = buildPersonaSynthesisPrompt(ctx);
    expect(prompt).toContain('Quantara Ltd');
    expect(prompt).toContain('Series A');
    expect(prompt).toContain('ai_saas');
  });

  it('emits each fact in the prompt body', () => {
    const prompt = buildPersonaSynthesisPrompt(ctx);
    expect(prompt).toContain('ARR: 2400000');
    expect(prompt).toContain('Revenue Growth Rate YoY: 40');
  });

  it('handles an empty facts list cleanly', () => {
    const prompt = buildPersonaSynthesisPrompt({
      companyName: 'NewCo',
      facts: [],
    });
    expect(prompt).toContain('(no founder facts provided)');
  });

  it('lists every legal archetype + risk tolerance value', () => {
    const prompt = buildPersonaSynthesisPrompt(ctx);
    expect(prompt).toContain('technical_visionary');
    expect(prompt).toContain('operator_ceo');
    expect(prompt).toContain('first_time_founder');
    expect(prompt).toContain('low');
    expect(prompt).toContain('high');
  });
});

// ── Mock payload builder ──────────────────────────────────────────────

describe('buildMockPersonaPayload', () => {
  it('emits a payload that satisfies the combined schema', () => {
    const payload = buildMockPersonaPayload(ctx);
    const result = CombinedPersonaPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('includes the company name in both summaries', () => {
    const payload = buildMockPersonaPayload(ctx);
    expect(payload.founder.summary).toContain('Quantara Ltd');
    expect(payload.company.summary).toContain('Quantara Ltd');
  });
});

// ── Orchestrator tests ────────────────────────────────────────────────

describe('synthesizePersonas — mock-mode short-circuit', () => {
  it('returns a deterministic mock payload when cascade is mock-mode', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });

    const result = await synthesizePersonas(ctx, 'user-1');
    expect(result.runtimeMode).toBe('mock');
    expect(result.schemaVersion).toBe(PERSONA_SCHEMA_VERSION);
    expect(result.founder.summary).toContain('Mock-mode');
    expect(result.company.summary).toContain('Mock-mode');
    /* Combined schema still valid even on the mock fallback. */
    expect(
      CombinedPersonaPayloadSchema.safeParse({
        founder: result.founder,
        company: result.company,
      }).success,
    ).toBe(true);
  });
});

describe('synthesizePersonas — happy path', () => {
  it('returns the parsed payload when cascade emits valid JSON', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: HAPPY_RESPONSE,
    });

    const result = await synthesizePersonas(ctx, 'user-1');
    expect(result.runtimeMode).toBe('live');
    expect(result.providerId).toBe('anthropic');
    expect(result.founder.archetype).toBe('domain_expert');
    expect(result.founder.strengths.length).toBeGreaterThanOrEqual(2);
    expect(result.company.differentiators.length).toBeGreaterThanOrEqual(2);
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].durationMs).toBe(421);
  });

  it('strips a ```json code fence wrapping the JSON', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: '```json\n' + HAPPY_RESPONSE + '\n```',
    });

    const result = await synthesizePersonas(ctx, 'user-1');
    expect(result.runtimeMode).toBe('live');
    expect(result.founder.archetype).toBe('domain_expert');
  });
});

describe('synthesizePersonas — soft-failure fallbacks', () => {
  it('falls back to mock when cascade text is not valid JSON', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: 'I apologise, here is your persona... (not JSON)',
    });

    const result = await synthesizePersonas(ctx, 'user-1');
    expect(result.runtimeMode).toBe('mock');
    expect(result.founder.summary).toContain('Mock-mode');
  });

  it('falls back to mock when JSON parses but does not match the schema', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: JSON.stringify({
        founder: { summary: 'too short' /* missing required fields */ },
        company: {},
      }),
    });

    const result = await synthesizePersonas(ctx, 'user-1');
    expect(result.runtimeMode).toBe('mock');
  });

  it('preserves the cascade attempts trail on mock-fallback for ops review', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: 'not json',
      attempts: [
        {
          providerId: 'google',
          modelId: 'gemini-3.1-pro',
          success: true,
          durationMs: 800,
        },
        {
          providerId: 'anthropic',
          modelId: 'claude-sonnet-4-6',
          success: true,
          durationMs: 421,
        },
      ] satisfies ProviderAttempt[],
    });

    const result = await synthesizePersonas(ctx, 'user-1');
    expect(result.runtimeMode).toBe('mock');
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0].providerId).toBe('google');
  });
});
