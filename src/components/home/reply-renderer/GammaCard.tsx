"use client";

/**
 * `GammaCard` — render a Gamma deck preview card from a `gamma` fence
 * (Track N Session N5).
 *
 * Olivia returns:
 *
 *   ```gamma
 *   { "url": "https://gamma.app/docs/...",
 *     "title": "Quantara Series A pitch",
 *     "summary": "12-slide investor deck...",
 *     "slides": 12 }
 *   ```
 *
 * The card shows the title + summary + slide count + "Open in Gamma"
 * action. Only the `url` field is required; the others are optional
 * decoration.
 *
 * Future enhancement (post-launch): swap the static card for a real
 * thumbnail by hitting Gamma's preview API. For S30 demo, a clean
 * card + open-button is enough.
 */

export interface GammaCardSpec {
  url: string;
  title?: string;
  summary?: string;
  slides?: number;
}

export type GammaCardParseResult =
  | { ok: true; spec: GammaCardSpec }
  | { ok: false; error: string };

export function parseGammaSpec(raw: string): GammaCardParseResult {
  /* Allow either a JSON object OR a bare URL string for the simplest
   * case where Olivia just wants to surface a deck without metadata. */
  const trimmed = raw.trim();
  if (/^https?:\/\//.test(trimmed)) {
    return { ok: true, spec: { url: trimmed } };
  }
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "JSON parse failed" };
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { ok: false, error: "expected object or bare URL" };
  }
  const obj = json as Record<string, unknown>;
  if (typeof obj.url !== "string" || !/^https?:\/\//.test(obj.url)) {
    return { ok: false, error: 'requires "url" with http(s) scheme' };
  }
  const spec: GammaCardSpec = { url: obj.url };
  if (typeof obj.title === "string") spec.title = obj.title;
  if (typeof obj.summary === "string") spec.summary = obj.summary;
  if (typeof obj.slides === "number" && Number.isFinite(obj.slides)) {
    spec.slides = obj.slides;
  }
  return { ok: true, spec };
}

export interface GammaCardProps {
  spec: GammaCardSpec;
  maxWidth?: number;
}

export function GammaCard({ spec, maxWidth = 560 }: GammaCardProps) {
  const hostname = (() => {
    try {
      return new URL(spec.url).hostname;
    } catch {
      return spec.url;
    }
  })();

  return (
    <article
      style={{
        margin: "10px 0",
        maxWidth,
        padding: 16,
        borderRadius: "var(--radius-lg)",
        background: "var(--canvas-recess)",
        border: "1px solid var(--border-default)",
        display: "grid",
        gap: 10,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: 36,
            height: 36,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, var(--aurum-primary), var(--aurum-soft))",
            color: "var(--fg-on-accent)",
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            fontWeight: 700,
          }}
        >
          ▤
        </span>
        <div style={{ display: "grid", gap: 2, minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--aurum-primary)",
            }}
          >
            Gamma deck
            {spec.slides !== undefined && (
              <>
                <span style={{ opacity: 0.6, padding: "0 6px" }}>·</span>
                <span className="tabular-nums">{spec.slides} slides</span>
              </>
            )}
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-md)",
              color: "var(--fg-primary)",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {spec.title ?? hostname}
          </span>
        </div>
      </header>

      {spec.summary && (
        <p
          style={{
            margin: 0,
            color: "var(--fg-secondary)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.5,
          }}
        >
          {spec.summary}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--fg-tertiary)",
            letterSpacing: "0.06em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {hostname}
        </span>
        <a
          href={spec.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-full)",
            background: "var(--aurum-primary)",
            color: "var(--fg-on-accent)",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: "var(--text-xs)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Open in Gamma →
        </a>
      </div>
    </article>
  );
}
