/**
 * Intent classification — one source of truth for routing chat turns.
 *
 * Used by:
 * - `/api/chat` via `phase1-graph.ts` (LangGraph experiment surface)
 * - `/api/olivia/chat` (production chat endpoint)
 *
 * v1 — regex-based, deterministic, English-only. Order matters: we match
 * the most specific keywords first (judge / math / questionnaire) before
 * the looser ones (planning / research / operations). The `general`
 * fallback catches anything else.
 *
 * TODO(week-2 / Session 19+): replace the regex classifier with an LLM-routed
 * one so we handle paraphrases ("show me the latest funding round" →
 * `research`), surface a confidence score, and return a probability
 * distribution for ambiguous queries. Tracked in `MERGE_PLAN.md` Phase 2.
 */

import type { RouteIntent } from "@/lib/foundation/types";

const PATTERNS: ReadonlyArray<{ readonly intent: RouteIntent; readonly regex: RegExp }> =
  Object.freeze([
    {
      intent: "judge",
      regex: /(judge|verdict|final decision|lifescore|cristiano|ruling)/,
    },
    {
      intent: "math",
      regex: /(calculate|equation|math|formula|percentage|ratio|average|sum|multiply|divide)/,
    },
    {
      intent: "questionnaire",
      regex: /(questionnaire|survey|preference|biographical|profile|intake|onboarding)/,
    },
    {
      intent: "planning",
      regex: /(phase|roadmap|build|architecture|stack|scaffold|implement|system|design)/,
    },
    {
      intent: "research",
      regex: /(research|cite|compare|latest|market|source|web|news)/,
    },
    {
      intent: "operations",
      regex: /(crm|hubspot|email|calendar|lead|pipeline|outreach|inbox)/,
    },
  ]);

/**
 * Classify a user message into a {@link RouteIntent}. Returns `"general"`
 * when nothing more specific matches — the cascade will pick the default
 * provider order for that intent.
 *
 * Pure function. Case-insensitive. Never throws.
 */
export function inferIntent(message: string): RouteIntent {
  const normalized = message.toLowerCase();
  for (const { intent, regex } of PATTERNS) {
    if (regex.test(normalized)) return intent;
  }
  return "general";
}
