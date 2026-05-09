/**
 * `spoke-router` — detect which of Olivia's 6 product spokes a user
 * query hits and augment the cascade with spoke-specific framing.
 *
 * The 6 spokes (per `OLIVIA_NORTH_STAR.md`):
 *
 *   1. fl_realestate    — Florida Real Estate (clues-property-search)
 *   2. relocation       — International Relocation (cluesintelligence FLAGSHIP)
 *   3. london_tech      — London Tech Ecosystem (clueslondon)
 *   4. xscore           — Two-city comparison metrics (cluesxscore)
 *   5. heart_recovery   — Heart Health Recovery
 *   6. london_transit   — London Transit System
 *
 * Plus `general` — fallback when nothing matches (small-talk,
 * meta questions, multi-spoke queries).
 *
 * Cheap regex detection — order matters. Specific terms win over
 * broad ones (e.g. "MLS" → fl_realestate beats "real estate"-only
 * matches; "Tube" → london_transit beats generic "London").
 *
 * Surfaced in the streaming chat response as `X-Olivia-Spoke` header
 * so the UI can show a spoke badge in the provenance row.
 */

export type SpokeId =
  | "fl_realestate"
  | "relocation"
  | "london_tech"
  | "xscore"
  | "heart_recovery"
  | "london_transit"
  | "general";

export interface SpokeDescriptor {
  readonly id: SpokeId;
  readonly label: string;
  /** Short framing prepended to the cascade system prompt. */
  readonly addendum: string;
  /** Color token for the UI badge. */
  readonly tone: "aurum" | "aether" | "mint" | "sky" | "amber" | "coral" | "fg";
}

const SPOKES: Record<SpokeId, SpokeDescriptor> = {
  fl_realestate: {
    id: "fl_realestate",
    label: "Florida Real Estate",
    tone: "amber",
    addendum:
      "Florida real-estate context. The user's frame is buyer-broker / new-construction / residential market evaluation. Expect MLS / RESO / property data accuracy questions; closing costs (Florida-specific transfer tax, doc stamps, intangible tax, title insurance); insurance pricing post-Ian / Helene; flood zones and FEMA maps. Cite NAR / Florida Realtors data when available.",
  },
  relocation: {
    id: "relocation",
    label: "International Relocation",
    tone: "aether",
    addendum:
      "International relocation context (cluesintelligence flagship). The user's frame is paragraphical persona derivation → top-3 city / town / neighborhood matching anywhere in the world. Expect questions about visa pathways, cost of living comparisons (Numbeo / Mercer indices), tax residency (183-day rules + treaty networks), schooling, healthcare, language barriers, climate fit, and persona-to-city distance scoring on the canonical 23-module / 100-metric per category framework.",
  },
  london_tech: {
    id: "london_tech",
    label: "London Tech Ecosystem",
    tone: "aurum",
    addendum:
      "London tech ecosystem context (clueslondon). The user's frame is capital matching / pitch decks / business plans / Studio Olivia / Gamma presentations. Expect questions about Atomico / Index / Balderton / a16z London / Octopus Ventures / Seedcamp / specific named investors; Tech Nation / TechHub / Level39 / Founders Forum; sector clusters (King's Cross AI, Shoreditch design, Canary Wharf fintech); London Tech Week, Slush, SaaStr; pitch-deck archetypes + investor-readiness diligence.",
  },
  xscore: {
    id: "xscore",
    label: "Two-city Comparison",
    tone: "sky",
    addendum:
      "Two-city xscore comparison context. The user's frame is a 23-module catalog of comparison metrics — lifescore, cluestransitscore, cluesenvironmentalscore, etc. — each comparing 2 cities on 100 metrics within one category. Frame answers as side-by-side comparisons with explicit metric breakdowns. Avoid generic 'depends on preferences' answers; pick a winner based on weighted metrics.",
  },
  heart_recovery: {
    id: "heart_recovery",
    label: "Heart Health Recovery",
    tone: "coral",
    addendum:
      "Heart health recovery context (Heart-Recovery-Calendar). The user is in cardiac rehab / post-MI / post-CABG / heart-failure recovery. Frame answers around clinically validated rehab pathways (NICE / AHA / ESC guidelines), structured exercise progression (METs / target HR), nutrition (Mediterranean / DASH), medication adherence, and red-flag symptoms. NEVER replace a clinician — add 'discuss with your cardiologist' to every clinical claim.",
  },
  london_transit: {
    id: "london_transit",
    label: "London Transit",
    tone: "mint",
    addendum:
      "London transit context. The user's frame is TfL services — Tube / Overground / Elizabeth Line / DLR / National Rail / buses / cycle hire. Expect questions about line status, journey planning, Oyster / contactless capping, accessibility (step-free stations), and night services. Quote specific line names + station names.",
  },
  general: {
    id: "general",
    label: "General",
    tone: "fg",
    addendum: "",
  },
};

