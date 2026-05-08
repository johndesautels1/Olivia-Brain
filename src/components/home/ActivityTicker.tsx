"use client";

/**
 * `ActivityTicker` — Bloomberg-style live activity strip beneath
 * the hero orb.
 *
 * Pulls foundation status from `/api/health` on mount + every 30s.
 * Three signals:
 *   - providers — number of cascade providers configured / total
 *   - mode      — runtimeMode (live / mock / degraded)
 *   - last sync — relative timestamp since last health refresh
 *
 * Falls through to "—" placeholders if the route 404s or the response
 * shape doesn't match (preview / mock / dev).
 */

import { useEffect, useState } from "react";

interface FoundationProvider {
  configured?: boolean;
}

interface FoundationStatusResponse {
  runtimeMode?: string;
  providers?: FoundationProvider[];
  integrations?: Array<{ status?: string }>;
}

interface TickerSnapshot {
  configured: number;
  total: number;
  mode: string;
  refreshedAt: number;
}

export function ActivityTicker() {
  const [snap, setSnap] = useState<TickerSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function refresh() {
      try {
        const res = await fetch("/api/health", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as FoundationStatusResponse;
        if (cancelled) return;
        const total = data.providers?.length ?? 0;
        const configured =
          data.providers?.filter((p) => p.configured).length ?? 0;
        setSnap({
          configured,
          total,
          mode: data.runtimeMode ?? "live",
          refreshedAt: Date.now(),
        });
        setError(false);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setError(true);
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

  const providers =
    snap && snap.total > 0 ? `${snap.configured} / ${snap.total}` : "—";
  const mode = snap?.mode ?? (error ? "offline" : "—");
  const sinceLabel = snap ? formatRelative(snap.refreshedAt) : "—";

  const modeTone =
    mode === "live" ? "mint" : mode === "mock" || mode === "degraded" ? "amber" : "dim";

  return (
    <div
      role="status"
      aria-label="Foundation activity"
      style={{
        marginInline: "auto",
        display: "inline-flex",
        gap: 18,
        padding: "8px 16px",
        borderRadius: "var(--radius-full)",
        background: "var(--canvas-recess)",
        border: "1px solid var(--border-subtle)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: "var(--fg-tertiary)",
      }}
    >
      <TickerCell label="providers" value={providers} tone="aurum" />
      <span style={{ color: "var(--border-default)" }}>·</span>
      <TickerCell label="mode" value={mode} tone={modeTone} />
      <span style={{ color: "var(--border-default)" }}>·</span>
      <TickerCell label="last sync" value={sinceLabel} tone="dim" />
    </div>
  );
}

type Tone = "mint" | "aurum" | "amber" | "dim";

function TickerCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: Tone;
}) {
  const color = TONE_COLOR[tone];
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <span style={{ color: "var(--fg-tertiary)" }}>{label}</span>
      <span className="tabular-nums" style={{ color, fontWeight: 600 }}>
        {value}
      </span>
    </span>
  );
}

const TONE_COLOR: Record<Tone, string> = {
  mint: "var(--mint-up)",
  aurum: "var(--aurum-primary)",
  amber: "var(--amber-warn)",
  dim: "var(--fg-tertiary)",
};

function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}
