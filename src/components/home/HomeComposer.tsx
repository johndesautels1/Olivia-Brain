"use client";

/**
 * `HomeComposer` — Cursor-style composer with `@context` chips.
 *
 * U1 stub: visible, non-functional. U2 wires it to `/api/olivia/chat`
 * (cascade route) with chip-driven context injection (`@calendar`,
 * `@subject`, `@doc`, `+ctx`).
 */

export function HomeComposer() {
  return (
    <form
      role="search"
      aria-label="Ask Olivia"
      onSubmit={(e) => e.preventDefault()}
      style={{
        marginInline: "auto",
        width: "100%",
        maxWidth: 760,
        display: "grid",
        gap: 10,
        padding: 18,
        borderRadius: "var(--radius-xl)",
        background: "var(--surface-1)",
        border: "1px solid var(--border-default)",
        boxShadow: "0 30px 80px rgba(0, 0, 0, 0.32)",
      }}
    >
      <input
        type="text"
        placeholder="Ask Olivia anything…"
        aria-label="Ask Olivia"
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--fg-primary)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-md)",
          padding: 4,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["@calendar", "@subject", "@doc", "+ctx"].map((chip) => (
            <span
              key={chip}
              style={{
                padding: "4px 10px",
                borderRadius: "var(--radius-full)",
                background: "var(--canvas-recess)",
                border: "1px solid var(--border-subtle)",
                color: "var(--fg-tertiary)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {chip}
            </span>
          ))}
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--fg-tertiary)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          ⏎ to send · ⌘⏎ for council
        </span>
      </div>
    </form>
  );
}
