import type { BuyerType, ValuationBand, AcquisitionMirrorResult } from '@/lib/valuation/types';
import type { ChallengeResponse } from '@/components/valuation/NegotiationAnchorCard';
import WarRoomDealProtection from '@/components/valuation/WarRoomDealProtection';
import {
  formatCurrency,
  getScoreColor,
  getDefensibilityColor,
  getDefensibilityLabel,
} from './war-room-utils';
import type { EvidenceDoc, DefensibilityResult, ConcessionStep } from './war-room-utils';

export interface WarRoomBriefingProps {
  companyName: string;
  buyerType: BuyerType;
  enterpriseValue: ValuationBand;
  statusLabel: string;
  statusColor: string;
  evidenceChain: EvidenceDoc[];
  evidenceByType: Record<string, EvidenceDoc[]>;
  walkAway: number;
  target: number;
  openingAsk: number;
  openingAskLabel: string;
  anchorInverted: boolean;
  walkAwayRationale: string;
  targetRationale: string;
  anchorRationale: string;
  challengeResponses: ChallengeResponse[];
  defensibility: DefensibilityResult;
  concessionSteps: ConcessionStep[];
  acquisitionMirror: AcquisitionMirrorResult | null;
  expandedChallenge: number | null;
  setExpandedChallenge: (i: number | null) => void;
  /** Optional — when present, the briefing mounts the Deal Protection panel (P6). */
  valuationSubjectId?: string;
  onEnterSession: () => void;
  onExit: () => void;
}

