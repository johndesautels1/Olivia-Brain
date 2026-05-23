import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// ─── Auth Helper ───────────────────────────────────────────────────────────────

// Returns a typed `{ userId }` on success or a fully-formed NextResponse on
// failure (401 unauthenticated / 503 auth-misconfigured). Mirrors the canonical
// `requireAdmin()` pattern in `src/app/api/admin/investors/route.ts` so the
// auth call never leaks an uncaught throw to the Next.js runtime — that would
// surface as a generic 500 with the underlying error message in the body,
// violating the 2026 "no silent failure / actionable errors at every
// boundary" bar. STUB_USER_ID unset in dev/test now returns 503 with the
// throw message; missing Clerk session in production returns 401.
//
// Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`
// directly (not a UserProfile FK), so the returned `userId` is the canonical
// owner key for OliviaConsent rows. Kept the helper name for minimal churn.
async function requireUserOrResponse(): Promise<
  { userId: string } | NextResponse
> {
  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return { userId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const consentTypes = ["data_storage", "ai_processing", "learning"] as const;
type ConsentType = (typeof consentTypes)[number];

const grantConsentSchema = z.object({
  consentTypes: z.array(z.enum(consentTypes)).min(1),
  consentVersion: z.string().optional().default("1.0"),
});

const revokeConsentSchema = z.object({
  consentTypes: z.array(z.enum(consentTypes)).min(1),
});

// ─── GET: Check user's consent status ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "olivia-consent" });
  if (limited) return limited;

  const auth = await requireUserOrResponse();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const consents = await prisma.oliviaConsent.findMany({
      where: { userId },
      select: {
        consentType: true,
        consentVersion: true,
        granted: true,
        grantedAt: true,
        revokedAt: true,
      },
    });

    // Build a map of consent status
    const consentStatus: Record<ConsentType, {
      granted: boolean;
      version: string;
      grantedAt: string | null;
      revokedAt: string | null;
    }> = {
      data_storage: { granted: false, version: "1.0", grantedAt: null, revokedAt: null },
      ai_processing: { granted: false, version: "1.0", grantedAt: null, revokedAt: null },
      learning: { granted: false, version: "1.0", grantedAt: null, revokedAt: null },
    };

    for (const consent of consents) {
      const type = consent.consentType as ConsentType;
      if (consentStatus[type]) {
        consentStatus[type] = {
          granted: consent.granted,
          version: consent.consentVersion,
          grantedAt: consent.grantedAt.toISOString(),
          revokedAt: consent.revokedAt?.toISOString() || null,
        };
      }
    }

    // Check if user has granted the minimum required consent (data_storage)
    const hasMinimumConsent = consentStatus.data_storage.granted;

    return NextResponse.json({
      hasMinimumConsent,
      consents: consentStatus,
    });
  } catch (err) {
    console.error("[olivia/consent] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch consent status" }, { status: 500 });
  }
}

// ─── POST: Grant consent ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: "olivia-consent" });
  if (limited) return limited;

  const auth = await requireUserOrResponse();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Parse JSON outside the DB-error try/catch so a malformed body returns a
  // clean 400 with "Invalid JSON body" rather than the catch-all 500 with
  // "Failed to grant consent" (which buried the parse error and was caught
  // by the consent surface-contract tests in `__tests__/route.test.ts`).
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const validated = grantConsentSchema.safeParse(rawBody);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { consentTypes: typesToGrant, consentVersion } = validated.data;

    // Get IP and user agent for audit trail
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] ||
                      req.headers.get("x-real-ip") ||
                      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Upsert consent records
    const results = await Promise.all(
      typesToGrant.map((consentType) =>
        prisma.oliviaConsent.upsert({
          where: {
            userId_consentType: {
              userId,
              consentType,
            },
          },
          update: {
            granted: true,
            consentVersion,
            grantedAt: new Date(),
            revokedAt: null,
            ipAddress,
            userAgent,
          },
          create: {
            userId,
            consentType,
            consentVersion,
            granted: true,
            ipAddress,
            userAgent,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      granted: results.map((r) => r.consentType),
    });
  } catch (err) {
    console.error("[olivia/consent] POST error:", err);
    return NextResponse.json({ error: "Failed to grant consent" }, { status: 500 });
  }
}

// ─── DELETE: Revoke consent ────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: "olivia-consent" });
  if (limited) return limited;

  const auth = await requireUserOrResponse();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Parse JSON outside the DB-error try/catch (see POST handler for rationale).
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const validated = revokeConsentSchema.safeParse(rawBody);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { consentTypes: typesToRevoke } = validated.data;

    // Update consent records to revoked
    await Promise.all(
      typesToRevoke.map((consentType) =>
        prisma.oliviaConsent.updateMany({
          where: {
            userId,
            consentType,
          },
          data: {
            granted: false,
            revokedAt: new Date(),
          },
        })
      )
    );

    // If revoking data_storage, also delete all user's Olivia data (GDPR right to erasure)
    if (typesToRevoke.includes("data_storage")) {
      // Delete all conversations (messages cascade delete)
      await prisma.oliviaConversation.deleteMany({
        where: { userId },
      });

      // Delete all presentations
      await prisma.oliviaPresentation.deleteMany({
        where: { userId },
      });

      // Note: OliviaUserMemory will be added in Layer 3
    }

    return NextResponse.json({
      success: true,
      revoked: typesToRevoke,
      dataDeleted: typesToRevoke.includes("data_storage"),
    });
  } catch (err) {
    console.error("[olivia/consent] DELETE error:", err);
    return NextResponse.json({ error: "Failed to revoke consent" }, { status: 500 });
  }
}
