/**
 * Track P Session P5 — Multi-round dilution projection type contracts.
 *
 * Forward-simulates how a founder's ownership trajectory evolves over
 * future rounds (typically 2 rounds out per the BUILD_SEQUENCE exit
 * criterion). Models the full mechanics:
 *
 *   - **ESOP top-up** (pre-money): expands the option pool out of the
 *     pre-money valuation, diluting existing holders proportionally.
 *   - **New investor** (at the computed new price-per-share): cash
 *     buys a `newInvestorPct` fraction of the post-money cap table.
 *   - **Anti-dilution** (down rounds only): prior preferred holders
 *     with `full_ratchet` / `weighted_average_broad` /
 *     `weighted_average_narrow` protection get bonus shares that
 *     restore some of their pre-round economics.
 *
 * Works in shares (not just percentages) so the anti-dilution math is
 * correct — full-ratchet adjusts conversion price by `oldPPS/newPPS`,
 * weighted-average uses `(A + C) / (A + B)` where the share counts
 * matter for the broad/narrow distinction.
 */
import { z } from 'zod';

/** Anti-dilution mechanism on a preferred class. */
export type AntiDilutionType =
  | 'none'
  | 'full_ratchet'
  | 'weighted_average_broad'
  | 'weighted_average_narrow';

export const ANTI_DILUTION_TYPES_ORDERED: ReadonlyArray<AntiDilutionType> = Object.freeze([
  'none',
  'full_ratchet',
  'weighted_average_broad',
  'weighted_average_narrow',
]);

/** Holder category — drives default colours in UI + filtering. */
export type HolderType = 'founder' | 'investor' | 'esop' | 'other';

export const HOLDER_TYPES_ORDERED: ReadonlyArray<HolderType> = Object.freeze([
  'founder',
  'investor',
  'esop',
  'other',
]);

/** A single line on the cap table. */
export interface CapTableEntry {
  /** Stable id for trajectory tracking across snapshots. */
  readonly holderId: string;
  /** Display name for the UI. */
  readonly holderName: string;
  readonly holderType: HolderType;
  /** Fully-diluted share count. Strictly positive. */
  readonly shares: number;
  /** Preferred class label ('series_a' / 'series_b' / …) when applicable. */
  readonly preferredClass?: string;
  /** Anti-dilution protection on this preferred class. Default 'none'. */
  readonly antiDilutionType?: AntiDilutionType;
  /** Original price-per-share at the round this preferred was issued. GBP. */
  readonly originalPricePerShare?: number;
}

/** A snapshot of the cap table at one point in the trajectory. */
export interface CapTableSnapshot {
  /** Stable name — `current` for the initial snapshot, `after_<roundName>` for projected ones. */
  readonly snapshotName: string;
  readonly entries: ReadonlyArray<CapTableEntry>;
  readonly totalShares: number;
  /** Price-per-share at this snapshot (post-money / fully-diluted shares). */
  readonly pricePerShare: number;
  readonly postMoneyGbp: number;
}

/** A hypothetical future round to simulate. */
export interface FutureRound {
  readonly roundName: string;
  readonly postMoneyGbp: number;
  /** Fraction of post-money the new investor takes (0-100). */
  readonly newInvestorPct: number;
  /** Pre-money ESOP top-up percentage (0-100). 0 = no top-up. */
  readonly esopTopUpPct: number;
  /** Preferred class label for the new investor's preferred shares. */
  readonly preferredClass: string;
  /** Anti-dilution mechanism on the new investor's preferred. */
  readonly antiDilutionType: AntiDilutionType;
  /** Whether this is a down round — gates anti-dilution adjustments on prior preferred. */
  readonly isDownRound: boolean;
  /** Optional human-readable name for the new investor. */
  readonly newInvestorName?: string;
}

/** Full projection inputs — initial state + ordered list of future rounds. */
export interface ProjectionInputs {
  readonly initial: CapTableSnapshot;
  readonly rounds: ReadonlyArray<FutureRound>;
}

/** One point on a holder's ownership trajectory. */
export interface OwnershipPoint {
  readonly snapshotName: string;
  readonly ownershipPct: number;
}

/** A single holder's trajectory across all snapshots. */
export interface HolderTrajectory {
  readonly holderId: string;
  readonly holderName: string;
  readonly holderType: HolderType;
  readonly points: ReadonlyArray<OwnershipPoint>;
}

/** Full projection output. */
export interface ProjectionResult {
  /** Snapshots in order — index 0 is the initial state, then post-r1, post-r2, … */
  readonly snapshots: ReadonlyArray<CapTableSnapshot>;
  /** Per-holder trajectories. */
  readonly trajectories: ReadonlyArray<HolderTrajectory>;
  /** Founder trajectory pulled out for the UI's headline metric. Null when no founder entry exists. */
  readonly founderTrajectory: HolderTrajectory | null;
}

// ─────────────────────────────────────────────────────────────────────
// Zod schemas (route-body validation)
// ─────────────────────────────────────────────────────────────────────

export const CapTableEntrySchema = z.object({
  holderId: z.string().min(1).max(80),
  holderName: z.string().min(1).max(120),
  holderType: z.enum(
    HOLDER_TYPES_ORDERED as unknown as readonly [HolderType, ...HolderType[]],
  ),
  shares: z.number().positive().finite(),
  preferredClass: z.string().min(1).max(40).optional(),
  antiDilutionType: z
    .enum(
      ANTI_DILUTION_TYPES_ORDERED as unknown as readonly [
        AntiDilutionType,
        ...AntiDilutionType[],
      ],
    )
    .optional(),
  originalPricePerShare: z.number().positive().finite().optional(),
});

export const CapTableSnapshotSchema = z.object({
  snapshotName: z.string().min(1).max(80),
  entries: z.array(CapTableEntrySchema).min(1),
  totalShares: z.number().positive().finite(),
  pricePerShare: z.number().positive().finite(),
  postMoneyGbp: z.number().positive().finite(),
});

export const FutureRoundSchema = z.object({
  roundName: z.string().min(1).max(80),
  postMoneyGbp: z.number().positive().finite(),
  newInvestorPct: z.number().min(0).max(100).finite(),
  esopTopUpPct: z.number().min(0).max(50).finite(),
  preferredClass: z.string().min(1).max(40),
  antiDilutionType: z.enum(
    ANTI_DILUTION_TYPES_ORDERED as unknown as readonly [
      AntiDilutionType,
      ...AntiDilutionType[],
    ],
  ),
  isDownRound: z.boolean(),
  newInvestorName: z.string().min(1).max(120).optional(),
});

export const ProjectionInputsSchema = z.object({
  initial: CapTableSnapshotSchema,
  /** Cap simulated rounds at 2 by default — multi-round projection per BUILD_SEQUENCE. */
  rounds: z.array(FutureRoundSchema).min(1).max(5),
});

/** Maximum rounds the projection accepts — guard against runaway requests. */
export const MAX_PROJECTION_ROUNDS = 5 as const;
