"use client";

/**
 * PitchPolishModal — 3-variant rewrite modal for the Preparation Studio.
 *
 * When the user selects text and clicks "Pitch Polish" (toolbar or /pitch-polish),
 * this modal calls the Olivia chat API to generate 3 rewrite variants:
 *   1. Minimal — light grammar/clarity cleanup
 *   2. Standard — professional polish, better structure
 *   3. Investor-Ready — full investor-grade rewrite, metrics-focused
 *
 * The user picks one and clicks "Apply Rewrite" to replace their selection.
 *
 * Design spec:
 * - Centered modal with dark overlay + blur
 * - Card: rgba(15, 18, 25, 0.95) with subtle border
 * - Original text shown at top for comparison
 * - 3 clickable variant cards with tier badges
 * - Badge colors: gray (Minimal), blue (Standard), gold (Investor-Ready)
 * - Loading: 3 pulsing gold dots
 * - Gold accent on selected variant and Apply button
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

// ── Types ───────────────────────────────────────────────────────────

interface PitchPolishModalProps {
  isOpen: boolean;
  selectedText: string;
  documentType: string;
  onAccept: (rewrittenText: string) => void;
  onClose: () => void;
}

interface Variant {
  label: string;
  tone: string;
  badge: string;
  color: string;
  text: string;
}

// ── Variant tier definitions ────────────────────────────────────────

const VARIANT_TIERS: Omit<Variant, "text">[] = [
  { label: "Minimal", tone: "Light cleanup", badge: "Clean", color: "#9AA7B2" },
  { label: "Standard", tone: "Professional polish", badge: "Pro", color: "#3b82f6" },
  { label: "Investor-Ready", tone: "Full investor rewrite", badge: "IR", color: "#C4A96A" },
];

// ── Generate variants via Olivia chat API ───────────────────────────

async function generateVariants(
  text: string,
  docType: string,
): Promise<Variant[]> {
  try {
    const response = await fetch("/api/olivia/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: [
          `Rewrite the following text in 3 different tones for a ${docType} document.`,
          `Return EXACTLY 3 versions separated by "---VARIANT---" on its own line.`,
          ``,
          `1. MINIMAL: Light grammar/clarity cleanup only. Keep the original voice.`,
          `2. STANDARD: Professional polish with better structure and flow.`,
          `3. INVESTOR-READY: Full investor-grade rewrite. Metrics-focused, confident, concise.`,
          ``,
          `Text to rewrite:`,
          `"${text}"`,
          ``,
          `Respond with ONLY the 3 rewrites separated by ---VARIANT--- on its own line.`,
          `No labels, no numbering, no extra commentary.`,
        ].join("\n"),
        context: "pitch-polish",
      }),
    });

    if (!response.ok) throw new Error("API call failed");

    const data = await response.json();
    const content: string = data.response || data.message || "";

    // Parse by ---VARIANT--- separator
    const parts = content
      .split(/---VARIANT---/i)
      .map((s: string) => s.trim())
      .filter(Boolean);

    if (parts.length >= 3) {
      return VARIANT_TIERS.map((tier, i) => ({
        ...tier,
        text: parts[i] || text,
      }));
    }

    // Fallback: try splitting by double newlines
    const altParts = content
      .split(/\n\n+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 10);

    if (altParts.length >= 3) {
      return VARIANT_TIERS.map((tier, i) => ({
        ...tier,
        text: altParts[i] || text,
      }));
    }

    throw new Error("Could not parse variants from response");
  } catch {
    // Graceful fallback: return original text in all tiers so user sees the UI
    return VARIANT_TIERS.map((tier) => ({
      ...tier,
      text: text,
    }));
  }
}

// ── Main Component ──────────────────────────────────────────────────

export function PitchPolishModal({
  isOpen,
  selectedText,
  documentType,
  onAccept,
  onClose,
}: PitchPolishModalProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate variants when the modal opens
  useEffect(() => {
    if (!isOpen || !selectedText) return;

    setLoading(true);
    setError(null);
    setSelectedIndex(null);
    setVariants([]);

    generateVariants(selectedText, documentType)
      .then((v) => {
        setVariants(v);
        setSelectedIndex(2); // Default highlight: Investor-Ready
      })
      .catch((err) => {
        setError(err.message || "Failed to generate variants");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, selectedText, documentType]);

  const handleAccept = useCallback(() => {
    if (selectedIndex !== null && variants[selectedIndex]) {
      onAccept(variants[selectedIndex].text);
    }
  }, [selectedIndex, variants, onAccept]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // WC-04: trap keyboard focus inside the modal so tabbing can't escape
  // into the obscured background.
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, modalRef);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Pitch Polish — 3 rewrite variants"
      >
        {/* Modal card */}
        <div
          ref={modalRef}
          className="w-full max-w-2xl rounded-2xl p-6 overflow-y-auto"
          style={{
            background: "rgba(15, 18, 25, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
            maxHeight: "85vh",
          }}
        >
          {/* ── Header ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3
                className="font-semibold"
                style={{ fontSize: "18px", color: "#e2e8f0" }}
              >
                Pitch Polish
              </h3>
              <p style={{ fontSize: "12px", color: "#9AA7B2", marginTop: "2px" }}>
                Choose a rewrite tone for your selected text
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-lg transition-all cursor-pointer"
              style={{
                width: "32px",
                height: "32px",
                color: "#9AA7B2",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
              aria-label="Close modal"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ── Original text ────────────────────────────────────── */}
          <div className="mb-5">
            <span
              className="uppercase tracking-wide"
              style={{
                fontSize: "10px",
                color: "rgba(255, 255, 255, 0.3)",
                letterSpacing: "0.08em",
              }}
            >
              Original
            </span>
            <div
              className="mt-1.5 rounded-lg px-4 py-3"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                fontSize: "13px",
                color: "#9AA7B2",
                lineHeight: 1.6,
              }}
            >
              {selectedText}
            </div>
          </div>

          {/* ── Loading state ────────────────────────────────────── */}
          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-full"
                    style={{
                      width: "8px",
                      height: "8px",
                      background: "#C4A96A",
                      animation: `studioPitchPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: "12px",
                  color: "rgba(255, 255, 255, 0.3)",
                }}
              >
                Olivia is rewriting in 3 tones...
              </span>
            </div>
          )}

          {/* ── Error state ──────────────────────────────────────── */}
          {error && !loading && (
            <div className="text-center py-6">
              <p style={{ fontSize: "13px", color: "#f87171" }}>{error}</p>
              <button
                onClick={onClose}
                className="mt-3 text-sm cursor-pointer"
                style={{ color: "#9AA7B2" }}
              >
                Close
              </button>
            </div>
          )}

          {/* ── Variant cards ────────────────────────────────────── */}
          {!loading && !error && variants.length > 0 && (
            <>
              <div className="flex flex-col gap-3 mb-5">
                {variants.map((variant, index) => {
                  const isSelected = selectedIndex === index;

                  return (
                    <button
                      key={variant.label}
                      onClick={() => setSelectedIndex(index)}
                      className="w-full text-left rounded-xl p-4 transition-all cursor-pointer"
                      style={{
                        background: isSelected
                          ? "rgba(196, 169, 106, 0.06)"
                          : "rgba(255, 255, 255, 0.02)",
                        border: isSelected
                          ? "1px solid rgba(196, 169, 106, 0.25)"
                          : "1px solid rgba(255, 255, 255, 0.06)",
                        boxShadow: isSelected
                          ? "0 0 12px rgba(196, 169, 106, 0.08)"
                          : "none",
                      }}
                    >
                      {/* Variant header row */}
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="rounded-full px-2 py-0.5 uppercase"
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            color: variant.color,
                            background: `${variant.color}15`,
                            border: `1px solid ${variant.color}25`,
                          }}
                        >
                          {variant.badge}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#e2e8f0",
                          }}
                        >
                          {variant.label}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "rgba(255, 255, 255, 0.3)",
                          }}
                        >
                          {variant.tone}
                        </span>

                        {/* Check icon when selected */}
                        {isSelected && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#C4A96A"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="ml-auto shrink-0"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      {/* Variant text */}
                      <p
                        style={{
                          fontSize: "13px",
                          color: isSelected ? "#e2e8f0" : "#9AA7B2",
                          lineHeight: 1.6,
                        }}
                      >
                        {variant.text}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* ── Action buttons ──────────────────────────────── */}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm transition-all cursor-pointer"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    color: "#9AA7B2",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccept}
                  disabled={selectedIndex === null}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    background:
                      selectedIndex !== null
                        ? "rgba(196, 169, 106, 0.15)"
                        : "rgba(255, 255, 255, 0.04)",
                    border:
                      selectedIndex !== null
                        ? "1px solid rgba(196, 169, 106, 0.25)"
                        : "1px solid rgba(255, 255, 255, 0.06)",
                    color:
                      selectedIndex !== null
                        ? "#C4A96A"
                        : "rgba(255, 255, 255, 0.25)",
                  }}
                >
                  Apply Rewrite
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pulse animation keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes studioPitchPulse {
              0%, 100% { opacity: 0.3; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.3); }
            }
          `,
        }}
      />
    </>
  );
}
