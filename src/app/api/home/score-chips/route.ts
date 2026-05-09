/**
 * `GET /api/home/score-chips` — aggregate live data for the header
 * score chips (Track U Session U3).
 *
 * Returns three signals in a single round-trip:
 *
 *   - **CSC** (Cascade Score)   — % of last-N traces that landed a
 *                                 non-mock provider. 0-100.
 *   - **AGO** (Agents Online)   — count of active, non-archived agents
 *                                 in the registry.
 *   - **CSR** (Cascade Success Rate) — % of last-N traces that succeeded
 *                                 on the first provider attempt. 0-100.
 *
 * Degrades gracefully — DB failure → AGO falls back to provider count;
 * empty trace bucket → CSC / CSR return `null` (chip renders "—").
 */

import { NextResponse } from "next/server";
import { getProviderStatuses } from "@/lib/foundation/status";
import { listRecentTraces } from "@/lib/observability/traces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ScoreChipsResponse {
  csc: number | null;
  ago: number;
  csr: number | null;
  refreshedAt: string;
}

export async function GET() {
  const providers = getProviderStatuses();
  const traces = listRecentTraces(30);

  /* Cascade Score — % of recent traces that selected a real provider
     (anything except `mock`). Mock-mode counts as a degraded path. */
  let csc: number | null = null;
  if (traces.length > 0) {
    const real = traces.filter((t) => t.selectedProvider !== "mock").length;
    csc = Math.round((real / traces.length) * 100);
  }

  /* Cascade Success Rate — % of traces where the first attempt won. */
  let csr: number | null = null;
  if (traces.length > 0) {
    const firstHit = traces.filter(
      (t) => t.attempts && t.attempts.length > 0 && t.attempts[0]!.success,
    ).length;
    csr = Math.round((firstHit / traces.length) * 100);
  }

  /* Agents online — try Prisma, fall back to provider count if DB unavailable. */
  let ago = providers.filter((p) => p.configured).length;
  try {
    const { default: prisma } = await import("@/lib/db/client");
    const count = await prisma.agents.count({
      where: { is_archived: false, status: "active" },
    });
    ago = count;
  } catch {
    /* Prisma unavailable in preview / build — keep provider fallback. */
  }

  const body: ScoreChipsResponse = {
    csc,
    ago,
    csr,
    refreshedAt: new Date().toISOString(),
  };
  /* Track K S28 — short-TTL cache (client polls every 30s; this lets
   * a CDN / edge dedup identical concurrent requests during high
   * fanout). 20s + SWR 60s gives smooth refresh without hammering
   * the trace bucket / Prisma. */
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=20, stale-while-revalidate=60",
    },
  });
}
