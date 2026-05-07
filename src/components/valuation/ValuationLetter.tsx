'use client';

import { useState } from 'react';
import type { BuyerType, JustificationResult, ChallengeResult } from '@/lib/valuation/types';
import { BUYER_TYPE_LABELS } from '@/lib/valuation/dashboard-types';

// ── Props ────────────────────────────────────────────────────────────

export type ValuationLetterProps = {
  companyName: string;
  buyerType: BuyerType;
  /** Full letter content from Olivia's JustificationAgent */
  letterContent: string | null;
  /** Full justification object with actionableSteps, letterByBuyerType */
  justificationFull?: JustificationResult | null;
  /** Challenge agent output from Cristiano */
  challenge?: ChallengeResult | null;
  /** Date of the valuation run */
  valuationDate: string | null;
};

// ── Shared paper texture styles ──────────────────────────────────────
// Heavy cardstock: layered noise + linen weave + warm tint + embossed edge shadow

const PAPER_TEXTURE: React.CSSProperties = {
  background: `
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23F5F0E6'/%3E%3Crect x='0' y='0' width='2' height='2' fill='%23F3EDE0' opacity='0.4'/%3E%3Crect x='2' y='2' width='2' height='2' fill='%23F7F2EA' opacity='0.3'/%3E%3C/svg%3E"),
    linear-gradient(168deg, #F8F4EB 0%, #F0EBE0 30%, #EDE7DA 60%, #F2ECE2 100%)
  `.replace(/\n\s+/g, ' '),
  backgroundBlendMode: 'overlay, multiply, normal',
  boxShadow: `
    0 1px 0 rgba(255,255,255,0.6) inset,
    0 -1px 0 rgba(0,0,0,0.04) inset,
    0 4px 16px -4px rgba(0,0,0,0.15),
    0 8px 32px -8px rgba(0,0,0,0.1),
    0 2px 4px rgba(0,0,0,0.06)
  `.replace(/\n\s+/g, ' '),
};

// Rich deep bluish-black ink — reads as black but with depth
// All colors verified WCAG AA on paper background (~#F0EBE0, L≈0.839)
const INK = '#0F1729';           // 15.1:1 on paper ✓
const INK_SECONDARY = '#2D3A54'; //  9.7:1 on paper ✓
const INK_LIGHT = '#4A5976';     //  5.97:1 on paper ✓ (normal text)
const INK_MUTED = '#536A88';     //  4.70:1 on paper ✓ (was #6B7D9E 3.53:1 ✗)

// Accent colors — separate values for paper text vs dark-bg tab text
// Paper text must hit 4.5:1 on ~#F0EBE0; tab text must hit 4.5:1 on ~#0F1729
const GOLD_ON_PAPER = '#7A6428'; //  4.84:1 on paper ✓ (for drop cap, signature)
const STEEL_ON_PAPER = '#3D5A78'; //  6.10:1 on paper ✓ (for drop cap, signature)
const GOLD_TAB = '#C4A96A';      //  7.78:1 on dark bg ✓
const STEEL_TAB = '#8EAFC8';     //  7.05:1 on dark bg ✓ (was #5B7B9E 3.84:1 ✗)

// ── Investor salutations ─────────────────────────────────────────────

const OLIVIA_SALUTATIONS: Record<BuyerType, string> = {
  angel: 'Dear Angel Investor,',
  vc: 'Dear Investment Partner,',
  private_equity: 'Dear Investment Committee,',
  strategic_partner: 'Dear Head of Corporate Development,',
  acquirer: 'Dear Head of M&A,',
};

// ── Shared letterhead ────────────────────────────────────────────────

