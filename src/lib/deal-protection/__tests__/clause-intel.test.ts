import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CLAUSE_FIXTURES, CLAUSE_FIXTURES_BY_TYPE } from '../clause-fixtures';
import {
  classifyClause,
  classifyClauses,
} from '../clause-intel';
import {
  buildClassificationPrompt,
  buildJudgePrompt,
} from '../clause-prompts';
import {
  CLAUSE_TYPES_ORDERED,
  CLAUSE_TYPE_COUNT,
  SEVERITIES_ORDERED,
  SEVERITY_TOXICITY_RANGE,
} from '../clause-types';
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
    { providerId: 'anthropic', modelId: 'claude-sonnet-4-6', success: true, durationMs: 380 },
  ],
  runtimeMode: 'live',
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Catalog invariants ────────────────────────────────────────────────

describe('clause-types catalog', () => {
  it('lists exactly 20 clause types', () => {
    expect(CLAUSE_TYPES_ORDERED.length).toBe(CLAUSE_TYPE_COUNT);
    expect(CLAUSE_TYPE_COUNT).toBe(20);
  });

  it('every clause type has a unique fixture', () => {
    expect(CLAUSE_FIXTURES.length).toBe(CLAUSE_TYPE_COUNT);
    const seen = new Set(CLAUSE_FIXTURES.map((f) => f.clauseType));
    expect(seen.size).toBe(CLAUSE_TYPE_COUNT);
    for (const type of CLAUSE_TYPES_ORDERED) {
      expect(CLAUSE_FIXTURES_BY_TYPE[type]).toBeDefined();
    }
  });

  it('every fixture toxicity falls within its severity range', () => {
    for (const f of CLAUSE_FIXTURES) {
      const range = SEVERITY_TOXICITY_RANGE[f.severity];
      expect(f.toxicity).toBeGreaterThanOrEqual(range.min);
      expect(f.toxicity).toBeLessThanOrEqual(range.max);
    }
  });
});

describe('SEVERITY_TOXICITY_RANGE', () => {
  it('covers 0..100 contiguously', () => {
    let cursor = 0;
    for (const sev of SEVERITIES_ORDERED) {
      const r = SEVERITY_TOXICITY_RANGE[sev];
      expect(r.min).toBe(cursor);
      expect(r.max).toBeGreaterThanOrEqual(r.min);
      cursor = r.max + 1;
    }
    expect(cursor).toBe(101);
  });

  it('severity tiers are monotone — every low max < every medium min, etc.', () => {
    expect(SEVERITY_TOXICITY_RANGE.low.max).toBeLessThan(
      SEVERITY_TOXICITY_RANGE.medium.min,
    );
    expect(SEVERITY_TOXICITY_RANGE.medium.max).toBeLessThan(
      SEVERITY_TOXICITY_RANGE.high.min,
    );
    expect(SEVERITY_TOXICITY_RANGE.high.max).toBeLessThan(
      SEVERITY_TOXICITY_RANGE.critical.min,
    );
  });
});

// ── Prompt builders ───────────────────────────────────────────────────

describe('buildClassificationPrompt', () => {
  it('includes the clause text verbatim', () => {
    const text = 'Investor consent required for any new debt above £100k.';
    const prompt = buildClassificationPrompt(text);
    expect(prompt).toContain(text);
  });

  it('lists every legal clauseType', () => {
    const prompt = buildClassificationPrompt('test');
    for (const type of CLAUSE_TYPES_ORDERED) {
      expect(prompt).toContain(type);
    }
  });

  it('lists every severity + its toxicity range', () => {
    const prompt = buildClassificationPrompt('test');
    for (const sev of SEVERITIES_ORDERED) {
      expect(prompt).toContain(sev);
      const r = SEVERITY_TOXICITY_RANGE[sev];
      expect(prompt).toContain(`${r.min}-${r.max}`);
    }
  });
});

describe('buildJudgePrompt', () => {
  it('echoes both the clause text and the primary classification', () => {
    const text = 'Founders personally indemnify the company at 100%.';
    const prompt = buildJudgePrompt(text, {
      clauseType: 'indemnification',
      severity: 'critical',
      toxicity: 92,
      summary: 'Personal indemnity at 100% is unusual.',
      founderFriendlyAlternative: 'Cap at 10-15% escrow.',
    });
    expect(prompt).toContain(text);
    expect(prompt).toContain('indemnification');
    expect(prompt).toContain('92');
  });
});

// ── classifyClause: live happy path ───────────────────────────────────

