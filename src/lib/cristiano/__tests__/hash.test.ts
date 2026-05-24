/**
 * `lib/cristiano/hash` — canonicalisation + SHA256 hash tests.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import { describe, expect, it } from "vitest";

import { hashVerdictPayload } from "@/lib/cristiano/hash";

describe("lib/cristiano/hash — hashVerdictPayload", () => {
  it("returns a 64-char hex string", () => {
    const hash = hashVerdictPayload({ a: 1, b: "x" });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable across calls for the same input", () => {
    const a = hashVerdictPayload({ a: 1, b: "x" });
    const b = hashVerdictPayload({ a: 1, b: "x" });
    expect(a).toBe(b);
  });

  it("is order-independent on object keys (canonicalised)", () => {
    const a = hashVerdictPayload({ a: 1, b: 2, c: 3 });
    const b = hashVerdictPayload({ c: 3, b: 2, a: 1 });
    const c = hashVerdictPayload({ b: 2, a: 1, c: 3 });
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("is order-DEPENDENT on array contents (arrays are semantic)", () => {
    const a = hashVerdictPayload({ tags: ["x", "y", "z"] });
    const b = hashVerdictPayload({ tags: ["z", "y", "x"] });
    expect(a).not.toBe(b);
  });

  it("strips undefined properties before hashing", () => {
    const a = hashVerdictPayload({ a: 1, b: undefined });
    const b = hashVerdictPayload({ a: 1 });
    expect(a).toBe(b);
  });

  it("preserves null properties", () => {
    const a = hashVerdictPayload({ a: 1, b: null });
    const b = hashVerdictPayload({ a: 1 });
    expect(a).not.toBe(b);
  });

  it("hashes nested objects with sorted keys recursively", () => {
    const a = hashVerdictPayload({ outer: { z: 1, a: 2, m: 3 } });
    const b = hashVerdictPayload({ outer: { a: 2, m: 3, z: 1 } });
    expect(a).toBe(b);
  });

  it("produces different hashes for different payloads", () => {
    const a = hashVerdictPayload({ kind: "startup_match", payload: { x: 1 } });
    const b = hashVerdictPayload({ kind: "city_compare", payload: { x: 1 } });
    expect(a).not.toBe(b);
  });

  it("treats NaN and Infinity as null (canonicalisation hardening)", () => {
    const a = hashVerdictPayload({ x: Number.NaN });
    const b = hashVerdictPayload({ x: null });
    expect(a).toBe(b);

    const c = hashVerdictPayload({ x: Number.POSITIVE_INFINITY });
    const d = hashVerdictPayload({ x: null });
    expect(c).toBe(d);
  });
});
