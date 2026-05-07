/**
 * Valuation query helpers.
 *
 * `isTestPersonaCompany` is the gate LTM uses to keep the dashboard's
 * Real-Time Heat Map and other live surfaces from picking up
 * QA/test/demo personas (e.g. companies created via the test-persona
 * fixtures). Olivia Brain has no test-persona pipeline yet, so this
 * always returns `false` — every valuation subject is treated as live.
 *
 * Re-implement the real predicate when the test-persona seed lands.
 */
export function isTestPersonaCompany(_companyName: string): boolean {
  return false;
}
