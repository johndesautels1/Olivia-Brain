/**
 * London Travel Buffers
 *
 * Calculates travel time between calendar events using Google Distance Matrix API
 * and auto-inserts travel buffer entries between back-to-back events with
 * different physical locations.
 *
 * Respects CalendarPreferences.travelBufferEnabled and travelBufferMinutes.
 */

import prisma from "@/lib/db/client";
import { createCalendarEntry, getCalendarPreferences } from "@/lib/queries/calendar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TravelEstimate {
  originAddress: string;
  destinationAddress: string;
  durationMinutes: number;
  durationText: string;
  distanceText: string;
  mode: "transit" | "driving" | "walking";
}

export interface TravelBufferResult {
  buffersInserted: number;
  entries: Array<{
    fromEvent: string;
    toEvent: string;
    travelMinutes: number;
    bufferEntryId: string;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Categories that don't have physical locations (skip travel buffer)
const VIRTUAL_CATEGORIES = new Set([
  "focus_time",
  "deep_work",
  "admin_block",
  "email_block",
]);

// Default buffer if Distance Matrix API is unavailable or returns an error
const DEFAULT_BUFFER_MINUTES = 30;

// London-centric defaults for transit mode
const TRAVEL_MODE = "transit" as const;

// ---------------------------------------------------------------------------
// Google Distance Matrix API
// ---------------------------------------------------------------------------

/**
 * Estimate travel time between two addresses using Google Distance Matrix API.
 * Falls back to the user's configured default buffer if the API call fails.
 */
export async function estimateTravelTime(
  origin: string,
  destination: string,
  departureTime?: Date
): Promise<TravelEstimate> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    // No API key available — return configured default
    return {
      originAddress: origin,
      destinationAddress: destination,
      durationMinutes: DEFAULT_BUFFER_MINUTES,
      durationText: `~${DEFAULT_BUFFER_MINUTES} min (estimated)`,
      distanceText: "Unknown",
      mode: TRAVEL_MODE,
    };
  }

