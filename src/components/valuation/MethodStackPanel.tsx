'use client';

import { useState, useMemo } from 'react';
import type { ValuationMethodResult, MethodDisagreement } from '@/lib/valuation/types';
import { formatCurrency } from '@/lib/valuation/dashboard-types';
import GlossaryTooltip from './GlossaryTooltip';

// ── Method name display ────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  revenue_multiple: 'Revenue Multiple',
  ebitda_multiple: 'EBITDA Multiple',
  dcf: 'DCF',
  vc_method: 'VC Method',
  cost_to_duplicate: 'Cost to Duplicate',
  scorecard: 'Scorecard',
  strategic_synergy: 'Strategic Synergy',
  precedent_transactions: 'Precedent Transactions',
  liquidation: 'Liquidation',
  real_options: 'Real Options',
  strategic_adjustment: 'Strategic Adjustment',
};

// ── Method → Family mapping ──────────────────────────────────────────

type MethodFamily = 'Qualitative' | 'Forward' | 'Income' | 'Market' | 'Cost' | 'Overlay';

const METHOD_FAMILY: Record<string, MethodFamily> = {
  scorecard: 'Qualitative',
  vc_method: 'Forward',
  dcf: 'Forward',
  revenue_multiple: 'Income',
  ebitda_multiple: 'Income',
  precedent_transactions: 'Market',
  strategic_synergy: 'Market',
  cost_to_duplicate: 'Cost',
  liquidation: 'Cost',
  strategic_adjustment: 'Overlay',
  real_options: 'Overlay',
};

const FAMILY_COLORS: Record<MethodFamily, string> = {
  Qualitative: '#22d3ee',
  Forward: '#C4A96A',
  Income: '#a78bfa',
  Market: '#f472b6',
  Cost: '#94a3b8',
  Overlay: '#94a3b8',
};

function getFamilyColor(method: string): string {
  const family = METHOD_FAMILY[method] ?? 'Cost';
  return FAMILY_COLORS[family];
}

function getFamilyLabel(method: string): string {
  return METHOD_FAMILY[method] ?? 'Overlay';
}

// ── Disabled method explanations (plain English) ────────────────────

const DISABLED_REASONS: Record<string, { why: string; fix: string }> = {
  'No revenue data available': {
    why: 'This company has no revenue figures on file.',
    fix: 'Upload financial documents showing annual or monthly revenue.',
  },
  'No positive EBITDA available': {
    why: 'The company is not yet profitable at the operating level.',
    fix: 'This method becomes available once the company reports positive earnings before interest, taxes, depreciation, and amortisation.',
  },
  'No revenue data for DCF projection': {
    why: 'Revenue data is needed to project future cash flows.',
    fix: 'Upload financial documents with revenue and margin data.',
  },
  'DCF produced non-positive or non-finite result': {
    why: 'The projected cash flows resulted in a negative or undefined value.',
    fix: 'Check that revenue growth and margin assumptions are realistic.',
  },
  'No revenue data for VC back-solve': {
    why: 'Revenue is needed to estimate a future exit value.',
    fix: 'Upload financial documents showing current revenue.',
  },
  'VC back-solve produced non-positive result': {
    why: 'The target exit return calculation resulted in a negative value.',
    fix: 'Review the exit multiple and target IRR assumptions.',
  },
  'No build cost or replacement cost data': {
    why: 'No data on what it would cost to rebuild this company from scratch.',
    fix: 'Add team size, development timeline, or asset replacement cost data.',
  },
  'No strategic synergy inputs provided': {
    why: 'No information about potential strategic partnerships or acquisition synergies.',
    fix: 'Add data about partnership revenue uplift, cost savings, or market access.',
  },
  'No revenue data for precedent comparison': {
    why: 'Revenue is needed to compare against similar transactions.',
    fix: 'Upload financial documents showing current revenue.',
  },
  'No revenue data or funding history for precedent comparison': {
    why: 'Neither revenue data nor funding round history is available to anchor a precedent comparison.',
    fix: 'Add last funding round valuation (pre-money or post-money) or upload financial documents showing revenue.',
  },
  'No standalone EV available for real options': {
    why: 'A base enterprise value is needed to model strategic optionality.',
    fix: 'Ensure at least one other valuation method produces a result.',
  },
  'Real options have zero value (options are out of the money)': {
    why: 'The company\'s strategic options (pivot, expand, abandon) have no additional value above the base case.',
    fix: 'This is normal for stable companies with limited optionality.',
  },
};

