"use client";

/**
 * `TimelineFromSpec` — Track N timeline manifestation.
 *
 * Olivia returns chronological data as a `timeline` fence:
 *
 *   ```timeline
 *   [
 *     { "date": "2024-Q1", "title": "Series A closed", "detail": "£8M from Atomico" },
 *     { "date": "2024-Q3", "title": "EU expansion", "detail": "Berlin + Paris offices" },
 *     { "date": "2025-Q1", "title": "Series B", "detail": "£32M led by Index" }
 *   ]
 *   ```
 *
 * Renders as a vertical rail with aurum-tinted dots, monospace dates,
 * and detail copy on the right. More compact than a chart for
 * narratives where dates are the axis but values aren't comparable.
 *
 * Optional `tone` per entry tints the dot:
 *   - "neutral"  (default — aurum)
 *   - "positive" — mint
 *   - "warning"  — amber
 *   - "danger"   — coral
 */

const TONE_HEX: Record<string, string> = {
  neutral: "var(--aurum-primary)",
  positive: "var(--mint-up)",
  warning: "var(--amber-warn)",
  danger: "var(--coral-down)",
};

export interface TimelineEntry {
  date: string;
  title: string;
  detail?: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
}

export type TimelineParseResult =
  | { ok: true; entries: TimelineEntry[] }
  | { ok: false; error: string };

export function parseTimelineSpec(raw: string): TimelineParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "JSON parse failed" };
  }
  if (!Array.isArray(json)) {
    return { ok: false, error: "expected JSON array" };
  }
  if (json.length === 0) {
    return { ok: false, error: "timeline array is empty" };
  }
  const out: TimelineEntry[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.date !== "string") continue;
    if (typeof obj.title !== "string") continue;
    const entry: TimelineEntry = { date: obj.date, title: obj.title };
    if (typeof obj.detail === "string") entry.detail = obj.detail;
    if (
      obj.tone === "neutral" ||
      obj.tone === "positive" ||
      obj.tone === "warning" ||
      obj.tone === "danger"
    ) {
      entry.tone = obj.tone;
    }
    out.push(entry);
  }
  if (out.length === 0) {
    return { ok: false, error: "no valid entries (each needs date + title)" };
  }
  return { ok: true, entries: out };
}

export interface TimelineFromSpecProps {
  entries: readonly TimelineEntry[];
  maxWidth?: number;
}

export function TimelineFromSpec({ entries, maxWidth = 560 }: TimelineFromSpecProps) {
  return (
    <ol
      style={{
        margin: "10px 0",
        padding: 0,
        maxWidth,
        listStyle: "none",
        position: "relative",
        display: "grid",
        gap: 14,
      }}
    >
      {/* Vertical rail line */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 9,
          top: 6,
          bottom: 6,
          width: 1,
          background: "var(--border-subtle)",
        }}
      />
      {entries.map((e, i) => {
        const tone = TONE_HEX[e.tone ?? "neutral"];
        return (
          <li
            key={`${e.date}-${i}`}
            style={{
              display: "grid",
              gridTemplateColumns: "20px 1fr",
              alignItems: "start",
              gap: 12,
              position: "relative",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 12,
                height: 12,
                borderRadius: "var(--radius-full)",
                background: tone,
                marginTop: 4,
                boxShadow: `0 0 0 3px var(--canvas-recess), 0 0 12px ${tone}`,
              }}
            />
            <div style={{ display: "grid", gap: 2 }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-2xs)",
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: tone,
                  }}
                >
                  {e.date}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    color: "var(--fg-primary)",
                  }}
                >
                  {e.title}
                </span>
              </span>
              {e.detail && (
                <span
                  style={{
                    color: "var(--fg-secondary)",
                    fontSize: "var(--text-sm)",
                    lineHeight: 1.5,
                  }}
                >
                  {e.detail}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
