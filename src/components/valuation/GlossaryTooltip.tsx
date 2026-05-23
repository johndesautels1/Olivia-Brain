'use client';

import { useState, useRef, useCallback, useEffect, createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { getGlossary, type FieldGlossaryEntry } from '@/lib/valuation/field-glossary';

// ── Glossary toggle context ───────────────────────────────────────

const GlossaryEnabledContext = createContext<boolean>(true);

/** Provider to control whether glossary tooltips are active */
export function GlossaryToggleProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <GlossaryEnabledContext.Provider value={enabled}>{children}</GlossaryEnabledContext.Provider>;
}

/** Hook for reading glossary enabled state */
export function useGlossaryEnabled() {
  return useContext(GlossaryEnabledContext);
}

// ── Props ────────────────────────────────────────────────────────

export interface GlossaryTooltipProps {
  /** The glossary key to look up (must match a key in field-glossary.ts) */
  fieldKey: string;
  /** The label content to wrap — tooltip trigger appears next to this */
  children: ReactNode;
}

// ── Position helpers ─────────────────────────────────────────────

const CARD_MAX_WIDTH = 360;
const CARD_HEIGHT_ESTIMATE = 320;
const OFFSET = 8;

/** Returns true for touch-primary devices (phones/tablets) */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/** Compute card width respecting viewport — narrower on small screens */
function getCardWidth(): number {
  if (typeof window === 'undefined') return CARD_MAX_WIDTH;
  return Math.min(CARD_MAX_WIDTH, window.innerWidth - 32);
}

function computeCardPosition(triggerRect: DOMRect): { top: number; left: number } {
  const cardWidth = getCardWidth();
  let top = triggerRect.bottom + OFFSET;
  let left = triggerRect.left;

  // Flip above if overflowing bottom
  if (top + CARD_HEIGHT_ESTIMATE > window.innerHeight) {
    top = triggerRect.top - CARD_HEIGHT_ESTIMATE - OFFSET;
  }
  // Clamp top to viewport
  if (top < 8) top = 8;

  // Center horizontally on mobile
  if (window.innerWidth < 480) {
    left = (window.innerWidth - cardWidth) / 2;
  } else {
    // Flip left if overflowing right
    if (left + cardWidth > window.innerWidth - 16) {
      left = window.innerWidth - cardWidth - 16;
    }
    // Clamp left to viewport
    if (left < 8) left = 8;
  }

  return { top, left };
}

// ── Floating Card Content ────────────────────────────────────────

// ── Session 20: Section label map for "sources used" cross-link ──
const SECTION_LABELS: Record<string, string> = {
  kpi: 'KPI Cards',
  method: 'Method Stack',
  sensitivity: 'Sensitivity Analysis',
  montecarlo: 'Monte Carlo Simulation',
  realoptions: 'Real Options',
  scenarios: 'Scenario Analysis',
  negotiation: 'Deal Room',
  evidence: 'Evidence Room',
  export: 'Export Studio',
};

