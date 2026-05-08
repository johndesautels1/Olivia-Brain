"use client";

/**
 * DocumentTemplatePreview — Left-pane read-only template block preview
 *
 * Shows the original template skeleton with placeholder markers.
 * Clicking a block scrolls the right pane to the corresponding editor.
 */

import React from "react";
import type { WorkspaceBlock } from "./DocumentWorkspace";

// ── Block type icons (SVG path data) ───────────────────────────────────

const BLOCK_ICONS: Record<string, string> = {
  hero: "M3 3h18v6H3V3zm0 8h18v2H3v-2zm0 4h12v2H3v-2z",
  paragraph: "M4 6h16M4 10h16M4 14h10",
  section: "M4 6h16M4 12h16",
  callout: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  quote: "M10 11l-2 2H5l2-2V7h3v4zm8 0l-2 2h-3l2-2V7h3v4z",
  metrics: "M3 12h4v8H3v-8zm6-4h4v12H9V8zm6-6h4v18h-4V2z",
  table: "M3 3h18v18H3V3zm0 6h18M3 15h18M9 3v18M15 3v18",
  comparison_table: "M3 3h18v18H3V3zm0 6h18M3 15h18M9 3v18M15 3v18",
  list: "M8 6h13M8 12h13M8 18h13M3 6h2M3 12h2M3 18h2",
  timeline: "M12 2v20M5 6h6M13 12h6M5 18h6",
  team_card: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  product_card: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  bar_chart: "M18 20V10M12 20V4M6 20v-6",
  pie_chart: "M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z",
  stat_card: "M16 8v8M12 11v5M8 14v2M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z",
  footer: "M4 18h16M4 14h10M4 10h6",
  divider: "M5 12h14",
  logo_banner: "M4 5h4v4H4V5zm6 0h4v4h-4V5zm6 0h4v4h-4V5z",
  two_column: "M3 3h8v18H3V3zm10 0h8v18h-8V3z",
};

// ── Status indicator colors ────────────────────────────────────────────

const STATUS_DOT_COLORS: Record<string, string> = {
  empty: "#ef4444",
  partial: "#fbbf24",
  complete: "#4ADE80",
};

// ── Block preview text extraction ──────────────────────────────────────

function getPreviewText(block: WorkspaceBlock): string {
  const data = block.templateData;

  switch (block.type) {
    case "hero":
      return (data.title as string) || "Document Header";
    case "paragraph":
      return ((data.content as string) || "").slice(0, 80) + "...";
    case "section":
      return (data.heading as string) || "Section";
    case "callout":
      return (data.title as string) || (data.content as string)?.slice(0, 60) || "Callout";
    case "quote":
      return ((data.text as string) || "").slice(0, 60) + "...";
    case "metrics": {
      const items = data.items as Array<{ label: string }>;
      return items ? items.map((m) => m.label).join(", ") : "Metrics";
    }
    case "table":
    case "comparison_table":
      return (data.title as string) || "Data Table";
    case "list": {
      const listItems = data.items as string[];
      return listItems ? `${listItems.length} items` : "List";
    }
    case "timeline":
      return (data.title as string) || "Timeline";
    case "team_card":
      return `${(data.name as string) || "Team Member"} — ${(data.role as string) || ""}`;
    case "product_card":
      return "Product Cards";
    case "bar_chart":
    case "pie_chart":
      return (data.title as string) || "Chart";
    case "stat_card":
      return `${(data.label as string) || "Stat"}: ${(data.value as string) || ""}`;
    case "footer":
      return (data.company as string) || "Footer";
    case "divider":
      return "—";
    case "logo_banner":
      return (data.title as string) || "Logo Banner";
    default:
      return block.type;
  }
}

// ── Main Component ─────────────────────────────────────────────────────

interface DocumentTemplatePreviewProps {
  block: WorkspaceBlock;
  isActive: boolean;
  onClick: () => void;
}

export function DocumentTemplatePreview({
  block,
  isActive,
  onClick,
}: DocumentTemplatePreviewProps) {
  const iconPath = BLOCK_ICONS[block.type] || BLOCK_ICONS.paragraph;
  const preview = getPreviewText(block);
  const statusColor = STATUS_DOT_COLORS[block.status];
  const isDecorative = block.type === "divider";

  return (
    <button
      type="button"
      onClick={() => {
        onClick();
        // Scroll right pane to matching block
        const targetEl = document.getElementById(`block-${block.index}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }}
      className="w-full text-left rounded-lg px-3 py-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]/40"
      style={{
        background: isActive
          ? "rgba(196, 169, 106, 0.08)"
          : "rgba(255, 255, 255, 0.02)",
        border: `1px solid ${
          isActive ? "rgba(196, 169, 106, 0.2)" : "rgba(255, 255, 255, 0.04)"
        }`,
      }}
      aria-label={`${block.type} block: ${preview}`}
      aria-current={isActive ? "true" : undefined}
    >
      <div className="flex items-start gap-2">
        {/* Block type icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0"
          style={{ color: isActive ? "#C4A96A" : "var(--muted)" }}
          aria-hidden="true"
        >
          <path d={iconPath} />
        </svg>

        <div className="flex-1 min-w-0">
          {/* Block type label */}
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-medium uppercase tracking-wide"
              style={{
                color: isActive ? "#C4A96A" : "var(--muted)",
              }}
            >
              {block.type.replace(/_/g, " ")}
            </span>

            {!isDecorative && (
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ background: statusColor }}
                aria-label={`Status: ${block.status}`}
              />
            )}
          </div>

          {/* Preview text */}
          {!isDecorative && (
            <p
              className="mt-0.5 text-[11px] leading-snug line-clamp-2"
              style={{ color: "rgba(255, 255, 255, 0.45)" }}
            >
              {preview}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
