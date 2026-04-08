import type { FoundationTrace } from "@/lib/foundation/types";

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

  return trace;
}

export function listRecentTraces(limit = 12) {
  return getTraceBucket().slice(0, limit);
}
