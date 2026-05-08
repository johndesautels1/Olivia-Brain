// src/lib/auth/session.ts
//
// Track F Session 18 — Clerk wired (closes W-015).
//
// `getAuthSession()` is the single auth surface every route handler calls.
// The route-side shape (`{ userId } = await getAuthSession()`) is stable;
// 78 callsites across calendar / founder-intake / valuation / deal-protection
// / admin-investors / olivia-* routes inherit Clerk transparently — no route
// code had to change.
//
// Resolution order:
//   1. Real Clerk auth when `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
//      are both set. Production / Preview deployments configure these on Vercel
//      (Production + Preview only, marked Sensitive — see `~/CLAUDE.md`).
//   2. `STUB_USER_ID` env-var fallback in dev / preview / test when Clerk is
//      unconfigured. Lets contributors run `npm run dev` and `npm test` without
//      provisioning Clerk locally; tests don't go through Next middleware so
//      `auth()` would not have a request context anyway.
//   3. Hard throw in production when neither resolution path applies, so a
//      route can never ship auth-less by accident.

import { auth } from "@clerk/nextjs/server";

const HAS_CLERK = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export interface AuthSession {
  userId: string | null;
}

/**
 * Returns the current auth session. See file-level comment for resolution order.
 *
 * - Clerk path returns `{ userId: string | null }` exactly as Clerk reports it
 *   (null = unauthenticated request, callers MUST check before persisting).
 * - Stub path always returns a non-null `userId` (the env value), since the
 *   stub treats any non-production caller with `STUB_USER_ID` set as logged in.
 */
export async function getAuthSession(): Promise<AuthSession> {
  if (HAS_CLERK) {
    const { userId } = await auth();
    return { userId };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[auth/session] CLERK_SECRET_KEY + NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY required in production. Set them on Vercel (Production + Preview, marked Sensitive). See README W-015."
    );
  }

  const stubUserId = process.env.STUB_USER_ID;
  if (!stubUserId) {
    throw new Error(
      "[auth/session] STUB_USER_ID env var is required for non-production runs when Clerk is unconfigured. Set it to a UUID matching a row in your dev database (or any string for routes that don't hit user-scoped tables). See README W-015."
    );
  }

  return { userId: stubUserId };
}
