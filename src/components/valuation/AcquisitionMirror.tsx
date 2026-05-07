'use client';

import type { AcquisitionMirrorResult } from '@/lib/valuation/types';
import { formatCurrency } from '@/lib/valuation/dashboard-types';
import GlossaryTooltip from './GlossaryTooltip';

// ── Props ────────────────────────────────────────────────────────────

export type AcquisitionMirrorProps = {
  mirror: AcquisitionMirrorResult;
  companyName: string;
};

// ── Value column ────────────────────────────────────────────────────

function ValuationColumn({
  label,
  agentName,
  low,
  base,
  high,
  narrative,
  accentBorder,
  accentText,
  accentBg,
}: {
  label: string;
  agentName: string;
  low: number;
  base: number;
  high: number;
  narrative: string;
  accentBorder: string;
  accentText: string;
  accentBg: string;
}) {
  return (
    <div className={`flex-1 rounded-lg border ${accentBorder} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${accentBg} ${accentText}`}
        >
          {agentName}
        </span>
        <span className="text-xs text-text-secondary">{label}</span>
      </div>

      {/* Headline number */}
      <p className={`text-2xl font-bold tabular-nums ${accentText} mb-1`}>
        {formatCurrency(base)}
      </p>
      <p className="text-[11px] text-text-secondary mb-3">
        {formatCurrency(low)} – {formatCurrency(high)}
      </p>

      {/* Narrative */}
      <div className={`p-3 rounded-lg border ${accentBorder} bg-white/[0.01]`}>
        <p className="text-xs text-text-primary leading-relaxed whitespace-pre-line">
          {narrative}
        </p>
      </div>
    </div>
  );
}

// ── Negotiation zone bar ────────────────────────────────────────────

function NegotiationZoneBar({
  buyerBase,
  sellerBase,
  zoneLow,
  zoneHigh,
}: {
  buyerBase: number;
  sellerBase: number;
  zoneLow: number;
  zoneHigh: number;
}) {
  const min = Math.min(buyerBase * 0.85, zoneLow);
  const max = Math.max(sellerBase * 1.15, zoneHigh);
  const range = max - min || 1;

  const buyerPct = ((buyerBase - min) / range) * 100;
  const sellerPct = ((sellerBase - min) / range) * 100;
  const zoneLowPct = ((zoneLow - min) / range) * 100;
  const zoneHighPct = ((zoneHigh - min) / range) * 100;
  const zoneWidthPct = zoneHighPct - zoneLowPct;

  return (
    <div className="my-4">
      <div className="flex items-center justify-between text-[11px] text-text-secondary mb-1">
        <span>Buyer: {formatCurrency(buyerBase)}</span>
        <span>Negotiation Zone</span>
        <span>Seller: {formatCurrency(sellerBase)}</span>
      </div>

      <div className="relative h-8 sm:h-6 rounded-full bg-white/5 overflow-hidden">
        {/* Negotiation zone (amber) */}
        <div
          className="absolute top-0 h-full bg-status-warning/20 border-x border-status-warning/40"
          style={{ left: `${zoneLowPct}%`, width: `${Math.max(0, zoneWidthPct)}%` }}
        />

        {/* Buyer marker (red) */}
        <div
          className="absolute top-0 h-full w-1 sm:w-0.5 bg-coral-downside rounded-full"
          style={{ left: `${buyerPct}%` }}
        />

        {/* Seller marker (green) */}
        <div
          className="absolute top-0 h-full w-1 sm:w-0.5 bg-jade-upside rounded-full"
          style={{ left: `${sellerPct}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-1">
        <span className="flex items-center gap-1 text-[11px] text-coral-downside">
          <span className="w-2 h-2 rounded-full bg-coral-downside shrink-0" /> Buyer
        </span>
        <span className="flex items-center gap-1 text-[11px] text-status-warning">
          <span className="w-2 h-0.5 bg-status-warning shrink-0" /> <span className="truncate">Zone: {formatCurrency(zoneLow)} – {formatCurrency(zoneHigh)}</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-jade-upside">
          <span className="w-2 h-2 rounded-full bg-jade-upside shrink-0" /> Seller
        </span>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────

export default function AcquisitionMirror({
  mirror,
  companyName,
}: AcquisitionMirrorProps) {
  // G-04 fix: show "N/A" when buyer base is 0 (division by zero is undefined, not 0%)
  const gapPct =
    mirror.buyerValuation.base > 0
      ? (
          ((mirror.sellerValuation.base - mirror.buyerValuation.base) /
            mirror.buyerValuation.base) *
          100
        ).toFixed(1)
      : null;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            <GlossaryTooltip fieldKey="acquisition_mirror">
              <span>Acquisition Mirror</span>
            </GlossaryTooltip>
          </h3>
          <p className="text-[11px] text-text-secondary">
            Seller vs Buyer valuation perspective for {companyName}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-text-secondary block">Valuation Gap</span>
          <span className="text-sm font-bold tabular-nums text-status-warning">
            {gapPct !== null ? `${gapPct}%` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Negotiation zone */}
      <NegotiationZoneBar
        buyerBase={mirror.buyerValuation.base}
        sellerBase={mirror.sellerValuation.base}
        zoneLow={mirror.negotiationZone.low}
        zoneHigh={mirror.negotiationZone.high}
      />

      {/* Side by side */}
      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <ValuationColumn
          label="Seller View"
          agentName="Olivia"
          low={mirror.sellerValuation.low}
          base={mirror.sellerValuation.base}
          high={mirror.sellerValuation.high}
          narrative={mirror.oliviaNarrative}
          accentBorder="border-jade-upside/20"
          accentText="text-jade-upside"
          accentBg="bg-jade-upside/10"
        />
        <ValuationColumn
          label="Buyer View"
          agentName="Cristiano"
          low={mirror.buyerValuation.low}
          base={mirror.buyerValuation.base}
          high={mirror.buyerValuation.high}
          narrative={mirror.cristianoNarrative}
          accentBorder="border-coral-downside/20"
          accentText="text-coral-downside"
          accentBg="bg-coral-downside/10"
        />
      </div>

      {/* Gap explanation */}
      {mirror.gapExplanation && (
        <div className="mt-4 p-3 rounded-lg border border-cyan-interactive/10 bg-cyan-interactive/5">
          <p className="text-[11px] text-cyan-interactive font-semibold mb-1 uppercase tracking-wider">
            Olivia: How to Close the Gap
          </p>
          <p className="text-xs text-text-primary leading-relaxed">
            {mirror.gapExplanation}
          </p>
        </div>
      )}
    </div>
  );
}
