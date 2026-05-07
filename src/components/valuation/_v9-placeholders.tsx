/**
 * Placeholders for V9 components that `ValuationWorkbench` imports.
 *
 * V8 ports the workbench shell + 31 zone components; V9 ports the War
 * Room family (`WarRoom`, `DealRoomSimulator`, `AcquisitionMirror`,
 * `NegotiationAnchorCard`, `EquityWaterfall`). Because the workbench
 * imports those V9 components, V8 ships these placeholders so the page
 * tree compiles, mounts, and renders a clear "Coming in V9" badge in
 * any slot the V9 component would have filled. V9 replaces these files
 * with the real LTM ports.
 *
 * The placeholders deliberately accept `unknown`-typed props so that
 * V9's real component signatures (which the workbench already passes)
 * type-check today without binding to the placeholder shape. V9's port
 * uses the LTM signatures verbatim.
 */

import type { ReactNode } from "react";

interface PlaceholderProps {
  label: string;
  hint?: string;
}

function V9Placeholder({ label, hint }: PlaceholderProps): ReactNode {
  return (
    <div
      role="status"
      style={{
        padding: "1rem",
        border: "1px dashed var(--border-default, #2c3645)",
        borderRadius: "8px",
        color: "var(--fg-tertiary, #8b897f)",
        background: "var(--surface-1, #0a1322)",
        fontSize: "0.875rem",
      }}
    >
      <strong>{label}</strong> — placeholder. Full implementation lands in
      Track V Session V9.
      {hint ? <div style={{ marginTop: "0.25rem" }}>{hint}</div> : null}
    </div>
  );
}

export function WarRoomPlaceholder(_: Record<string, unknown>): ReactNode {
  return <V9Placeholder label="War Room" hint="Live negotiation simulator." />;
}

export function DealRoomSimulatorPlaceholder(
  _: Record<string, unknown>,
): ReactNode {
  return (
    <V9Placeholder
      label="Deal Room Simulator"
      hint="Buyer-perspective negotiation rehearsal."
    />
  );
}

export function AcquisitionMirrorPlaceholder(
  _: Record<string, unknown>,
): ReactNode {
  return (
    <V9Placeholder
      label="Acquisition Mirror"
      hint="What an acquirer would pay vs. accept."
    />
  );
}

export function NegotiationAnchorCardPlaceholder(
  _: Record<string, unknown>,
): ReactNode {
  return (
    <V9Placeholder
      label="Negotiation Anchor"
      hint="Walk-away / target / anchor numbers."
    />
  );
}

export function EquityWaterfallPlaceholder(
  _: Record<string, unknown>,
): ReactNode {
  return (
    <V9Placeholder
      label="Equity Waterfall"
      hint="Cap-table dilution + payout split."
    />
  );
}
