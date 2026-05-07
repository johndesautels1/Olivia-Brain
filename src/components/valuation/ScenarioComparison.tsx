'use client';

import { useMemo } from 'react';
import type { ScenarioResult } from '@/lib/valuation/types';
import { formatCurrency, formatPct } from '@/lib/valuation/dashboard-types';
import ChartCard from './ChartCard';

// ── Props ────────────────────────────────────────────────────────────

export type ScenarioComparisonProps = {
  scenarios: ScenarioResult[];
  probabilityWeightedEV: number;
};

// ── Scenario color mapping ──────────────────────────────────────────

const SCENARIO_COLORS: Record<string, { dot: string; line: string; text: string }> = {
  Bear: { dot: '#f87171', line: 'rgba(248,113,113,0.4)', text: 'text-coral-downside' },
  Base: { dot: '#38bdf8', line: 'rgba(56,189,248,0.4)', text: 'text-cyan-interactive' },
  Bull: { dot: '#34d399', line: 'rgba(52,211,153,0.4)', text: 'text-jade-upside' },
};

function getColors(name: string) {
  return SCENARIO_COLORS[name] ?? { dot: '#94a3b8', line: 'rgba(148,163,184,0.4)', text: 'text-text-primary' };
}

// ── SVG Dumbbell Chart ──────────────────────────────────────────────

const CHART_HEIGHT = 200;
const ROW_HEIGHT = 48;
const LABEL_WIDTH = 80;
const RIGHT_PAD = 24;
const TOP_PAD = 28;

