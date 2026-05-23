"use client";

/**
 * `UIManifest` — Track N N4-foundations (generative UI).
 *
 * Renders a `ui` fence inline in an Olivia reply. The LLM emits a JSON
 * description of which components to render; this renderer dispatches
 * through a fixed registry of four primitives:
 *
 *   - `card`     — titled body block with optional emphasis tone
 *   - `stat`     — labelled value with optional delta + semantic tone
 *   - `progress` — labelled 0-100 bar in any canonical colour token
 *   - `button`   — labelled link (HTTP(S)-only, parser-enforced)
 *
 * # Safety
 *
 * Per the safety mandate in `ui-spec.ts`, the LLM does not emit code.
 * Every render path consumes only validated props through a closed
 * registry. There is no JSX/HTML smuggle path, no event-handler
 * surface, no class/style passthrough.
 *
 * Future N4 sessions add additional primitives (form, group/stack,
 * data-table) plus the Vercel v0 dynamic-component path. This file is
 * the safe foundation those sessions extend.
 */

import type {
  UIComponent,
  UICard,
  UIStat,
  UIProgress,
  UIButton,
  UISpec,
} from "./ui-spec";
import {
  clampProgress,
  resolveTokenColor,
  resolveTokenMute,
  resolveTone,
} from "./ui-spec";

export interface UIManifestProps {
  spec: UISpec;
  maxWidth?: number;
}

export function UIManifest({ spec, maxWidth = 560 }: UIManifestProps) {
  return (
    <section
      style={{
        margin: "10px 0",
        maxWidth,
        padding: 14,
        borderRadius: "var(--radius-lg)",
        background: "var(--canvas-recess)",
        border: "1px solid var(--border-default)",
        display: "grid",
        gap: 10,
      }}
    >
      {spec.title && (
        <h6
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
        </h6>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {spec.components.map((c, i) => (
          <ComponentDispatch key={i} component={c} />
        ))}
      </div>
    </section>
  );
}

function ComponentDispatch({ component }: { component: UIComponent }) {
  switch (component.kind) {
    case "card":
      return <CardPrimitive card={component} />;
    case "stat":
      return <StatPrimitive stat={component} />;
    case "progress":
      return <ProgressPrimitive progress={component} />;
    case "button":
      return <ButtonPrimitive button={component} />;
  }
}

/* ── Card ──────────────────────────────────────────────────────────── */

function CardPrimitive({ card }: { card: UICard }) {
  const accent = resolveTokenColor(card.tone);
  const tint = resolveTokenMute(card.tone);
  return (
    <article
      style={{
        padding: "10px 12px 10px 14px",
        background: tint,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
        borderLeft: `3px solid ${accent}`,
        display: "grid",
        gap: 4,
      }}
    >
      {card.title && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-md)",
            fontWeight: 500,
            color: "var(--fg-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {card.title}
        </span>
      )}
      <p
        style={{
          margin: 0,
          color: "var(--fg-secondary)",
          fontSize: "var(--text-sm)",
          lineHeight: 1.5,
        }}
      >
        {card.body}
      </p>
    </article>
  );
}

/* ── Stat ──────────────────────────────────────────────────────────── */

function StatPrimitive({ stat }: { stat: UIStat }) {
  const toneVar = resolveTone(stat.tone);
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "baseline",
        gap: 12,
      }}
    >
      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--fg-tertiary)",
          }}
        >
          {stat.label}
        </span>
        <span
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            fontWeight: 600,
            color: "var(--fg-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          {stat.value}
        </span>
      </div>
      {stat.delta && (
        <span
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color: toneVar,
          }}
        >
          {stat.delta}
        </span>
      )}
    </div>
  );
}

/* ── Progress ──────────────────────────────────────────────────────── */

function ProgressPrimitive({ progress }: { progress: UIProgress }) {
  const pct = clampProgress(progress.value);
  const accent = resolveTokenColor(progress.color);
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        display: "grid",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--fg-tertiary)",
          }}
        >
          {progress.label}
        </span>
        <span
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color: accent,
          }}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={progress.label}
        style={{
          height: 6,
          background: "var(--canvas-base)",
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "block",
            height: "100%",
            width: `${pct}%`,
            background: accent,
            borderRadius: "var(--radius-full)",
            transition: "width var(--duration-base) var(--ease-out-quart)",
          }}
        />
      </div>
    </div>
  );
}

/* ── Button ────────────────────────────────────────────────────────── */

function ButtonPrimitive({ button }: { button: UIButton }) {
  const isPrimary = (button.tone ?? "primary") === "primary";
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: "var(--radius-full)",
    fontFamily: "var(--font-sans)",
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
    border: isPrimary ? "none" : "1px solid var(--border-default)",
    background: isPrimary ? "var(--aurum-primary)" : "transparent",
    color: isPrimary ? "var(--fg-on-accent)" : "var(--fg-primary)",
    whiteSpace: "nowrap",
  };
  const wrapperStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-start",
    padding: "2px 0",
  };

  /* href-bearing → render as anchor (parser already restricted to
   * http(s) schemes; no JS or data: leakage possible). */
  if (button.href) {
    return (
      <div style={wrapperStyle}>
        <a
          href={button.href}
          target="_blank"
          rel="noopener noreferrer"
          style={baseStyle}
        >
          {button.label} →
        </a>
      </div>
    );
  }
  /* href-less → inert button. No onClick on the LLM-derived surface;
   * the founder can wire a custom-element listener in a host page if
   * needed, but the foundation primitive does not dispatch. */
  return (
    <div style={wrapperStyle}>
      <button type="button" disabled style={{ ...baseStyle, cursor: "default", opacity: 0.7 }}>
        {button.label}
      </button>
    </div>
  );
}
