"use client";

/**
 * `MarkdownReply` — Track N1+N3.
 *
 * Renders an Olivia reply as markdown (via react-markdown + remark-gfm)
 * with two custom code-block treatments:
 *
 *   1. ```chart {…JSON spec…}```   → live Recharts visualization
 *   2. ```olivia-mermaid …```      → reserved (Mermaid renderer lands
 *                                     when `mermaid` ships as a dep)
 *
 * Plain code blocks render as pre/code with monospace + canvas-recess
 * surface (no syntax highlight to keep bundle tight).
 *
 * The chart spec is a tiny JSON shape covering 90% of pitch / valuation
 * use cases — bar / line / pie / area — so Olivia can return one
 * fence and the UI manifests a chart inline. See `chart-spec.ts` for
 * the Zod schema; invalid specs fall back to rendering the JSON as a
 * code block so the user sees what failed.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { parseChartSpec } from "./chart-spec";
import { GammaCard, parseGammaSpec } from "./GammaCard";
import { CitationStrip, parseCitations } from "./CitationStrip";
import { TimelineFromSpec, parseTimelineSpec } from "./TimelineFromSpec";
import { MapManifest } from "./MapManifest";
import { parseMapSpec } from "./map-spec";
import { UIManifest } from "./UIManifest";
import { parseUISpec } from "./ui-spec";
import { ComparisonView } from "./ComparisonView";
import { parseComparisonSpec } from "./comparison-spec";

/**
 * Lazy-loaded `ChartFromSpec` (Bundle E-1 Phase 3a, FIX-3 2026-05-26).
 *
 * `ChartFromSpec` pulls in recharts (~120 KB gzipped). Most Olivia
 * replies do not emit a ` ```chart ` fence, so the chart renderer
 * should not ride along in the initial home-page JS. `next/dynamic`
 * with `ssr: false` keeps recharts out of both the server and client
 * initial bundles — the chunk loads only when a chat reply manifests
 * a chart.
 *
 * Public API surface preserved: the barrel `./index.ts` continues to
 * re-export the canonical `ChartFromSpec` from `./ChartFromSpec`
 * statically for any direct consumer (e.g. dedicated unit-test mounts).
 * Only the `MarkdownReply` integration path goes through this lazy
 * wrapper.
 */
const ChartFromSpecLazy = dynamic(
  () => import("./ChartFromSpec").then((m) => ({ default: m.ChartFromSpec })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 220,
          display: "grid",
          placeItems: "center",
          color: "var(--fg-tertiary)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
        }}
        aria-label="Loading chart"
      >
        Loading chart...
      </div>
    ),
  },
);

export interface MarkdownReplyProps {
  text: string;
  /** Optional max width for chart blocks. Defaults to 560. */
  maxChartWidth?: number;
}

