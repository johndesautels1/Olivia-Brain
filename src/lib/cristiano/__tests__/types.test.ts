/**
 * `lib/cristiano/types` — discriminated-union schema tests.
 *
 * Covers:
 *   - `CRISTIANO_VERDICT_KINDS` tuple stability
 *   - `CristianoVerdictKindSchema` accept/reject set
 *   - `isCristianoVerdictKind` type guard
 *   - Request schema for each kind (startup_match / city_compare / freeform)
 *   - Verdict body schema for each kind
 *   - `parseVerdictRequest` Result discriminated union
 *   - `parseVerdictBody` Result discriminated union
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import { describe, expect, it } from "vitest";

import {
  CRISTIANO_VERDICT_KINDS,
  CristianoVerdictKindSchema,
  CristianoSourceAppSchema,
  CristianoStartupMatchRequestSchema,
  CristianoCityCompareRequestSchema,
  CristianoFreeformRequestSchema,
  CristianoStartupMatchVerdictSchema,
  CristianoCityCompareVerdictSchema,
  CristianoFreeformVerdictSchema,
  isCristianoVerdictKind,
  parseVerdictBody,
  parseVerdictRequest,
} from "@/lib/cristiano/types";

describe("lib/cristiano/types — kind tuple + schema", () => {
  it("exposes the stable verdict-kind tuple", () => {
    expect(CRISTIANO_VERDICT_KINDS).toEqual([
      "startup_match",
      "city_compare",
      "freeform",
    ]);
  });

  it("Zod kind schema accepts every member of the tuple", () => {
    for (const kind of CRISTIANO_VERDICT_KINDS) {
      expect(CristianoVerdictKindSchema.parse(kind)).toBe(kind);
    }
  });

  it("Zod kind schema rejects unknown kinds", () => {
    expect(CristianoVerdictKindSchema.safeParse("not_a_kind").success).toBe(false);
    expect(CristianoVerdictKindSchema.safeParse(42).success).toBe(false);
    expect(CristianoVerdictKindSchema.safeParse(null).success).toBe(false);
    expect(CristianoVerdictKindSchema.safeParse(undefined).success).toBe(false);
  });

  it("type-guard narrows correctly", () => {
    expect(isCristianoVerdictKind("startup_match")).toBe(true);
    expect(isCristianoVerdictKind("city_compare")).toBe(true);
    expect(isCristianoVerdictKind("freeform")).toBe(true);
    expect(isCristianoVerdictKind("not_a_kind")).toBe(false);
    expect(isCristianoVerdictKind("")).toBe(false);
  });
});

describe("lib/cristiano/types — source app enum", () => {
  it("accepts ob + known consumer apps", () => {
    expect(CristianoSourceAppSchema.parse("ob")).toBe("ob");
    expect(CristianoSourceAppSchema.parse("ltm")).toBe("ltm");
    expect(CristianoSourceAppSchema.parse("lifescore")).toBe("lifescore");
    expect(CristianoSourceAppSchema.parse("cluesintelligence")).toBe(
      "cluesintelligence",
    );
  });

  it("rejects unknown apps", () => {
    expect(CristianoSourceAppSchema.safeParse("random-app").success).toBe(false);
  });
});

// ─── Request schemas ──────────────────────────────────────────────────────────

describe("lib/cristiano/types — startup_match request", () => {
  it("accepts a minimal valid request", () => {
    const result = CristianoStartupMatchRequestSchema.safeParse({
      paragraphs: { p1: "We make fintech.", p2: "Compliance and rails." },
      metadata: {
        legalName: "Acme Ltd",
        fundingRound: "seed",
        sectorTags: ["fintech"],
      },
      outreachGoal: "fundraising",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing metadata", () => {
    const result = CristianoStartupMatchRequestSchema.safeParse({
      paragraphs: { p1: "x" },
      outreachGoal: "fundraising",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-string paragraph values", () => {
    const result = CristianoStartupMatchRequestSchema.safeParse({
      paragraphs: { p1: 42 },
      metadata: { legalName: "x", fundingRound: "seed", sectorTags: [] },
      outreachGoal: "fundraising",
    });
    expect(result.success).toBe(false);
  });
});

describe("lib/cristiano/types — city_compare request", () => {
  it("accepts a minimal valid request", () => {
    const result = CristianoCityCompareRequestSchema.safeParse({
      city1: "London",
      city2: "Paris",
    });
    expect(result.success).toBe(true);
  });

  it("accepts precomputed scores", () => {
    const result = CristianoCityCompareRequestSchema.safeParse({
      city1: "London",
      city2: "Paris",
      precomputedScores: {
        city1Score: 82,
        city2Score: 76,
        overallAgreement: 75,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty city names", () => {
    expect(
      CristianoCityCompareRequestSchema.safeParse({ city1: "", city2: "Paris" })
        .success,
    ).toBe(false);
  });

  it("rejects scores outside 0-100", () => {
    expect(
      CristianoCityCompareRequestSchema.safeParse({
        city1: "London",
        city2: "Paris",
        precomputedScores: { city1Score: 150, city2Score: -5 },
      }).success,
    ).toBe(false);
  });
});

describe("lib/cristiano/types — freeform request", () => {
  it("accepts a minimal valid request", () => {
    const result = CristianoFreeformRequestSchema.safeParse({
      question: "Should we hire a CTO this quarter?",
    });
    expect(result.success).toBe(true);
  });

  it("rejects question shorter than 8 chars", () => {
    expect(
      CristianoFreeformRequestSchema.safeParse({ question: "Hi?" }).success,
    ).toBe(false);
  });

  it("rejects question longer than 2000 chars", () => {
    expect(
      CristianoFreeformRequestSchema.safeParse({ question: "x".repeat(2001) })
        .success,
    ).toBe(false);
  });

  it("rejects more than 8 criteria", () => {
    expect(
      CristianoFreeformRequestSchema.safeParse({
        question: "Should we hire a CTO?",
        criteria: Array.from({ length: 9 }, (_, i) => `c${i}`),
      }).success,
    ).toBe(false);
  });
});

// ─── Verdict body schemas ─────────────────────────────────────────────────────

describe("lib/cristiano/types — startup_match verdict body", () => {
  it("accepts a valid verdict body", () => {
    const result = CristianoStartupMatchVerdictSchema.safeParse({
      spokenScript: "Based on your fintech platform, I rank Sequoia first.",
      verdictTitle: "Top 3 matches for Acme Ltd",
      confidence: "high",
      companyProfile: { companyName: "Acme Ltd", sector: ["fintech"], stage: "seed" },
      topMatches: [
        {
          organizationId: "org_1",
          organizationName: "Sequoia Capital",
          rank: 1,
          matchScore: 87,
          rationale: "Strong sector fit.",
          strengths: ["Sector alignment", "Stage fit"],
          concerns: ["High bar for traction"],
          approachStrategy: "Lead with traction metrics.",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty topMatches array", () => {
    expect(
      CristianoStartupMatchVerdictSchema.safeParse({
        spokenScript: "x",
        verdictTitle: "y",
        confidence: "high",
        companyProfile: { companyName: "x", sector: [], stage: "seed" },
        topMatches: [],
      }).success,
    ).toBe(false);
  });
});

describe("lib/cristiano/types — city_compare verdict body", () => {
  it("accepts a valid verdict body", () => {
    const result = CristianoCityCompareVerdictSchema.safeParse({
      spokenScript: "London takes this round.",
      verdictTitle: "London 82 vs Paris 76",
      confidence: "medium",
      winner: "city1",
      city1Score: 82,
      city2Score: 76,
      margin: 6,
      rationale: "Stronger personal autonomy and business regulation.",
      keyFactors: ["Personal autonomy", "Business regulation"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid winner discriminator", () => {
    expect(
      CristianoCityCompareVerdictSchema.safeParse({
        spokenScript: "x",
        verdictTitle: "y",
        confidence: "high",
        winner: "neither",
        city1Score: 50,
        city2Score: 50,
        margin: 0,
        rationale: "z",
        keyFactors: [],
      }).success,
    ).toBe(false);
  });
});

describe("lib/cristiano/types — freeform verdict body", () => {
  it("accepts a valid verdict body", () => {
    const result = CristianoFreeformVerdictSchema.safeParse({
      spokenScript: "Hire the CTO after Series A closes.",
      verdictTitle: "Timing the CTO hire",
      confidence: "medium",
      recommendation: "Delay until post-Series A.",
      rationale: "Cash runway constraint.",
      keyFactors: ["Runway", "Stage signal"],
    });
    expect(result.success).toBe(true);
  });
});

// ─── Result-style validators ──────────────────────────────────────────────────

describe("lib/cristiano/types — parseVerdictRequest", () => {
  it("returns ok:true for a valid startup_match envelope", () => {
    const result = parseVerdictRequest({
      kind: "startup_match",
      payload: {
        paragraphs: { p1: "We make fintech." },
        metadata: { legalName: "Acme Ltd", fundingRound: "seed", sectorTags: [] },
        outreachGoal: "fundraising",
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe("startup_match");
    }
  });

  it("returns ok:false for an unknown kind", () => {
    const result = parseVerdictRequest({
      kind: "not_a_kind",
      payload: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it("returns ok:false for a kind-payload mismatch", () => {
    // city_compare envelope with startup_match payload — payload schema fails.
    const result = parseVerdictRequest({
      kind: "city_compare",
      payload: {
        paragraphs: { p1: "x" },
        metadata: { legalName: "x", fundingRound: "seed", sectorTags: [] },
        outreachGoal: "fundraising",
      },
    });
    expect(result.ok).toBe(false);
  });
});

describe("lib/cristiano/types — parseVerdictBody", () => {
  it("returns ok:true for a valid freeform body envelope", () => {
    const result = parseVerdictBody({
      kind: "freeform",
      body: {
        spokenScript: "Delay until post-Series A.",
        verdictTitle: "Timing the CTO hire",
        confidence: "medium",
        recommendation: "Delay until post-Series A.",
        rationale: "Cash runway constraint.",
        keyFactors: [],
      },
    });
    expect(result.ok).toBe(true);
  });

  it("returns ok:false on body shape mismatch", () => {
    const result = parseVerdictBody({
      kind: "startup_match",
      body: { spokenScript: "x", verdictTitle: "y", confidence: "high" },
    });
    expect(result.ok).toBe(false);
  });
});
