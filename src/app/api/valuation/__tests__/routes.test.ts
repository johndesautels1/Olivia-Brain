// V7 smoke test — confirms each ported route module exposes the expected
// HTTP method handlers. Full integration tests against a seeded DB land
// alongside the WarRoom UI in V9 (and again as e2e fixtures in Track K
// Session 27 — the running-eval cron).

import { describe, it, expect } from "vitest";

describe("V7 route modules — smoke", () => {
  // /api/valuation/run transitively imports the cascade orchestrator + all
  // 14 valuation agents; cold transform on Windows can exceed the 15s global.
  it("POST /api/valuation/run", async () => {
    const mod = await import("@/app/api/valuation/run/route");
    expect(typeof mod.POST).toBe("function");
  }, 60_000);

  it("POST /api/valuation/subject", async () => {
    const mod = await import("@/app/api/valuation/subject/route");
    expect(typeof mod.POST).toBe("function");
  });

  it("GET/PATCH /api/valuation/[runId]", async () => {
    const mod = await import("@/app/api/valuation/[runId]/route");
    expect(typeof mod.GET).toBe("function");
  });

  it("GET /api/valuation/sensitivity", async () => {
    const mod = await import("@/app/api/valuation/sensitivity/route");
    expect(typeof mod.GET).toBe("function");
  });

  it("GET /api/valuation/latest", async () => {
    const mod = await import("@/app/api/valuation/latest/route");
    expect(typeof mod.GET).toBe("function");
  });

  it("POST /api/valuation/compare", async () => {
    const mod = await import("@/app/api/valuation/compare/route");
    expect(typeof mod.POST).toBe("function");
  });

  it("POST /api/valuation/export", async () => {
    const mod = await import("@/app/api/valuation/export/route");
    expect(typeof mod.POST).toBe("function");
  });

  it("GET/POST/PUT/DELETE /api/valuation/deal-room/session", async () => {
    const mod = await import("@/app/api/valuation/deal-room/session/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
    expect(typeof mod.PUT).toBe("function");
    expect(typeof mod.DELETE).toBe("function");
  });

  it("POST /api/valuation/deal-room/score-rubric", async () => {
    const mod = await import("@/app/api/valuation/deal-room/score-rubric/route");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("V7 helpers — surface contract", () => {
  it("require-tier exposes expected types + helpers", async () => {
    const mod = await import("@/lib/require-tier");
    expect(typeof mod.requireTier).toBe("function");
    expect(typeof mod.tierAtLeast).toBe("function");
    expect(typeof mod.getUserTier).toBe("function");
    expect(mod.tierAtLeast("executive", "developer")).toBe(true);
    expect(mod.tierAtLeast("free", "executive")).toBe(false);
  });

  it("bridge exposes mergeBridgeAndCascade", async () => {
    const mod = await import("@/lib/valuation/bridge");
    expect(typeof mod.mergeBridgeAndCascade).toBe("function");
    expect(typeof mod.buildValuationInput).toBe("function");
    expect(typeof mod.calculateCompleteness).toBe("function");
  });
});
