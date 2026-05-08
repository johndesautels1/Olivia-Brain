"use client";

/**
 * `RecentWorkStrip` — Claude-Artifacts-style strip of recent work.
 *
 * Live data via `useHomeDashboard()` → `/api/home/dashboard`. Sourced
 * from `DealAnalysis`, `ValuationRun`, `Document` (status=ready), and
 * `OliviaPresentation` (status=completed). Renders nothing when the
 * dashboard hasn't returned yet OR when the user has no recent work
 * (empty-state copy explains).
 */

import type { RecentItem } from "@/hooks";

const KIND_GLYPH: Record<RecentItem["kind"], string> = {
  deal: "◇",
  valuation: "◉",
  doc: "▦",
  deck: "▤",
};

export interface RecentWorkStripProps {
  items?: readonly RecentItem[] | null;
  loading?: boolean;
}

export function RecentWorkStrip({ items, loading }: RecentWorkStripProps) {
  const hasItems = items && items.length > 0;

  return (
    <section aria-label="Recent work" style={{ display: "grid", gap: 12 }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--aurum-primary)",
          }}
        >
          Recent Work
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--fg-tertiary)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          Live
        </span>
      </header>

      {!hasItems && (
        <p
          style={{
            margin: 0,
            padding: 24,
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--border-default)",
            color: "var(--fg-tertiary)",
            fontSize: "var(--text-sm)",
            textAlign: "center",
          }}
        >
          {loading
            ? "Loading recent work…"
            : "No recent work yet. Ask Olivia anything to get started — pitch decks, valuations, deal analyses, and documents will surface here."}
        </p>
      )}

      {hasItems && (
        <div
          role="list"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 10,
          }}
        >
          {items!.map((item) => (
            <RecentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function RecentCard({ item }: { item: RecentItem }) {
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-2)",
            color: "var(--aurum-primary)",
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-md)",
          }}
        >
          {KIND_GLYPH[item.kind]}
        </span>
        <span
          style={{
            color: "var(--fg-primary)",
            fontWeight: 500,
            fontSize: "var(--text-sm)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {item.title}
        </span>
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--fg-tertiary)",
        }}
      >
        {item.meta}
      </span>
    </>
  );

  const styleBase: React.CSSProperties = {
    display: "grid",
    gap: 8,
    padding: 14,
    borderRadius: "var(--radius-lg)",
    background: "var(--canvas-recess)",
    border: "1px solid var(--border-subtle)",
    textDecoration: "none",
    color: "inherit",
    transition:
      "border-color var(--duration-micro) var(--ease-out-quart), background var(--duration-micro) var(--ease-out-quart)",
  };

  if (item.href) {
    return (
      <a role="listitem" href={item.href} style={styleBase}>
        {inner}
      </a>
    );
  }
  return (
    <article role="listitem" style={styleBase}>
      {inner}
    </article>
  );
}
