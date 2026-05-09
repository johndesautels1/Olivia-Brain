import { describe, it, expect } from "vitest";
import {
  detectSpokeFromMessage,
  getSpokeDescriptor,
  resolveSpoke,
} from "./spoke-router";

describe("getSpokeDescriptor", () => {
  it("returns all 7 spokes including general fallback", () => {
    const ids = [
      "fl_realestate",
      "relocation",
      "london_tech",
      "xscore",
      "heart_recovery",
      "london_transit",
      "general",
    ] as const;
    for (const id of ids) {
      expect(getSpokeDescriptor(id).id).toBe(id);
    }
  });

  it("general spoke has empty addendum", () => {
    expect(getSpokeDescriptor("general").addendum).toBe("");
  });

  it("non-general spokes carry substantive addenda", () => {
    expect(getSpokeDescriptor("fl_realestate").addendum.length).toBeGreaterThan(100);
    expect(getSpokeDescriptor("relocation").addendum.length).toBeGreaterThan(100);
    expect(getSpokeDescriptor("london_tech").addendum.length).toBeGreaterThan(100);
    expect(getSpokeDescriptor("heart_recovery").addendum.length).toBeGreaterThan(100);
  });
});

describe("detectSpokeFromMessage", () => {
  it("returns general for null/empty input", () => {
    expect(detectSpokeFromMessage(null)).toBe("general");
    expect(detectSpokeFromMessage("")).toBe("general");
    expect(detectSpokeFromMessage("hello")).toBe("general");
  });

  it("matches Florida real estate variants", () => {
    expect(detectSpokeFromMessage("Looking at MLS data in Tampa")).toBe("fl_realestate");
    expect(detectSpokeFromMessage("Florida flood zone insurance")).toBe("fl_realestate");
    expect(detectSpokeFromMessage("buyer-broker commission in Miami")).toBe("fl_realestate");
    expect(detectSpokeFromMessage("doc stamps on Sarasota condo")).toBe("fl_realestate");
  });

  it("matches Tampa Bay area markets (Pinellas / St Pete / Clearwater extension)", () => {
    /* Companion to 98487e6's regex extension. The founder works the
     * Pinellas market specifically; pre-extension these all fell to
     * general because the regex only knew about Miami / Tampa /
     * Orlando / Jacksonville / Sarasota / Naples. */
    expect(detectSpokeFromMessage("Pinellas County listing inventory")).toBe("fl_realestate");
    expect(detectSpokeFromMessage("St Petersburg waterfront condo prices")).toBe("fl_realestate");
    expect(detectSpokeFromMessage("St. Pete Beach short-term rental rules")).toBe("fl_realestate");
    expect(detectSpokeFromMessage("Clearwater school district premium")).toBe("fl_realestate");
    expect(detectSpokeFromMessage("Bradenton vs Lakeland for retirees")).toBe("fl_realestate");
  });

  it("matches Florida-specific tax + insurance concepts (extension)", () => {
    expect(detectSpokeFromMessage("homestead exemption deadline")).toBe("fl_realestate");
    expect(detectSpokeFromMessage("Save Our Homes 3% cap math")).toBe("fl_realestate");
    expect(detectSpokeFromMessage("Citizens Insurance vs admitted carrier")).toBe("fl_realestate");
    expect(detectSpokeFromMessage("sinkhole disclosure on a 1990s build")).toBe("fl_realestate");
    expect(detectSpokeFromMessage("condo association fee escalation")).toBe("fl_realestate");
  });

  it("matches London transit variants", () => {
    expect(detectSpokeFromMessage("Tube delays this morning")).toBe("london_transit");
    expect(detectSpokeFromMessage("Elizabeth Line to Heathrow")).toBe("london_transit");
    expect(detectSpokeFromMessage("Oyster cap for the day")).toBe("london_transit");
    expect(detectSpokeFromMessage("step-free at Bond Street station")).toBe("london_transit");
  });

  it("matches London tech ecosystem variants", () => {
    expect(detectSpokeFromMessage("Atomico portfolio companies")).toBe("london_tech");
    expect(detectSpokeFromMessage("Level39 fintech accelerator")).toBe("london_tech");
    expect(detectSpokeFromMessage("Silicon Roundabout founders")).toBe("london_tech");
    expect(detectSpokeFromMessage("London Tech Week speakers")).toBe("london_tech");
  });

  it("matches relocation variants", () => {
    expect(detectSpokeFromMessage("relocate from London to Lisbon")).toBe("relocation");
    expect(detectSpokeFromMessage("visa pathway for Portugal")).toBe("relocation");
    expect(detectSpokeFromMessage("183-day tax residency rule")).toBe("relocation");
    expect(detectSpokeFromMessage("Numbeo cost of living comparison")).toBe("relocation");
  });

  it("matches xscore comparison variants", () => {
    expect(detectSpokeFromMessage("compare Madrid vs Barcelona for tech")).toBe("xscore");
    expect(detectSpokeFromMessage("lifescore for Singapore")).toBe("xscore");
  });

  it("matches heart recovery variants", () => {
    expect(detectSpokeFromMessage("post-MI cardiac rehab schedule")).toBe("heart_recovery");
    expect(detectSpokeFromMessage("CABG recovery after week 4")).toBe("heart_recovery");
    expect(detectSpokeFromMessage("ejection fraction 35% advice")).toBe("heart_recovery");
    expect(detectSpokeFromMessage("when to talk to my cardiologist")).toBe("heart_recovery");
  });

  it("heart recovery wins precedence even when other terms are present", () => {
    expect(detectSpokeFromMessage("cardiac rehab in Florida")).toBe("heart_recovery");
    expect(detectSpokeFromMessage("post-MI exercise advice for London")).toBe("heart_recovery");
  });

  it("Florida wins over London when both present", () => {
    expect(detectSpokeFromMessage("MLS data in Florida vs London prop")).toBe("fl_realestate");
  });

  it("returns general for unrelated queries", () => {
    expect(detectSpokeFromMessage("how do you make pizza")).toBe("general");
    expect(detectSpokeFromMessage("explain quantum entanglement")).toBe("general");
  });
});

describe("resolveSpoke", () => {
  it("prefers explicit override", () => {
    const r = resolveSpoke("Tube delays", "fl_realestate");
    expect(r.id).toBe("fl_realestate");
  });

  it("falls back to detected", () => {
    expect(resolveSpoke("Tube delays").id).toBe("london_transit");
  });

  it("returns general descriptor when nothing matches", () => {
    const r = resolveSpoke("hello");
    expect(r.id).toBe("general");
    expect(r.addendum).toBe("");
  });
});