function getDisabledExplanation(summary: string): { why: string; fix: string } | null {
  const reason = summary.replace(/^Disabled:\s*/i, '');
  return DISABLED_REASONS[reason] ?? null;
}

// ── PipBar ──────────────────────────────────────────────────────────
// 0..1 → small horizontal segment bar (12 segments by default)

/** 5-tier color scale: maps a 0-1 value to the standard Clues score color */
function tierColor(v: number): string {
  const pct = v * 100;
  if (pct <= 20) return '#f87171';   // red — bad / no data
  if (pct <= 40) return '#fb923c';   // orange — below average
  if (pct <= 60) return '#facc15';   // yellow — average
  if (pct <= 80) return '#60a5fa';   // blue — good
  return '#4ade80';                  // green — excellent
}

function PipBar({ value, color, segments = 12, width = 56 }: {
  value: number; color: string; segments?: number; width?: number;
}) {
  const filled = Math.round(value * segments);
  return (
    <span aria-hidden="true" className="inline-flex" style={{ gap: 2, width, height: 8 }}>
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            background: i < filled ? color : 'rgba(255,255,255,0.10)',
            borderRadius: 1,
          }}
        />
      ))}
    </span>
  );
}

// ── GripIcon (visual only — no drag wiring) ─────────────────────────

function GripIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true" className="block">
      <g fill="currentColor">
        <circle cx="2" cy="3" r="1" /><circle cx="8" cy="3" r="1" />
        <circle cx="2" cy="8" r="1" /><circle cx="8" cy="8" r="1" />
        <circle cx="2" cy="13" r="1" /><circle cx="8" cy="13" r="1" />
      </g>
    </svg>
  );
}


// ── Enabled Method Row ──────────────────────────────────────────────

