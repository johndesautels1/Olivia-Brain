'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { CompanyStage } from '@/lib/valuation/types';
import { formatCurrency, stageLabel } from '@/lib/valuation/dashboard-types';
import GlossaryTooltip from './GlossaryTooltip';

// ── Props ────────────────────────────────────────────────────────────

export type CohortDataPoint = {
  label: string;
  value: number;
  isCompany?: boolean;
};

export type CohortBenchmarkProps = {
  companyName: string;
  companyEV: number;
  stage: CompanyStage;
  sector: string;
  /** Cohort percentiles */
  cohortP25: number;
  cohortMedian: number;
  cohortP75: number;
  /** Olivia explanation */
  explanation?: string | null;
};

// ── Custom tooltip ──────────────────────────────────────────────────

interface CohortTooltipPayload {
  dataKey: string;
  value: number;
  payload: CohortDataPoint;
}

function CohortTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: CohortTooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg border border-white/15 bg-[#1a1a2e] p-3 text-xs shadow-xl">
      <p className="font-semibold text-text-primary">{d.label}</p>
      <p className="text-text-primary">{formatCurrency(d.value)}</p>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────

export default function CohortBenchmark({
  companyName,
  companyEV,
  stage,
  sector,
  cohortP25,
  cohortMedian,
  cohortP75,
  explanation,
}: CohortBenchmarkProps) {
  const chartData: CohortDataPoint[] = [
    { label: 'P25', value: cohortP25 },
    { label: 'Median', value: cohortMedian },
    { label: companyName, value: companyEV, isCompany: true },
    { label: 'P75', value: cohortP75 },
  ].sort((a, b) => a.value - b.value);

  // Position label
  const position =
    companyEV >= cohortP75
      ? 'top quartile'
      : companyEV >= cohortMedian
        ? 'above median'
        : companyEV >= cohortP25
          ? 'below median'
          : 'bottom quartile';

  const positionColor =
    companyEV >= cohortP75
      ? 'text-jade-upside'
      : companyEV >= cohortMedian
        ? 'text-cyan-interactive'
        : companyEV >= cohortP25
          ? 'text-status-warning'
          : 'text-coral-downside';

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            <GlossaryTooltip fieldKey="enterprise_value">
              <span>Cohort Benchmark</span>
            </GlossaryTooltip>
          </h3>
          <p className="text-[11px] text-text-secondary">
            {stageLabel(stage)} · {sector} · London cohort
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-text-secondary block">Position</span>
          <span className={`text-xs font-bold capitalize ${positionColor}`}>
            {position}
          </span>
        </div>
      </div>

      {/* Summary line */}
      <div className="mb-4 p-3 rounded-lg border border-white/5 bg-white/[0.02] text-xs text-text-primary">
        At {stageLabel(stage)}, companies in <strong>{sector}</strong> with your
        growth profile were valued at{' '}
        <strong className="text-cyan-interactive">{formatCurrency(cohortMedian)}</strong>{' '}
        (median). You are at{' '}
        <strong className={positionColor}>{formatCurrency(companyEV)}</strong>.
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 16, right: 24, left: 24, bottom: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrency(v)}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CohortTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.10)' }}
            isAnimationActive={false}
          />
          <ReferenceLine
            y={cohortMedian}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="4 4"
            label={{ value: 'Median', fill: 'var(--text-tertiary)', fontSize: 9, position: 'right' }}
          />
          <Bar dataKey="value" barSize={40} radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.label}
                fill={
                  entry.isCompany
                    ? 'var(--color-cyan-interactive)'
                    : 'var(--color-sterling-reference)'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Olivia explanation */}
      {explanation && (
        <div className="mt-3 p-3 rounded-lg bg-cyan-interactive/5 border border-cyan-interactive/10">
          <p className="text-xs text-text-primary leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
}
