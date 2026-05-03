"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ── Status colors — WCAG AAA 7:1 compliant against #0a0e1a ──
// All borders/backgrounds fully opaque for visibility on small circles
const STATUS_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  pending:     { bg: "#1e293b",  border: "#94a3b8",  glow: "none" },
  attended:    { bg: "#064e3b",  border: "#34d399",  glow: "0 0 8px rgba(52,211,153,0.5)" },
  rescheduled: { bg: "#713f12",  border: "#fbbf24",  glow: "0 0 8px rgba(251,191,36,0.5)" },
  missed:      { bg: "#7f1d1d",  border: "#f87171",  glow: "0 0 8px rgba(248,113,113,0.5)" },
  cancelled:   { bg: "#7f1d1d",  border: "#f87171",  glow: "0 0 8px rgba(248,113,113,0.5)" },
};

// ── SVG icon paths per status ──
function StatusIcon({ status, size = 8 }: { status: string; size?: number }) {
  const color =
    status === "attended" ? "#6ee7b7" :
    status === "rescheduled" ? "#fde047" :
    status === "missed" || status === "cancelled" ? "#fca5a5" :
    "#cbd5e1";

  if (status === "attended") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (status === "rescheduled") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    );
  }
  if (status === "missed" || status === "cancelled") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    );
  }
  // pending — small circle
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// EventStatusWidget — micro-widget + status modal
// ═══════════════════════════════════════════════

interface EventStatusWidgetProps {
  entryId: string;
  currentStatus: string;
  onStatusChange: (entryId: string, status: string, note?: string) => Promise<void>;
  onReschedule: (entryId: string) => void;
  size?: "sm" | "md";
}