export function MarkdownReply({ text, maxChartWidth = 560 }: MarkdownReplyProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        /* Code fences: detect chart language for live render.
         * react-markdown v9+ no longer passes `inline`; we infer it
         * from the absence of a `language-*` className (block code
         * always has one when GFM/code is enabled). */
        code: ({
          className,
          children,
          ...props
        }: {
          className?: string;
          children?: ReactNode;
        } & Record<string, any>) => {
          const lang = /language-([\w-]+)/.exec(className ?? "")?.[1];
          const raw = String(children ?? "").replace(/\n$/, "");
          const isInline = !lang;

          /* Inline `code` — never a chart. */
          if (isInline) {
            return (
              <code
                {...props}
                style={{
                  padding: "1px 6px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--canvas-recess)",
                  border: "1px solid var(--border-subtle)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.9em",
                  color: "var(--aurum-primary)",
                }}
              >
                {children}
              </code>
            );
          }

          /* Chart fence. */
          if (lang === "chart") {
            const parsed = parseChartSpec(raw);
            if (parsed.ok) {
              return (
                <div
                  style={{
                    margin: "10px 0",
                    padding: 12,
                    borderRadius: "var(--radius-lg)",
                    background: "var(--canvas-recess)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <ChartFromSpecLazy spec={parsed.spec} maxWidth={maxChartWidth} />
                </div>
              );
            }
            return (
              <CodeBlock raw={raw} lang={lang} note={`Invalid chart spec: ${parsed.error}`} />
            );
          }

          /* Gamma deck preview fence (Track N N5). */
          if (lang === "gamma") {
            const parsed = parseGammaSpec(raw);
            if (parsed.ok) {
              return <GammaCard spec={parsed.spec} maxWidth={maxChartWidth} />;
            }
            return (
              <CodeBlock raw={raw} lang={lang} note={`Invalid gamma spec: ${parsed.error}`} />
            );
          }

          /* Sources / citations strip (Track O O4). */
          if (lang === "sources") {
            const parsed = parseCitations(raw);
            if (parsed.ok) {
              return <CitationStrip citations={parsed.citations} maxWidth={maxChartWidth} />;
            }
            return (
              <CodeBlock raw={raw} lang={lang} note={`Invalid sources block: ${parsed.error}`} />
            );
          }

          /* Timeline manifest (Track N). */
          if (lang === "timeline") {
            const parsed = parseTimelineSpec(raw);
            if (parsed.ok) {
              return (
                <TimelineFromSpec
                  entries={parsed.entries}
                  maxWidth={maxChartWidth}
                />
              );
            }
            return (
              <CodeBlock raw={raw} lang={lang} note={`Invalid timeline spec: ${parsed.error}`} />
            );
          }

          /* Map manifest (Track N N2) — top-N cities / single pin /
           * district pins. Gracefully degrades to a list card when
           * NEXT_PUBLIC_MAPBOX_TOKEN is missing. */
          if (lang === "map") {
            const parsed = parseMapSpec(raw);
            if (parsed.ok) {
              return <MapManifest spec={parsed.spec} maxWidth={maxChartWidth} />;
            }
            return (
              <CodeBlock raw={raw} lang={lang} note={`Invalid map spec: ${parsed.error}`} />
            );
          }

          /* Generative UI manifest (Track N N4-foundations) — card /
           * stat / progress / button primitives rendered through a
           * fixed registry. No code execution; the LLM emits a JSON
           * description of components and props only. */
          if (lang === "ui") {
            const parsed = parseUISpec(raw);
            if (parsed.ok) {
              return <UIManifest spec={parsed.spec} maxWidth={maxChartWidth} />;
            }
            return (
              <CodeBlock raw={raw} lang={lang} note={`Invalid ui spec: ${parsed.error}`} />
            );
          }

          /* Comparison manifest — side-by-side 2-3 column comparison
           * with optional verdict + winner highlight. Powers all 23
           * cluesxscore mini-app verdicts, cluesintelligence top-3
           * city renders, Deal Protection offer-vs-offer, Quantara
           * round-axis trajectory comparisons. */
          if (lang === "comparison") {
            const parsed = parseComparisonSpec(raw);
            if (parsed.ok) {
              return (
                <ComparisonView
                  spec={parsed.spec}
                  maxWidth={Math.max(maxChartWidth, 640)}
                />
              );
            }
            return (
              <CodeBlock raw={raw} lang={lang} note={`Invalid comparison spec: ${parsed.error}`} />
            );
          }

          /* Generic code block. */
          return <CodeBlock raw={raw} lang={lang} />;
        },
        a: ({ href, children, ...props }: { href?: string; children?: ReactNode } & Record<string, any>) => (
          <a
            {...props}
            href={href}
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
            style={{ color: "var(--aether-primary)", textDecoration: "underline" }}
          >
            {children}
          </a>
        ),
        blockquote: ({ children }: { children?: ReactNode }) => (
          <blockquote
            style={{
              margin: "10px 0",
              padding: "8px 14px",
              borderLeft: "2px solid var(--aurum-primary)",
              background: "var(--canvas-recess)",
              borderRadius: "var(--radius-md)",
              color: "var(--fg-secondary)",
              fontStyle: "italic",
            }}
          >
            {children}
          </blockquote>
        ),
        h1: ({ children }: { children?: ReactNode }) => (
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              color: "var(--fg-primary)",
              margin: "12px 0 6px",
              fontWeight: 500,
            }}
          >
            {children}
          </h3>
        ),
        h2: ({ children }: { children?: ReactNode }) => (
          <h4
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              color: "var(--fg-primary)",
              margin: "10px 0 4px",
              fontWeight: 500,
            }}
          >
            {children}
          </h4>
        ),
        h3: ({ children }: { children?: ReactNode }) => (
          <h5
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--aurum-primary)",
              margin: "8px 0 4px",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            {children}
          </h5>
        ),
        ul: ({ children }: { children?: ReactNode }) => (
          <ul style={{ margin: "6px 0", paddingLeft: 20 }}>{children}</ul>
        ),
        ol: ({ children }: { children?: ReactNode }) => (
          <ol style={{ margin: "6px 0", paddingLeft: 20 }}>{children}</ol>
        ),
        p: ({ children }: { children?: ReactNode }) => (
          <p style={{ margin: "6px 0", lineHeight: 1.55 }}>{children}</p>
        ),
        table: ({ children }: { children?: ReactNode }) => (
          <div style={{ overflowX: "auto", margin: "10px 0" }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: "var(--text-sm)",
              }}
            >
              {children}
            </table>
          </div>
        ),
        th: ({ children }: { children?: ReactNode }) => (
          <th
            style={{
              padding: "6px 8px",
              borderBottom: "1px solid var(--border-default)",
              textAlign: "left",
              color: "var(--aurum-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            {children}
          </th>
        ),
        td: ({ children }: { children?: ReactNode }) => (
          <td
            style={{
              padding: "6px 8px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            {children}
          </td>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function CodeBlock({
  raw,
  lang,
  note,
}: {
  raw: string;
  lang?: string;
  note?: string;
}) {
  return (
    <pre
      style={{
        margin: "10px 0",
        padding: 12,
        borderRadius: "var(--radius-md)",
        background: "var(--canvas-recess)",
        border: "1px solid var(--border-subtle)",
        overflowX: "auto",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        color: "var(--fg-secondary)",
        lineHeight: 1.5,
      }}
    >
      {lang && (
        <span
          style={{
            display: "block",
            color: "var(--aurum-primary)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          {lang}
        </span>
      )}
      <code>{raw}</code>
      {note && (
        <span
          style={{
            display: "block",
            color: "var(--coral-down)",
            fontSize: "var(--text-2xs)",
            marginTop: 6,
            fontStyle: "italic",
          }}
        >
          {note}
        </span>
      )}
    </pre>
  );
}
