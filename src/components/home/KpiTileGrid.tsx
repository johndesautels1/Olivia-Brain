"use client";

/**
 * `KpiTileGrid` — three-tile KPI strip (Today / Agents / Next).
 *
 * U1 stub: static placeholder. U4 wires to live data sources:
 *   - Today: agent_runs (calls / deals / verdicts today)
 *   - Agents: /api/admin/agents (online count + briefings)
 *   - Next: CalendarPrepTask + agent_briefings (upcoming work)
 */

export function KpiTileGrid() {
  return (
    <section
      aria-label="Workspace KPIs"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 16,
      }}
    >
      <KpiTile
        eyebrow="Today"
        primary="14"
        primaryUnit="calls"
        rows={[
          { label: "deals", value: "3" },
          { label: "verdicts", value: "1" },
        ]}
      />
      <KpiTile
        eyebrow="Agents"
        primary="247"
        primaryUnit="online"
        rows={[
          { label: "briefings", value: "6" },
          { label: "uptime", value: "99.4 %" },
        ]}
      />
      <KpiTile
        eyebrow="Next"
        primary="3"
        primaryUnit="prep tasks"
        rows={[
          { label: "today", value: "—" },
          { label: "briefings ready", value: "6" },
        ]}
      />
    </section>
  );
}

function KpiTile({
  eyebrow,
  primary,
  primaryUnit,
  rows,
}: {
  eyebrow: string;
  primary: string;
  primaryUnit: string;
  rows: { label: string; value: string }[];
}) {
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
          {primary}
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
          {primaryUnit}
        </span>
      </div>
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
        {rows.map((row) => (
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
    </article>
  );
}
