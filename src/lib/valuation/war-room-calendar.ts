/**
 * War Room → Calendar + Notification Integration (Session 29)
 *
 * Creates calendar entries when War Room sessions start and complete,
 * and triggers Olivia's notification pipeline (SMS/WhatsApp) for live alerts.
 */

import { createCalendarEntry, updateCalendarEntry } from "@/lib/queries/calendar";
import type { CalendarEntryWithDetails } from "@/lib/queries/calendar";

// ── Types ─────────────────────────────────────────────────────────────

interface WarRoomStartParams {
  userId: string;
  companyName: string;
  buyerType: string;
  sessionId: string;
  valuationRunId?: string | null;
}

interface WarRoomCompleteParams {
  calendarEntryId: string;
  userId: string;
  companyName: string;
  overallScore?: number | null;
  duration?: number | null;
  messageCount?: number;
}

// ── Calendar Entry Creation ───────────────────────────────────────────

/**
 * Create a calendar entry when a War Room session starts.
 * Returns the created entry so the session can store the calendarEntryId.
 */
export async function createWarRoomCalendarEntry(
  params: WarRoomStartParams,
): Promise<CalendarEntryWithDetails | null> {
  const { userId, companyName, buyerType, sessionId } = params;

  const now = new Date();
  // Default duration: 1 hour block
  const endTime = new Date(now.getTime() + 60 * 60 * 1000);

  const buyerLabel =
    buyerType === "vc"
      ? "VC"
      : buyerType === "private_equity"
        ? "PE"
        : buyerType === "strategic_partner"
          ? "Strategic"
          : buyerType === "angel"
            ? "Angel"
            : buyerType === "acquirer"
              ? "Acquirer"
              : buyerType;

  try {
    const entry = await createCalendarEntry({
      userId,
      title: `War Room: ${companyName} (${buyerLabel})`,
      description: [
        `Live negotiation simulation for ${companyName}.`,
        `Buyer perspective: ${buyerLabel}`,
        `Session ID: ${sessionId}`,
        params.valuationRunId
          ? `Valuation Run: ${params.valuationRunId}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      startDatetime: now,
      endDatetime: endTime,
      category: "deal_prep",
      entryType: "event",
      priority: "high",
      tagsJson: ["war-room", "valuation", buyerType],
      isAiGenerated: true,
      aiConfidenceScore: 1.0,
      aiSource: "war-room-auto",
      isVip: true,
    });

    return entry;
  } catch (error) {
    console.error("[WarRoomCalendar] Failed to create calendar entry:", error);
    return null;
  }
}

/**
 * Update the calendar entry when a War Room session completes.
 * Adjusts the end time to actual duration and adds summary to description.
 */
export async function completeWarRoomCalendarEntry(
  params: WarRoomCompleteParams,
): Promise<CalendarEntryWithDetails | null> {
  const {
    calendarEntryId,
    userId,
    companyName,
    overallScore,
    duration,
    messageCount,
  } = params;

  try {
    const now = new Date();
    const summaryParts: string[] = [
      `War Room session for ${companyName} completed.`,
    ];
    if (overallScore != null) {
      summaryParts.push(`Overall score: ${overallScore}/100`);
    }
    if (duration != null) {
      const mins = Math.round(duration / 60);
      summaryParts.push(`Duration: ${mins} min`);
    }
    if (messageCount != null && messageCount > 0) {
      summaryParts.push(`Exchanges: ${messageCount}`);
    }

    const entry = await updateCalendarEntry(calendarEntryId, userId, {
      endDatetime: now,
      description: summaryParts.join("\n"),
      tagsJson: [
        "war-room",
        "valuation",
        "completed",
        ...(overallScore != null && overallScore >= 75
          ? ["high-performance"]
          : []),
      ],
    });

    return entry;
  } catch (error) {
    console.error("[WarRoomCalendar] Failed to update calendar entry:", error);
    return null;
  }
}

// ── Notification Pipeline ─────────────────────────────────────────────

/**
 * Fire Olivia notification when a War Room session starts.
 * Uses the existing Twilio SMS pipeline (best-effort, non-blocking).
 */
export async function notifyWarRoomStarted(
  companyName: string,
  buyerType: string,
  phoneNumber?: string | null,
): Promise<void> {
  // Only send if user has a phone number configured
  if (!phoneNumber) return;

  try {
    const twilio = await import("@/lib/twilio/client").catch(() => null);
    if (!twilio || !twilio.isTwilioConfigured()) return;

    const buyerLabel =
      buyerType === "vc"
        ? "VC"
        : buyerType === "private_equity"
          ? "PE"
          : buyerType === "strategic_partner"
            ? "Strategic"
            : buyerType;

    await twilio.sendOliviaSms(
      phoneNumber,
      `War Room session started for ${companyName} (${buyerLabel} perspective). Your negotiation simulation is live — good luck.`,
    );
  } catch {
    // Best-effort — don't block War Room startup for notification failures
  }
}

/**
 * Fire Olivia notification when a War Room session completes.
 */
export async function notifyWarRoomCompleted(
  companyName: string,
  overallScore: number | null,
  phoneNumber?: string | null,
): Promise<void> {
  if (!phoneNumber) return;

  try {
    const twilio = await import("@/lib/twilio/client").catch(() => null);
    if (!twilio || !twilio.isTwilioConfigured()) return;

    const scoreText =
      overallScore != null
        ? `Final score: ${overallScore}/100.`
        : "Session recorded.";

    await twilio.sendOliviaSms(
      phoneNumber,
      `War Room session for ${companyName} complete. ${scoreText} Review your transcript in the Valuation Workbench.`,
    );
  } catch {
    // Best-effort
  }
}
