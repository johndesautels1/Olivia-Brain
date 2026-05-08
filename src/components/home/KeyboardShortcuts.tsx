"use client";

/**
 * `KeyboardShortcuts` — `?` key toggles a glass overlay listing every
 * keybind the workspace ships. Linear-quality polish.
 *
 * Closes on `?` again, on `Escape`, or on backdrop click. Skips the
 * trigger when the user is typing in an input/textarea/contenteditable
 * so `?` in a prompt doesn't pop the overlay mid-sentence.
 */

import { useCallback, useEffect, useState } from "react";

interface ShortcutGroup {
  label: string;
  rows: { keys: string; description: string }[];
}

const GROUPS: ShortcutGroup[] = [
  {
    label: "Global",
    rows: [
      { keys: "⌘K", description: "Open command palette" },
      { keys: "?", description: "Show this help" },
      { keys: "Esc", description: "Close any overlay / return home" },
    ],
  },
  {
    label: "Workspace",
    rows: [
      { keys: "J / K", description: "Next / previous slide or plan section" },
      { keys: "⏎", description: "Send composer message" },
      { keys: "⇧⏎", description: "Newline in composer" },
    ],
  },
  {
    label: "Voice mode (/voice)",
    rows: [
      { keys: "Space", description: "Toggle listening (start / stop)" },
      { keys: "Esc", description: "Return to home" },
    ],
  },
];

export interface KeyboardShortcutsProps {
  /** Override the default `?` trigger key. */
  triggerKey?: string;
}

export function KeyboardShortcuts({ triggerKey = "?" }: KeyboardShortcutsProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true");

      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === triggerKey && !inField) {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [triggerKey, open, close, toggle]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        background: "rgba(2, 6, 17, 0.62)",
        backdropFilter: "blur(8px) saturate(1.1)",
        display: "grid",
        placeItems: "center",
        animation: "olivia-kbd-fade-in var(--duration-default) var(--ease-out-quart)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, calc(100vw - 32px))",
          padding: 24,
          borderRadius: "var(--radius-xl)",
          background: "var(--canvas-recess)",
          border: "1px solid var(--border-default)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.05), 0 60px 120px rgba(0, 0, 0, 0.55)",
          display: "grid",
          gap: 18,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              color: "var(--fg-primary)",
              fontWeight: 500,
            }}
          >
            Keyboard shortcuts
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close shortcuts"
            style={{
              padding: "4px 10px",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              color: "var(--fg-tertiary)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Esc
          </button>
        </header>

        <div style={{ display: "grid", gap: 16 }}>
          {GROUPS.map((g) => (
            <section key={g.label} style={{ display: "grid", gap: 8 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--aurum-primary)",
                }}
              >
                {g.label}
              </span>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "grid",
                  gap: 4,
                }}
              >
                {g.rows.map((r) => (
                  <li
                    key={r.keys}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "100px 1fr",
                      gap: 16,
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <kbd
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "4px 8px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-default)",
                        background: "var(--surface-1)",
                        color: "var(--aurum-primary)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-xs)",
                        fontWeight: 600,
                      }}
                    >
                      {r.keys}
                    </kbd>
                    <span
                      style={{
                        color: "var(--fg-secondary)",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      {r.description}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes olivia-kbd-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