describe('classifyClause — live (no judge pass needed)', () => {
  it('returns the parsed analysis when severity is below critical', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: JSON.stringify({
        clauseType: 'veto_rights',
        severity: 'medium',
        toxicity: 38,
        summary: 'Broad veto on hiring + budget at Series A is non-trivial.',
        founderFriendlyAlternative:
          'Counter to budget veto only above 20% deviation; remove hiring veto for non-CXO.',
      }),
    });

    const result = await classifyClause({
      text: 'Investor consent required for budget, hiring exec roles, IP licensing, debt > £100k.',
      conversationId: 'test',
    });

    expect(result.runtimeMode).toBe('live');
    expect(result.analysis.clauseType).toBe('veto_rights');
    expect(result.analysis.severity).toBe('medium');
    expect(result.analysis.toxicity).toBe(38);
    expect(result.analysis.opusJudged).toBe(false);
    /* Only 1 cascade call when severity is non-critical (no judge pass). */
    expect(runModelCascade).toHaveBeenCalledTimes(1);
  });

  it('strips a code-fence wrapping the JSON', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text:
        '```json\n' +
        JSON.stringify({
          clauseType: 'tag_along',
          severity: 'low',
          toxicity: 16,
          summary: 'Standard tag-along.',
          founderFriendlyAlternative: 'Accept as-is.',
        }) +
        '\n```',
    });

    const result = await classifyClause({
      text: 'Tag-along on any sale by founders.',
      conversationId: 'test',
    });
    expect(result.analysis.clauseType).toBe('tag_along');
  });
});

// ── classifyClause: judge pass on critical ────────────────────────────

describe('classifyClause — critical triggers judge pass', () => {
  it('runs the Opus judge and merges the verdict when primary flagged critical', async () => {
    vi.mocked(runModelCascade)
      .mockResolvedValueOnce({
        // Primary pass
        ...MOCK_CASCADE_BASE,
        text: JSON.stringify({
          clauseType: 'leaver_provisions',
          severity: 'critical',
          toxicity: 88,
          summary: 'Punitive bad-leaver — repurchase at par is predatory.',
          founderFriendlyAlternative:
            'Counter: bad-leaver forfeits unvested only; vested at FMV.',
        }),
      })
      .mockResolvedValueOnce({
        // Judge pass — confirms but bumps toxicity higher within critical
        ...MOCK_CASCADE_BASE,
        providerId: 'anthropic_judge',
        modelId: 'claude-opus-4-6',
        text: JSON.stringify({
          clauseType: 'leaver_provisions',
          severity: 'critical',
          toxicity: 95,
          summary: 'Confirmed critical: par-value buyback of vested stock.',
          founderFriendlyAlternative:
            'Counter: bad-leaver forfeits unvested only; vested kept by departing founder OR FMV.',
          reasoning:
            'Par-value vested-share repurchase has zero market precedent at Series A.',
        }),
      });

    const result = await classifyClause({
      text: 'Bad-leaver: 100% unvested forfeit; 50% vested at par.',
      conversationId: 'test',
    });

    expect(result.runtimeMode).toBe('live');
    expect(result.analysis.opusJudged).toBe(true);
    /* Judge overrides toxicity. */
    expect(result.analysis.toxicity).toBe(95);
    /* Counter-language updated by judge (non-empty override). */
    expect(result.analysis.founderFriendlyAlternative).toContain(
      'kept by departing founder OR FMV',
    );
    expect(result.analysis.reasoning).toContain('zero market precedent');
    expect(runModelCascade).toHaveBeenCalledTimes(2);
  });

  it('falls back to primary when judge pass mock-modes', async () => {
    vi.mocked(runModelCascade)
      .mockResolvedValueOnce({
        ...MOCK_CASCADE_BASE,
        text: JSON.stringify({
          clauseType: 'indemnification',
          severity: 'critical',
          toxicity: 90,
          summary: 'Personal founder indemnity at 100%.',
          founderFriendlyAlternative: 'Cap at 10-15% escrow.',
        }),
      })
      .mockResolvedValueOnce({
        ...MOCK_CASCADE_BASE,
        runtimeMode: 'mock',
        providerId: 'mock',
        modelId: 'phase1-local-fallback',
        text: '',
      });

    const result = await classifyClause({
      text: 'Founders personally indemnify the company at 100%.',
      conversationId: 'test',
    });

    expect(result.runtimeMode).toBe('live'); // primary pass succeeded
    expect(result.analysis.severity).toBe('critical');
    /* `opusJudged` stays false because the judge couldn't validate. */
    expect(result.analysis.opusJudged).toBe(false);
  });
});

// ── classifyClause: soft-failure fallbacks ────────────────────────────

