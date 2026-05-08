"use client";

/**
 * `CommandPalette` — Linear / Raycast-style ⌘K overlay.
 *
 * Glass backdrop, fzf-style fuzzy match, keyboard-first navigation
 * (↑/↓ arrows, ⏎ to invoke, Esc to close). Mounts a focus trap on
 * the search input on open and restores focus to the previously
 * focused element on close.
 *
 * Per the design system § 9 (a11y floor): proper roles
 * (`role="dialog"` / `aria-modal="true"` / `aria-labelledby`),
 * `:focus-visible` rings inherited from base.css, reduced-motion
 * respected.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { searchAndScore } from "./fuzzy";
import { groupCommands, type PaletteCommand } from "./commands";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: readonly PaletteCommand[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  /* Reset on open + restore focus on close. */
  useEffect(() => {
    if (open) {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActiveIdx(0);
      /* Defer focus into the next tick so the overlay can mount. */
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      lastFocusedRef.current?.focus?.();
    }
  }, [open]);

  /* Esc closes from anywhere in the dialog. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const scored = useMemo(
    () =>
      searchAndScore(
        query.trim(),
        commands as PaletteCommand[],
        (c) => `${c.label} ${c.search ?? ""} ${c.hint ?? ""}`,
        80,
      ),
    [query, commands],
  );

  const flat = useMemo(() => scored.map((s) => s.item), [scored]);
  const grouped = useMemo(() => groupCommands(scored), [scored]);

  /* Keep activeIdx in range when results change. */
  useEffect(() => {
    if (activeIdx >= flat.length) setActiveIdx(0);
  }, [flat.length, activeIdx]);

  const fire = useCallback(
    (cmd: PaletteCommand) => {
      onClose();
      /* Defer the side effect so onClose can complete focus restoration
       * before the command (e.g. router.push) tears the page. */
      requestAnimationFrame(() => cmd.run());
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(flat.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = flat[activeIdx];
        if (cmd) fire(cmd);
      }
    },
    [flat, activeIdx, fire],
  );

  if (!open) return null;

  /* Compute flat index of each item for the activeIdx mapping. */
  let flatIdx = -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(2, 6, 17, 0.62)",
        backdropFilter: "blur(8px) saturate(1.1)",
        display: "grid",
        placeItems: "start center",
        paddingTop: "12vh",
        animation: "olivia-cmd-fade-in var(--duration-default) var(--ease-out-quart)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, calc(100vw - 32px))",
          maxHeight: "76vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--canvas-recess)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.05), 0 60px 120px rgba(0, 0, 0, 0.55)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--aurum-primary)",
            }}
          >
            ⌘K
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search · navigate · invoke…"
            aria-label="Command palette search"
            id={titleId}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--fg-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-md)",
            }}
          />
          <kbd
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: "var(--fg-tertiary)",
              padding: "2px 6px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              background: "var(--surface-1)",
            }}
          >
            Esc
          </kbd>
        </div>

        <div
          role="listbox"
          aria-label="Commands"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 8,
          }}
        >
          {flat.length === 0 && (
            <p
              style={{
                margin: 0,
                padding: "20px 16px",
                textAlign: "center",
                color: "var(--fg-tertiary)",
                fontSize: "var(--text-sm)",
                fontStyle: "italic",
              }}
            >
              No commands match "{query}".
            </p>
          )}

          {grouped.map((group) => (
            <div key={group.label} style={{ display: "grid", gap: 2 }}>
              <span
                style={{
                  padding: "10px 12px 6px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--aurum-primary)",
                }}
              >
                {group.label}
              </span>
              {group.items.map((cmd) => {
                flatIdx++;
                const isActive = flatIdx === activeIdx;
                const myIdx = flatIdx;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => fire(cmd)}
                    onMouseEnter={() => setActiveIdx(myIdx)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      background: isActive ? "var(--surface-1)" : "transparent",
                      border: `1px solid ${isActive ? "var(--border-aurum)" : "transparent"}`,
                      color: "var(--fg-primary)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-sm)",
                      textAlign: "left",
                      cursor: "pointer",
                      transition:
                        "background var(--duration-micro) var(--ease-out-quart), border-color var(--duration-micro) var(--ease-out-quart)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 24,
                        height: 24,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "var(--radius-sm)",
                        background: isActive ? "var(--aurum-mute)" : "var(--surface-1)",
                        color: isActive ? "var(--aurum-primary)" : "var(--fg-tertiary)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {cmd.glyph ?? "·"}
                    </span>
                    <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                      <span
                        style={{
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cmd.label}
                      </span>
                      {cmd.hint && (
                        <span
                          style={{
                            fontSize: "var(--text-2xs)",
                            color: "var(--fg-tertiary)",
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.04em",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cmd.hint}
                        </span>
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{
                        color: "var(--fg-tertiary)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-2xs)",
                        opacity: isActive ? 1 : 0,
                        transition: "opacity var(--duration-micro) var(--ease-out-quart)",
                      }}
                    >
                      ⏎
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <footer
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--border-subtle)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--fg-tertiary)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>↑ ↓ to navigate</span>
          <span>⏎ to select</span>
          <span>Esc to close</span>
        </footer>
      </div>

      <style>{`
        @keyframes olivia-cmd-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
