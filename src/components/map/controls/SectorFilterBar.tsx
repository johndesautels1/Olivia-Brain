"use client";

import { ALL_SECTORS, sectorColor } from "../constants";

interface SectorFilterBarProps {
  activeSectors: Set<string>;
  onToggleSector: (sector: string) => void;
}

export default function SectorFilterBar({ activeSectors, onToggleSector }: SectorFilterBarProps) {
  return (
    <div className="hidden md:block absolute left-1/2 top-4 z-10 -translate-x-1/2">
      <div className="ltm-panel ltm-sector-bar" role="group" aria-label="Filter by sector">
        <div className="flex flex-wrap gap-1.5 justify-center max-w-xl">
          {ALL_SECTORS.map((sector) => {
            const isActive = activeSectors.size === 0 || activeSectors.has(sector);
            const color = sectorColor(sector);
            return (
              <button
                key={sector}
                onClick={() => onToggleSector(sector)}
                aria-pressed={activeSectors.has(sector)}
                className="ltm-sector-chip"
                style={{
                  borderColor: isActive ? color : "transparent",
                  background: isActive ? `${color}20` : "rgba(30,41,59,0.5)",
                  color: isActive ? color : "#94a3b8",
                }}
              >
                <span className="ltm-sector-dot" style={{ background: color, opacity: isActive ? 1 : 0.3 }} />
                {sector}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
