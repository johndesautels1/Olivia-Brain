"use client";

/**
 * DocumentWorkspace — Book-style split-pane document editor.
 *
 * **Track B Sessions 8 + 8b — full port complete.**
 *
 * - Session 8 (commit `8d30887`) shipped the data-spine portion: types +
 *   helpers (`WorkspaceBlock`, `WorkspaceDocument`, `EditableField`,
 *   `computeBlockStatus`, `getEditableFields`) consumed by the studio
 *   engine + DocumentRenderer + future engine-side components.
 * - Session 8b appends the React component portion plus its 3 sibling
 *   imports (DocumentFieldEditor, DocumentTemplatePreview,
 *   WorkspaceOliviaPanel) — all ported in this session — so the
 *   `<DocumentWorkspace />` shell can mount end-to-end against a
 *   `WorkspaceDocument` stub.
 *
 * Source: `D:\London-Tech-Map\src\components\documents\DocumentWorkspace.tsx`
 *         byte-for-byte, with the regex-divergence fix in
 *         `computeBlockStatus` documented inline below. LTM file remains
 *         read-only.
 */

import React, { useState, useCallback, useMemo } from "react";
import { DocumentFieldEditor } from "./DocumentFieldEditor";
import { DocumentTemplatePreview } from "./DocumentTemplatePreview";
import { WorkspaceOliviaPanel } from "./WorkspaceOliviaPanel";

// ── Types ──────────────────────────────────────────────────────────────

export interface WorkspaceBlock {
  /** Index in the original blocks array */
  index: number;
  /** Block type from the block_json schema */
  type: string;
  /** The raw block data (template version with placeholders) */
  templateData: Record<string, unknown>;
  /** The user's editable version (starts as copy of template, user fills placeholders) */
  userData: Record<string, unknown>;
  /** Field completion status */
  status: "empty" | "partial" | "complete";
}

export interface WorkspaceDocument {
  id: string;
  title: string;
  slug: string;
  collectionSlug: string;
  documentType: string;
  audienceType: string;
  purposeType: string;
  confidentiality: string;
  summary: string | null;
  blocks: WorkspaceBlock[];
}

// ── Placeholder detection ──────────────────────────────────────────────

// **Divergence from LTM source:** LTM's original `hasPlaceholders` calls
// `.test()` on a module-level `/.../g` regex, whose `lastIndex` carries
// over between calls. When `computeBlockStatus` is invoked for many blocks
// in sequence, a stale `lastIndex` past the next string's length makes
// `.test()` falsely return `false` and the block is mis-classified as
// "complete". Caught by the `questionMapper.test.ts` partial-completion
// case in Track B Session 8. Local regex literal in `hasPlaceholders`
// removes the shared state; `countPlaceholders` keeps a fresh `g` regex
// per call for the same reason. LTM source file remains read-only.

/** Check if a string value contains unfilled template placeholders */
function hasPlaceholders(value: string): boolean {
  return /\[([^\]]+)\]/.test(value);
}

/** Count remaining placeholders in a string */
function countPlaceholders(value: string): number {
  const matches = value.match(/\[([^\]]+)\]/g);
  return matches ? matches.length : 0;
}

/** Determine if a block's user data is empty, partial, or complete */
export function computeBlockStatus(
  templateData: Record<string, unknown>,
  userData: Record<string, unknown>,
): "empty" | "partial" | "complete" {
  const editableFields = getEditableFields(templateData);
  if (editableFields.length === 0) return "complete"; // Decorative blocks (divider, etc.)

  let filledCount = 0;
  let totalCount = 0;

  for (const field of editableFields) {
    totalCount++;
    const userValue = userData[field.key];
    const templateValue = templateData[field.key];

    if (typeof userValue === "string" && typeof templateValue === "string") {
      // If user value differs from template AND has no remaining placeholders → filled
      if (userValue !== templateValue && !hasPlaceholders(userValue)) {
        filledCount++;
      } else if (!hasPlaceholders(templateValue)) {
        // Template has no placeholders — it's pre-filled content, count as filled
        filledCount++;
      }
    } else if (userValue !== undefined && userValue !== null && userValue !== templateValue) {
      filledCount++;
    } else if (templateValue !== undefined && templateValue !== null) {
      // Check if template value itself has no placeholders (pre-filled)
      if (typeof templateValue === "string" && !hasPlaceholders(templateValue)) {
        filledCount++;
      }
    }
  }

  if (filledCount === 0) return "empty";
  if (filledCount >= totalCount) return "complete";
  return "partial";
}

