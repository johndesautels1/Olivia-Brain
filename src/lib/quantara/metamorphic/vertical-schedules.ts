/**
 * Quantara metamorphic — Q6 vertical-specific field catalog.
 *
 * 20 fields across 4 verticals (5 each), plus Generic with 0 fields.
 * Each field is owned by exactly one vertical — switching verticals in
 * the UI hides this field but does not delete the stored value
 * (round-trip preservation, parity with Q5 supplementary).
 *
 * # Field selection rationale
 *
 * Drawn from canonical investor diligence patterns per vertical:
 *
 *   - **AI/SaaS** — what investors at Atomico / a16z / Index ask first
 *     about an AI startup: where does the model come from? what's the
 *     training data? how is quality measured? what does inference
 *     cost? hallucination is the #1 buyer-side risk and gets its own
 *     field.
 *   - **HealthTech** — UK MHRA / FDA pathway is the gating risk;
 *     clinical evidence (trial stage + peer review) is the value
 *     driver; reimbursement is the exit condition.
 *   - **ClimateTech** — ESG framework alignment determines whether
 *     PE/strategic capital can deploy; CO₂ abatement per £ revenue
 *     is the canonical impact metric; methodology + carbon
 *     accounting tool establish credibility.
 *   - **PropTech** — data accuracy + RESO compliance gate enterprise
 *     contracts; geographic coverage + transaction volume are the
 *     quantitative scale signals; refresh cadence drives trust.
 *
 * Founder direction (carries forward): if a vertical needs more or
 * different fields, extend this catalog rather than overloading the
 * supplementary catalog or the canonical 56.
 */
import { z } from 'zod';

import type {
  VerticalDescriptor,
  VerticalFieldDefinition,
  VerticalFieldId,
  VerticalId,
} from './vertical-types';
import {
  QUANTARA_VERTICAL_COUNT,
  QUANTARA_VERTICAL_FIELD_COUNT,
} from './vertical-types';

// ── Helper schemas ─────────────────────────────────────────────────────

const Pct0to100 = z.number().finite().min(0).max(100);
const NonNegativeInt = z.number().int().nonnegative();
const NonNegativeNumber = z.number().nonnegative().finite();
const ShortText = z.string().min(1).max(500);

// ── Vertical descriptors (display labels) ──────────────────────────────

/**
 * Stable list of verticals + display labels. Order is the rendering
 * order in the founder's vertical selector dropdown.
 */
export const QUANTARA_VERTICALS: ReadonlyArray<VerticalDescriptor> = Object.freeze([
  {
    id: 'ai_saas',
    label: 'AI / SaaS',
    description:
      'Model provenance, training data, eval framework, hallucination rate.',
  },
  {
    id: 'healthtech',
    label: 'HealthTech',
    description:
      'Regulatory pathway, clinical evidence, reimbursement, key opinion leaders.',
  },
  {
    id: 'climatetech',
    label: 'ClimateTech',
    description:
      'ESG framework alignment, CO₂ abatement, impact methodology, lifecycle assessment.',
  },
  {
    id: 'proptech',
    label: 'PropTech',
    description:
      'Property data accuracy, RESO compliance, geographic coverage, refresh cadence.',
  },
  {
    id: 'generic',
    label: 'Generic / Other',
    description: 'No vertical-specific schedule mounts. Canonical 56 + round-axis only.',
  },
]);

if (QUANTARA_VERTICALS.length !== QUANTARA_VERTICAL_COUNT) {
  throw new Error(
    `Vertical descriptor count drift: array has ${QUANTARA_VERTICALS.length}, expected ${QUANTARA_VERTICAL_COUNT}.`,
  );
}

/** Lookup by id. */
export const QUANTARA_VERTICAL_BY_ID: Readonly<Record<VerticalId, VerticalDescriptor>> =
  Object.freeze(
    Object.fromEntries(QUANTARA_VERTICALS.map((v) => [v.id, v] as const)) as Record<
      VerticalId,
      VerticalDescriptor
    >,
  );

// ── Inline option lists (per-field enums) ──────────────────────────────

const MODEL_PROVENANCE_OPTIONS = [
  { value: 'proprietary_trained', label: 'Proprietary — trained from scratch' },
  { value: 'fine_tuned', label: 'Fine-tuned on a foundation model' },
  { value: 'api_wrapper', label: 'API wrapper (no model training)' },
  { value: 'hybrid', label: 'Hybrid (proprietary + foundation model)' },
] as const;

