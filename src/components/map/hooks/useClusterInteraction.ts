"use client";

import { useState, useCallback } from "react";
import type mapboxgl from "mapbox-gl";
import type { ClusterClickState } from "../types";

function getClusterLeaves(
  source: mapboxgl.GeoJSONSource,
  clusterId: number,
  limit: number,
): Promise<GeoJSON.Feature[]> {
  return new Promise((resolve, reject) => {
    source.getClusterLeaves(clusterId, limit, 0, (err, features) => {
      if (err) reject(err);
      else resolve(features || []);
    });
  });
}

function getExpansionZoom(source: mapboxgl.GeoJSONSource, clusterId: number): Promise<number> {
  return new Promise((resolve, reject) => {
    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) reject(err);
      else resolve(zoom!);
    });
  });
}

export function useClusterInteraction(map: mapboxgl.Map | null) {
  const [clusterState, setClusterState] = useState<ClusterClickState | null>(null);

  const handleClusterClick = useCallback(
    async (clusterId: number, coordinates: [number, number], pointCount: number) => {
      if (!map) return;
      const source = map.getSource("org-data") as mapboxgl.GeoJSONSource;
      if (!source) return;

      if (pointCount > 50) {
        // Too many — zoom in
        try {
          const zoom = await getExpansionZoom(source, clusterId);
          map.easeTo({ center: coordinates, zoom, duration: 500 });
        } catch { /* ignore */ }
        return;
      }

      // Fetch leaves and show grid
      try {
        const leaves = await getClusterLeaves(source, clusterId, 50);
        setClusterState({ clusterId, coordinates, leaves, totalCount: pointCount });
      } catch { /* ignore */ }
    },
    [map],
  );

  const closeCluster = useCallback(() => setClusterState(null), []);

  return { clusterState, handleClusterClick, closeCluster };
}
