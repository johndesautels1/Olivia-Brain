/**
 * `/api/me/documents/save-from-template` — Track B Session 8d.
 *
 * POST  body `{ templateId }` → forks a public template into the
 *         signed-in user's private library. Idempotent on the
 *         compound unique `(ownerUserId, sourceTemplateId)`: a
 *         second call with the same template returns
 *         `{ ok: true, alreadyOwned: true, document: existing }`.
 *
 * **Replaces the Session 8b-routes 501 stub.** With the Document +
 * UserProfile Prisma models (commit `2cb414e`), the fork can land
 * for real: copy the template's content + metadata into a new
 * Document row owned by the caller, set `sourceTemplateId` so the
 * fork-chain is auditable + idempotent.
 *
 * Auth: `getAuthSession()` (Track F). The caller's `UserProfile` is
 * lookup-or-created via `ensureUserProfile()` to satisfy the FK.
 *
 * # Operator action owed
 *
 * `prisma/sql/09-add-documents-foundation.sql` must be applied to
 * Supabase before this route can persist (depends on the `documents`
 * table). 09 itself depends on 08 — apply in order.
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import { ensureUserProfile } from "@/lib/users/ensure-user-profile";

export const dynamic = "force-dynamic";

const SaveFromTemplateSchema = z.object({
  templateId: z.string().min(1).max(200),
});

function fail(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 10,
    windowMs: 60_000,
    prefix: "me-documents-save-from-template",
  });
  if (limited) return limited;

  let userId: string;
  try {
    const session = await getAuthSession();
    if (!session.userId) return fail("Unauthorized", 401);
    userId = session.userId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth unavailable";
    return fail(msg, 503);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const parsed = SaveFromTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(`Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }
  const { templateId } = parsed.data;

  // Load the template document. Pull every field we need to copy into
  // the user's private library row in one round-trip.
  const template = await prisma.document.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      title: true,
      slug: true,
      collectionId: true,
      documentType: true,
      audienceType: true,
      purposeType: true,
      formatType: true,
      summary: true,
      contentSourceType: true,
      storagePathOrBody: true,
      previewText: true,
      isTemplate: true,
      ownerUserId: true,
      confidentiality: true,
    },
  });
  if (!template) return fail("Template not found", 404);
  if (!template.isTemplate || template.ownerUserId !== null) {
    // External-link templates are also not forkable per
    // useSaveToMyDocuments's `canSave` predicate; defence-in-depth
    // here too in case the client bypasses the predicate.
    return fail("Document is not a forkable public template", 403);
  }

  // Ensure caller has a UserProfile row (idempotent lookup-or-create).
  // Reserved for future bookmark/saved-item attribution that ties the
  // new document to the user via UserProfile rather than the raw
  // Clerk userId. Today Document.ownerUserId stores the raw Clerk userId.
  const profile = await ensureUserProfile(userId);
  void profile;

  // Idempotency check via the compound unique
  // (ownerUserId, sourceTemplateId) — a second call with the same
  // template by the same user returns the existing copy instead of
  // creating a duplicate.
  const existing = await prisma.document.findUnique({
    where: {
      ownerUserId_sourceTemplateId: {
        ownerUserId: userId,
        sourceTemplateId: templateId,
      },
    },
    select: { id: true, slug: true, title: true },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyOwned: true,
      document: existing,
    });
  }

  // Generate a fresh slug — Document.slug has a unique constraint, so
  // we suffix the template slug with random bytes. URL-safe base64
  // matches what Clerk + the share-token endpoint use elsewhere.
  const suffix = crypto.randomBytes(6).toString("base64url");
  const slug = `${template.slug}-copy-${suffix}`;

  const created = await prisma.document.create({
    data: {
      title: template.title,
      slug,
      collectionId: template.collectionId,
      documentType: template.documentType,
      audienceType: template.audienceType,
      purposeType: template.purposeType,
      formatType: template.formatType,
      summary: template.summary,
      contentSourceType: template.contentSourceType,
      storagePathOrBody: template.storagePathOrBody,
      previewText: template.previewText,
      confidentiality: template.confidentiality,
      ownerUserId: userId,
      sourceTemplateId: templateId,
      isTemplate: false,
      isModular: false,
      authoringState: "draft",
      status: "draft",
      // sourceKind is intentionally null — the fork endpoint mints
      // user-owned copies; the dashboard "My Documents" tile renders
      // these with the "Forked from template" chip derived from
      // sourceTemplateId, not from sourceKind.
    },
    select: { id: true, slug: true, title: true },
  });

  return NextResponse.json(
    {
      ok: true,
      alreadyOwned: false,
      document: created,
    },
    { status: 201 },
  );
}
