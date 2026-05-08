/**
 * `/api/founder-intake/voice-extract` — surface-contract tests.
 *
 * Covers the validation branches that return BEFORE the cascade is hit
 * (no DB, no Prisma) so the suite stays fast + deterministic. The
 * happy-path cascade integration is covered in
 * `src/lib/quantara/voice/__tests__/extract.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/founder-intake/voice-extract — module surface', () => {
  it('exposes POST', async () => {
    const mod = await import('@/app/api/founder-intake/voice-extract/route');
    expect(typeof mod.POST).toBe('function');
  });
});

describe('/api/founder-intake/voice-extract — validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown): Request {
    return new Request('http://localhost/api/founder-intake/voice-extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '2.2.2.2',
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('rejects an empty body with 400', async () => {
    const { POST } = await import('@/app/api/founder-intake/voice-extract/route');
    const res = await POST(makeReq('not-json') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it('rejects a too-short transcript with 400', async () => {
    const { POST } = await import('@/app/api/founder-intake/voice-extract/route');
    const res = await POST(makeReq({ transcript: 'hi' }) as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/transcript must be at least/i);
  });

  it('rejects a too-long transcript with 400', async () => {
    const { POST } = await import('@/app/api/founder-intake/voice-extract/route');
    const res = await POST(
      makeReq({ transcript: 'x'.repeat(5000) }) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/transcript must be at most/i);
  });

  it('rejects type-mismatched currentValues via the Q1 schema', async () => {
    const { POST } = await import('@/app/api/founder-intake/voice-extract/route');
    const res = await POST(
      makeReq({
        transcript: 'Our ARR is 2.4 million pounds.',
        currentValues: { f1: 'not a number' },
      }) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid currentValues/i);
  });
});
