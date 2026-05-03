"use client";

import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { MAP_DEFAULTS } from "./constants";
import type { MapOrg } from "./types";
import { useMapData } from "./hooks/useMapData";
import { useMapLayers } from "./hooks/useMapLayers";
import { useClusterInteraction } from "./hooks/useClusterInteraction";

import LayerPanel from "./controls/LayerPanel";
import SectorFilterBar from "./controls/SectorFilterBar";
import StatsPanel from "./controls/StatsPanel";
import ViewPresetButtons from "./controls/ViewPresetButtons";
import MapLegend from "./overlays/MapLegend";
import { MapSearchBar } from "./controls/MapSearchBar";

// Lazy-load heavy overlays — only shown on user interaction
const ClusterCardGrid = lazy(() => import("./overlays/ClusterCardGrid"));
const StreetViewModal = lazy(() => import("./overlays/StreetViewModal"));

interface MapViewProps {
  accessToken: string;
  googleMapsApiKey?: string;
}

export function MapView({ accessToken, googleMapsApiKey }: MapViewProps) {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Data
  const { districts, orgGeoJSON, eventGeoJSON, coworkingGeoJSON, networkingGeoJSON, loading, error } = useMapData();

  // Layer visibility
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPins, setShowPins] = useState(true);
  const [showDistricts, setShowDistricts] = useState(true);
  const [showEvents, setShowEvents] = useState(false);
  const [showCoworking, setShowCoworking] = useState(false);
  const [showNetworking, setShowNetworking] = useState(false);

  // Sector filter
  const [activeSectors, setActiveSectors] = useState<Set<string>>(new Set());

  // Cluster interaction
  const { clusterState, handleClusterClick, closeCluster } = useClusterInteraction(map.current);

  // Street View modal
  const [streetViewOrg, setStreetViewOrg] = useState<{ org: MapOrg; coordinates: [number, number] } | null>(null);

  // ─── Initialize map ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = accessToken;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/johndesautels1/cmmnaqc7y000k01r110c8790s",
      center: MAP_DEFAULTS.center,
      zoom: MAP_DEFAULTS.zoom,
      minZoom: MAP_DEFAULTS.minZoom,
      maxZoom: MAP_DEFAULTS.maxZoom,
      pitch: MAP_DEFAULTS.pitch,
      bearing: MAP_DEFAULTS.bearing,
      antialias: true,
    });

    m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    m.addControl(new mapboxgl.ScaleControl({ maxWidth: 150 }), "bottom-right");

    m.on("load", () => {
      // 3D buildings
      const layers = m.getStyle().layers;
      let labelLayerId: string | undefined;
      for (const layer of layers || []) {
        if (layer.type === "symbol" && (layer.layout as any)?.["text-field"]) {
          labelLayerId = layer.id;
          break;
        }
      }
      m.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 13,
          paint: {
            "fill-extrusion-color": "#1a1f35",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.5,
          },
        },
        labelLayerId,
      );

      setMapReady(true);
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
  }, [accessToken]);

  // ─── Map layers ────────────────────────────────────────────────────────
  const onOrgClick = useCallback((org: MapOrg, coordinates: [number, number]) => {
    closeCluster();
    setStreetViewOrg({ org, coordinates });
  }, [closeCluster]);

  useMapLayers({
    map: map.current,
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
    onClusterClick: handleClusterClick,
    onOrgClick,
  });

  // ─── Handlers ──────────────────────────────────────────────────────────
  const toggleSector = useCallback((sector: string) => {
    setActiveSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  }, []);

  const resetView = useCallback(() => {
    map.current?.flyTo({
      center: MAP_DEFAULTS.center,
      zoom: MAP_DEFAULTS.zoom,
      pitch: MAP_DEFAULTS.pitch,
      bearing: MAP_DEFAULTS.bearing,
      duration: 1500,
    });
    setActiveSectors(new Set());
  }, []);

  const handleCardClick = useCallback((org: MapOrg, coordinates: [number, number]) => {
    closeCluster();
    setStreetViewOrg({ org, coordinates });
  }, [closeCluster]);

  const handleViewProfile = useCallback((slug: string) => {
    router.push(`/directory/${slug}`);
  }, [router]);

  // ─── Find Near Me (Geolocation) ────────────────────────────────────────
  const [locating, setLocating] = useState(false);
  const handleFindNearMe = useCallback(() => {
    if (!map.current || !("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 1500,
        });
        // Add a temporary marker at user location
        new mapboxgl.Marker({ color: "#6366f1" })
          .setLngLat([pos.coords.longitude, pos.coords.latitude])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setText("You are here"))
          .addTo(map.current!);
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // ─── Search zoom ─────────────────────────────────────────────────────
  const handleSearchZoom = useCallback((lat: number, lng: number) => {
    map.current?.flyTo({
      center: [lng, lat],
      zoom: 18,
      pitch: 45,
      duration: 1500,
    });
  }, []);

  // ─── Stats ─────────────────────────────────────────────────────────────
  const totalOrgs = districts.reduce((s, d) => s + d.organizationCount, 0);
  const avgScore = districts.length > 0
    ? (districts.reduce((s, d) => s + d.techGravityScore, 0) / districts.length).toFixed(1)
    : "—";

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--background)]" role="status" aria-live="polite">
          <div className="text-center">
            <div className="mb-3 h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-500/30 border-t-indigo-400 mx-auto" aria-hidden="true" />
            <p className="text-sm text-[var(--muted)]">Loading London tech ecosystem...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--background)]" role="alert">
          <div className="text-center max-w-sm">
            <p className="text-sm text-red-400 mb-2">{error}</p>
            <p className="text-xs text-[var(--muted)]">Check .env for NEXT_PUBLIC_MAPBOX_TOKEN</p>
          </div>
        </div>
      )}

      {/* Address Search Bar */}
      {mapReady && <MapSearchBar onPlaceSelect={handleSearchZoom} mapboxToken={accessToken} />}

      {/* Controls */}
      <LayerPanel
        showHeatmap={showHeatmap}
        showPins={showPins}
        showDistricts={showDistricts}
        showEvents={showEvents}
        showCoworking={showCoworking}
        showNetworking={showNetworking}
        onToggleHeatmap={() => setShowHeatmap((v) => !v)}
        onTogglePins={() => setShowPins((v) => !v)}
        onToggleDistricts={() => setShowDistricts((v) => !v)}
        onToggleEvents={() => setShowEvents((v) => !v)}
        onToggleCoworking={() => setShowCoworking((v) => !v)}
        onToggleNetworking={() => setShowNetworking((v) => !v)}
        onResetView={resetView}
        onFindNearMe={handleFindNearMe}
        locating={locating}
      />

      <SectorFilterBar activeSectors={activeSectors} onToggleSector={toggleSector} />

      <ViewPresetButtons map={map.current} />

      <StatsPanel districtCount={districts.length} totalOrgs={totalOrgs} avgScore={avgScore} />

      <MapLegend />

      {/* Cluster card grid overlay (lazy-loaded) */}
      {clusterState && map.current && (
        <Suspense fallback={null}>
          <ClusterCardGrid
            clusterState={clusterState}
            map={map.current}
            onCardClick={handleCardClick}
            onClose={closeCluster}
          />
        </Suspense>
      )}

      {/* Street View modal (lazy-loaded) */}
      {streetViewOrg && (
        <Suspense fallback={null}>
          <StreetViewModal
            org={streetViewOrg.org}
            coordinates={streetViewOrg.coordinates}
            googleMapsApiKey={googleMapsApiKey}
            onClose={() => setStreetViewOrg(null)}
            onViewProfile={handleViewProfile}
          />
        </Suspense>
      )}

      {/* Map container */}
      <div ref={mapContainer} className="h-full w-full" role="application" aria-label="Interactive tech ecosystem map of London" />
    </div>
  );
}
