"use client";

/**
 * `MapManifest` — Track N Session N2 (map manifestation).
 *
 * Renders a `map` fence inline in an Olivia reply. Three intents,
 * one fence (driven by the optional `kind` discriminator):
 *
 *   - `kind: "cities"`     — top-N cities for relocation comparison
 *   - `kind: "pin"`        — single relocation candidate with detail + tilt
 *   - `kind: "districts"`  — London tech districts highlighted as pins
 *
 * The renderer:
 *
 *   1. Creates a self-contained `mapbox-gl` instance (a lightweight peer
 *      of the full `/map` surface; no sector filters, no clusters, no
 *      controls — just pins + smooth camera).
 *   2. Either flies to a named pin (`flyTo`) OR uses explicit `center`
 *      + `zoom` OR auto-fits bounds to all pins.
 *   3. On unmount, removes the map cleanly (no WebGL leaks).
 *   4. **Gracefully degrades** when `NEXT_PUBLIC_MAPBOX_TOKEN` is not
 *      configured: renders a card listing each pin with name + score +
 *      detail + a "View on Google Maps" link, so the reply still
 *      communicates the intent.
 *
 * Behaviour parity with the prototype is preserved through tokens
 * (Aurum / Aether per `01_UI_DESIGN_SYSTEM.md`) — no raw hex in the
 * card chrome; the marker fills resolve token → hex via
 * `resolvePinColor` because Mapbox can't read CSS variables.
 */

import { useEffect, useRef, useState } from "react";
import type {
  MapSpec,
  MapPin,
} from "./map-spec";
import {
  resolvePinColor,
  defaultPitchForKind,
  defaultZoomForKind,
} from "./map-spec";

/**
 * Public-token presence check. `NEXT_PUBLIC_*` is inlined at build time
 * by Next.js, so this resolves on first render without a server round
 * trip. An empty string OR missing var both fail-soft to the static
 * fallback.
 */
function readMapboxToken(): string {
  const raw = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  return raw.trim();
}

const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";
const FIT_PADDING = 56;
const FLY_DURATION_MS = 2200;
const DEFAULT_HEIGHT = 320;

export interface MapManifestProps {
  spec: MapSpec;
  maxWidth?: number;
}

export function MapManifest({ spec, maxWidth = 560 }: MapManifestProps) {
  const token = readMapboxToken();
  if (!token) {
    return <MapFallback spec={spec} maxWidth={maxWidth} />;
  }
  return <MapLive spec={spec} maxWidth={maxWidth} token={token} />;
}

/* ── Live Mapbox renderer ──────────────────────────────────────────── */

interface MapLiveProps {
  spec: MapSpec;
  maxWidth: number;
  token: string;
}

function MapLive({ spec, maxWidth, token }: MapLiveProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;
    let cleanupMap: (() => void) | null = null;

    /* Dynamic import — keeps mapbox-gl out of the SSR payload AND lets
     * us catch a missing-module case cleanly even though it's in
     * package.json. */
    (async () => {
      try {
        const mapboxModule = await import("mapbox-gl");
        await import("mapbox-gl/dist/mapbox-gl.css");
        if (cancelled) return;
        const mapboxgl = mapboxModule.default ?? mapboxModule;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapboxgl as any).accessToken = token;

        const pitch = spec.pitch ?? defaultPitchForKind(spec.kind);
        const bearing = spec.bearing ?? 0;
        const initial = computeInitialCamera(spec);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = new (mapboxgl as any).Map({
          container,
          style: MAP_STYLE,
          center: initial.center,
          zoom: initial.zoom,
          pitch,
          bearing,
          attributionControl: true,
          cooperativeGestures: true,
        });
        mapRef.current = m;

        m.on("load", () => {
          if (cancelled) return;

          /* Add a marker per pin. Token → hex via resolvePinColor. */
          spec.pins.forEach((pin, i) => {
            const color = resolvePinColor(pin.color, i);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const popup = new (mapboxgl as any).Popup({
              offset: 24,
              closeButton: false,
              maxWidth: "240px",
            }).setHTML(renderPopupHtml(pin, color));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new (mapboxgl as any).Marker({ color, scale: 0.9 })
              .setLngLat([pin.lng, pin.lat])
              .setPopup(popup)
              .addTo(m);
          });

          /* Fit-bounds or flyTo. Explicit center/zoom in the spec
           * already won the initial camera; only auto-fit when the
           * caller did NOT specify. */
          if (!spec.center && !spec.flyTo && spec.pins.length > 1) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bounds = new (mapboxgl as any).LngLatBounds();
            spec.pins.forEach((p) => bounds.extend([p.lng, p.lat]));
            m.fitBounds(bounds, { padding: FIT_PADDING, duration: 0 });
          }
          if (spec.flyTo) {
            const target = spec.pins.find(
              (p) => p.name.toLowerCase() === spec.flyTo?.toLowerCase(),
            );
            if (target) {
              m.flyTo({
                center: [target.lng, target.lat],
                zoom: spec.zoom ?? defaultZoomForKind(spec.kind ?? "pin"),
                pitch,
                bearing,
                duration: FLY_DURATION_MS,
                essential: true,
              });
            }
          }
        });

        m.on("error", (e: { error?: { message?: string } }) => {
          if (cancelled) return;
          setLoadError(e.error?.message ?? "Map load failed");
        });

        cleanupMap = () => {
          try {
            m.remove();
          } catch {
            /* Mapbox sometimes throws on remove after a WebGL ctx
             * loss — swallow so unmount stays clean. */
          }
        };
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Map module failed to load");
      }
    })();

    return () => {
      cancelled = true;
      if (cleanupMap) cleanupMap();
      mapRef.current = null;
    };
    /* `spec` is treated as immutable per render — Olivia returns a
     * fresh spec each turn. If consumers ever mutate it in place the
     * map will not reactively re-pin (acceptable trade-off given the
     * lifecycle). */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loadError) {
    return <MapFallback spec={spec} maxWidth={maxWidth} note={`Map unavailable: ${loadError}`} />;
  }

  return (
    <figure
      style={{
        margin: "10px 0",
        maxWidth,
        padding: 0,
        borderRadius: "var(--radius-lg)",
        background: "var(--canvas-recess)",
        border: "1px solid var(--border-default)",
        overflow: "hidden",
        display: "grid",
        gap: 0,
      }}
    >
      {spec.title && (
        <figcaption
          style={{
            padding: "10px 14px 6px",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--aurum-primary)",
          }}
        >
          {spec.title}
        </figcaption>
      )}
      <div
        ref={containerRef}
        role="img"
        aria-label={spec.title ?? `Map showing ${spec.pins.length} location${spec.pins.length === 1 ? "" : "s"}`}
        style={{
          width: "100%",
          height: DEFAULT_HEIGHT,
          background: "var(--canvas-base)",
        }}
      />
    </figure>
  );
}