function EnabledMethodRow({ m }: { m: ValuationMethodResult }) {
  const [open, setOpen] = useState(false);
  const color = getFamilyColor(m.method);
  const family = getFamilyLabel(m.method);
  const isOverlay = m.isOverlay === true;
  const methodLabel = METHOD_LABELS[m.method] ?? m.method;

  return (
    <article aria-label={`${methodLabel} â€” ${family}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
      {/* Desktop: 5-column grid | Mobile: stacked layout */}
      <div
        className="hidden sm:grid items-start gap-3 px-4 py-3.5"
        style={{ gridTemplateColumns: '18px 4px minmax(0,1.4fr) minmax(0,1.6fr) auto' }}
      >
        {/* grip */}
        <span className="inline-flex items-center justify-center w-[18px] h-6 mt-0.5 opacity-40" aria-hidden="true" style={{ color: '#94a3b8' }}>
          <GripIcon />
        </span>

        {/* family rail */}
        <span
          aria-hidden="true"
          className="self-stretch rounded-[2px]"
          style={{
            width: 4, minHeight: 36,
            background: color,
            boxShadow: `0 0 8px -2px ${color}`,
          }}
        />

        {/* identity + summary + assumptions toggle */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <GlossaryTooltip fieldKey={m.method}>
              <span className="text-sm font-bold" style={{ color: '#f1f5f9', letterSpacing: -0.1 }}>
                {methodLabel}
              </span>
            </GlossaryTooltip>
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color, letterSpacing: '0.08em' }}
            >
              {family}
            </span>
          </div>

          <p
            className="mt-1.5 text-[12px] leading-relaxed font-[family-name:'JetBrains Mono', var(--font-mono), monospace]"
            style={{ color: '#cbd5e1' }}
          >
            {m.summary}
          </p>

          {m.assumptions.length > 0 && (
            <button
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              aria-label={`${open ? 'Hide' : 'Show'} ${m.assumptions.length} assumption${m.assumptions.length === 1 ? '' : 's'} for ${methodLabel}`}
              className="mt-2 border-0 bg-transparent cursor-pointer text-[12px] font-bold uppercase inline-flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9BD7E] rounded"
              style={{ color: '#D9BD7E', padding: 0, letterSpacing: '0.04em' }}
            >
              <span aria-hidden="true">{open ? '\u25BE' : '\u25B8'}</span> {m.assumptions.length} assumption{m.assumptions.length === 1 ? '' : 's'}
            </button>
          )}

        </div>

        {/* EV band + stage-fit + data-quality */}
        {m.enterpriseValue && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#cbd5e1' }}>
              EV &middot; low &middot; base &middot; high
            </div>
            <div className="flex items-baseline gap-2.5 font-[family-name:'JetBrains Mono', var(--font-mono), monospace]">
              <span className="text-sm font-semibold" style={{ color: '#cbd5e1' }}>{formatCurrency(m.enterpriseValue.low)}</span>
              <span aria-hidden="true" style={{ color: '#cbd5e1' }}>&middot;</span>
              <span className="font-extrabold" style={{ color: '#f1f5f9', fontSize: 16 }}>{formatCurrency(m.enterpriseValue.base)}</span>
              <span aria-hidden="true" style={{ color: '#cbd5e1' }}>&middot;</span>
              <span className="text-sm font-semibold" style={{ color: '#cbd5e1' }}>{formatCurrency(m.enterpriseValue.high)}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5" role="group" aria-label={`Stage fit: ${Math.round(m.stageFit * 100)} percent`}>
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#cbd5e1' }}>Stage fit</span>
                <PipBar value={m.stageFit} color={tierColor(m.stageFit)} />
                <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] font-bold" style={{ color: tierColor(m.stageFit) }}>
                  {Math.round(m.stageFit * 100)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5" role="group" aria-label={`Data quality: ${Math.round(m.dataQuality * 100)} percent`}>
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#cbd5e1' }}>Data</span>
                <PipBar value={m.dataQuality} color={tierColor(m.dataQuality)} />
                <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] font-bold" style={{ color: tierColor(m.dataQuality) }}>
                  {Math.round(m.dataQuality * 100)}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* weight */}
        <div style={{ minWidth: 120, textAlign: 'right' }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#cbd5e1' }}>Weight</div>
          <div className="flex items-center gap-2.5 justify-end">
            <div
              aria-hidden="true"
              className="relative overflow-hidden rounded-[2px]"
              style={{ width: 70, height: 6, background: 'rgba(255,255,255,0.12)' }}
            >
              <div
                className="absolute inset-0"
                style={{
                  width: `${(isOverlay ? 50 : m.weight * 100)}%`,
                  background: `linear-gradient(90deg, ${color} 0%, ${color}aa 100%)`,
                  boxShadow: `0 0 8px -2px ${color}`,
                }}
              />
            </div>
            <span
              className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] font-extrabold text-base"
              style={{ color: '#f1f5f9', minWidth: 44, textAlign: 'right' }}
            >
              {isOverlay ? (
                <span className="text-xs font-semibold" style={{ color: '#cbd5e1' }}>Overlay</span>
              ) : (
                <>{Math.round(m.weight * 100)}<span className="text-[11px] font-semibold" style={{ color: '#cbd5e1' }}>%</span></>
              )}
            </span>
          </div>
          {!isOverlay && m.enterpriseValue && (
            <div className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] mt-1.5 text-[11px]" style={{ color: '#cbd5e1' }}>
              contributes{' '}
              <span className="font-bold" style={{ color: '#f1f5f9' }}>
                {formatCurrency(m.weight * m.enterpriseValue.base)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: stacked card layout */}
      <div className="sm:hidden px-4 py-3.5 space-y-3">
        {/* Method name + family + weight badge */}
        <div className="flex items-start gap-2">
          <span aria-hidden="true" className="shrink-0 mt-1 rounded-[2px]" style={{ width: 4, height: 28, background: color, boxShadow: `0 0 8px -2px ${color}` }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <GlossaryTooltip fieldKey={m.method}>
                <span className="text-sm font-bold" style={{ color: '#f1f5f9', letterSpacing: -0.1 }}>{methodLabel}</span>
              </GlossaryTooltip>
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color, letterSpacing: '0.08em' }}>{family}</span>
            </div>
          </div>
          <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] font-extrabold text-base shrink-0" style={{ color: '#f1f5f9' }}>
            {isOverlay ? (
              <span className="text-xs font-semibold" style={{ color: '#cbd5e1' }}>Overlay</span>
            ) : (
              <>{Math.round(m.weight * 100)}<span className="text-[11px] font-semibold" style={{ color: '#cbd5e1' }}>%</span></>
            )}
          </span>
        </div>

        {/* Summary */}
        <p className="text-[12px] leading-relaxed font-[family-name:'JetBrains Mono', var(--font-mono), monospace]" style={{ color: '#cbd5e1' }}>
          {m.summary}
        </p>

        {/* EV band — stacked on mobile */}
        {m.enterpriseValue && (
          <div className="rounded-md px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-baseline gap-2 flex-wrap font-[family-name:'JetBrains Mono', var(--font-mono), monospace]">
              <span className="text-xs" style={{ color: '#94a3b8' }}>{formatCurrency(m.enterpriseValue.low)}</span>
              <span className="font-extrabold text-base" style={{ color: '#f1f5f9' }}>{formatCurrency(m.enterpriseValue.base)}</span>
              <span className="text-xs" style={{ color: '#94a3b8' }}>{formatCurrency(m.enterpriseValue.high)}</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px]">
              <span className="inline-flex items-center gap-1">
                <span style={{ color: '#cbd5e1' }}>Fit</span>
                <PipBar value={m.stageFit} color={tierColor(m.stageFit)} width={40} segments={8} />
                <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] font-bold" style={{ color: tierColor(m.stageFit) }}>{Math.round(m.stageFit * 100)}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span style={{ color: '#cbd5e1' }}>Data</span>
                <PipBar value={m.dataQuality} color={tierColor(m.dataQuality)} width={40} segments={8} />
                <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] font-bold" style={{ color: tierColor(m.dataQuality) }}>{Math.round(m.dataQuality * 100)}</span>
              </span>
            </div>
          </div>
        )}

        {/* Assumptions toggle */}
        {m.assumptions.length > 0 && (
          <button
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} ${m.assumptions.length} assumption${m.assumptions.length === 1 ? '' : 's'} for ${methodLabel}`}
            className="border-0 bg-transparent cursor-pointer text-[12px] font-bold uppercase inline-flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9BD7E] rounded min-h-[44px]"
            style={{ color: '#D9BD7E', padding: 0, letterSpacing: '0.04em' }}
          >
            <span aria-hidden="true">{open ? '\u25BE' : '\u25B8'}</span> {m.assumptions.length} assumption{m.assumptions.length === 1 ? '' : 's'}
          </button>
        )}
      </div>

      {/* Assumptions — horizontal chip rows that span full width */}
      {open && m.assumptions.length > 0 && (
        <div
          role="list"
          aria-label={`Assumptions for ${methodLabel}`}
          className="flex flex-wrap gap-1.5 px-4 pb-3"
          style={{
            marginLeft: 26,
            paddingTop: 2,
          }}
        >
          {m.assumptions.map((a, i) => (
            <span
              key={i}
              role="listitem"
              className="text-[11px] leading-snug rounded w-full sm:w-auto sm:max-w-[calc(50%-4px)] sm:flex-[1_1_calc(50%-4px)]"
              style={{
                color: '#cbd5e1',
                background: 'rgba(255,255,255,0.08)',
                border: `1px solid ${color}33`,
                padding: '4px 10px',
              }}
            >
              {a}
            </span>
          ))}
        </div>
      )}

    </article>
  );
}

