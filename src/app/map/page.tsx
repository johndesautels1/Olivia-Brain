import type { Metadata } from "next";
import MapPageClient from "./MapPageClient";

export const metadata: Metadata = {
  title: "Map — London Tech Map",
  description:
    "Interactive map of London's 28 tech districts, visualized by Tech Gravity Score with organization density and sector data.",
};

export default function MapPage() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

  return (
    <div className="map-immersive relative h-[100dvh] lg:h-[calc(100dvh-56px)]">
      {googleMapsKey || mapboxToken ? (
        <MapPageClient googleMapsKey={googleMapsKey} mapboxToken={mapboxToken} />
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="mx-auto max-w-md rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
            <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">
              Map API Key Required
            </h2>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Add a Google Maps or Mapbox key to <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs">.env</code>:
            </p>
            <pre className="rounded bg-slate-900 px-4 py-3 text-left text-xs text-slate-300">
{`NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key
# or fallback:
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
