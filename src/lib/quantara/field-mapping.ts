/**
 * Quantara — destination map + round-trip helpers.
 *
 * # What this does
 *
 * Maps each of the 56 Quantara fields to its persistent destination on
 * `ValuationSubject`:
 *   - **Existing JSON columns** (financialDataJson / qualitativeJson /
 *     ipDataJson / marketDataJson / capitalDataJson / fundingDataJson) for
 *     fields that already feed the engine bridge in `lib/valuation/bridge.ts`.
 *     Numeric fields here are wrapped as `MetricEvidence`
 *     (`{ value, refs: [], confidence }`) so the engine consumes them
 *     unchanged.
 *   - **New `quantaraJson` extension column** (added by the Q1 Prisma
 *     migration) for the ~36 net-new fields the engine doesn't yet
 *     consume directly. Plain values, no MetricEvidence wrapping.
 *   - **Top-level columns** (`companyName`, `sector`, `subsector`,
 *     `stage`, `businessModel`) — none of the Quantara fields write here
 *     directly in Q1; sector/stage selection is Q2 form chrome.
 *
 * # Round-trip helpers
 *
 * - `quantaraToValuationSubject(values)` — projects a flat `QuantaraValues`
 *   payload into the JSON-column shape Prisma writes.
 * - `valuationSubjectToQuantara(subject)` — inverse projection for
 *   re-rendering the form from a stored subject.
 *
 * The two helpers are designed to round-trip losslessly for the field
 * VALUE itself. `MetricEvidence` metadata (`refs`, `confidence`,
 * `asOfDate`) is normalized to defaults on write and discarded on read —
 * Q4 wires per-field provenance through a different code path.
 */
import type { MetricEvidence } from '../valuation/types';
import {
  type QuantaraFieldId,
  type QuantaraValues,
  type QuantaraValuationSubjectShape,
} from './types';

// ── Destination shape ──────────────────────────────────────────────────

/**
 * Top-level columns on `ValuationSubject` (non-JSON). None of the 56
 * Quantara fields write here in Q1.
 */
type ValuationSubjectColumn =
  | 'companyName'
  | 'sector'
  | 'subsector'
  | 'stage'
  | 'businessModel';

/**
 * JSON columns on `ValuationSubject`. Includes the new `quantaraJson`
 * column added by `prisma/sql/04-add-quantara-foundation.sql`.
 */
type ValuationSubjectJsonColumn =
  | 'financialDataJson'
  | 'qualitativeJson'
  | 'ipDataJson'
  | 'marketDataJson'
  | 'capitalDataJson'
  | 'fundingDataJson'
  | 'quantaraJson';

/**
 * Destination spec for a single Quantara field. Either targets a
 * top-level column directly or a subkey within a JSON column.
 *
 * `wrap: 'metric'` means the value is wrapped as a `MetricEvidence` on
 * write and unwrapped from `.value` on read. `wrap: 'plain'` (or omitted)
 * means the value is stored verbatim.
 */
export type QuantaraFieldDestination =
  | { readonly column: ValuationSubjectColumn }
  | {
      readonly column: ValuationSubjectJsonColumn;
      readonly subkey: string;
      readonly wrap?: 'metric' | 'plain';
    };

// ── Per-field destination map ──────────────────────────────────────────

/**
 * Canonical destination for each of the 56 fields. Order matches the
 * field definitions in `./schema.ts`.
 *
 * **Engine-consuming subkeys** (those wrapped as MetricEvidence and
 * landing in the existing `lib/valuation/bridge.ts` JSON columns) keep
 * the LTM-canonical subkey names — `arr`, `growthYoYPct`, `cashOnHand`,
 * etc. — so the engine bridge round-trips without modification.
 *
 * **Quantara-only subkeys** use `camelCase` matching the field's English
 * label (e.g. `monthlyActiveUsers`, `pathToProfitabilityMonths`).
 */
export const QUANTARA_FIELD_DESTINATIONS: Readonly<
  Record<QuantaraFieldId, QuantaraFieldDestination>
