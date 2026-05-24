/**
 * `src/lib/regulatory-config` — barrel re-export.
 *
 * Single import point for every regulatory / market constant the
 * codebase consumes. New regulatory regimes land as sibling modules
 * + add their re-export here. Per Architecture Standards Law 6
 * (`~/CLAUDE.md`): inline regulatory constants (`SEIS_LIMITS = {...}`
 * style) are forbidden in agent / route code; every threshold,
 * cap, or statutory limit comes from this directory with a
 * `validUntil` field for stale-detection.
 *
 * Held to Apple / IBM / Microsoft / Google 2026 leading coding
 * practices per `~/CLAUDE.md` and
 * `docs/api-specs/_MASTER_REGISTER.md` section 10.4.
 */

export {
  UK_MODERN_SLAVERY,
  formatUkModernSlaveryThreshold,
  type UkModernSlavery,
} from "./uk-modern-slavery";