// ── Editable field extraction ──────────────────────────────────────────

export interface EditableField {
  key: string;
  label: string;
  type: "text" | "textarea" | "items" | "metrics" | "table" | "timeline";
  placeholder?: string;
}

/** Extract editable fields from a block based on its type */
export function getEditableFields(block: Record<string, unknown>): EditableField[] {
  const blockType = block.type as string;
  const fields: EditableField[] = [];

  switch (blockType) {
    case "hero":
      fields.push({ key: "title", label: "Title", type: "text", placeholder: "[Your Company Name]" });
      if (block.subtitle !== undefined) fields.push({ key: "subtitle", label: "Subtitle", type: "text" });
      if (block.date !== undefined) fields.push({ key: "date", label: "Date", type: "text", placeholder: "[Month Year]" });
      if (block.preparedFor !== undefined) fields.push({ key: "preparedFor", label: "Prepared For", type: "text", placeholder: "[Recipient Name / Entity]" });
      break;

    case "paragraph":
      fields.push({ key: "content", label: "Content", type: "textarea" });
      break;

    case "section":
      fields.push({ key: "heading", label: "Heading", type: "text" });
      break;

    case "callout":
      if (block.title !== undefined) fields.push({ key: "title", label: "Title", type: "text" });
      fields.push({ key: "content", label: "Content", type: "textarea" });
      break;

    case "quote":
      fields.push({ key: "text", label: "Quote Text", type: "textarea" });
      if (block.attribution !== undefined) fields.push({ key: "attribution", label: "Attribution", type: "text" });
      break;

    case "metrics":
      fields.push({ key: "items", label: "Metrics", type: "metrics" });
      break;

    case "table":
    case "comparison_table":
      if (block.title !== undefined) fields.push({ key: "title", label: "Table Title", type: "text" });
      fields.push({ key: "rows", label: "Table Data", type: "table" });
      break;

    case "list":
      fields.push({ key: "items", label: "List Items", type: "items" });
      break;

    case "timeline":
      if (block.title !== undefined) fields.push({ key: "title", label: "Timeline Title", type: "text" });
      fields.push({ key: "items", label: "Timeline Items", type: "timeline" });
      break;

    case "team_card":
      fields.push({ key: "name", label: "Name", type: "text" });
      fields.push({ key: "role", label: "Role", type: "text" });
      fields.push({ key: "bio", label: "Biography", type: "textarea" });
      if (block.highlights !== undefined) fields.push({ key: "highlights", label: "Highlights", type: "items" });
      break;

    case "product_card":
      fields.push({ key: "items", label: "Products", type: "items" });
      break;

    case "bar_chart":
      if (block.title !== undefined) fields.push({ key: "title", label: "Chart Title", type: "text" });
      break;

    case "pie_chart":
      if (block.title !== undefined) fields.push({ key: "title", label: "Chart Title", type: "text" });
      break;

    case "stat_card":
      fields.push({ key: "label", label: "Label", type: "text" });
      fields.push({ key: "value", label: "Value", type: "text" });
      break;

    case "footer":
      if (block.company !== undefined) fields.push({ key: "company", label: "Company", type: "text" });
      if (block.address !== undefined) fields.push({ key: "address", label: "Address", type: "text" });
      if (block.classification !== undefined) fields.push({ key: "classification", label: "Classification", type: "text" });
      if (block.companyNumber !== undefined) fields.push({ key: "companyNumber", label: "Company Number", type: "text" });
      break;

    case "logo_banner":
      if (block.title !== undefined) fields.push({ key: "title", label: "Banner Title", type: "text" });
      break;

    // Decorative blocks with no editable fields
    case "divider":
      break;
  }

  return fields;
}

