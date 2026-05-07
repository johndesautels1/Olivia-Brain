'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { TornadoBar } from '@/lib/valuation/types';
import { formatCurrency } from '@/lib/valuation/dashboard-types';
import GlossaryTooltip from './GlossaryTooltip';
import ChartCard from './ChartCard';

// ── Human-readable sensitivity labels ────────────────────────────────

const SENSITIVITY_LABELS: Record<string, string> = {
  revenue_growth: 'Revenue Growth Rate',
  revenue_growth_rate: 'Revenue Growth Rate',
  ebitda_margin: 'EBITDA Margin',
  discount_rate: 'Discount Rate',
  wacc: 'WACC',
  terminal_growth: 'Terminal Growth Rate',
  terminal_multiple: 'Terminal Multiple',
  exit_multiple: 'Exit Multiple',
  operating_margin: 'Operating Margin',
  gross_margin: 'Gross Margin',
  capex_ratio: 'CapEx / Revenue',
  tax_rate: 'Effective Tax Rate',
  churn_rate: 'Customer Churn Rate',
  arpu: 'Avg Revenue Per User',
  market_share: 'Market Share',
  cac: 'Customer Acquisition Cost',
  ltv_cac: 'LTV / CAC Ratio',
  burn_multiple: 'Burn Multiple',
  nwc_change: 'Net Working Capital Change',
  probability_of_success: 'Probability of Success',
  time_to_exit: 'Time to Exit (Years)',
  dilution: 'Dilution Factor',
};

function humanLabel(variable: string): string {
  return SENSITIVITY_LABELS[variable.toLowerCase().replace(/[\s-]+/g, '_')] ?? variable;
}

// ── Tornado bar colors ──────────────────────────────────────────────
// Downside (loss) = coral/red, Upside (gain) = jade/green.
// Clear visual semantics — users expect red=bad, green=good.

const COLOR_DOWNSIDE = '#E84855'; // coral-downside
const COLOR_UPSIDE   = '#34D399'; // jade-upside

// Label text color — light silver, always readable against both bars and dark bg
const LABEL_COLOR = '#CBD5E1'; // slate-300

// ── Props ────────────────────────────────────────────────────────────

export type TornadoChartProps = {
  bars: TornadoBar[];
  /** Label shown above chart */
  title?: string;
};

// ── Transform data for horizontal tornado layout ─────────────────────

type TornadoDataPoint = {
  variable: string;
  rank: number;
  downside: number;
  upside: number;
  lowResult: number;
  highResult: number;
  baseResult: number;
  lowValue: number;
  highValue: number;
};

function transformBars(bars: TornadoBar[]): { data: TornadoDataPoint[]; baseEV: number } {
  if (bars.length === 0) return { data: [], baseEV: 0 };

  const baseEV = bars[0].baseResult;

  const data: TornadoDataPoint[] = bars.map((bar, idx) => {
    const lo = Math.min(bar.lowResult, bar.highResult);
    const hi = Math.max(bar.lowResult, bar.highResult);

    return {
      variable: `#${idx + 1}  ${humanLabel(bar.variable)}`,
      rank: idx + 1,
      downside: lo - baseEV,
      upside: hi - baseEV,
      lowResult: lo,
      highResult: hi,
      baseResult: baseEV,
      lowValue: bar.lowValue,
      highValue: bar.highValue,
    };
  });

  return { data, baseEV };
}

// ── Component ───────────────────────────────────────────────────────