> = Object.freeze({
  // ── § 1 Core Financials ──────────────────────────────────────────
  f1: { column: 'financialDataJson', subkey: 'arr', wrap: 'metric' },
  f2: { column: 'quantaraJson', subkey: 'mrr' },
  f3: { column: 'financialDataJson', subkey: 'growthYoYPct', wrap: 'metric' },
  f4: { column: 'quantaraJson', subkey: 'growthMoMPct' },
  f5: { column: 'financialDataJson', subkey: 'grossMarginPct', wrap: 'metric' },
  f6: { column: 'quantaraJson', subkey: 'netMarginPct' },
  f7: { column: 'financialDataJson', subkey: 'ebitda', wrap: 'metric' },
  f8: { column: 'financialDataJson', subkey: 'burnMonthly', wrap: 'metric' },
  f9: { column: 'financialDataJson', subkey: 'runwayMonths', wrap: 'metric' },
  f10: { column: 'quantaraJson', subkey: 'cacAmount' },
  f11: { column: 'quantaraJson', subkey: 'ltvAmount' },
  f12: { column: 'financialDataJson', subkey: 'ltvToCac', wrap: 'metric' },
  f13: { column: 'financialDataJson', subkey: 'netRevenueRetentionPct', wrap: 'metric' },
  f14: { column: 'quantaraJson', subkey: 'grossRevenueRetentionPct' },

  // ── § 2 Capital Structure ─────────────────────────────────────────
  f15: { column: 'capitalDataJson', subkey: 'cashOnHand', wrap: 'metric' },
  f16: { column: 'capitalDataJson', subkey: 'debt', wrap: 'metric' },
  f17: { column: 'capitalDataJson', subkey: 'fullyDilutedShares', wrap: 'metric' },
  f18: { column: 'capitalDataJson', subkey: 'optionPoolPct', wrap: 'metric' },

  // ── § 3 Funding History ───────────────────────────────────────────
  f19: { column: 'fundingDataJson', subkey: 'capitalRaisedToDate', wrap: 'metric' },
  f20: { column: 'fundingDataJson', subkey: 'lastRoundPreMoney', wrap: 'metric' },
  f21: { column: 'quantaraJson', subkey: 'lastRoundType' },

  // ── § 4 Current Round ─────────────────────────────────────────────
  f22: { column: 'quantaraJson', subkey: 'targetRaiseAmount' },
  f23: { column: 'quantaraJson', subkey: 'targetRoundType' },

  // ── § 5 Traction ──────────────────────────────────────────────────
  f24: { column: 'quantaraJson', subkey: 'payingCustomers' },
  f25: { column: 'quantaraJson', subkey: 'pipelineValue' },
  f26: { column: 'quantaraJson', subkey: 'monthlyActiveUsers' },
  f27: { column: 'financialDataJson', subkey: 'churnPct', wrap: 'metric' },
  f28: { column: 'quantaraJson', subkey: 'enterpriseContracts' },
  f29: { column: 'quantaraJson', subkey: 'averageContractValue' },

  // ── § 6 Market ────────────────────────────────────────────────────
  f30: { column: 'marketDataJson', subkey: 'tam', wrap: 'metric' },
  f31: { column: 'marketDataJson', subkey: 'sam', wrap: 'metric' },
  f32: { column: 'marketDataJson', subkey: 'som', wrap: 'metric' },
  f33: { column: 'marketDataJson', subkey: 'marketGrowthPct', wrap: 'metric' },

  // ── § 7 IP & Moat ─────────────────────────────────────────────────
  f34: { column: 'quantaraJson', subkey: 'patentsFiled' },
  f35: { column: 'ipDataJson', subkey: 'patentsCount', wrap: 'plain' },
  f36: { column: 'quantaraJson', subkey: 'proprietaryDatasetDescription' },
  f37: { column: 'quantaraJson', subkey: 'openSourceDependencyPct' },
  f38: { column: 'quantaraJson', subkey: 'keyRegulatoryApprovalsText' },
  f39: { column: 'quantaraJson', subkey: 'networkEffectsScore' },

  // ── § 8 Team ──────────────────────────────────────────────────────
  f40: { column: 'quantaraJson', subkey: 'teamSize' },
  f41: { column: 'quantaraJson', subkey: 'technicalStaffPct' },
  f42: { column: 'quantaraJson', subkey: 'founderDomainExperienceYears' },
  f43: { column: 'quantaraJson', subkey: 'previousExitsText' },
  f44: { column: 'quantaraJson', subkey: 'keyPersonDependencyRisk' },

  // ── § 9 Risk Factors ──────────────────────────────────────────────
  f45: { column: 'quantaraJson', subkey: 'revenueConcentrationTopClientPct' },
  f46: { column: 'quantaraJson', subkey: 'geographicConcentrationText' },
  f47: { column: 'quantaraJson', subkey: 'regulatoryRiskLevel' },

  // ── § 10 Growth Levers ────────────────────────────────────────────
  f48: { column: 'quantaraJson', subkey: 'expansionRevenuePct' },
  f49: { column: 'quantaraJson', subkey: 'viralCoefficient' },
  f50: { column: 'quantaraJson', subkey: 'salesCycleDays' },
  f51: { column: 'quantaraJson', subkey: 'rdSpendPctOfRevenue' },

  // ── § 11 Projections ──────────────────────────────────────────────
  f52: { column: 'quantaraJson', subkey: 'projectedRevenueY1' },
  f53: { column: 'quantaraJson', subkey: 'projectedRevenueY2' },
  f54: { column: 'quantaraJson', subkey: 'projectedRevenueY3' },
  f55: { column: 'quantaraJson', subkey: 'pathToProfitabilityMonths' },

  // ── § 12 Strategic ────────────────────────────────────────────────
  f56: { column: 'quantaraJson', subkey: 'targetExitTimelineYears' },
});

