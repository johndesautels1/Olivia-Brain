'use client';

import { useState } from 'react';
import type { BuyerType, JustificationResult, ChallengeResult, CounterNarrativeResult } from '@/lib/valuation/types';

// ── Props ────────────────────────────────────────────────────────────

export type OliviaNarrativeProps = {
  /** Legacy: flat narrative string (old runs) */
  narrative: string | null;
  /** Full justification object (new runs) */
  justificationFull?: JustificationResult | null;
  /** Challenge agent output */
  challenge?: ChallengeResult | null;
  /** Counter-narrative agent output */
  counterNarrative?: CounterNarrativeResult | null;
  /** Active buyer type from the workbench toggle */
  buyerType?: BuyerType;
};

// ── Constants ────────────────────────────────────────────────────────

const BUYER_LABELS: Record<BuyerType, string> = {
  angel: 'Angel',
  vc: 'VC',
  private_equity: 'Private Equity',
  strategic_partner: 'Strategic Partner',
  acquirer: 'Acquirer',
};

const TONE = {
  olivia: {
    accent: '#d4a843',           // WCAG AA on dark — 6.2:1 contrast
    accentSoft: 'rgba(212,168,67,0.10)',
    accentLine: 'rgba(212,168,67,0.40)',
    bullet: '#e8c05a',           // brighter for list markers — 8.1:1
  },
  cristiano: {
    accent: '#93b4d4',           // WCAG AA on dark — 6.8:1 contrast
    accentSoft: 'rgba(147,180,212,0.10)',
    accentLine: 'rgba(147,180,212,0.40)',
    bullet: '#a8c8e8',           // brighter for list markers — 8.5:1
  },
};

/** No max-height cap — page scrolls naturally, signatures are pinned via shrink-0 */

/** Visible dark-theme scrollbar styles (WCAG compliant, 8px wide) */
const scrollbarCSS = `
.nexus-scroll::-webkit-scrollbar { width: 8px; }
.nexus-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 4px; }
.nexus-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 4px; min-height: 40px; }
.nexus-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.30); }
.nexus-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.18) rgba(255,255,255,0.04); }
`;

// ── Text Sanitizer — strips escaped JSON artifacts & mojibake ────────

