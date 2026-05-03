import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  getWebhookStates,
  createWebhookState,
  updateWebhookStatus,
  archiveWebhookState,
  getExpiringWebhooks,
  markExpiredWebhooks,
} from "@/lib/queries/calendar";
import type { CalendarSyncProvider } from "@prisma/client";

// Replaced for Olivia Brain — userId IS the canonical user ID directly
// (Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`,
// not a UserProfile FK). Kept the function name for minimal call-site churn.
async function getUserProfileId(): Promise<string | null> {
  const { userId } = await getAuthSession();
  return userId;
}

// GET — List webhook states for a sync account, or get expiring webhooks
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000, prefix: "cal-webhooks" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // Return webhooks expiring within N hours (for renewal dashboard)
  if (action === "expiring") {
    const hours = parseInt(searchParams.get("hours") || "24", 10);
    // Mark any already-expired webhooks first
    await markExpiredWebhooks();
    const expiring = await getExpiringWebhooks(hours);
    return NextResponse.json({ webhooks: expiring });
  }

  // List webhooks for a specific sync account
  const syncAccountId = searchParams.get("syncAccountId");
  if (!syncAccountId) {
    return NextResponse.json(
      { error: "syncAccountId param required" },
      { status: 400 }
    );
  }

  // Verify the sync account belongs to this user
  const account = await prisma.calendarSyncAccount.findFirst({
    where: { id: syncAccountId, userId, isArchived: false },
    select: { id: true },
  });
  if (!account) {
    return NextResponse.json({ error: "Sync account not found" }, { status: 404 });
  }

  const webhooks = await getWebhookStates(syncAccountId);
  return NextResponse.json({ webhooks });
}

// POST — Register a new webhook subscription
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000, prefix: "cal-webhooks" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const { syncAccountId, provider, subscriptionId, callbackUrl, eventTypes, expiresAt, providerMeta } = body;

    if (!syncAccountId || !provider || !subscriptionId || !callbackUrl) {
      return NextResponse.json(
        { error: "syncAccountId, provider, subscriptionId, and callbackUrl are required" },
        { status: 400 }
      );
    }

    // Verify sync account ownership
    const account = await prisma.calendarSyncAccount.findFirst({
      where: { id: syncAccountId, userId, isArchived: false },
      select: { id: true },
    });
    if (!account) {
      return NextResponse.json({ error: "Sync account not found" }, { status: 404 });
    }

    const webhook = await createWebhookState({
      syncAccountId,
      provider: provider as CalendarSyncProvider,
      subscriptionId,
      callbackUrl,
      eventTypes: eventTypes || undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      providerMeta: providerMeta || undefined,
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (err) {
    console.error("Webhook state create error:", err);
    return NextResponse.json(
      { error: "Failed to create webhook state" },
      { status: 500 }
    );
  }
}

// PUT — Update webhook status (renewal, status change)
export async function PUT(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000, prefix: "cal-webhooks" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const webhookId = searchParams.get("id");
  if (!webhookId) {
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  }

  try {
    // Verify ownership through sync account chain
    const existing = await prisma.calendarWebhookState.findUnique({
      where: { id: webhookId },
      select: {
        id: true,
        syncAccount: { select: { userId: true } },
      },
    });

    if (!existing || existing.syncAccount.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const webhook = await updateWebhookStatus(webhookId, {
      status: body.status || undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      subscriptionId: body.subscriptionId || undefined,
      renewedAt: body.renewedAt ? new Date(body.renewedAt) : undefined,
      renewalAttemptedAt: body.renewalAttemptedAt
        ? new Date(body.renewalAttemptedAt)
        : undefined,
      providerMeta: body.providerMeta || undefined,
    });

    return NextResponse.json(webhook);
  } catch (err) {
    console.error("Webhook state update error:", err);
    return NextResponse.json(
      { error: "Failed to update webhook state" },
      { status: 500 }
    );
  }
}

// DELETE — Archive (revoke) a webhook subscription
export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000, prefix: "cal-webhooks" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const webhookId = searchParams.get("id");
  if (!webhookId) {
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.calendarWebhookState.findUnique({
    where: { id: webhookId },
    select: {
      id: true,
      syncAccount: { select: { userId: true } },
    },
  });

  if (!existing || existing.syncAccount.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const webhook = await archiveWebhookState(webhookId);
  return NextResponse.json(webhook);
}
