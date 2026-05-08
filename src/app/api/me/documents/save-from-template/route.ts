/**
 * `/api/me/documents/save-from-template` — Track B Session 8b-routes.
 *
 * POST  Body `{ templateId }` → fork a public template into the
 *         signed-in user's private library.
 *
 * **Stub returning 501 Not Implemented.** Forking requires creating a
 * new private `Document` row that copies the template's content,
 * blocks, and metadata. OB does not have a `Document` Prisma model
 * yet — that ports in Session 8d alongside the documents app routes.
 * The stub returns a structured 501 with a clear message so
 * `useSaveToMyDocuments` surfaces the gap to the user without
 * masquerading as a transient error.
 *
 * When Session 8d lands, replace the stub body with the actual fork:
 * load the template, deny if not `isTemplate || ownerUserId == null`,
 * insert a new Document with `ownerUserId = session.userId` and
 * `forkedFromTemplateId = templateId`, return `{ ok, alreadyOwned,
 * document: { id, slug, title } }`.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

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

  let session;
  try {
    session = await getAuthSession();
    if (!session.userId) return fail("Unauthorized", 401);
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

  return NextResponse.json(
    {
      ok: false,
      error:
        "Save to My Documents requires the Document Prisma model, which ships in Track B Session 8d. The fork endpoint is not yet wired.",
      pendingSession: "8d",
    },
    { status: 501 },
  );
}
