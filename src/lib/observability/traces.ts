import type { FoundationTrace } from "@/lib/foundation/types";
import { getLangfuseService } from "./langfuse";

declare global {
  var __oliviaRecentTraces: FoundationTrace[] | undefined;
}

function getTraceBucket() {
  if (!globalThis.__oliviaRecentTraces) {
    globalThis.__oliviaRecentTraces = [];
  }

  return globalThis.__oliviaRecentTraces;
}

export async function recordTrace(trace: FoundationTrace) {
  const bucket = getTraceBucket();

  bucket.unshift(trace);
  bucket.splice(30);

  // Send to Langfuse for observability
  try {
    const langfuse = getLangfuseService();
    if (langfuse.isConfigured()) {
      await langfuse.traceConversation(trace);
    }
  } catch (error) {
    console.error("[Traces] Failed to send to Langfuse:", error);
  }

  return trace;
}

export function listRecentTraces(limit = 12) {
  return getTraceBucket().slice(0, limit);
}
