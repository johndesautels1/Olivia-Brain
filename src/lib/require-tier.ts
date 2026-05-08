/**
 * Tier-gated route protection — **server-only** auth helpers.
 *
 * **Pre-Clerk shape (Track F Session 18 lands the real Clerk integration).**
 *
 * Wraps `getAuthSession()` from `@/lib/auth/session` (the C4 STUB_USER_ID
 * stub). In Preview/dev with `STUB_USER_ID` set, every authenticated caller
 * is treated as `executive`-tier authorised — high enough for every gate
 * Track V's API routes apply. In Production with no Clerk, `getAuthSession`
 * throws, so this function returns 401, which is the correct behaviour for
 * a yet-unauthorised production deploy.
 *
 * When Track F lands Clerk + UserProfile + PlanTier, replace the body with
 * a real `prisma.userProfile.findUnique` lookup keyed off the Clerk user ID,
 * resolve the planTier, and run the standard `tierAtLeast` comparison. The
 * exported shape (`PlanTier`, `tierAtLeast`, `TIER_METADATA`,
 * `TierCheckResult`, `requireTier`, `getUserTier`) is stable and matches
 * the LTM contract so route code does not need to change.
 *
 * The `featureName` parameter is preserved for symmetry with LTM and is used
 * in error messages once tier enforcement turns on.
 *
 * **Server-only.** This file imports from `@/lib/auth/session` which
 * pulls `@clerk/nextjs/server`. Importing it from a client component
 * fails the Next.js build. Pure types + helpers (`PlanTier`,
 * `TIER_METADATA`, `tierAtLeast`, `TIER_DISPLAY_NAMES`) live in
 * `@/types/plan-tier` instead — client components import from there.
 */

import "server-only";

import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth/session";
import {
  TIER_METADATA,
  tierAtLeast,
  type PlanTier,
} from "@/types/plan-tier";

// Re-export the pure types/helpers so existing server callers that
// imported from `@/lib/require-tier` keep working.
export { TIER_METADATA, tierAtLeast };
export type { PlanTier };

export type TierCheckResult =
  | {
      authorized: true;
      userId: string;
      profileId: string;
      userTier: PlanTier;
      isAdmin: boolean;
    }
  | { authorized: false; response: NextResponse };

export async function requireTier(
  _requiredTier: PlanTier,
  _featureName?: string,
): Promise<TierCheckResult> {
  let userId: string;
  try {
    const session = await getAuthSession();
    if (!session.userId) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Unauthorized", code: "UNAUTHENTICATED" },
          { status: 401 },
        ),
      };
    }
    userId = session.userId;
  } catch {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHENTICATED" },
        { status: 401 },
      ),
    };
  }

  // Pre-Clerk: every authenticated caller is treated as executive-tier
  // authorised (the highest tier any V7 route asks for). Track F replaces
  // this body with a real UserProfile.planTier lookup + tierAtLeast check.
  return {
    authorized: true,
    userId,
    profileId: userId,
    userTier: "executive",
    isAdmin: true,
  };
}

export async function getUserTier(): Promise<PlanTier> {
  try {
    await getAuthSession();
    return "executive";
  } catch {
    return "free";
  }
}
