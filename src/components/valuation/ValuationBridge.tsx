'use client';

import { useMemo, useState } from 'react';
import type { ValuationMethodResult } from '@/lib/valuation/types';
import { formatCurrency, formatPct } from '@/lib/valuation/dashboard-types';
import ChartCard from './ChartCard';
import GlossaryTooltip from './GlossaryTooltip';

// ── Method labels ────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  revenue_multiple: 'Revenue Multiple',
  ebitda_multiple: 'EBITDA Multiple',
  dcf: 'DCF',
  vc_method: 'VC Method',
  cost_to_duplicate: 'Cost to Duplicate',
  scorecard: 'Scorecard',
  strategic_synergy: 'Strategic Synergy',
  precedent_transactions: 'Precedent Txn',
  liquidation: 'Liquidation',
  real_options: 'Real Options',
  strategic_adjustment: 'Strategic Adj',
};

const METHOD_SHORT: Record<string, string> = {
  revenue_multiple: 'Rev Mult',
  ebitda_multiple: 'EBITDA',
  dcf: 'DCF',
  vc_method: 'VC',
  cost_to_duplicate: 'Cost Dup',
  scorecard: 'Score',
  strategic_synergy: 'Synergy',
  precedent_transactions: 'Precedent',
  liquidation: 'Liq',
  real_options: 'Options',
  strategic_adjustment: 'Strat Adj',
};

// ── Waterfall step type ──────────────────────────────────────────────

type WaterfallStep = {
  label: string;
  shortLabel: string;
  method: string;
  /** EV estimate from this method */
  value: number;
  /** Weighted contribution to reconciled EV */
  contribution: number;
  /** Weight as fraction */
  weight: number;
  /** Delta from floor to this method's contribution */
  delta: number;
  /** Cumulative running total (floor + sum of contributions up to this point) */
  runningTotal: number;
  /** Y position: bottom of the floating bar */
  barBottom: number;
  /** Y position: top of the floating bar */
  barTop: number;
  /** Summary text for drill-down */
  summary: string;
  assumptions: string[];
};

// ── Build waterfall data ─────────────────────────────────────────────

function buildWaterfall(
  methods: ValuationMethodResult[],
  reconciledBase: number | null,
): { steps: WaterfallStep[]; floor: number; ceiling: number } {
  // Weighted methods (non-overlay)
  const weighted = methods
    .filter((m) => m.enabled && m.weight > 0 && !m.isOverlay && m.enterpriseValue)
    .sort((a, b) => b.weight - a.weight);

  // Overlay methods (strategic adjustment etc.)
  const overlays = methods.filter((m) => m.enabled && m.isOverlay && m.enterpriseValue);

  if (weighted.length === 0) return { steps: [], floor: 0, ceiling: 0 };

  // Floor = lowest weighted method EV (conservative anchor)
  const evValues = weighted.map((m) => m.enterpriseValue!.base);
  const floor = Math.min(...evValues);

  // Each weighted method's contribution above floor
  const totalWeight = weighted.reduce((s, m) => s + m.weight, 0);

  let runningTotal = floor;
  const steps: WaterfallStep[] = weighted.map((m) => {
    const ev = m.enterpriseValue!.base;
    const normalizedWeight = totalWeight > 0 ? m.weight / totalWeight : 0;
    const contribution = normalizedWeight * (ev - floor);
    const barBottom = runningTotal;
    runningTotal += contribution;
    const barTop = runningTotal;

    return {
      label: METHOD_LABELS[m.method] ?? m.method,
      shortLabel: METHOD_SHORT[m.method] ?? m.method,
      method: m.method,
      value: ev,
      contribution,
      weight: m.weight,
      delta: contribution,
      runningTotal: barTop,
      barBottom,
      barTop,
      summary: m.summary ?? '',
      assumptions: m.assumptions ?? [],
    };
  });

  // Add overlay adjustments as final bar(s) — they bridge from weighted blend to reconciled EV
  for (const overlay of overlays) {
    const overlayEV = overlay.enterpriseValue!.base;
    // The overlay's contribution is the gap between the weighted blend and the final reconciled value
    const contribution = overlayEV - runningTotal;
    if (Math.abs(contribution) < 1) continue; // skip negligible overlays
    const barBottom = runningTotal;
    runningTotal += contribution;

    steps.push({
      label: METHOD_LABELS[overlay.method] ?? overlay.method,
      shortLabel: METHOD_SHORT[overlay.method] ?? overlay.method,
      method: overlay.method,
      value: overlayEV,
      contribution: Math.abs(contribution),
      weight: 0,
      delta: contribution,
      runningTotal,
      barBottom: contribution >= 0 ? barBottom : runningTotal,
      barTop: contribution >= 0 ? runningTotal : barBottom,
      summary: overlay.summary ?? '',
      assumptions: overlay.assumptions ?? [],
    });
  }

  const ceiling = runningTotal;

  return { steps, floor, ceiling };
}

