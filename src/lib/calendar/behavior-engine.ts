// =============================================================================
// AGENTIC CALENDAR — Self-Learning Behavior Engine
// Tracks patterns, analyzes behavior, computes confidence growth, FounderWeek.
// Uses CalendarInteraction data to improve Olivia's recommendations over time.
// =============================================================================
import prisma from "@/lib/db/client";
import { buildBehaviorAnalysisPrompt } from "./olivia-prompts";

const MINIMUM_DATA_POINTS = 20; // Threshold before pattern analysis activates
const CONFIDENCE_GROWTH_RATE = 0.02; // Per accepted suggestion
const CONFIDENCE_DECAY_RATE = 0.01; // Per dismissed suggestion

// ─── Behavior Pattern Types ─────────────────────────────────────────────────

export interface BehaviorPattern {
  type: string;
  description: string;
  confidence: number;
  dataPoints: number;
  insight: string;
}

export interface WeeklyDigest {
  weekStart: string;
  meetingsCount: number;
  networkingCount: number;
  focusHours: number;
  prepCompletion: number; // 0-100%
  suggestionAcceptRate: number; // 0-100%
  topCategories: string[];
  oliviaSummary: string | null;
}

// ─── Interaction Analytics ──────────────────────────────────────────────────

export async function getInteractionStats(
  userId: string,
  daysBack = 60
): Promise<{
  totalInteractions: number;
  interactionsByType: Record<string, number>;
  acceptRate: number;
  avgDailyEvents: number;
  topCategories: string[];
  activeDays: number;
  hasEnoughData: boolean;
}> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const [interactions, entries] = await Promise.all([
    prisma.calendarInteraction.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      select: {
        interactionType: true,
        createdAt: true,
      },
    }),
    prisma.calendarEntry.findMany({
      where: {
        userId,
        isArchived: false,
        startDatetime: { gte: since },
      },
      select: {
        category: true,
        startDatetime: true,
      },
    }),
  ]);

  // Count by type
  const interactionsByType: Record<string, number> = {};
  for (const i of interactions) {
    interactionsByType[i.interactionType] =
      (interactionsByType[i.interactionType] || 0) + 1;
  }

  // Accept rate
  const accepted = interactionsByType["accepted_suggestion"] || 0;
  const dismissed = interactionsByType["dismissed_suggestion"] || 0;
  const totalSuggestions = accepted + dismissed;
  const acceptRate = totalSuggestions > 0 ? (accepted / totalSuggestions) * 100 : 0;

  // Average daily events
  const uniqueDays = new Set(
    entries.map((e) => e.startDatetime.toISOString().split("T")[0])
  );
  const activeDays = uniqueDays.size;
  const avgDailyEvents = activeDays > 0 ? entries.length / activeDays : 0;

  // Top categories
  const categoryCounts: Record<string, number> = {};
  for (const e of entries) {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  }
  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat]) => cat);

  return {
    totalInteractions: interactions.length,
    interactionsByType,
    acceptRate,
    avgDailyEvents: Math.round(avgDailyEvents * 10) / 10,
    topCategories,
    activeDays,
    hasEnoughData: interactions.length >= MINIMUM_DATA_POINTS,
  };
}

// ─── Pattern Detection ──────────────────────────────────────────────────────

