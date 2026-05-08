"use client";

/**
 * `commands` — the static command registry powering ⌘K.
 *
 * Three groups:
 *
 *   - **Navigate** — route changes (push to other surfaces)
 *   - **Workspace** — local state changes (tab + section switches,
 *                     theme picks, audit clear)
 *   - **Actions** — Olivia-specific (focus composer, voice mode hint)
 *
 * Commands are pure data + a fire callback. A future track can
 * promote this to a registry pattern with plugins (Composio tools,
 * agent invocations, recent docs from dashboard).
 */

import type { NavSection } from "@/lib/studio/types";
import type { ThemeKey } from "@/lib/studio/themes";

export type CommandGroup = "navigate" | "workspace" | "actions";

export interface PaletteCommand {
  id: string;
  group: CommandGroup;
  label: string;
  hint?: string;
  /** Searchable text — defaults to label; override for synonyms. */
  search?: string;
  /** Glyph (single char or short string) shown in the list. */
  glyph?: string;
  /** Fired when the command is selected. */
  run: () => void;
}

export interface CommandContext {
  router: { push: (href: string) => void };
  setActiveTab: (id: string) => void;
  setNavSection: (section: NavSection) => void;
  setTheme: (key: ThemeKey) => void;
  clearAudit: () => void;
  focusComposer: () => void;
  /** S24 — suppressed surface keys filter NAVIGATE_TARGETS so a
   *  tenant-embedded Olivia doesn't surface routes its host already
   *  owns (LTM map + calendar etc.). Default empty = standalone. */
  suppressedSurfaces?: readonly string[];
}

const NAVIGATE_TARGETS: { href: string; label: string; hint: string }[] = [
  { href: "/voice", label: "Voice mode — Olivia", hint: "Pi-orb full-screen takeover" },
  { href: "/calendar", label: "Calendar", hint: "Daily briefs + voice scheduling" },
  { href: "/map", label: "Map — London tech", hint: "28 districts, sector filtering" },
  { href: "/test-avatar", label: "Live Avatar", hint: "Lip-sync smoke test" },
  { href: "/admin", label: "Admin dashboard", hint: "250-agent registry" },
  { href: "/admin/integrations", label: "Integrations", hint: "Configure 3rd-party APIs" },
  { href: "/admin/investors", label: "Investor moderation", hint: "Track P4 surface" },
  { href: "/admin/phase1", label: "Phase-1 status", hint: "Readiness dashboard" },
  { href: "/founder-intake", label: "Founder intake — Quantara", hint: "56-field form (Q2-Q7)" },
  { href: "/analysis/valuation", label: "Valuation Workbench", hint: "10-method engine + War Room" },
  { href: "/documents", label: "Document library", hint: "Pitch decks, plans, memos" },
];

const TAB_TARGETS: { id: string; label: string; hint: string }[] = [
  { id: "olivia", label: "Open Olivia chat", hint: "Inspector → Olivia tab" },
  { id: "coach", label: "Open Pitch Coach", hint: "Inspector → Coach (Analyze · Draft · Optimize)" },
  { id: "artifacts", label: "Open Artifacts", hint: "Inspector → Artifacts tab" },
  { id: "library", label: "Open Library", hint: "Inspector → Library tab" },
  { id: "themes", label: "Open Themes", hint: "Inspector → Themes tab" },
  { id: "audit", label: "Open Audit log", hint: "Inspector → Audit tab" },
];

const SECTION_TARGETS: { id: NavSection; label: string; hint: string }[] = [
  { id: "pitch", label: "Switch to Pitch", hint: "Frameworks panel" },
  { id: "plan", label: "Switch to Plan", hint: "Business plan sections" },
  { id: "documents", label: "Switch to Documents", hint: "Document tree" },
  { id: "general", label: "Switch to General", hint: "Freeform draft" },
];

const THEME_TARGETS: { key: ThemeKey; label: string; hint: string }[] = [
  { key: "Canary-Sapphire", label: "Theme · Canary-Sapphire", hint: "Default Aurum + Aether" },
  { key: "Gherkin-Polished", label: "Theme · Gherkin-Polished", hint: "Polished glass accent" },
  { key: "Barbican-Raw", label: "Theme · Barbican-Raw", hint: "Brutalist concrete" },
  { key: "Battersea-Resilient", label: "Theme · Battersea-Resilient", hint: "Industrial heritage" },
  { key: "Shard-Ambitious", label: "Theme · Shard-Ambitious", hint: "Ambitious vertical" },
];

export function buildCommandRegistry(ctx: CommandContext): PaletteCommand[] {
  const cmds: PaletteCommand[] = [];
  const suppressed = ctx.suppressedSurfaces ?? [];
  const suppressedNorm = new Set(
    suppressed.map((s) => s.replace(/^\//, "").toLowerCase()),
  );

  /* Olivia-first action — top of list when query is empty. */
  cmds.push({
    id: "action.focus-composer",
    group: "actions",
    label: "Ask Olivia anything",
    hint: "Focus the home composer",
    glyph: "◉",
    run: ctx.focusComposer,
    search: "ask olivia chat composer talk message",
  });

  for (const t of NAVIGATE_TARGETS) {
    if (suppressedNorm.has(t.href.replace(/^\//, "").toLowerCase())) continue;
    cmds.push({
      id: `nav.${t.href}`,
      group: "navigate",
      label: t.label,
      hint: t.hint,
      glyph: "→",
      run: () => ctx.router.push(t.href),
    });
  }

  for (const t of TAB_TARGETS) {
    cmds.push({
      id: `tab.${t.id}`,
      group: "workspace",
      label: t.label,
      hint: t.hint,
      glyph: "▤",
      run: () => ctx.setActiveTab(t.id),
    });
  }

  for (const t of SECTION_TARGETS) {
    cmds.push({
      id: `section.${t.id}`,
      group: "workspace",
      label: t.label,
      hint: t.hint,
      glyph: "▦",
      run: () => ctx.setNavSection(t.id),
    });
  }

  for (const t of THEME_TARGETS) {
    cmds.push({
      id: `theme.${t.key}`,
      group: "workspace",
      label: t.label,
      hint: t.hint,
      glyph: "◐",
      run: () => ctx.setTheme(t.key),
    });
  }

  cmds.push({
    id: "action.clear-audit",
    group: "actions",
    label: "Clear audit log",
    hint: "Reset the workspace audit history",
    glyph: "◇",
    run: ctx.clearAudit,
  });

  return cmds;
}

const GROUP_LABEL: Record<CommandGroup, string> = {
  navigate: "Navigate",
  workspace: "Workspace",
  actions: "Actions",
};

const GROUP_ORDER: CommandGroup[] = ["actions", "navigate", "workspace"];

export function groupCommands(
  cmds: readonly { item: PaletteCommand; score: number }[],
): { label: string; items: PaletteCommand[] }[] {
  const buckets = new Map<CommandGroup, PaletteCommand[]>();
  for (const { item } of cmds) {
    const arr = buckets.get(item.group) ?? [];
    arr.push(item);
    buckets.set(item.group, arr);
  }
  return GROUP_ORDER.flatMap((g) => {
    const items = buckets.get(g);
    if (!items || items.length === 0) return [];
    return [{ label: GROUP_LABEL[g], items }];
  });
}
