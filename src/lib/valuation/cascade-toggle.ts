// ═══════════════════════════════════════════════════════════════════════
// VALUATION CASCADE TOGGLE
// ═══════════════════════════════════════════════════════════════════════
//
// Controls whether the valuation API runs the full 14-agent cascade
// (document intake → financial extraction → validation → engine →
// Olivia → Cristiano → counter-narrative → pre-mortem) or just the
// raw deterministic math engine.
//
// Priority (highest to lowest):
//   1. DB FeatureToggle "CASCADE_ENABLED" — toggled via admin dashboard
//   2. Env var VALUATION_CASCADE_MODE — legacy fallback
//
// If the DB toggle CASCADE_ENABLED is OFF → always "math" regardless
// of env var. If the DB toggle is ON (or missing/error) → reads env
// var VALUATION_CASCADE_MODE to decide "full" vs "math".
//
// Default: "math" — safe, no LLM costs, current behavior preserved.
// ═══════════════════════════════════════════════════════════════════════

// OB-side adaptation (Track V Session V3, 2026-05-07): the LTM version
// reads a DB-backed feature_toggles table (`isFeatureEnabled`,
// `TOGGLE_KEYS.CASCADE_ENABLED`). OB does not own that infrastructure
// yet — port deferred. The env-var gate is the safe floor: cascade
// stays off unless `VALUATION_CASCADE_MODE=full` is explicitly set.
//
// When OB ports the feature-toggles infrastructure (post-Track-V), this
// file should restore the DB-toggle gate above the env-var check, same
// shape as LTM. Until then the env-var-only path is a strict subset
// of the LTM behaviour.

export type CascadeMode = 'full' | 'math';

/**
 * Check whether the full 14-agent valuation cascade is enabled.
 *
 * Reads env var VALUATION_CASCADE_MODE. Defaults to "math" mode (no
 * LLM cost) for safety. The DB feature-toggle gate is deferred until
 * OB ports the feature-toggles infrastructure.
 */
export async function isFullCascadeEnabled(): Promise<boolean> {
  return (await getCascadeMode()) === 'full';
}

/** Get the current cascade mode as a typed value. */
export async function getCascadeMode(): Promise<CascadeMode> {
  const raw = process.env.VALUATION_CASCADE_MODE?.toLowerCase().trim();
  if (raw !== 'full') return 'math';
  return 'full';
}
