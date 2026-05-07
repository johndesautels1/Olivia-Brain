import { useState } from 'react';
import type { BuyerType, ValuationBand, AcquisitionMirrorResult } from '@/lib/valuation/types';
import type { ChallengeResponse } from '@/components/valuation/NegotiationAnchorCard';
import type { DocumentExhibit } from '@/components/valuation/WarRoomDocumentBridge';
import DealRoomSimulator, { type ChatMessage } from '@/components/valuation/DealRoomSimulator';
import AcquisitionMirror from '@/components/valuation/AcquisitionMirror';
import NegotiationAnchorCard from '@/components/valuation/NegotiationAnchorCard';
import WarRoomDocumentBridge from '@/components/valuation/WarRoomDocumentBridge';
import WarRoomTranscript from '@/components/valuation/WarRoomTranscript';
import { getScoreColor, getScoreBgColor } from './war-room-utils';
import type { RubricScore, EvidenceDoc } from './war-room-utils';

export interface WarRoomSessionProps {
  companyName: string;
  buyerType: BuyerType;
  enterpriseValue: ValuationBand;
  valuationRunId: string | null;
  acquisitionMirror: AcquisitionMirrorResult | null;
  negotiationAnchors: {
    walkAway: number;
    walkAwayRationale: string;
    target: number;
    targetRationale: string;
    anchor: number;
    anchorRationale: string;
    challengeResponses: ChallengeResponse[];
  };
  evidenceChain: EvidenceDoc[];
  rubric: RubricScore[];
  overallScore: number;
  minutes: number;
  seconds: number;
  sessionId: string | null;
  showTranscript: boolean;
  setShowTranscript: (show: boolean) => void;
  activeExhibit: DocumentExhibit | null;
  setActiveExhibit: (exhibit: DocumentExhibit | null) => void;
  onMessagesChange?: (messages: ChatMessage[]) => void;
  handleExit: () => void;
  onBackToBriefing: () => void;
}

