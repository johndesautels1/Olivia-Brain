import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  getActiveWebhooksByProvider,
  recordWebhookDelivery,
  recordWebhookFailure,
} from "@/lib/queries/calendar";

const CALENDLY_WEBHOOK_SECRET = process.env.CALENDLY_WEBHOOK_SECRET || "";

// Verify Calendly webhook signature
function verifyCalendlySignature(
  payload: string,
  signature: string
): boolean {
  if (!CALENDLY_WEBHOOK_SECRET) return false;

  const hmac = crypto.createHmac("sha256", CALENDLY_WEBHOOK_SECRET);
  hmac.update(payload);
  const expected = hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

interface CalendlyEvent {
  uri: string;
  name: string;
  status: string;
  start_time: string;
  end_time: string;
  location?: {
    type: string;
    location?: string;
    join_url?: string;
  };
  event_type: string;
  created_at: string;
  updated_at: string;
}

interface CalendlyInvitee {
  uri: string;
  name: string;
  email: string;
  status: string;
}

// POST — Calendly webhook receiver
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000, prefix: "cal-calendly" });
  if (limited) return limited;

  try {
    const rawBody = await req.text();

    // Verify signature if secret is configured
    if (CALENDLY_WEBHOOK_SECRET) {
      const signature = req.headers.get("calendly-webhook-signature") || "";
      // Calendly sends signature as "t=timestamp,v1=signature"
      const sigParts = signature.split(",");
      const v1Part = sigParts.find((p) => p.startsWith("v1="));
      const sig = v1Part ? v1Part.replace("v1=", "") : "";
      const tPart = sigParts.find((p) => p.startsWith("t="));
      const timestamp = tPart ? tPart.replace("t=", "") : "";

      // Build the signed payload as Calendly does: timestamp.payload
      const signedPayload = `${timestamp}.${rawBody}`;
      if (!verifyCalendlySignature(signedPayload, sig)) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const body = JSON.parse(rawBody);
    const event = body.event as string; // "invitee.created" | "invitee.canceled"
    const payload = body.payload;

    if (!event || !payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const scheduledEvent = payload.scheduled_event as CalendlyEvent | undefined;
    const invitee = payload as CalendlyInvitee | undefined;

    if (!scheduledEvent) {
      return NextResponse.json({ received: true });
    }

    // Match incoming Calendly event to a user via CalendarSyncAccount.
    // The LTM email-based UserProfile fallback is dropped — UserProfile is not
    // in Olivia Brain's schema. If the invitee email matches a sync account's
    // providerEmail, that's our canonical match key.
    let userId: string | null = null;

    if (invitee?.email) {
      const syncAccount = await prisma.calendarSyncAccount.findFirst({
        where: {
          provider: "calendly",
          providerEmail: invitee.email,
          isActive: true,
        },
        select: { userId: true },
      });
      userId = syncAccount?.userId || null;
    }

    if (!userId) {
      // Fallback: any active Calendly sync account
      const syncAccount = await prisma.calendarSyncAccount.findFirst({
        where: {
          provider: "calendly",
          isActive: true,
        },
        select: { userId: true },
      });
      userId = syncAccount?.userId || null;
    }

    if (!userId) {
      // Can't match to a user — acknowledge but skip
      return NextResponse.json({ received: true, matched: false });
    }

    // ── Handle invitee.created ──
    if (event === "invitee.created") {
      // Check if we already have this event
      const existing = await prisma.calendarEntry.findFirst({
        where: {
          userId,
          externalCalendarId: scheduledEvent.uri,
          externalProvider: "calendly",
        },
      });

      if (!existing) {
        await prisma.calendarEntry.create({
          data: {
            userId,
            title: scheduledEvent.name || "Calendly Meeting",
            description: invitee?.name
              ? `Meeting with ${invitee.name} (${invitee.email})`
              : null,
            location: scheduledEvent.location?.location || null,
            virtualUrl: scheduledEvent.location?.join_url || null,
            startDatetime: new Date(scheduledEvent.start_time),
            endDatetime: new Date(scheduledEvent.end_time),
            allDay: false,
            entryType: "event",
            category: "synced_external",
            priority: "medium",
            externalCalendarId: scheduledEvent.uri,
            externalProvider: "calendly",
            isAiGenerated: false,
          },
        });
      }
    }

    // ── Handle invitee.canceled ──
    if (event === "invitee.canceled") {
      const existing = await prisma.calendarEntry.findFirst({
        where: {
          userId,
          externalCalendarId: scheduledEvent.uri,
          externalProvider: "calendly",
        },
      });

      if (existing) {
        await prisma.calendarEntry.update({
          where: { id: existing.id },
          data: { isArchived: true },
        });
      }
    }

    // Record successful webhook delivery for any matching webhook state
    const activeWebhooks = await getActiveWebhooksByProvider("calendly");
    for (const wh of activeWebhooks) {
      if (wh.syncAccount.userId === userId) {
        await recordWebhookDelivery(wh.id, event);
        break;
      }
    }

    return NextResponse.json({ received: true, event });
  } catch (err) {
    console.error("Calendly webhook error:", err);

    // Record delivery failure for all active Calendly webhook states
    try {
      const activeWebhooks = await getActiveWebhooksByProvider("calendly");
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      for (const wh of activeWebhooks) {
        await recordWebhookFailure(wh.id, errorMsg);
      }
    } catch {
      // Don't let failure tracking errors mask the original error
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
