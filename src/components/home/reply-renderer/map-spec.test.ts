/**
 * `parseMapSpec` tests — Track N Session N2.
 *
 * Covers the JSON shape (pins / kind / center / zoom / pitch / bearing
 * / flyTo), the per-pin validation (lat / lng bounds, score range,
 * color whitelist), and the per-pin drop-rather-than-reject resilience
 * pattern (mirrors TimelineFromSpec — bad pins are skipped but a
 * partially-valid spec still renders).
 */

import { describe, it, expect } from "vitest";
import {
  parseMapSpec,
  resolvePinColor,
  defaultPitchForKind,
  defaultZoomForKind,
  type MapColorToken,
} from "./map-spec";

const LONDON_PIN = {
  name: "London",
  lat: 51.5074,
  lng: -0.1278,
};

describe("parseMapSpec — happy path", () => {
  it("accepts a minimal spec with one valid pin", () => {
    const r = parseMapSpec(JSON.stringify({ pins: [LONDON_PIN] }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.pins).toHaveLength(1);
      expect(r.spec.pins[0]).toMatchObject(LONDON_PIN);
    }
  });

  it("preserves optional pin fields (score, detail, color)", () => {
    const r = parseMapSpec(
      JSON.stringify({
        pins: [
          {
            name: "Lisbon",
            lat: 38.7223,
            lng: -9.1393,
            score: 87,
            detail: "Lowest tax burden + best climate fit.",
            color: "aurum",
          },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const p = r.spec.pins[0];
      expect(p.score).toBe(87);
      expect(p.detail).toBe("Lowest tax burden + best climate fit.");
      expect(p.color).toBe("aurum");
    }
  });

  it("preserves top-level title + kind + flyTo", () => {
    const r = parseMapSpec(
      JSON.stringify({
        title: "Top 3 relocation candidates",
        kind: "cities",
        flyTo: "Lisbon",
        pins: [LONDON_PIN],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.title).toBe("Top 3 relocation candidates");
      expect(r.spec.kind).toBe("cities");
      expect(r.spec.flyTo).toBe("Lisbon");
    }
  });

  it("preserves valid center [lng, lat] tuple", () => {
    const r = parseMapSpec(
      JSON.stringify({
        center: [-0.1, 51.5],
        zoom: 10,
        pitch: 60,
        bearing: 180,
        pins: [LONDON_PIN],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.center).toEqual([-0.1, 51.5]);
      expect(r.spec.zoom).toBe(10);
      expect(r.spec.pitch).toBe(60);
      expect(r.spec.bearing).toBe(180);
    }
  });
});

describe("parseMapSpec — rejections", () => {
  it("rejects malformed JSON", () => {
    const r = parseMapSpec("{ this is not json");
    expect(r.ok).toBe(false);
  });

  it("rejects an array at root", () => {
    const r = parseMapSpec(JSON.stringify([LONDON_PIN]));
    expect(r.ok).toBe(false);
  });

  it("rejects missing pins array", () => {
    const r = parseMapSpec(JSON.stringify({ title: "x" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/pins/);
  });

  it("rejects empty pins array", () => {
    const r = parseMapSpec(JSON.stringify({ pins: [] }));
    expect(r.ok).toBe(false);
  });

  it("rejects when every pin is invalid", () => {
    const r = parseMapSpec(
      JSON.stringify({
        pins: [
          { name: "BadLat", lat: 200, lng: 0 },
          { lat: 1, lng: 2 }, // missing name
          { name: "BadLng", lat: 0, lng: 999 },
        ],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no valid pins/);
  });
});

describe("parseMapSpec — per-pin resilience", () => {
  it("drops invalid pins but keeps valid ones", () => {
    const r = parseMapSpec(
      JSON.stringify({
        pins: [
          LONDON_PIN,
          { name: "BadLat", lat: 91, lng: 0 },
          { name: "", lat: 1, lng: 2 }, // empty name
          { name: "Valid", lat: 0, lng: 0 },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.pins).toHaveLength(2);
      expect(r.spec.pins.map((p) => p.name)).toEqual(["London", "Valid"]);
    }
  });

  it("drops invalid color tokens without dropping the pin", () => {
    const r = parseMapSpec(
      JSON.stringify({
        pins: [
          { ...LONDON_PIN, color: "neon" }, // not in the whitelist
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.pins[0].name).toBe("London");
      expect(r.spec.pins[0].color).toBeUndefined();
    }
  });

  it("drops out-of-range scores without dropping the pin", () => {
    const r = parseMapSpec(
      JSON.stringify({
        pins: [
          { ...LONDON_PIN, score: 150 }, // out of 0-100
          { name: "Berlin", lat: 52.52, lng: 13.405, score: -3 },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.pins[0].score).toBeUndefined();
      expect(r.spec.pins[1].score).toBeUndefined();
    }
  });
});

describe("parseMapSpec — top-level field clamping", () => {
  it("drops invalid kind", () => {
    const r = parseMapSpec(JSON.stringify({ kind: "spaceship", pins: [LONDON_PIN] }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.kind).toBeUndefined();
  });

  it("drops malformed center", () => {
    const r = parseMapSpec(
      JSON.stringify({ center: [999, 999], pins: [LONDON_PIN] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.center).toBeUndefined();
  });

  it("drops out-of-range zoom + pitch + bearing", () => {
    const r = parseMapSpec(
      JSON.stringify({
        zoom: 99,
        pitch: 200,
        bearing: 9999,
        pins: [LONDON_PIN],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.zoom).toBeUndefined();
      expect(r.spec.pitch).toBeUndefined();
      expect(r.spec.bearing).toBeUndefined();
    }
  });

  it("drops NaN / Infinity numeric fields", () => {
    const r = parseMapSpec(
      JSON.stringify({
        pins: [{ name: "X", lat: 0, lng: 0, score: 50 }],
        zoom: null, // not a number — dropped
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.zoom).toBeUndefined();
  });
});

describe("resolvePinColor", () => {
  it("returns the token's canonical hex for explicit colors", () => {
    expect(resolvePinColor("aurum", 0)).toBe("#C4A96A");
    expect(resolvePinColor("aether", 0)).toBe("#818CF8");
    expect(resolvePinColor("mint", 0)).toBe("#5EE0BE");
  });

  it("rotates the default palette by index when no token given", () => {
    const a = resolvePinColor(undefined, 0);
    const b = resolvePinColor(undefined, 1);
    const c = resolvePinColor(undefined, 2);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    // Palette is 6 long — index 6 should match index 0.
    expect(resolvePinColor(undefined, 6)).toBe(a);
  });

  it("returns a 7-char hex string for every token", () => {
    const tokens: MapColorToken[] = [
      "aurum",
      "aether",
      "mint",
      "coral",
      "sky",
      "amber",
      "fg",
    ];
    for (const t of tokens) {
      const hex = resolvePinColor(t, 0);
      expect(hex).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});

describe("defaultPitchForKind / defaultZoomForKind", () => {
  it("tilts the camera for kind=pin only", () => {
    expect(defaultPitchForKind("pin")).toBeGreaterThan(0);
    expect(defaultPitchForKind("cities")).toBe(0);
    expect(defaultPitchForKind("districts")).toBe(0);
    expect(defaultPitchForKind(undefined)).toBe(0);
  });

  it("returns kind-appropriate single-pin zooms", () => {
    expect(defaultZoomForKind("pin")).toBeGreaterThan(defaultZoomForKind("cities"));
    expect(defaultZoomForKind("districts")).toBeGreaterThan(defaultZoomForKind("cities"));
  });
});
