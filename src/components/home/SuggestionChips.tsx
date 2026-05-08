"use client";

/**
 * `SuggestionChips` — small row of try-this prompts above the home
 * composer. Showcases Olivia's capabilities (chart manifestation,
 * cross-domain reasoning, agent invocation) on a fresh page load
 * before the user types anything.
 *
 * Click → fills the composer textarea + focuses it. Auto-hides as
 * soon as the user has interacted with the composer (any text
 * present, or any past Olivia reply on the surface).
 */

const SUGGESTIONS: { prompt: string; label: string; hint: string }[] = [
  {
    prompt:
      "Show me a chart of typical Series A round sizes by sector in London 2026.",
    label: "London Series A by sector",
    hint: "Returns a bar chart inline",
  },
  {
    prompt: "Compare Florida buyer-broker market versus London PropTech in 2026.",
    label: "FL buyers vs LDN proptech",
    hint: "Cross-spoke comparison",
  },
  {
    prompt:
      "Draft a 3-bullet investor narrative for an AI/SaaS Series A founder.",
    label: "Series A narrative",
    hint: "Pitch coach in chat",
  },
  {
    prompt: "What are the 3 biggest dealbreakers in Y Combinator term sheets?",
    label: "YC term-sheet risks",
    hint: "Triggers Deal Protection",
  },
];

export interface SuggestionChipsProps {
  onPick: (prompt: string) => void;
  hidden?: boolean;
}

export function SuggestionChips({ onPick, hidden }: SuggestionChipsProps) {
  if (hidden) return null;

  return (
    <section
      aria-label="Try asking Olivia"
      style={{
        marginInline: "auto",
        width: "100%",
        maxWidth: 760,
        display: "grid",
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--fg-tertiary)",
        }}
      >
        Try asking
      </span>
      <div
        role="list"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 8,
        }}
      >
        {SUGGESTIONS.map((s) => (
          <button
            type="button"
            role="listitem"
            key={s.label}
            onClick={() => onPick(s.prompt)}
            style={{
              display: "grid",
              gap: 4,
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              background: "var(--canvas-recess)",
              border: "1px solid var(--border-subtle)",
              color: "var(--fg-primary)",
              textAlign: "left",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              transition:
                "border-color var(--duration-micro) var(--ease-out-quart), background var(--duration-micro) var(--ease-out-quart)",
            }}
          >
            <span style={{ fontWeight: 500, lineHeight: 1.3 }}>{s.label}</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                letterSpacing: "0.06em",
                color: "var(--fg-tertiary)",
              }}
            >
              {s.hint}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
