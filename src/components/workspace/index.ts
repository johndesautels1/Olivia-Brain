/**
 * Workspace barrel — top-level shell primitives.
 *
 * Reference: `docs/01_UI_DESIGN_SYSTEM.md` § 5.
 *
 * Session 14 ships the four-region shell.  Sessions 15–19 fill in the
 * widget grid (`react-grid-layout` + `dnd-kit`), per-product default
 * layouts (`src/lib/workspace/layouts.ts`), and server-persisted
 * layout state (`src/lib/workspace/persistence.ts`).
 */

export { WorkspaceShell } from "./WorkspaceShell";
export type { WorkspaceShellProps } from "./WorkspaceShell";

export { Header } from "./Header";
export type { HeaderProps, HeaderScoreChip } from "./Header";

export { RailLeft } from "./RailLeft";
export type { RailLeftProps } from "./RailLeft";

export { Center } from "./Center";
export type { CenterProps } from "./Center";

export { Inspector } from "./Inspector";
export type { InspectorProps, InspectorTab } from "./Inspector";
