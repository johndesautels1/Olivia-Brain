"use client";

/**
 * `PreviewTab` — Inspector "Preview" tab body.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 2.5 + § 8 #7
 * ("the only place in the app where dark gives way" — light theme
 * inverted to feel print-ready).
 *
 * Shows the active surface's content as a print-ready render. For S18
 * the rendered content is minimal stubs; the full editor surface (with
 * real slide bodies + plan textareas + doc bodies) lands when Track V
 * + the slide editor close.
 */

import type { NavSection, Slide, ActiveDoc } from "@/lib/studio/types";
import { PLAN_SECTIONS } from "@/lib/studio/plan-sections";
import { SLIDE_META } from "@/lib/studio/slide-meta";

export interface PreviewTabProps {
  navSection: NavSection;
  slides: Slide[];
  activePlanIdx: number;
  activeDoc: ActiveDoc | null;
  projectName?: string;
  themeName?: string;
}

export function PreviewTab({
  navSection,
  slides,
  activePlanIdx,
  activeDoc,
  projectName = "Untitled Project",
  themeName = "Canary-Sapphire",
}: PreviewTabProps) {
  return (
    <div
      role="region"
      aria-label="Print-ready preview"
      style={{
        background: "#FAFBFC",
        color: "#111827",
        padding: 16,
        borderRadius: "var(--radius-md)",
        minHeight: 240,
        border: "1px solid var(--border-default)",
        fontFamily: "var(--font-sans)",
        display: "grid",
        gap: 12,
      }}
    >
      {/* Brand bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          paddingBottom: 8,
          borderBottom: "1px solid #E5E7EB",
          fontSize: "0.75rem",
          color: "#6B7280",
        }}
      >
        <span>{projectName}</span>
        <span>{themeName}</span>
      </div>

      {/* Body */}
      {navSection === "pitch" && (
        <PitchPreview slides={slides} />
      )}
      {navSection === "plan" && (
        <PlanPreview activePlanIdx={activePlanIdx} />
      )}
      {navSection === "documents" && (
        <DocumentsPreview activeDoc={activeDoc} />
      )}
      {navSection === "general" && (
        <p style={{ margin: 0, color: "#6B7280", fontStyle: "italic" }}>
          General mode — preview wires when the freeform draft lands (Session 19+).
        </p>
      )}
    </div>
  );
}

function PitchPreview({ slides }: { slides: Slide[] }) {
  if (slides.length === 0) {
    return (
      <p style={{ margin: 0, color: "#6B7280", fontStyle: "italic" }}>
        No slides yet. Apply a deck archetype from the Library tab to seed the deck.
      </p>
    );
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <h2
        style={{
          margin: 0,
          fontSize: "1.125rem",
          fontWeight: 700,
          color: "#111827",
        }}
      >
        Deck preview ({slides.length} slides)
      </h2>
      <ol
        style={{
          margin: 0,
          padding: "0 0 0 20px",
          display: "grid",
          gap: 4,
        }}
      >
        {slides.map((s) => (
          <li key={s.id} style={{ fontSize: "0.875rem", color: "#374151" }}>
            <span aria-hidden="true">{SLIDE_META[s.type]?.icon ?? "◯"}</span>{" "}
            <strong>{s.type}</strong>
            {s.fw.length > 0 && (
              <span style={{ marginLeft: 8, color: "#6B7280" }}>
                — {s.fw.join(", ")}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function PlanPreview({ activePlanIdx }: { activePlanIdx: number }) {
  const section = PLAN_SECTIONS[activePlanIdx];
  if (!section) {
    return (
      <p style={{ margin: 0, color: "#6B7280", fontStyle: "italic" }}>
        No plan section selected.
      </p>
    );
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
        <span aria-hidden="true">{section.icon}</span> {section.title}
      </h2>
      <p style={{ margin: 0, color: "#6B7280", fontStyle: "italic" }}>
        Section content fills in when the plan editor lands (Session 19+).
      </p>
    </div>
  );
}

function DocumentsPreview({ activeDoc }: { activeDoc: ActiveDoc | null }) {
  if (!activeDoc) {
    return (
      <p style={{ margin: 0, color: "#6B7280", fontStyle: "italic" }}>
        Select a document from the rail to preview.
      </p>
    );
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
        {activeDoc.doc}
      </h2>
      <p style={{ margin: 0, fontSize: "0.75rem", color: "#6B7280" }}>
        Category: {activeDoc.category}
      </p>
      <p style={{ margin: 0, color: "#6B7280", fontStyle: "italic" }}>
        Document body wires post-Track-V (Documents engine port — W-009).
      </p>
    </div>
  );
}
