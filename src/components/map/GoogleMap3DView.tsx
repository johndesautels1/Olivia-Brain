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
import { useMapAppointments } from "./MapAppointmentsContext";
import type { MapOrg, MapVideo } from "./types";

/* ═══════════════════════════════════════════════════════════════════════════
   GoogleMap3DView — Photorealistic 3D map using Map3DElement (maps3d)
   Existing GoogleMapView.tsx preserved as fallback.
   ═══════════════════════════════════════════════════════════════════════════ */

interface GoogleMap3DViewProps {
  apiKey: string;
  mapboxToken?: string;
  onFallback?: () => void; // signal parent to switch to fallback
}

/* ── Score tier color helper ── */
function scoreTierColor(score: number): string {
  if (score <= 20) return SCORE_BLOB_COLORS.red;
  if (score <= 40) return SCORE_BLOB_COLORS.orange;
  if (score <= 60) return SCORE_BLOB_COLORS.yellow;
  if (score <= 80) return SCORE_BLOB_COLORS.blue;
  return SCORE_BLOB_COLORS.green;
}

/* ── Category → orgType mapping (shared with GoogleMapView) ── */
function getOrgTypesForCategory(cat: CategoryKey): string[] {
  switch (cat) {
    case "ai_startups": return ["startup", "scaleup", "unicorn", "ai_lab"];
    case "corporate_hq": return ["public_tech_company"];
    case "vc_investors": return ["vc_firm", "corporate_venture", "proptech_fund", "fintech_fund"];
    case "angel_investors": return ["angel_network", "family_office"];
    case "seed_funds": return [];
    case "accelerators": return ["accelerator", "incubator"];
    case "coworking": return ["coworking_operator"];
    case "education": return ["university", "research_lab"];
    case "meetups": return ["founder_club", "event_organizer"];
    case "conferences": return [];
    case "government": return ["government_funding_body"];
    case "partners": return ["service_provider", "media_platform"];
    case "videos": return [];
  }
}

/* ── Range-to-zoom approximation (Map3DElement uses range in meters) ── */
const ZOOM_TO_RANGE: Record<number, number> = {
  10: 40000,
  11: 25000,
  12: 15000,
  13: 8000,
  14: 4000,
  15: 2000,
  16: 1000,
  17: 500,
  18: 250,
  19: 120,
  20: 60,
};

function rangeToApproxZoom(range: number): number {
  if (range >= 40000) return 10;
  if (range >= 25000) return 11;
  if (range >= 15000) return 12;
  if (range >= 8000) return 13;
  if (range >= 4000) return 14;
  if (range >= 2000) return 15;
  if (range >= 1000) return 16;
  if (range >= 500) return 17;
  if (range >= 250) return 18;
  if (range >= 120) return 19;
  return 20;
}

