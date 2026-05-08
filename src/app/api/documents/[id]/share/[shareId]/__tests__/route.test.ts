/**
 * `/api/documents/[id]/share/[shareId]` — surface-contract tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function fakeParams(id = "doc-1", shareId = "share-1") {
  return { params: Promise.resolve({ id, shareId }) };
}

function makeDelete(ip = "5.5.5.50"): Request {
  return new Request(
    "http://localhost/api/documents/doc-1/share/share-1",
    {
      method: "DELETE",
      headers: {
        "x-forwarded-for": ip,
      },
    },
  );
}

describe("/api/documents/[id]/share/[shareId] — module surface", () => {
  it("exposes DELETE", async () => {
    const mod = await import(
      "@/app/api/documents/[id]/share/[shareId]/route"
    );
    expect(typeof mod.DELETE).toBe("function");
  });
});

describe("/api/documents/[id]/share/[shareId] — DELETE auth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 when STUB_USER_ID is unset (auth unavailable)", async () => {
    const { DELETE } = await import(
      "@/app/api/documents/[id]/share/[shareId]/route"
    );
    const res = await DELETE(makeDelete("5.5.5.51") as never, fakeParams());
    expect(res.status).toBe(503);
  });
});
