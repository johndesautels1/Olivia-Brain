"use client";

/**
 * `IntakeSidebar` — left-rail content for the founder-intake workspace.
 *
 * Mounted inside `RailLeft` from `src/components/workspace`. Stacks
 * three blocks vertically:
 *   1. Section navigation (12 clickable rows; active section highlights;
 *      each row shows its per-section completion ring + count chip).
 *   2. Data-completeness card — overall %, fields filled, founder-vs-API
 *      attribution split (the "API" half is a Q3 placeholder until the
 *      Composio auto-fill lands), gap-analysis CTA.
 *   3. "Let Olivia complete the rest" CTA — non-functional placeholder
 *      stub for Q2; Q3 wires it to Composio auto-fill.
 *
 * Section nav uses an `aria-label`'d `<nav>` and `aria-current="true"`
 * on the active row. Click scrolls the section into view; the consumer
 * (IntakeForm) owns the active-section state.
 */

import {
  QUANTARA_SECTIONS,
  type QuantaraSectionId,
  type QuantaraValues,
} from "@/lib/quantara";
import { Badge, CompletionRing } from "@/components/primitives";

import {
  allSectionCompleteness,
  type CompletenessSummary,
} from "./completeness";
import { QUANTARA_SECTION_UI_META } from "./section-meta";

export interface IntakeSidebarProps {
  values: QuantaraValues;
  overall: CompletenessSummary;
  activeSection?: QuantaraSectionId;
  onSelectSection: (id: QuantaraSectionId) => void;
  onTriggerOliviaAutofill?: () => void;
}

export function IntakeSidebar({
  values,
  overall,
  activeSection,
  onSelectSection,
  onTriggerOliviaAutofill,
}: IntakeSidebarProps) {
  const perSection = allSectionCompleteness(values);
  const fieldsRemaining = overall.fieldsTotal - overall.fieldsFilled;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* ── Section navigation ─────────────────────────────────────── */}
      <nav aria-label="Sections">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            padding: "0 4px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              fontWeight: 600,
              color: "var(--fg-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Sections
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: "var(--fg-tertiary)",
            }}
          >
            12
          </span>
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
          {QUANTARA_SECTIONS.map((s) => {
            const meta = QUANTARA_SECTION_UI_META[s.id];
            const summary =
              perSection.find((p) => p.section === s.id)?.summary;
            const Icon = meta.icon;
            const isActive = activeSection === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelectSection(s.id)}
                  aria-current={isActive ? "true" : undefined}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "10px 12px",
                    background: isActive ? "var(--aurum-mute)" : "transparent",
                    border: "none",
                    borderLeft: isActive
                      ? "3px solid var(--aurum-primary)"
                      : "3px solid transparent",
                    borderRadius: "var(--radius-md)",
                    color: isActive
                      ? "var(--aurum-primary)"
                      : "var(--fg-secondary)",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    fontWeight: isActive ? 600 : 500,
                    textAlign: "left",
                    touchAction: "manipulation",
                    transition:
                      "background var(--duration-micro) var(--ease-out-quart), color var(--duration-micro) var(--ease-out-quart)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <Icon
                      size={14}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      style={{ flexShrink: 0 }}
                    />
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.title}
                    </span>
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                    }}
                  >
                    {summary && (
                      <CompletionRing
                        value={summary.percent}
                        size={14}
                        showLabel={false}
                      />
                    )}
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-2xs)",
                        color: "var(--fg-tertiary)",
                        fontFeatureSettings: '"tnum" 1, "lnum" 1',
                      }}
                    >
                      {summary?.fieldsFilled ?? 0}/{summary?.fieldsTotal ?? s.fieldCount}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Data Completeness card ─────────────────────────────────── */}
      <div
        style={{
          padding: 20,
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--fg-primary)",
              }}
            >
              Data Completeness
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-2xs)",
                color: "var(--fg-tertiary)",
                marginTop: 2,
              }}
            >
              for full AI valuation
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xl)",
                fontWeight: 600,
                color: "var(--aurum-primary)",
                fontFeatureSettings: '"tnum" 1, "lnum" 1',
                lineHeight: 1,
              }}
            >
              {overall.percent}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                color: "var(--fg-tertiary)",
                marginTop: 2,
              }}
            >
              / 100
            </div>
          </div>
        </div>

        <Badge value={overall.percent} size="md" />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginTop: 12,
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              background: "var(--canvas-recess)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "var(--mint-up)",
                fontFeatureSettings: '"tnum" 1, "lnum" 1',
              }}
            >
              {overall.fieldsFilled} filled
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-2xs)",
                color: "var(--fg-tertiary)",
              }}
            >
              by you
            </div>
          </div>
          <div
            style={{
              padding: "8px 12px",
              background: "var(--canvas-recess)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "var(--aether-primary)",
                fontFeatureSettings: '"tnum" 1, "lnum" 1',
              }}
            >
              0 auto
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-2xs)",
                color: "var(--fg-tertiary)",
              }}
            >
              from APIs (Q3)
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid var(--border-subtle)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-2xs)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color:
                fieldsRemaining > 0
                  ? "var(--amber-warn)"
                  : "var(--mint-up)",
              fontWeight: 500,
            }}
          >
            <span aria-hidden="true">{fieldsRemaining > 0 ? "⚠" : "✓"}</span>
            <span>
              {fieldsRemaining > 0
                ? `${fieldsRemaining} fields remaining`
                : "All 56 fields complete"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Olivia gap analysis CTA (Q3 stub) ──────────────────────── */}
      <div
        style={{
          padding: 20,
          background: "var(--surface-1)",
          border: "1px solid var(--border-aurum)",
          borderRadius: "var(--radius-xl)",
          backgroundImage:
            "linear-gradient(135deg, var(--aurum-mute) 0%, transparent 60%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              color: "var(--aurum-primary)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-md)",
            }}
            aria-hidden="true"
          >
            ✦
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--aurum-primary)",
            }}
          >
            Olivia&apos;s Gap Analysis
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            lineHeight: 1.5,
            color: "var(--fg-secondary)",
          }}
        >
          Olivia can auto-fill many of these fields from connected APIs (Stripe,
          GitHub, Companies House) once the Q3 integration ships.
        </div>
        <button
          type="button"
          onClick={onTriggerOliviaAutofill}
          disabled
          aria-disabled="true"
          style={{
            marginTop: 12,
            width: "100%",
            padding: "10px 12px",
            background: "var(--aurum-mute)",
            border: "1px solid var(--border-aurum)",
            borderRadius: "var(--radius-lg)",
            color: "var(--aurum-primary)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            cursor: "not-allowed",
            opacity: 0.6,
            touchAction: "manipulation",
          }}
        >
          Let Olivia complete the rest (Q3)
        </button>
      </div>
    </div>
  );
}
