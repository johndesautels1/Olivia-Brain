"use client";

import { useState } from "react";

interface LayerPanelProps {
  showHeatmap: boolean;
  showPins: boolean;
  showDistricts: boolean;
  showEvents: boolean;
  showCoworking: boolean;
  showNetworking: boolean;
  onToggleHeatmap: () => void;
  onTogglePins: () => void;
  onToggleDistricts: () => void;
  onToggleEvents: () => void;
  onToggleCoworking: () => void;
  onToggleNetworking: () => void;
  onResetView: () => void;
  onFindNearMe: () => void;
  locating: boolean;
}

export default function LayerPanel({
  showHeatmap,
  showPins,
  showDistricts,
  showEvents,
  showCoworking,
  showNetworking,
  onToggleHeatmap,
  onTogglePins,
  onToggleDistricts,
  onToggleEvents,
  onToggleCoworking,
  onToggleNetworking,
  onResetView,
  onFindNearMe,
  locating,
}: LayerPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
      {/* Collapsible layer toggles */}
      <div className="ltm-panel" role="region" aria-label="Map layer controls">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="ltm-panel-title flex items-center justify-between w-full md:cursor-default"
          aria-expanded={!collapsed}
        >
          <span>Layers</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`md:hidden transition-transform ${collapsed ? "-rotate-90" : ""}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className={`${collapsed ? "hidden md:block" : ""}`}>
          <label className="ltm-toggle">
            <input type="checkbox" checked={showHeatmap} onChange={onToggleHeatmap} />
            <span className="ltm-toggle-track"><span className="ltm-toggle-dot" /></span>
            <span>Heat Map</span>
          </label>
          <label className="ltm-toggle">
            <input type="checkbox" checked={showPins} onChange={onTogglePins} />
            <span className="ltm-toggle-track"><span className="ltm-toggle-dot" /></span>
            <span>Organizations</span>
          </label>
          <label className="ltm-toggle">
            <input type="checkbox" checked={showDistricts} onChange={onToggleDistricts} />
            <span className="ltm-toggle-track"><span className="ltm-toggle-dot" /></span>
            <span>Districts</span>
          </label>

          <div className="my-1 border-t border-[var(--card-border)]" />
          <div className="ltm-panel-title" style={{ fontSize: "9px", marginTop: "2px" }}>Overlays</div>

          <label className="ltm-toggle">
            <input type="checkbox" checked={showEvents} onChange={onToggleEvents} />
            <span className="ltm-toggle-track"><span className="ltm-toggle-dot" /></span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
              Events
            </span>
          </label>
          <label className="ltm-toggle">
            <input type="checkbox" checked={showCoworking} onChange={onToggleCoworking} />
            <span className="ltm-toggle-track"><span className="ltm-toggle-dot" /></span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-teal-400 shrink-0" aria-hidden="true" />
              Coworking
            </span>
          </label>
          <label className="ltm-toggle">
            <input type="checkbox" checked={showNetworking} onChange={onToggleNetworking} />
            <span className="ltm-toggle-track"><span className="ltm-toggle-dot" /></span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-violet-400 shrink-0" aria-hidden="true" />
              Networking
            </span>
          </label>
        </div>
      </div>

      <button onClick={onResetView} aria-label="Reset map to default view" className="ltm-panel ltm-reset-btn">
        Reset View
      </button>

      <button
        onClick={onFindNearMe}
        disabled={locating}
        aria-label="Find near me"
        className="ltm-panel ltm-reset-btn flex items-center justify-center gap-1.5"
      >
        {locating ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--muted)] border-t-brand-400" aria-hidden="true" />
            Locating...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
            Find Near Me
          </>
        )}
      </button>
    </div>
  );
}
