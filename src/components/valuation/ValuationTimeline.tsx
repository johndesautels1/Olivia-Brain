'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/valuation/dashboard-types';

// ── Props ────────────────────────────────────────────────────────────

export type TimelinePoint = {
  date: string;
  evLow: number;
  evBase: number;
  evHigh: number;
  confidence: number;
  milestone?: string | null;
};

export type ValuationTimelineProps = {
  dataPoints: TimelinePoint[];
};

// ── Custom tooltip ──────────────────────────────────────────────────

interface TimelineTooltipPayload {
  dataKey: string;
  value: number;
  payload: TimelinePoint;
}

function TimelineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TimelineTooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg border border-white/10 bg-onyx/95 p-3 text-xs shadow-xl">
      <p className="font-semibold text-text-primary mb-1">{d.date}</p>
      <p className="text-cyan-interactive">Base EV: {formatCurrency(d.evBase)}</p>
      <p className="text-text-secondary">
        Range: {formatCurrency(d.evLow)} – {formatCurrency(d.evHigh)}
      </p>
      <p className="text-text-secondary">
        Confidence: {(d.confidence * 100).toFixed(0)}%
      </p>
      {d.milestone && (
        <p className="text-status-warning mt-1">{d.milestone}</p>
      )}
    </div>
  );
}

// ── Milestone dot ───────────────────────────────────────────────────

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: TimelinePoint;
}

function MilestoneDot({ cx, cy, payload }: DotProps) {
  if (!cx || !cy || !payload?.milestone) return null;

  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="#fbbf24" strokeWidth={1.5} />
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        fill="#fbbf24"
        fontSize={8}
        fontWeight={600}
      >
        {payload.milestone.length > 20
          ? payload.milestone.slice(0, 20) + '...'
          : payload.milestone}
      </text>
    </g>
  );
}

// ── Component ───────────────────────────────────────────────────────

export default function ValuationTimeline({ dataPoints }: ValuationTimelineProps) {
  if (dataPoints.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          Valuation History
        </h3>
        <p className="text-xs text-text-secondary">No historical valuation runs to display.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Valuation History
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={dataPoints} margin={{ top: 16, right: 16, left: 16, bottom: 8 }}>
          <defs>
            <linearGradient id="evBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrency(v)}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<TimelineTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 2 }}
            isAnimationActive={false}
          />

          {/* Confidence band (low → high) */}
          <Area
            type="monotone"
            dataKey="evHigh"
            stroke="none"
            fill="url(#evBandGrad)"
            fillOpacity={1}
          />
          <Area
            type="monotone"
            dataKey="evLow"
            stroke="none"
            fill="#0f172a"
            fillOpacity={1}
          />

          {/* Base line */}
          <Area
            type="monotone"
            dataKey="evBase"
            stroke="#38bdf8"
            strokeWidth={2}
            fill="none"
            dot={<MilestoneDot />}
            activeDot={{ r: 4, fill: '#38bdf8', stroke: '#fff', strokeWidth: 1 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Milestone legend */}
      {dataPoints.some((dp) => dp.milestone) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {dataPoints
            .filter((dp) => dp.milestone)
            .map((dp) => (
              <span
                key={dp.date}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-status-warning border border-amber-500/20"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {dp.date}: {dp.milestone}
              </span>
            ))}
        </div>
      )}

      <p className="text-[11px] text-text-secondary mt-2 text-center">
        Shaded area shows low–high valuation range. Gold dots mark milestones.
      </p>
    </div>
  );
}
