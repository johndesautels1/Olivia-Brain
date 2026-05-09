/**
 * `/api/deal-protection/counter-draft` — surface-contract tests.
 *
 * Validation branches that return BEFORE Prisma is hit. Cascade
 * orchestration + persistence are covered in the lib-level tests.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Pre-warm both route modules so per-test cold-start (Prisma + Zod +
// auth + rate-limit) doesn't hit the per-test 15s timeout on first
// import. Same pattern as `src/app/api/admin/avatar-eval/runs/__tests__/route.test.ts`.
beforeAll(async () => {
  await import('@/app/api/deal-protection/counter-draft/route');
  await import('@/app/api/deal-protection/counter-draft/[id]/route');
}, 60_000);

describe('/api/deal-protection/counter-draft — module surfaces', () => {
  it('exposes POST + GET on the collection route', async () => {
    const mod = await import('@/app/api/deal-protection/counter-draft/route');
    expect(typeof mod.POST).toBe('function');
    expect(typeof mod.GET).toBe('function');
  });

  it('exposes GET + PATCH on the [id] route', async () => {
    const mod = await import('@/app/api/deal-protection/counter-draft/[id]/route');
    expect(typeof mod.GET).toBe('function');
    expect(typeof mod.PATCH).toBe('function');
  });
});

describe('/api/deal-protection/counter-draft — POST validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown, ip: string): Request {
    return new Request('http://localhost/api/deal-protection/counter-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('rejects an unparseable body with 400', async () => {
    const { POST } = await import('@/app/api/deal-protection/counter-draft/route');
    const res = await POST(makeReq('not-json', '10.10.10.1') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it('rejects a missing dealAnalysisId with 400', async () => {
    const { POST } = await import('@/app/api/deal-protection/counter-draft/route');
    const res = await POST(makeReq({}, '10.10.10.2') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });
});

describe('/api/deal-protection/counter-draft — GET validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects a missing dealAnalysisId with 400', async () => {
    const { GET } = await import('@/app/api/deal-protection/counter-draft/route');
    const { NextRequest } = await import('next/server');
    const req = new NextRequest(
      'http://localhost/api/deal-protection/counter-draft',
      { headers: { 'x-forwarded-for': '10.10.10.3' } },
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/dealAnalysisId is required/i);
  });
});

describe('/api/deal-protection/counter-draft/[id] — PATCH validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects an empty patch body with 400', async () => {
    const { PATCH } = await import('@/app/api/deal-protection/counter-draft/[id]/route');
    const req = new Request('http://localhost/api/deal-protection/counter-draft/abc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.10.10.4' },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/at least one field/i);
  });

  it('rejects an unparseable body', async () => {
    const { PATCH } = await import('@/app/api/deal-protection/counter-draft/[id]/route');
    const req = new Request('http://localhost/api/deal-protection/counter-draft/abc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.10.10.5' },
      body: 'not-json',
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
  });
});
