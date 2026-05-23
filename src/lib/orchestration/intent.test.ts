/**
 * `inferIntent` — intent classifier contract tests.
 *
 * Every chat turn through `/api/chat` and `/api/olivia/chat` goes
 * through this classifier; a regression in intent routing changes
 * which cascade provider order serves the request. Prior to this
 * commit, the function had zero tests.
 *
 * What this file locks down:
 *   - Every one of the 7 intent buckets has a representative happy-
 *     path match (judge / math / questionnaire / planning / research /
 *     operations / general)
 *   - Order-of-specificity: when a message contains keywords from
 *     multiple buckets, the bucket listed earlier in PATTERNS wins
 *     (the contract documented in the file header)
 *   - Case insensitivity (real prompts are mixed-case)
 *   - Edge cases: empty string, whitespace, very long strings,
 *     unicode-light surface (the regex is English-only by design)
 *
 * Pure function — no IO, no mocks needed.
 */

import { describe, it, expect } from "vitest";
import { inferIntent } from "./intent";

// ─────────────────────────────────────────────
// Happy-path: every bucket gets a match
// ─────────────────────────────────────────────

describe("inferIntent — single-bucket matches", () => {
  it("classifies a Cristiano-judge prompt as 'judge'", () => {
    expect(inferIntent("What's Cristiano's final verdict on this deck?")).toBe("judge");
    expect(inferIntent("Render the LifeScore ruling.")).toBe("judge");
  });

  it("classifies a math prompt as 'math'", () => {
    expect(inferIntent("Calculate the average burn over 6 months.")).toBe("math");
    expect(inferIntent("What's the ratio of revenue to expenses?")).toBe("math");
    expect(inferIntent("Sum the funding rounds.")).toBe("math");
  });

  it("classifies a questionnaire prompt as 'questionnaire'", () => {
    expect(inferIntent("Start the onboarding questionnaire.")).toBe("questionnaire");
    expect(inferIntent("Build my founder profile.")).toBe("questionnaire");
  });

  it("classifies a planning prompt as 'planning'", () => {
    expect(inferIntent("Design the system architecture for phase 2.")).toBe("planning");
    expect(inferIntent("Sketch the build roadmap.")).toBe("planning");
  });

  it("classifies a research prompt as 'research'", () => {
    expect(inferIntent("Research the latest fintech market trends.")).toBe("research");
    expect(inferIntent("Compare Stripe and Adyen news this week.")).toBe("research");
  });

  it("classifies an operations prompt as 'operations'", () => {
    expect(inferIntent("Send a follow-up email to my pipeline leads.")).toBe("operations");
    expect(inferIntent("Sync my HubSpot CRM with the outreach inbox.")).toBe("operations");
  });

  it("falls back to 'general' when no pattern matches", () => {
    expect(inferIntent("Hello there.")).toBe("general");
    expect(inferIntent("Tell me a story about a dog.")).toBe("general");
    expect(inferIntent("")).toBe("general");
  });
});

// ─────────────────────────────────────────────
// Order-of-specificity: PATTERNS array order is the contract
// ─────────────────────────────────────────────

describe("inferIntent — specificity ordering", () => {
  it("matches 'judge' before 'math' when both keyword classes are present", () => {
    /* PATTERNS lists judge first; a verdict-with-math prompt routes
     * to judge so Cristiano can make the final call. */
    expect(
      inferIntent("Calculate the average and give me a final verdict."),
    ).toBe("judge");
  });

  it("matches 'math' before 'research' when both are present", () => {
    /* PATTERNS lists math before research; a calculation-with-research
     * prompt routes to math so the calc provider gets selected. */
    expect(
      inferIntent("Compare market sizes and calculate the percentage growth."),
    ).toBe("math");
  });

  it("matches 'questionnaire' before 'planning' when both are present", () => {
    expect(
      inferIntent("Build my founder profile then architect the next steps."),
    ).toBe("questionnaire");
  });

  it("matches 'planning' before 'research' when both are present", () => {
    /* "stack" + "compare" — planning wins because the architecture
     * keyword is more specific than the comparison keyword. */
    expect(
      inferIntent("Design the cascade stack and compare provider options."),
    ).toBe("planning");
  });

  it("matches 'research' before 'operations' when both are present", () => {
    expect(
      inferIntent("Research the latest CRM news for outreach."),
    ).toBe("research");
  });
});

// ─────────────────────────────────────────────
// Case sensitivity + whitespace
// ─────────────────────────────────────────────

describe("inferIntent — normalisation", () => {
  it("matches independent of letter case", () => {
    expect(inferIntent("CALCULATE the IRR.")).toBe("math");
    expect(inferIntent("Calculate the IRR.")).toBe("math");
    expect(inferIntent("calculate the irr.")).toBe("math");
  });

  it("classifies leading/trailing whitespace correctly", () => {
    expect(inferIntent("   research the market   ")).toBe("research");
  });

  it("classifies whitespace-only message as 'general'", () => {
    expect(inferIntent("     ")).toBe("general");
    expect(inferIntent("\n\t\n")).toBe("general");
  });
});

// ─────────────────────────────────────────────
// Robustness
// ─────────────────────────────────────────────

describe("inferIntent — robustness", () => {
  it("does not throw on a very long input", () => {
    const massive = "Cristiano " + "x".repeat(50_000);
    expect(() => inferIntent(massive)).not.toThrow();
    /* "Cristiano" matches the judge regex regardless of length. */
    expect(inferIntent(massive)).toBe("judge");
  });

  it("matches substrings without word-boundary anchoring (current contract)", () => {
    /* The regex has no \b; "researched" still contains "research" as
     * a substring so it matches. This test pins the current behavior
     * so a future refactor adding \b is a deliberate change, not a
     * silent one. */
    expect(inferIntent("I researched several options.")).toBe("research");
    /* A truncated form that contains none of the keyword tokens of
     * any bucket should fall through to general. "researc" alone
     * isn't a substring of any keyword. */
    expect(inferIntent("Hmm researc here.")).toBe("general");
  });

  it("does not match common false-positive words that aren't in the regex", () => {
    expect(inferIntent("How are you today?")).toBe("general");
    expect(inferIntent("What's the weather?")).toBe("general");
  });

  it("handles unicode without throwing (regex is byte-safe)", () => {
    expect(() => inferIntent("Compárer le marché 📊")).not.toThrow();
    /* The French "Compárer" doesn't match the English "compare" regex;
     * falls through to 'general'. Documents the English-only design
     * contract for future i18n work. */
    expect(inferIntent("Compárer le marché 📊")).toBe("general");
  });
});
