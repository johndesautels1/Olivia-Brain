'use client';

import type { BuyerType } from '@/lib/valuation/types';
import GlossaryTooltip from './GlossaryTooltip';
import { HandHeart, Rocket, ChartBar, Handshake, Buildings } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

// ── Props ────────────────────────────────────────────────────────────
// Session 3: Buyer-type control REMOVED from ScenarioDial.
// The canonical buyer-type segmented control now lives in HeaderSection (sticky command bar).
// ScenarioDial is now read-only: shows the active buyer type's icon, label, and description.

export type ScenarioDialProps = {
  selectedBuyerType: BuyerType;
};

// ── Buyer type display metadata ─────────────────────────────────────

const BUYER_META: Record<BuyerType, { label: string; description: string; Icon: Icon }> = {
  angel: { label: 'Angel', description: 'High risk premium, scorecard-heavy', Icon: HandHeart },
  vc: { label: 'Seed VC', description: 'VC method + revenue multiples', Icon: Rocket },
  private_equity: { label: 'Series A+', description: 'DCF + EBITDA focus, tighter ranges', Icon: ChartBar },
  strategic_partner: { label: 'Strategic', description: 'Synergy premium, partnership value', Icon: Handshake },
  acquirer: { label: 'Buyout', description: 'Precedent + control premium + LBO', Icon: Buildings },
};

// ── Component ───────────────────────────────────────────────────────

export default function ScenarioDial({ selectedBuyerType }: ScenarioDialProps) {
  const meta = BUYER_META[selectedBuyerType];
  const ActiveIcon = meta.Icon;

  return (
    <div className="glass-card px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-center gap-3 sm:gap-4">
      <ActiveIcon size={24} weight="bold" className="text-[var(--color-cyan-interactive)] shrink-0" />
      <div className="min-w-0 text-center">
        <h3 className="text-sm font-semibold text-text-primary">
          <GlossaryTooltip fieldKey="scenario_base">
            <span>{meta.label} Perspective</span>
          </GlossaryTooltip>
        </h3>
        <p className="text-[11px] text-text-secondary mt-0.5">{meta.description}</p>
      </div>
    </div>
  );
}