// ── Internal helpers ───────────────────────────────────────────────────

/**
 * Default `MetricEvidence` confidence for Quantara-sourced values. Form
 * answers come direct from the founder, so default mid-confidence (0.7);
 * Q4 cascade reconciles upward when corroborated by Stripe / Companies
 * House / GitHub data.
 */
const QUANTARA_FOUNDER_CONFIDENCE = 0.7;

function wrapAsMetricEvidence(value: number): MetricEvidence {
  return {
    value,
    refs: [],
    confidence: QUANTARA_FOUNDER_CONFIDENCE,
  };
}

function readMetricEvidenceValue(
  bag: Record<string, unknown> | null | undefined,
  subkey: string,
): number | undefined {
  if (!bag) return undefined;
  const entry = bag[subkey];
  if (entry && typeof entry === 'object' && 'value' in entry) {
    const v = (entry as { value: unknown }).value;
    return typeof v === 'number' ? v : undefined;
  }
  return undefined;
}

function readPlainValue(
  bag: Record<string, unknown> | null | undefined,
  subkey: string,
): unknown {
  if (!bag) return undefined;
  return bag[subkey];
}

function ensureBag(
  bag: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return bag ? { ...bag } : {};
}

// ── Public helpers ─────────────────────────────────────────────────────

/**
 * Project a flat `QuantaraValues` payload into the JSON-column shape
 * Prisma writes to `ValuationSubject`. Undefined values are skipped (no
 * over-projection); existing JSON columns on the subject are not
 * disturbed beyond the subkeys this projection writes.
 *
 * Use `Object.assign(existingSubject, quantaraToValuationSubject(values))`
 * to merge; or pass the result directly to `prisma.valuationSubject.update`
 * — Prisma replaces JSON columns wholesale, so callers who want to merge
 * with existing data should fetch first and combine.
 */
