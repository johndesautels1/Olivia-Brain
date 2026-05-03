"use client";

/**
 * `DeckDetailModal` — archetype detail modal.
 *
 * Reference: `docs/01_UI_DESIGN_SYSTEM.md` § 8.1 (modal primitive — Radix Dialog)
 * + `STUDIO_OLIVIA_DESIGN.md` § 2.1 (deck props + payload shape).
 *
 * Opened from the Library tab when an archetype is clicked. Renders
 * the archetype's metadata + Olivia-derived match reasoning + the
 * gradient `Apply This Archetype` CTA that regenerates slides per
 * the prototype.
 *
 * # Accessibility
 *
 * Built on `@radix-ui/react-dialog` — focus-trap, return-focus on
 * close, Esc-to-close, and ARIA roles all handled by Radix. We just
 * render content into the slots.
 *
 * # Per-product flexibility
 *
 * Modal renders a `Deck` shape. cluesintelligence's verdict-block
 * modal and cluesxscore's metric-detail modal will share this primitive
 * (with their own data shapes); the per-product wrapper passes their
 * own `deck` payload + custom action label.
 */

import * as Dialog from "@radix-ui/react-dialog";
import { Badge } from "./Badge";
import { ConsensusDots } from "./ConsensusDots";

export interface Deck {
  /** Stable identifier. */
  id: string;
  /** Display name (e.g. "Y Combinator Series A"). */
  name: string;
  /** Category chip text (e.g. "Pitch Deck"). */
  category: string;
  /** Stage chip text (e.g. "Series A", "Seed"). */
  stage?: string;
  /** Tag text (e.g. "AI-native"). */
  tag?: string;
  /** ConsensusDots filled count (0-5). */
  consensus: number;
  /** Numeric match score (0-100). */
  score: number;
  /** One-paragraph insight from Olivia. */
  insight?: string;
  /** Why this archetype fits the user's persona. */
  fit?: string;
  /** Bullet list of human-readable match reasons. */
  matchReasons?: string[];
  /** Olivia's recommended next action. */
  oliviaAction?: string;
  /** Capital raised (e.g. "$15M Series A 2024"). */
  raised?: string;
  /** Source year (e.g. "2024"). */
  year?: string;
  /** Total slide count for the archetype. */
  slideCount?: number;
}

export interface DeckDetailModalProps {
  /** The deck to render. `null` keeps the modal closed. */
  deck: Deck | null;
  /** Called when the user dismisses the modal (Esc, overlay click, X button). */
  onClose: () => void;
  /** Called when the user clicks the Apply CTA. */
  onApply: (deck: Deck) => void;
  /** Apply CTA label. Default `"Apply This Archetype"`. */
  applyLabel?: string;
}

export function DeckDetailModal({
  deck,
  onClose,
  onApply,
  applyLabel = "Apply This Archetype",
}: DeckDetailModalProps) {
  const open = deck !== null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(8px)",
            zIndex: 99,
            animation: "deck-modal-overlay-in var(--duration-default) var(--ease-out-quart)",
          }}
        />
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 100,
            width: "min(720px, calc(100vw - 32px))",
            maxHeight: "calc(100vh - 64px)",
            overflowY: "auto",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border-aurum)",
            background: "var(--surface-2)",
            boxShadow:
              "0 24px 48px -8px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(196, 169, 106, 0.06)",
            color: "var(--fg-primary)",
            animation: "deck-modal-in var(--duration-default) var(--ease-out-quart)",
          }}
        >
          {deck && (
            <div style={{ padding: 32, display: "grid", gap: 20 }}>
              {/* ── Header row ────────────────────────────────────── */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      gap: 8,
                      flexWrap: "wrap",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-2xs)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--fg-tertiary)",
                    }}
                  >
                    <span style={{ color: "var(--aurum-primary)" }}>{deck.category}</span>
                    {deck.stage && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{deck.stage}</span>
                      </>
                    )}
                    {deck.year && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{deck.year}</span>
                      </>
                    )}
                    {deck.slideCount != null && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{deck.slideCount} slides</span>
                      </>
                    )}
                  </div>
                  <Dialog.Title
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-2xl)",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "var(--fg-primary)",
                    }}
                  >
                    {deck.name}
                  </Dialog.Title>
                  {deck.tag && (
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--fg-tertiary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {deck.tag}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
                  <Dialog.Close
                    aria-label="Close"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-default)",
                      background: "var(--surface-1)",
                      color: "var(--fg-tertiary)",
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </Dialog.Close>
                  <Badge value={deck.score} size="lg" />
                </div>
              </div>

              {/* ── Stats row ─────────────────────────────────────── */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <ConsensusDots n={deck.consensus} />
                {deck.raised && (
                  <span
                    className="tabular-nums"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--mint-up)",
                    }}
                  >
                    {deck.raised}
                  </span>
                )}
              </div>

              {/* ── Insight + Fit + Match Reasons ──────────────── */}
              {deck.insight && (
                <Section label="Insight" tone="aether">
                  <p style={{ margin: 0, color: "var(--fg-secondary)", lineHeight: 1.55 }}>
                    {deck.insight}
                  </p>
                </Section>
              )}

              {deck.fit && (
                <Section label="Fit" tone="aurum">
                  <p style={{ margin: 0, color: "var(--fg-secondary)", lineHeight: 1.55 }}>
                    {deck.fit}
                  </p>
                </Section>
              )}

              {deck.matchReasons && deck.matchReasons.length > 0 && (
                <Section label="Match reasons" tone="aurum">
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    {deck.matchReasons.map((reason, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          color: "var(--fg-secondary)",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{ color: "var(--aurum-primary)", marginTop: 2 }}
                        >
                          ✓
                        </span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {deck.oliviaAction && (
                <Section label="Olivia action" tone="aether">
                  <p style={{ margin: 0, color: "var(--fg-secondary)", lineHeight: 1.55 }}>
                    {deck.oliviaAction}
                  </p>
                </Section>
              )}

              {/* ── Apply CTA ─────────────────────────────────────── */}
              <button
                type="button"
                onClick={() => onApply(deck)}
                style={{
                  marginTop: 8,
                  padding: "14px 24px",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  background:
                    "linear-gradient(135deg, var(--aurum-primary), var(--aurum-soft))",
                  color: "var(--fg-on-accent)",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: "var(--text-base)",
                  cursor: "pointer",
                  boxShadow:
                    "0 8px 24px rgba(196, 169, 106, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.10)",
                  transition: "transform var(--duration-micro) var(--ease-out-quart)",
                }}
              >
                {applyLabel}
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>

      {/* Co-located keyframes — also no-op under reduced-motion. */}
      <style>{`
        @keyframes deck-modal-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes deck-modal-in {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.98); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </Dialog.Root>
  );
}

/* ── Section helper ──────────────────────────────────────────────── */

interface SectionProps {
  label: string;
  tone: "aurum" | "aether";
  children: React.ReactNode;
}

function Section({ label, tone, children }: SectionProps) {
  const accent =
    tone === "aurum" ? "var(--aurum-primary)" : "var(--aether-primary)";
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: accent,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