// `countPlaceholders` is referenced by neither helper currently; preserved
// here for parity with the LTM source so any future use can pick it up
// without re-derivation.
void countPlaceholders;

// ── Component prop shape ───────────────────────────────────────────────

interface DocumentWorkspaceProps {
  document: WorkspaceDocument;
  /** DNA paragraphs keyed by paragraph ID (p1-p10) */
  dnaParagraphs: Record<string, string>;
  /** Mapping of collection slugs to DNA paragraph IDs */
  dnaMap: Record<string, string[]>;
  onSave: (blocks: WorkspaceBlock[]) => Promise<void>;
}

// ── Status colors ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  empty: {
    bg: "rgba(239, 68, 68, 0.08)",
    border: "rgba(239, 68, 68, 0.25)",
    text: "#f87171",
    label: "Empty",
  },
  partial: {
    bg: "rgba(251, 191, 36, 0.08)",
    border: "rgba(251, 191, 36, 0.25)",
    text: "#fbbf24",
    label: "In Progress",
  },
  complete: {
    bg: "rgba(74, 222, 128, 0.08)",
    border: "rgba(74, 222, 128, 0.25)",
    text: "#4ADE80",
    label: "Complete",
  },
};

// ── Block type labels ──────────────────────────────────────────────────

const BLOCK_TYPE_LABELS: Record<string, string> = {
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
  two_column: "Two Column",
};

// ── Main Component ─────────────────────────────────────────────────────

