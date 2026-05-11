/**
 * Registry ↔ handlers alignment
 *
 * Every ported per-company handler (Track H S21 — 12 entries) must have:
 *   1. A registered AgentHandler (so `getHandler(agentId)` returns the real
 *      impl, not the DefaultHandler placeholder).
 *   2. A matching `AGENT_DEFINITIONS` row (so schedulers + admin UI can see
 *      it).
 *
 * This test locks both sides — adding a handler without its registry row,
 * or vice versa, breaks the suite.
 */
import { describe, expect, it } from "vitest";

import { AGENT_DEFINITIONS, AGENT_GROUPS, getAgentDefinition, getAgentsByGroup } from "../registry";
import { getRegisteredAgentIds, hasHandler } from "../handlers";

const PORTED_G1_HANDLERS = [
  "G1-033",
  "G1-048",
  "G1-076",
  "G1-105",
  "G1-107",
  "G1-110",
  "G1-115",
  "G1-130",
  "G1-136",
  "G1-141",
  "G1-149",
  "G1-150",
] as const;

const FOUNDER_OPS_GROUPS = ["5A", "5B", "5C"] as const;

describe("registry · founder-operations groups", () => {
  for (const code of FOUNDER_OPS_GROUPS) {
    it(`has a group definition for ${code}`, () => {
      const grp = AGENT_GROUPS.find((g) => g.code === code);
      expect(grp).toBeDefined();
      expect(grp?.category).toBe("domain");
      expect(grp?.name).toMatch(/Founder/);
    });
  }
});

describe("registry · 12 ported G1-* handlers have AGENT_DEFINITIONS rows", () => {
  for (const agentId of PORTED_G1_HANDLERS) {
    it(`AGENT_DEFINITIONS has ${agentId}`, () => {
      const def = getAgentDefinition(agentId);
      expect(def, `getAgentDefinition("${agentId}") returned undefined`).toBeDefined();
      expect(def!.agentId).toBe(agentId);
      expect(def!.name.length).toBeGreaterThan(3);
      expect(def!.description.length).toBeGreaterThan(20);
      expect(["5A", "5B", "5C"]).toContain(def!.groupCode);
      expect(def!.defaultSchedule).toBe("on_demand");
      expect(Array.isArray(def!.capabilities)).toBe(true);
      expect(def!.capabilities.length).toBeGreaterThan(0);
      expect(Array.isArray(def!.dataSources)).toBe(true);
      expect(def!.dataSources.length).toBeGreaterThan(0);
      expect(Array.isArray(def!.outputTypes)).toBe(true);
      expect(def!.outputTypes.length).toBeGreaterThan(0);
    });
  }

  it("5A contains exactly the two legal/compliance handlers (G1-033 + G1-048)", () => {
    const ids = getAgentsByGroup("5A").map((a) => a.agentId).sort();
    expect(ids).toEqual(["G1-033", "G1-048"]);
  });

  it("5B contains the five pitch/PR handlers", () => {
    const ids = getAgentsByGroup("5B").map((a) => a.agentId).sort();
    expect(ids).toEqual(["G1-076", "G1-105", "G1-107", "G1-110", "G1-115"]);
  });

  it("5C contains the five strategy/decision handlers", () => {
    const ids = getAgentsByGroup("5C").map((a) => a.agentId).sort();
    expect(ids).toEqual(["G1-130", "G1-136", "G1-141", "G1-149", "G1-150"]);
  });
});

describe("registry · model + temperature sanity", () => {
  it("uses claude-opus-4-7 for the cascade-reasoning handler (G1-136)", () => {
    expect(getAgentDefinition("G1-136")!.defaultModel).toBe("claude-opus-4-7");
  });

  it("uses sonar-pro for the three web-search handlers (G1-105 / G1-110 / G1-150)", () => {
    for (const id of ["G1-105", "G1-110", "G1-150"] as const) {
      expect(getAgentDefinition(id)!.defaultModel).toBe("sonar-pro");
    }
  });

  it("temperature in [0, 1] for every G1-* handler", () => {
    for (const id of PORTED_G1_HANDLERS) {
      const t = getAgentDefinition(id)!.defaultTemperature;
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
  });

  it("maxTokens in [1024, 16384] for every G1-* handler", () => {
    for (const id of PORTED_G1_HANDLERS) {
      const t = getAgentDefinition(id)!.defaultMaxTokens;
      expect(t).toBeGreaterThanOrEqual(1024);
      expect(t).toBeLessThanOrEqual(16384);
    }
  });
});

describe("registry ↔ handlers alignment", () => {
  it("every G1-* AGENT_DEFINITIONS row has a real handler (not DefaultHandler)", () => {
    for (const agentId of PORTED_G1_HANDLERS) {
      expect(
        hasHandler(agentId),
        `getHandler("${agentId}") returns the DefaultHandler placeholder — port + registerHandler() missing`,
      ).toBe(true);
    }
  });

  it("every registered handler with a G1-* id has a matching AGENT_DEFINITIONS row", () => {
    const registered = getRegisteredAgentIds().filter((id) => id.startsWith("G1-"));
    for (const id of registered) {
      const def = getAgentDefinition(id);
      expect(
        def,
        `Handler registered for ${id} but no AGENT_DEFINITIONS row — add one or unregister the handler`,
      ).toBeDefined();
    }
  });
});
