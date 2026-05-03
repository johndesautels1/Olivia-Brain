"use client";

/**
 * `ConsensusDots` — N-of-5 dot strip.
 *
 * Reference: `docs/01_UI_DESIGN_SYSTEM.md` § 8 + `STUDIO_OLIVIA_DESIGN.md`
 * § 2.1, § 8 (#13 Notable Design Choices: "encodes how many independent
 * sources agree on the playbook — reinforces the 'evidence-driven'
 * narrative").
 *
 * Five 6-px dots fill in `--aurum-primary` up to `n`. Empty dots use
 * `--border-strong`. Renders as a single `role="img"` group with an
 * accessible label ("3 of 5 sources agree") so screen readers don't
 * have to count individual dots.
 */

export interface ConsensusDotsProps {
  /** Number of filled dots (0-5). Out-of-range values clamp. */
  n: number;
  /** Total dots. Default 5 per the design contract. */
  total?: number;
  /** Per-dot diameter in pixels. Default 6. */
  dotSize?: number;
  /** Inter-dot gap in pixels. Default 4. */
  gap?: number;
  /** Optional label override. */
  label?: string;
  /** Additional CSS class. */
  className?: string;
}

export function ConsensusDots({
  n,
  total = 5,
  dotSize = 6,
  gap = 4,
  label,
  className,
}: ConsensusDotsProps) {
  const clamped = Math.max(0, Math.min(total, Math.floor(n)));
  const accessibleLabel = label ?? `${clamped} of ${total} sources agree`;

  return (
    <span
      className={className}
      role="img"
      aria-label={accessibleLabel}
      data-consensus={`${clamped}/${total}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap,
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "var(--radius-full)",
            background: i < clamped ? "var(--aurum-primary)" : "var(--border-strong)",
            transition:
              "background var(--duration-default) var(--ease-out-quart)",
          }}
        />
      ))}
    </span>
  );
}
