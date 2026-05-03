"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type mapboxgl from "mapbox-gl";
import type { ClusterClickState, MapOrg } from "../types";
import { sectorColor, ORG_TYPE_LABELS } from "../constants";

interface ClusterCardGridProps {
  clusterState: ClusterClickState;
  map: mapboxgl.Map;
  onCardClick: (org: MapOrg, coordinates: [number, number]) => void;
  onClose: () => void;
}

export default function ClusterCardGrid({ clusterState, map, onCardClick, onClose }: ClusterCardGridProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const point = map.project(clusterState.coordinates as mapboxgl.LngLatLike);
    setPosition({ x: point.x, y: point.y });
  }, [map, clusterState.coordinates]);

  // Initial position + reposition on map move
  useEffect(() => {
    updatePosition();
    const handler = () => requestAnimationFrame(updatePosition);
    map.on("move", handler);
    return () => { map.off("move", handler); };
  }, [map, updatePosition]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!position) return null;

  // Clamp position so the overlay stays within viewport
  const overlayWidth = 360;
  const overlayMaxHeight = 420;
  const mapCanvas = map.getCanvas();
  const mapW = mapCanvas.clientWidth;
  const mapH = mapCanvas.clientHeight;

  let left = position.x - overlayWidth / 2;
  let top = position.y + 20; // offset below cluster

  // Clamp horizontally
  if (left < 8) left = 8;
  if (left + overlayWidth > mapW - 8) left = mapW - overlayWidth - 8;
  // Clamp vertically — if not enough space below, show above
  if (top + overlayMaxHeight > mapH - 8) {
    top = position.y - overlayMaxHeight - 20;
    if (top < 8) top = 8;
  }

  const orgs: MapOrg[] = clusterState.leaves.map((f) => {
    const p = f.properties!;
    return {
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
    };
  });

  const showMoreCount = clusterState.totalCount - orgs.length;

  return (
    <>
      {/* Backdrop to catch clicks outside */}
      <div className="absolute inset-0 z-20" onClick={onClose} />

      <div
        ref={containerRef}
        className="absolute z-30 ltm-cluster-overlay"
        style={{ left, top, width: overlayWidth, maxHeight: overlayMaxHeight }}
      >
        {/* Header */}
        <div className="ltm-cluster-overlay-header">
          <span className="text-sm font-semibold text-[#e2e8f0]">
            {clusterState.totalCount} organizations
          </span>
          <button
            onClick={onClose}
            aria-label="Close cluster panel"
            className="text-[#94a3b8] hover:text-[#e2e8f0] transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Card grid */}
        <div className="ltm-cluster-overlay-grid">
          {orgs.map((org) => {
            const color = sectorColor(org.sector);
            const typeLabel = ORG_TYPE_LABELS[org.orgType] || org.orgType;
            return (
              <button
                key={org.id}
                onClick={() => onCardClick(org, clusterState.coordinates)}
                className="ltm-cluster-overlay-card"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
                  />
                  <span className="text-xs font-medium text-[#e2e8f0] truncate">{org.name}</span>
                </div>
                <div className="text-[11px] text-[#94a3b8] truncate pl-[18px]">
                  {typeLabel} · {org.sector !== "Other" ? org.sector : org.district}
                </div>
              </button>
            );
          })}
        </div>

        {/* More indicator */}
        {showMoreCount > 0 && (
          <div className="ltm-cluster-overlay-more">
            and {showMoreCount} more...
          </div>
        )}
      </div>
    </>
  );
}