function Letterhead({
  title,
  subtitle,
  companyName,
  buyerType,
  formattedDate,
  accentColor,
  accentColorPaper,
}: {
  title: string;
  subtitle: string;
  companyName: string;
  buyerType: BuyerType;
  formattedDate: string;
  /** Bright accent for decorative elements (foil bars, rules) */
  accentColor: string;
  /** WCAG-safe accent for text rendered on paper background */
  accentColorPaper?: string;
}) {
  return (
    <>
      {/* Embossed top edge — thick foil accent */}
      <div
        className="h-[3px] w-full"
        style={{
          background: `linear-gradient(90deg, transparent 3%, ${accentColor} 15%, ${accentColor}dd 50%, ${accentColor} 85%, transparent 97%)`,
          boxShadow: `0 1px 2px ${accentColor}40`,
        }}
      />
      <div className="px-8 md:px-12 pt-8 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2
              className="text-lg font-bold tracking-tight"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: INK }}
            >
              {title}
            </h2>
            <p
              className="text-[11px] mt-0.5"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                color: INK_MUTED,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              {subtitle}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: INK_LIGHT }}>
              {formattedDate}
            </p>
            <p className="text-[11px]" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: INK_LIGHT }}>
              Re: {companyName}
            </p>
            <p className="text-[11px] mt-1 uppercase tracking-wider" style={{ color: INK_MUTED }}>
              {BUYER_TYPE_LABELS[buyerType]} Perspective
            </p>
          </div>
        </div>
        {/* Thin rule under header */}
        <div
          className="mt-4 h-px"
          style={{
            background: `linear-gradient(90deg, ${accentColor} 0%, transparent 100%)`,
            opacity: 0.35,
          }}
        />
      </div>
    </>
  );
}

// ── Shared signature block ───────────────────────────────────────────

function SignatureBlock({
  name,
  role,
  accentColor,
}: {
  name: string;
  role: string;
  accentColor: string;
}) {
  return (
    <div className="mt-10 pt-4">
      <div className="h-px w-32 mb-4" style={{ background: accentColor, opacity: 0.4 }} />
      <p className="text-xs italic" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: INK_LIGHT }}>
        Yours faithfully,
      </p>
      <p className="text-sm font-bold mt-1" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: accentColor }}>
        {name}
      </p>
      <p className="text-[11px]" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: INK_MUTED }}>
        {role}
      </p>
    </div>
  );
}

// ── Shared disclaimer ────────────────────────────────────────────────

function Disclaimer({ accentColor }: { accentColor: string }) {
  return (
    <>
      <div
        className="px-8 md:px-12 py-3 mt-4"
        style={{ background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.06)' }}
      >
        <p className="text-[10px] leading-relaxed" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: INK_MUTED }}>
          This valuation is indicative only and does not constitute financial, legal, or
          investment advice. Consult a qualified professional for binding transactions.
          Generated by CLUES Intelligence LTD. &copy; {new Date().getFullYear()}
        </p>
      </div>
      {/* Bottom foil accent */}
      <div
        className="h-[3px] w-full"
        style={{
          background: `linear-gradient(90deg, transparent 3%, ${accentColor} 15%, ${accentColor}dd 50%, ${accentColor} 85%, transparent 97%)`,
          boxShadow: `0 -1px 2px ${accentColor}40`,
        }}
      />
    </>
  );
}

// ── Letter body shell ────────────────────────────────────────────────

function LetterPaper({ children, watermark }: { children: React.ReactNode; watermark: string }) {
  return (
    <div
      className="relative rounded-lg overflow-hidden print:shadow-none"
      style={PAPER_TEXTURE}
    >
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
        <span
          className="text-5xl md:text-7xl font-bold tracking-[0.3em] uppercase opacity-[0.04] print:opacity-[0.06] rotate-[-30deg]"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: INK }}
        >
          {watermark}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Paragraph renderer ───────────────────────────────────────────────

function LetterBody({ paragraphs, accentColor }: { paragraphs: string[]; accentColor: string }) {
  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, i) => (
        <p
          key={i}
          className="text-[13px] leading-[1.85]"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: INK,
            textAlign: 'justify',
            hyphens: 'auto',
          }}
        >
          {i === 0 ? (
            <>
              <span
                aria-hidden="true"
                className="float-left text-[3.4em] leading-[0.78] mr-2 mt-1"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontWeight: 700,
                  color: accentColor,
                }}
              >
                {paragraph.charAt(0)}
              </span>
              {paragraph.slice(1)}
            </>
          ) : (
            paragraph
          )}
        </p>
      ))}
    </div>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────

