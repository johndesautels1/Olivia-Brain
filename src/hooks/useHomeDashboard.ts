"use client";

/**
 * `useHomeDashboard` — single-round-trip aggregator for `/`'s KPI
 * tile grid + recent work strip. Pulls `/api/home/dashboard` on mount
 * + every 60s.
 *
 * Returns `null` until first response. Last-good snap preserved on
 * transient failure (no flicker to placeholders).
 */

import { useEffect, useState } from "react";

export interface KpiBlock {
  primary: string | number;
  primaryUnit: string;
  rows: { label: string; value: string | number }[];
}

export interface RecentItem {
  id: string;
  kind: "deal" | "valuation" | "doc" | "deck";
  title: string;
  meta: string;
  href?: string;
  timestamp: string;
}

export interface DashboardSnap {
  kpi: { today: KpiBlock; agents: KpiBlock; next: KpiBlock };
  recent: RecentItem[];
  refreshedAt: string;
}

export function useHomeDashboard(): DashboardSnap | null {
  const [snap, setSnap] = useState<DashboardSnap | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function refresh() {
      try {
        const res = await fetch("/api/home/dashboard", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as DashboardSnap;
        if (cancelled) return;
        setSnap(data);
      } catch (err) {
        if (cancelled || (err instanceof Error && err.name === "AbortError")) return;
        /* Keep last good snap. */
      }
    }

    void refresh();
    const id = window.setInterval(refresh, 60_000);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  return snap;
}
