/**
 * `/api/deal-protection/dilution` — surface-contract tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/deal-protection/dilution — module surface', () => {
  it('exposes POST', async () => {
    const mod = await import('@/app/api/deal-protection/dilution/route');
    expect(typeof mod.POST).toBe('function');
  });
});

describe('/api/deal-protection/dilution — POST validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown, ip: string): Request {
    return new Request('http://localhost/api/deal-protection/dilution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('rejects an unparseable body with 400', async () => {
    const { POST } = await import('@/app/api/deal-protection/dilution/route');
    const res = await POST(makeReq('not-json', '8.8.8.1') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it('rejects a body missing initial cap table', async () => {
    const { POST } = await import('@/app/api/deal-protection/dilution/route');
    const res = await POST(makeReq({ rounds: [] }, '8.8.8.2') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it('rejects a body with > MAX_PROJECTION_ROUNDS rounds', async () => {
    const { POST } = await import('@/app/api/deal-protection/dilution/route');
    const round = {
      roundName: 'series_b',
      postMoneyGbp: 100_000_000,
      newInvestorPct: 20,
      esopTopUpPct: 0,
      preferredClass: 'series_b',
      antiDilutionType: 'weighted_average_broad',
      isDownRound: false,
    };
    const res = await POST(
      makeReq(
        {
          initial: {
            snapshotName: 'current',
            entries: [
              {
                holderId: 'founder',
                holderName: 'Founder',
                holderType: 'founder',
                shares: 6_000_000,
              },
            ],
            totalShares: 6_000_000,
            pricePerShare: 10,
            postMoneyGbp: 60_000_000,
          },
          rounds: [round, round, round, round, round, round],
        },
        '8.8.8.3',
      ) as never,
    );
    expect(res.status).toBe(400);
  });
});
