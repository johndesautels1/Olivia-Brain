"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { DistrictWithStats } from "@/types";
import type { MapOrg } from "../types";
import {
  LAYER_IDS,
  SCORE_BLOB_COLORS,
  buildSectorColorExpr,
  sectorColor,
  ORG_TYPE_LABELS,
} from "../constants";
import { DISTRICT_BOUNDARIES } from "../data/district-boundaries";

interface UseMapLayersProps {
  map: mapboxgl.Map | null;
  mapReady: boolean;
  orgGeoJSON: GeoJSON.FeatureCollection | null;
  districts: DistrictWithStats[];
  showHeatmap: boolean;
  showPins: boolean;
  showDistricts: boolean;
  showEvents: boolean;
  showCoworking: boolean;
  showNetworking: boolean;
  eventGeoJSON: GeoJSON.FeatureCollection | null;
  coworkingGeoJSON: GeoJSON.FeatureCollection | null;
  networkingGeoJSON: GeoJSON.FeatureCollection | null;
  activeSectors: Set<string>;
  onClusterClick: (clusterId: number, coordinates: [number, number], pointCount: number) => void;
  onOrgClick: (org: MapOrg, coordinates: [number, number]) => void;
}

export function useMapLayers({
  map,
  mapReady,
  orgGeoJSON,
  districts,
  showHeatmap,
  showPins,
  showDistricts,
  showEvents,
  showCoworking,
  showNetworking,
  eventGeoJSON,
  coworkingGeoJSON,
  networkingGeoJSON,
  activeSectors,
  onClusterClick,
  onOrgClick,
}: UseMapLayersProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const layersAdded = useRef(false);

  // Add sources and layers
  useEffect(() => {
    if (!map || !mapReady || !orgGeoJSON || layersAdded.current) return;
    if (map.getSource("org-data")) return;

    layersAdded.current = true;

    // ── District boundary polygons ──
    const scoreBySlug: Record<string, number> = {};
    for (const d of districts) {
      if (d.slug) scoreBySlug[d.slug] = d.techGravityScore ?? 0;
    }

    const boundaryFeatures: GeoJSON.Feature[] = Object.entries(DISTRICT_BOUNDARIES)
      .map(([slug, data]) => ({
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [data.coordinates],
        },
        properties: {
          slug,
          name: data.name,
          score: scoreBySlug[slug] ?? 0,
        },
      }));

    map.addSource("district-boundaries", {
      type: "geojson",
      data: { type: "FeatureCollection", features: boundaryFeatures },
    });

    // Fill layer — color by score tier
    map.addLayer({
      id: LAYER_IDS.districtFill,
      type: "fill",
      source: "district-boundaries",
      paint: {
        "fill-color": [
          "step", ["get", "score"],
          "rgba(248,113,113,0.15)",      // 0-20 red
          21, "rgba(251,146,60,0.15)",   // 21-40 orange
          41, "rgba(250,204,21,0.15)",   // 41-60 yellow
          61, "rgba(96,165,250,0.15)",   // 61-80 blue
          81, "rgba(74,222,128,0.15)",   // 81-100 green
        ] as unknown as mapboxgl.Expression,
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 14, 0.3],
      },
    });

    // Outline layer
    map.addLayer({
      id: LAYER_IDS.districtOutline,
      type: "line",
      source: "district-boundaries",
      paint: {
        "line-color": [
          "step", ["get", "score"],
          SCORE_BLOB_COLORS.red,
          21, SCORE_BLOB_COLORS.orange,
          41, SCORE_BLOB_COLORS.yellow,
          61, SCORE_BLOB_COLORS.blue,
          81, SCORE_BLOB_COLORS.green,
        ] as unknown as mapboxgl.Expression,
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.5, 14, 2],
        "line-opacity": 0.6,
      },
    });

    // ── Org point source with clustering ──
    map.addSource("org-data", {
      type: "geojson",
      data: orgGeoJSON,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
      clusterProperties: {
        count: ["+", 1],
        maxScore: ["max", ["get", "districtScore"]],
      },
    });

    // ── Heatmap layer ──
    map.addLayer({
      id: LAYER_IDS.heat,
      type: "heatmap",
      source: "org-data",
      maxzoom: 15,
      paint: {
        "heatmap-weight": 1,
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 0.5, 14, 2],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 20, 14, 40],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.1, "rgba(99,102,241,0.15)",
          0.3, "rgba(139,92,246,0.35)",
          0.5, "rgba(236,72,153,0.50)",
          0.7, "rgba(249,115,22,0.65)",
          0.9, "rgba(234,179,8,0.80)",
          1.0, "rgba(250,250,250,0.95)",
        ],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.8, 15, 0.2],
      },
    });

    // ── Score-based color expression (5-tier by Tech Gravity Score) ──
    const scoreBlobColor: mapboxgl.Expression = [
      "step", ["get", "maxScore"],
      SCORE_BLOB_COLORS.red,      // 0–20
      21, SCORE_BLOB_COLORS.orange, // 21–40
      41, SCORE_BLOB_COLORS.yellow, // 41–60
      61, SCORE_BLOB_COLORS.blue,   // 61–80
      81, SCORE_BLOB_COLORS.green,  // 81–100
    ] as unknown as mapboxgl.Expression;

    // ── Ground dot (base of rod) ──
    map.addLayer({
      id: LAYER_IDS.clustersGlow,
      type: "circle",
      source: "org-data",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": scoreBlobColor,
        "circle-radius": 3,
        "circle-opacity": 0.8,
      },
    });

    // ── Rod mid-point (connecting ground to blob) ──
    map.addLayer({
      id: "org-cluster-stems",
      type: "circle",
      source: "org-data",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": scoreBlobColor,
        "circle-radius": 2,
        "circle-translate": [0, -15],
        "circle-opacity": 0.7,
      },
    });

    // ── Main blob (raised on rod) ──
    map.addLayer({
      id: LAYER_IDS.clusters,
      type: "circle",
      source: "org-data",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": scoreBlobColor,
        "circle-radius": [
          "step", ["get", "point_count"],
          28, 5, 36, 15, 46, 30, 56,
        ],
        "circle-translate": [0, -30],
        "circle-stroke-width": 3,
        "circle-stroke-color": "rgba(255,255,255,0.4)",
        "circle-opacity": 1,
      },
    });

    // ── Cluster count label (white text, dark halo for WCAG) ──
    map.addLayer({
      id: LAYER_IDS.clusterCount,
      type: "symbol",
      source: "org-data",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
        "text-size": [
          "step", ["get", "point_count"],
          13, 5, 15, 15, 17, 30, 20,
        ],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-offset": [0, -2.2],
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1.5,
      },
    });

    // ── Individual org pins ──
    map.addLayer({
      id: LAYER_IDS.pins,
      type: "circle",
      source: "org-data",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": buildSectorColorExpr(),
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 4, 14, 7, 16, 10],
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(255,255,255,0.25)",
        "circle-opacity": 0.9,
      },
    });

    // ── District label source + layer ──
    const districtGeoJSON: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: districts
        .filter((d) => d.latitude && d.longitude)
        .map((d) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [d.longitude!, d.latitude!],
          },
          properties: {
            name: d.name,
            slug: d.slug,
            score: d.techGravityScore,
            orgCount: d.organizationCount,
            investorCount: d.investorCount,
            borough: d.borough || "",
            region: d.region || "",
            topSectors: d.topSectors.join(", "),
          },
        })),
    };

    map.addSource("district-labels", { type: "geojson", data: districtGeoJSON });

    map.addLayer({
      id: LAYER_IDS.districtLabels,
      type: "symbol",
      source: "district-labels",
      layout: {
        "text-field": [
          "format",
          ["get", "name"], { "font-scale": 1.0 },
          "\n", {},
          ["concat", ["to-string", ["get", "score"]], " pts"], { "font-scale": 0.7 },
        ],
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 13, 14, 16, 16],
        "text-anchor": "center",
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "text-padding": 8,
      },
      paint: {
        "text-color": "#e2e8f0",
        "text-halo-color": "rgba(10,14,26,0.85)",
        "text-halo-width": 2,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 12, 0.9, 14, 1.0],
      },
    });

    // ── Event pins layer ──
    if (eventGeoJSON && eventGeoJSON.features.length > 0) {
      map.addSource("event-data", { type: "geojson", data: eventGeoJSON });
      map.addLayer({
        id: LAYER_IDS.eventPins,
        type: "circle",
        source: "event-data",
        paint: {
          "circle-color": "#f59e0b",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 5, 14, 8, 16, 11],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(245,158,11,0.4)",
          "circle-opacity": 0.9,
        },
      });
    }

    // ── Coworking pins layer ──
    if (coworkingGeoJSON && coworkingGeoJSON.features.length > 0) {
      map.addSource("coworking-data", { type: "geojson", data: coworkingGeoJSON });
      map.addLayer({
        id: LAYER_IDS.coworkingPins,
        type: "circle",
        source: "coworking-data",
        paint: {
          "circle-color": "#14b8a6",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 5, 14, 8, 16, 11],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(20,184,166,0.4)",
          "circle-opacity": 0.9,
        },
      });
    }

    // ── Networking pins layer ──
    if (networkingGeoJSON && networkingGeoJSON.features.length > 0) {
      map.addSource("networking-data", { type: "geojson", data: networkingGeoJSON });
      map.addLayer({
        id: LAYER_IDS.networkingPins,
        type: "circle",
        source: "networking-data",
        paint: {
          "circle-color": "#a78bfa",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 5, 14, 8, 16, 11],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(167,139,250,0.4)",
          "circle-opacity": 0.9,
        },
      });
    }

    // ── Event/Coworking/Networking pin click → popup ──
    const overlayLayers = [
      { id: LAYER_IDS.eventPins, label: "Event", color: "#f59e0b" },
      { id: LAYER_IDS.coworkingPins, label: "Coworking", color: "#14b8a6" },
      { id: LAYER_IDS.networkingPins, label: "Networking", color: "#a78bfa" },
    ];
    for (const ol of overlayLayers) {
      if (!map.getLayer(ol.id)) continue;
      map.on("click", ol.id, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const p = f.properties!;
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: "280px",
          className: "ltm-popup-v2",
          offset: 12,
        })
          .setLngLat(coords)
          .setHTML(`
            <div class="ltm-card">
              <div class="ltm-card-header">
                <div class="ltm-card-score" style="background:${ol.color};box-shadow:0 0 8px ${ol.color}60;font-size:10px;">${ol.label}</div>
                <div class="ltm-card-title-wrap">
                  <div class="ltm-card-title">${p.name}</div>
                  <div class="ltm-card-subtitle">${p.district || ""}</div>
                </div>
              </div>
              ${p.eventType ? `<div style="margin-top:6px;font-size:11px;color:#94a3b8;">${String(p.eventType).replace(/_/g, " ")}</div>` : ""}
              ${p.orgType ? `<div style="margin-top:6px;font-size:11px;color:#94a3b8;">${String(p.orgType).replace(/_/g, " ")}</div>` : ""}
            </div>
          `)
          .addTo(map);
      });
      map.on("mouseenter", ol.id, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", ol.id, () => { map.getCanvas().style.cursor = ""; });
    }

    // ── Interactions ──

    // Cluster click
    map.on("click", LAYER_IDS.clusters, (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_IDS.clusters] });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      const pointCount = features[0].properties?.point_count || 0;
      const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
      onClusterClick(clusterId, coords, pointCount);
    });

    // Org pin click
    map.on("click", LAYER_IDS.pins, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      const p = f.properties!;
      popupRef.current?.remove();
      onOrgClick(
        {
          id: p.id,
          name: p.name,
          slug: p.slug,
          orgType: p.orgType,
          sector: p.sector,
          description: p.description || "",
          foundedYear: p.foundedYear ? Number(p.foundedYear) : null,
          employeeRange: p.employeeRange || null,
          fundingStage: p.fundingStage || null,
          website: p.website || null,
          district: p.district,
          districtSlug: p.districtSlug,
        },
        coords,
      );
    });

    // District label click → popup (kept as Mapbox popup)
    map.on("click", LAYER_IDS.districtLabels, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      const p = f.properties!;

      popupRef.current?.remove();

      const s = Number(p.score);
      const scoreColor = s >= 81 ? SCORE_BLOB_COLORS.green
        : s >= 61 ? SCORE_BLOB_COLORS.blue
        : s >= 41 ? SCORE_BLOB_COLORS.yellow
        : s >= 21 ? SCORE_BLOB_COLORS.orange
        : SCORE_BLOB_COLORS.red;
      const topSectors = (p.topSectors || "")
        .split(", ")
        .filter(Boolean)
        .map((sec: string) => `<span class="ltm-badge" style="background:${sectorColor(sec)}20;color:${sectorColor(sec)};border:1px solid ${sectorColor(sec)}40;">${sec}</span>`)
        .join("");

      const html = `
        <div class="ltm-card">
          <div class="ltm-card-header">
            <div class="ltm-card-score" style="background:${scoreColor};box-shadow:0 0 12px ${scoreColor}60;">${Number(p.score).toFixed(0)}</div>
            <div class="ltm-card-title-wrap">
              <a href="/districts/${p.slug}" class="ltm-card-title">${p.name}</a>
              <div class="ltm-card-subtitle">${p.borough}${p.region ? ` · ${p.region}` : ""}</div>
            </div>
          </div>
          <div class="ltm-card-stats">
            <div class="ltm-stat"><span class="ltm-stat-val">${p.orgCount}</span><span class="ltm-stat-label">Orgs</span></div>
            <div class="ltm-stat"><span class="ltm-stat-val">${p.investorCount}</span><span class="ltm-stat-label">Investors</span></div>
          </div>
          ${topSectors ? `<div class="ltm-card-sectors">${topSectors}</div>` : ""}
          <a href="/districts/${p.slug}" class="ltm-card-cta">Explore district &rarr;</a>
        </div>
      `;

      popupRef.current = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: "320px",
        className: "ltm-popup-v2",
        offset: 12,
      })
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map);
    });

    // Cursors
    const pointerLayers = [LAYER_IDS.pins, LAYER_IDS.clusters, LAYER_IDS.districtLabels];
    for (const layer of pointerLayers) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }
  }, [map, mapReady, orgGeoJSON, districts, eventGeoJSON, coworkingGeoJSON, networkingGeoJSON, onClusterClick, onOrgClick]);

  // ── Layer visibility ──
  useEffect(() => {
    if (!map || !mapReady || !orgGeoJSON) return;
    const vis = (id: string, show: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", show ? "visible" : "none");
    };
    vis(LAYER_IDS.heat, showHeatmap);
    vis(LAYER_IDS.pins, showPins);
    vis(LAYER_IDS.clusters, showPins);
    vis(LAYER_IDS.clustersGlow, showPins);
    vis(LAYER_IDS.clusterCount, showPins);
    vis("org-cluster-stems", showPins);
    vis(LAYER_IDS.districtLabels, showDistricts);
    vis(LAYER_IDS.districtFill, showDistricts);
    vis(LAYER_IDS.districtOutline, showDistricts);
    vis(LAYER_IDS.eventPins, showEvents);
    vis(LAYER_IDS.coworkingPins, showCoworking);
    vis(LAYER_IDS.networkingPins, showNetworking);
  }, [map, mapReady, orgGeoJSON, showHeatmap, showPins, showDistricts, showEvents, showCoworking, showNetworking]);

  // ── Sector filter ──
  useEffect(() => {
    if (!map || !mapReady || !orgGeoJSON) return;
    if (activeSectors.size === 0) {
      if (map.getLayer(LAYER_IDS.pins)) map.setFilter(LAYER_IDS.pins, ["!", ["has", "point_count"]]);
      if (map.getLayer(LAYER_IDS.heat)) map.setFilter(LAYER_IDS.heat, null);
    } else {
      const sectorList = Array.from(activeSectors);
      const filter: mapboxgl.FilterSpecification = ["in", ["get", "sector"], ["literal", sectorList]];
      if (map.getLayer(LAYER_IDS.pins)) map.setFilter(LAYER_IDS.pins, ["all", ["!", ["has", "point_count"]], filter]);
      if (map.getLayer(LAYER_IDS.heat)) map.setFilter(LAYER_IDS.heat, filter);
    }
  }, [map, mapReady, orgGeoJSON, activeSectors]);

  return { popupRef };
}
