"use client";

/**
 * `IntakeVerdictPanel` — body of the inspector's "Verdict" tab on the
 * founder-intake surface.
 *
 * Q2 ships a directionally-correct mock valuation preview using the
 * same simple multiple math the LTM mockup uses (ARR × growth-bumped
 * revenue multiple). It is **not** a live valuation; the real engine
 * runs through Track V's `/api/valuation/run` route on demand. The
 * preview helps the founder see their inputs map to a plausible
 * post-money number while they fill the form.
 *
 * # No raw hex
 *
 * Per `docs/01_UI_DESIGN_SYSTEM.md` § 1.6 every paint references a
 * canonical token. Currency formatting uses `Intl.NumberFormat` so the
 * pound sign honours user locale.
 */

import { useMemo } from "react";

import type { QuantaraValues } from "@/lib/quantara";

import type { CompletenessSummary } from "./completeness";

export interface IntakeVerdictPanelProps {
  values: QuantaraValues;
  overall: CompletenessSummary;
}

interface PreviewMath {
  readonly multiple: number;
  readonly arr: number;
  readonly base: number;
  readonly low: number;
  readonly high: number;
  readonly confidence: number;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

const GBP_FORMATTER = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 1,
  notation: "compact",
});

function compactGbp(value: number): string {
  return GBP_FORMATTER.format(value);
}

export function IntakeVerdictPanel({
  values,
  overall,
}: IntakeVerdictPanelProps) {
  const math: PreviewMath | null = useMemo(() => {
    const arr = asNumber(values.f1);
    if (arr === undefined || arr <= 0) return null;
    const growth = asNumber(values.f3) ?? 0;
    const ltvCac = asNumber(values.f12) ?? 3;
    const runway = asNumber(values.f9) ?? 12;

    let multiple = 8.5;
    if (growth > 100) multiple += 3.5;
    else if (growth > 60) multiple += 2.2;
    else if (growth > 30) multiple += 1.1;
    if (ltvCac > 5) multiple += 1.8;
    if (runway > 18) multiple += 0.9;

    const base = Math.round((arr * multiple) / 100_000) * 100_000;
    const low = Math.round(base * 0.86);
    const high = Math.round(base * 1.17);
    /* Confidence ramps with the weighted completeness score; floor 50,
       ceiling 94 mirrors the LTM mockup's "68% confidence" baseline. */
    const confidence = Math.min(94, Math.max(50, Math.round(overall.percent * 0.94)));

    return { multiple, arr, base, low, high, confidence };
  }, [overall.percent, values.f1, values.f3, values.f9, values.f12]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          padding: 20,
          background: "var(--surface-1)",
          border: "1px solid var(--border-aurum)",
          borderRadius: "var(--radius-xl)",
          backgroundImage:
            "linear-gradient(135deg, var(--aurum-mute) 0%, transparent 70%)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--fg-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          Live Valuation Preview
        </div>
        {math ? (
          <>
            <div
              style={{
                marginTop: 6,
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-3xl)",
                fontWeight: 600,
                color: "var(--aurum-primary)",
                letterSpacing: "-0.03em",
                fontFeatureSettings: '"tnum" 1, "lnum" 1',
              }}
            >
              {compactGbp(math.base)}
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--mint-up)",
                fontFeatureSettings: '"tnum" 1, "lnum" 1',
              }}
            >
              {compactGbp(math.low)} – {compactGbp(math.high)} ·{" "}
              {math.confidence}% confidence
            </div>

            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                rowGap: 8,
                columnGap: 16,
                marginTop: 16,
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-secondary)",
              }}
            >
              <dt>ARR multiple</dt>
              <dd
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "var(--fg-primary)",
                  fontFeatureSettings: '"tnum" 1, "lnum" 1',
                }}
              >
                {math.multiple.toFixed(1)}x
              </dd>
              <dt>Estimated ARR</dt>
              <dd
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "var(--fg-primary)",
                  fontFeatureSettings: '"tnum" 1, "lnum" 1',
                }}
              >
                {compactGbp(math.arr)}
              </dd>
              <dt>Data completeness</dt>
              <dd
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "var(--fg-primary)",
                  fontFeatureSettings: '"tnum" 1, "lnum" 1',
                }}
              >
                {overall.percent}/100
              </dd>
            </dl>
          </>
        ) : (
          <div
            style={{
              marginTop: 12,
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--fg-tertiary)",
              lineHeight: 1.5,
            }}
          >
            Enter your ARR (Core Financials → field 1) to see a directionally-
            correct preview here.
          </div>
        )}
      </div>

      <div
        style={{
          padding: 16,
          background: "var(--canvas-recess)",
          border: "1px dashed var(--border-default)",
          borderRadius: "var(--radius-lg)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          color: "var(--fg-tertiary)",
          lineHeight: 1.55,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--fg-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 6,
          }}
        >
          Mock preview only
        </div>
        The full valuation engine is wired through Track V&apos;s{" "}
        <code style={{ fontFamily: "var(--font-mono)" }}>
          /api/valuation/run
        </code>{" "}
        once you save and trigger it from the Workbench.
      </div>
    </div>
  );
}
