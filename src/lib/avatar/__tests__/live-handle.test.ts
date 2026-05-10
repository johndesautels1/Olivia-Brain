/**
 * Track O5c-Lift S2 — LiveAvatarHandle contract tests.
 *
 * Covers the surface every adapter must honour and the deferred-stub
 * behaviour for Tavus + Simli. Does NOT cover LiveAvatar's full
 * LiveKit + WS lifecycle — that needs heavy SDK mocking and lives in
 * a follow-up integration test once the C3 OliviaVideoAvatar refactor
 * has consumers exercising the connect path end-to-end.
 */
import { describe, expect, it } from "vitest";
import { createLiveAvatarHandle } from "@/lib/avatar";
import type { LiveAvatarHandle, LiveAvatarProvider } from "@/lib/avatar/types";

const PROVIDERS: LiveAvatarProvider[] = ["liveavatar", "simli", "tavus"];

describe("createLiveAvatarHandle — factory shape", () => {
  for (const provider of PROVIDERS) {
    it(`returns a LiveAvatarHandle for provider="${provider}"`, () => {
      const handle: LiveAvatarHandle = createLiveAvatarHandle({ provider });
      expect(handle.provider).toBe(provider);
      expect(typeof handle.connect).toBe("function");
      expect(typeof handle.disconnect).toBe("function");
      expect(typeof handle.speak).toBe("function");
      expect(typeof handle.interrupt).toBe("function");
      expect(typeof handle.attachVideo).toBe("function");
      expect(typeof handle.on).toBe("function");
    });
  }
});

describe("createLiveAvatarHandle — idempotent + safe lifecycle", () => {
  for (const provider of PROVIDERS) {
    it(`disconnect() on a never-connected ${provider} handle is a no-op`, () => {
      const handle = createLiveAvatarHandle({ provider });
      // Just verify it doesn't throw — there's nothing to tear down.
      expect(() => handle.disconnect()).not.toThrow();
      expect(() => handle.disconnect()).not.toThrow();
    });

    it(`interrupt() on a never-connected ${provider} handle is a no-op`, () => {
      const handle = createLiveAvatarHandle({ provider });
      expect(() => handle.interrupt()).not.toThrow();
    });
  }
});

describe("createLiveAvatarHandle — speak with pre-aborted signal", () => {
  for (const provider of PROVIDERS) {
    it(`returns { reason: "stream_aborted" } for pre-aborted signal on ${provider}`, async () => {
      const handle = createLiveAvatarHandle({ provider });
      const controller = new AbortController();
      controller.abort();
      const result = await handle.speak("hello", controller.signal);
      expect(result.reason).toBe("stream_aborted");
    });
  }
});

describe("createLiveAvatarHandle — Tavus + Simli are honest stubs", () => {
  it("Tavus connect() rejects with a clearly-labelled deferred error", async () => {
    const handle = createLiveAvatarHandle({ provider: "tavus" });
    await expect(handle.connect()).rejects.toThrow(/not yet implemented/i);
    await expect(handle.connect()).rejects.toThrow(/Track O5c-Lift/);
  });

  it("Simli connect() rejects with a clearly-labelled deferred error", async () => {
    const handle = createLiveAvatarHandle({ provider: "simli" });
    await expect(handle.connect()).rejects.toThrow(/not yet implemented/i);
    await expect(handle.connect()).rejects.toThrow(/Track O5c-Lift/);
  });

  it("Tavus speak() with a fresh signal returns voice_unavailable", async () => {
    const handle = createLiveAvatarHandle({ provider: "tavus" });
    const controller = new AbortController();
    const result = await handle.speak("hello", controller.signal);
    expect(result.reason).toBe("voice_unavailable");
  });

  it("Simli speak() with a fresh signal returns voice_unavailable", async () => {
    const handle = createLiveAvatarHandle({ provider: "simli" });
    const controller = new AbortController();
    const result = await handle.speak("hello", controller.signal);
    expect(result.reason).toBe("voice_unavailable");
  });
});

describe("createLiveAvatarHandle — event subscription", () => {
  for (const provider of PROVIDERS) {
    it(`on("stateChange") returns an unsubscribe function for ${provider}`, () => {
      const handle = createLiveAvatarHandle({ provider });
      const unsubscribe = handle.on("stateChange", () => {});
      expect(typeof unsubscribe).toBe("function");
      // Calling unsubscribe should not throw, even when called twice.
      expect(() => unsubscribe()).not.toThrow();
      expect(() => unsubscribe()).not.toThrow();
    });

    it(`on("audioElementReady") returns an unsubscribe function for ${provider}`, () => {
      const handle = createLiveAvatarHandle({ provider });
      const unsubscribe = handle.on("audioElementReady", () => {});
      expect(typeof unsubscribe).toBe("function");
      expect(() => unsubscribe()).not.toThrow();
    });
  }
});

describe("createLiveAvatarHandle — exhaustive provider validation", () => {
  it("throws for an unknown provider (defensive even though TS prevents it)", () => {
    expect(() =>
      // @ts-expect-error — intentionally bypassing the LiveAvatarProvider union
      createLiveAvatarHandle({ provider: "not-a-vendor" }),
    ).toThrow(/Unknown LiveAvatarProvider/);
  });
});
