"use client";

/** Escape HTML special characters to prevent XSS in innerHTML assignments */
function esc(s: string | number | undefined | null): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useMapData } from "./hooks/useMapData";
import { DISTRICT_BOUNDARIES } from "./data/district-boundaries";
import { MAP_DEFAULTS, SCORE_BLOB_COLORS } from "./constants";
import { CategoryFilterPanel, type CategoryKey, ALL_CATEGORIES } from "./controls/CategoryFilterPanel";
import StatsPanel from "./controls/StatsPanel";
import { MapSearchBar } from "./controls/MapSearchBar";
import { DraggableMapControls } from "./controls/DraggableMapControls";
import StreetViewModal from "./overlays/StreetViewModal";
import type { MapOrg } from "./types";

/* ═══════════════════════════════════════════════════════════════════════════
   GoogleMapView — Primary map powered by Google Maps 3D + Three.js
   ═══════════════════════════════════════════════════════════════════════════ */

interface GoogleMapViewProps {
  apiKey: string;
  mapboxToken?: string;
}

/* ── Score tier color helper ── */
function scoreTierColor(score: number): string {
  if (score <= 20) return SCORE_BLOB_COLORS.red;
  if (score <= 40) return SCORE_BLOB_COLORS.orange;
  if (score <= 60) return SCORE_BLOB_COLORS.yellow;
  if (score <= 80) return SCORE_BLOB_COLORS.blue;
  return SCORE_BLOB_COLORS.green;
}

/* ── Category → orgType/programType mapping ── */
function getOrgTypesForCategory(cat: CategoryKey): string[] {
  switch (cat) {
    case "ai_startups": return ["startup", "scaleup", "unicorn", "ai_lab"];
    case "corporate_hq": return ["public_tech_company"];
    case "vc_investors": return ["vc_firm", "corporate_venture", "proptech_fund", "fintech_fund"];
    case "angel_investors": return ["angel_network", "family_office"];
    case "seed_funds": return []; // filtered by fundingStage instead
    case "accelerators": return ["accelerator", "incubator"];
    case "coworking": return ["coworking_operator"];
    case "education": return ["university", "research_lab"];
    case "meetups": return ["founder_club", "event_organizer"];
    case "conferences": return []; // uses events GeoJSON
    case "government": return ["government_funding_body"];
    case "partners": return ["service_provider", "media_platform"];
    case "videos": return [];
  }
}

