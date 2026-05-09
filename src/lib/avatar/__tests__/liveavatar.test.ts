/**
 * `src/lib/avatar/liveavatar.ts` — surface-contract tests.
 *
 * Track O5c session 3. The real WebSocket lifecycle lives in
 * `OliviaVideoAvatar` (the abstraction lift was scoped out of S3),
 * so this file is intentionally thin and the tests cover only the
 * configured-status surface the harness depends on.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("src/lib/avatar/liveavatar — module surface", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("exports the expected adapter surface", async () => {
    const mod = await import("@/lib/avatar/liveavatar");
    expect(typeof mod.isLiveAvatarConfigured).toBe("function");
    expect(typeof mod.getLiveAvatarPublicConfig).toBe("function");
    expect(mod.LIVEAVATAR_SPEAK_STREAM_PATH).toBe(
      "/api/olivia/liveavatar/speak-stream",
    );
  });

  it("isLiveAvatarConfigured returns false when either key or avatar id is missing", async () => {
    vi.stubEnv("LIVEAVATAR_API_KEY", "");
    vi.stubEnv("LIVEAVATAR_OLIVIA_AVATAR_ID", "avatar-123");
    const a = await import("@/lib/avatar/liveavatar");
    expect(a.isLiveAvatarConfigured()).toBe(false);

    vi.resetModules();
    vi.stubEnv("LIVEAVATAR_API_KEY", "live-key");
    vi.stubEnv("LIVEAVATAR_OLIVIA_AVATAR_ID", "");
    const b = await import("@/lib/avatar/liveavatar");
    expect(b.isLiveAvatarConfigured()).toBe(false);
  });

  it("isLiveAvatarConfigured returns true when both env vars are set", async () => {
    vi.stubEnv("LIVEAVATAR_API_KEY", "live-key");
    vi.stubEnv("LIVEAVATAR_OLIVIA_AVATAR_ID", "avatar-123");
    const { isLiveAvatarConfigured } = await import("@/lib/avatar/liveavatar");
    expect(isLiveAvatarConfigured()).toBe(true);
  });

  it("getLiveAvatarPublicConfig returns the avatar id and never the secret", async () => {
    vi.stubEnv("LIVEAVATAR_API_KEY", "very-secret-do-not-leak");
    vi.stubEnv("LIVEAVATAR_OLIVIA_AVATAR_ID", "avatar-public-id");
    const { getLiveAvatarPublicConfig } = await import(
      "@/lib/avatar/liveavatar"
    );
    const config = getLiveAvatarPublicConfig();
    expect(config.oliviaAvatarId).toBe("avatar-public-id");
    expect(JSON.stringify(config)).not.toMatch(/very-secret/);
  });
});
