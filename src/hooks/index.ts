/**
 * OLIVIA BRAIN — Custom React Hooks
 *
 * Reusable hooks for studio interfaces.
 */

export { useAutoSave } from "./useAutoSave";
export { useKeyboardNav, useArrowNav } from "./useKeyboardNav";
export { useScoreChips } from "./useScoreChips";
export { useHomeDashboard, type KpiBlock, type RecentItem, type DashboardSnap } from "./useHomeDashboard";
export { useCommandPalette, type CommandPaletteState } from "./useCommandPalette";
export {
  usePitchConfig,
  PITCH_PERSONAS,
  type PitchConfig,
  type InvestorPersonaKey as PitchInvestorPersonaKey,
  type UsePitchConfigState,
} from "./usePitchConfig";