/* ── Static fallback card ──────────────────────────────────────────── */

interface MapFallbackProps {
  spec: MapSpec;
  maxWidth: number;
  note?: string;
}

function MapFallback({ spec, maxWidth, note }: MapFallbackProps) {
  return (
    <article
      style={{
        margin: "10px 0",
        maxWidth,
        padding: 14,
        borderRadius: "var(--radius-lg)",
        background: "var(--canvas-recess)",
        border: "1px solid var(--border-default)",
        display: "grid",
        gap: 10,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--aurum-primary)",
          }}
        >
          {spec.title ?? "Locations"}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--fg-tertiary)",
          }}
          className="tabular-nums"
        >
          {spec.pins.length} pin{spec.pins.length === 1 ? "" : "s"}
        </span>
      </header>
      <ol
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 8,
        }}
      >
        {spec.pins.map((pin, i) => (
          <li key={`${pin.name}-${i}`}>
            <PinRow pin={pin} index={i} />
          </li>
        ))}
      </ol>
      {note && (
        <p
          style={{
            margin: 0,
            color: "var(--fg-tertiary)",
            fontSize: "var(--text-2xs)",
            fontStyle: "italic",
          }}
        >
          {note}
        </p>
      )}
    </article>
  );
}

function PinRow({ pin, index }: { pin: MapPin; index: number }) {
  const color = resolvePinColor(pin.color, index);
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: "var(--radius-full)",
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
        <span
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              color: "var(--fg-primary)",
            }}
          >
            {pin.name}
          </span>
          {pin.score !== undefined && (
            <span
              className="tabular-nums"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                letterSpacing: "0.06em",
                color: color,
                fontWeight: 600,
              }}
            >
              {pin.score}
            </span>
          )}
        </span>
        {pin.detail && (
          <span
            style={{
              color: "var(--fg-secondary)",
              fontSize: "var(--text-sm)",
              lineHeight: 1.4,
            }}
          >
            {pin.detail}
          </span>
        )}
      </div>
      <a
        href={gmaps}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.06em",
          color: "var(--aether-primary)",
          textDecoration: "none",
          padding: "4px 8px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-default)",
          whiteSpace: "nowrap",
        }}
        aria-label={`Open ${pin.name} on Google Maps`}
      >
        Maps →
      </a>
    </div>
  );
}

/* ── Internal helpers ──────────────────────────────────────────────── */

interface InitialCamera {
  center: [number, number];
  zoom: number;
}

/**
 * Decide the camera before the map loads. Explicit `center` always
 * wins; otherwise fall back to the first pin's location at a kind-
 * appropriate zoom. Auto-fit to the full pin set runs AFTER load.
 */
function computeInitialCamera(spec: MapSpec): InitialCamera {
  if (spec.center) {
    return {
      center: spec.center,
      zoom: spec.zoom ?? defaultZoomForKind(spec.kind),
    };
  }
  if (spec.flyTo) {
    const target = spec.pins.find(
      (p) => p.name.toLowerCase() === spec.flyTo?.toLowerCase(),
    );
    if (target) {
      return {
        center: [target.lng, target.lat],
        zoom: spec.zoom ?? defaultZoomForKind(spec.kind ?? "pin"),
      };
    }
  }
  const first = spec.pins[0];
  return {
    center: [first.lng, first.lat],
    zoom: spec.zoom ?? defaultZoomForKind(spec.kind),
  };
}

/**
 * Escape user-controlled content before injecting into the Mapbox popup
 * via setHTML. Mapbox's popup API does not have a setText equivalent
 * that supports formatting, so we sanitise.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderPopupHtml(pin: MapPin, color: string): string {
  const name = escapeHtml(pin.name);
  const detail = pin.detail ? escapeHtml(pin.detail) : "";
  const score = pin.score !== undefined ? String(pin.score) : "";
  return [
    `<div style="font-family:var(--font-sans),system-ui;color:#0E0805;display:grid;gap:4px;min-width:160px">`,
    `<div style="display:flex;align-items:baseline;gap:8px;justify-content:space-between">`,
    `<strong style="font-size:14px">${name}</strong>`,
    score
      ? `<span style="font-family:var(--font-mono),monospace;font-size:11px;font-weight:600;color:${color}">${score}</span>`
      : "",
    `</div>`,
    detail ? `<div style="font-size:12px;line-height:1.4;color:#3F3A33">${detail}</div>` : "",
    `</div>`,
  ].join("");
}
