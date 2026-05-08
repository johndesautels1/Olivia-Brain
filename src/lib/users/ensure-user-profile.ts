/**
 * `ensureUserProfile` — lookup-or-create a `UserProfile` row for a
 * Clerk user.
 *
 * The first time a Clerk-authenticated user does anything user-scoped
 * (bookmark a document, fork a template, save an item, etc.), OB
 * creates their `UserProfile` row keyed off `clerkUserId`. Idempotent
 * on `clerkUserId`'s unique constraint — concurrent first-touches
 * race-safely converge on a single row via the upsert pattern.
 *
 * **Today's `displayName`** is a placeholder set to the Clerk userId
 * itself (`user_2x...` or the dev `STUB_USER_ID` value). Future Clerk
 * webhook integration (Track F follow-up or its own session) will
 * hydrate `displayName` + `headline` + `bio` + the rest from Clerk's
 * user data on profile-create and profile-update events. Until then,
 * the placeholder is good enough for FK pressure (the column is
 * `NOT NULL`) without leaking PII.
 *
 * Used by:
 *   - `/api/documents/bookmark` (Track B Session 8d) — bookmarks need
 *     a real `userProfileId` to FK to.
 *
 * Future consumers will use this same helper rather than each
 * implementing their own lookup-or-create.
 */

import prisma from "@/lib/db/client";

export async function ensureUserProfile(
  clerkUserId: string,
): Promise<{ id: string }> {
  const existing = await prisma.userProfile.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  if (existing) return existing;

  // Race-safe via upsert — if a concurrent request created the row
  // between our findUnique and create, the unique constraint on
  // clerkUserId routes both callers to the same row.
  const profile = await prisma.userProfile.upsert({
    where: { clerkUserId },
    create: {
      clerkUserId,
      displayName: clerkUserId,
    },
    update: {},
    select: { id: true },
  });

  return profile;
}