const TRAINING_DATA_PROVENANCE_OPTIONS = [
  { value: 'proprietary', label: 'Proprietary / first-party data only' },
  { value: 'licensed', label: 'Licensed third-party datasets' },
  { value: 'public', label: 'Public / open datasets only' },
  { value: 'mixed', label: 'Mixed (proprietary + licensed + public)' },
] as const;

const EVAL_FRAMEWORK_OPTIONS = [
  { value: 'internal_only', label: 'Internal evals only' },
  { value: 'third_party', label: 'Third-party evaluation in place' },
  { value: 'public_benchmark', label: 'Public benchmark scores published' },
  { value: 'none', label: 'No formal evaluation framework yet' },
] as const;

const REGULATORY_PATHWAY_OPTIONS = [
  { value: 'mhra', label: 'MHRA (UK)' },
  { value: 'fda_510k', label: 'FDA 510(k)' },
  { value: 'fda_de_novo', label: 'FDA De Novo' },
  { value: 'ce_mark', label: 'CE Mark' },
  { value: 'class_i_exempt', label: 'Class I exempt / non-medical-device' },
  { value: 'not_yet', label: 'Not yet pursued' },
] as const;

const CLINICAL_STAGE_OPTIONS = [
  { value: 'pre_clinical', label: 'Pre-clinical' },
  { value: 'phase_1', label: 'Phase I' },
  { value: 'phase_2', label: 'Phase II' },
  { value: 'phase_3', label: 'Phase III' },
  { value: 'post_market', label: 'Post-market / commercial' },
  { value: 'na', label: 'Non-applicable (e.g. SaaS for clinicians)' },
] as const;

const REIMBURSEMENT_STATUS_OPTIONS = [
  { value: 'covered', label: 'Covered by major payors' },
  { value: 'pending', label: 'Application in progress' },
  { value: 'private_pay_only', label: 'Private-pay / out-of-pocket only' },
  { value: 'not_yet', label: 'Not yet pursued' },
] as const;

const ESG_FRAMEWORK_OPTIONS = [
  { value: 'tcfd', label: 'TCFD' },
  { value: 'sbti', label: 'SBTi' },
  { value: 'sasb', label: 'SASB' },
  { value: 'gri', label: 'GRI' },
  { value: 'cdp', label: 'CDP' },
] as const;

const LIFECYCLE_ASSESSMENT_OPTIONS = [
  { value: 'completed', label: 'Completed (third-party verified)' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'planned', label: 'Planned' },
  { value: 'na', label: 'Not applicable' },
] as const;

const RESO_COMPLIANCE_OPTIONS = [
  { value: 'full', label: 'Full RESO Data Dictionary compliance' },
  { value: 'partial', label: 'Partial — subset of standard fields' },
  { value: 'na', label: 'Non-applicable (no MLS data)' },
] as const;

