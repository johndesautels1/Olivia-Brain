/**
 * `/api/deal-protection/analyze` — surface-contract tests.
 *
 * Covers validation branches that return BEFORE Prisma is hit. Cascade
 * orchestration + happy-path persistence are covered in
 * `src/lib/deal-protection/__tests__/analyze.test.ts`.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Pre-warm the route module so per-test cold-start (Prisma + Zod +
// auth + rate-limit) doesn't hit the per-test 15s timeout on first
// import. Same pattern as `src/app/api/admin/avatar-eval/runs/__tests__/route.test.ts`.
beforeAll(async () => {
  await import('@/app/api/deal-protection/analyze/route');
}, 60_000);

describe('/api/deal-protection/analyze — module surface', () => {
  it('exposes POST', async () => {
    const mod = await import('@/app/api/deal-protection/analyze/route');
    expect(typeof mod.POST).toBe('function');
  });
});

describe('/api/deal-protection/analyze — POST validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown, ip = '5.5.5.5'): Request {
    return new Request('http://localhost/api/deal-protection/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('rejects an unparseable body with 400', async () => {
    const { POST } = await import('@/app/api/deal-protection/analyze/route');
    const res = await POST(makeReq('not-json', '5.5.5.5') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it('rejects a missing subjectId with 400', async () => {
    const { POST } = await import('@/app/api/deal-protection/analyze/route');
    const res = await POST(
      makeReq({ termSheetText: 'a'.repeat(60) }, '5.5.5.6') as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/subjectId is required/i);
  });

  it('rejects a missing termSheetText with 400', async () => {
    const { POST } = await import('@/app/api/deal-protection/analyze/route');
    const res = await POST(makeReq({ subjectId: 'abc' }, '5.5.5.7') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/termSheetText is required/i);
  });

  it('rejects a too-short termSheetText with 400', async () => {
    const { POST } = await import('@/app/api/deal-protection/analyze/route');
    const res = await POST(
      makeReq({ subjectId: 'abc', termSheetText: 'too short' }, '5.5.5.8') as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/at least \d+ characters/i);
  });
});
