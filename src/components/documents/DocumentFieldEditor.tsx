"use client";

/**
 * DocumentFieldEditor — Field-by-field editor for document workspace blocks
 *
 * Renders editable form fields for each block type (text, textarea, items,
 * metrics, table, timeline). Supports DNA auto-fill for relevant fields.
 */

import React, { useCallback, useId } from "react";
import type { WorkspaceBlock, EditableField } from "./DocumentWorkspace";

// ── Types ──────────────────────────────────────────────────────────────

interface DocumentFieldEditorProps {
  block: WorkspaceBlock;
  fields: EditableField[];
  /** DNA paragraphs relevant to this document's collection */
  relevantDna: Record<string, string>;
  onUpdate: (fieldKey: string, value: unknown) => void;
}

// ── DNA paragraph labels ───────────────────────────────────────────────

const DNA_LABELS: Record<string, string> = {
  p1: "Company Genesis",
  p2: "Product & Technology",
  p3: "Business Model",
  p4: "London Market Opportunity",
  p5: "Traction & Metrics",
  p6: "Team & Advisors",
  p7: "Competitive Landscape",
  p8: "Financial Snapshot",
  p9: "Use of Funds",
  p10: "Vision & Exit Strategy",
};

// ── Shared styles ──────────────────────────────────────────────────────

const inputStyles = {
  base: "w-full rounded-lg px-3 py-2 text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]/40",
  bg: "rgba(10, 14, 26, 0.6)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  focusBorder: "1px solid rgba(196, 169, 106, 0.3)",
};

// ── Placeholder highlight helper ───────────────────────────────────────

const PLACEHOLDER_REGEX = /\[([^\]]+)\]/g;

function hasPlaceholder(value: string): boolean {
  return PLACEHOLDER_REGEX.test(value);
}

// ── Main Component ─────────────────────────────────────────────────────

export function DocumentFieldEditor({
  block,
  fields,
  relevantDna,
  onUpdate,
}: DocumentFieldEditorProps) {
  const idPrefix = useId();

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <FieldRenderer
          key={field.key}
          idPrefix={idPrefix}
          field={field}
          value={block.userData[field.key]}
          templateValue={block.templateData[field.key]}
          blockType={block.type}
          relevantDna={relevantDna}
          onUpdate={(value) => onUpdate(field.key, value)}
        />
      ))}
    </div>
  );
}

// ── Field Renderer ─────────────────────────────────────────────────────

interface FieldRendererProps {
  idPrefix: string;
  field: EditableField;
  value: unknown;
  templateValue: unknown;
  blockType: string;
  relevantDna: Record<string, string>;
  onUpdate: (value: unknown) => void;
}