export default function WarRoomSession({
  companyName,
  buyerType,
  enterpriseValue,
  valuationRunId,
  acquisitionMirror,
  negotiationAnchors,
  evidenceChain,
  rubric,
  overallScore,
  minutes,
  seconds,
  sessionId,
  showTranscript,
  setShowTranscript,
  activeExhibit,
  setActiveExhibit,
  onMessagesChange,
  handleExit,
  onBackToBriefing,
}: WarRoomSessionProps) {
  // Mobile-only panel overlay state (desktop always shows all 3 columns)
  const [mobilePanel, setMobilePanel] = useState<'evidence' | 'strategy' | null>(null);

  // G-07: Auto-close mobile panel when transcript opens to prevent z-index conflicts
  const handleShowTranscript = (show: boolean) => {
    if (show) setMobilePanel(null);
    setShowTranscript(show);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-onyx)]" role="dialog" aria-label="War Room — Active Session" aria-modal="true">
      {/* ── Top Bar ── */}
      <header className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border-b border-[var(--glass-elevated-border)] bg-[var(--glass-elevated-bg)]/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-coral-downside animate-pulse" aria-hidden="true" />
            <h1 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              War Room
            </h1>
          </div>
          <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-xs font-mono tabular-nums text-text-secondary shrink-0" role="timer" aria-label={`Session elapsed time: ${minutes >= 60 ? `${Math.floor(minutes / 60)} hours ` : ''}${minutes % 60} minutes ${seconds} seconds`}>
            {minutes >= 60 ? `${String(Math.floor(minutes / 60)).padStart(2, '0')}:` : ''}{String(minutes % 60).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="text-[11px] text-text-secondary truncate min-w-0">
            <span className="text-[var(--color-aurum-primary)] font-semibold">{companyName}</span> &middot; <span className="capitalize">{buyerType.replace(/_/g, ' ')}</span>
          </span>
        </div>

        {/* Center: rubric score ticker */}
        <div className="hidden lg:flex items-center gap-1">
          {rubric.map((r) => (
            <div
              key={r.dimension}
              className={`flex items-center gap-1.5 px-2 py-1 rounded ${getScoreBgColor(r.score)}`}
              role="group"
              aria-label={`${r.label}: ${r.score || 'not scored'} — ${r.description}`}
              title={`${r.label}: ${r.description}`}
            >
              <span className="text-[11px] font-semibold text-text-secondary tracking-wider">
                {r.shortLabel}
              </span>
              <span className={`text-[11px] font-bold tabular-nums font-mono ${getScoreColor(r.score)}`}>
                {r.score || '\u2014'}
              </span>
            </div>
          ))}
          <div className="ml-2 pl-2 border-l border-[var(--glass-inner-border)] flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--color-aurum-primary)]/70 tracking-wider">
              OVERALL
            </span>
            <span className={`text-sm font-bold tabular-nums font-mono ${getScoreColor(overallScore)}`}>
              {overallScore || '\u2014'}
            </span>
          </div>
        </div>

        {/* Right: transcript + exit buttons */}
        <div className="flex items-center gap-1.5">
          {sessionId && (
            <button
              onClick={() => handleShowTranscript(true)}
              className="flex items-center gap-2 p-2.5 sm:px-3 sm:py-2.5 rounded-lg text-xs font-semibold bg-white/[0.04] text-text-secondary border border-white/10 hover:bg-white/[0.08] hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span className="hidden sm:inline">Transcript</span>
            </button>
          )}
          <button
            onClick={onBackToBriefing}
            className="flex items-center gap-2 p-2.5 sm:px-3 sm:py-2.5 rounded-lg text-xs font-semibold bg-white/[0.04] text-text-secondary border border-white/10 hover:bg-white/[0.08] hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="hidden sm:inline">Briefing</span>
          </button>
          <button
            onClick={handleExit}
            className="flex items-center gap-2 p-2.5 sm:px-3 sm:py-2.5 rounded-lg text-xs font-semibold bg-white/[0.04] text-text-primary border border-white/10 hover:bg-white/[0.08] transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">Exit</span>
            <kbd className="hidden sm:inline-flex px-1 py-0.5 text-[11px] font-mono bg-white/[0.06] rounded border border-white/10">
              Esc
            </kbd>
          </button>
        </div>
      </header>

      {/* ── Mobile rubric ticker ── */}
      <div className="lg:hidden flex items-center gap-1 px-3 py-1 border-b border-[var(--glass-inner-border)] bg-[var(--glass-inner-bg)] overflow-x-auto scrollbar-none [mask-image:linear-gradient(to_right,black_90%,transparent)] shrink-0" role="region" aria-label="Rubric scores">
        {rubric.map((r) => (
          <div
            key={r.dimension}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded shrink-0 ${getScoreBgColor(r.score)}`}
          >
            <span className="text-[11px] font-semibold text-text-secondary">{r.shortLabel}</span>
            <span className={`text-[11px] font-bold tabular-nums font-mono ${getScoreColor(r.score)}`}>
              {r.score || '\u2014'}
            </span>
          </div>
        ))}
        <div className="ml-1 pl-1 border-l border-[var(--glass-inner-border)] flex items-center gap-1 shrink-0">
          <span className="text-[11px] font-semibold text-[var(--color-aurum-primary)]/70">ALL</span>
          <span className={`text-xs font-bold tabular-nums font-mono ${getScoreColor(overallScore)}`}>
            {overallScore || '\u2014'}
          </span>
        </div>
      </div>

      {/* ── Document Bridge ── */}
      <WarRoomDocumentBridge
        evidenceChain={evidenceChain}
        companyName={companyName}
        onExhibitTabled={setActiveExhibit}
        onExhibitDismissed={() => setActiveExhibit(null)}
        activeExhibit={activeExhibit}
      />

      {/* ── Mobile Panel Toggle Bar (hidden on desktop) ── */}
      <div className="lg:hidden flex items-center gap-2 px-3 py-1.5 border-b border-[var(--glass-inner-border)] bg-[var(--glass-inner-bg)] shrink-0">
        <button
          onClick={() => setMobilePanel(mobilePanel === 'evidence' ? null : 'evidence')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-semibold border transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none ${
            mobilePanel === 'evidence'
              ? 'bg-cyan-interactive/20 text-cyan-interactive border-sky-500/30'
              : 'bg-white/[0.04] text-text-secondary border-white/10'
          }`}
          aria-pressed={mobilePanel === 'evidence'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Evidence
        </button>
        <button
          onClick={() => setMobilePanel(mobilePanel === 'strategy' ? null : 'strategy')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-semibold border transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none ${
            mobilePanel === 'strategy'
              ? 'bg-[var(--color-aurum-primary)]/20 text-[var(--color-aurum-primary)] border-[var(--color-aurum-primary)]/30'
              : 'bg-white/[0.04] text-text-secondary border-white/10'
          }`}
          aria-pressed={mobilePanel === 'strategy'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Strategy
        </button>
      </div>

      {/* ── 3-Column Grid ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 overflow-y-auto lg:overflow-hidden min-h-0">
        {/* Left: Investor Challenge Simulation (Challenger / Defender) */}
        <div
          className="flex flex-col overflow-y-auto min-h-0 lg:border-r border-white/[0.06] p-3 sm:p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-coral-downside/10 text-coral-downside border border-coral-downside/20">
              Challenger
            </span>
            <span className="text-[11px] text-text-secondary">vs</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-cyan-interactive/10 text-cyan-interactive border border-cyan-interactive/20">
              Defender
            </span>
          </div>
          <DealRoomSimulator
            companyName={companyName}
            buyerType={buyerType}
            enterpriseValue={enterpriseValue}
            valuationRunId={valuationRunId}
            onMessagesChange={onMessagesChange}
          />
        </div>

        {/* Center: Exhibit Viewer OR Comparable Transaction Evidence (hidden on mobile — accessed via toggle overlay) */}
        <div className="hidden lg:flex flex-col lg:overflow-y-auto min-h-0 lg:border-r border-white/[0.06] p-3 sm:p-4">
          {activeExhibit ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-[var(--color-aurum-primary)]/20 text-[var(--color-aurum-primary)] text-[11px] font-bold">
                    {activeExhibit.exhibitNumber}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-aurum-primary)]">
                    Exhibit &mdash; {activeExhibit.title}
                  </span>
                </div>
                <button
                  onClick={() => setActiveExhibit(null)}
                  className="text-[11px] text-text-secondary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none rounded px-1 py-0.5"
                >
                  Back to Evidence
                </button>
              </div>
              <div className="glass-card p-5 flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-cyan-interactive/10 text-cyan-interactive">
                    {activeExhibit.documentType.slice(0, 4)}
                  </span>
                  <p className="text-sm font-semibold text-text-primary">{activeExhibit.title}</p>
                </div>
                {activeExhibit.pageOrSlide !== null && (
                  <p className="text-[11px] text-text-tertiary mb-3 font-mono">
                    Page/Slide {activeExhibit.pageOrSlide}
                  </p>
                )}
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] p-4 max-h-[200px] lg:max-h-[50vh] overflow-y-auto">
                  <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                    {activeExhibit.contentPreview || 'Full document content available in the Evidence Room. This exhibit has been tabled for reference during the negotiation.'}
                  </p>
                </div>
                <div className="mt-3 text-[11px] text-text-tertiary">
                  Tabled by {activeExhibit.tabledBy === 'voice' ? 'voice command' : activeExhibit.tabledBy === 'olivia' ? 'Olivia' : 'user'} at{' '}
                  {new Date(activeExhibit.tabledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Comparable Transaction Evidence
                </span>
              </div>
              {acquisitionMirror ? (
                <AcquisitionMirror
                  mirror={acquisitionMirror}
                  companyName={companyName}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-text-secondary">
                      No direct transaction mirrors identified
                    </p>
                    <p className="text-[11px] text-text-tertiary mt-1">
                      Run intelligence agents to surface adjacent comparables and buyer analogues.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Negotiation Strategy (hidden on mobile — accessed via toggle overlay) */}
        <div className="hidden lg:flex flex-col lg:overflow-y-auto min-h-0 p-3 sm:p-4">
          <div className="mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Negotiation Strategy
            </span>
          </div>
          <NegotiationAnchorCard
            companyName={companyName}
            walkAway={negotiationAnchors.walkAway}
            walkAwayRationale={negotiationAnchors.walkAwayRationale}
            target={negotiationAnchors.target}
            targetRationale={negotiationAnchors.targetRationale}
            anchor={negotiationAnchors.anchor}
            anchorRationale={negotiationAnchors.anchorRationale}
            challengeResponses={negotiationAnchors.challengeResponses}
          />
        </div>
      </div>

      {/* ── Mobile Panel Overlay (hidden on desktop) ── */}
      {mobilePanel && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 top-[25%] z-[60] flex flex-col bg-[var(--color-onyx)] rounded-t-2xl border-t border-white/[0.12] shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
          {/* G-07: drag handle affordance */}
          <div className="flex justify-center pt-2 pb-1 shrink-0" aria-hidden="true">
            <div className="w-8 h-1 rounded-full bg-white/20" />
          </div>
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.08] shrink-0">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              mobilePanel === 'evidence' ? 'text-cyan-interactive' : 'text-[var(--color-aurum-primary)]'
            }`}>
              {mobilePanel === 'evidence' ? 'Comparable Transaction Evidence' : 'Negotiation Strategy'}
            </span>
            <button
              onClick={() => setMobilePanel(null)}
              className="p-2 rounded-lg hover:bg-white/[0.08] text-text-secondary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none"
              aria-label="Close panel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4">
            {mobilePanel === 'evidence' ? (
              <>
                {activeExhibit ? (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded bg-[var(--color-aurum-primary)]/20 text-[var(--color-aurum-primary)] text-[11px] font-bold">
                          {activeExhibit.exhibitNumber}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-aurum-primary)]">
                          Exhibit &mdash; {activeExhibit.title}
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveExhibit(null)}
                        className="text-[11px] text-text-secondary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none rounded px-1 py-0.5"
                      >
                        Back to Evidence
                      </button>
                    </div>
                    <div className="glass-card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-cyan-interactive/10 text-cyan-interactive">
                          {activeExhibit.documentType.slice(0, 4)}
                        </span>
                        <p className="text-sm font-semibold text-text-primary">{activeExhibit.title}</p>
                      </div>
                      {activeExhibit.pageOrSlide !== null && (
                        <p className="text-[11px] text-text-tertiary mb-3 font-mono">
                          Page/Slide {activeExhibit.pageOrSlide}
                        </p>
                      )}
                      <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] p-4 max-h-[50vh] overflow-y-auto">
                        <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                          {activeExhibit.contentPreview || 'Full document content available in the Evidence Room. This exhibit has been tabled for reference during the negotiation.'}
                        </p>
                      </div>
                      <div className="mt-3 text-[11px] text-text-tertiary">
                        Tabled by {activeExhibit.tabledBy === 'voice' ? 'voice command' : activeExhibit.tabledBy === 'olivia' ? 'Olivia' : 'user'} at{' '}
                        {new Date(activeExhibit.tabledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {acquisitionMirror ? (
                      <AcquisitionMirror
                        mirror={acquisitionMirror}
                        companyName={companyName}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-12">
                        <div className="text-center">
                          <p className="text-xs text-text-secondary">
                            No direct transaction mirrors identified
                          </p>
                          <p className="text-[11px] text-text-tertiary mt-1">
                            Run intelligence agents to surface adjacent comparables and buyer analogues.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <NegotiationAnchorCard
                companyName={companyName}
                walkAway={negotiationAnchors.walkAway}
                walkAwayRationale={negotiationAnchors.walkAwayRationale}
                target={negotiationAnchors.target}
                targetRationale={negotiationAnchors.targetRationale}
                anchor={negotiationAnchors.anchor}
                anchorRationale={negotiationAnchors.anchorRationale}
                challengeResponses={negotiationAnchors.challengeResponses}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Transcript Overlay ── */}
      {showTranscript && sessionId && (
        <WarRoomTranscript
          sessionId={sessionId}
          companyName={companyName}
          onClose={() => setShowTranscript(false)}
        />
      )}
    </div>
  );
}