export function GoogleMapView({ apiKey, mapboxToken }: GoogleMapViewProps) {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const districtOverlaysRef = useRef<google.maps.Polygon[]>([]);
  const cubeMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<CategoryKey>>(
    new Set(ALL_CATEGORIES)
  );
  const [selectedOrg, setSelectedOrg] = useState<GeoJSON.Feature | null>(null);
  const [streetViewOrg, setStreetViewOrg] = useState<{
    org: MapOrg;
    coordinates: [number, number];
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(MAP_DEFAULTS.zoom);

  const {
    districts,
    orgGeoJSON,
    eventGeoJSON,
    coworkingGeoJSON,
    networkingGeoJSON,
    videoGeoJSON,
    loading,
    error,
  } = useMapData();

  /* ── Initialize Google Map ── */
  useEffect(() => {
    if (!mapContainer.current || mapReady) return;

    setOptions({ key: apiKey, v: "weekly" });

    importLibrary("maps")
      .then(() => importLibrary("marker"))
      .then(() => {
        if (!mapContainer.current) return;

        const map = new google.maps.Map(mapContainer.current, {
          center: { lat: MAP_DEFAULTS.center[1], lng: MAP_DEFAULTS.center[0] },
          zoom: MAP_DEFAULTS.zoom,
          tilt: MAP_DEFAULTS.pitch,
          heading: Math.abs(MAP_DEFAULTS.bearing),
          minZoom: MAP_DEFAULTS.minZoom,
          maxZoom: 20,
          mapTypeId: "roadmap",
          mapId: "9465bdf92a5e63de6018c22c",
          // UI controls
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          rotateControl: true,
          rotateControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          scaleControl: true,
          // Touch: greedy = single finger pan, two-finger tilt/rotate
          gestureHandling: "greedy",
          restriction: {
            latLngBounds: {
              north: 51.7,
              south: 51.3,
              west: -0.55,
              east: 0.3,
            },
            strictBounds: false,
          },
          // No `styles` array — using cloud-based styling via mapId.
          // The styles property forces raster mode which blocks 3D/tilt/vector tiles.
        });

        mapRef.current = map;

        // Track zoom level for tier transitions
        map.addListener("zoom_changed", () => {
          const z = map.getZoom();
          if (z !== undefined) setZoomLevel(z);
        });

        setMapReady(true);
      })
      .catch((err) => {
        console.error("Google Maps init failed:", err);
        setMapError(
          "Google Maps failed to load. Check your API key and referrer restrictions."
        );
      });
  }, [apiKey, mapReady]);

  /* ── Calculate filtered counts per district ── */
  const getDistrictCounts = useCallback(() => {
    const counts: Record<string, number> = {};
    if (!orgGeoJSON) return counts;

    for (const feature of orgGeoJSON.features) {
      const props = feature.properties;
      if (!props) continue;

      const districtSlug = props.districtSlug;
      if (!districtSlug) continue;

      // Check if this org's category is active
      let matches = false;
      for (const cat of activeCategories) {
        const types = getOrgTypesForCategory(cat);
        if (types.length > 0 && types.includes(props.orgType)) {
          matches = true;
          break;
        }
        // Seed funds: check fundingStage
        if (cat === "seed_funds" && props.fundingStage === "seed") {
          matches = true;
          break;
        }
      }

      // Events from eventGeoJSON
      // (handled separately below)

      if (matches) {
        counts[districtSlug] = (counts[districtSlug] || 0) + 1;
      }
    }

    // Add event counts if conferences category is active
    if (activeCategories.has("conferences") && eventGeoJSON) {
      for (const f of eventGeoJSON.features) {
        const slug = f.properties?.districtSlug;
        if (slug) counts[slug] = (counts[slug] || 0) + 1;
      }
    }

    // Add coworking counts
    if (activeCategories.has("coworking") && coworkingGeoJSON) {
      for (const f of coworkingGeoJSON.features) {
        const slug = f.properties?.districtSlug;
        if (slug) counts[slug] = (counts[slug] || 0) + 1;
      }
    }

    // Add networking counts
    if (activeCategories.has("meetups") && networkingGeoJSON) {
      for (const f of networkingGeoJSON.features) {
        const slug = f.properties?.districtSlug;
        if (slug) counts[slug] = (counts[slug] || 0) + 1;
      }
    }

    // Add video counts
    if (activeCategories.has("videos") && videoGeoJSON) {
      for (const f of videoGeoJSON.features) {
        const slug = f.properties?.districtSlug;
        if (slug) counts[slug] = (counts[slug] || 0) + 1;
      }
    }

    return counts;
  }, [activeCategories, orgGeoJSON, eventGeoJSON, coworkingGeoJSON, networkingGeoJSON, videoGeoJSON]);

  /* ── Render district boundary polygons ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapError) return;
    const map = mapRef.current;

    // Clear existing
    districtOverlaysRef.current.forEach((p) => p.setMap(null));
    districtOverlaysRef.current = [];

    for (const [slug, dist] of Object.entries(DISTRICT_BOUNDARIES)) {
      const districtData = districts.find((d) => d.slug === slug);
      const score = districtData?.techGravityScore ?? 0;
      const color = scoreTierColor(score);

      const polygon = new google.maps.Polygon({
        paths: dist.coordinates.map(([lng, lat]) => ({ lat, lng })),
        strokeColor: color,
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.08,
        map,
        clickable: true,
      });

      // Click to zoom into district
      polygon.addListener("click", () => {
        const center = dist.coordinates.reduce(
          (acc, [lng, lat]) => ({ lat: acc.lat + lat / dist.coordinates.length, lng: acc.lng + lng / dist.coordinates.length }),
          { lat: 0, lng: 0 }
        );
        map.panTo(center);
        map.setZoom(14);
      });

      districtOverlaysRef.current.push(polygon);
    }
  }, [mapReady, districts]);

  /* ── Render holographic cube markers (Tier 1: zoom 10-13) ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapError) return;
    const map = mapRef.current;

    // Clear existing cube markers
    try { cubeMarkersRef.current.forEach((m) => (m.map = null)); } catch {}
    cubeMarkersRef.current = [];

    const counts = getDistrictCounts();
    const maxCount = Math.max(...Object.values(counts), 1);

    for (const [slug, dist] of Object.entries(DISTRICT_BOUNDARIES)) {
      const districtData = districts.find((d) => d.slug === slug);
      const score = districtData?.techGravityScore ?? 0;
      const count = counts[slug] || 0;
      const color = scoreTierColor(score);

      // Calculate center of district
      const center = dist.coordinates.reduce(
        (acc, [lng, lat]) => ({
          lat: acc.lat + lat / dist.coordinates.length,
          lng: acc.lng + lng / dist.coordinates.length,
        }),
        { lat: 0, lng: 0 }
      );

      // Create holographic 3D cube DOM element
      const cubeEl = document.createElement("div");
      cubeEl.className = "holo-cube-marker";

      // Post height scales with data density
      const heightPercent = maxCount > 0 ? (count / maxCount) : 0;
      const postHeight = 24 + heightPercent * 64; // 24-88px
      const cubeSize = 46;
      const half = cubeSize / 2;

      // Shared face style
      const faceBase = `position:absolute;width:100%;height:100%;backface-visibility:hidden;border-radius:5px;`;

      cubeEl.innerHTML = `
        <div class="holo-marker" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <!-- 3D Cube with perspective -->
          <div style="perspective:800px;width:${cubeSize}px;height:${cubeSize}px;">
            <div class="holo-cube-3d" style="width:100%;height:100%;position:relative;transform-style:preserve-3d;animation:holoCubeSpin 12s ease-in-out infinite;">
              <!-- Front face: count + score -->
              <div style="${faceBase}transform:translateZ(${half}px);background:linear-gradient(135deg,${color}88,${color}40);border:1.5px solid ${color}cc;display:flex;align-items:center;justify-content:center;flex-direction:column;box-shadow:inset 0 0 24px ${color}55,0 0 20px ${color}66;">
                <span style="font-size:20px;font-weight:900;color:white;text-shadow:0 0 16px ${color},0 1px 3px rgba(0,0,0,0.8);line-height:1;">${count}</span>
                <span style="font-size:8px;font-weight:800;color:white;text-transform:uppercase;letter-spacing:0.8px;margin-top:3px;text-shadow:0 0 8px ${color};">${score} pts</span>
              </div>
              <!-- Back face: score display -->
              <div style="${faceBase}transform:rotateY(180deg) translateZ(${half}px);background:linear-gradient(135deg,${color}70,${color}30);border:1.5px solid ${color}99;display:flex;align-items:center;justify-content:center;flex-direction:column;box-shadow:inset 0 0 18px ${color}44;">
                <span style="font-size:8px;font-weight:800;color:white;text-transform:uppercase;letter-spacing:1.2px;text-shadow:0 0 6px ${color};">SCORE</span>
                <span style="font-size:18px;font-weight:900;color:white;text-shadow:0 0 14px ${color},0 1px 3px rgba(0,0,0,0.8);line-height:1.1;">${score}</span>
              </div>
              <!-- Right face -->
              <div style="${faceBase}transform:rotateY(90deg) translateZ(${half}px);background:linear-gradient(135deg,${color}55,${color}25);border:1px solid ${color}77;"></div>
              <!-- Left face -->
              <div style="${faceBase}transform:rotateY(-90deg) translateZ(${half}px);background:linear-gradient(135deg,${color}55,${color}25);border:1px solid ${color}77;"></div>
              <!-- Top face -->
              <div style="${faceBase}transform:rotateX(90deg) translateZ(${half}px);background:linear-gradient(180deg,${color}60,${color}30);border:1px solid ${color}88;"></div>
              <!-- Bottom face -->
              <div style="${faceBase}transform:rotateX(-90deg) translateZ(${half}px);background:linear-gradient(0deg,${color}40,${color}18);border:1px solid ${color}55;"></div>
            </div>
          </div>
          <!-- Post / Stem -->
          <div style="width:3px;height:${postHeight}px;background:linear-gradient(to bottom,${color}cc,${color}40);border-radius:2px;box-shadow:0 0 6px ${color}44;"></div>
          <!-- Base with pulse ring -->
          <div style="position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px;">
            <div class="holo-pulse" style="position:absolute;width:20px;height:20px;border-radius:50%;border:2px solid ${color}88;"></div>
            <div style="width:8px;height:8px;border-radius:50%;background:radial-gradient(circle,white,${color});box-shadow:0 0 12px ${color}cc,0 0 24px ${color}88;"></div>
          </div>
          <!-- District name label -->
          <div style="margin-top:4px;font-size:10px;font-weight:800;color:white;text-shadow:0 1px 3px rgba(0,0,0,0.95),0 0 12px rgba(0,0,0,0.9);white-space:nowrap;text-align:center;letter-spacing:0.5px;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,0.6);">${esc(dist.name)}</div>
        </div>
      `;

      // Visibility based on zoom AND filter state (hide if count is 0)
      const visible = zoomLevel < 14 && count > 0;
      cubeEl.style.display = visible ? "block" : "none";
      cubeEl.style.transition = "opacity 0.4s ease";
      cubeEl.style.opacity = visible ? "1" : "0";

      try {
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: center,
          content: cubeEl,
          title: `${dist.name}: ${count} entities`,
        });

        const handleCubeTap = (e?: Event) => {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          map.panTo(center);
          map.setZoom(14);
        };
        marker.addListener("click", () => handleCubeTap());
        cubeEl.addEventListener("touchend", handleCubeTap, { passive: false });

        cubeMarkersRef.current.push(marker);
      } catch (err) {
        console.warn(`Cube marker failed for ${dist.name}:`, err);
      }
    }
  }, [mapReady, districts, zoomLevel, getDistrictCounts, mapError]);

  /* ── Render individual entity markers (Tier 2: zoom 14-16) ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapError) return;
    const map = mapRef.current;

    // Clear existing entity markers
    try { markersRef.current.forEach((m) => (m.map = null)); } catch {}
    markersRef.current = [];

    // Only show at zoom 14+
    if (zoomLevel < 14) return;

    const allFeatures: GeoJSON.Feature[] = [];

    if (orgGeoJSON) {
      for (const feature of orgGeoJSON.features) {
        const props = feature.properties;
        if (!props) continue;

        let matches = false;
        for (const cat of activeCategories) {
          const types = getOrgTypesForCategory(cat);
          if (types.length > 0 && types.includes(props.orgType)) {
            matches = true;
            break;
          }
          if (cat === "seed_funds" && props.fundingStage === "seed") {
            matches = true;
            break;
          }
        }
        if (matches) allFeatures.push(feature);
      }
    }

    // Add events if active
    if (activeCategories.has("conferences") && eventGeoJSON) {
      allFeatures.push(...eventGeoJSON.features);
    }
    if (activeCategories.has("coworking") && coworkingGeoJSON) {
      allFeatures.push(...coworkingGeoJSON.features);
    }
    if (activeCategories.has("meetups") && networkingGeoJSON) {
      allFeatures.push(...networkingGeoJSON.features);
    }
    if (activeCategories.has("videos") && videoGeoJSON) {
      allFeatures.push(...videoGeoJSON.features);
    }

    // Get visible bounds for performance
    const bounds = map.getBounds();

    for (const feature of allFeatures) {
      if (feature.geometry.type !== "Point") continue;
      const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;

      // Skip if outside visible bounds
      if (bounds && !bounds.contains({ lat, lng })) continue;

      const props = feature.properties || {};
      const name = props.name || "Unknown";
      const sector = props.sector || props.orgType || "";

      // Category color
      const isVideo = props._type === "video";
      let dotColor = "#60A5FA";
      if (isVideo) dotColor = "#EF4444";
      else if (props.orgType === "vc_firm" || props.orgType === "angel_network") dotColor = "#34D399";
      else if (props.orgType === "coworking_operator") dotColor = "#14B8A6";
      else if (props.orgType === "founder_club" || props.orgType === "event_organizer") dotColor = "#F472B6";
      else if (props.orgType === "university" || props.orgType === "research_lab") dotColor = "#C084FC";
      else if (props.orgType === "government_funding_body") dotColor = "#38BDF8";
      else if (props.orgType === "accelerator" || props.orgType === "incubator") dotColor = "#FBBF24";

      // Create circle marker element
      const el = document.createElement("div");
      const isStreetLevel = zoomLevel >= 17;

      if (isStreetLevel) {
        // Tier 3: Detailed pin
        el.innerHTML = `
          <div style="
            display: flex; align-items: center; gap: 6px;
            background: rgba(17, 24, 39, 0.92);
            backdrop-filter: blur(12px);
            border: 1px solid ${dotColor}66;
            border-radius: 8px;
            padding: 4px 10px 4px 6px;
            cursor: pointer;
            transition: all 0.15s ease;
            box-shadow: 0 2px 12px rgba(0,0,0,0.4);
          ">
            <div style="
              width: 8px; height: 8px; border-radius: 50%;
              background: ${dotColor};
              box-shadow: 0 0 6px ${dotColor}88;
              flex-shrink: 0;
            "></div>
            <span style="
              font-size: 11px; font-weight: 600; color: white;
              white-space: nowrap; max-width: 140px;
              overflow: hidden; text-overflow: ellipsis;
            ">${esc(name)}</span>
          </div>
        `;
      } else {
        // Tier 2: Bright circle with name on hover
        el.innerHTML = `
          <div style="
            width: 14px; height: 14px; border-radius: 50%;
            background: ${dotColor};
            border: 2px solid rgba(255,255,255,0.3);
            box-shadow: 0 0 10px ${dotColor}66;
            cursor: pointer;
            transition: all 0.2s ease;
          " title="${esc(name)}"></div>
        `;
      }

      try {
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat, lng },
          content: el,
          title: name,
        });

        // Build MapOrg from feature properties for Street View
        const mapOrg: MapOrg = {
          id: props.id || "",
          name,
          slug: props.slug || "",
          orgType: props.orgType || "",
          sector: props.sector || "",
          description: props.description || "",
          foundedYear: props.foundedYear || null,
          employeeRange: props.employeeRange || null,
          fundingStage: props.fundingStage || null,
          website: props.website || null,
          district: props.district || "",
          districtSlug: props.districtSlug || "",
        };

        // Click/touch handler: street view at zoom 17+, info window otherwise
        const handleEntityTap = (e?: Event) => {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          setSelectedOrg(feature);

          if (zoomLevel >= 17 && props.slug) {
            // Tier 3: Open Street View modal
            setStreetViewOrg({
              org: mapOrg,
              coordinates: [lng, lat],
            });
          } else {
            // Tier 2: Show info window with Street View button
            const svBtnId = `sv-btn-${(props.slug || "").replace(/[^a-z0-9]/gi, "")}`;
            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="
                  background: #111827;
                  color: white;
                  padding: 12px 16px;
                  border-radius: 8px;
                  min-width: 220px;
                  font-family: system-ui, sans-serif;
                ">
                  <div style="font-size:14px;font-weight:700;margin-bottom:4px;">${esc(name)}</div>
                  <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">${esc(sector)} · ${esc(props.district || "")}</div>
                  ${props.description ? `<div style="font-size:11px;color:#d1d5db;line-height:1.4;margin-bottom:8px;">${esc((props.description as string).slice(0, 150))}${(props.description as string).length > 150 ? "..." : ""}</div>` : ""}
                  <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
                    ${props.slug ? `<a href="/directory/${esc(props.slug)}" style="font-size:11px;color:#60a5fa;text-decoration:none;font-weight:600;">View Profile →</a>` : ""}
                    ${props.website ? `<a href="${esc(props.website)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#94a3b8;text-decoration:none;">Website ↗</a>` : ""}
                    <button id="${svBtnId}" style="font-size:11px;color:#FBBF24;background:none;border:none;cursor:pointer;font-weight:600;padding:0;">Street View</button>
                  </div>
                </div>
              `,
              pixelOffset: new google.maps.Size(0, -10),
            });
            infoWindow.open(map, marker);

            // Attach click+touch listeners to the Street View button inside info window
            google.maps.event.addListenerOnce(infoWindow, "domready", () => {
              const svBtn = document.getElementById(svBtnId);
              if (svBtn) {
                const handleSvTap = (ev?: Event) => {
                  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
                  infoWindow.close();
                  setStreetViewOrg({
                    org: mapOrg,
                    coordinates: [lng, lat],
                  });
                };
                svBtn.addEventListener("click", handleSvTap);
                svBtn.addEventListener("touchend", handleSvTap, { passive: false });
              }
            });
          }
        };
        marker.addListener("click", () => handleEntityTap());
        el.addEventListener("touchend", handleEntityTap, { passive: false });

        markersRef.current.push(marker);
      } catch (err) {
        // Silently skip markers that fail (e.g. bad Map ID)
      }
    }
  }, [mapReady, zoomLevel, activeCategories, orgGeoJSON, eventGeoJSON, coworkingGeoJSON, networkingGeoJSON, videoGeoJSON, getDistrictCounts, mapError]);

  /* ── View preset handler ── */
  const handleViewPreset = useCallback(
    (preset: { pitch: number; bearing: number }) => {
      if (!mapRef.current) return;
      mapRef.current.setTilt(preset.pitch);
      mapRef.current.setHeading(Math.abs(preset.bearing));
    },
    []
  );

  /* ── Reset view ── */
  const resetView = useCallback(() => {
    if (!mapRef.current) return;
    // Defer map mutations to next frame so the browser can paint the
    // button's visual response first, keeping INP under 200ms.
    requestAnimationFrame(() => {
      const m = mapRef.current;
      if (!m) return;
      m.panTo({ lat: MAP_DEFAULTS.center[1], lng: MAP_DEFAULTS.center[0] });
      m.setZoom(MAP_DEFAULTS.zoom);
      m.setTilt(MAP_DEFAULTS.pitch);
      m.setHeading(Math.abs(MAP_DEFAULTS.bearing));
    });
  }, []);

  /* ── Search zoom ── */
  const handleSearchZoom = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(18);
  }, []);

  /* ── Stat calculations ── */
  const totalOrgs = districts.reduce((s, d) => s + (d.organizationCount ?? 0), 0);
  const avgScore =
    districts.length > 0
      ? Math.round(
          districts.reduce((s, d) => s + (d.techGravityScore ?? 0), 0) /
            districts.length
        )
      : 0;

  return (
    <div className="relative h-full w-full">
      {/* Loading state */}
      {(loading || !mapReady) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0e1a]">
          <div className="text-center">
            <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-brand-400 border-t-transparent mx-auto" />
            <p className="text-sm text-[var(--muted)]">Loading London Tech Map...</p>
          </div>
        </div>
      )}

      {/* Map API error — full overlay so the broken map isn't visible */}
      {mapError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0e1a]">
          <div className="mx-auto max-w-md rounded-lg border border-red-700/40 bg-red-950/60 p-8 text-center">
            <h2 className="mb-2 text-lg font-semibold text-red-200">Map Failed to Load</h2>
            <p className="mb-4 text-sm text-red-300/80">{mapError}</p>
            <p className="text-xs text-red-400/60">
              Ensure <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> is valid and your domain is in the HTTP referrer list.
            </p>
          </div>
        </div>
      )}

      {/* Data loading error */}
      {error && !mapError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-red-900/80 px-4 py-2 text-sm text-red-200 border border-red-700/50">
          {error}
        </div>
      )}

      {/* Address Search Bar */}
      {mapReady && <MapSearchBar onPlaceSelect={handleSearchZoom} mapboxToken={mapboxToken} />}

      {/* Category Filter Panel */}
      <CategoryFilterPanel
        activeCategories={activeCategories}
        onToggleCategory={(cat) => {
          setActiveCategories((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
          });
        }}
        onToggleAll={(selectAll) => {
          setActiveCategories(selectAll ? new Set(ALL_CATEGORIES) : new Set());
        }}
        districtCounts={getDistrictCounts()}
        totalVisible={Object.values(getDistrictCounts()).reduce((a, b) => a + b, 0)}
      />

      {/* View Preset Buttons — top-right on desktop, horizontal bottom bar on mobile */}
      {mapReady && (
        <>
          {/* Desktop: vertical stack top-right (1024px+) */}
          <div className="absolute top-4 right-4 z-30 hidden lg:flex flex-col gap-1.5">
            {[
              { label: "Top Down", pitch: 0, bearing: 0 },
              { label: "3D View", pitch: 60, bearing: -20 },
              { label: "Street", pitch: 75, bearing: 0 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => handleViewPreset(p)}
                className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors duration-150"
                style={{
                  background: "rgba(17, 24, 39, 0.85)",
                  backdropFilter: "blur(12px)",
                  color: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(30, 41, 59, 0.95)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(17, 24, 39, 0.85)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                }}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={resetView}
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors duration-150 mt-1"
              style={{
                background: "rgba(17, 24, 39, 0.85)",
                backdropFilter: "blur(12px)",
                color: "rgba(196, 169, 106, 0.8)",
                border: "1px solid rgba(196, 169, 106, 0.2)",
              }}
            >
              Reset
            </button>
          </div>

          {/* Mobile/Tablet: Draggable controls widget (<1024px) */}
          <DraggableMapControls
            districtCount={districts.length}
            totalOrgs={totalOrgs}
            avgScore={String(avgScore)}
            onViewPreset={handleViewPreset}
            onReset={resetView}
            usePitchBearing
          />
        </>
      )}

      {/* Stats Panel - Desktop only (lg+) */}
      {mapReady && (
        <div className="hidden lg:block">
          <StatsPanel
            districtCount={districts.length}
            totalOrgs={totalOrgs}
            avgScore={String(avgScore)}
          />
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Street View Modal */}
      {streetViewOrg && (
        <StreetViewModal
          org={streetViewOrg.org}
          coordinates={streetViewOrg.coordinates}
          googleMapsApiKey={apiKey}
          onClose={() => setStreetViewOrg(null)}
          onViewProfile={(slug) => {
            setStreetViewOrg(null);
            router.push(`/directory/${slug}`);
          }}
        />
      )}

      {/* CSS animations for holographic cubes */}
      <style jsx global>{`
        /* 3D cube rotation — full 360° with gentle X-axis wobble */
        @keyframes holoCubeSpin {
          0%   { transform: rotateY(0deg)   rotateX(5deg); }
          25%  { transform: rotateY(90deg)  rotateX(2deg); }
          50%  { transform: rotateY(180deg) rotateX(-3deg); }
          75%  { transform: rotateY(270deg) rotateX(2deg); }
          100% { transform: rotateY(360deg) rotateX(5deg); }
        }
        /* Pulse ring expanding from base dot */
        @keyframes holoPulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(2.8); opacity: 0; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .holo-pulse {
          animation: holoPulse 3s ease-out infinite;
        }
        /* Hover: pause rotation, scale up, brighten */
        .holo-marker:hover .holo-cube-3d {
          animation-play-state: paused !important;
          transform: rotateY(0deg) rotateX(0deg) scale3d(1.18, 1.18, 1.18) !important;
          transition: transform 0.3s ease;
        }
        .holo-marker:hover {
          filter: brightness(1.3) drop-shadow(0 0 8px rgba(255,255,255,0.15));
        }
        /* Google Maps InfoWindow dark theme overrides */
        .gm-style-iw-chr { display: none !important; }
        .gm-style-iw { background: transparent !important; padding: 0 !important; box-shadow: none !important; }
        .gm-style-iw-d { overflow: visible !important; }
        .gm-style-iw-tc { display: none !important; }
      `}</style>
    </div>
  );
}
