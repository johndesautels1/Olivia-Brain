'use client';

import type { ValuationBand } from '@/lib/valuation/types';
import { formatCurrency } from '@/lib/valuation/dashboard-types';
import GlossaryTooltip from './GlossaryTooltip';

// ── Props ────────────────────────────────────────────────────────────

export type ChallengeResponse = {
  challenge: string;
  response: string;
};

export type NegotiationAnchorCardProps = {
  companyName: string;
  /** Walk away floor — lowest acceptable */
  walkAway: number;
  walkAwayRationale: string;
  /** Target — realistic outcome */
  target: number;
  targetRationale: string;
  /** Anchor — opening ask */
  anchor: number;
  anchorRationale: string;
  /** Top 3 investor challenges with prepared responses */
  challengeResponses: ChallengeResponse[];
};

// ── Display-precision rounding ───────────────────────────────────────
// formatCurrency rounds each value independently to 1 decimal in its
// tier (M/B/K). When we subtract two independently-rounded values the
// result can be inconsistent (e.g. £5.0M - £3.8M = £1.2M, but the raw
// gap might round to £1.3M). Fix: round inputs to the same precision
// used for display, THEN subtract.

function roundToDisplayPrecision(value: number): number {
  const abs = Math.abs(value);
  const sign = value < 0 ? -1 : 1;
  if (abs >= 1_000_000_000) {
    return sign * Math.round(abs / 100_000_000) * 100_000_000; // 0.1B
  }
  if (abs >= 1_000_000) {
    return sign * Math.round(abs / 100_000) * 100_000; // 0.1M
  }
  if (abs >= 1_000) {
    return sign * Math.round(abs / 1_000) * 1_000; // 1K
  }
  return Math.round(value);
}

// ── Design tokens ───────────────────────────────────────────────────

const COLOR_WALKAWAY = '#E84855'; // coral-downside
const COLOR_TARGET = '#C4A96A';   // aurum-primary
const COLOR_ANCHOR = '#34D399';   // jade-upside

// ── Number card ─────────────────────────────────────────────────────

function AnchorNumber({
  label,
  fieldKey,
  value,
  rationale,
  accentText,
  accentBorder,
}: {
  label: string;
  fieldKey: string;
  value: number;
  rationale: string;
  accentText: string;
  accentBorder: string;
}) {
  return (
    <div className={`flex-1 rounded-lg border ${accentBorder} p-4 text-center`}>
      <GlossaryTooltip fieldKey={fieldKey}>
        <p className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold mb-1">
          {label}
        </p>
      </GlossaryTooltip>
      <p className={`text-xl font-bold tabular-nums ${accentText} mb-2`}>
        {formatCurrency(value)}
      </p>
      <p className="text-[11px] text-text-secondary leading-relaxed">
        {rationale}
      </p>
    </div>
  );
}

// ── Range Beam — proportional horizontal bar ────────────────────────

