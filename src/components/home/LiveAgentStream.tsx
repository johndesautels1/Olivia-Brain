"use client";

/**
 * `LiveAgentStream` — Devin-style live activity ticker.
 *
 * Renders the last 3 agent-run events as a monospace strip with
 * timestamps. Pulls from `/api/home/dashboard` indirectly (via the
 * shared dashboard snapshot — caller passes the recent items).
 *
 * For U5 we use the dashboard's `recent` items as a stand-in for
 * agent-run telemetry. A future track can swap this for a dedicated
 * `/api/home/agent-stream` route if we want true streaming.
 */

import type { RecentItem } from "@/hooks";

export interface LiveAgentStreamProps {
  items?: readonly RecentItem[] | null;
}

const KIND_LABEL: Record<RecentItem["kind"], string> = {
  deal: "deal-protect",
  valuation: "valuation",
  doc: "doc-engine",
  deck: "gamma",
};

export function LiveAgentStream({ items }: LiveAgentStreamProps) {
  const top = items?.slice(0, 3) ?? [];
  return (
    <div
      role="log"
      aria-label="Live agent stream"
      style={{
        marginTop: 8,
        padding: "10px 12px",
        borderTop: "1px solid var(--border-default)",
        background: "var(--canvas-base)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.06em",
        color: "var(--fg-tertiary)",
        display: "grid",
        gap: 4,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "var(--aurum-primary)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        <span>Agent Stream</span>
        <span style={{ color: "var(--fg-tertiary)" }}>· live</span>
      </header>
      {top.length === 0 && (
        <span style={{ fontStyle: "italic" }}>idle — agents waiting</span>
      )}
      {top.map((item) => (
        <span
          key={item.id}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ color: "var(--aether-primary)" }}>
            {KIND_LABEL[item.kind]}
          </span>
          <span
            style={{
              color: "var(--fg-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textTransform: "none",
              letterSpacing: "0.02em",
            }}
          >
            {item.title} · {item.meta}
          </span>
        </span>
      ))}
    </div>
  );
}