export function getSpokeDescriptor(id: SpokeId): SpokeDescriptor {
  return SPOKES[id];
}

export function listSpokeIds(): readonly SpokeId[] {
  return Object.keys(SPOKES) as SpokeId[];
}

/**
 * Cheap regex detector — order tuned so specific terms beat generic.
 */
export function detectSpokeFromMessage(
  message: string | null | undefined,
): SpokeId {
  if (!message) return "general";
  const lc = message.toLowerCase();

  /* Heart recovery first — clinical context overrides everything. */
  if (
    /\b(post[\s-]?mi|cabg|cardiac rehab|heart attack|heart failure|stent|valve replacement|ejection fraction|metoprolol|warfarin|met[s]?\b.*\bexercise|cardiologist)/i.test(
      lc,
    )
  ) {
    return "heart_recovery";
  }

  /* Florida real estate — MLS / FL-specific tax + insurance terms. */
  if (
    /\b(florida|fl |mls|reso|nar |zillow |redfin |buyer[\s-]?broker|fha\b|va loan|fema|flood zone|doc stamp|hurricane|miami|tampa|orlando|jacksonville|sarasota|naples)/i.test(
      lc,
    )
  ) {
    return "fl_realestate";
  }

  /* London transit — Tube / line names. */
  if (
    /\b(tube\b|overground|elizabeth line|dlr\b|night tube|tfl\b|oyster\b|contactless\b.*\b(?:cap|fare)|(?:victoria|northern|piccadilly|circle|district|metropolitan|jubilee|bakerloo|central|hammersmith|waterloo)[\s-]?line|paddington|king[' ]?s cross st pancras|liverpool street|stratford|station)/i.test(
      lc,
    )
  ) {
    return "london_transit";
  }

  /* London tech — VC names + clusters + tech-week. */
  if (
    /\b(atomico|balderton|index ventures|seedcamp|octopus ventures|techhub|level39|king'?s cross|shoreditch|silicon roundabout|canary wharf|london tech week|founders forum|techcrunch london|cambridge\b.*\btech)/i.test(
      lc,
    )
  ) {
    return "london_tech";
  }

  /* Relocation — visa / cost-of-living / two-country comparisons. */
  if (
    /\b(relocat|visa\b|tax residency|183[\s-]?day|numbeo|mercer index|cost of living|expat|move from .+ to|moving to|living in .+ vs|emigrat|cross[\s-]?border|nomad)/i.test(
      lc,
    )
  ) {
    return "relocation";
  }

  /* Xscore — explicit two-city comparison framing. */
  if (
    /\b(compare .+ (vs|versus|to) .+|lifescore|cluesxscore|cluestransitscore|cluesenvironmentalscore|two[\s-]?city|side[\s-]?by[\s-]?side .* (?:cities|cities|cities))/i.test(
      lc,
    )
  ) {
    return "xscore";
  }

  return "general";
}

/**
 * Resolve full descriptor in one call.
 */
export function resolveSpoke(
  message: string | null | undefined,
  explicitSpoke?: SpokeId,
): SpokeDescriptor {
  if (explicitSpoke) return SPOKES[explicitSpoke];
  return SPOKES[detectSpokeFromMessage(message)];
}