// ── Disabled Method Row ─────────────────────────────────────────────

function DisabledMethodRow({ m }: { m: ValuationMethodResult }) {
  const color = getFamilyColor(m.method);
  const family = getFamilyLabel(m.method);
  const explanation = getDisabledExplanation(m.summary);
  const methodLabel = METHOD_LABELS[m.method] ?? m.method;
  const rejectionText = explanation?.why ?? m.summary.replace(/^Disabled:\s*/i, '');

  return (
    <article aria-label={`${methodLabel} â€” excluded`} style={{ borderBottom: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
      <div
        className="grid items-center gap-3 px-4 py-3"
        style={{ gridTemplateColumns: '18px 4px minmax(0,1fr) auto' }}
      >
        <span className="inline-flex items-center justify-center w-[18px] h-5 opacity-40" aria-hidden="true" style={{ color: '#94a3b8' }}>
          <GripIcon />
        </span>
        <span
          aria-hidden="true"
          className="self-stretch rounded-[2px]"
          style={{ width: 4, minHeight: 24, background: 'rgba(255,255,255,0.12)' }}
        />
        <div>
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span
              className="text-[13px] font-semibold line-through"
              style={{ color: '#cbd5e1', textDecorationColor: 'rgba(255,255,255,0.25)' }}
            >
              {methodLabel}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color, opacity: 0.75 }}>
              {family}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#fb923c', letterSpacing: '0.08em' }}>
              Excluded
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: '#cbd5e1' }}>{rejectionText}</p>
          {explanation?.fix && (
            <p className="mt-0.5 text-[11px] italic" style={{ color: '#94a3b8' }}>{explanation.fix}</p>
          )}
        </div>
        <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] text-[11px]" style={{ color: '#94a3b8' }}>
          weight 0%
        </span>
      </div>
    </article>
  );
}

