"use client";

/**
 * `RecentWorkStrip` — Claude-Artifacts-style strip of recent work.
 *
 * U1 stub: static placeholder cards. U4 wires to:
 *   - DealAnalysis (recent), ValuationRun (recent), Document (recent),
 *     OliviaPresentation (recent gamma decks), agent_runs (recent agentic actions)
 */

const KIND_GLYPH: Record<string, string> = {
  acquisition: "▤",
  autofill: "◐",
  deal: "◇",
  doc: "▦",
  cascade: "◉",
};

interface RecentItem {
  id: string;
  kind: keyof typeof KIND_GLYPH;
  title: string;
  meta: string;
}

const STUB: RecentItem[] = [
  { id: "1", kind: "acquisition", title: "Mercer Acquisition Mirror", meta: "2h ago · valuation" },
  { id: "2", kind: "autofill", title: "Q3 Auto-fill: TechCo", meta: "4h ago · 38/56 fields" },
  { id: "3", kind: "deal", title: "DealRisk: Acme term sheet", meta: "Yesterday · Series A" },
  { id: "4", kind: "doc", title: "Pitch deck — Founder narrative v3", meta: "Yesterday · 12 slides" },
];

export function RecentWorkStrip() {
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
          Last 24h
        </span>
      </header>

      <div
        role="list"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 10,
        }}
      >
        {STUB.map((item) => (
          <article
            key={item.id}
            role="listitem"
            style={{
              display: "grid",
              gap: 8,
              padding: 14,
              borderRadius: "var(--radius-lg)",
              background: "var(--canvas-recess)",
              border: "1px solid var(--border-subtle)",
            }}
          >
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
          </article>
        ))}
      </div>
    </section>
  );
}
