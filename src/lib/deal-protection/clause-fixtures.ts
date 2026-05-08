/**
 * Track P Session P2 — canonical fixture clauses.
 *
 * One fixture per `ClauseType` (20 total), with a representative
 * clause text + the expected severity / toxicity / counter-language.
 *
 * # Two roles for these fixtures
 *
 * 1. **Test data** — the cascade tests in `__tests__/clause-intel.test.ts`
 *    parse the cascade response against these expected values. A
 *    classifier regression that mistypes a common liquidation-pref
 *    clause as `other` flags here.
 *
 * 2. **Mock-mode demo data** — when the cascade runs in mock-mode (no
 *    provider keys), `classifyClauses` returns the matching fixture
 *    for any clause text whose first 80 chars hash to a known fixture,
 *    or a generic `other` fallback otherwise. Lets the UI render
 *    realistic chrome before keys land without fabricating analysis.
 *
 * # Severity / toxicity calibration
 *
 * Toxicity values within a severity tier are deliberately spread across
 * the tier's range so the monotonicity invariant (`tier(a) < tier(b)
 * ⇒ toxicity(a) < toxicity(b)`) is verifiable in tests.
 */
import type { ClauseAnalysis, ClauseType } from './clause-types';

/** Fixture row — same shape as `ClauseAnalysis` minus `opusJudged`. */
export interface ClauseFixture
  extends Omit<ClauseAnalysis, 'opusJudged' | 'reasoning'> {
  readonly clauseType: ClauseType;
}

