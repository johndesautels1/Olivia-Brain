/**
 * `src/lib/avatar/tavus.ts` — surface-contract tests.
 *
 * Track O5c session 1. Live network calls (real Tavus) are exercised
 * by the harness at /admin/avatar-eval (lands O5c session 2). These
 * tests cover the module's exported shape + the configured/unconfigured
 * branches that return BEFORE any fetch.
 *
 * Each test re-imports the module after stubbing env so the
 * `getServerEnv()` cache picks up the override.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("src/lib/avatar/tavus — module surface", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("exports the expected adapter functions", async () => {
    const mod = await import("@/lib/avatar/tavus");
    expect(typeof mod.isTavusConfigured).toBe("function");
    expect(typeof mod.createTavusSession).toBe("function");
    expect(typeof mod.sendTavusUtterance).toBe("function");
    expect(typeof mod.endTavusSession).toBe("function");
    expect(typeof mod.generateTavusVideo).toBe("function");
    expect(typeof mod.getTavusSessionStatus).toBe("function");
  });

  it("isTavusConfigured returns false when TAVUS_API_KEY is unset", async () => {
    vi.stubEnv("TAVUS_API_KEY", "");
    const { isTavusConfigured } = await import("@/lib/avatar/tavus");
    expect(isTavusConfigured()).toBe(false);
  });

  it("isTavusConfigured returns true when TAVUS_API_KEY is set", async () => {
    vi.stubEnv("TAVUS_API_KEY", "tavus-test-key");
    const { isTavusConfigured } = await import("@/lib/avatar/tavus");
    expect(isTavusConfigured()).toBe(true);
  });

  it("createTavusSession throws when not configured", async () => {
    vi.stubEnv("TAVUS_API_KEY", "");
    const { createTavusSession } = await import("@/lib/avatar/tavus");
    await expect(
      createTavusSession({ personaId: "olivia" }),
    ).rejects.toThrow(/Tavus API key not configured/i);
  });

  it("avatar service status reports tavus alongside the other vendors", async () => {
    vi.stubEnv("TAVUS_API_KEY", "tavus-test-key");
    const { getAvatarServiceStatus } = await import("@/lib/avatar");
    const status = getAvatarServiceStatus();
    expect(status.tavus.configured).toBe(true);
    expect(status.tavus.available).toBe(true);
    // Sibling vendor entries still present — schema didn't drop them.
    expect(status.simli).toBeDefined();
    expect(status.heygen).toBeDefined();
    expect(status.did).toBeDefined();
    expect(status.sadtalker).toBeDefined();
  });
});
