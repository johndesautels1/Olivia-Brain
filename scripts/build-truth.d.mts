/**
 * Type declarations for `build-truth.mjs` so the drift-guard test and `tsc`
 * see a real contract (no implicit-any, no `@ts-ignore`). Kept in lockstep with
 * the object the script actually emits.
 */

export type TrackStatus = "shipped" | "in_progress" | "not_started";

export interface TrackRow {
  id: string;
  name: string;
  sessions: string;
  status: TrackStatus;
  /** Live count of source files matching the track's evidence globs. */
  evidenceFiles: number;
}

export interface SpokeRow {
  key: string;
  name: string;
  /** True when a UniversalKnowledgeProvider exists for this spoke. */
  docked: boolean;
}

export interface ComputedFacts {
  apiRoutes: number;
  libModules: number;
  components: number;
  testFiles: number;
  prismaModels: number;
  bridgeProviders: number;
  adapters: number;
  tracks: { total: number; shipped: number; inProgress: number; notStarted: number };
  spokes: { total: number; docked: number };
}

export interface BuildTruth {
  $schema: string;
  note: string;
  /** Pure file-system facts — equality-enforced by the drift guard. */
  computed: ComputedFacts;
  /** Human judgment + live evidence counts — not equality-enforced. */
  curated: { tracks: TrackRow[]; spokes: SpokeRow[] };
}

/** Recompute the build truth from the current working tree. */
export function computeTruth(): BuildTruth;

/** The exact bytes the generator writes to docs/BUILD_TRUTH.json. */
export const RENDERED_JSON: string;

/** The exact bytes the generator writes to docs/BUILD_TRUTH.md. */
export const RENDERED_MARKDOWN: string;
