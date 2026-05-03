"use client";

import { useState, useEffect, useRef } from "react";
import type { DistrictWithStats } from "@/types";

interface UseMapDataReturn {
  districts: DistrictWithStats[];
  orgGeoJSON: GeoJSON.FeatureCollection | null;
  eventGeoJSON: GeoJSON.FeatureCollection | null;
  coworkingGeoJSON: GeoJSON.FeatureCollection | null;
  networkingGeoJSON: GeoJSON.FeatureCollection | null;
  videoGeoJSON: GeoJSON.FeatureCollection | null;
  loading: boolean;
  error: string | null;
}

export function useMapData(): UseMapDataReturn {
  const [districts, setDistricts] = useState<DistrictWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const orgGeoJSONRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const eventGeoJSONRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const coworkingGeoJSONRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const networkingGeoJSONRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const videoGeoJSONRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [districtRes, mapRes] = await Promise.all([
          fetch("/api/districts"),
          fetch("/api/map"),
        ]);
        if (!districtRes.ok || !mapRes.ok) throw new Error("Failed to fetch map data");

        const districtData = await districtRes.json();
        const mapData = await mapRes.json();

        // Support both old (flat FeatureCollection) and new (object with orgs/events/etc.) formats
        const orgGeoJSON = mapData.orgs || mapData;
        const eventGeoJSON = mapData.events || { type: "FeatureCollection", features: [] };
        const coworkingGeoJSON = mapData.coworking || { type: "FeatureCollection", features: [] };
        const networkingGeoJSON = mapData.networking || { type: "FeatureCollection", features: [] };
        const videoGeoJSON = mapData.videos || { type: "FeatureCollection", features: [] };

        // Build a slug → score lookup so each org feature carries its district score
        const scoreBySlug: Record<string, number> = {};
        for (const d of districtData) {
          if (d.slug) scoreBySlug[d.slug] = d.techGravityScore ?? 0;
        }
        for (const f of orgGeoJSON.features) {
          const slug = f.properties?.districtSlug;
          f.properties.districtScore = slug ? (scoreBySlug[slug] ?? 0) : 0;
        }

        setDistricts(districtData);
        orgGeoJSONRef.current = orgGeoJSON;
        eventGeoJSONRef.current = eventGeoJSON;
        coworkingGeoJSONRef.current = coworkingGeoJSON;
        networkingGeoJSONRef.current = networkingGeoJSON;
        videoGeoJSONRef.current = videoGeoJSON;
        setDataReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load map data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return {
    districts,
    orgGeoJSON: dataReady ? orgGeoJSONRef.current : null,
    eventGeoJSON: dataReady ? eventGeoJSONRef.current : null,
    coworkingGeoJSON: dataReady ? coworkingGeoJSONRef.current : null,
    networkingGeoJSON: dataReady ? networkingGeoJSONRef.current : null,
    videoGeoJSON: dataReady ? videoGeoJSONRef.current : null,
    loading,
    error,
  };
}
