"use client";

/**
 * `DocumentTree` — 10-category collapsible doc tree, ~65 docs total.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 2.3 #6. Mounts in the left
 * rail when `navSection === "documents"`. Each category row has chevron
 * + emoji + title + count; expanding it reveals nested doc rows with
 * `CompletionRing` + name. Click on a doc sets `activeDoc`.
 *
 * For S17 the per-doc editor is a stub in the center pane — landing
 * full editing depth comes when Track B Session 8 (Documents engine
 * port) closes (Clerk-blocked today, W-009).
 */

import { CompletionRing } from "@/components/primitives/CompletionRing";
import { DOC_CATEGORIES } from "@/lib/studio/doc-categories";
import type { ActiveDoc } from "@/lib/studio/types";

export interface DocumentTreeProps {
  /** Set of `category.key` strings whose tree is expanded. */
  expanded: Set<string>;
  /** Toggle a category's expansion. */
  onToggleCategory: (key: string) => void;
  /** Currently-selected document. */
  activeDoc: ActiveDoc | null;
  /** Click handler — sets `activeDoc`. */
  onSelectDoc: (category: string, doc: string) => void;
  /** Per-doc completion percentages. Keyed by `${category}:${doc}`. */
  completions?: Record<string, number>;
}

export function DocumentTree({
  expanded,
  onToggleCategory,
  activeDoc,
  onSelectDoc,
  completions = {},
}: DocumentTreeProps) {
  return (
    <div
      role="tree"
      aria-label="Document categories"
      style={{ display: "grid", gap: 4 }}
    >
      <div
        style={{
          padding: "0 4px 6px",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          color: "var(--fg-tertiary)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Documents
      </div>
      {DOC_CATEGORIES.map((cat) => {
        const isOpen = expanded.has(cat.key);
        return (
          <div key={cat.key} role="treeitem" aria-expanded={isOpen}>
            {/* Category row */}
            <button
              type="button"
              onClick={() => onToggleCategory(cat.key)}
              aria-expanded={isOpen}
              aria-controls={`tree-${cat.key}`}
              style={{
                display: "grid",
                gridTemplateColumns: "auto auto 1fr auto",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 10px",
                background: "var(--surface-1)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--fg-primary)",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 12,
                  fontFamily: "var(--font-mono)",
                  color: "var(--fg-tertiary)",
                  transform: isOpen ? "rotate(90deg)" : "none",
                  transition: "transform var(--duration-micro) var(--ease-out-quart)",
                }}
              >
                ▸
              </span>
              <span aria-hidden="true">{cat.icon}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {cat.title}
              </span>
              <span
                className="tabular-nums"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  color: "var(--fg-tertiary)",
                  fontWeight: 600,
                }}
              >
                {cat.docs.length}
              </span>
            </button>

            {/* Nested doc rows */}
            {isOpen && (
              <ul
                id={`tree-${cat.key}`}
                role="group"
                style={{
                  margin: "4px 0 0 0",
                  padding: "0 0 0 16px",
                  listStyle: "none",
                  display: "grid",
                  gap: 2,
                }}
              >
                {cat.docs.map((doc) => {
                  const isActive =
                    activeDoc?.category === cat.key && activeDoc?.doc === doc;
                  const pct = completions[`${cat.key}:${doc}`] ?? 0;
                  return (
                    <li key={doc} role="treeitem" aria-selected={isActive}>
                      <button
                        type="button"
                        onClick={() => onSelectDoc(cat.key, doc)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr",
                          alignItems: "center",
                          gap: 8,
                          width: "100%",
                          padding: "6px 10px",
                          background: isActive ? "var(--aurum-mute)" : "transparent",
                          border: `1px solid ${isActive ? "var(--border-aurum)" : "transparent"}`,
                          borderRadius: "var(--radius-sm)",
                          color: isActive ? "var(--aurum-primary)" : "var(--fg-secondary)",
                          fontFamily: "var(--font-sans)",
                          fontSize: "var(--text-xs)",
                          fontWeight: isActive ? 600 : 400,
                          cursor: "pointer",
                          textAlign: "left",
                          transition:
                            "background var(--duration-micro) var(--ease-out-quart), border-color var(--duration-micro) var(--ease-out-quart), color var(--duration-micro) var(--ease-out-quart)",
                        }}
                      >
                        <CompletionRing value={pct} size={16} />
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {doc}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
