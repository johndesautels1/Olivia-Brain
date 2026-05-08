/**
 * `/api/founder-intake/personas` — surface-contract tests.
 *
 * Covers validation branches that return BEFORE Prisma is hit.
 * Cascade orchestration + happy-path persistence are covered in
 * `src/lib/quantara/personas/__tests__/synthesize.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/founder-intake/personas — module surface', () => {
  it('exposes POST + GET', async () => {
    const mod = await import('@/app/api/founder-intake/personas/route');
    expect(typeof mod.POST).toBe('function');
    expect(typeof mod.GET).toBe('function');
  });
});

describe('/api/founder-intake/personas — POST validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown): Request {
    return new Request('http://localhost/api/founder-intake/personas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '3.3.3.3',
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('rejects an empty body with 400', async () => {
    const { POST } = await import('@/app/api/founder-intake/personas/route');
    const res = await POST(makeReq('not-json') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it('rejects a missing subjectId with 400', async () => {
    const { POST } = await import('@/app/api/founder-intake/personas/route');
    const res = await POST(makeReq({}) as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/subjectId is required/i);
  });
});

describe('/api/founder-intake/personas — GET validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects a missing subjectId with 400', async () => {
    const { GET } = await import('@/app/api/founder-intake/personas/route');
    /* NextRequest carries `.nextUrl` so the handler's
       `request.nextUrl.searchParams.get(...)` resolves cleanly. */
    const { NextRequest } = await import('next/server');
    const req = new NextRequest(
      'http://localhost/api/founder-intake/personas',
      {
        headers: { 'x-forwarded-for': '4.4.4.4' },
      },
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/subjectId is required/i);
  });
});