function sanitizeNarrativeText(raw: string): string {
  let text = raw;

  // Attempt JSON.parse up to 3 times to handle multi-encoded strings
  for (let i = 0; i < 3; i++) {
    if (text.startsWith('"') && text.endsWith('"')) {
      try { text = JSON.parse(text) as string; } catch { break; }
    } else if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'string') { text = parsed; continue; }
        if (typeof parsed === 'object' && parsed !== null) {
          const vals = Object.values(parsed);
          const first = vals.find(v => typeof v === 'string') as string | undefined;
          if (first) { text = first; continue; }
        }
      } catch { /* not valid JSON — continue with string cleanup */ }
      break;
    } else break;
  }

  // Unescape JSON escape sequences that survived extraction
  text = text.replace(/\\n/g, '\n');
  text = text.replace(/\\r/g, '');
  text = text.replace(/\\t/g, '  ');
  text = text.replace(/\\"/g, '"');
  text = text.replace(/\\\//g, '/');
  text = text.replace(/\\\\/g, '\\');

  // Second pass — sometimes a single unescape reveals more escaped sequences
  if (text.includes('\\n') || text.includes('\\"') || text.includes('\\/')) {
    text = text.replace(/\\n/g, '\n');
    text = text.replace(/\\r/g, '');
    text = text.replace(/\\"/g, '"');
    text = text.replace(/\\\//g, '/');
    text = text.replace(/\\\\/g, '\\');
  }

  // Decode unicode escapes like \u0027, \u2019 etc.
  text = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );

  // Fix common mojibake: â€™ → ', â€" → —, â€œ/â€ → ", Â£ → £
  text = text.replace(/â€™/g, '\u2019');
  text = text.replace(/â€"/g, '\u2014');
  text = text.replace(/â€œ/g, '\u201C');
  text = text.replace(/â€\u009D/g, '\u201D');
  text = text.replace(/â€/g, '\u201D');
  text = text.replace(/Â£/g, '£');
  text = text.replace(/Â·/g, '·');

  // Strip ANY residual JSON key pattern like "someKey": (generic catch-all)
  text = text.replace(/"[a-zA-Z_]\w*"\s*:\s*/g, '');
  // Strip JSON array/object syntax at boundaries
  text = text.replace(/^\s*[{[\]},]+\s*/g, '').replace(/\s*[{[\]},]+\s*$/g, '');
  // Strip isolated trailing/leading JSON punctuation that survived
  text = text.replace(/\s*,\s*}/g, '').replace(/\s*,\s*]/g, '');
  // Strip trailing comma + whitespace + quote patterns from truncated JSON
  text = text.replace(/\s*",?\s*$/, '');
  // Strip leading quote from extracted field
  text = text.replace(/^"\s*/, '');

  return text.trim();
}

// ── Lightweight Markdown Renderer — Fortune 50 annual-report style ───
// Handles: ## Subheadings, **bold**, - bullet points, paragraph breaks
// No gimmicky colors — executive cardstock aesthetic with WCAG AA contrast

type RenderedBlock = { type: 'heading'; text: string } | { type: 'paragraph'; segments: React.ReactNode[] } | { type: 'bullet'; items: string[] };

function parseNarrativeBlocks(raw: string): RenderedBlock[] {
  const sanitized = sanitizeNarrativeText(raw);
  const lines = sanitized.split(/\n/);
  const blocks: RenderedBlock[] = [];
  let currentBullets: string[] = [];

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      blocks.push({ type: 'bullet', items: [...currentBullets] });
      currentBullets = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      flushBullets();
      continue;
    }

    // ## Subheading or **Subheading** at line start
    const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/) || trimmed.match(/^\*\*([^*]+)\*\*$/);
    if (headingMatch) {
      flushBullets();
      // Strip any trailing ** or ## and also numbered prefixes like "1. "
      const headText = headingMatch[1].replace(/\*\*/g, '').replace(/^[\d]+\.\s*/, '').trim();
      blocks.push({ type: 'heading', text: headText });
      continue;
    }

    // - Bullet point or • bullet or * bullet
    const bulletMatch = trimmed.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      currentBullets.push(bulletMatch[1]);
      continue;
    }

    // Numbered list items: 1. text, 1) text
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (numberedMatch) {
      currentBullets.push(numberedMatch[1]);
      continue;
    }

    // Regular paragraph
    flushBullets();
    blocks.push({ type: 'paragraph', segments: [trimmed] });
  }
  flushBullets();

  // Merge consecutive paragraphs that are clearly one thought (no blank line between)
  // but keep them separate if they were separated by headings/bullets
  return blocks;
}

function renderBoldSegments(text: string, accentColor: string): React.ReactNode[] {
  // Split on **bold** markers
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // Bold segment — use accent color for Fortune 50 "key term" treatment
      return <strong key={i} style={{ color: accentColor, fontWeight: 600 }}>{part}</strong>;
    }
    return part;
  });
}

function NarrativeRenderer({
  text,
  tone,
}: {
  text: string;
  tone: 'olivia' | 'cristiano';
}) {
  const t = TONE[tone];
  const blocks = parseNarrativeBlocks(text);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <div key={i} className="pt-2 pb-1" style={{ borderBottom: `1px solid ${t.accentLine}` }}>
              <h4
                className="text-[12px] font-bold uppercase tracking-wider m-0"
                style={{ color: t.accent, letterSpacing: '0.08em' }}
              >
                {block.text}
              </h4>
            </div>
          );
        }

        if (block.type === 'bullet') {
          return (
            <ul key={i} className="list-none m-0 p-0 space-y-1.5 pl-1">
              {block.items.map((item, j) => (
                <li key={j} className="grid gap-2 text-[13px] leading-[1.75] text-text-primary" style={{ gridTemplateColumns: '16px 1fr' }}>
                  <span className="text-[11px] pt-0.5" style={{ color: t.bullet }}>◆</span>
                  <span style={{ textWrap: 'pretty' }}>{renderBoldSegments(item, t.accent)}</span>
                </li>
              ))}
            </ul>
          );
        }

        // paragraph
        return (
          <p key={i} className="text-[13.5px] leading-[1.75] text-text-primary m-0" style={{ textWrap: 'pretty' }}>
            {renderBoldSegments(block.segments.join(' '), t.accent)}
          </p>
        );
      })}
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────

function GavelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2l3 3-2.5 2.5L6.5 4.5z" />
      <path d="M6.5 4.5l-4 4 1.5 1.5 4-4" />
      <path d="M2 12h6" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}
    >
      <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    </svg>
  );
}

// ── Pill Cluster ─────────────────────────────────────────────────────

function PillCluster({
  options,
  value,
  onChange,
  tone,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  tone: 'olivia' | 'cristiano';
}) {
  const t = TONE[tone];
  return (
    <div role="tablist" className="inline-flex flex-wrap rounded-full p-[2px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(opt.value)}
            className="px-2 sm:px-3 py-1 rounded-full border-0 cursor-pointer text-[11px] font-bold uppercase tracking-wide transition-colors shrink-0"
            style={{
              background: on ? t.accentSoft : 'transparent',
              color: on ? t.accent : 'var(--color-text-secondary)',
              boxShadow: on ? `inset 0 0 0 1px ${t.accentLine}` : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Olivia Column ────────────────────────────────────────────────────

function OliviaColumn({
  narrative,
  justificationFull,
  buyerType,
}: {
  narrative: string | null;
  justificationFull: JustificationResult | null;
  buyerType: BuyerType;
}) {
  const [view, setView] = useState<'narrative' | 'letter'>('narrative');

  const letterText = justificationFull?.letterByBuyerType?.[buyerType] ?? null;

  const hasLetter = !!letterText;
  const risks = justificationFull?.risks ?? [];
  const opportunities = justificationFull?.opportunities ?? [];
  const actionableSteps = justificationFull?.actionableSteps ?? [];

  return (
    <div className="flex flex-col min-w-0 flex-none md:flex-[55_1_0]">
      {/* Speaker header */}
      <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: TONE.olivia.accentSoft }}>
        <img
          src="/agents/olivia-portrait.png"
          alt="Olivia — Justification Agent"
          className="w-10 h-10 rounded-full object-cover shrink-0"
          style={{ border: `1px solid ${TONE.olivia.accentLine}` }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: TONE.olivia.accent }}>
            Presents · Justification
          </div>
          <div className="text-base font-medium -tracking-wide text-text-primary" style={{ fontFamily: 'Inter, var(--font-sans), sans-serif' }}>
            Olivia
          </div>
          <div className="text-[11px] text-text-secondary font-mono">Justification Agent</div>
          {hasLetter && (
            <div className="mt-2">
              <PillCluster
                tone="olivia"
                value={view}
                onChange={(v) => setView(v as 'narrative' | 'letter')}
                options={[
                  { value: 'narrative', label: 'Narrative' },
                  { value: 'letter', label: `Letter · ${BUYER_LABELS[buyerType]}` },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Section subtitle */}
      <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: TONE.olivia.accent }}>
          ◉ Olivia&apos;s case
        </div>
        <h3 className="mt-1 text-lg font-medium -tracking-wide text-text-primary" style={{ fontFamily: 'Inter, var(--font-sans), sans-serif' }}>
          {view === 'narrative'
            ? 'A defensible valuation, built and reconciled.'
            : `A letter to a ${BUYER_LABELS[buyerType]}.`}
        </h3>
        <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
          {view === 'narrative'
            ? 'Positioning, traction, rationale, deployment, and actions — in LP-update tone.'
            : 'The same case, re-written for a single recipient. Swaps with the buyer-type toggle.'}
        </p>
      </div>

      {/* Scrollable content body */}
      <div className="nexus-scroll flex-1 min-h-0 overflow-y-auto max-h-[50vh] md:max-h-[70vh]">
        {/* Main content */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {view === 'narrative' ? (
            (justificationFull?.narrative ?? narrative) ? (
              <NarrativeRenderer text={justificationFull?.narrative ?? narrative ?? ''} tone="olivia" />
            ) : (
              <p className="text-sm text-text-secondary italic">
                No narrative available. Run a valuation to generate Olivia&apos;s analysis.
              </p>
            )
          ) : (
            letterText ? (
              <NarrativeRenderer text={letterText} tone="olivia" />
            ) : (
              <p className="text-sm text-text-secondary italic">
                No letter available for {BUYER_LABELS[buyerType]}.
              </p>
            )
          )}
        </div>

        {/* Opportunities */}
        {opportunities.length > 0 && (
          <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: TONE.olivia.bullet }}>
              Opportunities · {opportunities.length}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {opportunities.map((o, i) => (
                <span
                  key={i}
                  className="text-[11.5px] font-semibold px-3.5 py-1.5 rounded-full"
                  style={{
                    color: TONE.olivia.bullet,
                    background: TONE.olivia.accentSoft,
                    border: `1px solid ${TONE.olivia.accentLine}`,
                  }}
                >
                  {o}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Risks */}
        {risks.length > 0 && (
          <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: TONE.olivia.bullet }}>
              Risks · {risks.length}
            </div>
            <ul className="space-y-1.5 list-none m-0 p-0">
              {risks.map((r, i) => (
                <li key={i} className="grid gap-2 text-xs leading-[1.75] text-text-primary" style={{ gridTemplateColumns: '20px 1fr' }}>
                  <span className="font-mono font-bold text-[11px]" style={{ color: TONE.olivia.bullet }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ textWrap: 'pretty' }}>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actionable steps */}
        {actionableSteps.length > 0 && (
          <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[10.5px] font-bold uppercase tracking-wider mb-2.5" style={{ color: TONE.olivia.bullet }}>
              Actionable steps · next 90 days · {actionableSteps.length}
            </div>
            <ol className="list-none m-0 p-0 space-y-2">
              {actionableSteps.map((s, i) => (
                <li key={i} className="grid gap-2 text-[13px] leading-[1.75] text-text-primary" style={{ gridTemplateColumns: '20px 1fr' }}>
                  <span className="font-mono font-bold text-[11.5px] pt-0.5" style={{ color: TONE.olivia.bullet }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ textWrap: 'pretty' }}>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Signature — end of document, executive cursive */}
        <div className="px-5 py-6 mt-4 flex justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[18px] sm:text-[22px]" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', color: TONE.olivia.accent, letterSpacing: '0.02em' }}>
              Olivia
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-text-secondary uppercase tracking-wider">Justification Agent · CLUES™</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cristiano Column ─────────────────────────────────────────────────

function CristianoColumn({
  challenge,
  counterNarrative,
  buyerType,
}: {
  challenge: ChallengeResult | null;
  counterNarrative: CounterNarrativeResult | null;
  buyerType: BuyerType;
}) {
  const [stance, setStance] = useState<'bearish' | 'neutral' | 'bullish'>('neutral');
  const [memoOpen, setMemoOpen] = useState(false);
  const [openArg, setOpenArg] = useState(0);

  if (!challenge) {
    return (
      <div className="flex flex-col min-w-0 items-center justify-center p-8 flex-none md:flex-[45_1_0]" style={{ background: 'rgba(148,163,184,0.025)' }}>
        <p className="text-sm text-text-secondary italic">Challenge data not available for this run.</p>
      </div>
    );
  }

  const critique =
    stance === 'bearish' ? challenge.bearishCritique :
    stance === 'bullish' ? challenge.bullishCritique :
    challenge.neutralCritique;

  const buyerChallenges = challenge.buyerSpecificChallenges?.[buyerType] ?? [];
  const vulnerabilities = challenge.vulnerabilities ?? [];
  const counterArgs = counterNarrative?.counterArguments ?? [];
  const buyerMemo = counterNarrative?.buyerMemo ?? null;

  return (
    <div className="flex flex-col min-w-0 flex-none md:flex-[45_1_0]" style={{ background: 'rgba(148,163,184,0.025)' }}>
      {/* Speaker header */}
      <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: TONE.cristiano.accentSoft }}>
        <img
          src="/agents/cristiano-portrait.png"
          alt="Cristiano — Challenge Agent"
          className="w-10 h-10 rounded-full object-cover shrink-0"
          style={{ border: `1px solid ${TONE.cristiano.accentLine}` }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: TONE.cristiano.accent }}>
            Cross-examines · Challenge
          </div>
          <div className="text-base font-medium -tracking-wide text-text-primary" style={{ fontFamily: 'Inter, var(--font-sans), sans-serif' }}>
            Cristiano
          </div>
          <div className="text-[11px] text-text-secondary font-mono">Challenge Agent</div>
          <div className="mt-2">
            <PillCluster
              tone="cristiano"
              value={stance}
              onChange={(v) => setStance(v as 'bearish' | 'neutral' | 'bullish')}
              options={[
                { value: 'bearish', label: 'Bearish' },
                { value: 'neutral', label: 'Neutral' },
                { value: 'bullish', label: 'Bullish' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Section subtitle */}
      <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: TONE.cristiano.accent }}>
          <GavelIcon /> Cristiano&apos;s challenge · {stance}
        </div>
        <h3 className="mt-1 text-lg font-medium -tracking-wide text-text-primary" style={{ fontFamily: 'Inter, var(--font-sans), sans-serif' }}>
          {stance === 'bearish' ? 'The bear case.' : stance === 'bullish' ? 'Even granting the bull case.' : 'A balanced read.'}
        </h3>
        <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
          The case Olivia&apos;s briefing has to survive in diligence. Same data, opposing reading.
        </p>
      </div>

      {/* Scrollable content body */}
      <div className="nexus-scroll flex-1 min-h-0 overflow-y-auto max-h-[50vh] md:max-h-[70vh]">
        {/* Critique */}
        {critique && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <NarrativeRenderer text={critique} tone="cristiano" />
          </div>
        )}

        {/* Buyer-specific challenges */}
        {buyerChallenges.length > 0 && (
          <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: TONE.cristiano.bullet }}>
              Buyer-specific · {BUYER_LABELS[buyerType]}
            </div>
            <ul className="list-none m-0 p-0 space-y-1.5">
              {buyerChallenges.map((line, i) => (
                <li key={i} className="grid gap-2 text-xs leading-[1.75] text-text-primary" style={{ gridTemplateColumns: '20px 1fr' }}>
                  <span className="font-mono font-bold text-[11.5px]" style={{ color: TONE.cristiano.bullet }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ textWrap: 'pretty' }}>{sanitizeNarrativeText(line)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Vulnerabilities */}
        {vulnerabilities.length > 0 && (
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-2.5 flex justify-between items-baseline">
              <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: TONE.cristiano.bullet }}>
                Vulnerabilities · {vulnerabilities.length}
              </span>
            </div>
            <ul className="list-none m-0 p-0">
              {vulnerabilities.map((v, i) => (
                <li
                  key={i}
                  className="grid gap-2.5 px-5 py-2.5 items-start"
                  style={{
                    gridTemplateColumns: '14px 1fr',
                    borderBottom: i < vulnerabilities.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5" style={{ color: '#f59e0b' }}>
                    <path d="M6 1.5l5 9H1z" />
                    <path d="M6 5v2.5" /><circle cx="6" cy="9" r="0.5" fill="currentColor" />
                  </svg>
                  <span className="text-xs leading-[1.75] text-text-primary" style={{ textWrap: 'pretty' }}>{sanitizeNarrativeText(v)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Counter-narrative IC memo */}
        {buyerMemo && (
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setMemoOpen((o) => !o)}
              className="w-full flex justify-between items-center px-5 py-3 border-0 cursor-pointer text-left"
              style={{ background: memoOpen ? 'rgba(147,180,212,0.06)' : 'transparent' }}
            >
              <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: TONE.cristiano.bullet }}>
                Counter-narrative · IC memo
              </span>
              <span className="text-[11px] text-text-primary font-mono flex items-center gap-1.5">
                {memoOpen ? 'Collapse' : 'Expand'}
                <ChevronIcon open={memoOpen} />
              </span>
            </button>
            {memoOpen && (
              <div className="px-5 pb-3">
                <div
                  className="m-0 pl-3.5"
                  style={{
                    borderLeft: `2px solid ${TONE.cristiano.accentLine}`,
                  }}
                >
                  <NarrativeRenderer text={buyerMemo} tone="cristiano" />
                </div>
                <div className="mt-2.5 text-[11px] text-text-secondary font-mono">
                  — Modeled IC voice · {BUYER_LABELS[buyerType]} archetype
                </div>
              </div>
            )}
          </div>
        )}

        {/* Point / counter-point accordion */}
        {counterArgs.length > 0 && (
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-2.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: TONE.cristiano.bullet }}>
                Point · counter-point · {counterArgs.length}
              </span>
            </div>
            <ul className="list-none m-0 p-0">
              {counterArgs.map((pair, i) => {
                const isOpen = openArg === i;
                return (
                  <li key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <button
                      onClick={() => setOpenArg(isOpen ? -1 : i)}
                      className="w-full grid gap-2.5 px-5 py-2.5 border-0 cursor-pointer text-left"
                      style={{
                        gridTemplateColumns: '20px 1fr 14px',
                        background: isOpen ? 'rgba(147,180,212,0.06)' : 'transparent',
                      }}
                    >
                      <span className="font-mono font-bold text-[11px] pt-0.5" style={{ color: TONE.cristiano.bullet }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-semibold leading-[1.75] text-text-primary" style={{ textWrap: 'pretty' }}>
                        <span className="text-[10.5px] font-bold uppercase tracking-wider mr-2" style={{ color: TONE.cristiano.bullet }}>Buyer ▸</span>
                        {sanitizeNarrativeText(pair.buyerPoint)}
                      </span>
                      <span className="text-text-primary pt-0.5">
                        <ChevronIcon open={isOpen} />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-3 text-xs leading-[1.75] text-text-primary" style={{ paddingLeft: 56, textWrap: 'pretty' }}>
                        <span className="text-[10.5px] font-bold uppercase tracking-wider mr-2" style={{ color: TONE.olivia.bullet }}>Seller ▸</span>
                        {sanitizeNarrativeText(pair.sellerResponse)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Signature — end of document, executive cursive */}
        <div className="px-5 py-6 mt-4 flex justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[18px] sm:text-[22px]" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', color: TONE.cristiano.accent, letterSpacing: '0.02em' }}>
              Cristiano
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-text-secondary uppercase tracking-wider">Challenge Agent · CLUES™</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function OliviaNarrative({
  narrative,
  justificationFull = null,
  challenge = null,
  counterNarrative = null,
  buyerType = 'vc',
}: OliviaNarrativeProps) {
  const hasDebateData = !!(justificationFull || challenge);
  const hasAnyData = !!(narrative || justificationFull);

  // If no data at all, show empty state
  if (!hasAnyData && !challenge) {
    return (
      <section className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-cyan-interactive/20 flex items-center justify-center">
            <span className="text-cyan-interactive text-sm font-bold">O</span>
          </div>
          <h2 className="text-sm font-semibold text-text-primary">The Debate</h2>
        </div>
        <p className="text-sm text-text-secondary italic">
          No narrative available. Run a valuation to generate the debate.
        </p>
      </section>
    );
  }

  // Full debate layout: two columns
  if (hasDebateData) {
    return (
      <section className="glass-card p-0 overflow-x-hidden">
        <style dangerouslySetInnerHTML={{ __html: scrollbarCSS }} />
        {/* Section header */}
        <header className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-baseline gap-4 flex-wrap">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-text-secondary">§ 02</span>
            <h2 className="m-0 text-xl font-medium -tracking-wide text-text-primary" style={{ fontFamily: 'Inter, var(--font-sans), sans-serif' }}>
              The Debate · Olivia <span className="text-text-secondary font-normal">vs</span> Cristiano
            </h2>
            <span className="text-[13px] text-text-secondary">
              Justification cross-examined by Challenge.
            </span>
          </div>
        </header>

        {/* Two-column layout — stacks to single column on mobile */}
        <div className="flex flex-col md:flex-row md:items-stretch" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="min-w-0 md:overflow-hidden md:border-r border-b md:border-b-0 border-white/[0.06] flex flex-col flex-none md:flex-[55_1_0]">
            <OliviaColumn narrative={narrative} justificationFull={justificationFull} buyerType={buyerType} />
          </div>
          <div className="min-w-0 md:overflow-hidden flex flex-col flex-none md:flex-[45_1_0]">
            <CristianoColumn challenge={challenge} counterNarrative={counterNarrative} buyerType={buyerType} />
          </div>
        </div>
      </section>
    );
  }

  // Fallback: old runs with only a narrative string — simple single-column
  const paragraphs = (narrative ?? '').split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
  return (
    <section className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-cyan-interactive/20 flex items-center justify-center">
          <span className="text-cyan-interactive text-sm font-bold">O</span>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Olivia&apos;s Narrative</h2>
          <p className="text-[11px] text-text-secondary">Justification Agent</p>
        </div>
      </div>
      <div className="space-y-3">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-sm text-text-primary leading-relaxed">
            {para}
          </p>
        ))}
      </div>
    </section>
  );
}
