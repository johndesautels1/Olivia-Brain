"use client";

/**
 * `CitationStrip` — Track O Session O4. Citation-first RAG manifestation.
 *
 * Olivia returns research-backed claims with their source list as a
 * fenced `sources` block:
 *
 *   ```sources
 *   [
 *     { "title": "MHRA Software as a Medical Device", "url": "https://www.gov.uk/...", "source": "MHRA" },
 *     { "title": "FDA Pre-Cert Pilot", "url": "https://www.fda.gov/...", "source": "FDA" }
 *   ]
 *   ```
 *
 * Renders as a horizontal strip of small numbered chips beneath the
 * narrative reply — each chip clickable, each opening the source in a
 * new tab. Domain shows under the title. The strip auto-numbers so
 * the user can map inline `[1]` / `[2]` citations to entries.
 *
 * The contract is intentionally minimal — `title` + `url` required;
 * `source` (publisher) optional. Anything else gets dropped.
 */

export interface Citation {
  title: string;
  url: string;
  /** Optional publisher / outlet name. */
  source?: string;
}

export type CitationsParseResult =
  | { ok: true; citations: Citation[] }
  | { ok: false; error: string };

export function parseCitations(raw: string): CitationsParseResult {
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
    return { ok: false, error: "sources array is empty" };
  }
  const out: Citation[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.title !== "string") continue;
    if (typeof obj.url !== "string" || !/^https?:\/\//.test(obj.url)) continue;
    const c: Citation = { title: obj.title, url: obj.url };
    if (typeof obj.source === "string") c.source = obj.source;
    out.push(c);
  }
  if (out.length === 0) {
    return { ok: false, error: "no valid citations (each needs title + http(s) url)" };
  }
  return { ok: true, citations: out };
}

export interface CitationStripProps {
  citations: readonly Citation[];
  maxWidth?: number;
}

export function CitationStrip({ citations, maxWidth = 720 }: CitationStripProps) {
  return (
    <aside
      aria-label="Sources"
      style={{
        margin: "10px 0",
        maxWidth,
        display: "grid",
        gap: 6,
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
        Sources
      </span>
      <ol
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 6,
        }}
      >
        {citations.map((c, i) => (
          <li key={`${c.url}-${i}`}>
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "grid",
                gap: 2,
                padding: "6px 10px",
                borderRadius: "var(--radius-md)",
                background: "var(--canvas-recess)",
                border: "1px solid var(--border-subtle)",
                color: "var(--fg-primary)",
                textDecoration: "none",
                fontSize: "var(--text-xs)",
                lineHeight: 1.35,
                transition:
                  "border-color var(--duration-micro) var(--ease-out-quart), background var(--duration-micro) var(--ease-out-quart)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  fontWeight: 500,
                }}
              >
                <span
                  className="tabular-nums"
                  style={{
                    color: "var(--aurum-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-2xs)",
                  }}
                >
                  [{i + 1}]
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {c.title}
                </span>
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  letterSpacing: "0.04em",
                  color: "var(--fg-tertiary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.source ?? hostnameOf(c.url)}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
