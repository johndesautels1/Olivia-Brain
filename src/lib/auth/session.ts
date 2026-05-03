// src/lib/auth/session.ts
//
// Clerk auth STUB. Replaced by `import { auth } from "@clerk/nextjs/server"`
// when Clerk lands in Track F Session 18. Tracked as W-015 in README.
//
// API routes call `await getAuthSession()` instead of Clerk's `auth()` so
// the swap-out is a one-line change per call site (just change the body of
// this function — route code stays identical).
//
// **No silent failures.** In dev, requires `STUB_USER_ID` env var to be set.
// Throws a clear error if missing, so a developer can't accidentally ship
// auth-less routes that look authorized.
//
// In production (NODE_ENV === "production"), refuses to run at all — once
// Clerk is wired the body of this file changes to call Clerk's `auth()`
// directly; until then, production routes that need auth must not deploy.

export interface AuthSession {
  userId: string | null;
}

/**
 * Returns the current auth session. Stub behavior:
 *   - dev / preview: reads STUB_USER_ID env var, throws if unset
 *   - production: throws unconditionally (route should not be live yet)
 *
 * When Clerk lands, replace the body with:
 *   const { userId } = await auth();
 *   return { userId };
 */
export async function getAuthSession(): Promise<AuthSession> {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[auth/session] getAuthSession() is a Clerk stub. Production deployment requires Clerk integration (Track F Session 18). See README W-015."
    );
  }

  const stubUserId = process.env.STUB_USER_ID;
  if (!stubUserId) {
    throw new Error(
      "[auth/session] STUB_USER_ID env var is required for non-production. Set it to a UUID matching a row in your dev database (or any string for routes that don't hit user-scoped tables). See README W-015."
    );
  }

  return { userId: stubUserId };
}
