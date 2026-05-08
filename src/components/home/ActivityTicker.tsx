"use client";

/**
 * `ActivityTicker` — Bloomberg-style live activity strip beneath
 * the hero orb.
 *
 * U1 stub: static placeholder. U2 wires to `/api/health` +
 * `/api/admin/agents` for live agent / cascade telemetry.
 */

export function ActivityTicker() {
  return (
    <div
      role="status"
      aria-label="Activity"
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
      <TickerCell label="agents" value="247 online" tone="mint" />
      <TickerCell label="cascade" value="99.4 %" tone="aurum" />
      <TickerCell label="last" value="—" tone="dim" />
    </div>
  );
}

function TickerCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "mint" | "aurum" | "dim";
}) {
  const color =
    tone === "mint"
      ? "var(--mint-up)"
      : tone === "aurum"
        ? "var(--aurum-primary)"
        : "var(--fg-tertiary)";
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <span style={{ color: "var(--fg-tertiary)" }}>{label}</span>
      <span className="tabular-nums" style={{ color, fontWeight: 600 }}>
        {value}
      </span>
    </span>
  );
}
