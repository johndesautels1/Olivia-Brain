"use client";

/**
 * `AuditTab` — Inspector "Audit" tab body.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 2.5 (Audit tab) + § 8 #9
 * ("Audit trail as a first-class citizen").
 *
 * Renders the workspace audit log — a list of `{time, text}` entries
 * pushed by every state-changing handler in `page.tsx`. Newest-first.
 * Capped at `AUDIT_LOG_CAP` (50) entries via `pushAuditEntry`.
 *
 * Includes a "Reset workspace" affordance (per design § 2.5 — confirms
 * before clearing). For S18 it just clears the audit log; full
 * workspace reset (slides, plan, docs, theme) lands in S19 alongside
 * the autosave/persistence layer.
 */

import type { AuditEntry } from "@/lib/studio/audit";

export interface AuditTabProps {
  log: readonly AuditEntry[];
  onClear?: () => void;
}

export function AuditTab({ log, onClear }: AuditTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {onClear && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Clear the audit log? This does not reset the workspace.")) {
              onClear();
            }
          }}
          style={{
            padding: "8px 12px",
            background: "var(--coral-down-mute)",
            color: "var(--coral-down)",
            border: "1px solid rgba(242, 141, 127, 0.24)",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          Clear audit log
        </button>
      )}

      {log.length === 0 ? (
        <p
          style={{
            margin: 0,
            padding: 16,
            textAlign: "center",
            color: "var(--fg-tertiary)",
            fontSize: "var(--text-sm)",
            fontStyle: "italic",
            border: "1px dashed var(--border-default)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Audit log is empty. Every state change records here.
        </p>
      ) : (
        <ul
          aria-label="Audit log"
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 4,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {log.map((entry, i) => (
            <li
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: 10,
                padding: "6px 10px",
                background: i === 0 ? "var(--aether-mute)" : "var(--surface-1)",
                border: `1px solid ${i === 0 ? "var(--border-aether)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-2xs)",
                lineHeight: 1.4,
              }}
            >
              <span
                className="tabular-nums"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontFeatureSettings: '"tnum" 1, "lnum" 1',
                  color: i === 0 ? "var(--aether-primary)" : "var(--fg-tertiary)",
                  fontWeight: 600,
                }}
              >
                {entry.time}
              </span>
              <span style={{ color: "var(--fg-primary)" }}>{entry.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
