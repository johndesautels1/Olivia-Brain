/**
 * `/api/deal-protection/versioning` — surface-contract tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/deal-protection/versioning — module surface', () => {
  it('exposes POST', async () => {
    const mod = await import('@/app/api/deal-protection/versioning/route');
    expect(typeof mod.POST).toBe('function');
  });
});

describe('/api/deal-protection/versioning — POST validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown, ip: string): Request {
    return new Request('http://localhost/api/deal-protection/versioning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('rejects an unparseable body', async () => {
    const { POST } = await import('@/app/api/deal-protection/versioning/route');
    const res = await POST(makeReq('not-json', '11.11.11.4') as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing currentAnalysisId', async () => {
    const { POST } = await import('@/app/api/deal-protection/versioning/route');
    const res = await POST(makeReq({ priorAnalysisId: 'a' }, '11.11.11.5') as never);
    expect(res.status).toBe(400);
  });

  it('rejects identical prior + current ids', async () => {
    const { POST } = await import('@/app/api/deal-protection/versioning/route');
    const res = await POST(
      makeReq(
        { priorAnalysisId: 'same-id', currentAnalysisId: 'same-id' },
        '11.11.11.6',
      ) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/must differ/i);
  });
});
