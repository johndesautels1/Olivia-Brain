"use client";

/**
 * `useScoreChips` — pulls live header-chip telemetry from
 * `/api/home/score-chips` on mount + every 30s.
 *
 * Returns three values keyed for direct mapping into the Header's
 * `scoreChips` prop:
 *
 *   - CSC  — Cascade Score (0-100)
 *   - AGO  — Agents online (count)
 *   - CSR  — Cascade Success Rate (0-100)
 *
 * Falls through to `null` (chip renders "—") when the route is
 * unreachable or the response shape doesn't match.
 */

import { useEffect, useState } from "react";

interface ScoreChipsSnap {
  csc: number | null;
  ago: number | null;
  csr: number | null;
  refreshedAt: number | null;
}

const EMPTY: ScoreChipsSnap = {
  csc: null,
  ago: null,
  csr: null,
  refreshedAt: null,
};

export function useScoreChips(): ScoreChipsSnap {
  const [snap, setSnap] = useState<ScoreChipsSnap>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function refresh() {
      try {
        const res = await fetch("/api/home/score-chips", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          csc?: number | null;
          ago?: number | null;
          csr?: number | null;
        };
        if (cancelled) return;
        setSnap({
          csc: data.csc ?? null,
          ago: data.ago ?? null,
          csr: data.csr ?? null,
          refreshedAt: Date.now(),
        });
      } catch (err) {
        if (cancelled || (err instanceof Error && err.name === "AbortError")) return;
        /* Keep last good snap; don't blank on transient failure. */
      }
    }

    void refresh();
    const id = window.setInterval(refresh, 30_000);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  return snap;
}