export function quantaraToValuationSubject(
  values: QuantaraValues,
): QuantaraValuationSubjectShape {
  const financialDataJson: Record<string, unknown> = {};
  const ipDataJson: Record<string, unknown> = {};
  const marketDataJson: Record<string, unknown> = {};
  const capitalDataJson: Record<string, unknown> = {};
  const fundingDataJson: Record<string, unknown> = {};
  const quantaraJson: Record<string, unknown> = {};

  for (const [fieldId, value] of Object.entries(values) as Array<
    [QuantaraFieldId, unknown]
  >) {
    if (value === undefined || value === null) continue;
    const dest = QUANTARA_FIELD_DESTINATIONS[fieldId];
    if (!dest || !('subkey' in dest)) continue;

    const wrappedValue =
      dest.wrap === 'metric' && typeof value === 'number'
        ? wrapAsMetricEvidence(value)
        : value;

    switch (dest.column) {
      case 'financialDataJson':
        financialDataJson[dest.subkey] = wrappedValue;
        break;
      case 'ipDataJson':
        ipDataJson[dest.subkey] = wrappedValue;
        break;
      case 'marketDataJson':
        marketDataJson[dest.subkey] = wrappedValue;
        break;
      case 'capitalDataJson':
        capitalDataJson[dest.subkey] = wrappedValue;
        break;
      case 'fundingDataJson':
        fundingDataJson[dest.subkey] = wrappedValue;
        break;
      case 'quantaraJson':
        quantaraJson[dest.subkey] = wrappedValue;
        break;
      // qualitativeJson destinations: none in Q1.
    }
  }

  const result: QuantaraValuationSubjectShape = {};
  if (Object.keys(financialDataJson).length > 0)
    result.financialDataJson = financialDataJson;
  if (Object.keys(ipDataJson).length > 0) result.ipDataJson = ipDataJson;
  if (Object.keys(marketDataJson).length > 0)
    result.marketDataJson = marketDataJson;
  if (Object.keys(capitalDataJson).length > 0)
    result.capitalDataJson = capitalDataJson;
  if (Object.keys(fundingDataJson).length > 0)
    result.fundingDataJson = fundingDataJson;
  if (Object.keys(quantaraJson).length > 0) result.quantaraJson = quantaraJson;
  return result;
}

/**
 * Inverse projection — read a `ValuationSubject` shape and reconstruct
 * the flat `QuantaraValues` payload for re-rendering the form. Returns
 * only fields that have a stored value; absent fields are omitted (not
 * set to `null`).
 */
export function valuationSubjectToQuantara(
  subject: QuantaraValuationSubjectShape,
): QuantaraValues {
  const values: QuantaraValues = {};

  for (const [fieldId, dest] of Object.entries(
    QUANTARA_FIELD_DESTINATIONS,
  ) as Array<[QuantaraFieldId, QuantaraFieldDestination]>) {
    if (!('subkey' in dest)) continue;

    const bag =
      dest.column === 'financialDataJson'
        ? subject.financialDataJson
        : dest.column === 'qualitativeJson'
          ? subject.qualitativeJson
          : dest.column === 'ipDataJson'
            ? subject.ipDataJson
            : dest.column === 'marketDataJson'
              ? subject.marketDataJson
              : dest.column === 'capitalDataJson'
                ? subject.capitalDataJson
                : dest.column === 'fundingDataJson'
                  ? subject.fundingDataJson
                  : subject.quantaraJson;

    const raw =
      dest.wrap === 'metric'
        ? readMetricEvidenceValue(bag ?? undefined, dest.subkey)
        : readPlainValue(bag ?? undefined, dest.subkey);

    if (raw !== undefined) {
      values[fieldId] = raw;
    }
  }

  return values;
}

/**
 * Merge a Quantara projection into an existing subject's JSON columns
 * without clobbering unrelated subkeys. Callers fetch the subject, pass
 * its current state plus new values, and write the result back.
 *
 * Useful for partial saves — the form only sends changed fields, but
 * Prisma replaces JSON columns wholesale, so the merge has to happen
 * server-side.
 */
export function mergeQuantaraIntoSubject(
  current: QuantaraValuationSubjectShape,
  values: QuantaraValues,
): QuantaraValuationSubjectShape {
  const projection = quantaraToValuationSubject(values);
  return {
    ...current,
    financialDataJson: projection.financialDataJson
      ? { ...ensureBag(current.financialDataJson), ...projection.financialDataJson }
      : current.financialDataJson,
    ipDataJson: projection.ipDataJson
      ? { ...ensureBag(current.ipDataJson), ...projection.ipDataJson }
      : current.ipDataJson,
    marketDataJson: projection.marketDataJson
      ? { ...ensureBag(current.marketDataJson), ...projection.marketDataJson }
      : current.marketDataJson,
    capitalDataJson: projection.capitalDataJson
      ? { ...ensureBag(current.capitalDataJson), ...projection.capitalDataJson }
      : current.capitalDataJson,
    fundingDataJson: projection.fundingDataJson
      ? { ...ensureBag(current.fundingDataJson), ...projection.fundingDataJson }
      : current.fundingDataJson,
    quantaraJson: projection.quantaraJson
      ? { ...ensureBag(current.quantaraJson), ...projection.quantaraJson }
      : current.quantaraJson,
  };
}