function FieldRenderer({
  idPrefix,
  field,
  value,
  templateValue,
  blockType,
  relevantDna,
  onUpdate,
}: FieldRendererProps) {
  const fieldId = `${idPrefix}-${field.key}`;
  const stringValue = typeof value === "string" ? value : "";
  const isPlaceholder = typeof value === "string" && hasPlaceholder(value);
  const hasDna = Object.keys(relevantDna).length > 0;

  switch (field.type) {
    case "text":
      return (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label htmlFor={fieldId} className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              {field.label}
            </label>
          </div>
          <input
            id={fieldId}
            type="text"
            value={stringValue}
            onChange={(e) => onUpdate(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            className={inputStyles.base}
            style={{
              background: inputStyles.bg,
              border: isPlaceholder ? "1px solid rgba(251, 191, 36, 0.2)" : inputStyles.border,
              color: isPlaceholder ? "rgba(251, 191, 36, 0.7)" : "var(--foreground)",
            }}
            aria-label={field.label}
          />
          {isPlaceholder && (
            <p className="mt-1 text-[10px]" style={{ color: "rgba(251, 191, 36, 0.5)" }}>
              Replace the bracketed placeholder with your information
            </p>
          )}
        </div>
      );

    case "textarea":
      return (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <label htmlFor={fieldId} className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                {field.label}
              </label>
              </div>
            {hasDna && field.key === "content" && (
              <DnaFillButton
                relevantDna={relevantDna}
                blockType={blockType}
                onFill={(text) => onUpdate(text)}
              />
            )}
          </div>
          <textarea
            id={fieldId}
            value={stringValue}
            onChange={(e) => onUpdate(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            rows={4}
            className={`${inputStyles.base} resize-y font-mono text-[13px] leading-relaxed`}
            style={{
              background: inputStyles.bg,
              border: isPlaceholder ? "1px solid rgba(251, 191, 36, 0.2)" : inputStyles.border,
              color: isPlaceholder ? "rgba(251, 191, 36, 0.7)" : "var(--foreground)",
            }}
            aria-label={field.label}
          />
          {isPlaceholder && (
            <p className="mt-1 text-[10px]" style={{ color: "rgba(251, 191, 36, 0.5)" }}>
              Replace the bracketed placeholders with your information
            </p>
          )}
        </div>
      );

    case "items":
      return (
        <ListFieldEditor
          fieldId={fieldId}
          field={field}
          value={value}
          blockType={blockType}
          onUpdate={onUpdate}
        />
      );

    case "metrics":
      return (
        <MetricsFieldEditor
          fieldId={fieldId}
          field={field}
          value={value}
          blockType={blockType}
          onUpdate={onUpdate}
        />
      );

    case "table":
      return (
        <TableFieldEditor
          fieldId={fieldId}
          field={field}
          value={value}
          templateValue={templateValue}
          blockType={blockType}
          onUpdate={onUpdate}
        />
      );

    case "timeline":
      return (
        <TimelineFieldEditor
          fieldId={fieldId}
          field={field}
          value={value}
          blockType={blockType}
          onUpdate={onUpdate}
        />
      );

    default:
      return null;
  }
}

// ── DNA Fill Button ────────────────────────────────────────────────────

function DnaFillButton({
  relevantDna,
  blockType,
  onFill,
}: {
  relevantDna: Record<string, string>;
  blockType: string;
  onFill: (text: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = useCallback(
    (paragraphId: string) => {
      const text = relevantDna[paragraphId];
      if (text) {
        onFill(text);
        setIsOpen(false);
      }
    },
    [relevantDna, onFill]
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]/40"
        style={{
          background: "rgba(196, 169, 106, 0.1)",
          border: "1px solid rgba(196, 169, 106, 0.2)",
          color: "#C4A96A",
        }}
        aria-label="Auto-fill from DNA paragraphs"
        aria-expanded={isOpen}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        DNA Fill
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-20 w-56 rounded-lg overflow-hidden"
          style={{
            background: "rgba(15, 18, 25, 0.98)",
            border: "1px solid rgba(196, 169, 106, 0.2)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <span className="text-[10px] font-medium text-[var(--muted)]">
              Select a DNA paragraph to insert
            </span>
          </div>
          {Object.entries(relevantDna).map(([id, text]) => (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-[rgba(196,169,106,0.08)] transition-colors focus:outline-none focus-visible:bg-[rgba(196,169,106,0.08)]"
              style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}
            >
              <span className="font-medium" style={{ color: "#C4A96A" }}>
                {id.toUpperCase()}
              </span>
              <span className="text-[var(--muted)]"> — {DNA_LABELS[id] || id}</span>
              <p className="mt-0.5 text-[10px] text-[var(--muted)] line-clamp-2">
                {text.slice(0, 120)}...
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── List Field Editor ──────────────────────────────────────────────────

function ListFieldEditor({
  fieldId,
  field,
  value,
  blockType,
  onUpdate,
}: {
  fieldId: string;
  field: EditableField;
  value: unknown;
  blockType: string;
  onUpdate: (value: unknown) => void;
}) {
  const items = Array.isArray(value) ? (value as string[]) : [];

  const handleItemChange = useCallback(
    (index: number, newValue: string) => {
      const updated = [...items];
      updated[index] = newValue;
      onUpdate(updated);
    },
    [items, onUpdate]
  );

  const handleAddItem = useCallback(() => {
    onUpdate([...items, ""]);
  }, [items, onUpdate]);

  const handleRemoveItem = useCallback(
    (index: number) => {
      const updated = items.filter((_, i) => i !== index);
      onUpdate(updated);
    },
    [items, onUpdate]
  );

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          {field.label}
        </label>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => {
          const itemStr = typeof item === "string" ? item : JSON.stringify(item);
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2 text-[10px] font-mono text-[var(--muted)] w-5 text-right shrink-0">
                {i + 1}.
              </span>
              <textarea
                id={`${fieldId}-${i}`}
                value={itemStr}
                onChange={(e) => handleItemChange(i, e.target.value)}
                rows={2}
                className={`${inputStyles.base} flex-1 resize-y text-[12px]`}
                style={{
                  background: inputStyles.bg,
                  border: inputStyles.border,
                  color: "var(--foreground)",
                }}
                aria-label={`${field.label} item ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => handleRemoveItem(i)}
                className="mt-2 rounded p-1 text-[var(--muted)] hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                aria-label={`Remove item ${i + 1}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]/40"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            color: "var(--muted)",
          }}
          aria-label="Add new item"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Item
        </button>
      </div>
    </div>
  );
}

// ── Metrics Field Editor ───────────────────────────────────────────────

interface MetricItemData {
  label: string;
  value: string;
  icon?: string;
  delta?: string;
}

function MetricsFieldEditor({
  fieldId,
  field,
  value,
  blockType,
  onUpdate,
}: {
  fieldId: string;
  field: EditableField;
  value: unknown;
  blockType: string;
  onUpdate: (value: unknown) => void;
}) {
  const items = Array.isArray(value) ? (value as MetricItemData[]) : [];

  const handleMetricChange = useCallback(
    (index: number, key: string, newValue: string) => {
      const updated = items.map((item, i) =>
        i === index ? { ...item, [key]: newValue } : item
      );
      onUpdate(updated);
    },
    [items, onUpdate]
  );

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          {field.label}
        </label>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="grid grid-cols-2 gap-2 rounded-lg p-3"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <div>
              <label
                htmlFor={`${fieldId}-${i}-label`}
                className="text-[9px] uppercase tracking-wide text-[var(--muted)] mb-0.5 block"
              >
                Label
              </label>
              <input
                id={`${fieldId}-${i}-label`}
                type="text"
                value={item.label || ""}
                onChange={(e) => handleMetricChange(i, "label", e.target.value)}
                className={`${inputStyles.base} text-[12px]`}
                style={{ background: inputStyles.bg, border: inputStyles.border, color: "var(--foreground)" }}
                aria-label={`Metric ${i + 1} label`}
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-${i}-value`}
                className="text-[9px] uppercase tracking-wide text-[var(--muted)] mb-0.5 block"
              >
                Value
              </label>
              <input
                id={`${fieldId}-${i}-value`}
                type="text"
                value={item.value || ""}
                onChange={(e) => handleMetricChange(i, "value", e.target.value)}
                className={`${inputStyles.base} text-[12px]`}
                style={{ background: inputStyles.bg, border: inputStyles.border, color: "var(--foreground)" }}
                aria-label={`Metric ${i + 1} value`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Table Field Editor ─────────────────────────────────────────────────

function TableFieldEditor({
  fieldId,
  field,
  value,
  templateValue,
  blockType,
  onUpdate,
}: {
  fieldId: string;
  field: EditableField;
  value: unknown;
  templateValue: unknown;
  blockType: string;
  onUpdate: (value: unknown) => void;
}) {
  const rows = Array.isArray(value) ? (value as string[][]) : [];

  const handleCellChange = useCallback(
    (rowIndex: number, colIndex: number, newValue: string) => {
      const updated = rows.map((row, ri) =>
        ri === rowIndex
          ? row.map((cell, ci) => (ci === colIndex ? newValue : cell))
          : row
      );
      onUpdate(updated);
    },
    [rows, onUpdate]
  );

  if (rows.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          {field.label}
        </label>
      </div>
      <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid rgba(255, 255, 255, 0.06)" }}>
        <table className="w-full text-[12px]">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                {row.map((cell, ci) => (
                  <td key={ci} className="p-0">
                    <input
                      id={`${fieldId}-${ri}-${ci}`}
                      type="text"
                      value={cell}
                      onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                      className="w-full bg-transparent px-3 py-2 text-[12px] text-[var(--foreground)] focus:outline-none focus:bg-[rgba(196,169,106,0.05)]"
                      style={{
                        borderRight: ci < row.length - 1 ? "1px solid rgba(255, 255, 255, 0.04)" : "none",
                      }}
                      aria-label={`Row ${ri + 1}, Column ${ci + 1}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Timeline Field Editor ──────────────────────────────────────────────

interface TimelineItemData {
  date: string;
  title: string;
  description?: string;
}

function TimelineFieldEditor({
  fieldId,
  field,
  value,
  blockType,
  onUpdate,
}: {
  fieldId: string;
  field: EditableField;
  value: unknown;
  blockType: string;
  onUpdate: (value: unknown) => void;
}) {
  const items = Array.isArray(value) ? (value as TimelineItemData[]) : [];

  const handleItemChange = useCallback(
    (index: number, key: string, newValue: string) => {
      const updated = items.map((item, i) =>
        i === index ? { ...item, [key]: newValue } : item
      );
      onUpdate(updated);
    },
    [items, onUpdate]
  );

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          {field.label}
        </label>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-lg p-3 space-y-2"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor={`${fieldId}-${i}-date`}
                  className="text-[9px] uppercase tracking-wide text-[var(--muted)] mb-0.5 block"
                >
                  Date
                </label>
                <input
                  id={`${fieldId}-${i}-date`}
                  type="text"
                  value={item.date || ""}
                  onChange={(e) => handleItemChange(i, "date", e.target.value)}
                  className={`${inputStyles.base} text-[12px]`}
                  style={{ background: inputStyles.bg, border: inputStyles.border, color: "var(--foreground)" }}
                  aria-label={`Timeline item ${i + 1} date`}
                />
              </div>
              <div>
                <label
                  htmlFor={`${fieldId}-${i}-title`}
                  className="text-[9px] uppercase tracking-wide text-[var(--muted)] mb-0.5 block"
                >
                  Title
                </label>
                <input
                  id={`${fieldId}-${i}-title`}
                  type="text"
                  value={item.title || ""}
                  onChange={(e) => handleItemChange(i, "title", e.target.value)}
                  className={`${inputStyles.base} text-[12px]`}
                  style={{ background: inputStyles.bg, border: inputStyles.border, color: "var(--foreground)" }}
                  aria-label={`Timeline item ${i + 1} title`}
                />
              </div>
            </div>
            {item.description !== undefined && (
              <div>
                <label
                  htmlFor={`${fieldId}-${i}-desc`}
                  className="text-[9px] uppercase tracking-wide text-[var(--muted)] mb-0.5 block"
                >
                  Description
                </label>
                <textarea
                  id={`${fieldId}-${i}-desc`}
                  value={item.description || ""}
                  onChange={(e) => handleItemChange(i, "description", e.target.value)}
                  rows={2}
                  className={`${inputStyles.base} resize-y text-[12px]`}
                  style={{ background: inputStyles.bg, border: inputStyles.border, color: "var(--foreground)" }}
                  aria-label={`Timeline item ${i + 1} description`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