/** Stable, exhaustive fixture list — one per ClauseType. */
export const CLAUSE_FIXTURES: ReadonlyArray<ClauseFixture> = Object.freeze([
  {
    text: '1x non-participating liquidation preference for Series A preferred shares.',
    clauseType: 'liquidation_preference',
    severity: 'low',
    toxicity: 12,
    summary: 'Standard 1x non-participating preference — market-rate.',
    founderFriendlyAlternative:
      'Accept as-is; this is the founder-friendly default.',
  },
  {
    text: 'Broad-based weighted-average anti-dilution applies to any down round.',
    clauseType: 'anti_dilution',
    severity: 'low',
    toxicity: 18,
    summary: 'Broad-based weighted-average is the founder-friendly default.',
    founderFriendlyAlternative:
      'Accept; this protects investors without ratcheting founder ownership.',
  },
  {
    text: 'Investor appoints two of three board seats; founder retains one.',
    clauseType: 'board_control',
    severity: 'high',
    toxicity: 64,
    summary:
      'Investor majority on a 3-seat board — control shifts at Series A.',
    founderFriendlyAlternative:
      'Counter for 2 founder + 1 investor + 1 independent — preserves founder voice on most votes.',
  },
  {
    text: '4-year vesting with 1-year cliff for all founder shares.',
    clauseType: 'vesting',
    severity: 'low',
    toxicity: 8,
    summary: 'Standard 4y/1y founder vesting — universally market.',
    founderFriendlyAlternative: 'Accept; this is the canonical founder-vesting default.',
  },
  {
    text: 'Bad-leaver: 100% of unvested shares forfeit; 50% of vested shares repurchased at par.',
    clauseType: 'leaver_provisions',
    severity: 'critical',
    toxicity: 88,
    summary:
      'Punitive bad-leaver — repurchasing vested shares at par is predatory.',
    founderFriendlyAlternative:
      'Counter to: bad-leaver forfeits unvested only; vested shares repurchased at fair market value or kept by departing founder.',
  },
  {
    text: 'Investor consent required for: budget, hiring exec roles, IP licensing, debt > £100k.',
    clauseType: 'veto_rights',
    severity: 'medium',
    toxicity: 38,
    summary:
      'Veto on budget + senior hiring is broad but not unprecedented at Series A.',
    founderFriendlyAlternative:
      'Counter to: budget veto only above 20% deviation from board-approved plan; remove hiring veto for non-CXO roles.',
  },
  {
    text: 'Exclusivity for 60 days post-term-sheet; founder cannot solicit other investors.',
    clauseType: 'exclusivity',
    severity: 'medium',
    toxicity: 32,
    summary: '60-day exclusivity — long for Series A; 30-45 days is standard.',
    founderFriendlyAlternative:
      'Counter to 30-day exclusivity with a fee-shifting break clause if the investor walks.',
  },
  {
    text: 'Quarterly financials, monthly KPI dashboard, annual audited accounts to all investors.',
    clauseType: 'information_rights',
    severity: 'low',
    toxicity: 10,
    summary: 'Standard information rights — minimal founder burden.',
    founderFriendlyAlternative: 'Accept; this is the default reporting cadence.',
  },
  {
    text: 'Company reimburses investor legal fees up to £150k regardless of close.',
    clauseType: 'legal_fees',
    severity: 'high',
    toxicity: 60,
    summary:
      'Legal fees payable on no-close is unusual; £150k cap is at the high end.',
    founderFriendlyAlternative:
      'Counter to: fees capped at £75k AND payable only on close.',
  },
  {
    text: 'Founders personally indemnify the company for pre-closing breaches up to 100% of consideration.',
    clauseType: 'indemnification',
    severity: 'critical',
    toxicity: 92,
    summary:
      'Personal founder indemnity at 100% of consideration is highly unusual outside M&A.',
    founderFriendlyAlternative:
      'Counter: indemnity capped at the escrow amount (typically 10-15% of consideration), 18-month survival.',
  },
  {
    text: 'All IP created by founders during employment is assigned to the company.',
    clauseType: 'ip_assignment',
    severity: 'low',
    toxicity: 14,
    summary: 'Standard IP assignment — universally market for full-time founders.',
    founderFriendlyAlternative: 'Accept; this is the default for any priced round.',
  },
  {
    text: '24-month post-departure non-compete covering any technology in the company sector globally.',
    clauseType: 'non_compete',
    severity: 'high',
    toxicity: 70,
    summary:
      '24-month global non-compete is unenforceable in California and aggressive elsewhere.',
    founderFriendlyAlternative:
      'Counter to: 12-month non-compete in named geographies, with carve-outs for non-overlapping sub-sectors.',
  },
  {
    text: 'Drag-along triggered by 50% of preferred holders; minority preferred + common dragged.',
    clauseType: 'drag_along',
    severity: 'medium',
    toxicity: 42,
    summary:
      'Standard drag at 50% preferred is common but watch the threshold for control implications.',
    founderFriendlyAlternative:
      'Counter to: drag triggered by majority of preferred AND a majority of common holders to require founder buy-in.',
  },
  {
    text: 'Tag-along on any sale by founders or major holders, pro-rata participation rights.',
    clauseType: 'tag_along',
    severity: 'low',
    toxicity: 16,
    summary: 'Standard tag-along — standard founder-friendly minority protection.',
    founderFriendlyAlternative: 'Accept as-is; this protects all parties on secondary sales.',
  },
  {
    text: 'Earnout: 30% of consideration deferred against revenue milestones over 24 months post-close.',
    clauseType: 'earnout',
    severity: 'high',
    toxicity: 58,
    summary:
      '30% earnout over 24 months is acquirer-favourable; founders bear post-close execution risk.',
    founderFriendlyAlternative:
      'Counter to: 15% earnout over 12 months with milestones tied to controllable metrics (not market-share).',
  },
  {
    text: 'Standard reps & warranties with 18-month survival, 10% holdback in escrow.',
    clauseType: 'reps_warranties',
    severity: 'low',
    toxicity: 20,
    summary: '18-month survival + 10% holdback are market-standard.',
    founderFriendlyAlternative: 'Accept; this is the canonical R&W structure for venture deals.',
  },
  {
    text: 'Key-person clause: founder departure triggers investor put right at original investment cost.',
    clauseType: 'key_person',
    severity: 'high',
    toxicity: 72,
    summary:
      'Put at cost on founder departure makes the investment effectively a debt instrument.',
    founderFriendlyAlternative:
      'Counter to: key-person clause triggers a board review only — no automatic put right.',
  },
  {
    text: 'English law and exclusive jurisdiction of the English courts.',
    clauseType: 'governing_law',
    severity: 'low',
    toxicity: 5,
    summary: 'Standard English law for a London-based deal — no concerns.',
    founderFriendlyAlternative: 'Accept; this is the canonical default for UK rounds.',
  },
  {
    text: 'Investor may freely assign rights and obligations to any affiliate without consent.',
    clauseType: 'assignment',
    severity: 'medium',
    toxicity: 46,
    summary:
      'Free affiliate assignment is broad — investor can route through tax-friendly vehicles unilaterally.',
    founderFriendlyAlternative:
      'Counter to: assignment requires founder consent except to wholly-owned affiliates within the same fund family.',
  },
  {
    text: 'All notices to be sent by registered post to the company secretary.',
    clauseType: 'other',
    severity: 'low',
    toxicity: 2,
    summary: 'Boilerplate notice clause — non-substantive.',
    founderFriendlyAlternative: 'Accept; standard administrative boilerplate.',
  },
]);

/** Defensive runtime invariant — fixture count must equal `CLAUSE_TYPE_COUNT`. */
import { CLAUSE_TYPE_COUNT } from './clause-types';
if (CLAUSE_FIXTURES.length !== CLAUSE_TYPE_COUNT) {
  throw new Error(
    `CLAUSE_FIXTURES length (${CLAUSE_FIXTURES.length}) must equal CLAUSE_TYPE_COUNT (${CLAUSE_TYPE_COUNT}).`,
  );
}

/** One fixture per `ClauseType` — verified at module load. */
const seen = new Set<ClauseType>();
for (const f of CLAUSE_FIXTURES) {
  if (seen.has(f.clauseType)) {
    throw new Error(
      `CLAUSE_FIXTURES has duplicate entry for clauseType '${f.clauseType}'.`,
    );
  }
  seen.add(f.clauseType);
}

/** Fixture lookup by clauseType. */
export const CLAUSE_FIXTURES_BY_TYPE: Readonly<
  Record<ClauseType, ClauseFixture>
> = Object.freeze(
  Object.fromEntries(
    CLAUSE_FIXTURES.map((f) => [f.clauseType, f] as const),
  ) as Record<ClauseType, ClauseFixture>,
);
