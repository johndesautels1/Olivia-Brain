'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Legend,
  Brush,
} from 'recharts';
import type { MonteCarloResult, HybridMCCRRResult } from '@/lib/valuation/types';
import { formatCurrency, formatPct } from '@/lib/valuation/dashboard-types';
import { computeKde, interpretMonteCarlo } from '@/lib/valuation/kde';
import GlossaryTooltip from './GlossaryTooltip';
import ChartCard from './ChartCard';

// ── Props ────────────────────────────────────────────────────────────

export type MonteCarloHistogramProps = {
  mcResult: MonteCarloResult;
  /** If hybrid was run, overlay the hybrid distribution */
  hybridResult?: HybridMCCRRResult | null;
};

// ── Bin distribution into histogram ─────────────────────────────────

const BIN_COUNT = 25;

type HistogramBin = {
  rangeLabel: string;
  rangeMid: number;
  baseCount: number;
  hybridCount: number;
  /** KDE density value interpolated at this bin's midpoint. */
  kdeDensity?: number;
};

function buildHistogram(
  baseDistribution: number[],
  hybridDistribution: number[] | null,
): HistogramBin[] {
  const allValues = hybridDistribution
    ? [...baseDistribution, ...hybridDistribution]
    : baseDistribution;

  if (allValues.length === 0) return [];

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const binWidth = range / BIN_COUNT;

  const bins: HistogramBin[] = Array.from({ length: BIN_COUNT }, (_, i) => {
    const lo = min + i * binWidth;
    const hi = lo + binWidth;
    const mid = (lo + hi) / 2;
    return {
      rangeLabel: `${formatCurrency(lo)} – ${formatCurrency(hi)}`,
      rangeMid: mid,
      baseCount: 0,
      hybridCount: 0,
    };
  });

  for (const v of baseDistribution) {
    const idx = Math.min(Math.floor((v - min) / binWidth), BIN_COUNT - 1);
    bins[idx].baseCount++;
  }

  if (hybridDistribution) {
    for (const v of hybridDistribution) {
      const idx = Math.min(Math.floor((v - min) / binWidth), BIN_COUNT - 1);
      bins[idx].hybridCount++;
    }
  }

  return bins;
}

// ── KPI Card ────────────────────────────────────────────────────────

function KpiMini({ label, value, accent, fieldKey }: { label: string; value: string; accent?: string; fieldKey?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2">
      {fieldKey ? (
        <GlossaryTooltip fieldKey={fieldKey}>
          <span className="text-[11px] text-text-secondary uppercase tracking-wider">{label}</span>
        </GlossaryTooltip>
      ) : (
        <span className="text-[11px] text-text-secondary uppercase tracking-wider">{label}</span>
      )}
      <span className={`text-sm font-bold tabular-nums ${accent ?? 'text-text-primary'}`}>
        {value}
      </span>
    </div>
  );
}

// ── Custom tooltip ──────────────────────────────────────────────────

interface MCTooltipPayload {
  dataKey: string;
  value: number;
  payload: HistogramBin;
}

function MCTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: MCTooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg border border-white/10 bg-onyx/95 p-3 text-xs shadow-xl">
      <p className="text-text-primary mb-1">{d.rangeLabel}</p>
      <p className="text-text-secondary">Base DCF: {d.baseCount} paths</p>
      {d.hybridCount > 0 && (
        <p className="text-jade-upside">Hybrid MC+CRR: {d.hybridCount} paths</p>
      )}
      {d.kdeDensity != null && (
        <p className="text-amber-300">KDE density: {d.kdeDensity.toFixed(1)}</p>
      )}
    </div>
  );
}

// ── Interpretation Banner ────────────────────────────────────────────

