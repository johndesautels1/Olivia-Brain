/**
 * `/api/deal-protection/investor-submission` — surface-contract tests.
 */
import { describe, expect, it } from 'vitest';

describe('/api/deal-protection/investor-submission — module surface', () => {
  it('exposes POST', async () => {
    const mod = await import('@/app/api/deal-protection/investor-submission/route');
    expect(typeof mod.POST).toBe('function');
  });
});

describe('/api/deal-protection/investor-submission — POST validation', () => {
  function makeReq(body: unknown, ip: string): Request {
    return new Request(
      'http://localhost/api/deal-protection/investor-submission',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      },
    );
  }

  it('rejects an unparseable body with 400', async () => {
    const { POST } = await import('@/app/api/deal-protection/investor-submission/route');
    const res = await POST(makeReq('not-json', '7.7.7.1') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it('rejects a body missing required fields', async () => {
    const { POST } = await import('@/app/api/deal-protection/investor-submission/route');
    const res = await POST(makeReq({ name: 'Acme' }, '7.7.7.2') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it('rejects an out-of-range reputationScore', async () => {
    const { POST } = await import('@/app/api/deal-protection/investor-submission/route');
    const res = await POST(
      makeReq(
        {
          name: 'Acme Capital',
          investorType: 'vc',
          reputationScore: 150,
          reputationBand: 'green',
        },
        '7.7.7.3',
      ) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });
});
