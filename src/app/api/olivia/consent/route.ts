import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// ─── Auth Helper ───────────────────────────────────────────────────────────────

// Replaced for Olivia Brain — userId IS the canonical user ID directly
// (Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`,
// not a UserProfile FK). Kept the function name for minimal call-site churn.
async function getUserProfileId(): Promise<string | null> {
  const { userId } = await getAuthSession();
  return userId;
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

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = grantConsentSchema.safeParse(body);

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

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = revokeConsentSchema.safeParse(body);

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