  try {
    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      mode: TRAVEL_MODE,
      key: apiKey,
      region: "uk",
      units: "metric",
    });

    // Use departure_time for transit-aware estimates
    if (departureTime && departureTime.getTime() > Date.now()) {
      params.set("departure_time", Math.floor(departureTime.getTime() / 1000).toString());
    }

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`
    );

    if (!res.ok) {
      throw new Error(`Distance Matrix API returned ${res.status}`);
    }

    const data = await res.json();

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      throw new Error(`Distance Matrix element status: ${element?.status || "missing"}`);
    }

    const durationSeconds = element.duration.value;
    const durationMinutes = Math.ceil(durationSeconds / 60);

    return {
      originAddress: data.origin_addresses?.[0] || origin,
      destinationAddress: data.destination_addresses?.[0] || destination,
      durationMinutes,
      durationText: element.duration.text,
      distanceText: element.distance?.text || "Unknown",
      mode: TRAVEL_MODE,
    };
  } catch (err) {
    console.error("Distance Matrix API error:", err);
    return {
      originAddress: origin,
      destinationAddress: destination,
      durationMinutes: DEFAULT_BUFFER_MINUTES,
      durationText: `~${DEFAULT_BUFFER_MINUTES} min (estimated)`,
      distanceText: "Unknown",
      mode: TRAVEL_MODE,
    };
  }
}

// ---------------------------------------------------------------------------
// Travel buffer insertion
// ---------------------------------------------------------------------------

/**
 * Check if an entry represents a physical (non-virtual) event.
 */
function isPhysicalEvent(entry: {
  location?: string | null;
  virtualUrl?: string | null;
  category: string;
  allDay: boolean;
}): boolean {
  // Skip all-day events, virtual-only categories, and entries with no location
  if (entry.allDay) return false;
  if (VIRTUAL_CATEGORIES.has(entry.category)) return false;
  if (!entry.location) return false;
  // If it only has a virtual URL and no physical location text, skip
  if (entry.virtualUrl && !entry.location.trim()) return false;
  return true;
}

/**
 * Insert travel buffer entries between consecutive physical events for a user's day.
 * Called by the daily planning cron or on-demand via the API.
 *
 * Steps:
 * 1. Check if user has travelBufferEnabled
 * 2. Get today's entries sorted by start time
 * 3. For each consecutive pair of physical events with different locations,
 *    estimate travel time and insert a "travel" buffer entry before the second event
 * 4. Skip pairs where a travel buffer already exists
 */
export async function insertTravelBuffers(
  userId: string,
  targetDate?: Date
): Promise<TravelBufferResult> {
  const result: TravelBufferResult = { buffersInserted: 0, entries: [] };

  // 1. Check preferences
  const prefs = await getCalendarPreferences(userId);
  if (!prefs?.travelBufferEnabled) return result;

  const bufferMinutes = prefs.travelBufferMinutes || DEFAULT_BUFFER_MINUTES;

  // 2. Get day boundaries
  const date = targetDate || new Date();
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const entries = await prisma.calendarEntry.findMany({
    where: {
      userId,
      isArchived: false,
      startDatetime: { gte: dayStart, lte: dayEnd },
      allDay: false,
    },
    select: {
      id: true,
      title: true,
      location: true,
      virtualUrl: true,
      category: true,
      allDay: true,
      startDatetime: true,
      endDatetime: true,
      aiSource: true,
    },
    orderBy: { startDatetime: "asc" },
  });

  // 3. Filter to physical events only
  const physicalEvents = entries.filter(isPhysicalEvent);
  if (physicalEvents.length < 2) return result;

  // 4. Process consecutive pairs
  for (let i = 0; i < physicalEvents.length - 1; i++) {
    const current = physicalEvents[i];
    const next = physicalEvents[i + 1];

    // Skip if same location
    if (
      current.location?.toLowerCase().trim() ===
      next.location?.toLowerCase().trim()
    ) {
      continue;
    }

    // Check if a travel buffer already exists between these events
    const existingBuffer = await prisma.calendarEntry.findFirst({
      where: {
        userId,
        isArchived: false,
        category: "travel",
        aiSource: "travel_buffer",
        startDatetime: { gte: current.endDatetime },
        endDatetime: { lte: next.startDatetime },
      },
      select: { id: true },
    });

    if (existingBuffer) continue;

    // Check if there's enough gap between events for a buffer
    const gapMinutes =
      (next.startDatetime.getTime() - current.endDatetime.getTime()) / 60000;
    if (gapMinutes < 5) continue; // Not enough gap to insert anything useful

    // Estimate travel time
    const estimate = await estimateTravelTime(
      current.location!,
      next.location!,
      current.endDatetime
    );

    // Use the larger of: estimated travel time or user's configured buffer
    const travelMinutes = Math.max(estimate.durationMinutes, bufferMinutes);

    // Calculate buffer window (capped to available gap)
    const actualBufferMinutes = Math.min(travelMinutes, gapMinutes);
    const bufferStart = current.endDatetime;
    const bufferEnd = new Date(
      bufferStart.getTime() + actualBufferMinutes * 60000
    );

    // Insert travel buffer entry
    const bufferEntry = await createCalendarEntry({
      userId,
      title: `Travel: ${current.location} → ${next.location}`,
      startDatetime: bufferStart,
      endDatetime: bufferEnd,
      category: "travel",
      entryType: "block",
      priority: "medium",
      description: `${estimate.durationText} via ${estimate.mode}. ${estimate.distanceText}.`,
      location: `${current.location} → ${next.location}`,
      isAiGenerated: true,
      aiConfidenceScore: estimate.distanceText !== "Unknown" ? 0.85 : 0.5,
      aiSource: "travel_buffer",
    });

    result.buffersInserted++;
    result.entries.push({
      fromEvent: current.title,
      toEvent: next.title,
      travelMinutes: actualBufferMinutes,
      bufferEntryId: bufferEntry.id,
    });
  }

  return result;
}

/**
 * Remove all auto-generated travel buffers for a user's day.
 * Useful when the user reconfigures or disables travel buffers.
 */
export async function clearTravelBuffers(
  userId: string,
  targetDate?: Date
): Promise<number> {
  const date = targetDate || new Date();
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const { count } = await prisma.calendarEntry.updateMany({
    where: {
      userId,
      isArchived: false,
      category: "travel",
      aiSource: "travel_buffer",
      startDatetime: { gte: dayStart, lte: dayEnd },
    },
    data: { isArchived: true },
  });

  return count;
}
