'use client';

import { formatCurrency } from '@/lib/valuation/dashboard-types';

// ── WowCard — single attention-grabbing signal ──────────────────────

function WowCard({
  label,
  value,
  subtitle,
  isCenter,
}: {
  label: string;
  value: string;
  subtitle: string;
  isCenter?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-1 rounded-lg overflow-hidden text-center px-3 py-4 ${
        isCenter ? 'glass-focal' : 'glass-card'
      }`}
      style={isCenter ? {
        borderColor: 'rgba(196, 169, 106, 0.35)',
        boxShadow: '0 0 24px -6px rgba(196, 169, 106, 0.2), inset 0 1px 0 rgba(196, 169, 106, 0.1)',
      } : undefined}
    >
      {isCenter && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #C4A96A 30%, #D4B97A 50%, #C4A96A 70%, transparent)' }}
        />
      )}
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: isCenter ? '#C4A96A' : '#94a3b8' }}
      >
        {label}
      </span>
      <span
        className="text-lg sm:text-xl font-bold tabular-nums leading-none"
        style={{
          fontFamily: "JetBrains Mono, var(--font-mono), monospace",
          color: isCenter ? '#D9BD7E' : '#f1f5f9',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      <span className="text-[11px] text-text-secondary leading-tight mt-0.5 max-w-[160px]">
        {subtitle}
      </span>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────

export type KpiCardsProps = {
  /** Number of enabled methods that agree */
  methodsUsed: number;
  totalMethods: number;
  /** Monte Carlo percentile data */
  mcP10: number | null;
  mcMedian: number | null;
  /** % of MC simulations that exceed the reconciled EV */
  mcExceedancePct: number | null;
  /** Real option uplift percentage */
  optionUpliftPct: number | null;
  /** Cohort percentile rank (0-100) */
  cohortPercentile: number | null;
  cohortLabel: string;
  /** Top sensitivity lever */
  topLeverName: string | null;
  topLeverImpact: number | null;
  /** Enterprise value base for context */
  evBase: number;
};

// ── Component ────────────────────────────────────────────────────────

export default function KpiCards({
  methodsUsed,
  totalMethods,
  mcP10,
  mcMedian,
  mcExceedancePct,
  optionUpliftPct,
  cohortPercentile,
  cohortLabel,
  topLeverName,
  topLeverImpact,
  evBase,
}: KpiCardsProps) {

  // 1. Method Consensus
  const consensusValue = `${methodsUsed}/${totalMethods}`;
  const consensusSub = methodsUsed >= 8
    ? 'Strong multi-method consensus'
    : methodsUsed >= 5
      ? 'Solid method agreement'
      : 'Independent method validation';

  // 2. Real Option Uplift
  const upliftValue = optionUpliftPct !== null ? `+${optionUpliftPct.toFixed(1)}%` : '—';
  const upliftSub = optionUpliftPct !== null
    ? 'Strategic upside not yet priced'
    : 'No option data available';

  // 3. Peer Percentile (CENTER) — real data from DB peer query
  const peerValue = cohortPercentile !== null ? `Top ${Math.max(1, 100 - Math.round(cohortPercentile))}%` : '—';
  const peerSub = cohortPercentile !== null
    ? cohortLabel
    : 'Needs 2+ peers in same stage/sector';

  // 4. MC Upside Probability — real exceedance % from MC distribution
  const mcValue = mcExceedancePct !== null
    ? `${mcExceedancePct}%`
    : mcMedian !== null
      ? formatCurrency(mcMedian)
      : '—';
  const mcSub = mcExceedancePct !== null
    ? `Simulations exceeding base EV`
    : mcP10 !== null
      ? `P10 floor: ${formatCurrency(mcP10)}`
      : 'Monte Carlo not available';

  // 5. #1 Growth Lever
  const leverValue = topLeverImpact !== null ? `+${formatCurrency(topLeverImpact)}` : '—';
  const leverSub = topLeverName !== null
    ? `${topLeverName} upside potential`
    : 'No sensitivity data';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
      <WowCard
        label="Method Consensus"
        value={consensusValue}
        subtitle={consensusSub}
      />
      <WowCard
        label="Option Uplift"
        value={upliftValue}
        subtitle={upliftSub}
      />
      <div className="col-span-2 lg:col-span-1">
        <WowCard
          label="Peer Rank"
          value={peerValue}
          subtitle={peerSub}
          isCenter
        />
      </div>
      <WowCard
        label="MC Confidence"
        value={mcValue}
        subtitle={mcSub}
      />
      <WowCard
        label="#1 Growth Lever"
        value={leverValue}
        subtitle={leverSub}
      />
    </div>
  );
}
