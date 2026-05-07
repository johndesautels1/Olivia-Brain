/**
 * Cristiano → Valuation bridge.
 *
 * Translates a `CristianoMatch.valuationSynergy` payload (Pass-2 Opus output)
 * into the `StrategicSynergyInputs` shape the valuation engine consumes via
 * `bridge.buildValuationInput({ strategicSynergy })`.
 *
 * The match payload optionally includes a fourth field — `synergyRationale` —
 * that the engine itself does not use, but downstream UI surfaces (the
 * `ValuationLetter`, the `WarRoom` briefing, the `EvidenceRoom`) can render.
 * Callers that need the rationale should read it directly off the match.
 */

import type { CristianoMatch } from "./cristiano";
import type { StrategicSynergyInputs } from "@/lib/valuation/types";

/**
 * Project a Cristiano match's `valuationSynergy` block onto the engine's
 * `StrategicSynergyInputs` shape. Returns `undefined` when the match did
 * not carry synergy data (the engine will fall back to its sector default).
 */
export function cristianoMatchToSynergyInputs(
  match: CristianoMatch,
): StrategicSynergyInputs | undefined {
  const v = match.valuationSynergy;
  if (!v) return undefined;
  return {
    annualSynergyValue: v.annualSynergyValue,
    synergyRealizationProbability: v.synergyRealizationProbability,
    buyerPremiumPct: v.buyerPremiumPct,
  };
}

/**
 * Pick the most synergistic match from a Cristiano result and translate
 * its valuation-synergy payload to engine inputs. Used by the bridge when
 * the caller wants "Olivia's preferred buyer" baked into the run.
 *
 * Selection rule: highest `matchVectors.valuationSynergyFit`. Ties broken
 * by overall `matchScore`.
 */
export function pickBestSynergyMatch(
  matches: CristianoMatch[],
): { match: CristianoMatch; synergy: StrategicSynergyInputs } | undefined {
  const withSynergy = matches.filter((m) => m.valuationSynergy);
  if (withSynergy.length === 0) return undefined;

  const sorted = [...withSynergy].sort((a, b) => {
    const fitDelta =
      b.matchVectors.valuationSynergyFit - a.matchVectors.valuationSynergyFit;
    if (fitDelta !== 0) return fitDelta;
    return b.matchScore - a.matchScore;
  });

  const best = sorted[0];
  const synergy = cristianoMatchToSynergyInputs(best);
  if (!synergy) return undefined;
  return { match: best, synergy };
}
