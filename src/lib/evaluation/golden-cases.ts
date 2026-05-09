/**
 * `golden-cases` — Track O Session O2 — eval cases that gate Olivia's
 * release quality.
 *
 * Each case is a (prompt, expected behavior) pair. The expected
 * behavior is a set of acceptance criteria the cascade response must
 * satisfy — which manifest fences should be present, which spoke
 * should the router pick, etc.
 *
 * Designed for offline + online use:
 *   - Offline (vitest) — runs against the cascade in mock mode and
 *     verifies prompt + manifest mechanics, no LLM call.
 *   - Online (CI/admin) — runs against the cascade in live mode and
 *     verifies actual model output. Patronus integration adds
 *     hallucination detection on top.
 *
 * Adding a case: append to GOLDEN_CASES. Use semantic ids; never
 * renumber existing cases (eval reports cite case ids).
 */

import type { SpokeId } from "@/lib/orchestration/spoke-router";

export type ManifestFence = "chart" | "timeline" | "sources" | "gamma";

export interface GoldenCase {
  id: string;
  /** Short human label for reports. */
  label: string;
  /** The prompt sent to the cascade. */
  prompt: string;
  /** Acceptance criteria. ALL must pass for the case to pass. */
  expect: {
    /** Spoke router must classify the prompt as one of these spokes. */
    spoke?: readonly SpokeId[];
    /** Response must include at least one of these manifest fences.
     *  Empty array = the case explicitly forbids manifest fences. */
    manifests?: readonly ManifestFence[];
    /** Response text must contain at least one of these substrings
     *  (case-insensitive). */
    mustContain?: readonly string[];
    /** Response text must NOT contain any of these substrings. */
    mustNotContain?: readonly string[];
    /** Maximum total cascade duration in ms. Default 30s. */
    maxDurationMs?: number;
  };
}

export const GOLDEN_CASES: readonly GoldenCase[] = [
  {
    id: "chart-funding-by-stage",
    label: "Chart manifestation — funding by stage",
    /* Atomico-named so the spoke router classifies as london_tech.
     * (Generic "Series A in London" hits the broader generic pattern.) */
    prompt:
      "Show me a bar chart of typical Atomico-led Series A round sizes by sector in 2026.",
    expect: {
      spoke: ["london_tech"],
      manifests: ["chart"],
      maxDurationMs: 30_000,
    },
  },
  {
    id: "timeline-cardiac-rehab",
    label: "Timeline manifestation — cardiac rehab schedule",
    prompt:
      "What's the post-CABG cardiac rehab schedule for week 1 to week 12?",
    expect: {
      spoke: ["heart_recovery"],
      manifests: ["timeline"],
      mustContain: ["cardiologist"],
      maxDurationMs: 30_000,
    },
  },
  {
    id: "sources-relocation-cost",
    label: "Sources manifest — Lisbon relocation cost",
    prompt:
      "Compare cost of living for relocating from London to Lisbon. Cite Numbeo.",
    expect: {
      spoke: ["relocation"],
      manifests: ["sources"],
      mustContain: ["numbeo"],
      maxDurationMs: 30_000,
    },
  },
  {
    id: "transit-route",
    label: "Spoke routing — London Transit",
    prompt: "Best way to get from King's Cross to Heathrow on a Sunday evening?",
    expect: {
      spoke: ["london_transit"],
      maxDurationMs: 20_000,
    },
  },
  {
    id: "fl-real-estate",
    label: "Spoke routing — Florida real estate",
    prompt: "What are doc stamp costs on a $500k Sarasota condo purchase?",
    expect: {
      spoke: ["fl_realestate"],
      mustContain: ["doc stamp", "florida"],
      maxDurationMs: 30_000,
    },
  },
  {
    id: "qualitative-no-chart",
    label: "Qualitative answer — must NOT manufacture a chart",
    prompt: "Explain in plain English why moats matter at Series B.",
    expect: {
      spoke: ["general", "london_tech"],
      manifests: [],
      mustNotContain: ["```chart"],
      maxDurationMs: 20_000,
    },
  },
  {
    id: "general-fallback",
    label: "General fallback — small-talk routes to general",
    prompt: "Hi, how's it going?",
    expect: {
      spoke: ["general"],
      maxDurationMs: 15_000,
    },
  },
  {
    id: "gamma-deck-preview",
    label: "Gamma manifestation — Series A deck request",
    prompt:
      "Generate a Gamma deck for a Series A pitch by a London fintech founder targeting Atomico.",
    expect: {
      spoke: ["london_tech"],
      manifests: ["gamma"],
      maxDurationMs: 30_000,
    },
  },
  {
    id: "xscore-comparison",
    label: "Spoke routing — xscore two-city comparison",
    prompt: "Compare Madrid versus Barcelona for tech founders using lifescore.",
    expect: {
      spoke: ["xscore"],
      maxDurationMs: 25_000,
    },
  },
  {
    id: "vertical-ai-saas-diligence",
    label: "Vertical addendum — AI/SaaS diligence patterns",
    prompt:
      "Walk me through the 5 buyer-side risks Atomico evaluates first when a Series A AI/SaaS founder pitches.",
    expect: {
      spoke: ["london_tech"],
      mustContain: ["model"],
      maxDurationMs: 30_000,
    },
  },
];

export const GOLDEN_CASE_BY_ID: Record<string, GoldenCase> = Object.freeze(
  Object.fromEntries(GOLDEN_CASES.map((c) => [c.id, c])),
);
