/* ═══════════════════════════════════════════════════════════════════════════
   Cascade Events — Read-only helpers for agents to check cascade breadcrumbs.

   Cascade drops a CascadeEvent row after every task completion (success or
   failure). Agents call these helpers to know what changed since their last
   run, without any coupling to cascade internals.

   Usage in an agent handler:
     import { getRecentCascadeEvents, getLatestCascadeEvent } from "@/lib/cascade/events";

     const events = await getRecentCascadeEvents("london_funding_rounds", lastRunAt);
     if (events.length > 0) {
       // Fresh funding data available — use it in analysis
     }
   ═══════════════════════════════════════════════════════════════════════════ */

import prisma from "@/lib/db/client";
import type { CascadeTaskId } from "./types";

export interface CascadeEventSummary {
  id: string;
  taskId: string;
  status: string;
  itemCount: number;
  skippedCount: number;
  durationMs: number | null;
  errorMessage: string | null;
  completedAt: Date;
}

/**
 * Get all cascade events for a task since a given date.
 * Agents call this with their last run timestamp to see what's new.
 */
export async function getRecentCascadeEvents(
  taskId: CascadeTaskId,
  since: Date,
): Promise<CascadeEventSummary[]> {
  return prisma.cascadeEvent.findMany({
    where: {
      taskId,
      completedAt: { gt: since },
    },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      taskId: true,
      status: true,
      itemCount: true,
      skippedCount: true,
      durationMs: true,
      errorMessage: true,
      completedAt: true,
    },
  });
}

/**
 * Get the most recent cascade event for a task (any status).
 * Useful for checking "when did this data last refresh?"
 */
export async function getLatestCascadeEvent(
  taskId: CascadeTaskId,
): Promise<CascadeEventSummary | null> {
  return prisma.cascadeEvent.findFirst({
    where: { taskId },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      taskId: true,
      status: true,
      itemCount: true,
      skippedCount: true,
      durationMs: true,
      errorMessage: true,
      completedAt: true,
    },
  });
}

/**
 * Get the most recent successful cascade event for a task.
 * Useful for "when did this data last successfully update?"
 */
export async function getLatestSuccessfulEvent(
  taskId: CascadeTaskId,
): Promise<CascadeEventSummary | null> {
  return prisma.cascadeEvent.findFirst({
    where: { taskId, status: "success" },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      taskId: true,
      status: true,
      itemCount: true,
      skippedCount: true,
      durationMs: true,
      errorMessage: true,
      completedAt: true,
    },
  });
}

/**
 * Get a summary of all cascade tasks' latest events.
 * Useful for agent dashboards or briefings — "what's the data freshness?"
 */
export async function getCascadeEventsSummary(): Promise<CascadeEventSummary[]> {
  // Get the latest event per task using a raw query for efficiency,
  // or fall back to fetching recent events and deduplicating.
  const events = await prisma.cascadeEvent.findMany({
    orderBy: { completedAt: "desc" },
    take: 100, // at most ~5-6 events per task × 18 tasks
    select: {
      id: true,
      taskId: true,
      status: true,
      itemCount: true,
      skippedCount: true,
      durationMs: true,
      errorMessage: true,
      completedAt: true,
    },
  });

  // Deduplicate — keep only the latest per taskId
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.taskId)) return false;
    seen.add(e.taskId);
    return true;
  });
}