function InterpretationBanner({ mcResult }: { mcResult: MonteCarloResult }) {
  const interpretation = useMemo(
    () => interpretMonteCarlo(mcResult),
    [mcResult],
  );

  // Skewness indicator color
  const skewColor =
    interpretation.skewness === 'right-skewed'
      ? 'text-jade-upside'
      : interpretation.skewness === 'left-skewed'
        ? 'text-coral-downside'
        : 'text-text-primary';

  // Spread indicator color
  const spreadColor =
    interpretation.spread === 'tight'
      ? 'text-jade-upside'
      : interpretation.spread === 'moderate'
        ? 'text-status-warning'
        : 'text-coral-downside';

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 mb-4">
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <svg
          className="w-4 h-4 mt-0.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-aurum-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text-primary mb-1">
            Distribution Interpretation
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            {interpretation.summary}
          </p>
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`text-[11px] font-medium ${skewColor}`}>
              {interpretation.skewness === 'right-skewed' && '\u25B2 '}
              {interpretation.skewness === 'left-skewed' && '\u25BC '}
              {interpretation.skewness}
            </span>
            <span className="text-white/10">|</span>
            <span className={`text-[11px] font-medium ${spreadColor}`}>
              {interpretation.spread} spread
            </span>
            <span className="text-white/10">|</span>
            <span className="text-[11px] font-medium text-text-secondary">
              CV: {(interpretation.cv * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────

export default function MonteCarloHistogram({
  mcResult,
  hybridResult,
}: MonteCarloHistogramProps) {
  const bins = buildHistogram(
    mcResult.distribution,
    hybridResult?.hybridDistribution ?? null,
  );

  // Compute KDE and merge into bins
  const kdePoints = useMemo(
    () =>
      computeKde(mcResult.distribution, BIN_COUNT, {
        std: mcResult.std,
        outputPoints: 80,
      }),
    [mcResult.distribution, mcResult.std],
  );

  // Merge KDE values into histogram bins by interpolating at each bin midpoint
  const enrichedBins = useMemo(() => {
    if (kdePoints.length === 0) return bins;

    return bins.map((bin) => {
      const x = bin.rangeMid;
      // Find the two KDE points that bracket this x
      let density = 0;
      for (let i = 0; i < kdePoints.length - 1; i++) {
        if (kdePoints[i].x <= x && kdePoints[i + 1].x >= x) {
          // Linear interpolation
          const frac =
            (x - kdePoints[i].x) / (kdePoints[i + 1].x - kdePoints[i].x || 1);
          density =
            kdePoints[i].density + frac * (kdePoints[i + 1].density - kdePoints[i].density);
          break;
        }
      }
      return { ...bin, kdeDensity: density };
    });
  }, [bins, kdePoints]);

  const hasHybrid = hybridResult != null;

  // Session 28: Interactive legend — toggle series visibility
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const handleLegendClick = useCallback((dataKey: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  }, []);

  // Data-driven takeaway
  const takeawayText = `${mcResult.simulations.toLocaleString()} simulations yield a mean EV of ${formatCurrency(mcResult.mean)} with a P5\u2013P95 range of ${formatCurrency(mcResult.p5)} to ${formatCurrency(mcResult.p95)}.`;

  return (
    <ChartCard
      title="Monte Carlo Simulation"
      glossaryKey="mc_distribution"
      takeaway={takeawayText}
      caption={
        <>
          {mcResult.simulations.toLocaleString()} simulations · Seed: {mcResult.seed}
          {hasHybrid ? ` · Hybrid uplift: ${hybridResult.optionUpliftPercent.toFixed(1)}%` : ''}
        </>
      }
    >
      {/* Interpretation banner */}
      <InterpretationBanner mcResult={mcResult} />

      {/* KPI strip */}
      <div className="flex flex-wrap gap-2 justify-center mb-4 rounded-lg border border-white/5 bg-white/[0.02] py-1">
        <KpiMini label="Mean" value={formatCurrency(mcResult.mean)} fieldKey="mc_mean" />
        <KpiMini label="Median" value={formatCurrency(mcResult.median)} fieldKey="mc_median" />
        <KpiMini label="P5" value={formatCurrency(mcResult.p5)} accent="text-coral-downside" fieldKey="mc_p5" />
        <KpiMini label="P95" value={formatCurrency(mcResult.p95)} accent="text-jade-upside" fieldKey="mc_p95" />
        {hasHybrid && (
          <>
            <KpiMini
              label="Hybrid Mean"
              value={formatCurrency(hybridResult.hybridMean)}
              accent="text-cyan-interactive"
              fieldKey="mc_hybrid_mean"
            />
            <KpiMini
              label="Option Uplift"
              value={formatPct(hybridResult.optionUpliftPercent / 100)}
              accent="text-jade-upside"
              fieldKey="mc_option_uplift"
            />
            <KpiMini
              label="Paths Exercised"
              value={formatPct(hybridResult.percentPathsExercised / 100)}
              fieldKey="mc_paths_exercised"
            />
          </>
        )}
      </div>

      {/* Histogram + KDE overlay */}
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={enrichedBins} margin={{ top: 8, right: 16, left: 16, bottom: 24 }}>
          <defs>
            {/* Gradient for KDE curve fill */}
            <linearGradient id="kdeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(196,169,106,0.25)" />
              <stop offset="100%" stopColor="rgba(196,169,106,0.02)" />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="rangeMid"
            tickFormatter={(v: number) => formatCurrency(v)}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            interval={Math.max(0, Math.floor(BIN_COUNT / 6))}
            angle={-30}
            textAnchor="end"
            height={50}
            type="number"
            domain={['dataMin', 'dataMax']}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Paths',
              angle: -90,
              position: 'insideLeft',
              fill: '#94a3b8',
              fontSize: 11,
            }}
          />
          <Tooltip
            content={<MCTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.06)' }}
            isAnimationActive={false}
          />
          {(hasHybrid || kdePoints.length > 0) && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}
              onClick={(data) => {
                const key = data.dataKey;
                if (typeof key === 'string') handleLegendClick(key);
              }}
              formatter={(value, entry) => {
                const key = entry.dataKey;
                return (
                  <span style={{ opacity: typeof key === 'string' && hiddenSeries.has(key) ? 0.3 : 1 }}>
                    {value}
                  </span>
                );
              }}
            />
          )}

          {/* P5-P95 shaded region */}
          <ReferenceArea
            x1={mcResult.p5}
            x2={mcResult.p95}
            fill="rgba(196,169,106,0.08)"
            fillOpacity={1}
            stroke="none"
          />

          {/* Base distribution bars */}
          <Bar
            dataKey="baseCount"
            name="Base DCF"
            fill="rgba(148,163,184,0.45)"
            radius={[2, 2, 0, 0]}
            hide={hiddenSeries.has('baseCount')}
          />

          {/* Hybrid overlay bars */}
          {hasHybrid && (
            <Bar
              dataKey="hybridCount"
              name="Hybrid MC+CRR"
              fill="rgba(52,211,153,0.55)"
              radius={[2, 2, 0, 0]}
              hide={hiddenSeries.has('hybridCount')}
            />
          )}

          {/* KDE smooth curve overlay */}
          {kdePoints.length > 0 && (
            <Line
              dataKey="kdeDensity"
              name="KDE Density"
              type="monotone"
              stroke="#C4A96A"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              legendType="line"
              hide={hiddenSeries.has('kdeDensity')}
            />
          )}

          {/* Reference lines: P5 */}
          <ReferenceLine
            x={mcResult.p5}
            stroke="rgba(248,113,113,0.5)"
            strokeDasharray="3 3"
            label={{ value: 'P5', fill: '#f87171', fontSize: 11, position: 'insideTopLeft' }}
          />

          {/* Reference lines: P95 */}
          <ReferenceLine
            x={mcResult.p95}
            stroke="rgba(52,211,153,0.5)"
            strokeDasharray="3 3"
            label={{ value: 'P95', fill: '#34d399', fontSize: 11, position: 'insideTopRight' }}
          />

          {/* Reference lines: Mean (Aurum) */}
          <ReferenceLine
            x={mcResult.mean}
            stroke="rgba(196,169,106,0.7)"
            strokeDasharray="4 4"
            label={{ value: 'Mean', fill: '#C4A96A', fontSize: 11, position: 'top' }}
          />

          {/* Reference lines: Median */}
          <ReferenceLine
            x={mcResult.median}
            stroke="rgba(56,189,248,0.5)"
            strokeDasharray="4 4"
            label={{ value: 'Median', fill: '#38bdf8', fontSize: 11, position: 'top' }}
          />

          {/* Hybrid mean reference line */}
          {hasHybrid && (
            <ReferenceLine
              x={hybridResult.hybridMean}
              stroke="#34d399"
              strokeDasharray="4 4"
              label={{ value: 'Hybrid', fill: '#34d399', fontSize: 11, position: 'top' }}
            />
          )}

          {/* Session 28: Brush zoom — drag to zoom into a range */}
          <Brush
            dataKey="rangeMid"
            height={44}
            stroke="rgba(196,169,106,0.7)"
            fill="rgba(10,22,40,0.9)"
            tickFormatter={(v: number) => formatCurrency(v)}
            travellerWidth={22}
            traveller={({ x, y, width, height: h }: { x: number; y: number; width: number; height: number }) => (
              <g>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={h}
                  rx={4}
                  fill="rgba(196,169,106,0.85)"
                  stroke="rgba(232,212,157,0.9)"
                  strokeWidth={1.5}
                />
                {/* Grip lines */}
                <line x1={x + width / 2 - 3} y1={y + h * 0.3} x2={x + width / 2 - 3} y2={y + h * 0.7} stroke="rgba(15,23,42,0.6)" strokeWidth={1.5} strokeLinecap="round" />
                <line x1={x + width / 2} y1={y + h * 0.3} x2={x + width / 2} y2={y + h * 0.7} stroke="rgba(15,23,42,0.6)" strokeWidth={1.5} strokeLinecap="round" />
                <line x1={x + width / 2 + 3} y1={y + h * 0.3} x2={x + width / 2 + 3} y2={y + h * 0.7} stroke="rgba(15,23,42,0.6)" strokeWidth={1.5} strokeLinecap="round" />
              </g>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Brush hint */}
      <p className="text-[10px] text-center mt-1" style={{ color: 'rgba(196,169,106,0.7)' }}>
        Drag the gold handles below the chart to zoom into a range
      </p>

    </ChartCard>
  );
}