export function EventStatusWidget({
  entryId,
  currentStatus,
  onStatusChange,
  onReschedule,
  size = "md",
}: EventStatusWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subMode, setSubMode] = useState<"missed" | "cancelled" | null>(null);
  const [reason, setReason] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  const px = size === "sm" ? 12 : 16;
  const iconSize = size === "sm" ? 7 : 9;
  const colors = STATUS_COLORS[currentStatus] || STATUS_COLORS.pending;

  // Track client mount for portal
  useEffect(() => { setMounted(true); }, []);

  // Close on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        setSubMode(null);
        setReason("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalOpen]);

  // Close on click outside
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setModalOpen(false);
        setSubMode(null);
        setReason("");
      }
    };
    // Delay to avoid catching the opening click
    const timer = setTimeout(() => window.addEventListener("mousedown", handler), 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handler);
    };
  }, [modalOpen]);

  const handleWidgetClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setModalOpen(true);
  }, []);

  const handleAttended = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    await onStatusChange(entryId, "attended");
    setSaving(false);
    setModalOpen(false);
  }, [entryId, onStatusChange]);

  const handleRescheduled = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    await onStatusChange(entryId, "rescheduled");
    setSaving(false);
    setModalOpen(false);
    onReschedule(entryId);
  }, [entryId, onStatusChange, onReschedule]);

  const handleMissedCancelled = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!subMode) return;
    setSaving(true);
    await onStatusChange(entryId, subMode, reason.trim() || undefined);
    setSaving(false);
    setModalOpen(false);
    setSubMode(null);
    setReason("");
  }, [entryId, subMode, reason, onStatusChange]);

  // Shared button style for all 3 option cards — consistent sizing
  const optionBtnStyle = (isActive: boolean, activeColor: string) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 10,
    padding: "12px 14px",
    borderRadius: 10,
    border: isActive
      ? `1px solid ${activeColor}`
      : "1px solid rgba(255,255,255,0.08)",
    background: isActive
      ? activeColor.replace(/[\d.]+\)$/, "0.12)")
      : "rgba(255,255,255,0.03)",
    cursor: "pointer" as const,
    transition: "background 0.15s ease, border-color 0.15s ease",
    boxShadow: isActive
      ? `0 0 12px ${activeColor.replace(/[\d.]+\)$/, "0.15)")}, inset 0 1px 0 ${activeColor.replace(/[\d.]+\)$/, "0.1)")}`
      : "inset 0 1px 0 rgba(255,255,255,0.04)",
    width: "100%" as const,
  });

  const iconCircleStyle = (isActive: boolean, activeColor: string) => ({
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: isActive ? activeColor.replace(/[\d.]+\)$/, "0.2)") : "rgba(255,255,255,0.06)",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  });

  const labelStyle = (isActive: boolean, activeTextColor: string) => ({
    fontSize: "0.82rem",
    fontWeight: 600,
    color: isActive ? activeTextColor : "rgba(255,255,255,0.75)",
  });

  // Render the modal via portal to document.body so it escapes all stacking contexts
  const modalContent = modalOpen && mounted ? createPortal(
    <div
      onClick={(e) => { e.stopPropagation(); setModalOpen(false); setSubMode(null); setReason(""); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 340,
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 16,
          border: "1px solid rgba(196,169,106,0.22)",
          background: "linear-gradient(180deg, #111627 0%, #0a0e1a 100%)",
          boxShadow: [
            "0 2px 4px rgba(196,169,106,0.08)",
            "0 12px 36px rgba(0,0,0,0.6)",
            "0 24px 60px rgba(0,0,0,0.45)",
            "inset 0 1px 0 rgba(196,169,106,0.12)",
            "inset 0 -1px 0 rgba(0,0,0,0.3)",
          ].join(", "),
          padding: "22px 24px",
          display: "flex",
          flexDirection: "column" as const,
          gap: 12,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "0.02em",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}>
            Event Status
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setModalOpen(false); setSubMode(null); setReason(""); }}
            style={{
              width: 24,
              height: 24,
              borderRadius: 5,
              background: "#dc2626",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              lineHeight: 1,
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Attended button ── */}
        <button
          onClick={handleAttended}
          disabled={saving}
          style={optionBtnStyle(
            currentStatus === "attended",
            "rgba(16,185,129,0.5)"
          )}
        >
          <div style={iconCircleStyle(currentStatus === "attended", "rgba(16,185,129,0.5)")}>
            <StatusIcon status="attended" size={15} />
          </div>
          <span style={labelStyle(currentStatus === "attended", "#34d399")}>
            Attended
          </span>
        </button>

        {/* ── Rescheduled button ── */}
        <button
          onClick={handleRescheduled}
          disabled={saving}
          style={optionBtnStyle(
            currentStatus === "rescheduled",
            "rgba(234,179,8,0.5)"
          )}
        >
          <div style={iconCircleStyle(currentStatus === "rescheduled", "rgba(234,179,8,0.5)")}>
            <StatusIcon status="rescheduled" size={15} />
          </div>
          <span style={labelStyle(currentStatus === "rescheduled", "#fbbf24")}>
            Rescheduled
          </span>
        </button>

        {/* ── Missed / Cancelled button ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setSubMode(subMode ? null : "missed"); }}
            disabled={saving}
            style={optionBtnStyle(
              currentStatus === "missed" || currentStatus === "cancelled",
              "rgba(239,68,68,0.5)"
            )}
          >
            <div style={iconCircleStyle(
              currentStatus === "missed" || currentStatus === "cancelled",
              "rgba(239,68,68,0.5)"
            )}>
              <StatusIcon status="missed" size={15} />
            </div>
            <span style={labelStyle(
              currentStatus === "missed" || currentStatus === "cancelled",
              "#f87171"
            )}>
              Missed / Cancelled
            </span>
          </button>

          {/* ── Sub-modal: select missed vs cancelled + reason ── */}
          {subMode !== null && (
            <div style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.15)",
              background: "rgba(239,68,68,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              {/* Toggle pills */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setSubMode("missed"); }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 6,
                    border: subMode === "missed"
                      ? "1px solid rgba(239,68,68,0.5)"
                      : "1px solid rgba(255,255,255,0.1)",
                    background: subMode === "missed"
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(255,255,255,0.03)",
                    color: subMode === "missed" ? "#f87171" : "#94a3b8",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "background 0.15s ease, border-color 0.15s ease",
                  }}
                >
                  Missed
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSubMode("cancelled"); }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 6,
                    border: subMode === "cancelled"
                      ? "1px solid rgba(239,68,68,0.5)"
                      : "1px solid rgba(255,255,255,0.1)",
                    background: subMode === "cancelled"
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(255,255,255,0.03)",
                    color: subMode === "cancelled" ? "#f87171" : "#94a3b8",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "background 0.15s ease, border-color 0.15s ease",
                  }}
                >
                  Cancelled
                </button>
              </div>

              {/* Reason input */}
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === "Enter" && subMode) { handleMissedCancelled(e as unknown as React.MouseEvent); } }}
                placeholder="Reason (optional)"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  outline: "none",
                }}
              />

              {/* Save */}
              <button
                onClick={handleMissedCancelled}
                disabled={saving}
                style={{
                  padding: "8px 0",
                  borderRadius: 6,
                  border: "none",
                  background: "rgba(239,68,68,0.6)",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? "Saving..." : `Save as ${subMode === "missed" ? "Missed" : "Cancelled"}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* ── Micro-widget pill ── */}
      <button
        ref={widgetRef}
        onClick={handleWidgetClick}
        title={currentStatus === "pending" ? "Set status" : `Status: ${currentStatus}`}
        style={{
          width: px,
          height: px,
          borderRadius: "50%",
          border: `2px solid ${colors.border}`,
          background: colors.bg,
          boxShadow: colors.glow,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
          transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <StatusIcon status={currentStatus} size={iconSize} />
      </button>

      {/* Portal modal to document.body — escapes FullCalendar stacking contexts */}
      {modalContent}
    </>
  );
}
