/**
 * `/api/deal-protection/email-draft` — surface-contract tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/deal-protection/email-draft — module surface', () => {
  it('exposes POST', async () => {
    const mod = await import('@/app/api/deal-protection/email-draft/route');
    expect(typeof mod.POST).toBe('function');
  });
});

describe('/api/deal-protection/email-draft — POST validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown, ip: string): Request {
    return new Request('http://localhost/api/deal-protection/email-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('rejects an unparseable body with 400', async () => {
    const { POST } = await import('@/app/api/deal-protection/email-draft/route');
    const res = await POST(makeReq('not-json', '9.9.9.1') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it('rejects a missing dealAnalysisId', async () => {
    const { POST } = await import('@/app/api/deal-protection/email-draft/route');
    const res = await POST(makeReq({}, '9.9.9.2') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });
});