export default function TornadoChart({ bars, title }: TornadoChartProps) {
  // Responsive: detect narrow viewport for mobile-friendly margins
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Hovered bar data — drives the fixed info card instead of floating tooltip
  const [hoveredBar, setHoveredBar] = useState<TornadoDataPoint | null>(null);

  const handleBarMouseMove = useCallback(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => {
      if (state?.activePayload?.[0]?.payload) {
        setHoveredBar(state.activePayload[0].payload as TornadoDataPoint);
      }
    }, []);

  const handleBarMouseLeave = useCallback(() => {
    setHoveredBar(null);
  }, []);

  const { data, baseEV } = transformBars(bars);

  if (data.length === 0) {
    return (
      <ChartCard title={title ?? 'Sensitivity Analysis'} glossaryKey="tornado_chart">
        <p className="text-[11px] text-text-primary">No sensitivity data available.</p>
      </ChartCard>
    );
  }

  // Data-driven takeaway: identify the #1 driver
  const topDriver = data.length > 0
    ? data[0].variable.replace(/^#\d+\s+/, '')
    : '';
  const topSwing = data.length > 0
    ? formatCurrency(data[0].highResult - data[0].lowResult)
    : '';

  return (
    <ChartCard
      title={title ?? 'Sensitivity Analysis'}
      glossaryKey="tornado_chart"
      subtitle={`Base EV: ${formatCurrency(baseEV)}`}
      takeaway={
        topDriver
          ? `${topDriver} is the single largest driver of enterprise value, with a ${topSwing} swing between downside and upside assumptions.`
          : undefined
      }
      caption={
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span>Variables ranked by absolute impact on EV.</span>
          <span className="flex items-center gap-1.5">
            <span className="flex items-center gap-0.5">
              <span style={{ color: COLOR_DOWNSIDE }}>&#9632;</span>
              <span>Downside</span>
            </span>
            <span className="flex items-center gap-0.5">
              <span style={{ color: COLOR_UPSIDE }}>&#9632;</span>
              <span>Upside</span>
            </span>
          </span>
        </div>
      }
    >

      <div className="relative">
        {/* Fixed info card — upper right, hidden on mobile portrait */}
        {!isNarrow && (
          <div
            className="absolute top-0 right-0 z-10 w-[200px] rounded-lg border border-white/10 bg-onyx/95 p-3 text-xs shadow-xl transition-opacity duration-150"
            style={{ opacity: hoveredBar ? 1 : 0, pointerEvents: 'none' }}
            aria-live="polite"
          >
            {hoveredBar ? (
              <>
                <p className="font-semibold text-text-primary mb-1.5 leading-tight">{hoveredBar.variable}</p>
                <div className="space-y-1">
                  <p style={{ color: COLOR_DOWNSIDE }}>
                    Downside: {formatCurrency(hoveredBar.lowResult)}
                    <span className="text-text-secondary ml-1">({hoveredBar.lowValue > 0 ? '+' : ''}{hoveredBar.lowValue}%)</span>
                  </p>
                  <p style={{ color: COLOR_UPSIDE }}>
                    Upside: {formatCurrency(hoveredBar.highResult)}
                    <span className="text-text-secondary ml-1">({hoveredBar.highValue > 0 ? '+' : ''}{hoveredBar.highValue}%)</span>
                  </p>
                  <div className="border-t border-white/[0.06] pt-1 mt-1.5">
                    <p className="text-text-secondary">
                      Base: {formatCurrency(hoveredBar.baseResult)}
                    </p>
                    <p className="text-text-primary font-semibold">
                      Swing: {formatCurrency(hoveredBar.highResult - hoveredBar.lowResult)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-text-secondary">Hover a bar for details</p>
            )}
          </div>
        )}

      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 48)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={isNarrow ? { top: 20, right: 40, left: 8, bottom: 8 } : { top: 28, right: 90, left: 150, bottom: 8 }}
          onMouseMove={handleBarMouseMove}
          onMouseLeave={handleBarMouseLeave}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tickFormatter={(v: number) => formatCurrency(baseEV + v)}
            tick={{ fill: '#94a3b8', fontSize: isNarrow ? 9 : 13, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis
            type="category"
            dataKey="variable"
            width={isNarrow ? 80 : 140}
            tick={{ fill: '#cbd5e1', fontSize: isNarrow ? 9 : 13 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={() => null}
            cursor={{ fill: 'rgba(255,255,255,0.06)' }}
            isAnimationActive={false}
          />
          <ReferenceLine
            x={0}
            stroke="rgba(196,169,106,0.6)"
            strokeDasharray="4 4"
            label={{ value: 'Reconciled EV', position: 'top', fill: '#C4A96A', fontSize: 13 }}
          />
          {/* Downside bars — always coral/red */}
          <Bar
            dataKey="downside"
            stackId="tornado"
            barSize={22}
            fill={COLOR_DOWNSIDE}
            fillOpacity={0.85}
            radius={[4, 0, 0, 4]}
            label={isNarrow ? false : // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((props: any) => {
              const v = Number(props.value ?? 0);
              const x = Number(props.x ?? 0);
              const y = Number(props.y ?? 0);
              const h = Number(props.height ?? 0);
              if (v === 0) return null;
              return (
                <text x={x - 8} y={y + h / 2} textAnchor="end" dominantBaseline="central" fill={LABEL_COLOR} fontSize={12} fontWeight={600} fontFamily="JetBrains Mono, monospace">
                  {formatCurrency(v)}
                </text>
              );
            }) as never}
          />
          {/* Upside bars — always jade/green */}
          <Bar
            dataKey="upside"
            stackId="tornado"
            barSize={22}
            fill={COLOR_UPSIDE}
            fillOpacity={0.85}
            radius={[0, 4, 4, 0]}
            label={isNarrow ? false : // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((props: any) => {
              const v = Number(props.value ?? 0);
              const x = Number(props.x ?? 0);
              const w = Number(props.width ?? 0);
              const y = Number(props.y ?? 0);
              const h = Number(props.height ?? 0);
              if (v === 0) return null;
              return (
                <text x={x + w + 8} y={y + h / 2} textAnchor="start" dominantBaseline="central" fill={LABEL_COLOR} fontSize={12} fontWeight={600} fontFamily="JetBrains Mono, monospace">
                  +{formatCurrency(v)}
                </text>
              );
            }) as never}
          />
        </BarChart>
      </ResponsiveContainer>
      </div>

    </ChartCard>
  );
}
