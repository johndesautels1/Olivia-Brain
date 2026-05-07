/**
 * Workspace persistence — `localStorage` save/load for Studio Olivia
 * top-level state.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 5 (Persistence) — the
 * prototype debounces 1.5s and uses `window.storage` (Anthropic artifact
 * runtime affordance, not real). The OB rebuild maps to `localStorage`
 * for now; Supabase-backed per-user persistence lands when Clerk wires
 * up (Track F Session 23).
 *
 * # Forward-compat
 *
 * Snapshot version is bumped when the schema changes; old snapshots
 * are discarded silently rather than crashing the page. New fields
 * default to safe values via the `WorkspaceSnapshot` defaults.
 */

import { DEFAULT_THEME, type ThemeKey } from "./themes";
import type { ActiveDoc, NavSection, Slide } from "./types";
import type { AuditEntry } from "./audit";

export const SNAPSHOT_VERSION = 1;
export const STORAGE_KEY = "studio-olivia-v1";

export interface WorkspaceSnapshot {
  version: number;
  navSection: NavSection;
  slides: Slide[];
  activePlanIdx: number;
  activeFrameworks: number[];
  activeDoc: ActiveDoc | null;
  expandedCats: string[];
  activeTheme: ThemeKey;
  auditLog: AuditEntry[];
}

export function emptySnapshot(): WorkspaceSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    navSection: "pitch",
    slides: [],
    activePlanIdx: 0,
    activeFrameworks: [],
    activeDoc: null,
    expandedCats: [],
    activeTheme: DEFAULT_THEME,
    auditLog: [],
  };
}

/**
 * Load a snapshot from localStorage. Returns `null` if missing,
 * malformed, or version-mismatched (silently — caller seeds defaults).
 */
export function loadSnapshot(): WorkspaceSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    if (parsed.version !== SNAPSHOT_VERSION) return null;
    return { ...emptySnapshot(), ...parsed } as WorkspaceSnapshot;
  } catch {
    return null;
  }
}

/** Save a snapshot. Failure is silent — never break the UI for storage. */
export function saveSnapshot(snapshot: WorkspaceSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* Quota / privacy mode — degrade silently. */
  }
}

/** Clear the snapshot — used by workspace reset. */
export function clearSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
