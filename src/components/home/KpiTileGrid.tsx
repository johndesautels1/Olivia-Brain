"use client";

/**
 * `KpiTileGrid` — three-tile KPI strip (Today / Agents / Next).
 *
 * Live data from `useHomeDashboard()` → `/api/home/dashboard`.
 * Falls through to "—" placeholders during initial fetch / DB outage.
 */

import type { KpiBlock } from "@/hooks";

const PLACEHOLDER: KpiBlock = {
  primary: "—",
  primaryUnit: "—",
  rows: [],
};

export interface KpiTileGridProps {
  /** Optional dashboard snap. When undefined, all three tiles render placeholders. */
  data?: { today: KpiBlock; agents: KpiBlock; next: KpiBlock } | null;
}

export function KpiTileGrid({ data }: KpiTileGridProps) {
  const today = data?.today ?? PLACEHOLDER;
  const agents = data?.agents ?? PLACEHOLDER;
  const next = data?.next ?? PLACEHOLDER;
  return (
    <section
      aria-label="Workspace KPIs"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 16,
      }}
    >
      <KpiTile eyebrow="Today" block={today} />
      <KpiTile eyebrow="Agents" block={agents} />
      <KpiTile eyebrow="Next" block={next} />
    </section>
  );
}

function KpiTile({ eyebrow, block }: { eyebrow: string; block: KpiBlock }) {
  return (
    <article
      style={{
        padding: 20,
        borderRadius: "var(--radius-xl)",
        background: "var(--surface-1)",
        border: "1px solid var(--border-default)",
        display: "grid",
        gap: 14,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
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
        {eyebrow}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-4xl)",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--fg-primary)",
          }}
        >
          {block.primary}
        </span>
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--fg-tertiary)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {block.primaryUnit}
        </span>
      </div>
      {block.rows.length > 0 && (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 6,
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: 12,
          }}
        >
          {block.rows.map((row) => (
            <li
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: "var(--fg-tertiary)" }}>{row.label}</span>
              <span
                className="tabular-nums"
                style={{ color: "var(--fg-secondary)", fontWeight: 600 }}
              >
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
