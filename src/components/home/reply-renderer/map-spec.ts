/**
 * `MapSpec` — minimal JSON shape Olivia returns inside ```map``` fences
 * (Track N Session N2 — map manifestation).
 *
 * The same fence covers all three map intents from the BUILD_SEQUENCE
 * brief:
 *
 *   - `kind: "cities"`     — top-N cities for relocation / comparison
 *   - `kind: "pin"`        — single location with full detail (relocation candidate)
 *   - `kind: "districts"`  — district / region pins for the London tech surface
 *
 * `kind` is a hint to the renderer (drives default zoom + pitch +
 * fly-to behaviour). It is optional; a spec with just `pins` renders.
 *
 * Validated by a hand-rolled checker so the client bundle stays tight
 * (no Zod). Invalid pins are dropped rather than rejecting the whole
 * spec — matches the TimelineFromSpec resilience pattern — but the
 * spec is rejected if zero valid pins survive.
 *
 * Example fence Olivia returns:
 *
 *   ```map
 *   {
 *     "title": "Top 3 cities for your relocation",
 *     "kind": "cities",
 *     "pins": [
 *       { "name": "Lisbon", "lat": 38.7223, "lng": -9.1393, "score": 87,
 *         "detail": "Lowest tax burden + best climate fit.",
 *         "color": "aurum" },
 *       { "name": "Berlin", "lat": 52.5200, "lng": 13.4050, "score": 79,
 *         "color": "aether" },
 *       { "name": "Barcelona", "lat": 41.3851, "lng": 2.1734, "score": 74,
 *         "color": "mint" }
 *     ]
 *   }
 *   ```
 *
 * Optional `flyTo` references a pin by name and animates the camera
 * there at mount (else the renderer auto-fits bounds to all pins).
 * Optional `center` + `zoom` override that completely. Optional
 * `pitch` (0-85) + `bearing` (0-360) tilt the camera for 3D framing.
 */

export type MapKind = "cities" | "pin" | "districts";

/** Token-keyed marker colors (Mapbox can't read CSS vars). */
export type MapColorToken =
  | "aurum"
  | "aether"
  | "mint"
  | "coral"
  | "sky"
  | "amber"
  | "fg";

export interface MapPin {
  name: string;
  lat: number;
  lng: number;
  /** Optional 0-100 score chip rendered on the marker label. */
  score?: number;
  /** Optional one-line detail surfaced in the popup. */
  detail?: string;
  /** Optional marker color (defaults rotate through aurum/aether/mint/sky). */
  color?: MapColorToken;
}

export interface MapSpec {
  /** Optional headline rendered above the map. */
  title?: string;
  /** Hint: drives default zoom + pitch + interaction. */
  kind?: MapKind;
  pins: MapPin[];
  /** [lng, lat] — overrides auto-fit + flyTo. */
  center?: [number, number];
  /** Initial zoom. Clamped by Mapbox to its own range. */
  zoom?: number;
  /** Camera tilt 0-85. Defaults to 45 for `kind: "pin"`, 0 otherwise. */
  pitch?: number;
  /** Camera bearing 0-360. Defaults to 0. */
  bearing?: number;
  /** Pin name to animate the camera to at mount (vs auto-fit-bounds). */
  flyTo?: string;
}

export type MapParseResult =
  | { ok: true; spec: MapSpec }
  | { ok: false; error: string };

const VALID_COLORS: ReadonlySet<MapColorToken> = new Set<MapColorToken>([
  "aurum",
  "aether",
  "mint",
  "coral",
  "sky",
  "amber",
  "fg",
]);

const VALID_KINDS: ReadonlySet<MapKind> = new Set<MapKind>([
  "cities",
  "pin",
  "districts",
]);

function isFiniteNumberInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}

function parsePin(raw: unknown): MapPin | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name !== "string" || obj.name.trim().length === 0) return null;
  if (!isFiniteNumberInRange(obj.lat, -90, 90)) return null;
  if (!isFiniteNumberInRange(obj.lng, -180, 180)) return null;
  const pin: MapPin = {
    name: obj.name,
    lat: obj.lat,
    lng: obj.lng,
  };
  if (isFiniteNumberInRange(obj.score, 0, 100)) pin.score = obj.score;
  if (typeof obj.detail === "string") pin.detail = obj.detail;
  if (typeof obj.color === "string" && VALID_COLORS.has(obj.color as MapColorToken)) {
    pin.color = obj.color as MapColorToken;
  }
  return pin;
}

export function parseMapSpec(raw: string): MapParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "JSON parse failed" };
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { ok: false, error: "expected object" };
  }
  const obj = json as Record<string, unknown>;
  if (!Array.isArray(obj.pins)) {
    return { ok: false, error: '"pins" must be an array' };
  }
  const pins: MapPin[] = [];
  for (const item of obj.pins) {
    const pin = parsePin(item);
    if (pin) pins.push(pin);
  }
  if (pins.length === 0) {
    return { ok: false, error: "no valid pins (each needs name + lat ∈ [-90,90] + lng ∈ [-180,180])" };
  }

  const spec: MapSpec = { pins };
  if (typeof obj.title === "string") spec.title = obj.title;
  if (typeof obj.kind === "string" && VALID_KINDS.has(obj.kind as MapKind)) {
    spec.kind = obj.kind as MapKind;
  }
  if (
    Array.isArray(obj.center) &&
    obj.center.length === 2 &&
    isFiniteNumberInRange(obj.center[0], -180, 180) &&
    isFiniteNumberInRange(obj.center[1], -90, 90)
  ) {
    spec.center = [obj.center[0], obj.center[1]];
  }
  if (isFiniteNumberInRange(obj.zoom, 0, 22)) spec.zoom = obj.zoom;
  if (isFiniteNumberInRange(obj.pitch, 0, 85)) spec.pitch = obj.pitch;
  if (isFiniteNumberInRange(obj.bearing, 0, 360)) spec.bearing = obj.bearing;
  if (typeof obj.flyTo === "string") spec.flyTo = obj.flyTo;

  return { ok: true, spec };
}

const TOKEN_HEX: Record<MapColorToken, string> = {
  aurum: "#C4A96A",
  aether: "#818CF8",
  mint: "#5EE0BE",
  coral: "#F28D7F",
  sky: "#7DD3FC",
  amber: "#FBBF24",
  fg: "#CBC9BD",
};

const DEFAULT_PALETTE: MapColorToken[] = ["aurum", "aether", "mint", "sky", "amber", "coral"];

/**
 * Resolve a pin's color token → hex. Mapbox markers + popups paint with
 * concrete colors, not CSS variables.
 */
export function resolvePinColor(token: MapColorToken | undefined, index: number): string {
  return TOKEN_HEX[token ?? DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]];
}

/**
 * Default pitch for a given `kind`. `"pin"` tilts the camera so the
 * marker stands out against the 3D buildings; the others stay flat.
 */
export function defaultPitchForKind(kind: MapKind | undefined): number {
  return kind === "pin" ? 45 : 0;
}

/**
 * Default zoom for a single-pin view. Multi-pin views auto-fit bounds.
 */
export function defaultZoomForKind(kind: MapKind | undefined): number {
  if (kind === "pin") return 13;
  if (kind === "districts") return 11;
  return 4; // cities — broad enough to see multiple
}
