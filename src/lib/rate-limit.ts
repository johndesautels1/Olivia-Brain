/**
 * Minimal in-memory rate limiter.
 *
 * Single-server only — at multi-instance scale, swap to Upstash Redis or similar.
 * Used to gate paid-vendor endpoints (LiveAvatar, ElevenLabs) so accidental
 * loops / unauthenticated bursts don't drain credits.
 *
 * Returns a NextResponse if the request is rate-limited, or null if allowed.
 */

import { NextRequest, NextResponse } from "next/server";

interface BucketEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketEntry>();

interface RateLimitOptions {
  limit: number;
  windowMs: number;
  prefix: string;
}

function clientId(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anonymous";
}

export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): NextResponse | null {
  const { limit, windowMs, prefix } = options;
  const id = clientId(request);
  const key = `${prefix}:${id}`;
  const now = Date.now();

  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (entry.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
        },
      },
    );
  }

  entry.count += 1;
  return null;
}

/**
 * Pre-Clerk admin gate: requires `Authorization: Bearer <ADMIN_API_KEY>`.
 * Returns a NextResponse 401 if rejected, or null if allowed.
 *
 * TODO(week-1): Replace with `auth()` from @clerk/nextjs/server once Clerk is wired.
 */
export function requireAdminKey(request: NextRequest): NextResponse | null {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== adminKey) {
    return NextResponse.json(
      { error: "Sign in required for video avatar mode" },
      { status: 401 },
    );
  }

  return null;
}
