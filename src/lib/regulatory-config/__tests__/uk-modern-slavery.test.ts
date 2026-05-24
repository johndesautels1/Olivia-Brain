/**
 * UK Modern Slavery regulatory-config — unit tests + stale-config guard.
 *
 * Two responsibilities:
 *   1. Verify the constant module's shape + value invariants.
 *   2. Implement Law 6's stale-config alert as a CI-runnable guard
 *      that fails when `validUntil` is within 90 days of expiry --
 *      giving the team a quarter to bump the date or update the
 *      threshold before downstream agents start surfacing stale
 *      advice. Per `~/CLAUDE.md` Architecture Standards Law 6
 *      ("Stale-config daily alert when `validUntil < today + 90d`")
 *      and the cron-discipline memory (which prefers weekly + CI
 *      enforcement over daily push alerts).
 *
 * Held to Apple / IBM / Microsoft / Google 2026 leading coding
 * practices per `~/CLAUDE.md` and
 * `docs/api-specs/_MASTER_REGISTER.md` section 10.4.
 */

import { describe, expect, it } from "vitest";

import {
  UK_MODERN_SLAVERY,
  formatUkModernSlaveryThreshold,
} from "@/lib/regulatory-config/uk-modern-slavery";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

describe("UK_MODERN_SLAVERY constant", () => {
  it("exposes a positive turnover threshold in GBP", () => {
    expect(UK_MODERN_SLAVERY.turnoverThresholdGbp).toBeGreaterThan(0);
  });

  it("matches the current statutory £36M threshold (update this assertion when the statute changes)", () => {
    expect(UK_MODERN_SLAVERY.turnoverThresholdGbp).toBe(36_000_000);
  });

  it("declares jurisdiction as UK", () => {
    expect(UK_MODERN_SLAVERY.jurisdiction).toBe("UK");
  });

  it("cites the Modern Slavery Act 2015 s.54", () => {
    expect(UK_MODERN_SLAVERY.legislation).toContain("Modern Slavery Act 2015");
    expect(UK_MODERN_SLAVERY.legislation).toContain("s.54");
  });

  it("includes a gov.uk source URL", () => {
    expect(UK_MODERN_SLAVERY.source).toMatch(/^https:\/\/www\.gov\.uk\//);
  });

  it("declares an ISO-8601 validUntil date", () => {
    expect(UK_MODERN_SLAVERY.validUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(UK_MODERN_SLAVERY.validUntil))).toBe(false);
  });
});

describe("formatUkModernSlaveryThreshold", () => {
  it("returns the £NNm form (currently £36M)", () => {
    expect(formatUkModernSlaveryThreshold()).toBe("£36M");
  });

  it("returns a string that does not contain the literal magic number", () => {
    // Defensive: if someone changes the formatter to interpolate a
    // string template, this assertion catches an accidental
    // hardcoded "36000000" leak.
    expect(formatUkModernSlaveryThreshold()).not.toContain("36000000");
  });
});

describe("Law 6 stale-config guard -- UK Modern Slavery", () => {
  it("fails when validUntil is in the past (statute review is overdue)", () => {
    const validUntil = new Date(UK_MODERN_SLAVERY.validUntil).getTime();
    const now = Date.now();
    expect(validUntil).toBeGreaterThanOrEqual(now);
  });

  it("fails when validUntil is within 90 days of today (re-verify before downstream surfaces stale advice)", () => {
    const validUntilTs = new Date(UK_MODERN_SLAVERY.validUntil).getTime();
    const todayTs = Date.now();
    const daysRemaining = (validUntilTs - todayTs) / (24 * 60 * 60 * 1000);

    if (daysRemaining < 90) {
      throw new Error(
        `UK_MODERN_SLAVERY.validUntil (${UK_MODERN_SLAVERY.validUntil}) is ` +
          `${daysRemaining.toFixed(1)} days away (< 90-day threshold per Law 6). ` +
          `Action: re-verify the £36M threshold against the gov.uk source ` +
          `(${UK_MODERN_SLAVERY.source}), then bump validUntil in ` +
          `src/lib/regulatory-config/uk-modern-slavery.ts. If the threshold ` +
          `has changed, update turnoverThresholdGbp in the SAME commit so ` +
          `g1-048 (the consumer) picks up the new value automatically.`,
      );
    }

    expect(daysRemaining).toBeGreaterThanOrEqual(90);
  });

  it("validUntil is not more than 18 months in the future (too-distant dates defeat the review cadence)", () => {
    const validUntilTs = new Date(UK_MODERN_SLAVERY.validUntil).getTime();
    const eighteenMonthsMs = 18 * 30 * 24 * 60 * 60 * 1000;
    expect(validUntilTs - Date.now()).toBeLessThanOrEqual(eighteenMonthsMs);
  });
});
