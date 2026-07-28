/**
 * Track P Session P5 — Multi-round dilution projection (pure math).
 *
 * Forward-simulates a founder's cap table across one or more
 * hypothetical future rounds. Returns per-snapshot cap tables + per-
 * holder trajectories. Pure function — no Prisma writes, no cascade
 * calls. Always resolves; never throws on the happy path.
 *
 * # Per-round mechanics
 *
 *   1. **ESOP top-up (pre-money)** — expands the option pool out of
 *      the pre-money valuation, diluting existing holders. Implemented
 *      as bonus shares added to the existing ESOP entry (or a new ESOP
 *      entry created when the cap table didn't have one).
 *   2. **Compute new price-per-share** —
 *        newInvestorCash      = postMoneyGbp × newInvestorPct / 100
 *        preMoneyAfterEsop    = postMoneyGbp − newInvestorCash
 *        sharesAfterEsop      = totalSharesPreRound + esopTopUpShares
 *        newPPS               = preMoneyAfterEsop / sharesAfterEsop
 *        newInvestorShares    = newInvestorCash / newPPS
 *   3. **Anti-dilution** (down rounds only) — for each prior preferred
 *      entry with non-`none` protection AND a recorded original PPS,
 *      compute an adjustment factor and add bonus shares that effectively
 *      lower the prior preferred's conversion price:
 *        - full_ratchet: factor = oldPPS / newPPS
 *        - weighted_average_broad: factor = (A_broad + C) / (A_broad + B)
 *            where A_broad = pre-round shares incl. options/warrants,
 *                  B       = newInvestorCash / oldPPS,
 *                  C       = newInvestorCash / newPPS.
 *        - weighted_average_narrow: same formula but A_narrow excludes
 *            options/warrants (entries flagged 'esop').
 *   4. **Add new investor entry** — recorded with `preferredClass`,
 *      `antiDilutionType`, and `originalPricePerShare = newPPS` so
 *      *future* down rounds can apply protection to this round in turn.
 *   5. **Compute totals** — `totalShares` is the sum of all entry shares
 *      after all adjustments; ownership % is `entry.shares / totalShares`.
 *
 * # Anti-dilution edge cases
 *
 *   - Up rounds (`isDownRound = false` OR `newPPS >= oldPPS`) trigger
 *     no protection adjustments even if the type is non-`none` — there's
 *     nothing to protect against.
 *   - The full-ratchet factor is capped at a defensive bound
 *     (`MAX_RATCHET_FACTOR`) so a degenerate `newPPS → 0` input doesn't
 *     produce NaN ownership percentages. In real life ratchet caps
 *     are negotiated separately; this is a defensive floor only.
 */
import {
  ANTI_DILUTION_TYPES_ORDERED,
  type AntiDilutionType,
  type CapTableEntry,
  type CapTableSnapshot,
  type FutureRound,
  type HolderTrajectory,
  type OwnershipPoint,
  type ProjectionInputs,
  type ProjectionResult,
} from './multi-round-types';

/** Defensive floor on the full-ratchet factor — prevents runaway adjustment from degenerate inputs. */
export const MAX_RATCHET_FACTOR = 100 as const;

/* Touch the ordered list so a future tree-shake never drops the
   barrel — we want this exported value retained for downstream
   consumers (route validators, tests). */
void ANTI_DILUTION_TYPES_ORDERED;

/**
 * Run the dilution projection. Returns the full sequence of snapshots
 * (initial → after each round) plus per-holder ownership trajectories.
 */
export function projectDilution(inputs: ProjectionInputs): ProjectionResult {
  const snapshots: CapTableSnapshot[] = [normalizeSnapshot(inputs.initial)];
  let current = snapshots[0];

  for (const round of inputs.rounds) {
    const next = applyRound(current, round);
    snapshots.push(next);
    current = next;
  }

  const trajectories = buildTrajectories(snapshots);
  const founderTrajectory =
    trajectories.find((t) => t.holderType === 'founder') ?? null;

  return { snapshots, trajectories, founderTrajectory };
}

/**
 * Apply one round of dilution to a snapshot. Pure function;
 * the input snapshot is not mutated.
 */
