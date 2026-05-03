"use client";

import type mapboxgl from "mapbox-gl";
import { VIEW_PRESETS } from "../constants";

interface ViewPresetButtonsProps {
  map: mapboxgl.Map | null;
}

export default function ViewPresetButtons({ map }: ViewPresetButtonsProps) {
  const handleClick = (pitch: number, bearing: number) => {
    if (!map) return;
    map.easeTo({ pitch, bearing, duration: 1000 });
  };

  return (
    <div className="hidden md:flex absolute right-4 top-[140px] z-10 flex-col gap-1">
      <div className="ltm-panel" style={{ padding: "6px" }}>
        {VIEW_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handleClick(preset.pitch, preset.bearing)}
            aria-label={`Switch to ${preset.label} view`}
            className="ltm-view-preset-btn"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
