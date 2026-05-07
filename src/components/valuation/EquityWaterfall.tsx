'use client';

import type { ValuationBand } from '@/lib/valuation/types';
import { formatCurrency } from '@/lib/valuation/dashboard-types';
import ChartCard from './ChartCard';

// ── Types ─────────────────────────────────────────────────────────────

type WaterfallRow = {
  label: string;
  value: number;
  delta: number | null; // null = header row (absolute), number = deduction/addition
  color: string;
  isTotal: boolean;
};

// ── Props ─────────────────────────────────────────────────────────────

export type EquityWaterfallProps = {
  enterpriseValue: ValuationBand | null;
  equityValue: ValuationBand | null;
  dilutedEquityValue: ValuationBand | null;
  optionPoolPct: number;
  perShareValue: ValuationBand | null;
  fullyDilutedShares: number | null;
  cashOnHand: number;
  debt: number;
};

// ── Component ─────────────────────────────────────────────────────────

export default function EquityWaterfall({
  enterpriseValue,
  equityValue,
  dilutedEquityValue,
  optionPoolPct,
  perShareValue,
  fullyDilutedShares,
  cashOnHand,
  debt,
}: EquityWaterfallProps) {
  const ev = enterpriseValue?.base ?? 0;
  const eq = equityValue?.base ?? 0;
  const diluted = dilutedEquityValue?.base ?? eq;
  const pps = perShareValue?.base ?? 0;
  const poolPct = Math.round(optionPoolPct * 100);
  const shares = fullyDilutedShares ?? 0;

  if (ev === 0) {
    return (
      <ChartCard title="Equity Waterfall" glossaryKey="equity_value">
        <p className="text-[11px] text-text-secondary">No enterprise value data available.</p>
      </ChartCard>
    );
  }

  // Build waterfall rows
  const rows: WaterfallRow[] = [];

  // 1. Enterprise Value (start)
  rows.push({
    label: 'Enterprise Value',
    value: ev,
    delta: null,
    color: 'var(--color-aurum-primary, #C4A96A)',
    isTotal: true,
  });

  // 2. Add cash (if any)
  if (cashOnHand > 0) {
    rows.push({
      label: '+ Cash on Hand',
      value: ev + cashOnHand,
      delta: cashOnHand,
      color: '#34d399',
      isTotal: false,
    });
  }

  // 3. Subtract debt (if any)
  if (debt > 0) {
    rows.push({
      label: '− Debt',
      value: eq,
      delta: -debt,
      color: '#f87171',
      isTotal: false,
    });
  }

  // 4. Equity Value (subtotal) — only show if different from EV
  if (Math.abs(eq - ev) > 1) {
    rows.push({
      label: 'Equity Value',
      value: eq,
      delta: null,
      color: '#38bdf8',
      isTotal: true,
    });
  }

  // 5. Option pool dilution (if applicable)
  if (poolPct > 0 && dilutedEquityValue !== null) {
    const poolDeduction = eq - diluted;
    rows.push({
      label: `− ESOP Dilution (${poolPct}%)`,
      value: diluted,
      delta: -poolDeduction,
      color: '#fb923c',
      isTotal: false,
    });

    // 6. Diluted Equity Value (subtotal)
    rows.push({
      label: 'Diluted Equity Value',
      value: diluted,
      delta: null,
      color: '#818cf8',
      isTotal: true,
    });
  }

  // 7. Per Share Value (if shares data available)
  if (shares > 0 && pps > 0) {
    rows.push({
      label: `÷ ${(shares / 1_000_000).toFixed(1)}M shares`,
      value: pps,
      delta: null,
      color: '#a78bfa',
      isTotal: false,
    });
  }

  // Max value for bar width scaling
  const maxVal = Math.max(...rows.map(r => Math.abs(r.value)));

  // Takeaway text
  const hasDeductions = debt > 0 || cashOnHand > 0 || poolPct > 0;
  const takeaway = hasDeductions
    ? `Enterprise value of ${formatCurrency(ev)} adjusts to ${poolPct > 0 ? `${formatCurrency(diluted)} diluted equity` : `${formatCurrency(eq)} equity`}${shares > 0 ? ` at ${formatCurrency(pps)} per share` : ''} after ${[
        debt > 0 ? `${formatCurrency(debt)} debt` : '',
        cashOnHand > 0 ? `${formatCurrency(cashOnHand)} cash` : '',
        poolPct > 0 ? `${poolPct}% ESOP` : '',
      ].filter(Boolean).join(', ')}.`
    : `Enterprise value equals equity value at ${formatCurrency(ev)} — no cash, debt, or dilution adjustments.`;

  return (
    <ChartCard
      title="Equity Waterfall"
      glossaryKey="equity_value"
      takeaway={takeaway}
      caption="Shows how enterprise value flows down to equity holders after debt, cash, and dilution adjustments."
    >
      <div className="flex flex-col gap-1.5">
        {rows.map((row, i) => {
          const barWidth = maxVal > 0 ? (Math.abs(row.value) / maxVal) * 100 : 0;
          const isDeduction = row.delta !== null && row.delta < 0;
          const isAddition = row.delta !== null && row.delta > 0;
          const isPerShare = row.label.startsWith('÷');

          return (
            <div key={i} className="flex flex-col gap-0.5">
              {/* Label row */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs ${row.isTotal ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}
                  style={row.isTotal ? { color: row.color } : undefined}
                >
                  {row.label}
                </span>
                <span className="text-xs font-mono tabular-nums font-medium text-text-primary">
                  {isPerShare ? formatCurrency(row.value) : formatCurrency(row.value)}
                  {row.delta !== null && !isPerShare && (
                    <span
                      className="ml-2 text-[11px]"
                      style={{ color: isDeduction ? '#f87171' : isAddition ? '#34d399' : undefined }}
                    >
                      ({isAddition ? '+' : ''}{formatCurrency(row.delta)})
                    </span>
                  )}
                </span>
              </div>

              {/* Bar */}
              <div className="w-full h-5 rounded-md overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div
                  className="h-full rounded-md transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(barWidth, 1)}%`,
                    background: row.isTotal
                      ? `linear-gradient(90deg, ${row.color}40, ${row.color}80)`
                      : isDeduction
                        ? 'linear-gradient(90deg, rgba(248,113,113,0.15), rgba(248,113,113,0.35))'
                        : isAddition
                          ? 'linear-gradient(90deg, rgba(52,211,153,0.15), rgba(52,211,153,0.35))'
                          : `linear-gradient(90deg, ${row.color}20, ${row.color}50)`,
                    borderLeft: `3px solid ${row.color}`,
                  }}
                />
              </div>

              {/* Separator line for totals */}
              {row.isTotal && i < rows.length - 1 && (
                <div className="h-px mt-1 mb-0.5" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