function RangeBeam({
  walkAway,
  target,
  anchor,
}: {
  walkAway: number;
  target: number;
  anchor: number;
}) {
  const min = Math.min(walkAway, target, anchor);
  const max = Math.max(walkAway, target, anchor);
  const range = max - min || 1;

  // Positions as percentages (with 4% padding each side)
  const pad = 4;
  const scale = (v: number) => pad + ((v - min) / range) * (100 - pad * 2);

  const walkPct = scale(walkAway);
  const targetPct = scale(target);
  const anchorPct = scale(anchor);

  const bargainLeft = Math.min(walkPct, anchorPct);
  const bargainRight = Math.max(walkPct, anchorPct);

  return (
    <div className="mb-6">
      <GlossaryTooltip fieldKey="negotiation_range">
        <p className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold mb-2">
          Negotiation Range
        </p>
      </GlossaryTooltip>
      <div className="relative h-14 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        {/* Bargaining zone fill */}
        <div
          className="absolute top-0 bottom-0 rounded-lg opacity-10"
          style={{
            left: `${bargainLeft}%`,
            width: `${bargainRight - bargainLeft}%`,
            background: `linear-gradient(90deg, ${COLOR_WALKAWAY}, ${COLOR_TARGET}, ${COLOR_ANCHOR})`,
          }}
        />

        {/* Track line — handles both normal (walkAway < anchor) and inverted (anchor < walkAway) */}
        <div
          className="absolute top-1/2 h-[2px] -translate-y-1/2"
          style={{
            left: `${Math.min(walkPct, anchorPct)}%`,
            width: `${Math.abs(anchorPct - walkPct)}%`,
            background: `linear-gradient(90deg, ${COLOR_WALKAWAY}, ${COLOR_TARGET}, ${COLOR_ANCHOR})`,
          }}
        />

        {/* Walk Away marker — staggered: value below dot, label above */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{ left: `${walkPct}%` }}>
          <div className="w-3 h-3 rounded-full border-2 shadow-lg" style={{ borderColor: COLOR_WALKAWAY, backgroundColor: `${COLOR_WALKAWAY}33` }} />
          <span className="absolute -bottom-5 text-[9px] sm:text-[11px] font-mono font-semibold whitespace-nowrap" style={{ color: COLOR_WALKAWAY }}>
            {formatCurrency(walkAway)}
          </span>
          <span className="absolute -top-4 text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLOR_WALKAWAY }}>
            Floor
          </span>
        </div>

        {/* Target marker — glowing gold, value staggered lower on mobile to avoid Floor overlap */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{ left: `${targetPct}%` }}>
          <div
            className="w-4 h-4 rounded-full border-2 shadow-lg"
            style={{
              borderColor: COLOR_TARGET,
              backgroundColor: `${COLOR_TARGET}44`,
              boxShadow: `0 0 8px ${COLOR_TARGET}66`,
            }}
          />
          <span className="absolute -bottom-9 sm:-bottom-5 text-[9px] sm:text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: COLOR_TARGET }}>
            {formatCurrency(target)}
          </span>
          <span className="absolute -top-4 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: COLOR_TARGET }}>
            Target
          </span>
        </div>

        {/* Anchor marker — value at same level as Floor on mobile, staggered from Target */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{ left: `${anchorPct}%` }}>
          <div className="w-3 h-3 rounded-full border-2 shadow-lg" style={{ borderColor: COLOR_ANCHOR, backgroundColor: `${COLOR_ANCHOR}33` }} />
          <span className="absolute -bottom-5 text-[9px] sm:text-[11px] font-mono font-semibold whitespace-nowrap" style={{ color: COLOR_ANCHOR }}>
            {formatCurrency(anchor)}
          </span>
          <span className="absolute -top-4 text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLOR_ANCHOR }}>
            Anchor
          </span>
        </div>
      </div>

      {/* Gap labels — use display-rounded values so arithmetic is visually consistent */}
      {(() => {
        const rW = roundToDisplayPrecision(walkAway);
        const rT = roundToDisplayPrecision(target);
        const rA = roundToDisplayPrecision(anchor);
        return (
          <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 mt-6 px-2">
            <GlossaryTooltip fieldKey="gap_to_target">
              <span className="text-xs text-text-primary font-semibold font-mono tabular-nums">
                Gap to target: {formatCurrency(Math.abs(rT - rW))}
              </span>
            </GlossaryTooltip>
            <GlossaryTooltip fieldKey="concession_room">
              <span className="text-xs text-text-primary font-semibold font-mono tabular-nums">
                Concession room: {formatCurrency(Math.abs(rA - rT))}
              </span>
            </GlossaryTooltip>
            <GlossaryTooltip fieldKey="total_range">
              <span className="text-xs text-text-primary font-semibold font-mono tabular-nums">
                Total range: {formatCurrency(Math.abs(rA - rW))}
              </span>
            </GlossaryTooltip>
          </div>
        );
      })()}
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────

export default function NegotiationAnchorCard({
  companyName,
  walkAway,
  walkAwayRationale,
  target,
  targetRationale,
  anchor,
  anchorRationale,
  challengeResponses,
}: NegotiationAnchorCardProps) {
  return (
    <div className="glass-card p-0 overflow-hidden print:border print:border-slate-300">
      {/* Confidential header */}
      <div className="bg-slate-800/80 px-6 py-3 border-b border-white/10 flex items-center justify-between print:bg-white print:border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-text-primary print:text-slate-900">
            Negotiation Anchor Card
          </h3>
          <p className="text-[11px] text-text-secondary print:text-text-tertiary">
            {companyName} — Confidential Briefing
          </p>
        </div>
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-widest bg-red-500/20 text-coral-downside border border-red-500/30 print:bg-red-50 print:text-red-700 print:border-red-200">
          Confidential
        </span>
      </div>

      <div className="p-6">
        {/* Proportional range beam */}
        <RangeBeam walkAway={walkAway} target={target} anchor={anchor} />

        {/* Three anchor numbers */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <AnchorNumber
            label="Walk Away"
            fieldKey="walk_away"
            value={walkAway}
            rationale={walkAwayRationale}
            accentText="text-[#E84855]"
            accentBorder="border-[#E84855]/20"
          />
          <AnchorNumber
            label="Target"
            fieldKey="target_price"
            value={target}
            rationale={targetRationale}
            accentText="text-[#C4A96A]"
            accentBorder="border-[#C4A96A]/30"
          />
          <AnchorNumber
            label="Anchor"
            fieldKey="anchor_price"
            value={anchor}
            rationale={anchorRationale}
            accentText="text-jade-upside"
            accentBorder="border-emerald-500/20"
          />
        </div>

        {/* Challenge responses */}
        <div>
          <h4 className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold mb-3">
            Top Investor Challenges &amp; Your Responses
          </h4>
          <div className="space-y-3">
            {challengeResponses.map((cr, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 text-coral-downside text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-xs text-coral-downside font-medium leading-relaxed">
                    &ldquo;{cr.challenge}&rdquo;
                  </p>
                </div>
                <div className="ml-7">
                  <p className="text-xs text-text-primary leading-relaxed">
                    {cr.response}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