function DumbbellChart({
  scenarios,
  probabilityWeightedEV,
}: {
  scenarios: ScenarioResult[];
  probabilityWeightedEV: number;
}) {
  const { globalMin, globalMax, xScale } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const s of scenarios) {
      if (s.enterpriseValue.low < min) min = s.enterpriseValue.low;
      if (s.enterpriseValue.high > max) max = s.enterpriseValue.high;
    }
    // Add 5% padding
    const range = max - min || 1;
    const padded = { min: min - range * 0.05, max: max + range * 0.05 };
    const chartWidth = 600;
    const scale = (v: number) =>
      LABEL_WIDTH + ((v - padded.min) / (padded.max - padded.min)) * (chartWidth - LABEL_WIDTH - RIGHT_PAD);
    return { globalMin: padded.min, globalMax: padded.max, xScale: scale };
  }, [scenarios]);

  const chartWidth = 600;
  const totalHeight = TOP_PAD + scenarios.length * ROW_HEIGHT + 40;

  // Tick marks for X axis
  const tickCount = 5;
  const ticks = useMemo(() => {
    const range = globalMax - globalMin;
    return Array.from({ length: tickCount }, (_, i) => {
      const value = globalMin + (range * i) / (tickCount - 1);
      return { value, x: xScale(value) };
    });
  }, [globalMin, globalMax, tickCount, xScale]);

  const pwevX = xScale(probabilityWeightedEV);

  return (
    <svg
      width="100%"
      height={totalHeight}
      viewBox={`0 0 ${chartWidth} ${totalHeight}`}
      className="overflow-visible"
      role="img"
      aria-label={`Dumbbell plot comparing ${scenarios.length} scenario enterprise value ranges`}
    >
      <title>Scenario Dumbbell Plot</title>

      {/* Grid lines */}
      {ticks.map((t, i) => (
        <g key={`tick-${i}`}>
          <line
            x1={t.x}
            y1={TOP_PAD - 8}
            x2={t.x}
            y2={TOP_PAD + scenarios.length * ROW_HEIGHT + 4}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
          <text
            x={t.x}
            y={TOP_PAD + scenarios.length * ROW_HEIGHT + 22}
            textAnchor="middle"
            fill="var(--text-primary, #e2e8f0)"
            fontSize={12}
            fontWeight={600}
            fontFamily="var(--font-numeric, JetBrains Mono), monospace"
          >
            {formatCurrency(t.value)}
          </text>
        </g>
      ))}

      {/* Probability-weighted EV reference line */}
      <line
        x1={pwevX}
        y1={TOP_PAD - 12}
        x2={pwevX}
        y2={TOP_PAD + scenarios.length * ROW_HEIGHT + 4}
        stroke="rgba(196,169,106,0.6)"
        strokeWidth={1.5}
        strokeDasharray="6 3"
      />
      <text
        x={pwevX}
        y={TOP_PAD - 16}
        textAnchor="middle"
        fill="#C4A96A"
        fontSize={11}
        fontWeight={600}
        fontFamily="var(--font-numeric, JetBrains Mono), monospace"
      >
        PW-EV
      </text>

      {/* Scenario rows */}
      {scenarios.map((s, i) => {
        const colors = getColors(s.name);
        const y = TOP_PAD + i * ROW_HEIGHT + ROW_HEIGHT / 2;
        const lowX = xScale(s.enterpriseValue.low);
        const baseX = xScale(s.enterpriseValue.base);
        const highX = xScale(s.enterpriseValue.high);

        return (
          <g key={s.name}>
            {/* Row label */}
            <text
              x={12}
              y={y + 1}
              dominantBaseline="central"
              fill={colors.dot}
              fontSize={12}
              fontWeight={600}
            >
              {s.name}
            </text>
            <text
              x={12}
              y={y + 14}
              dominantBaseline="central"
              fill="var(--text-tertiary, #64748b)"
              fontSize={11}
            >
              {formatPct(s.probability)}
            </text>

            {/* Connecting line (low to high) */}
            <line
              x1={lowX}
              y1={y}
              x2={highX}
              y2={y}
              stroke={colors.line}
              strokeWidth={3}
              strokeLinecap="round"
            />

            {/* Low dot */}
            <circle cx={lowX} cy={y} r={6} fill={colors.dot} opacity={0.5} />
            <text
              x={lowX}
              y={y - 12}
              textAnchor="middle"
              fill="var(--text-secondary, #94a3b8)"
              fontSize={11}
              fontFamily="var(--font-numeric, JetBrains Mono), monospace"
            >
              {formatCurrency(s.enterpriseValue.low)}
            </text>

            {/* Base EV dot (larger, filled) */}
            <circle cx={baseX} cy={y} r={8} fill={colors.dot} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />

            {/* High dot */}
            <circle cx={highX} cy={y} r={6} fill={colors.dot} opacity={0.5} />
            <text
              x={highX}
              y={y - 12}
              textAnchor="middle"
              fill="var(--text-secondary, #94a3b8)"
              fontSize={11}
              fontFamily="var(--font-numeric, JetBrains Mono), monospace"
            >
              {formatCurrency(s.enterpriseValue.high)}
            </text>

            {/* Base value label (below) */}
            <text
              x={baseX}
              y={y + 18}
              textAnchor="middle"
              fill={colors.dot}
              fontSize={11}
              fontWeight={600}
              fontFamily="var(--font-numeric, JetBrains Mono), monospace"
            >
              {formatCurrency(s.enterpriseValue.base)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Component ───────────────────────────────────────────────────────

export default function ScenarioComparison({
  scenarios,
  probabilityWeightedEV,
}: ScenarioComparisonProps) {
  if (scenarios.length === 0) {
    return (
      <ChartCard title="Scenario Analysis" glossaryKey="scenario_base">
        <p className="text-[11px] text-text-primary">No scenario data available.</p>
      </ChartCard>
    );
  }

  // Data-driven takeaway
  const takeawayText = `Probability-weighted EV of ${formatCurrency(probabilityWeightedEV)} blends ${scenarios.length} scenario${scenarios.length !== 1 ? 's' : ''} by assigned likelihood.`;

  return (
    <ChartCard
      title="Scenario Analysis"
      glossaryKey="scenario_base"
      subtitle={`Probability-Weighted EV: ${formatCurrency(probabilityWeightedEV)}`}
      takeaway={takeawayText}
    >

      {/* Scenario summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {scenarios.map((s) => {
          const colors = getColors(s.name);
          return (
            <div
              key={s.name}
              className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: colors.dot }}
                />
                <span className={`text-xs font-semibold ${colors.text}`}>
                  {s.name}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-white/5 text-text-secondary">
                  {formatPct(s.probability)}
                </span>
              </div>
              <p className="text-sm font-bold tabular-nums text-text-primary">
                {formatCurrency(s.enterpriseValue.base)}
              </p>
              <p className="text-[11px] text-text-secondary">
                {formatCurrency(s.enterpriseValue.low)} – {formatCurrency(s.enterpriseValue.high)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Dumbbell plot */}
      <div className="overflow-x-auto">
        <DumbbellChart
          scenarios={scenarios}
          probabilityWeightedEV={probabilityWeightedEV}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-[2px]" style={{ background: 'rgba(196,169,106,0.6)', borderTop: '1px dashed rgba(196,169,106,0.6)' }} />
          Probability-Weighted EV
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-slate-500/50" />
          Range endpoint
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-3.5 rounded-full bg-slate-400" />
          Base EV
        </span>
      </div>

    </ChartCard>
  );
}