export default function WarRoomBriefing({
  companyName,
  buyerType,
  enterpriseValue,
  statusLabel,
  statusColor,
  evidenceChain,
  evidenceByType,
  walkAway,
  target,
  openingAsk,
  openingAskLabel,
  anchorInverted,
  walkAwayRationale,
  targetRationale,
  anchorRationale,
  challengeResponses,
  defensibility,
  concessionSteps,
  acquisitionMirror,
  expandedChallenge,
  setExpandedChallenge,
  valuationSubjectId,
  onEnterSession,
  onExit,
}: WarRoomBriefingProps) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-onyx)]"
      role="dialog"
      aria-label="VC War Room Briefing"
      aria-modal="true"
      onKeyDown={(e) => { if (e.key === 'Escape') onExit(); }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* ── Section 1: Command Header ── */}
        <header className="glass-elevated rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--color-aurum-primary)] uppercase tracking-widest">
                {companyName}
              </p>
              <h1 className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight">
                VC War Room
              </h1>
              <p className="text-sm text-text-secondary max-w-xl leading-relaxed">
                Pressure-test your enterprise value and refine your negotiation posture before investor conversations.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${statusColor}`}>
                  {statusLabel}
                </span>
                <span className="text-[11px] text-text-tertiary font-mono tabular-nums">
                  {evidenceChain.length} evidence source{evidenceChain.length !== 1 ? 's' : ''} loaded
                </span>
              </div>
              <button
                onClick={onEnterSession}
                className="px-6 py-3 rounded-xl text-sm font-bold text-[var(--color-onyx)] bg-[var(--color-aurum-primary)] hover:bg-[var(--color-aurum-highlight)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-aurum-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-onyx)] focus-visible:outline-none"
              >
                Enter War Room
              </button>
            </div>
          </div>
          <button
            onClick={onExit}
            className="mt-4 text-[11px] text-text-secondary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none rounded px-1 py-0.5"
          >
            &larr; Back to Deal Room
          </button>
        </header>

        {/* ── Section 2: Negotiation Positioning Bar ── */}
        <section className="glass-elevated rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-6">
            Negotiation Positioning
          </h2>
          {walkAway > 0 || target > 0 ? (
            <div className="space-y-4">
              {/* Horizontal range band */}
              <div className="relative h-3 rounded-full bg-white/[0.04] border border-white/[0.06] overflow-hidden" role="progressbar" aria-label={`Negotiation range from ${formatCurrency(walkAway)} to ${formatCurrency(openingAsk)}`} aria-valuemin={walkAway} aria-valuemax={openingAsk} aria-valuenow={target}>
                {(() => {
                  const min = Math.min(walkAway, target, openingAsk);
                  const max = Math.max(walkAway, target, openingAsk);
                  const range = max - min || 1;
                  const leftPct = ((Math.min(walkAway, target) - min) / range) * 100;
                  const widthPct = ((Math.max(target, openingAsk) - Math.min(walkAway, target)) / range) * 100;
                  return (
                    <div
                      className="absolute inset-y-0 bg-gradient-to-r from-coral-downside/20 via-[var(--color-aurum-primary)]/30 to-jade-upside/20 rounded-full"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                  );
                })()}
              </div>
              {/* Three markers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-inner rounded-xl p-4 text-center border border-coral-downside/10">
                  <p className="text-[11px] font-semibold text-coral-downside uppercase tracking-widest mb-1">
                    Walk-Away Floor
                  </p>
                  <p className="text-xl font-bold font-mono tabular-nums text-text-primary">
                    {formatCurrency(walkAway)}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-2 leading-relaxed">
                    {walkAwayRationale || 'Minimum acceptable outcome below which continued independent growth is preferable.'}
                  </p>
                </div>
                <div className="glass-inner rounded-xl p-4 text-center border border-[var(--color-aurum-primary)]/20">
                  <p className="text-[11px] font-semibold text-[var(--color-aurum-primary)] uppercase tracking-widest mb-1">
                    Target Outcome
                  </p>
                  <p className="text-xl font-bold font-mono tabular-nums text-[var(--color-aurum-primary)]">
                    {formatCurrency(target)}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-2 leading-relaxed">
                    {targetRationale || 'Most defensible fair-value negotiation objective based on model reconciliation.'}
                  </p>
                </div>
                <div className="glass-inner rounded-xl p-4 text-center border border-jade-upside/10">
                  <p className="text-[11px] font-semibold text-jade-upside uppercase tracking-widest mb-1">
                    {openingAskLabel}
                  </p>
                  <p className="text-xl font-bold font-mono tabular-nums text-text-primary">
                    {formatCurrency(openingAsk)}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-2 leading-relaxed">
                    {anchorRationale || (anchorInverted
                      ? 'Derived ceiling from model reconciliation. Anchor data was below target — review assumptions before using as an opening position.'
                      : 'Strategic initial position designed to preserve concession room while signaling confidence.')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-text-secondary">Negotiation positions not yet generated</p>
              <p className="text-[11px] text-text-tertiary mt-1">Run intelligence agents to compute walk-away, target, and opening positions.</p>
            </div>
          )}
        </section>

        {/* ── Sections 3 + 4: Defensibility Score + Cristiano Panel ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-6">

          {/* Section 3: Defensibility Score Panel */}
          <section className="glass-elevated rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-6">
              Valuation Defensibility
            </h2>
            <div className="text-center mb-6">
              <p className={`text-5xl font-bold font-mono tabular-nums ${getDefensibilityColor(defensibility.overall)}`}>
                {defensibility.overall}
              </p>
              <p className={`text-sm font-semibold mt-1 ${getDefensibilityColor(defensibility.overall)}`}>
                {getDefensibilityLabel(defensibility.overall)}
              </p>
              <p className="text-[11px] text-text-tertiary mt-2">
                Institutional-style confidence assessment across evidence, assumptions, comparables, and stage fit.
              </p>
            </div>
            <div className="space-y-3">
              {defensibility.subMetrics.map((metric) => (
                <div key={metric.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-text-tertiary font-medium">{metric.label}</span>
                    <span className={`text-[11px] font-bold font-mono tabular-nums ${getScoreColor(metric.value)}`}>
                      {metric.value > 0 ? metric.value : '\u2014'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden" role="progressbar" aria-label={metric.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={metric.value}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        metric.value >= 80 ? 'bg-jade-upside' :
                        metric.value >= 60 ? 'bg-cyan-interactive' :
                        metric.value >= 40 ? 'bg-status-warning' :
                        metric.value > 0 ? 'bg-coral-downside' : 'bg-white/[0.06]'
                      }`}
                      style={{ width: `${metric.value}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Cristiano Panel */}
          <section className="glass-elevated rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-6">
              Your Lead Challenger
            </h2>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-coral-downside/15 border border-coral-downside/20 flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-coral-downside" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Cristiano</h3>
                <p className="text-sm text-coral-downside font-medium">VC-side valuation challenger</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              {['Analytical', 'Adversarial', 'Stage-aware', 'Negotiation-driven'].map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.04] text-text-secondary border border-white/[0.06]">
                  {tag}
                </span>
              ))}
            </div>
            <div className="glass-inner rounded-xl p-4 mb-6">
              <p className="text-sm text-text-primary leading-relaxed">
                Cristiano simulates the questions a skeptical investor is most likely to raise, then helps you refine stronger responses before a live negotiation.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
                Challenge Scope
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'Revenue assumptions',
                  'Comparable fit',
                  'Scalability claims',
                  'Downside risk',
                  'Exit pathway',
                  'Margin sustainability',
                ].map(scope => (
                  <div key={scope} className="flex items-center gap-2 text-[11px] text-text-secondary">
                    <div className="w-1 h-1 rounded-full bg-coral-downside shrink-0" aria-hidden="true" />
                    {scope}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-text-tertiary mt-6">
              Buyer type: <span className="capitalize font-medium text-text-secondary">{buyerType.replace(/_/g, ' ')}</span>
            </p>
          </section>
        </div>

        {/* ── Sections 5 + 6: Key Objections + Evidence Room ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[60%_1fr] gap-6">

          {/* Section 5: Key Objections & Recommended Responses */}
          <section className="glass-elevated rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-6">
              Key Objections &amp; Recommended Responses
            </h2>
            {challengeResponses.length > 0 ? (
              <div className="space-y-3">
                {challengeResponses.map((cr, i) => (
                  <div
                    key={i}
                    className="glass-inner rounded-xl border border-white/[0.04] overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedChallenge(expandedChallenge === i ? null : i)}
                      className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none"
                      aria-expanded={expandedChallenge === i}
                      aria-controls={`challenge-panel-${i}`}
                    >
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-coral-downside/15 text-coral-downside text-[11px] font-bold shrink-0 mt-0.5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary leading-snug">
                          &ldquo;{cr.challenge}&rdquo;
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[11px] text-text-tertiary capitalize">
                            {buyerType.replace(/_/g, ' ')} investor
                          </span>
                        </div>
                      </div>
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`text-text-tertiary shrink-0 mt-1 transition-transform duration-200 ${expandedChallenge === i ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {expandedChallenge === i && (
                      <div id={`challenge-panel-${i}`} role="region" aria-label={`Response to: ${cr.challenge}`} className="px-4 pb-4 pt-0 ml-9 border-t border-white/[0.04]">
                        <p className="text-[11px] font-semibold text-cyan-interactive uppercase tracking-widest mt-3 mb-2">
                          Recommended Response
                        </p>
                        <p className="text-sm text-text-primary leading-relaxed">
                          {cr.response}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-text-secondary">No objections generated yet</p>
                <p className="text-[11px] text-text-tertiary mt-1">Run intelligence agents to surface likely investor challenges and prepare rebuttals.</p>
              </div>
            )}
          </section>

          {/* Section 6: Evidence Room */}
          <section className="glass-elevated rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-6">
              Evidence Room
            </h2>
            {evidenceChain.length > 0 ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {Object.entries(evidenceByType).map(([type, docs]) => (
                  <div key={type}>
                    <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-interactive" aria-hidden="true" />
                      {type}
                      <span className="text-text-tertiary font-normal">({docs.length})</span>
                    </h3>
                    <div className="space-y-1.5">
                      {docs.slice(0, 3).map((doc) => (
                        <div key={doc.chunkId} className="glass-inner rounded-lg p-3">
                          <p className="text-[11px] font-medium text-text-primary truncate" title={doc.documentTitle}>{doc.documentTitle}</p>
                          {doc.pageOrSlide !== null && (
                            <p className="text-[11px] text-text-tertiary font-mono mt-0.5">Page {doc.pageOrSlide}</p>
                          )}
                        </div>
                      ))}
                      {docs.length > 3 && (
                        <p className="text-[11px] text-text-tertiary ml-3">+ {docs.length - 3} more</p>
                      )}
                    </div>
                  </div>
                ))}
                <div className="border-t border-white/[0.06] pt-4 mt-4 space-y-2">
                  {['Comparable Transactions', 'Strategic Buyer Signals', 'Method Inputs', 'Risk Flags'].map(sub => {
                    const hasData = sub === 'Method Inputs' || (sub === 'Comparable Transactions' && !!acquisitionMirror);
                    return (
                      <div key={sub} className="flex items-center justify-between py-1.5">
                        <span className="text-[11px] text-text-secondary">{sub}</span>
                        <span className={`text-[11px] font-medium ${hasData ? 'text-jade-upside' : 'text-text-tertiary'}`}>
                          {hasData ? 'Available' : 'Awaiting data'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 sm:py-12">
                <p className="text-sm text-text-secondary">No evidence pack loaded yet</p>
                <p className="text-[11px] text-text-tertiary mt-1">Run intelligence agents to surface adjacent comparables and buyer analogues.</p>
              </div>
            )}
          </section>
        </div>

        {/* ── Sections 7 + 8: Negotiation Strategy + Comparable Transaction Evidence ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Section 7: Negotiation Strategy */}
          <section className="glass-elevated rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-6">
              Negotiation Strategy
            </h2>
            {concessionSteps.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-left min-w-[420px]">
                  <caption className="sr-only">Negotiation concession stages with position values and notes</caption>
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider pb-3 pr-4">Stage</th>
                      <th className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider pb-3 pr-4 text-right">Position</th>
                      <th className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider pb-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {concessionSteps.map((step) => {
                      const isTarget = step.stage === 'Target Outcome';
                      const isWalkAway = step.stage === 'Walk-Away Floor';
                      return (
                        <tr
                          key={step.stage}
                          className={`border-b border-white/[0.03] ${isTarget ? 'bg-[var(--color-aurum-primary)]/[0.04]' : ''}`}
                        >
                          <td className="py-3 pr-4">
                            <span className={`text-sm font-medium ${isTarget ? 'text-[var(--color-aurum-primary)]' : isWalkAway ? 'text-coral-downside' : 'text-text-primary'}`}>
                              {step.stage}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span className={`text-sm font-bold font-mono tabular-nums ${isTarget ? 'text-[var(--color-aurum-primary)]' : 'text-text-primary'}`}>
                              {formatCurrency(step.value)}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="text-[11px] text-text-tertiary">{step.note}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-text-secondary">Strategy positions not yet generated</p>
                <p className="text-[11px] text-text-tertiary mt-1">Run a valuation to compute negotiation anchors and concession structure.</p>
              </div>
            )}
          </section>

          {/* Section 8: Comparable Transaction Evidence */}
          <section className="glass-elevated rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-6">
              Comparable Transaction Evidence
            </h2>
            {acquisitionMirror ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="glass-inner rounded-xl p-4">
                    <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">Seller View</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-jade-upside">
                      {formatCurrency(acquisitionMirror.sellerValuation?.base || 0)}
                    </p>
                  </div>
                  <div className="glass-inner rounded-xl p-4">
                    <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">Buyer View</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-coral-downside">
                      {formatCurrency(acquisitionMirror.buyerValuation?.base || 0)}
                    </p>
                  </div>
                </div>
                {acquisitionMirror.negotiationZone && (
                  <div className="glass-inner rounded-xl p-4">
                    <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">Negotiation Zone</p>
                    <p className="text-sm font-mono tabular-nums text-text-primary">
                      {formatCurrency(acquisitionMirror.negotiationZone.low)} &mdash; {formatCurrency(acquisitionMirror.negotiationZone.high)}
                    </p>
                  </div>
                )}
                {acquisitionMirror.gapExplanation && (
                  <div className="glass-inner rounded-xl p-4">
                    <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Gap Analysis</p>
                    <p className="text-[11px] text-text-secondary leading-relaxed">{acquisitionMirror.gapExplanation}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-text-secondary">No direct transaction mirrors identified</p>
                <p className="text-[11px] text-text-tertiary mt-1">Run intelligence agents to surface adjacent transactions, strategic buyer patterns, and comparable operating profiles.</p>
              </div>
            )}
          </section>
        </div>

        {/* ── Section 9 (P6): Deal Protection panel ── */}
        {valuationSubjectId ? (
          <WarRoomDealProtection
            valuationSubjectId={valuationSubjectId}
            companyName={companyName}
          />
        ) : null}

        {/* ── Section 10: Footer ── */}
        <footer className="glass-elevated rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-4">
            Method Weighting, Assumptions &amp; Known Gaps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-[11px] font-semibold text-text-secondary mb-2">Method Weighting</h3>
              <p className="text-[11px] text-text-tertiary leading-relaxed">
                {enterpriseValue
                  ? `Reconciled range: ${formatCurrency(enterpriseValue.low)} – ${formatCurrency(enterpriseValue.high)}`
                  : 'Method weighting details available after running the valuation engine.'}
              </p>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold text-text-secondary mb-2">Key Assumptions</h3>
              <p className="text-[11px] text-text-tertiary leading-relaxed">
                Buyer type: <span className="capitalize text-text-secondary">{buyerType.replace(/_/g, ' ')}</span>.
                {' '}Enterprise value range informed by reconciled model output.
              </p>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold text-text-secondary mb-2">Known Gaps</h3>
              <p className="text-[11px] text-text-tertiary leading-relaxed">
                {evidenceChain.length === 0
                  ? 'No evidence documents loaded. Upload source documents to strengthen defensibility.'
                  : !acquisitionMirror
                    ? 'Comparable transaction data not yet available. Run acquisition mirror analysis.'
                    : 'No critical gaps identified. Evidence pack is sufficient for challenge simulation.'}
              </p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
