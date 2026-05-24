/**
 * `lib/gateway/auth` — bearer-token verification tests.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  GATEWAYED_SOURCE_APPS,
  getGatewayTokenEnvVar,
  verifyGatewayBearer,
} from "@/lib/gateway/auth";

describe("lib/gateway/auth — eligibility set", () => {
  it("exposes the gatewayed source apps (excludes 'ob')", () => {
    expect(GATEWAYED_SOURCE_APPS).toEqual([
      "ltm",
      "lifescore",
      "clueslondon",
      "cluesintelligence",
      "cluesxscore",
      "heart-recovery",
      "property-search",
      "transit",
    ]);
    expect(GATEWAYED_SOURCE_APPS as readonly string[]).not.toContain("ob");
  });

  it("maps every app to its env var", () => {
    expect(getGatewayTokenEnvVar("ltm")).toBe("GATEWAY_TOKEN_LTM");
    expect(getGatewayTokenEnvVar("lifescore")).toBe("GATEWAY_TOKEN_LIFESCORE");
    expect(getGatewayTokenEnvVar("clueslondon")).toBe(
      "GATEWAY_TOKEN_CLUESLONDON",
    );
    expect(getGatewayTokenEnvVar("cluesintelligence")).toBe(
      "GATEWAY_TOKEN_CLUESINTELLIGENCE",
    );
    expect(getGatewayTokenEnvVar("cluesxscore")).toBe(
      "GATEWAY_TOKEN_CLUESXSCORE",
    );
    expect(getGatewayTokenEnvVar("heart-recovery")).toBe(
      "GATEWAY_TOKEN_HEART_RECOVERY",
    );
    expect(getGatewayTokenEnvVar("property-search")).toBe(
      "GATEWAY_TOKEN_PROPERTY_SEARCH",
    );
    expect(getGatewayTokenEnvVar("transit")).toBe("GATEWAY_TOKEN_TRANSIT");
  });
});

describe("lib/gateway/auth — verifyGatewayBearer header parsing", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns missing_header for null/undefined input", () => {
    expect(verifyGatewayBearer(null)).toEqual({
      ok: false,
      reason: "missing_header",
    });
    expect(verifyGatewayBearer(undefined)).toEqual({
      ok: false,
      reason: "missing_header",
    });
  });

  it("returns missing_header for empty string", () => {
    expect(verifyGatewayBearer("")).toEqual({
      ok: false,
      reason: "missing_header",
    });
  });

  it("returns malformed_header when scheme is not Bearer", () => {
    // Stub a token so we don't get no_tokens_configured first.
    vi.stubEnv("GATEWAY_TOKEN_LTM", "ltm-token-xyz");
    expect(verifyGatewayBearer("Basic abc:def")).toEqual({
      ok: false,
      reason: "malformed_header",
    });
    expect(verifyGatewayBearer("token-without-scheme")).toEqual({
      ok: false,
      reason: "malformed_header",
    });
  });

  it("returns no_tokens_configured when no env vars are set", () => {
    expect(verifyGatewayBearer("Bearer any-token")).toEqual({
      ok: false,
      reason: "no_tokens_configured",
    });
  });

  it("returns no_tokens_configured when env vars are explicitly empty", () => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "");
    vi.stubEnv("GATEWAY_TOKEN_LIFESCORE", "");
    expect(verifyGatewayBearer("Bearer any-token")).toEqual({
      ok: false,
      reason: "no_tokens_configured",
    });
  });
});

describe("lib/gateway/auth — verifyGatewayBearer matching", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("matches a valid LTM token and returns sourceApp='ltm'", () => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "ltm-secret-12345");
    const result = verifyGatewayBearer("Bearer ltm-secret-12345");
    expect(result).toEqual({ ok: true, sourceApp: "ltm" });
  });

  it("matches a valid lifescore token and returns sourceApp='lifescore'", () => {
    vi.stubEnv("GATEWAY_TOKEN_LIFESCORE", "lifescore-secret-67890");
    const result = verifyGatewayBearer("Bearer lifescore-secret-67890");
    expect(result).toEqual({ ok: true, sourceApp: "lifescore" });
  });

  it("returns unknown_token when the presented token matches no env var", () => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "ltm-secret-12345");
    expect(verifyGatewayBearer("Bearer wrong-token")).toEqual({
      ok: false,
      reason: "unknown_token",
    });
  });

  it("is case-insensitive on the 'Bearer' scheme keyword", () => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "ltm-secret");
    expect(verifyGatewayBearer("bearer ltm-secret")).toEqual({
      ok: true,
      sourceApp: "ltm",
    });
    expect(verifyGatewayBearer("BEARER ltm-secret")).toEqual({
      ok: true,
      sourceApp: "ltm",
    });
  });

  it("tolerates extra whitespace around the header value", () => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "ltm-secret");
    expect(verifyGatewayBearer("  Bearer ltm-secret  ")).toEqual({
      ok: true,
      sourceApp: "ltm",
    });
  });

  it("differentiates LTM vs lifescore even when both tokens are configured", () => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "alpha");
    vi.stubEnv("GATEWAY_TOKEN_LIFESCORE", "beta");
    expect(verifyGatewayBearer("Bearer alpha")).toEqual({
      ok: true,
      sourceApp: "ltm",
    });
    expect(verifyGatewayBearer("Bearer beta")).toEqual({
      ok: true,
      sourceApp: "lifescore",
    });
  });

  it("doesn't match on length-mismatched tokens (length-prefix attack guard)", () => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "ltm-secret");
    expect(verifyGatewayBearer("Bearer ltm-secret-extra")).toEqual({
      ok: false,
      reason: "unknown_token",
    });
    expect(verifyGatewayBearer("Bearer ltm")).toEqual({
      ok: false,
      reason: "unknown_token",
    });
  });
});
