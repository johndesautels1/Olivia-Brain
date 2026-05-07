'use client';

import { useState, useCallback } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import ChartCard from './ChartCard';

// ── Metric tooltip definitions ───────────────────────────────────────

const METRIC_TOOLTIPS: Record<string, { title: string; description: string }> = {
  Revenue: {
    title: 'Revenue',
    description: 'Annual recurring revenue (ARR) or total annual revenue, normalised against stage-appropriate benchmarks for London tech companies.',
  },
  Growth: {
    title: 'Growth',
    description: 'Year-over-year revenue growth rate (%). Measures top-line momentum relative to comparable companies at the same stage.',
  },
  Margins: {
    title: 'Margins',
    description: 'Gross margin or EBITDA margin (%). Indicates unit economics efficiency and the company\'s ability to scale profitably.',
  },
  Team: {
    title: 'Team',
    description: 'Management strength score (0–100) assessing founder experience, leadership depth, board composition, and domain expertise.',
  },
  Retention: {
    title: 'Retention',
    description: 'Net Revenue Retention (NRR %). Measures revenue durability — how much existing customers expand vs. churn each year. Above 100% means net expansion.',
  },
  Runway: {
    title: 'Runway',
    description: 'Months of cash runway remaining at current burn rate. Indicates financial resilience and negotiation leverage in funding rounds.',
  },
};

// ── Props ────────────────────────────────────────────────────────────

export type FingerprintAxis = {
  axis: string;
  company: number;
  compMedian: number;
  fullMark: number;
};

export type ComparableFingerprintProps = {
  data: FingerprintAxis[];
  companyName: string;
  /** Olivia narration comparing company to comps */
  narration?: string | null;
};

// ── Custom tick with hover tooltip ──────────────────────────────────

function AxisTickWithTooltip(props: {
  payload: { value: string };
  x: number;
  y: number;
  textAnchor: 'start' | 'middle' | 'end' | 'inherit' | undefined;
  activeTooltip: string | null;
  onEnter: (axis: string) => void;
  onLeave: () => void;
}) {
  const { payload, x, y, textAnchor, activeTooltip, onEnter, onLeave } = props;
  const label = payload.value;
  const tip = METRIC_TOOLTIPS[label];
  const isActive = activeTooltip === label;

  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill="var(--text-primary)"
        fontSize={11}
        style={{ cursor: 'help', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px' }}
        onMouseEnter={() => onEnter(label)}
        onMouseLeave={onLeave}
        onClick={() => onEnter(isActive ? '' : label)}
      >
        {label}
      </text>
      {isActive && tip && (
        <foreignObject
          x={Math.max(4, x - 120)}
          y={y < 60 ? y + 14 : y - 104}
          width={240}
          height={96}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'rgba(15, 15, 20, 0.95)',
              border: '1px solid rgba(196, 169, 106, 0.3)',
              borderRadius: 8,
              padding: '8px 10px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <p style={{ color: '#C4A96A', fontSize: 11, fontWeight: 700, margin: '0 0 4px 0' }}>
              {tip.title}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 10, lineHeight: 1.45, margin: 0 }}>
              {tip.description}
            </p>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

// ── Component ───────────────────────────────────────────────────────

export default function ComparableFingerprint({
  data,
  companyName,
  narration,
}: ComparableFingerprintProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const handleEnter = useCallback((axis: string) => setActiveTooltip(axis), []);
  const handleLeave = useCallback(() => setActiveTooltip(null), []);

  if (data.length === 0) {
    return (
      <ChartCard title="Comparable Fingerprint">
        <p className="text-[11px] text-text-primary">No comparable data available.</p>
      </ChartCard>
    );
  }

  // Data-driven takeaway
  const aboveMedianCount = data.filter((d) => d.company > d.compMedian).length;
  const takeawayText = `${companyName} exceeds the comparable median on ${aboveMedianCount} of ${data.length} operating metrics.`;

  return (
    <ChartCard title="Comparable Fingerprint" takeaway={takeawayText}>

      <ResponsiveContainer width="100%" height={340}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={(tickProps: Record<string, unknown>) => (
              <AxisTickWithTooltip
                {...(tickProps as { payload: { value: string }; x: number; y: number; textAnchor: 'start' | 'middle' | 'end' | 'inherit' | undefined })}
                activeTooltip={activeTooltip}
                onEnter={handleEnter}
                onLeave={handleLeave}
              />
            )}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 'dataMax']}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
          />
          <Radar
            name={companyName}
            dataKey="company"
            stroke="var(--color-cyan-interactive)"
            fill="var(--color-cyan-interactive)"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Radar
            name="Comp Median"
            dataKey="compMedian"
            stroke="var(--color-sterling-reference)"
            fill="var(--color-sterling-reference)"
            fillOpacity={0.1}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
        </RadarChart>
      </ResponsiveContainer>

      {narration && (
        <div className="mt-3 p-3 rounded-lg bg-cyan-interactive/5 border border-cyan-interactive/10">
          <p className="text-xs text-text-primary leading-relaxed">{narration}</p>
        </div>
      )}
    </ChartCard>
  );
}
