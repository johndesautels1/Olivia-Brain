"use client";

/**
 * `ThemesTab` — Inspector "Themes" tab body.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 2.5 (Themes tab) + § 3
 * (THEMES static reference table — 5 entries).
 *
 * Renders 5 theme cards (Canary-Sapphire / Gherkin-Polished / Barbican-
 * Raw / Battersea-Resilient / Shard-Ambitious). Each: 36-px gradient
 * swatch + icon + name + description. Click → `onSelect(themeKey)`.
 *
 * S18 surfaces the picker UI; theme APPLICATION (re-skinning the shell
 * via CSS variable swap) lands in S19 polish.
 */

import { THEMES, THEME_KEYS, type ThemeKey } from "@/lib/studio/themes";

export interface ThemesTabProps {
  active: ThemeKey;
  onSelect: (key: ThemeKey) => void;
}

export function ThemesTab({ active, onSelect }: ThemesTabProps) {
  return (
    <div role="radiogroup" aria-label="Output theme" style={{ display: "grid", gap: 8 }}>
      {THEME_KEYS.map((key) => {
        const t = THEMES[key];
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onSelect(key)}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              alignItems: "center",
              gap: 12,
              padding: 12,
              background: isActive ? "var(--aurum-mute)" : "var(--surface-1)",
              border: `1px solid ${isActive ? "var(--border-aurum)" : "var(--border-subtle)"}`,
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              textAlign: "left",
              transition:
                "background var(--duration-micro) var(--ease-out-quart), border-color var(--duration-micro) var(--ease-out-quart)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-md)",
                background: `linear-gradient(135deg, ${t.accent}, ${t.surface})`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                color: "var(--fg-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {t.icon}
            </span>
            <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: isActive ? "var(--aurum-primary)" : "var(--fg-primary)",
                }}
              >
                {t.key}
              </span>
              <span
                style={{
                  fontSize: "var(--text-2xs)",
                  color: "var(--fg-tertiary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.desc}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
