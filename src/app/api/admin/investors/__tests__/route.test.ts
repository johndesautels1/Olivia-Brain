/**
 * `/api/admin/investors` — admin CRUD surface-contract tests.
 *
 * Validation branches that return BEFORE Prisma is hit (and one
 * happy-path 401 when the auth stub is unset). Persistence-level
 * coverage lives in the integration tests once Clerk lands.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/admin/investors — module surfaces', () => {
  it('exposes GET + POST on /api/admin/investors', async () => {
    const mod = await import('@/app/api/admin/investors/route');
    expect(typeof mod.GET).toBe('function');
    expect(typeof mod.POST).toBe('function');
  });

  it('exposes PATCH + DELETE on /api/admin/investors/[id]', async () => {
    const mod = await import('@/app/api/admin/investors/[id]/route');
    expect(typeof mod.PATCH).toBe('function');
    expect(typeof mod.DELETE).toBe('function');
  });

  it('exposes POST on /api/admin/investors/seed', async () => {
    const mod = await import('@/app/api/admin/investors/seed/route');
    expect(typeof mod.POST).toBe('function');
  });

  it('exposes GET + PATCH on /api/admin/investors/moderation', async () => {
    const mod = await import('@/app/api/admin/investors/moderation/route');
    expect(typeof mod.GET).toBe('function');
    expect(typeof mod.PATCH).toBe('function');
  });
});

describe('/api/admin/investors — POST validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown, ip: string): Request {
    return new Request('http://localhost/api/admin/investors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('rejects an unparseable body with 400', async () => {
    const { POST } = await import('@/app/api/admin/investors/route');
    const res = await POST(makeReq('not-json', '6.6.6.1') as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it('rejects a body with bad shape', async () => {
    const { POST } = await import('@/app/api/admin/investors/route');
    const res = await POST(
      makeReq({ name: 'A', investorType: 'not_a_type' }, '6.6.6.2') as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it('rejects an empty/symbol-only name (slug would be empty)', async () => {
    const { POST } = await import('@/app/api/admin/investors/route');
    const res = await POST(
      makeReq(
        {
          name: '!!',
          investorType: 'vc',
          reputationScore: 60,
          reputationBand: 'blue',
        },
        '6.6.6.3',
      ) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    /* Either Zod min(2) or slug emptiness — both surface as a 400. */
    expect(data.error).toMatch(/(slug|alphanumeric|Validation failed)/i);
  });
});

describe('/api/admin/investors/[id] — PATCH validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects an empty patch body', async () => {
    const { PATCH } = await import('@/app/api/admin/investors/[id]/route');
    const req = new Request('http://localhost/api/admin/investors/abc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '6.6.6.4' },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/at least one field/i);
  });
});

describe('/api/admin/investors/moderation — PATCH validation', () => {
  beforeEach(() => {
    vi.stubEnv('STUB_USER_ID', '00000000-0000-0000-0000-000000000001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects an unknown action', async () => {
    const { PATCH } = await import('@/app/api/admin/investors/moderation/route');
    const req = new Request('http://localhost/api/admin/investors/moderation', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '6.6.6.5' },
      body: JSON.stringify({ id: 'abc', action: 'nuke' }),
    });
    const res = await PATCH(req as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });
});

describe('/api/admin/investors — auth guard', () => {
  /* When STUB_USER_ID is absent in non-prod, the auth stub throws. */
  it('returns 503 when the auth stub env var is missing', async () => {
    vi.unstubAllEnvs();
    /* Force NODE_ENV to anything other than "production" so we go
       down the "STUB_USER_ID required" branch rather than the prod
       branch. */
    vi.stubEnv('NODE_ENV', 'development');

    const { POST } = await import('@/app/api/admin/investors/route');
    const req = new Request('http://localhost/api/admin/investors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '6.6.6.6' },
      body: JSON.stringify({
        name: 'Sample',
        investorType: 'vc',
        reputationScore: 60,
        reputationBand: 'blue',
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(503);
    vi.unstubAllEnvs();
  });
});