export default function ValuationLetter({
  companyName,
  buyerType,
  letterContent,
  justificationFull,
  challenge,
  valuationDate,
}: ValuationLetterProps) {
  const [activeLetter, setActiveLetter] = useState<'olivia' | 'cristiano'>('olivia');

  if (!letterContent) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Board Letters</h3>
        <p className="text-xs text-text-secondary">
          Run a valuation with intelligence agents enabled to generate personalised board letters.
        </p>
      </div>
    );
  }

  const formattedDate = valuationDate
    ? new Date(valuationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // ── Olivia's letter (investor pitch) — uses the existing letterContent
  // Strip "Actionable Steps" section from older runs where Olivia included advice
  // (that content now belongs in Cristiano's advisory memo only)
  const oliviaParagraphs = letterContent.split('\n\n').filter((p) => {
    const trimmed = p.trim();
    if (trimmed.length === 0) return false;
    // Skip the "Actionable Steps" header and numbered step items that follow it
    if (/^#{1,4}\s*\d*\.?\s*Actionable\s+Steps/i.test(trimmed)) return false;
    if (/^#{1,4}\s*6\.\s/i.test(trimmed)) return false;
    return true;
  });

  // ── Cristiano's letter (advisory to founder) — built from challenge + actionableSteps
  const cristianoParagraphs = buildCristianoLetter(companyName, justificationFull, challenge);

  return (
    <div className="glass-card p-0 overflow-hidden">
      {/* Tab switcher — uses bright accent colors on dark bg */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveLetter('olivia')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[12px] font-semibold transition-all"
          style={{
            color: activeLetter === 'olivia' ? GOLD_TAB : '#94a3b8',
            borderBottom: activeLetter === 'olivia' ? `2px solid ${GOLD_TAB}` : '2px solid transparent',
            background: activeLetter === 'olivia' ? 'rgba(196,169,106,0.06)' : 'transparent',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Olivia&apos;s Investment Case
        </button>
        <button
          onClick={() => setActiveLetter('cristiano')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[12px] font-semibold transition-all"
          style={{
            color: activeLetter === 'cristiano' ? STEEL_TAB : '#94a3b8',
            borderBottom: activeLetter === 'cristiano' ? `2px solid ${STEEL_TAB}` : '2px solid transparent',
            background: activeLetter === 'cristiano' ? 'rgba(91,123,158,0.06)' : 'transparent',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
            <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
          </svg>
          Cristiano&apos;s Advisory Memo
        </button>
      </div>

      {/* Letter content area */}
      <div className="p-4 md:p-6 lg:p-8">
        {activeLetter === 'olivia' ? (
          /* ═══════════════════════════════════════════════════════════════
             OLIVIA — The Investment Case
             Addressed TO the investor. Everything the company does right.
             ═══════════════════════════════════════════════════════════════ */
          <LetterPaper watermark="CONFIDENTIAL">
            <Letterhead
              title="CLUES Intelligence"
              subtitle="Investment Memorandum"
              companyName={companyName}
              buyerType={buyerType}
              formattedDate={formattedDate}
              accentColor={GOLD_TAB}
              accentColorPaper={GOLD_ON_PAPER}
            />
            <div className="px-8 md:px-12 py-4">
              <p className="text-sm mb-6 italic" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: INK_SECONDARY }}>
                {OLIVIA_SALUTATIONS[buyerType]}
              </p>
              <LetterBody paragraphs={oliviaParagraphs} accentColor={GOLD_ON_PAPER} />
              <SignatureBlock name="Olivia" role="CLUES Executive Intelligence Agent" accentColor={GOLD_ON_PAPER} />
            </div>
            <Disclaimer accentColor={GOLD_TAB} />
          </LetterPaper>
        ) : (
          /* ═══════════════════════════════════════════════════════════════
             CRISTIANO — The Advisory Memo
             Addressed TO the company/founder. What they must fix before
             approaching investors.
             ═══════════════════════════════════════════════════════════════ */
          <LetterPaper watermark="ADVISORY">
            <Letterhead
              title="CLUES Intelligence"
              subtitle="Pre-Investment Advisory"
              companyName={companyName}
              buyerType={buyerType}
              formattedDate={formattedDate}
              accentColor={STEEL_TAB}
              accentColorPaper={STEEL_ON_PAPER}
            />
            <div className="px-8 md:px-12 py-4">
              <p className="text-sm mb-6 italic" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: INK_SECONDARY }}>
                Dear {companyName} Leadership,
              </p>
              <LetterBody paragraphs={cristianoParagraphs} accentColor={STEEL_ON_PAPER} />
              <SignatureBlock name="Cristiano" role="CLUES Adversarial Challenge Agent" accentColor={STEEL_ON_PAPER} />
            </div>
            <Disclaimer accentColor={STEEL_TAB} />
          </LetterPaper>
        )}
      </div>

      {/* Actions bar (hidden in print) */}
      <div className="px-6 py-3 flex gap-2 border-t border-white/5 print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
          style={{
            background: activeLetter === 'olivia' ? 'rgba(196,169,106,0.12)' : 'rgba(142,175,200,0.12)',
            border: `1px solid ${activeLetter === 'olivia' ? 'rgba(196,169,106,0.25)' : 'rgba(142,175,200,0.25)'}`,
            color: activeLetter === 'olivia' ? GOLD_TAB : STEEL_TAB,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print {activeLetter === 'olivia' ? 'Investment Case' : 'Advisory Memo'}
        </button>
      </div>
    </div>
  );
}

// ── Cristiano letter builder ─────────────────────────────────────────
// Constructs an advisory letter from challenge data + actionable steps

function buildCristianoLetter(
  companyName: string,
  justificationFull: JustificationResult | null | undefined,
  challenge: ChallengeResult | null | undefined,
): string[] {
  const paragraphs: string[] = [];

  // Opening
  paragraphs.push(
    `Following our comprehensive valuation analysis of ${companyName}, I am writing to provide candid guidance on areas that require attention before approaching institutional investors. This advisory is designed to strengthen your negotiating position and address the challenges a sophisticated buyer will raise during due diligence.`
  );

  // Neutral critique — what's fair, what's stretched
  if (challenge?.neutralCritique) {
    paragraphs.push(challenge.neutralCritique);
  }

  // Vulnerabilities section
  if (challenge?.vulnerabilities && challenge.vulnerabilities.length > 0) {
    const vulnList = challenge.vulnerabilities
      .slice(0, 5)
      .map((v, i) => `(${i + 1}) ${v}`)
      .join(' ');
    paragraphs.push(
      `Our stress-test identified the following vulnerabilities that a buyer will probe: ${vulnList}`
    );
  }

  // Buyer-specific challenges for the selected buyer type
  // (We don't have buyerType here, so we'll include the most comprehensive set)
  if (challenge?.buyerSpecificChallenges) {
    const allChallenges = Object.values(challenge.buyerSpecificChallenges)
      .flat()
      .filter(Boolean);
    const unique = [...new Set(allChallenges)].slice(0, 4);
    if (unique.length > 0) {
      const challengeList = unique.map((c, i) => `(${i + 1}) ${c}`).join(' ');
      paragraphs.push(
        `Buyers across all profiles will challenge you on the following: ${challengeList}`
      );
    }
  }

  // Actionable steps from justification agent
  if (justificationFull?.actionableSteps && justificationFull.actionableSteps.length > 0) {
    const steps = justificationFull.actionableSteps;
    const stepList = steps.map((s, i) => `(${i + 1}) ${s}`).join(' ');
    paragraphs.push(
      `To maximise your valuation and strengthen your position, I recommend the following actions within the next six months: ${stepList}`
    );
  }

  // Bearish perspective — the floor
  if (challenge?.bearishCritique) {
    paragraphs.push(
      `In the interest of full transparency, I must also present the bearish case that a cautious investor will construct: ${challenge.bearishCritique}`
    );
  }

  // Closing
  paragraphs.push(
    `Addressing these points proactively will materially improve ${companyName}'s reception in the investment market. I strongly recommend resolving the items above before initiating formal fundraising discussions. The opportunity is real, but preparation is what separates a term sheet from a pass.`
  );

  // If no challenge data at all, provide a graceful fallback
  if (!challenge && !justificationFull?.actionableSteps?.length) {
    return [
      `Following our comprehensive valuation analysis of ${companyName}, I am writing to provide strategic pre-investment guidance. This advisory memo is generated when the full intelligence agent suite is active during the valuation run.`,
      `To generate Cristiano's detailed advisory — including vulnerability analysis, buyer-specific challenges, and actionable improvement steps — please ensure the Challenge Agent is enabled when running the valuation.`,
    ];
  }

  return paragraphs;
}