export function GoogleMap3DView({ apiKey, mapboxToken, onFallback }: GoogleMap3DViewProps) {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map3DRef = useRef<any>(null); // Map3DElement
  const markersRef = useRef<any[]>([]);
  const cubeMarkersRef = useRef<any[]>([]);
  const polygonsRef = useRef<any[]>([]);
  const appointmentMarkersRef = useRef<any[]>([]);

  // Appointments from calendar widget
  const { showAppointments, appointments, loadAppointments } = useMapAppointments();

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<CategoryKey>>(
    new Set(ALL_CATEGORIES)
  );
  const [streetViewOrg, setStreetViewOrg] = useState<{
    org: MapOrg;
    coordinates: [number, number];
  } | null>(null);
  const [streetViewVideo, setStreetViewVideo] = useState<{
    video: MapVideo;
    coordinates: [number, number];
  } | null>(null);
  const [currentRange, setCurrentRange] = useState(25000); // ~zoom 11
  const zoomLevel = rangeToApproxZoom(currentRange);

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

  /* ── Initialize Map3DElement ── */
  useEffect(() => {
    if (!mapContainer.current || mapReady) return;

    setOptions({ key: apiKey, v: "beta" });

    importLibrary("maps3d")
      .then((maps3d: any) => {
        if (!mapContainer.current) return;

        const { Map3DElement } = maps3d;

        const map3D = new Map3DElement({
          center: {
            lat: MAP_DEFAULTS.center[1],
            lng: MAP_DEFAULTS.center[0],
            altitude: 800,
          },
          range: 25000,
          tilt: 55,
          heading: 345,
          mode: "HYBRID",
          defaultUIHidden: false,
          gestureHandling: "GREEDY",
        });

        // Style to fill container
        map3D.style.width = "100%";
        map3D.style.height = "100%";
        map3D.style.display = "block";

        mapContainer.current.appendChild(map3D);
        map3DRef.current = map3D;

        // Track range changes for zoom tier logic
        map3D.addEventListener("gmp-rangechange", () => {
          const r = map3D.range;
          if (r !== undefined && r !== null) {
            setCurrentRange(r);
          }
        });

        setMapReady(true);
      })
      .catch((err: any) => {
        console.error("Map3DElement init failed:", err);
        setMapError(
          "Photorealistic 3D map failed to load. Falling back to standard map."
        );
        // Signal parent to use fallback
        if (onFallback) {
          setTimeout(() => onFallback(), 100);
        }
      });
  }, [apiKey, mapReady, onFallback]);

  /* ── Calculate filtered counts per district ── */
  const getDistrictCounts = useCallback(() => {
    const counts: Record<string, number> = {};
    if (!orgGeoJSON) return counts;

    for (const feature of orgGeoJSON.features) {
      const props = feature.properties;
      if (!props) continue;
      const districtSlug = props.districtSlug;
      if (!districtSlug) continue;

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
      if (matches) {
        counts[districtSlug] = (counts[districtSlug] || 0) + 1;
      }
    }

    if (activeCategories.has("conferences") && eventGeoJSON) {
      for (const f of eventGeoJSON.features) {
        const slug = f.properties?.districtSlug;
        if (slug) counts[slug] = (counts[slug] || 0) + 1;
      }
    }
    if (activeCategories.has("coworking") && coworkingGeoJSON) {
      for (const f of coworkingGeoJSON.features) {
        const slug = f.properties?.districtSlug;
        if (slug) counts[slug] = (counts[slug] || 0) + 1;
      }
    }
    if (activeCategories.has("meetups") && networkingGeoJSON) {
      for (const f of networkingGeoJSON.features) {
        const slug = f.properties?.districtSlug;
        if (slug) counts[slug] = (counts[slug] || 0) + 1;
      }
    }
    if (activeCategories.has("videos") && videoGeoJSON) {
      for (const f of videoGeoJSON.features) {
        const slug = f.properties?.districtSlug;
        if (slug) counts[slug] = (counts[slug] || 0) + 1;
      }
    }

    return counts;
  }, [activeCategories, orgGeoJSON, eventGeoJSON, coworkingGeoJSON, networkingGeoJSON, videoGeoJSON]);

  /* ── Render district boundary polygons (Polygon3DElement) ── */
  useEffect(() => {
    if (!mapReady || !map3DRef.current || mapError) return;
    const map3D = map3DRef.current;

    // Clear existing polygons
    polygonsRef.current.forEach((p) => {
      try { p.remove(); } catch {}
    });
    polygonsRef.current = [];

    // Dynamically import Polygon3DElement
    importLibrary("maps3d").then((maps3d: any) => {
      const { Polygon3DElement } = maps3d;
      if (!Polygon3DElement) return;

      for (const [slug, dist] of Object.entries(DISTRICT_BOUNDARIES)) {
        const districtData = districts.find((d) => d.slug === slug);
        const score = districtData?.techGravityScore ?? 0;
        const color = scoreTierColor(score);

        try {
          const polygon = new Polygon3DElement({
            strokeColor: color + "99",
            strokeWidth: 2,
            fillColor: color + "20",
            altitudeMode: "CLAMP_TO_GROUND",
            extruded: false,
            drawsOccludedSegments: true,
          });

          polygon.outerCoordinates = dist.coordinates.map(([lng, lat]) => ({
            lat,
            lng,
            altitude: 0,
          }));

          map3D.append(polygon);
          polygonsRef.current.push(polygon);
        } catch (err) {
          console.warn(`Polygon failed for ${dist.name}:`, err);
        }
      }
    });
  }, [mapReady, districts, mapError]);

  /* ── Render holographic cube markers (Tier 1: high range / low zoom) ── */
  useEffect(() => {
    if (!mapReady || !map3DRef.current || mapError) return;
    const map3D = map3DRef.current;

    // Clear existing cube markers
    cubeMarkersRef.current.forEach((m) => {
      try { m.remove(); } catch {}
    });
    cubeMarkersRef.current = [];

    // Only show cubes at city-level (approx zoom < 14, range > 4000m)
    if (zoomLevel >= 14) return;

    const counts = getDistrictCounts();
    const maxCount = Math.max(...Object.values(counts), 1);

    importLibrary("maps3d").then((maps3d: any) => {
      const { Marker3DElement, MarkerElement } = maps3d;

      // MarkerElement (gmp-marker) supports custom HTML on 3D maps.
      // Marker3DElement does NOT support arbitrary HTML — only SVG/img in <template>.
      // Try MarkerElement first; fall back to SVG-in-template on Marker3DElement.
      const useMarkerElement = !!MarkerElement;

      for (const [slug, dist] of Object.entries(DISTRICT_BOUNDARIES)) {
        const districtData = districts.find((d) => d.slug === slug);
        const score = districtData?.techGravityScore ?? 0;
        const count = counts[slug] || 0;
        const color = scoreTierColor(score);

        // Hide cubes with 0 entities
        if (count === 0) continue;

        // Calculate center of district
        const center = dist.coordinates.reduce(
          (acc, [lng, lat]) => ({
            lat: acc.lat + lat / dist.coordinates.length,
            lng: acc.lng + lng / dist.coordinates.length,
          }),
          { lat: 0, lng: 0 }
        );

        // Cube size scales with data density
        const heightPercent = maxCount > 0 ? count / maxCount : 0;
        const cubeSize = 52;
        const postHeight = Math.round(24 + heightPercent * 64);

        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        try {
          let marker: any;

          if (useMarkerElement) {
            // ── MarkerElement: supports arbitrary HTML children on 3D maps ──
            marker = new MarkerElement({
              position: { lat: center.lat, lng: center.lng },
              altitudeMode: "CLAMP_TO_GROUND",
              collisionBehavior: "OPTIONAL_AND_HIDES_LOWER_PRIORITY",
            });

            const cubeEl = document.createElement("div");
            cubeEl.style.cssText = `display:flex;flex-direction:column;align-items:center;cursor:pointer;`;

            cubeEl.innerHTML = `
              <div style="width:${cubeSize}px;height:${cubeSize}px;background:rgb(${r},${g},${b});border-radius:8px;display:flex;align-items:center;justify-content:center;flex-direction:column;box-shadow:0 4px 20px rgba(${r},${g},${b},0.5),0 0 40px rgba(${r},${g},${b},0.2);border:1px solid rgba(255,255,255,0.15);">
                <span style="font-size:20px;font-weight:900;color:white;text-shadow:0 1px 4px rgba(0,0,0,0.5);">${count}</span>
                <span style="font-size:9px;font-weight:900;color:#111827;letter-spacing:0.5px;">${score}pts</span>
              </div>
              <div style="width:3px;height:${postHeight}px;background:rgb(${r},${g},${b});box-shadow:0 0 8px rgba(${r},${g},${b},0.4);"></div>
              <div style="font-size:9px;font-weight:800;color:white;white-space:nowrap;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,0.75);margin-top:4px;text-shadow:0 1px 2px rgba(0,0,0,0.5);">${esc(dist.name)}</div>
            `;

            const handleCubeTap = (e: Event) => {
              e.preventDefault();
              e.stopPropagation();
              map3D.flyCameraTo({
                endCamera: {
                  center: { lat: center.lat, lng: center.lng, altitude: 100 },
                  range: 3000,
                  tilt: 60,
                  heading: map3D.heading || 345,
                },
                durationMillis: 1500,
              });
            };

            cubeEl.addEventListener("click", handleCubeTap);
            cubeEl.addEventListener("touchend", handleCubeTap, { passive: false });

            marker.append(cubeEl);
          } else {
            // ── Fallback: Marker3DElement with SVG inside <template> ──
            const totalH = cubeSize + postHeight + 28;
            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute("width", String(cubeSize + 40));
            svg.setAttribute("height", String(totalH));
            svg.setAttribute("viewBox", `0 0 ${cubeSize + 40} ${totalH}`);

            const cx = (cubeSize + 40) / 2;

            // Cube rectangle
            const rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", String(cx - cubeSize / 2));
            rect.setAttribute("y", "0");
            rect.setAttribute("width", String(cubeSize));
            rect.setAttribute("height", String(cubeSize));
            rect.setAttribute("rx", "8");
            rect.setAttribute("fill", `rgb(${r},${g},${b})`);
            svg.appendChild(rect);

            // Count text
            const countText = document.createElementNS(svgNS, "text");
            countText.setAttribute("x", String(cx));
            countText.setAttribute("y", String(cubeSize / 2 - 2));
            countText.setAttribute("text-anchor", "middle");
            countText.setAttribute("dominant-baseline", "middle");
            countText.setAttribute("fill", "white");
            countText.setAttribute("font-size", "20");
            countText.setAttribute("font-weight", "900");
            countText.textContent = String(count);
            svg.appendChild(countText);

            // Score text
            const scoreText = document.createElementNS(svgNS, "text");
            scoreText.setAttribute("x", String(cx));
            scoreText.setAttribute("y", String(cubeSize / 2 + 14));
            scoreText.setAttribute("text-anchor", "middle");
            scoreText.setAttribute("dominant-baseline", "middle");
            scoreText.setAttribute("fill", "#111827");
            scoreText.setAttribute("font-size", "9");
            scoreText.setAttribute("font-weight", "900");
            scoreText.textContent = `${score}pts`;
            svg.appendChild(scoreText);

            // Rod line
            const rod = document.createElementNS(svgNS, "rect");
            rod.setAttribute("x", String(cx - 1.5));
            rod.setAttribute("y", String(cubeSize));
            rod.setAttribute("width", "3");
            rod.setAttribute("height", String(postHeight));
            rod.setAttribute("fill", `rgb(${r},${g},${b})`);
            svg.appendChild(rod);

            // Name label background
            const labelY = cubeSize + postHeight + 4;
            const labelBg = document.createElementNS(svgNS, "rect");
            labelBg.setAttribute("x", "0");
            labelBg.setAttribute("y", String(labelY));
            labelBg.setAttribute("width", String(cubeSize + 40));
            labelBg.setAttribute("height", "18");
            labelBg.setAttribute("rx", "4");
            labelBg.setAttribute("fill", "rgba(0,0,0,0.75)");
            svg.appendChild(labelBg);

            // Name label text
            const nameText = document.createElementNS(svgNS, "text");
            nameText.setAttribute("x", String(cx));
            nameText.setAttribute("y", String(labelY + 12));
            nameText.setAttribute("text-anchor", "middle");
            nameText.setAttribute("fill", "white");
            nameText.setAttribute("font-size", "9");
            nameText.setAttribute("font-weight", "800");
            nameText.textContent = dist.name;
            svg.appendChild(nameText);

            const cubeAltitude = 200 + heightPercent * 600;

            marker = new Marker3DElement({
              position: { lat: center.lat, lng: center.lng, altitude: cubeAltitude },
              altitudeMode: "ABSOLUTE",
              extruded: true,
              sizePreserved: true,
            });

            // Marker3DElement requires SVG/img wrapped in <template>
            const template = document.createElement("template");
            template.content.append(svg);
            marker.append(template);
          }

          map3D.append(marker);
          cubeMarkersRef.current.push(marker);
        } catch (err) {
          console.warn(`3D Cube marker failed for ${dist.name}:`, err);
        }
      }
    });
  }, [mapReady, districts, zoomLevel, getDistrictCounts, mapError]);

  /* ── Render individual entity markers (Tier 2+3: close range / high zoom) ── */
  useEffect(() => {
    if (!mapReady || !map3DRef.current || mapError) return;
    const map3D = map3DRef.current;

    // Clear existing entity markers
    markersRef.current.forEach((m) => {
      try { m.remove(); } catch {}
    });
    markersRef.current = [];

    // Only show at zoom 14+ (range < 4000m)
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

    importLibrary("maps3d").then((maps3d: any) => {
      const { Marker3DElement, MarkerElement } = maps3d;
      const useMarkerElement = !!MarkerElement;

      for (const feature of allFeatures) {
        if (feature.geometry.type !== "Point") continue;
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
        const props = feature.properties || {};
        const name = props.name || "Unknown";

        const isVideo = props._type === "video";

        // Category color
        let dotColor = "#60A5FA";
        if (isVideo) dotColor = "#EF4444";
        else if (props.orgType === "vc_firm" || props.orgType === "angel_network") dotColor = "#34D399";
        else if (props.orgType === "coworking_operator") dotColor = "#14B8A6";
        else if (props.orgType === "founder_club" || props.orgType === "event_organizer") dotColor = "#F472B6";
        else if (props.orgType === "university" || props.orgType === "research_lab") dotColor = "#C084FC";
        else if (props.orgType === "government_funding_body") dotColor = "#38BDF8";
        else if (props.orgType === "accelerator" || props.orgType === "incubator") dotColor = "#FBBF24";

        const isStreetLevel = zoomLevel >= 17;

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

        try {
          let marker: any;

          if (useMarkerElement) {
            // ── MarkerElement: supports HTML children ──
            marker = new MarkerElement({
              position: { lat, lng },
              altitudeMode: "CLAMP_TO_GROUND",
            });

            const el = document.createElement("div");
            if (isStreetLevel) {
              el.innerHTML = `
                <div style="display:flex;align-items:center;gap:6px;background:rgba(17,24,39,0.92);border:1px solid ${dotColor}66;border-radius:8px;padding:4px 10px 4px 6px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.4);">
                  <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};box-shadow:0 0 6px ${dotColor}88;flex-shrink:0;"></div>
                  <span style="font-size:11px;font-weight:600;color:white;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;">${esc(name)}</span>
                </div>
              `;
            } else {
              el.innerHTML = `
                <div style="width:20px;height:20px;border-radius:50%;background:${dotColor};border:2px solid rgba(255,255,255,0.7);box-shadow:0 0 14px ${dotColor}aa,0 0 6px rgba(255,255,255,0.3);cursor:pointer;" title="${esc(name)}"></div>
              `;
            }

            const handleTap = (e: Event) => {
              e.preventDefault();
              e.stopPropagation();
              if (zoomLevel >= 17 && props.slug) {
                if (isVideo) {
                  const mapVideo: MapVideo = {
                    id: props.id || "",
                    slug: props.slug || "",
                    title: props.title || name,
                    thumbnailUrl: props.thumbnailUrl || null,
                    channelTitle: props.channelTitle || null,
                    publishedAt: props.publishedAt || null,
                    lrsTotal: props.lrsTotal ?? null,
                    aiSectors: Array.isArray(props.aiSectors) ? props.aiSectors : [],
                    aiSummary: props.aiSummary || null,
                    contentType: props.contentType || null,
                    duration: props.duration ?? null,
                    district: props.district || "",
                    districtSlug: props.districtSlug || "",
                  };
                  setStreetViewVideo({ video: mapVideo, coordinates: [lng, lat] });
                } else {
                  setStreetViewOrg({ org: mapOrg, coordinates: [lng, lat] });
                }
              } else {
                map3D.flyCameraTo({
                  endCamera: {
                    center: { lat, lng, altitude: 50 },
                    range: 400, tilt: 65,
                    heading: map3D.heading || 345,
                  },
                  durationMillis: 1000,
                });
              }
            };

            el.addEventListener("click", handleTap);
            el.addEventListener("touchend", handleTap, { passive: false });

            marker.append(el);
          } else {
            // ── Fallback: Marker3DElement with SVG in <template> ──
            const svgNS = "http://www.w3.org/2000/svg";

            if (isStreetLevel) {
              // Street-level: name label chip as SVG
              const chipW = Math.min(name.length * 7 + 30, 180);
              const chipH = 24;
              const svg = document.createElementNS(svgNS, "svg");
              svg.setAttribute("width", String(chipW));
              svg.setAttribute("height", String(chipH));
              svg.setAttribute("viewBox", `0 0 ${chipW} ${chipH}`);

              const bg = document.createElementNS(svgNS, "rect");
              bg.setAttribute("width", String(chipW));
              bg.setAttribute("height", String(chipH));
              bg.setAttribute("rx", "8");
              bg.setAttribute("fill", "rgba(17,24,39,0.92)");
              bg.setAttribute("stroke", dotColor);
              bg.setAttribute("stroke-opacity", "0.4");
              svg.appendChild(bg);

              const dot = document.createElementNS(svgNS, "circle");
              dot.setAttribute("cx", "12");
              dot.setAttribute("cy", String(chipH / 2));
              dot.setAttribute("r", "4");
              dot.setAttribute("fill", dotColor);
              svg.appendChild(dot);

              const txt = document.createElementNS(svgNS, "text");
              txt.setAttribute("x", "22");
              txt.setAttribute("y", String(chipH / 2 + 4));
              txt.setAttribute("fill", "white");
              txt.setAttribute("font-size", "11");
              txt.setAttribute("font-weight", "600");
              txt.textContent = name.length > 20 ? name.slice(0, 18) + "…" : name;
              svg.appendChild(txt);

              marker = new Marker3DElement({
                position: { lat, lng, altitude: 30 },
                altitudeMode: "RELATIVE_TO_GROUND",
                sizePreserved: true,
              });

              const tmpl = document.createElement("template");
              tmpl.content.append(svg);
              marker.append(tmpl);
            } else {
              // District-level: colored dot as SVG
              const svg = document.createElementNS(svgNS, "svg");
              svg.setAttribute("width", "20");
              svg.setAttribute("height", "20");
              svg.setAttribute("viewBox", "0 0 20 20");

              const circle = document.createElementNS(svgNS, "circle");
              circle.setAttribute("cx", "10");
              circle.setAttribute("cy", "10");
              circle.setAttribute("r", "7");
              circle.setAttribute("fill", dotColor);
              circle.setAttribute("stroke", "rgba(255,255,255,0.7)");
              circle.setAttribute("stroke-width", "2");
              svg.appendChild(circle);

              marker = new Marker3DElement({
                position: { lat, lng, altitude: 30 },
                altitudeMode: "RELATIVE_TO_GROUND",
                sizePreserved: true,
              });

              const tmpl = document.createElement("template");
              tmpl.content.append(svg);
              marker.append(tmpl);
            }
          }

          map3D.append(marker);
          markersRef.current.push(marker);
        } catch (err) {
          // Silently skip
        }
      }
    });
  }, [mapReady, zoomLevel, activeCategories, orgGeoJSON, eventGeoJSON, coworkingGeoJSON, networkingGeoJSON, videoGeoJSON, getDistrictCounts, mapError]);

  /* ── Load appointments when toggle is enabled ── */
  useEffect(() => {
    if (mapReady && showAppointments) {
      // Load appointments with the Google API key for geocoding
      loadAppointments(apiKey);
    }
  }, [mapReady, showAppointments, loadAppointments, apiKey]);

  /* ── Render appointment markers (from calendar widget) ── */
  useEffect(() => {
    if (!mapReady || !map3DRef.current || mapError) return;
    const map3D = map3DRef.current;

    // Clear existing appointment markers
    appointmentMarkersRef.current.forEach((m) => {
      try { m.remove(); } catch {}
    });
    appointmentMarkersRef.current = [];

    // Don't render if appointments are hidden or empty
    if (!showAppointments || appointments.length === 0) return;

    importLibrary("maps3d").then((maps3d: any) => {
      const { MarkerElement, Marker3DElement } = maps3d;
      const useMarkerElement = !!MarkerElement;

      for (const apt of appointments) {
        try {
          let marker: any;

          if (useMarkerElement) {
            // ── MarkerElement: supports HTML children ──
            marker = new MarkerElement({
              position: { lat: apt.lat, lng: apt.lng },
              altitudeMode: "CLAMP_TO_GROUND",
              collisionBehavior: "REQUIRED_AND_HIDES_OPTIONAL",
            });

            const el = document.createElement("div");
            el.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer;";
            el.innerHTML = `
              <div style="
                display:flex;
                flex-direction:column;
                align-items:center;
                padding:10px 14px;
                border-radius:10px;
                background:linear-gradient(180deg, rgba(10,14,26,0.96), rgba(6,10,20,0.98));
                border:2px solid rgba(196,169,106,0.6);
                box-shadow:0 6px 24px rgba(0,0,0,0.5), 0 0 16px rgba(196,169,106,0.2), inset 0 1px 0 rgba(196,169,106,0.15);
                min-width:100px;
              ">
                <span style="font-size:12px;font-weight:700;color:white;text-align:center;line-height:1.2;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(apt.entityName)}</span>
                <span style="font-size:10px;font-weight:600;color:#c4a96a;margin-top:3px;">${esc(apt.time)} · ${esc(apt.date)}</span>
                <span style="font-size:9px;color:rgba(255,255,255,0.6);margin-top:2px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(apt.location)}</span>
              </div>
              <div style="width:3px;height:24px;background:linear-gradient(180deg, rgba(196,169,106,0.8), rgba(196,169,106,0.3));border-radius:2px;"></div>
              <div style="width:12px;height:12px;border-radius:50%;background:#c4a96a;box-shadow:0 0 8px rgba(196,169,106,0.6);"></div>
            `;

            const handleTap = (e: Event) => {
              e.preventDefault();
              e.stopPropagation();
              // Fly to the appointment location
              map3D.flyCameraTo({
                endCamera: {
                  center: { lat: apt.lat, lng: apt.lng, altitude: 50 },
                  range: 600,
                  tilt: 60,
                  heading: map3D.heading || 345,
                },
                durationMillis: 1000,
              });
            };

            el.addEventListener("click", handleTap);
            el.addEventListener("touchend", handleTap, { passive: false });

            marker.append(el);
          } else {
            // ── Fallback: Marker3DElement with SVG in <template> ──
            const svgNS = "http://www.w3.org/2000/svg";
            const markerW = 110;
            const markerH = 85;
            const svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute("width", String(markerW));
            svg.setAttribute("height", String(markerH));
            svg.setAttribute("viewBox", `0 0 ${markerW} ${markerH}`);

            // Background rectangle
            const bg = document.createElementNS(svgNS, "rect");
            bg.setAttribute("x", "5");
            bg.setAttribute("y", "0");
            bg.setAttribute("width", "100");
            bg.setAttribute("height", "58");
            bg.setAttribute("rx", "8");
            bg.setAttribute("fill", "rgba(10,14,26,0.96)");
            bg.setAttribute("stroke", "rgba(196,169,106,0.6)");
            bg.setAttribute("stroke-width", "2");
            svg.appendChild(bg);

            // Entity name
            const nameText = document.createElementNS(svgNS, "text");
            nameText.setAttribute("x", "55");
            nameText.setAttribute("y", "17");
            nameText.setAttribute("text-anchor", "middle");
            nameText.setAttribute("fill", "white");
            nameText.setAttribute("font-size", "10");
            nameText.setAttribute("font-weight", "700");
            nameText.textContent = apt.entityName.length > 14 ? apt.entityName.slice(0, 12) + "…" : apt.entityName;
            svg.appendChild(nameText);

            // Time + Date
            const timeText = document.createElementNS(svgNS, "text");
            timeText.setAttribute("x", "55");
            timeText.setAttribute("y", "32");
            timeText.setAttribute("text-anchor", "middle");
            timeText.setAttribute("fill", "#c4a96a");
            timeText.setAttribute("font-size", "8");
            timeText.setAttribute("font-weight", "600");
            timeText.textContent = `${apt.time} · ${apt.date}`;
            svg.appendChild(timeText);

            // Location
            const locText = document.createElementNS(svgNS, "text");
            locText.setAttribute("x", "55");
            locText.setAttribute("y", "48");
            locText.setAttribute("text-anchor", "middle");
            locText.setAttribute("fill", "rgba(255,255,255,0.6)");
            locText.setAttribute("font-size", "7");
            locText.textContent = apt.location.length > 16 ? apt.location.slice(0, 14) + "…" : apt.location;
            svg.appendChild(locText);

            // Rod
            const rod = document.createElementNS(svgNS, "rect");
            rod.setAttribute("x", "53");
            rod.setAttribute("y", "58");
            rod.setAttribute("width", "3");
            rod.setAttribute("height", "18");
            rod.setAttribute("fill", "rgba(196,169,106,0.7)");
            svg.appendChild(rod);

            // Base circle (slightly bigger)
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", "55");
            circle.setAttribute("cy", "80");
            circle.setAttribute("r", "5");
            circle.setAttribute("fill", "#c4a96a");
            svg.appendChild(circle);

            marker = new Marker3DElement({
              position: { lat: apt.lat, lng: apt.lng, altitude: 80 },
              altitudeMode: "RELATIVE_TO_GROUND",
              sizePreserved: true,
            });

            const tmpl = document.createElement("template");
            tmpl.content.append(svg);
            marker.append(tmpl);
          }

          map3D.append(marker);
          appointmentMarkersRef.current.push(marker);
        } catch (err) {
          console.warn("Appointment marker failed:", err);
        }
      }
    });
  }, [mapReady, mapError, showAppointments, appointments]);

  /* ── View preset handler (flyCameraTo) ── */
  const handleViewPreset = useCallback(
    (preset: { tilt: number; heading: number; range?: number }) => {
      if (!map3DRef.current) return;
      const map3D = map3DRef.current;
      map3D.flyCameraTo({
        endCamera: {
          center: map3D.center || {
            lat: MAP_DEFAULTS.center[1],
            lng: MAP_DEFAULTS.center[0],
            altitude: 800,
          },
          range: preset.range || map3D.range || 25000,
          tilt: preset.tilt,
          heading: preset.heading,
        },
        durationMillis: 800,
      });
    },
    []
  );

  /* ── Reset view ── */
  const resetView = useCallback(() => {
    if (!map3DRef.current) return;
    // Defer camera animation to next frame so the browser can paint the
    // button's visual response first, keeping INP under 200ms.
    requestAnimationFrame(() => {
      if (!map3DRef.current) return;
      map3DRef.current.flyCameraTo({
        endCamera: {
          center: {
            lat: MAP_DEFAULTS.center[1],
            lng: MAP_DEFAULTS.center[0],
            altitude: 800,
          },
          range: 25000,
          tilt: 55,
          heading: 345,
        },
        durationMillis: 1200,
      });
    });
  }, []);

  /* ── Search zoom ── */
  const handleSearchZoom = useCallback((lat: number, lng: number) => {
    if (!map3DRef.current) return;
    map3DRef.current.flyCameraTo({
      endCamera: {
        center: { lat, lng, altitude: 100 },
        range: 500,
        tilt: 55,
        heading: 345,
      },
      durationMillis: 1500,
    });
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
      {(loading || !mapReady) && !mapError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0e1a]">
          <div className="text-center">
            <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-brand-400 border-t-transparent mx-auto" />
            <p className="text-sm text-[var(--muted)]">Loading Photorealistic 3D Map...</p>
          </div>
        </div>
      )}

      {/* Map API error */}
      {mapError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0e1a]">
          <div className="mx-auto max-w-md rounded-lg border border-red-700/40 bg-red-950/60 p-8 text-center">
            <h2 className="mb-2 text-lg font-semibold text-red-200">3D Map Failed to Load</h2>
            <p className="mb-4 text-sm text-red-300/80">{mapError}</p>
            <p className="text-xs text-red-400/60">
              Falling back to standard map view...
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
          // Defer state update to let browser paint checkbox first (INP optimization)
          requestAnimationFrame(() => {
            setActiveCategories((prev) => {
              const next = new Set(prev);
              if (next.has(cat)) next.delete(cat);
              else next.add(cat);
              return next;
            });
          });
        }}
        onToggleAll={(selectAll) => {
          // Defer state update to let browser paint checkbox first (INP optimization)
          requestAnimationFrame(() => {
            setActiveCategories(selectAll ? new Set(ALL_CATEGORIES) : new Set());
          });
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
              { label: "Top Down", tilt: 0, heading: 0 },
              { label: "3D View", tilt: 60, heading: 340 },
              { label: "Street", tilt: 75, heading: 0 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => handleViewPreset(p)}
                className="cfp-row rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors duration-150"
                style={{
                  background: "rgba(17, 24, 39, 0.85)",
                  backdropFilter: "blur(12px)",
                  color: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={resetView}
              className="cfp-row rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors duration-150 mt-1"
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

      {/* 3D Map container */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Street View Modal (org) */}
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

      {/* Street View Modal (video) */}
      {streetViewVideo && (
        <StreetViewModal
          video={streetViewVideo.video}
          coordinates={streetViewVideo.coordinates}
          googleMapsApiKey={apiKey}
          onClose={() => setStreetViewVideo(null)}
          onViewProfile={(slug) => {
            setStreetViewVideo(null);
            router.push(`/videos/${slug}`);
          }}
        />
      )}

      {/* No global CSS needed — all cube styles are pure inline for shadow DOM compat */}
    </div>
  );
}
