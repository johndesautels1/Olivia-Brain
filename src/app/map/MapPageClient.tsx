"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

/* ── Photorealistic 3D Map (primary) ── */
const GoogleMap3DView = dynamic(
  () => import("@/components/map/GoogleMap3DView").then((m) => m.GoogleMap3DView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#0a0e1a]">
        <div className="text-center">
          <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-brand-400 border-t-transparent mx-auto" />
          <p className="text-sm text-[var(--muted)]">Loading Photorealistic 3D Map...</p>
        </div>
      </div>
    ),
  }
);

/* ── Standard Google Maps (fallback #1) ── */
const GoogleMapView = dynamic(
  () => import("@/components/map/GoogleMapView").then((m) => m.GoogleMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#0a0e1a]">
        <div className="text-center">
          <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-brand-400 border-t-transparent mx-auto" />
          <p className="text-sm text-[var(--muted)]">Loading London Tech Map...</p>
        </div>
      </div>
    ),
  }
);

/* ── Mapbox (fallback #2 — only if no Google key) ── */
const MapView = dynamic(
  () => import("@/components/map/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-sm text-[var(--muted)]">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface MapPageClientProps {
  googleMapsKey: string;
  mapboxToken: string;
}

export default function MapPageClient({ googleMapsKey, mapboxToken }: MapPageClientProps) {
  const [use3D, setUse3D] = useState(true);

  // No Google key → Mapbox fallback (requires mapboxToken; parent guarantees one of the two is set)
  if (!googleMapsKey) {
    return <MapView accessToken={mapboxToken} googleMapsApiKey={undefined} />;
  }

  return use3D ? (
    <GoogleMap3DView
      apiKey={googleMapsKey}
      mapboxToken={mapboxToken}
      onFallback={() => setUse3D(false)}
    />
  ) : (
    <GoogleMapView apiKey={googleMapsKey} mapboxToken={mapboxToken} />
  );
}