const REFRESH_CADENCE_OPTIONS = [
  { value: 'real_time', label: 'Real-time / sub-minute' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly or slower' },
] as const;

// ── Helpers (parallel to supplementary.ts) ─────────────────────────────

function enumFrom(
  options: ReadonlyArray<{ value: string; label: string }>,
): z.ZodType<string> {
  const values = options.map((o) => o.value);
  return z.enum(values as unknown as readonly [string, ...string[]]);
}

function multiEnumFrom(
  options: ReadonlyArray<{ value: string; label: string }>,
): z.ZodType<string[]> {
  return z.array(enumFrom(options));
}

// ── The 20 vertical fields ─────────────────────────────────────────────

export const QUANTARA_VERTICAL_FIELDS: ReadonlyArray<VerticalFieldDefinition> =
  Object.freeze([
    // ── AI/SaaS (5) ────────────────────────────────────────────────────
    {
      id: 'v1',
      verticalId: 'ai_saas',
      subkey: 'modelProvenance',
      label: 'Model Provenance',
      description: 'Where does your core model come from?',
      weight: 3,
      control: 'select-enum',
      options: MODEL_PROVENANCE_OPTIONS,
      schema: enumFrom(MODEL_PROVENANCE_OPTIONS),
    },
    {
      id: 'v2',
      verticalId: 'ai_saas',
      subkey: 'trainingDataProvenance',
      label: 'Training Data Provenance',
      description: 'What data trained the model?',
      hint: 'Investors care about IP defensibility AND legal exposure',
      weight: 3,
      control: 'select-enum',
      options: TRAINING_DATA_PROVENANCE_OPTIONS,
      schema: enumFrom(TRAINING_DATA_PROVENANCE_OPTIONS),
    },
    {
      id: 'v3',
      verticalId: 'ai_saas',
      subkey: 'evalFramework',
      label: 'Evaluation Framework',
      description: 'How is model quality measured?',
      weight: 2,
      control: 'select-enum',
      options: EVAL_FRAMEWORK_OPTIONS,
      schema: enumFrom(EVAL_FRAMEWORK_OPTIONS),
    },
    {
      id: 'v4',
      verticalId: 'ai_saas',
      subkey: 'hallucinationRatePct',
      label: 'Hallucination Rate',
      description: 'Self-measured hallucination / error rate on production traffic.',
      hint: 'Lower is better — typical SOTA models 1–5%',
      weight: 2,
      control: 'percent',
      unitLabel: '%',
      step: 0.1,
      schema: Pct0to100,
    },
    {
      id: 'v5',
      verticalId: 'ai_saas',
      subkey: 'inferenceCostPerQueryGbp',
      label: 'Inference Cost per Query',
      description: 'Average cost per inference, in GBP.',
      weight: 2,
      control: 'currency-gbp',
      unitLabel: 'GBP',
      step: 0.001,
      schema: NonNegativeNumber,
    },

    // ── HealthTech (5) ─────────────────────────────────────────────────
    {
      id: 'v6',
      verticalId: 'healthtech',
      subkey: 'regulatoryPathway',
      label: 'Regulatory Pathway',
      description: 'Approval route for your primary product.',
      weight: 3,
      control: 'select-enum',
      options: REGULATORY_PATHWAY_OPTIONS,
      schema: enumFrom(REGULATORY_PATHWAY_OPTIONS),
    },
    {
      id: 'v7',
      verticalId: 'healthtech',
      subkey: 'clinicalStage',
      label: 'Clinical Trial Stage',
      description: 'Highest stage achieved on the primary indication.',
      weight: 3,
      control: 'select-enum',
      options: CLINICAL_STAGE_OPTIONS,
      schema: enumFrom(CLINICAL_STAGE_OPTIONS),
    },
    {
      id: 'v8',
      verticalId: 'healthtech',
      subkey: 'peerReviewedStudiesCount',
      label: 'Peer-Reviewed Studies Published',
      description: 'Total peer-reviewed studies citing your product or method.',
      weight: 2,
      control: 'integer',
      unitLabel: 'studies',
      schema: NonNegativeInt,
    },
    {
      id: 'v9',
      verticalId: 'healthtech',
      subkey: 'reimbursementStatus',
      label: 'Reimbursement Status',
      description: 'Current state of payor coverage.',
      weight: 3,
      control: 'select-enum',
      options: REIMBURSEMENT_STATUS_OPTIONS,
      schema: enumFrom(REIMBURSEMENT_STATUS_OPTIONS),
    },
    {
      id: 'v10',
      verticalId: 'healthtech',
      subkey: 'keyOpinionLeadersText',
      label: 'Key Opinion Leaders (KOLs)',
      description: 'Named clinical KOLs supporting / advising on the product.',
      hint: 'Free text — comma-separated names + institutions',
      weight: 1,
      control: 'long-text',
      schema: ShortText,
    },

    // ── ClimateTech (5) ────────────────────────────────────────────────
    {
      id: 'v11',
      verticalId: 'climatetech',
      subkey: 'esgFrameworkAlignment',
      label: 'ESG Framework Alignment',
      description: 'Frameworks you align with or report against.',
      weight: 2,
      control: 'multi-select-enum',
      options: ESG_FRAMEWORK_OPTIONS,
      schema: multiEnumFrom(ESG_FRAMEWORK_OPTIONS),
    },
    {
      id: 'v12',
      verticalId: 'climatetech',
      subkey: 'co2AbatementKgPerGbp',
      label: 'CO₂ Abatement per £ Revenue',
      description: 'Kilograms of CO₂ avoided / removed per £ of revenue.',
      hint: 'The canonical impact metric for climate-tech investors',
      weight: 3,
      control: 'number',
      unitLabel: 'kg CO₂ / £',
      step: 0.01,
      schema: NonNegativeNumber,
    },
    {
      id: 'v13',
      verticalId: 'climatetech',
      subkey: 'impactMethodologyText',
      label: 'Impact Methodology',
      description: 'How is impact calculated — third-party verified, in-house, hybrid?',
      hint: 'Free text — name auditors / standards if relevant',
      weight: 2,
      control: 'long-text',
      schema: ShortText,
    },
    {
      id: 'v14',
      verticalId: 'climatetech',
      subkey: 'lifecycleAssessmentStatus',
      label: 'Lifecycle Assessment Status',
      description: 'State of your LCA (life-cycle assessment) work.',
      weight: 1,
      control: 'select-enum',
      options: LIFECYCLE_ASSESSMENT_OPTIONS,
      schema: enumFrom(LIFECYCLE_ASSESSMENT_OPTIONS),
    },
    {
      id: 'v15',
      verticalId: 'climatetech',
      subkey: 'carbonAccountingTool',
      label: 'Carbon Accounting Tool',
      description: 'Tool / platform used (e.g. Watershed, Persefoni, Sweep).',
      weight: 1,
      control: 'text',
      schema: ShortText,
    },

    // ── PropTech (5) ───────────────────────────────────────────────────
    {
      id: 'v16',
      verticalId: 'proptech',
      subkey: 'propertyDataAccuracyPct',
      label: 'Property Data Accuracy',
      description: 'Validated accuracy vs MLS / public records.',
      weight: 3,
      control: 'percent',
      unitLabel: '%',
      step: 0.1,
      schema: Pct0to100,
    },
    {
      id: 'v17',
      verticalId: 'proptech',
      subkey: 'resoCompliance',
      label: 'MLS RESO Compliance',
      description: 'RESO Data Dictionary alignment.',
      weight: 2,
      control: 'select-enum',
      options: RESO_COMPLIANCE_OPTIONS,
      schema: enumFrom(RESO_COMPLIANCE_OPTIONS),
    },
    {
      id: 'v18',
      verticalId: 'proptech',
      subkey: 'geographicCoverageText',
      label: 'Geographic Coverage',
      description: 'Markets you actively cover.',
      hint: 'e.g. UK + 6 EU markets, or US Tier-1 metros',
      weight: 2,
      control: 'text',
      schema: ShortText,
    },
    {
      id: 'v19',
      verticalId: 'proptech',
      subkey: 'monthlyTransactionVolume',
      label: 'Monthly Transaction Volume',
      description: 'Property transactions processed per month.',
      weight: 2,
      control: 'integer',
      unitLabel: 'transactions',
      schema: NonNegativeInt,
    },
    {
      id: 'v20',
      verticalId: 'proptech',
      subkey: 'dataRefreshCadence',
      label: 'Data Refresh Cadence',
      description: 'How often your property data refreshes.',
      weight: 2,
      control: 'select-enum',
      options: REFRESH_CADENCE_OPTIONS,
      schema: enumFrom(REFRESH_CADENCE_OPTIONS),
    },
  ]);

if (QUANTARA_VERTICAL_FIELDS.length !== QUANTARA_VERTICAL_FIELD_COUNT) {
  throw new Error(
    `Quantara vertical field count drift: array has ${QUANTARA_VERTICAL_FIELDS.length}, expected ${QUANTARA_VERTICAL_FIELD_COUNT}.`,
  );
}

// ── Lookup tables ──────────────────────────────────────────────────────

export const QUANTARA_VERTICAL_FIELDS_BY_ID: Readonly<
  Record<VerticalFieldId, VerticalFieldDefinition>
> = Object.freeze(
  Object.fromEntries(
    QUANTARA_VERTICAL_FIELDS.map((f) => [f.id, f] as const),
  ) as Record<VerticalFieldId, VerticalFieldDefinition>,
);

/**
 * Get the fields owned by a given vertical, in display order. Returns
 * an empty array for `generic` (by design — generic founders see no
 * vertical-specific schedule).
 */
export function getVerticalFieldsForVertical(
  verticalId: VerticalId,
): ReadonlyArray<VerticalFieldDefinition> {
  return QUANTARA_VERTICAL_FIELDS.filter((f) => f.verticalId === verticalId);
}

// ── Per-vertical Zod schema ────────────────────────────────────────────

/**
 * Composite Zod schema validating the vertical values for one
 * vertical. Every field optional. Returns an empty object schema for
 * `generic` (no fields).
 */
export function buildVerticalValuesSchema(
  verticalId: VerticalId,
): z.ZodObject<Record<string, z.ZodOptional<z.ZodType>>> {
  const fields = getVerticalFieldsForVertical(verticalId);
  const shape = Object.fromEntries(
    fields.map((f) => [f.id, f.schema.optional()] as const),
  );
  return z.object(shape);
}

/**
 * Top-level schema validating the full multi-vertical values map. Each
 * vertical's slot is optional; within a slot, every field is optional.
 */
export const VerticalValuesSchema = z.object({
  ai_saas: buildVerticalValuesSchema('ai_saas').optional(),
  healthtech: buildVerticalValuesSchema('healthtech').optional(),
  climatetech: buildVerticalValuesSchema('climatetech').optional(),
  proptech: buildVerticalValuesSchema('proptech').optional(),
  generic: buildVerticalValuesSchema('generic').optional(),
});