export function applyRound(
  prev: CapTableSnapshot,
  round: FutureRound,
): CapTableSnapshot {
  const totalSharesPreRound = prev.totalShares;

  /* Step 1: ESOP top-up (pre-money). */
  const esopTopUpShares =
    round.esopTopUpPct > 0
      ? totalSharesPreRound *
        (round.esopTopUpPct / (100 - round.esopTopUpPct))
      : 0;
  const sharesAfterEsop = totalSharesPreRound + esopTopUpShares;

  /* Step 2: Compute new PPS. */
  const newInvestorCash = (round.postMoneyGbp * round.newInvestorPct) / 100;
  const preMoneyAfterEsop = round.postMoneyGbp - newInvestorCash;
  const newPPS = sharesAfterEsop > 0 ? preMoneyAfterEsop / sharesAfterEsop : 0;
  const newInvestorShares = newPPS > 0 ? newInvestorCash / newPPS : 0;

  /* Step 3: Build the post-round entries. Start by cloning prev,
     applying the ESOP top-up, then anti-dilution adjustments, then
     adding the new investor. */
  const entries: CapTableEntry[] = prev.entries.map((e) => ({ ...e }));

  if (esopTopUpShares > 0) {
    const esopIdx = entries.findIndex((e) => e.holderType === 'esop');
    if (esopIdx >= 0) {
      entries[esopIdx] = {
        ...entries[esopIdx],
        shares: entries[esopIdx].shares + esopTopUpShares,
      };
    } else {
      entries.push({
        holderId: 'esop',
        holderName: 'ESOP',
        holderType: 'esop',
        shares: esopTopUpShares,
      });
    }
  }

  /* Step 4: Anti-dilution on down rounds. Adjusts prior preferred
     share counts; founder + ESOP + non-protected entries are left
     intact (they implicitly dilute via the larger total). */
  if (round.isDownRound) {
    const optionShares = entries
      .filter((e) => e.holderType === 'esop')
      .reduce((acc, e) => acc + e.shares, 0);
    const sharesPreRoundBroad = sharesAfterEsop;
    const sharesPreRoundNarrow = sharesAfterEsop - optionShares;

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.holderType !== 'investor') continue;
      const aType = e.antiDilutionType ?? 'none';
      if (aType === 'none') continue;
      if (e.originalPricePerShare === undefined || e.originalPricePerShare <= 0)
        continue;
      if (newPPS >= e.originalPricePerShare) continue;

      const factor = computeAdjustmentFactor({
        type: aType,
        oldPPS: e.originalPricePerShare,
        newPPS,
        sharesPreRoundBroad,
        sharesPreRoundNarrow,
        newInvestorCash,
      });
      const bonusShares = e.shares * (factor - 1);
      if (bonusShares > 0) {
        entries[i] = { ...e, shares: e.shares + bonusShares };
      }
    }
  }

  /* Step 5: Add the new investor entry. The new investor's preferred
     class records `originalPricePerShare = newPPS` so future down
     rounds can compute its own anti-dilution against this round's
     pricing. */
  entries.push({
    holderId: `investor_${round.preferredClass}`,
    holderName: round.newInvestorName ?? `${round.preferredClass} investor`,
    holderType: 'investor',
    shares: newInvestorShares,
    preferredClass: round.preferredClass,
    antiDilutionType: round.antiDilutionType,
    originalPricePerShare: newPPS,
  });

  const totalShares = entries.reduce((acc, e) => acc + e.shares, 0);

  return {
    snapshotName: `after_${round.roundName}`,
    entries,
    totalShares,
    pricePerShare: newPPS,
    postMoneyGbp: round.postMoneyGbp,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────

interface AdjustmentArgs {
  readonly type: AntiDilutionType;
  readonly oldPPS: number;
  readonly newPPS: number;
  readonly sharesPreRoundBroad: number;
  readonly sharesPreRoundNarrow: number;
  readonly newInvestorCash: number;
}

/**
 * Compute the share-bonus multiplier (≥ 1.0) for a single prior
 * preferred entry under anti-dilution protection. `factor − 1`
 * is the bonus-share fraction added to the entry.
 */
export function computeAdjustmentFactor(args: AdjustmentArgs): number {
  if (args.type === 'none') return 1.0;
  if (args.newPPS >= args.oldPPS) return 1.0; // no down round for this entry
  if (args.newPPS <= 0) return 1.0; // defensive — degenerate input
  if (args.oldPPS <= 0) return 1.0;

  if (args.type === 'full_ratchet') {
    const raw = args.oldPPS / args.newPPS;
    /* Cap defensively — a near-zero newPPS would otherwise produce
       infinite ratchet factors and break ownership math. */
    return Math.min(raw, MAX_RATCHET_FACTOR);
  }

  /* Weighted-average — broad vs narrow differ in the share-count basis (A). */
  const A =
    args.type === 'weighted_average_broad'
      ? args.sharesPreRoundBroad
      : args.sharesPreRoundNarrow;
  if (A <= 0) return 1.0; // no shares to weight against
  const B = args.newInvestorCash / args.oldPPS; // shares the round would have bought at oldPPS
  const C = args.newInvestorCash / args.newPPS; // shares actually issued in the round
  /* newCP = oldCP × (A + B) / (A + C) ⇒ bonus factor = oldCP / newCP = (A + C) / (A + B). */
  if (A + B <= 0) return 1.0;
  return (A + C) / (A + B);
}

function normalizeSnapshot(snap: CapTableSnapshot): CapTableSnapshot {
  /* If the caller supplied entries with shares but a stale totalShares,
     trust the entries and re-derive the total. Same for pricePerShare —
     postMoneyGbp / totalShares is the canonical relationship. */
  const totalShares = snap.entries.reduce((acc, e) => acc + e.shares, 0);
  if (totalShares <= 0) {
    return { ...snap };
  }
  const pricePerShare =
    snap.postMoneyGbp > 0 ? snap.postMoneyGbp / totalShares : snap.pricePerShare;
  return {
    ...snap,
    totalShares,
    pricePerShare,
    entries: snap.entries.map((e) => ({ ...e })),
  };
}

function buildTrajectories(
  snapshots: ReadonlyArray<CapTableSnapshot>,
): ReadonlyArray<HolderTrajectory> {
  /* Collect every holderId across every snapshot — entries appear
     mid-trajectory (new investors) so we can't take the keys from
     just the initial snapshot. */
  const holderIndex = new Map<
    string,
    { holderId: string; holderName: string; holderType: HolderTrajectory['holderType'] }
  >();
  for (const snap of snapshots) {
    for (const e of snap.entries) {
      if (!holderIndex.has(e.holderId)) {
        holderIndex.set(e.holderId, {
          holderId: e.holderId,
          holderName: e.holderName,
          holderType: e.holderType,
        });
      }
    }
  }

  const out: HolderTrajectory[] = [];
  for (const [, meta] of holderIndex) {
    const points: OwnershipPoint[] = [];
    for (const snap of snapshots) {
      const e = snap.entries.find((entry) => entry.holderId === meta.holderId);
      const pct = e
        ? snap.totalShares > 0
          ? (e.shares / snap.totalShares) * 100
          : 0
        : 0;
      points.push({ snapshotName: snap.snapshotName, ownershipPct: pct });
    }
    out.push({ ...meta, points });
  }
  return out;
}
