"use client";

/**
 * WorkspaceOliviaPanel — Top-center Olivia display for the Document Workspace.
 *
 * Context-aware: shows guidance based on the active document, block, and field.
 * Updates dynamically as the user navigates between fields.
 *
 * Phase 3 of Document Workspace build.
 */

import React, { useMemo } from "react";
import { getEditableFields, type WorkspaceBlock } from "./DocumentWorkspace";

// ── Block type display names ──────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  hero: "Header",
  paragraph: "Paragraph",
  section: "Section Heading",
  callout: "Callout",
  quote: "Quote",
  metrics: "Key Metrics",
  table: "Table",
  comparison_table: "Comparison Table",
  list: "List",
  timeline: "Timeline",
  team_card: "Team Member",
  product_card: "Products",
  bar_chart: "Bar Chart",
  pie_chart: "Pie Chart",
  stat_card: "Stat Card",
  footer: "Footer",
  divider: "Divider",
  logo_banner: "Logo Banner",
};

// ── Props ─────────────────────────────────────────────────────────────

interface WorkspaceOliviaPanelProps {
  documentTitle: string;
  documentType: string;
  /** The currently active/selected block, or null if none */
  activeBlock: WorkspaceBlock | null;
  /** All blocks — used to compute next empty field */
  blocks: WorkspaceBlock[];
  /** Overall completion percentage */
  completionPct: number;
  /** Fires when user clicks "Ask Olivia" */
  onOpenOlivia?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────

export function WorkspaceOliviaPanel({
  documentTitle,
  documentType,
  activeBlock,
  blocks,
  completionPct,
  onOpenOlivia,
}: WorkspaceOliviaPanelProps) {
  // Compute contextual message based on state
  const contextMessage = useMemo(() => {
    // Document complete
    if (completionPct === 100) {
      return {
        heading: "Document complete",
        body: `All fields in "${documentTitle}" are filled. Review your entries, then move to the next document in your package.`,
        accent: "#4ADE80",
      };
    }

    // No block selected — general guidance
    if (!activeBlock) {
      const emptyCount = blocks.filter((b) => b.status === "empty" && getEditableFields(b.templateData).length > 0).length;
      const partialCount = blocks.filter((b) => b.status === "partial").length;

      if (emptyCount === 0 && partialCount === 0) {
        return {
          heading: "Looking good",
          body: "Select a section to review or refine your entries.",
          accent: "#C4A96A",
        };
      }

      const parts: string[] = [];
      if (emptyCount > 0) parts.push(`${emptyCount} empty`);
      if (partialCount > 0) parts.push(`${partialCount} in progress`);

      return {
        heading: "Select a section to begin",
        body: `This document has ${parts.join(" and ")} ${emptyCount + partialCount === 1 ? "section" : "sections"}. Click any section on the right to start filling it in.`,
        accent: "#C4A96A",
      };
    }

    // Block selected — show field-level guidance
    const fields = getEditableFields(activeBlock.templateData);
    if (fields.length === 0) {
      return {
        heading: BLOCK_LABELS[activeBlock.type] || activeBlock.type,
        body: "This is a decorative element — no fields to fill.",
        accent: "var(--muted)",
      };
    }

    // Find first unfilled field in this block for targeted guidance
    const firstUnfilled = fields.find((f) => {
      const val = activeBlock.userData[f.key];
      if (val === undefined || val === null) return true;
      if (typeof val === "string" && /\[([^\]]+)\]/.test(val)) return true;
      return false;
    });

    if (firstUnfilled) {
      return {
        heading: `${BLOCK_LABELS[activeBlock.type] || activeBlock.type} — ${firstUnfilled.label}`,
        body: `Fill in the "${firstUnfilled.label}" field to continue. Click "Ask Olivia" for guided help.`,
        accent: activeBlock.status === "empty" ? "#f87171" : "#fbbf24",
      };
    }

    // All fields filled in this block
    return {
      heading: `${BLOCK_LABELS[activeBlock.type] || activeBlock.type} — Complete`,
      body: "All fields in this section are filled. You can review and refine, or move to the next section.",
      accent: "#4ADE80",
    };
  }, [activeBlock, blocks, completionPct, documentTitle]);

  // Status dot color
  const dotColor = completionPct === 100 ? "#4ADE80" : "#C4A96A";

  return (
    <div
      className="flex items-start gap-3 px-4 py-2.5"
      style={{
        background: "rgba(10, 14, 26, 0.6)",
        borderBottom: "1px solid rgba(196, 169, 106, 0.08)",
      }}
      role="status"
      aria-live="polite"
      aria-label="Olivia workspace guidance"
    >
      {/* Olivia indicator */}
      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        <div
          className="h-2 w-2 rounded-full"
          style={{
            background: dotColor,
            boxShadow: `0 0 6px ${dotColor}40`,
          }}
          aria-hidden="true"
        />
        <span
          className="text-[10px] font-semibold tracking-wide uppercase"
          style={{ color: "rgba(196, 169, 106, 0.7)" }}
        >
          Olivia
        </span>
      </div>

      {/* Contextual message */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[11px] font-semibold leading-tight"
          style={{ color: contextMessage.accent }}
        >
          {contextMessage.heading}
        </p>
        <p
          className="text-[11px] leading-relaxed mt-0.5"
          style={{ color: "var(--muted)" }}
        >
          {contextMessage.body}
        </p>
      </div>

      {/* Ask Olivia button */}
      {onOpenOlivia && completionPct < 100 && (
        <button
          type="button"
          onClick={onOpenOlivia}
          className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]/40"
          style={{
            background: "rgba(196, 169, 106, 0.1)",
            border: "1px solid rgba(196, 169, 106, 0.2)",
            color: "#C4A96A",
          }}
          aria-label="Ask Olivia for help with this document"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Ask Olivia
        </button>
      )}
    </div>
  );
}