export default function DocumentWorkspace({
  document: doc,
  dnaParagraphs,
  dnaMap,
  onSave,
}: DocumentWorkspaceProps) {
  const [blocks, setBlocks] = useState<WorkspaceBlock[]>(doc.blocks);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Compute overall document completion
  const completionStats = useMemo(() => {
    const editableBlocks = blocks.filter(
      (b) => getEditableFields(b.templateData).length > 0
    );
    const total = editableBlocks.length;
    const completed = editableBlocks.filter((b) => b.status === "complete").length;
    const partial = editableBlocks.filter((b) => b.status === "partial").length;
    const empty = editableBlocks.filter((b) => b.status === "empty").length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, partial, empty, percentage };
  }, [blocks]);

  // Get the DNA paragraphs relevant to this document's collection
  const relevantDna = useMemo(() => {
    const paragraphIds = dnaMap[doc.collectionSlug] || [];
    const result: Record<string, string> = {};
    for (const id of paragraphIds) {
      if (dnaParagraphs[id]) {
        result[id] = dnaParagraphs[id];
      }
    }
    return result;
  }, [doc.collectionSlug, dnaMap, dnaParagraphs]);

  // Update a block's user data
  const handleBlockUpdate = useCallback(
    (blockIndex: number, fieldKey: string, newValue: unknown) => {
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.index !== blockIndex) return block;

          const updatedUserData = { ...block.userData, [fieldKey]: newValue };
          const updatedStatus = computeBlockStatus(block.templateData, updatedUserData);

          return {
            ...block,
            userData: updatedUserData,
            status: updatedStatus,
          };
        })
      );
    },
    []
  );

  // Save all blocks
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await onSave(blocks);
      setSaveMessage("Saved successfully");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage("Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  }, [blocks, onSave]);

  // Get status color tier for the overall percentage
  const getProgressColor = (pct: number) => {
    if (pct <= 20) return { bar: "#ef4444", glow: "rgba(239, 68, 68, 0.3)" };
    if (pct <= 40) return { bar: "#f97316", glow: "rgba(249, 115, 22, 0.3)" };
    if (pct <= 60) return { bar: "#eab308", glow: "rgba(234, 179, 8, 0.3)" };
    if (pct <= 80) return { bar: "#3b82f6", glow: "rgba(59, 130, 246, 0.3)" };
    return { bar: "#22c55e", glow: "rgba(34, 197, 94, 0.3)" };
  };

  const progressColor = getProgressColor(completionStats.percentage);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Top Bar: Document title + save + progress ─────────────── */}
      <div
        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        style={{
          background: "rgba(15, 18, 25, 0.8)",
          borderBottom: "1px solid rgba(196, 169, 106, 0.1)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--foreground)] truncate">
            {doc.title}
          </h2>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{
              background: STATUS_COLORS[completionStats.percentage === 100 ? "complete" : completionStats.percentage > 0 ? "partial" : "empty"].bg,
              color: STATUS_COLORS[completionStats.percentage === 100 ? "complete" : completionStats.percentage > 0 ? "partial" : "empty"].text,
              border: `1px solid ${STATUS_COLORS[completionStats.percentage === 100 ? "complete" : completionStats.percentage > 0 ? "partial" : "empty"].border}`,
            }}
          >
            {completionStats.percentage}% Complete
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* DNA indicator */}
          {Object.keys(relevantDna).length > 0 && (
            <span
              className="text-[10px] font-medium"
              style={{ color: "rgba(196, 169, 106, 0.6)" }}
              title={`DNA paragraphs available: ${Object.keys(relevantDna).join(", ")}`}
            >
              DNA: {Object.keys(relevantDna).length} paragraphs linked
            </span>
          )}

          {/* Save feedback */}
          {saveMessage && (
            <span
              className="text-xs font-medium"
              style={{
                color: saveMessage.includes("success") ? "#4ADE80" : "#f87171",
              }}
            >
              {saveMessage}
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]/50 disabled:opacity-50"
            style={{
              background: "rgba(196, 169, 106, 0.15)",
              border: "1px solid rgba(196, 169, 106, 0.25)",
              color: "#C4A96A",
            }}
            aria-label="Save document progress"
          >
            {saving ? "Saving..." : "Save Progress"}
          </button>
        </div>
      </div>

      {/* ── Progress bar ──────────────────────────────────────────── */}
      <div className="px-4 py-2" style={{ background: "rgba(10, 14, 26, 0.6)" }}>
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-2 rounded-full overflow-hidden"
            style={{ background: "rgba(255, 255, 255, 0.06)" }}
            role="progressbar"
            aria-valuenow={completionStats.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Document completion: ${completionStats.percentage}%`}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${completionStats.percentage}%`,
                background: progressColor.bar,
                boxShadow: `0 0 8px ${progressColor.glow}`,
              }}
            />
          </div>
          <span className="text-[10px] font-medium tabular-nums" style={{ color: progressColor.bar }}>
            {completionStats.completed}/{completionStats.total} fields
          </span>
        </div>
      </div>

      {/* ── Olivia Guidance Panel ─────────────────────────────────── */}
      <WorkspaceOliviaPanel
        documentTitle={doc.title}
        documentType={doc.documentType}
        activeBlock={activeBlockIndex !== null ? blocks.find((b) => b.index === activeBlockIndex) ?? null : null}
        blocks={blocks}
        completionPct={completionStats.percentage}
      />

      {/* ── Split Pane: Template (left) | Editor (right) ──────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Pane — Template Preview */}
        <div
          className="hidden lg:flex flex-col w-[45%] min-w-0 overflow-y-auto border-r"
          style={{
            borderColor: "rgba(196, 169, 106, 0.1)",
            background: "linear-gradient(180deg, rgba(15, 18, 25, 0.5) 0%, rgba(10, 14, 26, 0.3) 100%)",
          }}
        >
          <div
            className="sticky top-0 z-10 px-4 py-2"
            style={{
              background: "rgba(15, 18, 25, 0.95)",
              borderBottom: "1px solid rgba(196, 169, 106, 0.08)",
            }}
          >
            <span
              className="text-[10px] font-semibold tracking-wide uppercase"
              style={{ color: "rgba(196, 169, 106, 0.5)" }}
            >
              Template
            </span>
          </div>
          <div className="p-4 space-y-2">
            {blocks.map((block) => (
              <DocumentTemplatePreview
                key={block.index}
                block={block}
                isActive={activeBlockIndex === block.index}
                onClick={() => setActiveBlockIndex(block.index)}
              />
            ))}
          </div>
        </div>

        {/* Right Pane — Field Editor */}
        <div
          className="flex flex-col flex-1 min-w-0 overflow-y-auto"
          style={{
            background: "linear-gradient(180deg, rgba(10, 14, 26, 0.4) 0%, rgba(5, 8, 16, 0.6) 100%)",
          }}
        >
          <div
            className="sticky top-0 z-10 px-4 py-2"
            style={{
              background: "rgba(15, 18, 25, 0.95)",
              borderBottom: "1px solid rgba(196, 169, 106, 0.08)",
            }}
          >
            <span
              className="text-[10px] font-semibold tracking-wide uppercase"
              style={{ color: "rgba(196, 169, 106, 0.5)" }}
            >
              Your Document
            </span>
          </div>
          <div className="p-4 space-y-3">
            {blocks.map((block) => {
              const editableFields = getEditableFields(block.templateData);
              if (editableFields.length === 0) {
                // Decorative block — show label only
                return (
                  <div
                    key={block.index}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    <span className="text-[10px] text-[var(--muted)] uppercase tracking-wide">
                      {BLOCK_TYPE_LABELS[block.type] || block.type}
                    </span>
                  </div>
                );
              }

              const statusStyle = STATUS_COLORS[block.status];

              return (
                <div
                  key={block.index}
                  id={`block-${block.index}`}
                  className="rounded-xl overflow-hidden transition-all"
                  style={{
                    background: "rgba(15, 18, 25, 0.6)",
                    border: `1px solid ${
                      activeBlockIndex === block.index
                        ? "rgba(196, 169, 106, 0.3)"
                        : "rgba(255, 255, 255, 0.06)"
                    }`,
                    boxShadow:
                      activeBlockIndex === block.index
                        ? "0 0 12px rgba(196, 169, 106, 0.08)"
                        : "none",
                  }}
                  onClick={() => setActiveBlockIndex(block.index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveBlockIndex(block.index);
                    }
                  }}
                  aria-label={`Edit ${BLOCK_TYPE_LABELS[block.type] || block.type} block`}
                  aria-expanded={activeBlockIndex === block.index}
                >
                  {/* Block header */}
                  <div
                    className="flex items-center justify-between px-4 py-2"
                    style={{
                      borderBottom: activeBlockIndex === block.index
                        ? "1px solid rgba(255, 255, 255, 0.06)"
                        : "none",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--foreground)]">
                        {BLOCK_TYPE_LABELS[block.type] || block.type}
                      </span>
                      {/* Brief field preview */}
                      {block.type === "section" && typeof block.userData.heading === "string" && (
                        <span className="text-[11px] text-[var(--muted)] truncate max-w-[200px]">
                          — {block.userData.heading}
                        </span>
                      )}
                      {block.type === "hero" && typeof block.userData.title === "string" && (
                        <span className="text-[11px] text-[var(--muted)] truncate max-w-[200px]">
                          — {block.userData.title}
                        </span>
                      )}
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide"
                      style={{
                        background: statusStyle.bg,
                        color: statusStyle.text,
                        border: `1px solid ${statusStyle.border}`,
                      }}
                    >
                      {statusStyle.label}
                    </span>
                  </div>

                  {/* Expanded field editor */}
                  {activeBlockIndex === block.index && (
                    <div className="px-4 py-3">
                      <DocumentFieldEditor
                        block={block}
                        fields={editableFields}
                        relevantDna={relevantDna}
                        onUpdate={(fieldKey, value) =>
                          handleBlockUpdate(block.index, fieldKey, value)
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
