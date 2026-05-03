"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { MapOrg, MapVideo } from "../types";
import { sectorColor, ORG_TYPE_LABELS } from "../constants";
import { ExternalLinkFrame } from "@/components/ExternalLinkFrame";

interface StreetViewModalProps {
  org?: MapOrg;
  video?: MapVideo;
  coordinates: [number, number]; // [lng, lat]
  googleMapsApiKey?: string;
  onClose: () => void;
  onViewProfile: (slug: string) => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function lrsColor(score: number): string {
  if (score >= 85) return "#22c55e";
  if (score >= 65) return "#3b82f6";
  if (score >= 41) return "#eab308";
  if (score >= 21) return "#f97316";
  return "#ef4444";
}

export default function StreetViewModal({
  org,
  video,
  coordinates,
  googleMapsApiKey,
  onClose,
  onViewProfile,
}: StreetViewModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    const el = cardRef.current;
    if (el) el.focus();
  }, []);

  const entityName = video ? video.title : org?.name ?? "Unknown";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Info for ${entityName}`}
    >
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* Card */}
      <div
        ref={cardRef}
        tabIndex={-1}
        className="relative z-10 outline-none overflow-hidden"
        style={{
          width: "380px",
          maxWidth: "92vw",
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: "14px",
          background: "rgba(15, 23, 42, 0.96)",
          border: `1px solid ${video ? "rgba(239, 68, 68, 0.2)" : "rgba(99, 102, 241, 0.2)"}`,
          boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full flex items-center justify-center text-[#94a3b8] hover:text-white transition-colors"
          style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="text-sm leading-none">&times;</span>
        </button>

        {video ? (
          <VideoCardContent video={video} onViewProfile={onViewProfile} />
        ) : org ? (
          <OrgCardContent org={org} coordinates={coordinates} googleMapsApiKey={googleMapsApiKey} onViewProfile={onViewProfile} />
        ) : null}
      </div>
    </div>
  );
}

// ─── Org Card (existing behavior) ─────────────────────────────────────────────

function OrgCardContent({
  org,
  coordinates,
  googleMapsApiKey,
  onViewProfile,
}: {
  org: MapOrg;
  coordinates: [number, number];
  googleMapsApiKey?: string;
  onViewProfile: (slug: string) => void;
}) {
  const [lng, lat] = coordinates;
  const color = sectorColor(org.sector);
  const typeLabel = ORG_TYPE_LABELS[org.orgType] || org.orgType;
  const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(org.name + " London")}`;
  const streetViewUrl = googleMapsApiKey
    ? `https://www.google.com/maps/embed/v1/streetview?key=${googleMapsApiKey}&location=${lat},${lng}&heading=0&pitch=0&fov=90`
    : null;

  return (
    <>
      {/* Street View */}
      {streetViewUrl ? (
        <div style={{ height: "200px", borderBottom: "1px solid rgba(51,65,85,0.4)" }}>
          <iframe
            src={streetViewUrl}
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Street view near ${org.name}`}
          />
        </div>
      ) : (
        <div
          className="flex items-center justify-center"
          style={{ height: "120px", background: "rgba(15,23,42,0.6)", borderBottom: "1px solid rgba(51,65,85,0.4)" }}
        >
          <ExternalLinkFrame
            href={googleMapsUrl}
            className="text-[11px] text-[#818cf8] hover:text-[#a5b4fc] transition-colors"
          >
            View on Google Maps &rarr;
          </ExternalLinkFrame>
        </div>
      )}

      {/* Org info */}
      <div style={{ padding: "16px 20px 20px" }}>
        {/* Name + type */}
        <div className="flex items-start gap-2.5 mb-3 pr-4">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
            style={{ background: color, boxShadow: `0 0 8px ${color}60` }}
          />
          <div className="min-w-0">
            <h3 className="text-[13px] font-bold text-white truncate">{org.name}</h3>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">{typeLabel} · {org.sector}</p>
          </div>
        </div>

        {/* Badges */}
        {(org.fundingStage || org.employeeRange) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {org.fundingStage && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
                {org.fundingStage.replace(/_/g, " ")}
              </span>
            )}
            {org.employeeRange && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(30,41,59,0.8)", color: "#94a3b8", border: "1px solid rgba(51,65,85,0.5)" }}>
                {org.employeeRange} employees
              </span>
            )}
          </div>
        )}

        {/* District */}
        <p className="text-[10px] text-[#64748b] mb-4">{org.district}</p>

        {/* Actions */}
        <button
          onClick={() => onViewProfile(org.slug)}
          className="w-full py-2 rounded-lg text-[12px] font-bold text-white transition-colors"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
          }}
        >
          View Full Profile
        </button>

        <ExternalLinkFrame
          href={googleMapsUrl}
          className="block text-center text-[11px] text-[#818cf8] hover:text-[#a5b4fc] transition-colors mt-2"
        >
          Open in Google Maps
        </ExternalLinkFrame>
      </div>
    </>
  );
}

// ─── Video Card ────────────────────────────────────────────────────────────────

function VideoCardContent({
  video,
  onViewProfile,
}: {
  video: MapVideo;
  onViewProfile: (slug: string) => void;
}) {
  const thumbnail =
    video.thumbnailUrl || `https://img.youtube.com/vi/${video.slug}/hqdefault.jpg`;

  return (
    <>
      {/* Thumbnail */}
      <div className="relative" style={{ borderBottom: "1px solid rgba(51,65,85,0.4)" }}>
        <div className="relative aspect-video bg-black/30">
          <Image
            src={thumbnail}
            alt={video.title}
            fill
            sizes="380px"
            className="object-cover"
            unoptimized
          />
          {/* Duration */}
          {video.duration != null && (
            <span
              className="absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[11px] font-mono text-white"
              style={{ background: "rgba(0,0,0,0.8)" }}
            >
              {formatDuration(video.duration)}
            </span>
          )}
          {/* LRS badge */}
          {video.lrsTotal != null && (
            <span
              className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{
                background: lrsColor(video.lrsTotal),
                boxShadow: `0 0 8px ${lrsColor(video.lrsTotal)}60`,
              }}
            >
              LRS {video.lrsTotal}
            </span>
          )}
          {/* Play icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-60">
            <svg className="h-12 w-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Video info */}
      <div style={{ padding: "16px 20px 20px" }}>
        {/* Title */}
        <h3 className="text-[13px] font-bold text-white leading-snug mb-1.5 pr-4 line-clamp-2">
          {video.title}
        </h3>

        {/* Channel + date */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] mb-3">
          {video.channelTitle && <span className="truncate">{video.channelTitle}</span>}
          {video.publishedAt && (
            <>
              {video.channelTitle && <span>&middot;</span>}
              <span className="shrink-0">
                {new Date(video.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {video.contentType && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>
              {video.contentType.replace(/_/g, " ")}
            </span>
          )}
          {video.aiSectors.slice(0, 3).map((sector) => (
            <span
              key={sector}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(30,41,59,0.8)", color: "#94a3b8", border: "1px solid rgba(51,65,85,0.5)" }}
            >
              {sector}
            </span>
          ))}
        </div>

        {/* AI Summary */}
        {video.aiSummary && (
          <p className="text-[10px] text-[#94a3b8] leading-relaxed mb-3 line-clamp-3">
            {video.aiSummary}
          </p>
        )}

        {/* District */}
        <p className="text-[10px] text-[#64748b] mb-4">{video.district}</p>

        {/* Actions */}
        <button
          onClick={() => onViewProfile(video.slug)}
          className="w-full py-2 rounded-lg text-[12px] font-bold text-white transition-colors"
          style={{
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            boxShadow: "0 2px 8px rgba(239,68,68,0.3)",
          }}
        >
          Watch Video
        </button>
      </div>
    </>
  );
}
