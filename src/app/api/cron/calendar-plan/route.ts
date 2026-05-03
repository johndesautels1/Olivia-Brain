import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { createSystemAlert } from "@/lib/system-alerts";
import { generateDailyBriefForUser } from "@/lib/calendar/daily-brief";
import { archiveExpiredRecommendations } from "@/lib/queries/calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/calendar-plan — Daily planning brief cron job.
 * Runs each morning, generates Olivia daily briefs for users who have
 * oliviaEnabled + a briefingTime set. Stores the brief as a recommendation
 * so Olivia surfaces it in the panel.
 */
export async function GET(request: NextRequest) {
  // ── Auth ──
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 503 }
      );
    }
  }

  const startTime = Date.now();
  let generated = 0;
  let failed = 0;
  let skipped = 0;
  let archived = 0;

  try {
    // Archive expired recommendations across all users
    archived = await archiveExpiredRecommendations();

    // Find users who have Olivia enabled and a briefing time set
    const eligibleUsers = await prisma.calendarPreferences.findMany({
      where: {
        oliviaEnabled: true,
        briefingTime: { not: null },
      },
      select: {
        userId: true,
        briefingTime: true,
        timezone: true,
      },
    });

    for (const user of eligibleUsers) {
      try {
        // Check if this user's briefing time is approximately now
        // (within a 30-min window to handle cron timing)
        const now = new Date();
        const [briefHour, briefMin] = (user.briefingTime || "08:00")
          .split(":")
          .map(Number);

        // Get current hour/minute in user's timezone
        const userTime = new Date(
          now.toLocaleString("en-US", { timeZone: user.timezone || "Europe/London" })
        );
        const currentHour = userTime.getHours();
        const currentMin = userTime.getMinutes();
        const currentTotalMins = currentHour * 60 + currentMin;
        const briefTotalMins = briefHour * 60 + briefMin;

        // Skip if outside the 30-minute window
        if (
          currentTotalMins < briefTotalMins ||
          currentTotalMins > briefTotalMins + 30
        ) {
          skipped++;
          continue;
        }

        // Check if we already generated a brief today for this user
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const existingBrief =
          await prisma.oliviaCalendarRecommendation.findFirst({
            where: {
              userId: user.userId,
              type: "scheduled",
              triggerType: "daily_brief",
              createdAt: { gte: todayStart },
            },
          });

        if (existingBrief) {
          skipped++;
          continue;
        }

        // Generate the brief
        const brief = await generateDailyBriefForUser(user.userId);

        // Store as a recommendation so it shows in the Olivia panel
        await prisma.oliviaCalendarRecommendation.create({
          data: {
            userId: user.userId,
            type: "scheduled",
            urgency: "today",
            message: brief.greeting + " " + brief.day_summary,
            reasoningJson: {
              schedule_blocks: brief.schedule_blocks,
              top_priorities: brief.top_priorities,
              suggested_focus_blocks: brief.suggested_focus_blocks,
              heads_up: brief.heads_up,
              olivia_tip: brief.olivia_tip,
            } as unknown as import("@prisma/client").Prisma.InputJsonValue,
            triggerType: "daily_brief",
            triggerDescription: `Morning brief for ${brief.generatedAt}`,
            confidenceScore: 0.9,
          },
        });

        generated++;
      } catch (err) {
        console.error(
          `[Calendar Plan Cron] Failed for user ${user.userId}:`,
          err
        );
        failed++;
      }
    }

    // Alert on failures
    if (failed > 0) {
      await createSystemAlert({
        source: "cron/calendar-plan",
        severity: "warning",
        title: `Daily brief cron: ${failed} failures out of ${eligibleUsers.length} users`,
        message: `Generated: ${generated}, Failed: ${failed}, Skipped: ${skipped}`,
        metadata: { generated, failed, skipped },
      });
    }

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      eligible: eligibleUsers.length,
      generated,
      failed,
      skipped,
      expiredArchived: archived,
      elapsedMs: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Calendar Plan Cron] Fatal error:", err);

    await createSystemAlert({
      source: "cron/calendar-plan",
      severity: "critical",
      title: "Daily brief cron failed entirely",
      message: err instanceof Error ? err.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Cron execution failed" },
      { status: 500 }
    );
  }
}