export async function detectBehaviorPatterns(
  userId: string
): Promise<BehaviorPattern[]> {
  const stats = await getInteractionStats(userId, 90);
  if (!stats.hasEnoughData) return [];

  const patterns: BehaviorPattern[] = [];

  // Time-of-day pattern
  const entries = await prisma.calendarEntry.findMany({
    where: {
      userId,
      isArchived: false,
      createdAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      category: true,
      startDatetime: true,
      priority: true,
    },
  });

  // Detect meeting clustering patterns
  const hourCounts: Record<number, number> = {};
  const dayOfWeekCounts: Record<number, number> = {};

  for (const e of entries) {
    const hour = e.startDatetime.getHours();
    const dow = e.startDatetime.getDay();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    dayOfWeekCounts[dow] = (dayOfWeekCounts[dow] || 0) + 1;
  }

  // Peak hours
  const peakHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([h]) => parseInt(h));

  if (peakHours.length > 0) {
    const peakLabels = peakHours.map((h) => `${h}:00`).join(", ");
    patterns.push({
      type: "peak_hours",
      description: `Most events are scheduled at ${peakLabels}`,
      confidence: Math.min(entries.length / 50, 1),
      dataPoints: entries.length,
      insight: `Consider protecting ${peakLabels} for your most important meetings, and use other times for focus blocks.`,
    });
  }

  // Busiest days
  const busiestDays = Object.entries(dayOfWeekCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2);

  if (busiestDays.length > 0) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const busyDayNames = busiestDays.map(([d]) => dayNames[parseInt(d)]).join(" and ");
    patterns.push({
      type: "busy_days",
      description: `${busyDayNames} are your busiest days`,
      confidence: Math.min(entries.length / 40, 1),
      dataPoints: entries.length,
      insight: `You might want to keep lighter days around ${busyDayNames} for recovery and deep work.`,
    });
  }

  // Category mix
  if (stats.topCategories.length >= 3) {
    const meetingCategories = stats.topCategories.filter((c) =>
      c.includes("meeting") || c.includes("call") || c === "one_on_one"
    );
    const meetingRatio = meetingCategories.length / stats.topCategories.length;

    if (meetingRatio > 0.6) {
      patterns.push({
        type: "meeting_heavy",
        description: "Your calendar is meeting-heavy",
        confidence: 0.8,
        dataPoints: entries.length,
        insight:
          "Consider adding focus blocks and deep work sessions to balance your calendar. Founders who protect 2-3 hours of daily focus time report higher productivity.",
      });
    }
  }

  // Suggestion acceptance pattern
  if (stats.acceptRate > 0) {
    patterns.push({
      type: "suggestion_response",
      description: `You accept ${Math.round(stats.acceptRate)}% of Olivia's suggestions`,
      confidence: Math.min(
        (stats.interactionsByType["accepted_suggestion"] || 0) +
          (stats.interactionsByType["dismissed_suggestion"] || 0),
        1
      ) / 20,
      dataPoints:
        (stats.interactionsByType["accepted_suggestion"] || 0) +
        (stats.interactionsByType["dismissed_suggestion"] || 0),
      insight:
        stats.acceptRate > 70
          ? "Olivia's suggestions are well-aligned with your preferences."
          : "Olivia is still learning your preferences — her suggestions will improve over time.",
    });
  }

  return patterns;
}

// ─── Confidence Score Management ────────────────────────────────────────────

export async function updateOliviaConfidence(
  userId: string,
  action: "accepted" | "dismissed"
): Promise<number> {
  const prefs = await prisma.calendarPreferences.findUnique({
    where: { userId },
    select: { oliviaConfidenceScore: true },
  });

  // Check if oliviaConfidenceScore field exists
  let currentScore = 0.5; // Default starting confidence
  if (prefs && "oliviaConfidenceScore" in prefs && prefs.oliviaConfidenceScore !== null) {
    currentScore = Number(prefs.oliviaConfidenceScore);
  }

  let newScore: number;
  if (action === "accepted") {
    newScore = Math.min(1.0, currentScore + CONFIDENCE_GROWTH_RATE);
  } else {
    newScore = Math.max(0.1, currentScore - CONFIDENCE_DECAY_RATE);
  }

  await prisma.calendarPreferences.upsert({
    where: { userId },
    create: {
      userId,
      oliviaConfidenceScore: newScore,
    },
    update: {
      oliviaConfidenceScore: newScore,
    },
  });

  return newScore;
}

// ─── FounderWeek Computation ────────────────────────────────────────────────

