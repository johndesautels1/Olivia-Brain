/**
 * Quantara — section catalog (12 sections, 56 fields total).
 *
 * # Origin
 *
 * Section breakdown taken verbatim from the LTM form
 * (`D:\London-Tech-Map\public\assets\founder-valuation-form.html`):
 *   §  1 Core Financials      14 fields  (f1..f14)
 *   §  2 Capital Structure     4 fields  (f15..f18)
 *   §  3 Funding History       3 fields  (f19..f21)
 *   §  4 Current Round         2 fields  (f22..f23)
 *   §  5 Traction              6 fields  (f24..f29)
 *   §  6 Market                4 fields  (f30..f33)
 *   §  7 IP & Moat             6 fields  (f34..f39)
 *   §  8 Team                  5 fields  (f40..f44)
 *   §  9 Risk Factors          3 fields  (f45..f47)
 *   § 10 Growth Levers         4 fields  (f48..f51)
 *   § 11 Projections           4 fields  (f52..f55)
 *   § 12 Strategic             1 field   (f56)
 *                              ─────────
 *                             56 fields  ✓
 *
 * Display chrome (icons, accent colors) is intentionally NOT here — that
 * lands in Q2 (form UI) where it'll be wired to the Aurum/Aether token
 * system per `docs/01_UI_DESIGN_SYSTEM.md`. The LTM form's `cyan-400`
 * accent is replaced by Aurum gold in the OB rebuild.
 */
import type { QuantaraSection } from './types';
import { QUANTARA_FIELD_COUNT } from './types';

/**
 * Canonical section catalog. Display order is 1-indexed and matches the
 * top-to-bottom order in the LTM form.
 */
export const QUANTARA_SECTIONS: ReadonlyArray<QuantaraSection> = [
  {
    id: 'core_financials',
    code: 'FIN',
    displayOrder: 1,
    title: 'Core Financials',
    description: 'The foundation of every valuation model',
    fieldCount: 14,
  },
  {
    id: 'capital_structure',
    code: 'CAP',
    displayOrder: 2,
    title: 'Capital Structure',
    description: 'Cap table & liquidity position',
    fieldCount: 4,
  },
  {
    id: 'funding_history',
    code: 'FND',
    displayOrder: 3,
    title: 'Funding History',
    description: 'Previous rounds & valuation context',
    fieldCount: 3,
  },
  {
    id: 'current_round',
    code: 'CRR',
    displayOrder: 4,
    title: 'Current Round',
    description: "What you're raising right now",
    fieldCount: 2,
  },
  {
    id: 'traction',
    code: 'TRC',
    displayOrder: 5,
    title: 'Traction',
    description: 'Real usage & revenue signals',
    fieldCount: 6,
  },
  {
    id: 'market',
    code: 'MKT',
    displayOrder: 6,
    title: 'Market',
    description: 'TAM / SAM / SOM & dynamics',
    fieldCount: 4,
  },
  {
    id: 'ip_moat',
    code: 'IPM',
    displayOrder: 7,
    title: 'IP & Moat',
    description: 'Defensibility & competitive advantage',
    fieldCount: 6,
  },
  {
    id: 'team',
    code: 'TEM',
    displayOrder: 8,
    title: 'Team',
    description: 'Human capital & execution risk',
    fieldCount: 5,
  },
  {
    id: 'risk',
    code: 'RSK',
    displayOrder: 9,
    title: 'Risk Factors',
    description: 'Honest assessment for investor transparency',
    fieldCount: 3,
  },
  {
    id: 'growth_levers',
    code: 'GRW',
    displayOrder: 10,
    title: 'Growth Levers',
    description: 'Scalability drivers',
    fieldCount: 4,
  },
  {
    id: 'projections',
    code: 'PRJ',
    displayOrder: 11,
    title: 'Projections',
    description: 'Forward-looking financials',
    fieldCount: 4,
  },
  {
    id: 'strategic',
    code: 'STR',
    displayOrder: 12,
    title: 'Strategic',
    description: 'Exit & long-term vision',
    fieldCount: 1,
  },
];

/**
 * Lookup table by section id. Useful in field-mapping and Q2 UI.
 */
export const QUANTARA_SECTIONS_BY_ID: Readonly<
  Record<QuantaraSection['id'], QuantaraSection>
> = Object.freeze(
  Object.fromEntries(QUANTARA_SECTIONS.map((s) => [s.id, s])) as Record<
    QuantaraSection['id'],
    QuantaraSection
  >,
);

/**
 * Defensive runtime assertion: catalog field counts must sum to the
 * canonical 56. If a future agent adds/removes a section without updating
 * the field set, this catches the drift at module load time.
 */
const _sectionsFieldCountSum = QUANTARA_SECTIONS.reduce(
  (acc, s) => acc + s.fieldCount,
  0,
);
if (_sectionsFieldCountSum !== QUANTARA_FIELD_COUNT) {
  throw new Error(
    `Quantara section field counts sum to ${_sectionsFieldCountSum}, expected ${QUANTARA_FIELD_COUNT}. ` +
      'Update QUANTARA_SECTIONS or QUANTARA_FIELD_COUNT to keep them aligned.',
  );
}
