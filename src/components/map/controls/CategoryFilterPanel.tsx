"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Category definitions ── */
export type CategoryKey =
  | "ai_startups"
  | "corporate_hq"
  | "vc_investors"
  | "angel_investors"
  | "seed_funds"
  | "accelerators"
  | "coworking"
  | "education"
  | "meetups"
  | "conferences"
  | "government"
  | "partners"
  | "videos";

export const ALL_CATEGORIES: CategoryKey[] = [
  "accelerators",
  "ai_startups",
  "angel_investors",
  "corporate_hq",
  "coworking",
  "government",
  "meetups",
  "partners",
  "seed_funds",
  "conferences",
  "education",
  "vc_investors",
  "videos",
];

interface CategoryDef {
  key: CategoryKey;
  label: string;
  color: string;
  icon: string;
}

const CATEGORIES: CategoryDef[] = [
  { key: "accelerators", label: "Accelerators & Incubators", color: "#FBBF24", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" }, // lightbulb
  { key: "ai_startups", label: "AI & Software Startups", color: "#60A5FA", icon: "M13 10V3L4 14h7v7l9-11h-7z" }, // bolt
  { key: "angel_investors", label: "Angel Investors", color: "#A78BFA", icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" }, // heart
  { key: "corporate_hq", label: "Corporate HQs", color: "#818CF8", icon: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" }, // building
  { key: "coworking", label: "Coworking Spaces", color: "#14B8A6", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }, // home
  { key: "government", label: "Government & Grants", color: "#38BDF8", icon: "M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" }, // landmark
  { key: "meetups", label: "Meetups & Networking", color: "#F472B6", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" }, // users
  { key: "partners", label: "Partners & Services", color: "#94A3B8", icon: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" }, // wrench
  { key: "seed_funds", label: "Seed Funds", color: "#4ADE80", icon: "M7 20h10M10 20c5.5-2.5.8-6.4 3-10 .1-2-2.8-3.1-3-1-.2 2.1 1.2 4.6-1 6.1-1.4 1-3.1.6-3.1.6" }, // seedling
  { key: "conferences", label: "Seminars & Conferences", color: "#FB923C", icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" }, // mic
  { key: "education", label: "Universities & Education", color: "#C084FC", icon: "M22 10v6M2 10l10-5 10 5-10 5z" }, // graduation
  { key: "vc_investors", label: "VC & Institutional", color: "#34D399", icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }, // dollar
  { key: "videos", label: "Video Content", color: "#EF4444", icon: "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653z" }, // play
];

interface CategoryFilterPanelProps {
  activeCategories: Set<CategoryKey>;
  onToggleCategory: (cat: CategoryKey) => void;
  onToggleAll: (selectAll: boolean) => void;
  districtCounts: Record<string, number>;
  totalVisible: number;
}

export function CategoryFilterPanel({
  activeCategories,
  onToggleCategory,
  onToggleAll,
  districtCounts,
  totalVisible,
}: CategoryFilterPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Optimistic local state for immediate checkbox feedback (INP < 200ms)
  const [localActive, setLocalActive] = useState<Set<CategoryKey>>(activeCategories);

  // Sync local state with prop when it changes
  useEffect(() => {
    setLocalActive(activeCategories);
  }, [activeCategories]);

  // Optimistic toggle handlers
  const handleToggleCategory = useCallback((cat: CategoryKey) => {
    setLocalActive((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
    onToggleCategory(cat);
  }, [onToggleCategory]);

  const handleToggleAll = useCallback((selectAll: boolean) => {
    setLocalActive(selectAll ? new Set(ALL_CATEGORIES) : new Set());
    onToggleAll(selectAll);
  }, [onToggleAll]);

  const allActive = localActive.size === ALL_CATEGORIES.length;
  const noneActive = localActive.size === 0;

  return (
    <div
      className={`absolute top-4 left-4 z-40 flex flex-col ${collapsed ? "w-auto" : "w-[200px] sm:w-[260px]"}`}
      style={{
        maxHeight: "calc(100% - 80px)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between rounded-t-xl px-4 py-3"
        style={{
          background: "rgba(10, 14, 26, 0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/60">
              Filter Ecosystem
            </div>
            <div className="text-[10px] text-white/40 mt-0.5">
              {totalVisible} entities visible
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="cfp-collapse-btn flex items-center justify-center h-7 w-7 rounded-md transition-colors"
          title={collapsed ? "Expand filters" : "Collapse filters"}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></>
            ) : (
              <><polyline points="15 18 9 12 15 6" /></>
            )}
          </svg>
        </button>
      </div>

      {/* Category list */}
      {!collapsed && (
        <div
          className="overflow-y-auto rounded-b-xl"
          style={{
            background: "rgba(10, 14, 26, 0.88)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* All toggle */}
          <button
            onClick={() => handleToggleAll(!allActive)}
            className="cfp-row w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              color: allActive ? "white" : "rgba(255,255,255,0.5)",
            }}
          >
            <div
              className="h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                borderColor: allActive ? "#C4A96A" : "rgba(255,255,255,0.2)",
                background: allActive ? "#C4A96A" : "transparent",
              }}
            >
              {allActive && (
                <svg className="h-3 w-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {allActive ? "Deselect All" : "Select All"}
            </span>
          </button>

          {/* Individual categories */}
          {CATEGORIES.map((cat) => {
            const active = localActive.has(cat.key);
            return (
              <button
                key={cat.key}
                onClick={() => handleToggleCategory(cat.key)}
                className="cfp-row w-full flex items-center gap-2.5 px-4 py-2 transition-colors text-left"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.02)",
                }}
              >
                {/* Checkbox */}
                <div
                  className="h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    borderColor: active ? cat.color : "rgba(255,255,255,0.5)",
                    background: active ? cat.color : "transparent",
                  }}
                >
                  {active && (
                    <svg className="h-2.5 w-2.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                {/* Icon */}
                <svg
                  className="h-3.5 w-3.5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={active ? cat.color : "rgba(255,255,255,0.7)"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={cat.icon} />
                </svg>

                {/* Label */}
                <span
                  className={`text-[11px] flex-1 truncate ${active ? "font-bold" : "font-normal"}`}
                  style={{ color: active ? "white" : "rgba(255,255,255,0.85)" }}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
