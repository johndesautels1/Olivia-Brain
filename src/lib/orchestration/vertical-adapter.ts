/**
 * `vertical-adapter` — Track J Session 25 (AI/SaaS first; S26 follow-on
 * for HealthTech / ClimateTech / PropTech).
 *
 * The Quantara metamorphic catalog already defines 5 verticals
 * (`lib/quantara/metamorphic/vertical-types.ts`) — this adapter takes
 * a vertical id and produces a system-prompt addendum that augments
 * the cascade's base prompt with vertical-specific framing:
 *
 *   - what diligence questions sophisticated investors at this
 *     vertical's tier ask first
 *   - what fields/metrics carry decision weight
 *   - what risks dominate the buy/sell decision
 *
 * It also returns provider preference hints — some verticals benefit
 * from a different cascade order (HealthTech wants Perplexity Sonar
 * for regulatory citations; PropTech wants Tavily for property data).
 *
 * Detection: callers can pass a vertical id directly OR rely on
 * `detectVerticalFromIndustry(industry)` to fuzzy-match free-form
 * industry strings (`"AI / SaaS"` → `"ai_saas"`).
 *
 * S25 ships AI/SaaS specifically; the other 3 verticals have
 * placeholder addenda that say "draft pending S26" so the contract
 * is in place but doesn't ship half-baked content.
 */

import type { VerticalId } from "@/lib/quantara/metamorphic/vertical-types";
import type { ProviderId } from "@/lib/foundation/types";

export interface VerticalAddendum {
  /** The vertical this addendum applies to. */
  vertical: VerticalId;
  /** Concatenated to the cascade system prompt. */
  systemPromptAddendum: string;
  /** Optional provider preference — if present, takes precedence over
   *  the intent's default ordering. */
  preferredProviders?: readonly ProviderId[];
  /** Whether this vertical's addendum is finalized vs draft. S25 ships
   *  AI/SaaS as final; S26 promotes the other 3. */
  status: "final" | "draft";
}

const PLACEHOLDER_ADDENDUM = "Use the canonical 56-field Quantara framing for this vertical until per-vertical guidance lands in S26.";

const ADDENDA: Record<VerticalId, VerticalAddendum> = {
  ai_saas: {
    vertical: "ai_saas",
    status: "final",
    systemPromptAddendum: [
      "AI/SaaS context. Atomico / a16z / Index-tier investors evaluate AI startups on five buyer-side risks before anything else:",
      "1. Model provenance — is the underlying model proprietary, fine-tuned, or wrapped? Founders who say 'GPT-4 wrapper' lose credibility; clarify what's owned vs licensed.",
      "2. Training-data moat — what data trains or differentiates the model, and who else can access it?",
      "3. Eval framework — how is quality measured? Without a published eval, all model claims are unfalsifiable.",
      "4. Hallucination posture — the #1 buyer-side concern. Cite refusal rates, citation grounding, and human-in-the-loop where present.",
      "5. Inference cost-to-revenue ratio — at scale, COGS dominate margins; quote this when known.",
      "On metrics, lead with ARR + net dollar retention, not GMV or signups; investors at this tier discount vanity metrics.",
      "On moat, be specific: data network effects, switching costs, embedded workflows, regulated context. 'Better UX' is not a moat at Series A+.",
    ].join(" "),
    /* Sonnet primary works well for narrative; Perplexity for current
     * benchmark numbers when discussing eval frameworks. */
    preferredProviders: ["anthropic", "openai", "perplexity", "google"],
  },
  healthtech: {
    vertical: "healthtech",
    status: "draft",
    systemPromptAddendum: [
      "HealthTech context. Regulatory pathway (UK MHRA / FDA) is the gating risk; clinical evidence drives value; reimbursement is the exit condition.",
      PLACEHOLDER_ADDENDUM,
    ].join(" "),
    /* Perplexity for regulatory citations; Sonnet for clinical narrative. */
    preferredProviders: ["perplexity", "anthropic", "google"],
  },
  climatetech: {
    vertical: "climatetech",
    status: "draft",
    systemPromptAddendum: [
      "ClimateTech context. ESG framework alignment determines whether PE/strategic capital can deploy; CO₂ abatement per £ revenue is the canonical impact metric.",
      PLACEHOLDER_ADDENDUM,
    ].join(" "),
    preferredProviders: ["anthropic", "perplexity", "google"],
  },
  proptech: {
    vertical: "proptech",
    status: "draft",
    systemPromptAddendum: [
      "PropTech context. Data accuracy + RESO compliance gate enterprise contracts; geographic coverage + transaction volume are the quantitative scale signals.",
      PLACEHOLDER_ADDENDUM,
    ].join(" "),
    /* Tavily for property/market data; Perplexity for cited research. */
    preferredProviders: ["anthropic", "perplexity", "openai"],
  },
  generic: {
    vertical: "generic",
    status: "final",
    systemPromptAddendum: "",
  },
};

export function getVerticalAddendum(vertical: VerticalId): VerticalAddendum {
  return ADDENDA[vertical];
}

/**
 * Fuzzy-match a free-form industry string to a VerticalId. Cheap regex
 * patterns; not LLM-driven. Returns `null` when nothing matches so the
 * caller can fall back to `generic` explicitly.
 */
export function detectVerticalFromIndustry(industry: string | null | undefined): VerticalId | null {
  if (!industry) return null;
  const lc = industry.toLowerCase();

  /* Order matters — health terms win over AI when both present so
   * "Health AI" routes to HealthTech, not AI/SaaS. Patterns use a
   * leading word boundary + prefix match (no trailing \b) to handle
   * concatenated forms like "healthtech" / "biotech" / "proptech". */
  if (
    /\b(health|medic|clinic|pharma|biotech|device|fda\b|mhra\b|trial)/i.test(
      lc,
    )
  ) {
    return "healthtech";
  }
  if (
    /\b(climat|carbon|esg\b|emission|sustainab|cleantech|impact|grid|renew)/i.test(
      lc,
    )
  ) {
    return "climatetech";
  }
  if (
    /\b(prop|real[\s-]?estate|reit\b|mls\b|reso\b|housing|residential)/i.test(
      lc,
    )
  ) {
    return "proptech";
  }
  if (
    /\b(ai\b|ml\b|llm\b|saas|software|platform|machine learning|artificial intelligence|gen[\s-]?ai)/i.test(
      lc,
    )
  ) {
    return "ai_saas";
  }
  return null;
}

/**
 * Convenience: detect + get addendum in one call. Returns the generic
 * (empty) addendum when nothing matches so the caller can always
 * concatenate the result without a null check.
 */
export function resolveVerticalAddendum(
  industry: string | null | undefined,
  explicitVertical?: VerticalId,
): VerticalAddendum {
  if (explicitVertical) return ADDENDA[explicitVertical];
  const detected = detectVerticalFromIndustry(industry);
  return ADDENDA[detected ?? "generic"];
}
