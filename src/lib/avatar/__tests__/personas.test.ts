/**
 * `lib/avatar/personas` — LiveAvatar persona resolver tests.
 *
 * Coverage:
 *   - Eligibility predicate (`isLiveAvatarPersonaId`)
 *   - Zod schema (`LiveAvatarPersonaIdSchema`)
 *   - Resolution Result shape (`resolveLiveAvatarPersona`)
 *   - Throw-on-miss helper (`requireLiveAvatarPersona`)
 *   - Per-persona env-var mapping correctness (Olivia + Cristiano)
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LIVE_AVATAR_PERSONA_IDS,
  LiveAvatarPersonaIdSchema,
  isLiveAvatarPersonaId,
  requireLiveAvatarPersona,
  resolveLiveAvatarPersona,
} from "@/lib/avatar/personas";

describe("lib/avatar/personas — eligibility predicate", () => {
  it("accepts olivia + cristiano", () => {
    expect(isLiveAvatarPersonaId("olivia")).toBe(true);
    expect(isLiveAvatarPersonaId("cristiano")).toBe(true);
  });

  it("rejects emelia (text/voice-only by design)", () => {
    // PersonaId includes emelia, but she's excluded from LiveAvatar
    // eligibility because she has no avatar id.
    expect(isLiveAvatarPersonaId("emelia")).toBe(false);
  });

  it("exposes LIVE_AVATAR_PERSONA_IDS as a stable tuple", () => {
    expect(LIVE_AVATAR_PERSONA_IDS).toEqual(["olivia", "cristiano"]);
  });
});

describe("lib/avatar/personas — Zod schema", () => {
  it("parses valid persona ids", () => {
    expect(LiveAvatarPersonaIdSchema.parse("olivia")).toBe("olivia");
    expect(LiveAvatarPersonaIdSchema.parse("cristiano")).toBe("cristiano");
  });

  it("rejects emelia at the schema boundary", () => {
    const result = LiveAvatarPersonaIdSchema.safeParse("emelia");
    expect(result.success).toBe(false);
  });

  it("rejects arbitrary strings", () => {
    const result = LiveAvatarPersonaIdSchema.safeParse("not-a-persona");
    expect(result.success).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(LiveAvatarPersonaIdSchema.safeParse(42).success).toBe(false);
    expect(LiveAvatarPersonaIdSchema.safeParse(null).success).toBe(false);
    expect(LiveAvatarPersonaIdSchema.safeParse(undefined).success).toBe(false);
    expect(LiveAvatarPersonaIdSchema.safeParse({}).success).toBe(false);
  });
});

describe("lib/avatar/personas — resolveLiveAvatarPersona", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns ok:true with avatar+voice when both Olivia vars are set", () => {
    vi.stubEnv("LIVEAVATAR_OLIVIA_AVATAR_ID", "olivia-avatar-uuid");
    vi.stubEnv("ELEVENLABS_OLIVIA_VOICE_ID", "olivia-voice-uuid");

    const result = resolveLiveAvatarPersona("olivia");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.personaId).toBe("olivia");
      expect(result.avatarId).toBe("olivia-avatar-uuid");
      expect(result.voiceId).toBe("olivia-voice-uuid");
    }
  });

  it("returns ok:true with avatar+voice when both Cristiano vars are set", () => {
    vi.stubEnv("LIVEAVATAR_CRISTIANO_AVATAR_ID", "cristiano-avatar-uuid");
    vi.stubEnv("ELEVENLABS_CRISTIANO_VOICE_ID", "cristiano-voice-uuid");

    const result = resolveLiveAvatarPersona("cristiano");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.personaId).toBe("cristiano");
      expect(result.avatarId).toBe("cristiano-avatar-uuid");
      expect(result.voiceId).toBe("cristiano-voice-uuid");
    }
  });

  it("returns ok:false with the missing avatar-id var name when avatar id is unset", () => {
    vi.stubEnv("LIVEAVATAR_OLIVIA_AVATAR_ID", "");
    vi.stubEnv("ELEVENLABS_OLIVIA_VOICE_ID", "olivia-voice-uuid");

    const result = resolveLiveAvatarPersona("olivia");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missingVar).toBe("LIVEAVATAR_OLIVIA_AVATAR_ID");
    }
  });

  it("returns ok:false with the missing voice-id var name when voice id is unset", () => {
    vi.stubEnv("LIVEAVATAR_CRISTIANO_AVATAR_ID", "cristiano-avatar-uuid");
    vi.stubEnv("ELEVENLABS_CRISTIANO_VOICE_ID", "");

    const result = resolveLiveAvatarPersona("cristiano");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missingVar).toBe("ELEVENLABS_CRISTIANO_VOICE_ID");
    }
  });

  it("checks avatar id before voice id (avatar-id miss masks voice-id miss)", () => {
    vi.stubEnv("LIVEAVATAR_CRISTIANO_AVATAR_ID", "");
    vi.stubEnv("ELEVENLABS_CRISTIANO_VOICE_ID", "");

    const result = resolveLiveAvatarPersona("cristiano");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Documents the precedence order so downstream error messages
      // are stable across test runs and operator dashboards.
      expect(result.missingVar).toBe("LIVEAVATAR_CRISTIANO_AVATAR_ID");
    }
  });
});

describe("lib/avatar/personas — requireLiveAvatarPersona", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the resolved config when both vars are set", () => {
    vi.stubEnv("LIVEAVATAR_CRISTIANO_AVATAR_ID", "cri-uuid");
    vi.stubEnv("ELEVENLABS_CRISTIANO_VOICE_ID", "voi-uuid");

    const config = requireLiveAvatarPersona("cristiano");
    expect(config).toEqual({
      personaId: "cristiano",
      avatarId: "cri-uuid",
      voiceId: "voi-uuid",
    });
  });

  it("throws with the missing var name when avatar id is unset", () => {
    vi.stubEnv("LIVEAVATAR_OLIVIA_AVATAR_ID", "");
    vi.stubEnv("ELEVENLABS_OLIVIA_VOICE_ID", "olv-uuid");

    expect(() => requireLiveAvatarPersona("olivia")).toThrow(
      /LIVEAVATAR_OLIVIA_AVATAR_ID not configured/,
    );
  });

  it("throws with the missing var name when voice id is unset", () => {
    vi.stubEnv("LIVEAVATAR_OLIVIA_AVATAR_ID", "olv-avatar");
    vi.stubEnv("ELEVENLABS_OLIVIA_VOICE_ID", "");

    expect(() => requireLiveAvatarPersona("olivia")).toThrow(
      /ELEVENLABS_OLIVIA_VOICE_ID not configured/,
    );
  });
});
