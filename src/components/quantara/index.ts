/**
 * Quantara Q2 — barrel export.
 *
 * Public surface for the founder-intake form UI. The `/founder-intake`
 * page (`src/app/founder-intake/page.tsx`) and the API route
 * (`src/app/api/founder-intake/route.ts`) consume from here so the
 * underlying file structure stays free to evolve.
 */
export {
  isFilled,
  overallCompleteness,
  sectionCompleteness,
  allSectionCompleteness,
  type CompletenessSummary,
} from "./completeness";

export {
  QUANTARA_FIELD_UI_META,
  type QuantaraFieldControlKind,
  type QuantaraFieldUiMeta,
} from "./field-ui-meta";

export {
  QUANTARA_SECTION_UI_META,
  type QuantaraSectionUiMeta,
} from "./section-meta";

export { IntakeField, type IntakeFieldProps } from "./IntakeField";
export {
  IntakeSectionBlock,
  type IntakeSectionBlockProps,
} from "./IntakeSectionBlock";
export {
  IntakeSupplementaryBlock,
  type IntakeSupplementaryBlockProps,
} from "./IntakeSupplementaryBlock";
export {
  IntakeSupplementaryField,
  type IntakeSupplementaryFieldProps,
} from "./IntakeSupplementaryField";
export {
  IntakeSidebar,
  type IntakeSidebarProps,
  type AutoFillState,
} from "./IntakeSidebar";
export {
  IntakeOliviaPanel,
  type IntakeOliviaPanelProps,
} from "./IntakeOliviaPanel";
export {
  IntakeVerdictPanel,
  type IntakeVerdictPanelProps,
} from "./IntakeVerdictPanel";
export { IntakeForm, type IntakeFormProps } from "./IntakeForm";
