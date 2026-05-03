import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import { getGoogleAuthUrl, syncGoogleCalendar } from "@/lib/calendar/google-sync";
import { getOutlookAuthUrl, syncOutlookCalendar } from "@/lib/calendar/outlook-sync";
import { signOAuthState } from "@/lib/calendar/crypto";

// Replaced for Olivia Brain — userId IS the canonical user ID directly
// (Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`,
// not a UserProfile FK). Kept the function name for minimal call-site churn.
async function getUserProfileId(): Promise<string | null> {
  const { userId } = await getAuthSession();
  return userId;
}

// GET — List sync accounts or get OAuth URL
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: "cal-sync" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // Return OAuth URL for connecting a provider
  if (action === "connect") {
    const provider = searchParams.get("provider");

    if (provider === "google") {
      const signedState = signOAuthState(userId);
      const url = getGoogleAuthUrl(signedState);
      return NextResponse.json({ authUrl: url });
    }

    if (provider === "outlook") {
      const signedState = signOAuthState(userId);
      const url = getOutlookAuthUrl(signedState);
      return NextResponse.json({ authUrl: url });
    }

    if (provider === "calendly") {
      // Calendly uses webhook-based sync — no OAuth redirect needed.
      // Create (or reactivate) a sync account so webhooks can match this user.
      const existing = await prisma.calendarSyncAccount.findFirst({
        where: { userId, provider: "calendly" },
      });

      if (existing && !existing.isArchived) {
        return NextResponse.json({ connected: true, message: "Calendly already connected" });
      }

      if (existing) {
        // Reactivate archived account
        await prisma.calendarSyncAccount.update({
          where: { id: existing.id },
          data: { isArchived: false, isActive: true, consecutiveErrors: 0, lastSyncError: null },
        });
      } else {
        await prisma.calendarSyncAccount.create({
          data: {
            userId,
            provider: "calendly",
            providerAccountId: `calendly-${userId}`,
            syncDirection: "inbound",
            isActive: true,
          },
        });
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clueslondon.com";
      return NextResponse.json({
        connected: true,
        webhookUrl: `${appUrl}/api/calendar/sync/calendly`,
        message: "Calendly connected. Configure your Calendly webhook to point to the webhook URL.",
      });
    }

    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  // List all sync accounts
  const accounts = await prisma.calendarSyncAccount.findMany({
    where: { userId, isArchived: false },
    select: {
      id: true,
      provider: true,
      providerEmail: true,
      syncDirection: true,
      lastSyncAt: true,
      lastSyncError: true,
      consecutiveErrors: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      ...a,
      lastSyncAt: a.lastSyncAt?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

// POST — Trigger sync or disconnect account
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: "cal-sync" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // ── Trigger Sync ──
    if (body.action === "sync" && body.accountId) {
      const account = await prisma.calendarSyncAccount.findFirst({
        where: { id: body.accountId, userId, isActive: true },
        select: { id: true, provider: true },
      });

      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      try {
        let result;
        if (account.provider === "google") {
          result = await syncGoogleCalendar(account.id, userId);
        } else if (account.provider === "outlook") {
          result = await syncOutlookCalendar(account.id, userId);
        } else {
          return NextResponse.json({ error: "Sync not supported for this provider" }, { status: 400 });
        }

        return NextResponse.json({ success: true, result });
      } catch (syncErr) {
        // Track consecutive errors
        await prisma.calendarSyncAccount.update({
          where: { id: account.id },
          data: {
            consecutiveErrors: { increment: 1 },
            lastSyncError: syncErr instanceof Error ? syncErr.message : "Unknown sync error",
          },
        });

        return NextResponse.json(
          { error: "Sync failed", details: syncErr instanceof Error ? syncErr.message : "Unknown" },
          { status: 500 }
        );
      }
    }

    // ── Disconnect Account ──
    if (body.action === "disconnect" && body.accountId) {
      const account = await prisma.calendarSyncAccount.findFirst({
        where: { id: body.accountId, userId },
      });

      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      await prisma.calendarSyncAccount.update({
        where: { id: body.accountId },
        data: { isArchived: true, isActive: false },
      });

      return NextResponse.json({ success: true });
    }

    // ── Toggle Sync Direction ──
    if (body.action === "update_direction" && body.accountId && body.direction) {
      await prisma.calendarSyncAccount.update({
        where: { id: body.accountId },
        data: {
          syncDirection: body.direction as "inbound" | "outbound" | "bidirectional",
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Calendar sync error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