describe('classifyClause — soft-failure fallbacks', () => {
  it('falls back to fixture match on cascade mock-mode', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });

    const result = await classifyClause({
      text: '4-year vesting with 1-year cliff for all founder shares.',
      conversationId: 'test',
    });
    expect(result.runtimeMode).toBe('mock');
    expect(result.analysis.clauseType).toBe('vesting');
  });

  it('falls back when cascade text is not valid JSON', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: 'Sorry, here is your analysis... (not JSON)',
    });

    const result = await classifyClause({
      text: '4-year vesting with 1-year cliff for all founder shares.',
      conversationId: 'test',
    });
    expect(result.runtimeMode).toBe('mock');
    expect(result.analysis.clauseType).toBe('vesting');
  });

  it('falls back when severity↔toxicity calibration is broken', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: JSON.stringify({
        clauseType: 'vesting',
        severity: 'low',
        toxicity: 80, // INVALID: low must be 0-25
        summary: 'Should not pass calibration.',
        founderFriendlyAlternative: 'n/a',
      }),
    });

    const result = await classifyClause({
      text: '4-year vesting with 1-year cliff for all founder shares.',
      conversationId: 'test',
    });
    expect(result.runtimeMode).toBe('mock');
    /* Falls through to the fixture, NOT the model's hallucinated output. */
    expect(result.analysis.toxicity).toBeLessThanOrEqual(25);
  });

  it('falls back to the `other` fixture when no fixture matches', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });

    const result = await classifyClause({
      text: 'Something completely unrelated to any standard term-sheet clause.',
      conversationId: 'test',
    });
    expect(result.runtimeMode).toBe('mock');
    expect(result.analysis.clauseType).toBe('other');
  });
});

// ── Q7-style end-to-end coverage: 20+ test clauses ────────────────────

describe('classifyClause — exit criterion (20+ clauses tagged)', () => {
  it('correctly tags every fixture clause when the cascade returns the canonical answer', async () => {
    const cases = CLAUSE_FIXTURES;
    for (const fixture of cases) {
      vi.mocked(runModelCascade).mockClear();
      vi.mocked(runModelCascade).mockImplementation(
        async (input: { intent?: string }) => {
          const canonical = {
            ...MOCK_CASCADE_BASE,
            text: JSON.stringify({
              clauseType: fixture.clauseType,
              severity: fixture.severity,
              toxicity: fixture.toxicity,
              summary: fixture.summary,
              founderFriendlyAlternative: fixture.founderFriendlyAlternative,
            }),
          };
          /* Judge pass returns the same payload (no override). */
          if (input.intent === 'judge') return { ...canonical };
          return canonical;
        },
      );

      const result = await classifyClause({
        text: fixture.text,
        conversationId: 'test',
      });
      expect(result.analysis.clauseType).toBe(fixture.clauseType);
      expect(result.analysis.severity).toBe(fixture.severity);
      expect(result.analysis.toxicity).toBe(fixture.toxicity);
    }
  });

  it('toxicity is monotone with severity across all 20 fixtures', () => {
    /* For every pair where severityIndex(a) < severityIndex(b),
       toxicity(a) MUST be <= max(severity(a)) which is < min(severity(b)).
       In practice this means: any low fixture has a strictly lower
       toxicity than any medium fixture, and so on across tiers. */
    const sevIdx = (s: string) => SEVERITIES_ORDERED.indexOf(s as never);
    for (const a of CLAUSE_FIXTURES) {
      for (const b of CLAUSE_FIXTURES) {
        if (sevIdx(a.severity) < sevIdx(b.severity)) {
          expect(a.toxicity).toBeLessThan(b.toxicity);
        }
      }
    }
  });
});

// ── classifyClauses: batch ────────────────────────────────────────────

describe('classifyClauses — batch', () => {
  it('returns one analysis per input', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });

    const texts = CLAUSE_FIXTURES.slice(0, 5).map((f) => f.text);
    const result = await classifyClauses({
      texts,
      conversationId: 'test',
    });

    expect(result.analyses).toHaveLength(5);
    expect(result.runtimeMode).toBe('mock');
  });

  it('reports `live` only when every sub-call succeeded', async () => {
    /* Simulate all 3 calls returning live JSON. */
    let counter = 0;
    vi.mocked(runModelCascade).mockImplementation(async () => {
      counter++;
      const fixture = CLAUSE_FIXTURES[counter - 1];
      return {
        ...MOCK_CASCADE_BASE,
        text: JSON.stringify({
          clauseType: fixture.clauseType,
          severity: fixture.severity,
          toxicity: fixture.toxicity,
          summary: fixture.summary,
          founderFriendlyAlternative: fixture.founderFriendlyAlternative,
        }),
      };
    });

    const result = await classifyClauses({
      texts: CLAUSE_FIXTURES.slice(0, 3).map((f) => f.text),
      conversationId: 'test',
    });
    expect(result.runtimeMode).toBe('live');
    expect(result.analyses).toHaveLength(3);
  });
});
