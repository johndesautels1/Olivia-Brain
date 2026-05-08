/**
 * `/api/deal-protection/rehearsal` — surface-contract tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/deal-protection/rehearsal — module surface', () => {
  it('exposes POST', async () => {
    const mod = await import('@/app/api/deal-protection/rehearsal/route');
    expect(typeof mod.POST).toBe('function');
  });
});

describe('/api/deal-protection/rehearsal — POST validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown, ip: string): Request {
    return new Request('http://localhost/api/deal-protection/rehearsal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('rejects an unparseable body', async () => {
    const { POST } = await import('@/app/api/deal-protection/rehearsal/route');
    const res = await POST(makeReq('not-json', '11.11.11.1') as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing dealAnalysisId', async () => {
    const { POST } = await import('@/app/api/deal-protection/rehearsal/route');
    const res = await POST(makeReq({ founderTurn: 'hi' }, '11.11.11.2') as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing founderTurn', async () => {
    const { POST } = await import('@/app/api/deal-protection/rehearsal/route');
    const res = await POST(makeReq({ dealAnalysisId: 'abc' }, '11.11.11.3') as never);
    expect(res.status).toBe(400);
  });
});
