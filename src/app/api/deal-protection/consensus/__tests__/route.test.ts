/**
 * `/api/deal-protection/consensus` — surface-contract tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/deal-protection/consensus — module surface', () => {
  it('exposes POST', async () => {
    const mod = await import('@/app/api/deal-protection/consensus/route');
    expect(typeof mod.POST).toBe('function');
  });
});

describe('/api/deal-protection/consensus — POST validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown, ip: string): Request {
    return new Request('http://localhost/api/deal-protection/consensus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('rejects an unparseable body', async () => {
    const { POST } = await import('@/app/api/deal-protection/consensus/route');
    const res = await POST(makeReq('not-json', '11.11.11.7') as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing dealAnalysisId', async () => {
    const { POST } = await import('@/app/api/deal-protection/consensus/route');
    const res = await POST(makeReq({}, '11.11.11.8') as never);
    expect(res.status).toBe(400);
  });

  it('rejects evaluatorCount > 5', async () => {
    const { POST } = await import('@/app/api/deal-protection/consensus/route');
    const res = await POST(
      makeReq({ dealAnalysisId: 'abc', evaluatorCount: 99 }, '11.11.11.9') as never,
    );
    expect(res.status).toBe(400);
  });
});
