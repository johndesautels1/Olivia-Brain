"use client";

/**
 * `CommandPaletteButton` — Linear-style ⌘K entry point in the header.
 *
 * U3 ships the button shell (visible, keyboard hint, opens nothing yet).
 * U6 lands the full palette: actions, navigation, recent docs, agent
 * invocations, fzf-style fuzzy match, glass backdrop overlay.
 */

export interface CommandPaletteButtonProps {
  onOpen?: () => void;
}

export function CommandPaletteButton({ onOpen }: CommandPaletteButtonProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open command palette"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        background: "var(--canvas-recess)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        color: "var(--fg-tertiary)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition:
          "border-color var(--duration-micro) var(--ease-out-quart), color var(--duration-micro) var(--ease-out-quart)",
      }}
    >
      <span aria-hidden="true">Search · ⌘K</span>
    </button>
  );
}