// ── Color palette for method bars ────────────────────────────────────

const BAR_COLORS = [
  '#38bdf8', // cyan
  '#818cf8', // indigo
  '#a78bfa', // violet
  '#34d399', // jade
  '#22d3ee', // teal
  '#fb923c', // orange
  '#fbbf24', // amber
  '#c084fc', // purple
  '#f472b6', // pink
  '#4ade80', // green
  '#f87171', // coral
];

// ── Props ────────────────────────────────────────────────────────────

export type ValuationBridgeProps = {
  methods: ValuationMethodResult[];
  reconciledBase: number | null;
};

// ── Component ────────────────────────────────────────────────────────

export default function ValuationBridge({
  methods,
  reconciledBase,
}: ValuationBridgeProps) {
  const { steps, floor, ceiling } = useMemo(
    () => buildWaterfall(methods, reconciledBase),
    [methods, reconciledBase],
  );

  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  if (steps.length === 0) {
    return (
      <ChartCard title="Valuation Bridge" glossaryKey="enterprise_value">
        <p className="text-[11px] text-text-primary">No active methods to display.</p>
      </ChartCard>
    );
  }

  // Chart dimensions
  const chartHeight = 300;
  const chartPaddingTop = 40;
  const chartPaddingBottom = 80;
  const chartPaddingLeft = 80;
  const chartPaddingRight = 40;
  const drawableHeight = chartHeight - chartPaddingTop - chartPaddingBottom;

  // Total columns: floor + steps + reconciled
  const totalCols = steps.length + 2;
  const colWidth = 72;
  const gap = 12;
  const chartWidth = chartPaddingLeft + chartPaddingRight + totalCols * (colWidth + gap);

  // Y scale: map value to pixel
  const finalEV = reconciledBase ?? ceiling;
  const yMin = floor * 0.92; // 8% padding below floor
  const yMax = Math.max(finalEV, ceiling) * 1.05; // 5% padding above
  const yScale = (v: number) =>
    chartPaddingTop + drawableHeight - ((v - yMin) / (yMax - yMin)) * drawableHeight;

  // X position for column index
  const xPos = (col: number) => chartPaddingLeft + col * (colWidth + gap);

  // Y gridlines
  const gridCount = 5;
  const gridStep = (yMax - yMin) / gridCount;
  const gridValues = Array.from({ length: gridCount + 1 }, (_, i) => yMin + i * gridStep);

  // Takeaway
  const takeawayText = reconciledBase !== null
    ? `${steps.length} methods bridge from a floor of ${formatCurrency(floor)} to a reconciled EV of ${formatCurrency(reconciledBase)}, weighted by stage fit and data quality.`
    : `${steps.length} active methods contribute to the valuation bridge from a floor of ${formatCurrency(floor)}.`;

  return (
    <ChartCard
      title="Valuation Bridge"
      glossaryKey="enterprise_value"
      takeaway={takeawayText}
      caption={`Waterfall shows each method\u2019s weighted contribution above the floor (${formatCurrency(floor)}). Gold bar = reconciled enterprise value.`}
    >
      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-text-secondary mb-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(148,163,184,0.3)', border: '1px solid rgba(148,163,184,0.5)' }} />
          Floor (min EV)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(56,189,248,0.6)' }} />
          Method contribution
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(196,169,106,0.6)', border: '1px solid rgba(196,169,106,0.8)' }} />
          Reconciled EV
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-[1px]" style={{ borderTop: '2px dotted rgba(255,255,255,0.2)' }} />
          Connector
        </span>
      </div>

      <div className="overflow-x-auto relative group">
        {/* Mobile swipe hint — fades after first interaction */}
        <div className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 flex items-center justify-end pr-1 group-[:has(:scrolled)]:hidden" style={{ background: 'linear-gradient(to left, rgba(15,23,42,0.85), transparent)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(196,169,106,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
        <svg
          width="100%"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ minWidth: chartWidth, aspectRatio: `${chartWidth} / ${chartHeight}` }}
          className="mx-auto"
          role="img"
          aria-label={`Waterfall bridge chart showing ${steps.length} valuation methods bridging from ${formatCurrency(floor)} to ${formatCurrency(finalEV)}`}
        >
          <title>Valuation Bridge — Waterfall Chart</title>
          <desc>
            A McKinsey-style waterfall showing each valuation method&apos;s weighted contribution
            from the floor ({formatCurrency(floor)}) to the reconciled enterprise value ({formatCurrency(finalEV)}).
          </desc>

          {/* Y gridlines */}
          {gridValues.map((v, i) => (
            <g key={`grid-${i}`}>
              <line
                x1={chartPaddingLeft - 10}
                y1={yScale(v)}
                x2={chartWidth - chartPaddingRight}
                y2={yScale(v)}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
              />
              <text
                x={chartPaddingLeft - 14}
                y={yScale(v) + 4}
                textAnchor="end"
                fill="var(--text-tertiary, #64748b)"
                fontSize={11}
                fontFamily="var(--font-numeric), monospace"
              >
                {formatCurrency(v)}
              </text>
            </g>
          ))}

          {/* ── Floor bar (column 0) ── */}
          <rect
            x={xPos(0) + 4}
            y={yScale(floor)}
            width={colWidth - 8}
            height={yScale(yMin) - yScale(floor)}
            rx={4}
            fill="rgba(148,163,184,0.2)"
            stroke="rgba(148,163,184,0.4)"
            strokeWidth={1}
          />
          {/* Floor value label */}
          <text
            x={xPos(0) + colWidth / 2}
            y={yScale(floor) - 6}
            textAnchor="middle"
            fill="var(--text-secondary)"
            fontSize={11}
            fontWeight={600}
            fontFamily="var(--font-numeric), monospace"
          >
            {formatCurrency(floor)}
          </text>
          {/* Floor x-axis label rendered as HTML overlay below */}

          {/* ── Method bars (columns 1..N) ── */}
          {steps.map((step, i) => {
            const col = i + 1;
            const x = xPos(col);
            const barTopY = yScale(step.barTop);
            const barBottomY = yScale(step.barBottom);
            const barHeight = Math.max(barBottomY - barTopY, 2);
            const color = BAR_COLORS[i % BAR_COLORS.length];
            const isExpanded = expandedStep === step.method;

            // Connector from previous bar top to this bar bottom
            const prevTopY = i === 0 ? yScale(floor) : yScale(steps[i - 1].barTop);

            return (
              <g key={step.method}>
                {/* Dotted connector from previous bar top */}
                <line
                  x1={xPos(col - 1) + colWidth - 4}
                  y1={prevTopY}
                  x2={x + 4}
                  y2={barBottomY}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />

                {/* Bar */}
                <rect
                  x={x + 4}
                  y={barTopY}
                  width={colWidth - 8}
                  height={barHeight}
                  rx={4}
                  fill={color}
                  fillOpacity={0.5}
                  stroke={color}
                  strokeWidth={1.5}
                  style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }}
                  onClick={() => setExpandedStep(isExpanded ? null : step.method)}
                  onMouseEnter={(e) => { (e.target as SVGRectElement).setAttribute('fill-opacity', '0.75'); }}
                  onMouseLeave={(e) => { (e.target as SVGRectElement).setAttribute('fill-opacity', '0.5'); }}
                />

                {/* Delta label above bar */}
                <text
                  x={x + colWidth / 2}
                  y={barTopY - 6}
                  textAnchor="middle"
                  fill={color}
                  fontSize={12}
                  fontWeight={600}
                  fontFamily="var(--font-numeric), monospace"
                >
                  +{formatCurrency(step.contribution)}
                </text>

                {/* Weight badge inside bar (if bar is tall enough) */}
                {barHeight > 18 && (
                  <text
                    x={x + colWidth / 2}
                    y={barTopY + barHeight / 2 + 4}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.8)"
                    fontSize={11}
                    fontWeight={500}
                    fontFamily="var(--font-numeric), monospace"
                  >
                    {step.weight > 0 ? formatPct(step.weight) : 'Adj'}
                  </text>
                )}

                {/* X-axis labels rendered as HTML overlay below */}
              </g>
            );
          })}

          {/* ── Reconciled EV bar (final column) ── */}
          {(() => {
            const col = steps.length + 1;
            const x = xPos(col);
            const evY = yScale(finalEV);
            const floorY = yScale(yMin);
            const barH = Math.max(floorY - evY, 2);
            // Connector from last method bar top
            const lastStepTopY = steps.length > 0 ? yScale(steps[steps.length - 1].barTop) : yScale(floor);

            return (
              <g>
                {/* Connector from last method */}
                <line
                  x1={xPos(col - 1) + colWidth - 4}
                  y1={lastStepTopY}
                  x2={x + 4}
                  y2={evY}
                  stroke="rgba(196,169,106,0.3)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />

                {/* Aurum glow behind bar */}
                <rect
                  x={x}
                  y={evY - 4}
                  width={colWidth}
                  height={barH + 8}
                  rx={8}
                  fill="none"
                  filter="url(#aurum-glow)"
                />

                {/* Gold bar */}
                <rect
                  x={x + 4}
                  y={evY}
                  width={colWidth - 8}
                  height={barH}
                  rx={4}
                  fill="rgba(196,169,106,0.35)"
                  stroke="var(--color-aurum-primary)"
                  strokeWidth={2}
                />

                {/* EV value label above */}
                <text
                  x={x + colWidth / 2}
                  y={evY - 8}
                  textAnchor="middle"
                  fill="var(--color-aurum-primary)"
                  fontSize={12}
                  fontWeight={700}
                  fontFamily="var(--font-numeric), monospace"
                >
                  {formatCurrency(finalEV)}
                </text>

                {/* X-axis label rendered as HTML overlay below */}
              </g>
            );
          })()}

          {/* Aurum glow filter */}
          <defs>
            <filter id="aurum-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="rgba(196,169,106,0.15)" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* HTML x-axis labels with GlossaryTooltip popups */}
        <div className="flex items-start" style={{ paddingLeft: chartPaddingLeft, paddingRight: chartPaddingRight, marginTop: -chartPaddingBottom + 8 }}>
          {/* Floor label */}
          <div className="text-center shrink-0" style={{ width: colWidth + gap }}>
            <GlossaryTooltip fieldKey="enterprise_value">
              <span className="text-[11px] font-medium text-text-secondary cursor-help hover:text-text-primary transition-colors">
                Floor
              </span>
            </GlossaryTooltip>
          </div>

          {/* Method labels */}
          {steps.map((step, i) => (
            <div key={step.method} className="text-center shrink-0" style={{ width: colWidth + gap }}>
              <GlossaryTooltip fieldKey={step.method}>
                <span className="text-[11px] font-medium text-text-secondary cursor-help hover:text-text-primary transition-colors leading-tight block">
                  {step.shortLabel}
                </span>
              </GlossaryTooltip>
              <span className="text-[11px] text-text-tertiary font-mono">
                #{i + 1}
              </span>
            </div>
          ))}

          {/* Reconciled EV label */}
          <div className="text-center shrink-0" style={{ width: colWidth + gap }}>
            <GlossaryTooltip fieldKey="enterprise_value">
              <span className="text-[11px] font-bold cursor-help hover:brightness-125 transition-all leading-tight block" style={{ color: 'var(--color-aurum-primary)' }}>
                Reconciled
              </span>
            </GlossaryTooltip>
            <span className="text-[11px] font-medium" style={{ color: 'var(--color-aurum-primary)', opacity: 0.7 }}>
              EV
            </span>
          </div>
        </div>
      </div>

      {/* ── Drill-down panel — shown when a method bar is clicked ── */}
      {expandedStep && (() => {
        const step = steps.find((s) => s.method === expandedStep);
        if (!step) return null;
        const color = BAR_COLORS[steps.indexOf(step) % BAR_COLORS.length];

        return (
          <div
            className="mt-4 p-4 glass-inner rounded-lg border-l-2"
            style={{ borderLeftColor: color }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">{step.label}</h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {step.weight > 0 ? `Weight: ${formatPct(step.weight)} | ` : 'Overlay | '}EV: {formatCurrency(step.value)} | Contribution: +{formatCurrency(step.contribution)}
                </p>
              </div>
              <button
                onClick={() => setExpandedStep(null)}
                className="text-text-secondary hover:text-text-primary text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors"
                aria-label="Close method detail"
              >
                Close
              </button>
            </div>
            {step.summary && (
              <p className="text-xs text-text-primary leading-relaxed mb-2">{step.summary}</p>
            )}
            {step.assumptions.length > 0 && (
              <ul className="text-xs text-text-secondary space-y-0.5">
                {step.assumptions.map((a, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-text-tertiary shrink-0">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}
    </ChartCard>
  );
}
