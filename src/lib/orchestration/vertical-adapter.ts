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
    status: "final",
    systemPromptAddendum: [
      "HealthTech context. Regulatory pathway is the gating risk; clinical evidence drives value; reimbursement is the exit condition. Treat these five as the diligence frame:",
      "1. Regulatory pathway — UK MHRA route (UKCA / UK MDR) and FDA route (510(k) / De Novo / PMA / breakthrough designation) carry very different timelines and risk. Name the route and stage explicitly; vague 'pursuing approval' answers fail diligence.",
      "2. Clinical evidence — trial stage (preclinical → Phase I → II → III → real-world evidence) is the value-driver. Pair every claim with sample size, primary endpoint, and statistical significance (p-values, confidence intervals, NNT/NNH where relevant).",
      "3. Peer-reviewed publications — count published studies in indexed journals; KOL co-authorship multiplies credibility. Conference abstracts are not peer review.",
      "4. Reimbursement — CPT code coverage, UK NICE technology appraisal, EU HTA process. Without a reimbursement path, even FDA-cleared products stall at commercialization.",
      "5. KOL adoption — named clinical advocates at top-3 institutions in the indication move enterprise sales; quantify KOL letters of support and pilot sites.",
      "On metrics, lead with treated patients + clinical-effect size, not user signups. On HIPAA/GDPR, expect to discuss data residency, consent capture, and right-to-erasure flow.",
    ].join(" "),
    /* Perplexity for regulatory citations; Sonnet for clinical narrative. */
    preferredProviders: ["perplexity", "anthropic", "google"],
  },
  climatetech: {
    vertical: "climatetech",
    status: "final",
    systemPromptAddendum: [
      "ClimateTech context. ESG framework alignment determines whether PE / strategic capital can deploy; CO₂ abatement per £ revenue is the canonical impact metric. Treat these five as the diligence frame:",
      "1. Framework alignment — TCFD (climate-related financial disclosures), SBTi (science-based targets), CDP (carbon disclosure), GHG Protocol (scope 1/2/3). State which frameworks the company reports against and whether scope 3 is included.",
      "2. CO₂ abatement intensity — tonnes CO₂e avoided per £1 revenue (or per unit deployed). Without this, climate impact is unquantified storytelling.",
      "3. Lifecycle assessment (LCA) — cradle-to-grave or cradle-to-gate? ISO 14040/14044 compliant? Third-party verified? An unverified LCA is a red flag at Series B+.",
      "4. Carbon accounting tool — Watershed / Persefoni / Sweep / Greenly are the buyers' reference points. State the company's tool of choice or in-house methodology.",
      "5. Permanence + additionality — for offsets/removals, decade-scale permanence (geologic > biologic > avoided emissions) and verifiable additionality determine credit quality.",
      "On metrics, lead with abatement curve + LCOE/LCOH (levelized cost) where applicable. Avoid 'green' branding without numbers.",
    ].join(" "),
    preferredProviders: ["anthropic", "perplexity", "google"],
  },
  proptech: {
    vertical: "proptech",
    status: "final",
    systemPromptAddendum: [
      "PropTech context. Data accuracy + RESO compliance gate enterprise contracts; geographic coverage + transaction volume are the quantitative scale signals. Treat these five as the diligence frame:",
      "1. Data accuracy benchmark — for AVMs / valuations: median absolute percentage error (MAPE) vs ground-truth sale price, and percentage of estimates within ±5% / ±10% / ±20% (the FPR thresholds Zillow/Redfin/Rightmove publish).",
      "2. RESO compliance — Data Dictionary version, Web API certification (Bronze / Silver / Gold / Platinum), and direct MLS integrations vs scraped feeds. Direct + Platinum gates US enterprise deals.",
      "3. Geographic coverage — quote MSAs (US) / postcode districts (UK) covered, with refresh cadence per region. National-coverage claims should disaggregate to coverage map.",
      "4. Transaction volume — annualized £/$ GMV influenced (for marketplaces) or homes valued (for AVMs). Include a y/y growth rate and concentration: top-5 customer revenue share.",
      "5. Refresh cadence — daily / weekly / monthly listing-data refresh, and median lag from MLS publication to platform availability. Sub-24h is the enterprise floor.",
      "On metrics, lead with annualized transaction volume and customer concentration. Mortgage / title / insurance integrations multiply enterprise stickiness — quantify them.",
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
