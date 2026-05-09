/**
 * `/api/olivia/liveavatar/speak-stream` — surface-contract tests.
 *
 * Covers module export + validation branches that return BEFORE the
 * upstream ElevenLabs fetch. Streaming end-to-end is exercised manually
 * on `/test-avatar`; vitest can't realistically mock an ElevenLabs PCM
 * stream + LiveAvatar WebSocket pair.
 *
 * Track O5a — closes part of W-005 (avatar lip-sync upgrade).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("/api/olivia/liveavatar/speak-stream — module surface", () => {
  it("exposes POST", async () => {
    const mod = await import("@/app/api/olivia/liveavatar/speak-stream/route");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("/api/olivia/liveavatar/speak-stream — POST validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown, ip = "5.5.5.5"): Request {
    return new Request("http://localhost/api/olivia/liveavatar/speak-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("rejects an unparseable body with 400", async () => {
    const { POST } = await import(
      "@/app/api/olivia/liveavatar/speak-stream/route"
    );
    const res = await POST(makeReq("not-json", "5.5.5.10") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("rejects an empty text with 400", async () => {
    const { POST } = await import(
      "@/app/api/olivia/liveavatar/speak-stream/route"
    );
    const res = await POST(makeReq({ text: "   " }, "5.5.5.11") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Text is required/i);
  });

  it("rejects text over 5000 chars with 400", async () => {
    const { POST } = await import(
      "@/app/api/olivia/liveavatar/speak-stream/route"
    );
    const res = await POST(
      makeReq({ text: "a".repeat(5001) }, "5.5.5.12") as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/too long/i);
  });

  it("returns the JSON fallback (200) when ElevenLabs is not configured", async () => {
    // Ensure neither env var is set so the route exits before any
    // upstream fetch. Stub them explicitly to empty so the route's
    // presence-check fails predictably regardless of host environment.
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    vi.stubEnv("ELEVENLABS_OLIVIA_VOICE_ID", "");

    const { POST } = await import(
      "@/app/api/olivia/liveavatar/speak-stream/route"
    );
    const res = await POST(
      makeReq({ text: "Hello, Olivia." }, "5.5.5.13") as never,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { fallback: boolean; reason: string };
    expect(data.fallback).toBe(true);
    expect(data.reason).toMatch(/not configured/i);
  });
});
