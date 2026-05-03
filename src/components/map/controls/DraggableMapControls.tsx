"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface DraggableMapControlsProps {
  districtCount: number;
  totalOrgs: number;
  avgScore: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onViewPreset: (preset: any) => void;
  onReset: () => void;
  /** Use pitch/bearing naming instead of tilt/heading (for GoogleMapView compatibility) */
  usePitchBearing?: boolean;
}

export function DraggableMapControls({
  districtCount,
  totalOrgs,
  avgScore,
  onViewPreset,
  onReset,
  usePitchBearing = false,
}: DraggableMapControlsProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Initialize position to bottom-center on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPosition({
        x: (window.innerWidth - 200) / 2, // roughly center
        y: window.innerHeight - 160, // near bottom
      });
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: position.x,
      posY: position.y,
    };
    setIsDragging(true);
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartRef.current.x;
    const deltaY = touch.clientY - dragStartRef.current.y;

    const newX = dragStartRef.current.posX + deltaX;
    const newY = dragStartRef.current.posY + deltaY;

    // Constrain to viewport
    const maxX = window.innerWidth - 60;
    const maxY = window.innerHeight - 60;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(60, Math.min(newY, maxY)),
    });
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse drag support for testing on desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    setIsDragging(true);
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      const newX = dragStartRef.current.posX + deltaX;
      const newY = dragStartRef.current.posY + deltaY;

      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(60, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const viewPresets = usePitchBearing
    ? [
        { label: "2D", pitch: 0, bearing: 0 },
        { label: "3D", pitch: 60, bearing: -20 },
        { label: "Street", pitch: 75, bearing: 0 },
      ]
    : [
        { label: "2D", tilt: 0, heading: 0 },
        { label: "3D", tilt: 60, heading: 340 },
        { label: "Street", tilt: 75, heading: 0 },
      ];

  return (
    <div
      ref={dragRef}
      className="fixed z-50 lg:hidden touch-none"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      <div
        className="rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: "rgba(10, 14, 26, 0.95)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(196, 169, 106, 0.3)",
          minWidth: isExpanded ? 200 : "auto",
        }}
      >
        {/* Drag handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing"
          style={{
            background: "rgba(196, 169, 106, 0.15)",
            borderBottom: isExpanded ? "1px solid rgba(196, 169, 106, 0.2)" : "none",
          }}
        >
          {/* Drag indicator */}
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-[#c4a96a]/60" />
            <div className="w-1 h-1 rounded-full bg-[#c4a96a]/60" />
            <div className="w-1 h-1 rounded-full bg-[#c4a96a]/60" />
          </div>

          {/* Expand/collapse toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded transition-colors hover:bg-white/10"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c4a96a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Expanded stats section */}
        {isExpanded && (
          <div className="px-3 py-2 flex gap-4 text-center">
            <div>
              <div className="text-sm font-bold text-white">{districtCount}</div>
              <div className="text-[9px] text-white/50 uppercase">Districts</div>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <div className="text-sm font-bold text-white">{totalOrgs}</div>
              <div className="text-[9px] text-white/50 uppercase">Orgs</div>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <div className="text-sm font-bold text-[#c4a96a]">{avgScore}</div>
              <div className="text-[9px] text-white/50 uppercase">Avg</div>
            </div>
          </div>
        )}

        {/* View buttons - always visible */}
        <div className="flex gap-1.5 p-2">
          {viewPresets.map((p) => (
            <button
              key={p.label}
              onClick={() => onViewPreset(p)}
              className="flex-1 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                color: "rgba(255, 255, 255, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={onReset}
            className="rounded-lg px-3 py-2 text-[11px] font-bold transition-colors"
            style={{
              background: "rgba(196, 169, 106, 0.15)",
              color: "#c4a96a",
              border: "1px solid rgba(196, 169, 106, 0.3)",
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