export async function computeFounderWeek(
  userId: string,
  weekStartDate?: Date
): Promise<WeeklyDigest> {
  // Default to start of current week (Monday)
  const start = weekStartDate || getWeekStart(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const [entries, prepTasks, interactions] = await Promise.all([
    prisma.calendarEntry.findMany({
      where: {
        userId,
        isArchived: false,
        startDatetime: { gte: start, lt: end },
      },
      select: {
        category: true,
        startDatetime: true,
        endDatetime: true,
        entryType: true,
      },
    }),
    prisma.calendarPrepTask.findMany({
      where: {
        calendarEntry: {
          userId,
          startDatetime: { gte: start, lt: end },
        },
      },
      select: { status: true },
    }),
    prisma.calendarInteraction.findMany({
      where: {
        userId,
        createdAt: { gte: start, lt: end },
      },
      select: { interactionType: true },
    }),
  ]);

  // Meetings count
  const meetingCategories = new Set([
    "vc_meeting", "angel_meeting", "board_meeting", "advisory_call",
    "investor_update", "founder_meeting", "team_standup", "one_on_one",
  ]);
  const meetingsCount = entries.filter((e) =>
    meetingCategories.has(e.category)
  ).length;

  // Networking count
  const networkingCategories = new Set([
    "networking_event", "conference_attend", "meetup_attend",
    "coffee_chat", "lunch_meeting",
  ]);
  const networkingCount = entries.filter((e) =>
    networkingCategories.has(e.category)
  ).length;

  // Focus hours (from focus_time and deep_work blocks)
  let focusMs = 0;
  for (const e of entries) {
    if (e.category === "focus_time" || e.category === "deep_work") {
      const duration = e.endDatetime.getTime() - e.startDatetime.getTime();
      focusMs += duration;
    }
  }
  const focusHours = Math.round((focusMs / (1000 * 60 * 60)) * 10) / 10;

  // Prep task completion
  const prepCompleted = prepTasks.filter((t) => t.status === "completed").length;
  const prepTotal = prepTasks.length;
  const prepCompletion = prepTotal > 0 ? Math.round((prepCompleted / prepTotal) * 100) : 0;

  // Suggestion metrics
  const accepted = interactions.filter(
    (i) => i.interactionType === "accepted_suggestion"
  ).length;
  const dismissed = interactions.filter(
    (i) => i.interactionType === "dismissed_suggestion"
  ).length;
  const totalSugg = accepted + dismissed;
  const suggestionAcceptRate = totalSugg > 0 ? Math.round((accepted / totalSugg) * 100) : 0;

  // Top categories
  const categoryCounts: Record<string, number> = {};
  for (const e of entries) {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  }
  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat]) => cat);

  // Upsert FounderWeek record
  await prisma.founderWeek.upsert({
    where: {
      userId_weekStartDate: {
        userId,
        weekStartDate: start,
      },
    },
    create: {
      userId,
      weekStartDate: start,
      meetingsCount,
      networkingCount,
      focusHours,
      prepTasksCompleted: prepCompleted,
      prepTasksTotal: prepTotal,
      suggestionsAccepted: accepted,
      suggestionsDismissed: dismissed,
      topCategoriesJson: topCategories,
    },
    update: {
      meetingsCount,
      networkingCount,
      focusHours,
      prepTasksCompleted: prepCompleted,
      prepTasksTotal: prepTotal,
      suggestionsAccepted: accepted,
      suggestionsDismissed: dismissed,
      topCategoriesJson: topCategories,
    },
  });

  return {
    weekStart: start.toISOString(),
    meetingsCount,
    networkingCount,
    focusHours,
    prepCompletion,
    suggestionAcceptRate,
    topCategories,
    oliviaSummary: null,
  };
}

// ─── Generate AI Week Summary ───────────────────────────────────────────────

export async function generateWeekSummary(
  userId: string,
  weekStartDate?: Date
): Promise<string> {
  const digest = await computeFounderWeek(userId, weekStartDate);
  const patterns = await detectBehaviorPatterns(userId);

  const patternDescriptions = patterns.map((p) => `${p.type}: ${p.description} (${p.insight})`).join("\n");
  const prompt = buildBehaviorAnalysisPrompt({
    eventHistory: `Week: ${digest.weekStart}, Meetings: ${digest.meetingsCount}, Networking: ${digest.networkingCount}, Focus: ${digest.focusHours}h`,
    timePatterns: patternDescriptions || "Not enough data yet",
    categoryFrequency: digest.topCategories.join(", ") || "No data",
    acceptedSuggestions: `Accept rate: ${digest.suggestionAcceptRate}%`,
    dismissedSuggestions: `Prep completion: ${digest.prepCompletion}%`,
  });

  // Use Anthropic Sonnet for the summary
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "Olivia needs an API key to generate summaries.";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000), // 30s timeout for short summary
    });

    if (!res.ok) return "Could not generate summary at this time.";

    const data = await res.json();
    const summary =
      data.content?.[0]?.type === "text" ? data.content[0].text : "No summary generated.";

    // Save to FounderWeek
    const start = weekStartDate || getWeekStart(new Date());
    await prisma.founderWeek.update({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate: start,
        },
      },
      data: { oliviaSummary: summary },
    });

    return summary;
  } catch {
    return "Could not generate summary at this time.";
  }
}

// ─── Utility ────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
