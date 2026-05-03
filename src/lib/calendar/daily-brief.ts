// =============================================================================
// AGENTIC CALENDAR — Daily Brief Generator
// Shared logic for generating daily planning briefs.
// Used by both the user-facing API route and the cron job.
// =============================================================================

import prisma from "@/lib/db/client";
import { generateDailyBrief } from "./olivia-engine";
import type { DailyBriefResult } from "./olivia-engine";

export interface DailyBriefResponse extends DailyBriefResult {
  generatedAt: string;
  todayEventCount: number;
  upcomingHighPriorityCount: number;
}

/**
 * Generate a daily planning brief for a given user profile.
 * Fetches today's events, upcoming high-priority items, user preferences,
 * and recent interaction patterns, then calls Olivia to generate the brief.
 */
export async function generateDailyBriefForUser(
  userId: string
): Promise<DailyBriefResponse> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  // Fetch data in parallel
  const [prefs, todayEntries, upcomingEntries, recentInteractions] =
    await Promise.all([
      prisma.calendarPreferences.findUnique({
        where: { userId },
      }),
      prisma.calendarEntry.findMany({
        where: {
          userId,
          isArchived: false,
          startDatetime: { gte: todayStart, lte: todayEnd },
        },
        select: {
          title: true,
          category: true,
          priority: true,
          startDatetime: true,
          endDatetime: true,
          location: true,
          isAiGenerated: true,
        },
        orderBy: { startDatetime: "asc" },
      }),
      prisma.calendarEntry.findMany({
        where: {
          userId,
          isArchived: false,
          startDatetime: { gt: todayEnd, lte: weekAhead },
          priority: { in: ["critical", "high"] },
        },
        select: {
          title: true,
          category: true,
          priority: true,
          startDatetime: true,
        },
        orderBy: { startDatetime: "asc" },
        take: 10,
      }),
      prisma.calendarInteraction.findMany({
        where: { userId },
        select: { interactionType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

  // Format today's events for the LLM
  const todayEventsStr =
    todayEntries.length > 0
      ? todayEntries
          .map(
            (e) =>
              `${e.startDatetime.toISOString().slice(11, 16)} — ${e.title} (${e.category}, ${e.priority})${e.location ? ` at ${e.location}` : ""}`
          )
          .join("\n")
      : "No events scheduled today.";

  // Format upcoming high-priority for the LLM
  const upcomingStr =
    upcomingEntries.length > 0
      ? upcomingEntries
          .map(
            (e) =>
              `${e.startDatetime.toISOString().slice(0, 10)} — ${e.title} (${e.category}, ${e.priority})`
          )
          .join("\n")
      : "No high-priority events in the next 7 days.";

  // Format recent patterns
  const interactionTypes = [
    ...new Set(recentInteractions.map((i) => i.interactionType)),
  ];
  const patternsStr =
    recentInteractions.length > 0
      ? `${recentInteractions.length} interactions recently. Types: ${interactionTypes.join(", ")}`
      : "New user — limited behavior data.";

  // Format user preferences
  const prefsStr = prefs
    ? `Stage: ${prefs.startupStage || "unknown"}, Working hours: ${prefs.workingHoursStart}:00-${prefs.workingHoursEnd}:00, Focus areas: ${JSON.stringify(prefs.focusAreasJson || [])}, Timezone: ${prefs.timezone}`
    : "No preferences set. Default working hours assumed (9-18).";

  const brief = await generateDailyBrief({
    currentDate: now.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    todayEvents: todayEventsStr,
    upcomingHighPriority: upcomingStr,
    recentPatterns: patternsStr,
    userPrefs: prefsStr,
  });

  return {
    ...brief,
    generatedAt: now.toISOString(),
    todayEventCount: todayEntries.length,
    upcomingHighPriorityCount: upcomingEntries.length,
  };
}