// ── Disagreement helpers ────────────────────────────────────────────

function formatGapLabel(pct: number): string {
  if (pct >= 150) {
    const ratio = pct < 195 ? (200 + pct) / (200 - pct) : Math.round(pct / 10);
    return `${ratio.toFixed(0)}x gap`;
  }
  return `${Math.round(pct)}% gap`;
}

function cleanExplanation(text: string): string {
  let cleaned = text;
  for (const [key, label] of Object.entries(METHOD_LABELS)) {
    cleaned = cleaned.replace(new RegExp(`\\b${key}\\b`, 'g'), label);
  }
  return cleaned;
}

function DisagreementCard({ d }: { d: MethodDisagreement }) {
  const label1 = METHOD_LABELS[d.method1] ?? d.method1;
  const label2 = METHOD_LABELS[d.method2] ?? d.method2;
  return (
    <div className="px-3 py-2.5 rounded" style={{
      border: '1px solid rgba(255,255,255,0.10)',
      background: 'rgba(255,255,255,0.02)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <div className="flex justify-between items-baseline gap-2 mb-1">
        <span className="text-[12.5px] font-bold" style={{ color: '#f1f5f9' }}>
          {label1} ↔ {label2}
        </span>
        <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] text-[11px] font-bold" style={{ color: '#fb923c' }}>
          {formatGapLabel(d.divergencePct)}
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
        {cleanExplanation(d.explanation)}
      </p>
    </div>
  );
}

// ── Weighted Blend Panel (right column) ─────────────────────────────

function WeightedBlendPanel({ methods, disagreements }: {
  methods: ValuationMethodResult[];
  disagreements: MethodDisagreement[];
}) {
  const enabled = methods.filter(m => m.enabled && m.weight > 0 && !m.isOverlay);
  const strategicAdj = methods.find(m => m.method === 'strategic_adjustment');

  const totalContrib = enabled.reduce((s, m) => s + (m.weight * (m.enterpriseValue?.base ?? 0)), 0);

  const segs = enabled
    .filter(m => m.enterpriseValue)
    .map(m => ({
      method: m.method,
      label: METHOD_LABELS[m.method] ?? m.method,
      color: getFamilyColor(m.method),
      contribGBP: m.weight * m.enterpriseValue!.base,
      contrib: totalContrib > 0 ? (m.weight * m.enterpriseValue!.base) / totalContrib : 0,
    }))
    .sort((a, b) => b.contrib - a.contrib);

  const evLow = enabled.reduce((s, m) => s + m.weight * (m.enterpriseValue?.low ?? 0), 0);
  const evBase = totalContrib;
  const evHigh = enabled.reduce((s, m) => s + m.weight * (m.enterpriseValue?.high ?? 0), 0);

  return (
    <div className="flex flex-col" style={{
      borderLeft: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.012)',
    }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#C4A96A' }}>
          Blended Result
        </div>
        <h3
          className="mt-1.5 text-[22px] font-medium"
          style={{ fontFamily: 'Inter, var(--font-sans), sans-serif', letterSpacing: -0.4, color: '#f1f5f9' }}
        >
          How {formatCurrency(evBase)} composes
        </h3>
      </div>

      {/* Hero EV band */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#cbd5e1' }}>
          Enterprise Value &middot; Pre-Money
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] text-lg font-semibold" style={{ color: '#94a3b8' }}>
            {formatCurrency(evLow)}
          </span>
          <span style={{ color: '#94a3b8', fontSize: 18 }}>—</span>
          <span
            className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] font-extrabold"
            style={{
              fontSize: 38, letterSpacing: -1.4, lineHeight: 1,
              color: '#D9BD7E',
              textShadow: '0 0 28px rgba(196,169,106,0.20)',
            }}
          >
            {formatCurrency(evBase)}
          </span>
          <span style={{ color: '#94a3b8', fontSize: 18 }}>—</span>
          <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] text-lg font-semibold" style={{ color: '#94a3b8' }}>
            {formatCurrency(evHigh)}
          </span>
        </div>
        <div className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] mt-2 text-xs" style={{ color: '#cbd5e1' }}>
          &Sigma; (weight &times; method.base) = {formatCurrency(evBase)}
        </div>
      </div>

      {/* Composition stacked bar */}
      {segs.length > 0 && (
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#cbd5e1' }}>
            Composition
          </div>
          <div
            role="img"
            aria-label={`Weighted blend: ${segs.map(s => `${s.label} ${Math.round(s.contrib * 100)}%`).join(', ')}`}
            className="flex h-[34px] rounded overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)' }}
          >
            {segs.map((s, i) => (
              <div
                key={s.method}
                className="grid place-items-center text-[11px] font-extrabold"
                style={{
                  width: `${s.contrib * 100}%`,
                  background: `linear-gradient(180deg, ${s.color}cc 0%, ${s.color}88 100%)`,
                  borderRight: i < segs.length - 1 ? '1px solid rgba(0,0,0,0.40)' : 'none',
                  color: '#0f172a',
                }}
              >
                {s.contrib >= 0.10 ? `${Math.round(s.contrib * 100)}%` : ''}
              </div>
            ))}
          </div>
          <ul className="mt-3 flex flex-col gap-1.5" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {segs.map(s => (
              <li
                key={s.method}
                className="grid items-center gap-3 text-[12.5px]"
                style={{ gridTemplateColumns: '10px 1fr auto auto' }}
              >
                <span aria-hidden="true" className="rounded-[2px]" style={{ width: 10, height: 10, background: s.color }} />
                <span className="font-semibold" style={{ color: '#f1f5f9' }}>{s.label}</span>
                <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] font-semibold" style={{ color: '#94a3b8' }}>
                  {formatCurrency(s.contribGBP)}
                </span>
                <span
                  className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] font-bold text-right"
                  style={{ color: '#f1f5f9', minWidth: 38 }}
                >
                  {Math.round(s.contrib * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strategic adjustment overlay */}
      {strategicAdj && strategicAdj.enabled && strategicAdj.enterpriseValue && (
        <div className="px-5 py-4" style={{
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(196,169,106,0.05)',
          boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}>
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#C4A96A' }}>
              Strategic Adjustment &middot; overlay
            </span>
            <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] text-sm font-extrabold" style={{ color: '#C4A96A' }}>
              {formatCurrency(strategicAdj.enterpriseValue.base)}
            </span>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed" style={{ color: '#cbd5e1' }}>
            {strategicAdj.summary}
          </p>
          {strategicAdj.assumptions.length > 0 && (
            <ul
              className="mt-3 flex flex-col gap-0 overflow-y-auto scrollbar-hide"
              style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 160 }}
            >
              {strategicAdj.assumptions.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 py-1.5 text-xs leading-relaxed"
                  style={{
                    color: '#cbd5e1',
                    borderBottom: i < strategicAdj.assumptions.length - 1 ? '1px solid rgba(255,255,255,0.10)' : 'none',
                  }}
                >
                  <span aria-hidden="true" className="shrink-0 mt-[5px] rounded-full" style={{ width: 4, height: 4, background: '#C4A96A' }} />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Method disagreements */}
      {disagreements.length > 0 && (
        <div className="px-5 py-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#cbd5e1' }}>
            Method Disagreements &middot; top {Math.min(disagreements.length, 3)}
          </div>
          <div className="flex flex-col gap-2.5">
            {disagreements.slice(0, 3).map((d, i) => (
              <DisagreementCard key={i} d={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Family legend chips ─────────────────────────────────────────────

const FAMILY_LEGEND: [string, string][] = [
  ['Qualitative', '#22d3ee'],
  ['Forward', '#C4A96A'],
  ['Cost', '#94a3b8'],
  ['Income', '#a78bfa'],
  ['Market', '#f472b6'],
];

// ── Props (unchanged) ───────────────────────────────────────────────

export type MethodStackPanelProps = {
  methods: ValuationMethodResult[];
  disagreements: MethodDisagreement[];
};

// ── Main Component ──────────────────────────────────────────────────

export default function MethodStackPanel({ methods, disagreements }: MethodStackPanelProps) {
  const enabled = useMemo(() => methods.filter(m => m.enabled && (m.weight > 0 || m.isOverlay)), [methods]);
  const disabled = useMemo(() => methods.filter(m => !m.enabled || (m.weight === 0 && !m.isOverlay)), [methods]);
  const [showDisabled, setShowDisabled] = useState(false);
  const totalWeight = enabled.filter(m => !m.isOverlay).reduce((s, m) => s + m.weight, 0);

  return (
    <section className="rounded-lg overflow-hidden" style={{ background: '#0f1d33', border: '1px solid rgba(255,255,255,0.12)' }}>
      {/* ── Section header ── */}
      <header
        className="flex items-center justify-between px-5 py-3.5 flex-wrap gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-baseline gap-4 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#cbd5e1' }}>&sect; 03</span>
          <h2
            className="text-2xl font-medium m-0"
            style={{ fontFamily: 'Inter, var(--font-sans), sans-serif', letterSpacing: -0.4, color: '#f1f5f9' }}
          >
            Method Stack &amp; Bridge
          </h2>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {FAMILY_LEGEND.map(([f, c]) => (
            <span key={f} className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: '#cbd5e1' }}>
              <span aria-hidden="true" className="rounded-full" style={{ width: 8, height: 8, background: c, border: '1px solid rgba(255,255,255,0.20)' }} />
              {f}
            </span>
          ))}
        </div>
      </header>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr]">
        {/* LEFT — Method Stack */}
        <div className="flex flex-col">
          {/* Enabled sub-header */}
          <div
            className="flex justify-between items-center px-4 py-2"
            style={{ background: 'rgba(0,0,0,0.18)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#cbd5e1' }}>
              Enabled &middot; {enabled.length}
            </span>
            <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] text-[11px]" style={{ color: '#cbd5e1' }}>
              &Sigma; weight = {Math.round(totalWeight * 100)}%
            </span>
          </div>

          {/* Enabled rows */}
          <div>
            {enabled.map(m => (
              <EnabledMethodRow key={m.method} m={m} />
            ))}
          </div>

          {/* Disabled — collapsible */}
          {disabled.length > 0 && (
            <>
              <button
                onClick={() => setShowDisabled(v => !v)}
                aria-expanded={showDisabled}
                aria-label={`${showDisabled ? 'Hide' : 'Show'} ${disabled.length} excluded methods`}
                className="w-full flex items-center justify-between px-4 py-2 bg-transparent cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#D9BD7E]"
                style={{
                  background: 'rgba(0,0,0,0.18)',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  borderBottom: '1px solid rgba(255,255,255,0.10)',
                  borderLeft: 'none',
                  borderRight: 'none',
                }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#cbd5e1' }}>
                  Excluded &middot; {disabled.length}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:'JetBrains Mono', var(--font-mono), monospace] text-[11px]" style={{ color: '#94a3b8' }}>
                    auditable
                  </span>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="#cbd5e1" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ transition: 'transform 150ms ease', transform: showDisabled ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </button>
              {showDisabled && (
                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: 164, scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}
                >
                  {disabled.map(m => (
                    <DisabledMethodRow key={m.method} m={m} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT — Weighted Blend */}
        <WeightedBlendPanel methods={methods} disagreements={disagreements} />
      </div>
    </section>
  );
}