function FloatingCard({
  entry,
  position,
  onMouseEnter,
  onMouseLeave,
  onClose,
}: {
  entry: FieldGlossaryEntry;
  position: { top: number; left: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [cardPos, setCardPos] = useState(position);
  const isDragging = useRef(false);
  const [formulaExpanded, setFormulaExpanded] = useState(false);
  const [challengeCopied, setChallengeCopied] = useState(false);

  // Sync position when it changes from parent (new hover)
  useEffect(() => {
    setCardPos(position);
  }, [position]);

  // ── Mouse drag ──
  const handleMouseDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    setDragOffset({ x: e.clientX - cardPos.left, y: e.clientY - cardPos.top });
  }, [cardPos]);

  // ── Touch drag ──
  const handleTouchDragStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    isDragging.current = true;
    setDragOffset({ x: touch.clientX - cardPos.left, y: touch.clientY - cardPos.top });
  }, [cardPos]);

  useEffect(() => {
    if (!dragOffset) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setCardPos({
        left: e.clientX - dragOffset.x,
        top: e.clientY - dragOffset.y,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const touch = e.touches[0];
      setCardPos({
        left: touch.clientX - dragOffset.x,
        top: touch.clientY - dragOffset.y,
      });
    };

    const handleEnd = () => {
      isDragging.current = false;
      setDragOffset(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [dragOffset]);

  const cardWidth = getCardWidth();

  return (
    <div
      ref={cardRef}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="glossary-tooltip-card"
      style={{
        position: 'fixed',
        zIndex: 99999,
        top: cardPos.top,
        left: cardPos.left,
        width: cardWidth,
        maxWidth: 'calc(100vw - 2rem)',
        maxHeight: 'calc(100vh - 2rem)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        borderRadius: '12px',
        background: 'rgba(15, 23, 42, 0.97)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(196,169,106,0.35)',
        boxShadow: [
          'inset 0 1px 0 rgba(196,169,106,0.12)',
          '0 25px 50px -12px rgba(0,0,0,0.6)',
          '0 0 0 1px rgba(196,169,106,0.08)',
        ].join(', '),
        animation: 'glossaryTooltipIn 200ms ease-out',
        pointerEvents: 'auto',
        userSelect: isDragging.current ? 'none' : 'auto',
      }}
    >
      {/* ── Drag handle + close button ── */}
      <div
        onMouseDown={handleMouseDragStart}
        onTouchStart={handleTouchDragStart}
        style={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px 4px 12px',
          borderBottom: '1px solid rgba(196,169,106,0.12)',
          touchAction: 'none', // prevent scroll while dragging
        }}
      >
        {/* Grip dots */}
        <div style={{ display: 'flex', gap: '3px', opacity: 0.4 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#C4A96A',
              }}
            />
          ))}
        </div>
        {/* Close button — 44px minimum touch target */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(148,163,184,0.8)',
            cursor: 'pointer',
            padding: '10px',
            margin: '-8px -8px -4px 0',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            fontSize: '18px',
          }}
          aria-label="Close tooltip"
        >
          ×
        </button>
      </div>

      {/* ── Card content (Session 20: citation card upgrade) ── */}
      <div style={{ padding: '12px 16px 16px 16px' }}>
        {/* Title */}
        <p className="text-[13px] font-semibold mb-1" style={{ color: '#C4A96A' }}>
          {entry.title}
        </p>

        {/* One-liner */}
        <p className="text-xs text-text-primary mb-3 leading-relaxed">
          {entry.oneLiner}
        </p>

        {/* Plain English */}
        <p className="text-[11px] text-text-primary leading-relaxed mb-3">
          {entry.plainEnglish}
        </p>

        {/* Session 20: "View formula" collapsible (was always-open) */}
        {entry.formula && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setFormulaExpanded(!formulaExpanded)}
              className="flex items-center gap-1.5 text-[11px] font-medium mb-1.5 transition-colors"
              style={{ color: '#C4A96A', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: formulaExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 150ms' }}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              View formula
            </button>
            {formulaExpanded && (
              <div
                className="rounded-md px-2.5 py-1.5 font-mono text-[11px] text-text-primary leading-relaxed break-words"
                style={{
                  background: 'rgba(196,169,106,0.08)',
                  border: '1px solid rgba(196,169,106,0.2)',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                }}
              >
                {entry.formula}
              </div>
            )}
          </div>
        )}

        {/* Industry context */}
        <p className="text-[11px] text-text-secondary leading-relaxed mb-2">
          <span className="font-medium text-text-primary">Industry:</span>{' '}
          {entry.industryContext}
        </p>

        {/* Accuracy badge */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide"
            style={{
              background:
                entry.accuracyLevel === 'high'
                  ? 'rgba(34,197,94,0.12)'
                  : entry.accuracyLevel === 'medium'
                    ? 'rgba(234,179,8,0.12)'
                    : 'rgba(239,68,68,0.12)',
              color:
                entry.accuracyLevel === 'high'
                  ? '#4ade80'
                  : entry.accuracyLevel === 'medium'
                    ? '#facc15'
                    : '#f87171',
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background:
                  entry.accuracyLevel === 'high'
                    ? '#4ade80'
                    : entry.accuracyLevel === 'medium'
                      ? '#facc15'
                      : '#f87171',
              }}
            />
            {entry.accuracyLevel === 'high' ? 'Investment Grade' : entry.accuracyLevel === 'medium' ? 'Preliminary' : 'Speculative'}
          </span>
          <span className="text-[11px] text-text-secondary">{entry.accuracyNote}</span>
        </div>

        {/* ── Session 20: Citation card footer ── */}
        <div
          className="rounded-lg px-3 py-2.5 flex flex-wrap items-center gap-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Sources used cross-link */}
          <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
            <span>
              Used in{' '}
              <span className="font-medium text-text-primary">
                {SECTION_LABELS[entry.section] ?? entry.section}
              </span>
            </span>
          </span>

          {/* Challenge this assumption button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const text = `Challenge: "${entry.title}" — ${entry.oneLiner}. Accuracy: ${entry.accuracyLevel}. ${entry.accuracyNote}`;
              navigator.clipboard?.writeText(text).then(() => {
                setChallengeCopied(true);
                setTimeout(() => setChallengeCopied(false), 2000);
              });
            }}
            className="flex items-center gap-1 text-[11px] font-medium rounded-md px-2 py-1 transition-colors hover:bg-white/[0.06]"
            style={{
              color: challengeCopied ? '#4ade80' : 'var(--color-coral-downside, #f87171)',
              background: challengeCopied ? 'rgba(34,197,94,0.1)' : 'none',
              border: `1px solid ${challengeCopied ? 'rgba(34,197,94,0.3)' : 'rgba(248,113,113,0.2)'}`,
              cursor: 'pointer',
              transition: 'color 200ms ease, background-color 200ms ease, border-color 200ms ease',
            }}
          >
            {challengeCopied ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            )}
            {challengeCopied ? 'Copied!' : 'Challenge'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function GlossaryTooltip({ fieldKey, children }: GlossaryTooltipProps) {
  const glossaryEnabled = useGlossaryEnabled();
  const entry = getGlossary(fieldKey);
  const [isOpen, setIsOpen] = useState(false);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOverCard = useRef(false);
  const isOverTrigger = useRef(false);

  // Keyboard: close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      isOverCard.current = false;
      isOverTrigger.current = false;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Shared close logic with delay for hover bridge
  const scheduleClose = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      if (!isOverCard.current && !isOverTrigger.current) {
        setIsOpen(false);
      }
    }, 150);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // Trigger hover handlers (desktop)
  const handleMouseEnter = useCallback(() => {
    isOverTrigger.current = true;
    cancelClose();
    hoverTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCardPosition(computeCardPosition(rect));
      }
      setIsOpen(true);
    }, 300);
  }, [cancelClose]);

  const handleMouseLeave = useCallback(() => {
    isOverTrigger.current = false;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    scheduleClose();
  }, [scheduleClose]);

  // Card hover handlers (keep open when mouse is over the floating card)
  const handleCardMouseEnter = useCallback(() => {
    isOverCard.current = true;
    cancelClose();
  }, [cancelClose]);

  const handleCardMouseLeave = useCallback(() => {
    isOverCard.current = false;
    scheduleClose();
  }, [scheduleClose]);

  // Explicit close (from close button or backdrop tap)
  const handleClose = useCallback(() => {
    setIsOpen(false);
    isOverCard.current = false;
    isOverTrigger.current = false;
    cancelClose();
  }, [cancelClose]);

  // Toggle on tap (mobile) / focus open (desktop keyboard)
  const handleButtonClick = useCallback(() => {
    if (isOpen) {
      handleClose();
      return;
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCardPosition(computeCardPosition(rect));
    }
    setIsOpen(true);
  }, [isOpen, handleClose]);

  // Focus handlers for keyboard accessibility (desktop only — on mobile, click handles it)
  const handleFocus = useCallback(() => {
    // Only auto-open on focus for non-touch (keyboard nav)
    if (isTouchDevice()) return;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCardPosition(computeCardPosition(rect));
    }
    setIsOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    if (isTouchDevice()) return;
    if (!isOverCard.current) {
      setIsOpen(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // If key not found in glossary or tooltips disabled, just render children
  if (!entry || !glossaryEnabled) return <>{children}</>;

  return (
    <div
      ref={containerRef}
      className="inline-flex items-center gap-1 relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <button
        type="button"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:ring-offset-2 focus-visible:ring-offset-onyx focus-visible:outline-none"
        style={{ color: '#C4A96A', minWidth: '24px', minHeight: '24px' }}
        onClick={handleButtonClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-label={`More info about ${entry.title}`}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? `glossary-${fieldKey}` : undefined}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="opacity-90 hover:opacity-100 transition-opacity"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <text
            x="8"
            y="11.5"
            textAnchor="middle"
            fill="currentColor"
            fontSize="9"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            i
          </text>
        </svg>
      </button>
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div id={`glossary-${fieldKey}`}>
            {/* Backdrop — tap-to-dismiss on mobile, invisible on desktop */}
            <div
              onClick={handleClose}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99998,
                background: isTouchDevice() ? 'rgba(0,0,0,0.3)' : 'transparent',
              }}
              aria-hidden="true"
            />
            <FloatingCard
              entry={entry}
              position={cardPosition}
              onMouseEnter={handleCardMouseEnter}
              onMouseLeave={handleCardMouseLeave}
              onClose={handleClose}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
