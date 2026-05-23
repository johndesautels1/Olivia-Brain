"use client";

/**
 * `ComparisonView` — side-by-side 2-3 column comparison with optional
 * verdict line + winner highlight.
 *
 * Powers cluesxscore mini-app verdicts (London vs Berlin on 100
 * metrics), cluesintelligence top-3 city renders, clueslondon
 * investor / district comparisons, Deal Protection counter-offer vs
 * original, Quantara round-axis trajectories.
 *
 * Layout: CSS grid with `repeat(N, minmax(0, 1fr))`. Each column has
 * an accent border on top, a name + optional score chip, a verticals
 * highlights / lowlights block, and an optional gold-rim "winner"
 * highlight that promotes the named column visually.
 *
 * Per `01_UI_DESIGN_SYSTEM.md` — Aurum + Aether tokens only, no raw
 * hex, no untokenised colour. Verdict line uses an Aurum-tinted
 * blockquote-style row to read as "the conclusion" without competing
 * with the columns themselves.
 */

import type {
  ComparisonSpec,
  ComparisonColumn,
} from "./comparison-spec";
import { resolveColumnAccent } from "./comparison-spec";

export interface ComparisonViewProps {
  spec: ComparisonSpec;
  maxWidth?: number;
}

export function ComparisonView({ spec, maxWidth = 640 }: ComparisonViewProps) {
  const n = spec.columns.length;
  const winnerLower = spec.winner?.toLowerCase();

  return (
    <figure
      style={{
        margin: "10px 0",
        maxWidth,
        padding: 14,
        borderRadius: "var(--radius-lg)",
        background: "var(--canvas-recess)",
        border: "1px solid var(--border-default)",
        display: "grid",
        gap: 12,
      }}
    >
      {spec.title && (
        <figcaption
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--aurum-primary)",
          }}
        >
          {spec.title}
        </figcaption>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
          gap: 10,
        }}
      >
        {spec.columns.map((col, i) => (
          <ColumnCard
            key={col.name + i}
            column={col}
            index={i}
            isWinner={!!winnerLower && col.name.toLowerCase() === winnerLower}
          />
        ))}
      </div>

      {spec.verdict && (
        <p
          role="note"
          style={{
            margin: 0,
            padding: "8px 12px",
            background: "var(--aurum-mute)",
            borderRadius: "var(--radius-md)",
            borderLeft: "2px solid var(--aurum-primary)",
            color: "var(--fg-secondary)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          {spec.verdict}
        </p>
      )}
    </figure>
  );
}

interface ColumnCardProps {
  column: ComparisonColumn;
  index: number;
  isWinner: boolean;
}

function ColumnCard({ column, index, isWinner }: ColumnCardProps) {
  const accent = resolveColumnAccent(column.tone, index);

  return (
    <article
      aria-label={`${column.name}${column.score !== undefined ? `, score ${column.score}` : ""}${isWinner ? ", winner" : ""}`}
      style={{
        padding: 12,
        background: "var(--surface-1)",
        border: isWinner
          ? "1px solid var(--aurum-primary)"
          : "1px solid var(--border-subtle)",
        borderTop: `3px solid ${accent}`,
        borderRadius: "var(--radius-md)",
        display: "grid",
        gap: 8,
        minWidth: 0,
        position: "relative",
        boxShadow: isWinner ? "0 0 0 1px var(--aurum-primary), 0 0 18px var(--aurum-mute)" : "none",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            color: "var(--fg-primary)",
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {column.name}
        </span>
        {column.score !== undefined && (
          <span
            className="tabular-nums"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              color: accent,
              lineHeight: 1,
            }}
          >
            {column.score}
          </span>
        )}
      </header>

      {isWinner && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            padding: "2px 6px",
            borderRadius: "var(--radius-sm)",
            background: "var(--aurum-primary)",
            color: "var(--fg-on-accent)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            fontWeight: 700,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          ★ Winner
        </span>
      )}

      {column.highlights && column.highlights.length > 0 && (
        <BulletList
          items={column.highlights}
          glyph="+"
          glyphColor="var(--mint-up)"
        />
      )}
      {column.lowlights && column.lowlights.length > 0 && (
        <BulletList
          items={column.lowlights}
          glyph="−"
          glyphColor="var(--coral-down)"
        />
      )}
    </article>
  );
}

function BulletList({
  items,
  glyph,
  glyphColor,
}: {
  items: readonly string[];
  glyph: string;
  glyphColor: string;
}) {
  return (
    <ul
      style={{
        margin: 0,
        padding: 0,
        listStyle: "none",
        display: "grid",
        gap: 4,
      }}
    >
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "12px 1fr",
            gap: 6,
            alignItems: "baseline",
            color: "var(--fg-secondary)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.45,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              color: glyphColor,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: "var(--text-xs)",
              lineHeight: 1.5,
            }}
          >
            {glyph}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
