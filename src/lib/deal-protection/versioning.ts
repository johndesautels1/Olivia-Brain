/**
 * Track P Session P7 — Term sheet versioning (deterministic diff).
 *
 * Pure function — compares two `DealAnalysis` snapshots (typically a
 * prior version and a re-run with revised investor terms) and surfaces
 * the deltas: smart-score change, band transition, new vs resolved
 * critical issues, per-clause severity / toxicity shifts.
 *
 * No cascade calls — the diff is mathematical. The narrative summary
 * is composed deterministically from the structured deltas so the
 * output is repeatable and testable.
 */
import type { ClauseAnalysis, ClauseType } from './clause-types';
import type { CriticalIssue } from './report-types';
import type { SmartBand } from './types';

/** A single analysis snapshot suitable for diffing. */
export interface VersionedAnalysis {
  readonly id: string;
  readonly versionLabel: string; // 'V1' / '2026-05-08' / etc — caller-supplied
  readonly smartScore: number;
  readonly smartBand: SmartBand;
  readonly clauseAnalyses: ReadonlyArray<ClauseAnalysis>;
  readonly criticalIssues: ReadonlyArray<CriticalIssue>;
  readonly generatedAt: string; // ISO 8601
}

/** Per-clause shift between versions. */
export interface ClauseDiff {
  readonly clauseType: ClauseType;
  readonly priorSeverity: ClauseAnalysis['severity'];
  readonly currentSeverity: ClauseAnalysis['severity'];
  readonly priorToxicity: number;
  readonly currentToxicity: number;
  readonly toxicityDelta: number; // current − prior
  readonly direction: 'better' | 'worse' | 'unchanged';
}

/** New / resolved / shifted critical issues. */
export interface CriticalIssueDelta {
  readonly newCriticalIssues: ReadonlyArray<CriticalIssue>; // present in current, absent in prior
  readonly resolvedCriticalIssues: ReadonlyArray<CriticalIssue>; // present in prior, absent in current
}

export interface AnalysisDiff {
  readonly priorVersion: { id: string; versionLabel: string; smartScore: number; smartBand: SmartBand };
  readonly currentVersion: { id: string; versionLabel: string; smartScore: number; smartBand: SmartBand };
  readonly scoreDelta: number; // current − prior
  readonly bandTransition: { from: SmartBand; to: SmartBand } | null;
  readonly criticalIssueDelta: CriticalIssueDelta;
  readonly clauseDiffs: ReadonlyArray<ClauseDiff>;
  /** Olivia narrative summary — deterministically composed from the deltas. */
  readonly summary: string;
  /** Direction of the overall change — useful for the UI's headline metric. */
  readonly overallDirection: 'better' | 'worse' | 'unchanged';
}

/**
 * Compute the diff between two analyses. Always returns; never throws.
 */
export function compareAnalyses(prior: VersionedAnalysis, current: VersionedAnalysis): AnalysisDiff {
  const scoreDelta = current.smartScore - prior.smartScore;
  const bandTransition =
    prior.smartBand !== current.smartBand
      ? { from: prior.smartBand, to: current.smartBand }
      : null;

  /* Critical-issue partitioning. We compare by clauseType — a single
     analysis can have multiple critical issues of the same type, but
     for the founder UX the high-level "did this clauseType move out
     of critical?" question is what matters. */
  const priorCriticalTypes = new Set(prior.criticalIssues.map((c) => c.clauseType));
  const currentCriticalTypes = new Set(current.criticalIssues.map((c) => c.clauseType));

  const newCriticalIssues = current.criticalIssues.filter(
    (c) => !priorCriticalTypes.has(c.clauseType),
  );
  const resolvedCriticalIssues = prior.criticalIssues.filter(
    (c) => !currentCriticalTypes.has(c.clauseType),
  );

  /* Per-clause diffs — keyed by clauseType. When a type appears
     multiple times in a version, we use the highest-toxicity entry
     (the one that drove the smart score). */
  const priorByType = indexByClauseType(prior.clauseAnalyses);
  const currentByType = indexByClauseType(current.clauseAnalyses);

  const allTypes = new Set<ClauseType>([
    ...priorByType.keys(),
    ...currentByType.keys(),
  ]);

  const clauseDiffs: ClauseDiff[] = [];
  for (const type of allTypes) {
    const priorEntry = priorByType.get(type);
    const currentEntry = currentByType.get(type);
    if (!priorEntry || !currentEntry) continue; // appeared / disappeared — covered by critical-issue delta

    const toxicityDelta = currentEntry.toxicity - priorEntry.toxicity;
    const direction =
      toxicityDelta < -0.5 ? 'better' : toxicityDelta > 0.5 ? 'worse' : 'unchanged';
    clauseDiffs.push({
      clauseType: type,
      priorSeverity: priorEntry.severity,
      currentSeverity: currentEntry.severity,
      priorToxicity: priorEntry.toxicity,
      currentToxicity: currentEntry.toxicity,
      toxicityDelta,
      direction,
    });
  }
  /* Sort by absolute toxicity delta descending — the biggest movers first. */
  clauseDiffs.sort((a, b) => Math.abs(b.toxicityDelta) - Math.abs(a.toxicityDelta));

  const overallDirection: 'better' | 'worse' | 'unchanged' =
    scoreDelta > 0.5 ? 'better' : scoreDelta < -0.5 ? 'worse' : 'unchanged';

  const summary = composeSummary({
    prior,
    current,
    scoreDelta,
    bandTransition,
    newCriticalIssues,
    resolvedCriticalIssues,
    overallDirection,
  });

  return {
    priorVersion: {
      id: prior.id,
      versionLabel: prior.versionLabel,
      smartScore: prior.smartScore,
      smartBand: prior.smartBand,
    },
    currentVersion: {
      id: current.id,
      versionLabel: current.versionLabel,
      smartScore: current.smartScore,
      smartBand: current.smartBand,
    },
    scoreDelta,
    bandTransition,
    criticalIssueDelta: {
      newCriticalIssues,
      resolvedCriticalIssues,
    },
    clauseDiffs,
    summary,
    overallDirection,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────

function indexByClauseType(
  analyses: ReadonlyArray<ClauseAnalysis>,
): Map<ClauseType, ClauseAnalysis> {
  const out = new Map<ClauseType, ClauseAnalysis>();
  for (const a of analyses) {
    const existing = out.get(a.clauseType);
    if (!existing || a.toxicity > existing.toxicity) {
      out.set(a.clauseType, a);
    }
  }
  return out;
}

function composeSummary(args: {
  readonly prior: VersionedAnalysis;
  readonly current: VersionedAnalysis;
  readonly scoreDelta: number;
  readonly bandTransition: { from: SmartBand; to: SmartBand } | null;
  readonly newCriticalIssues: ReadonlyArray<CriticalIssue>;
  readonly resolvedCriticalIssues: ReadonlyArray<CriticalIssue>;
  readonly overallDirection: 'better' | 'worse' | 'unchanged';
}): string {
  const lines: string[] = [];
  const directionPhrase =
    args.overallDirection === 'better'
      ? 'improved'
      : args.overallDirection === 'worse'
        ? 'deteriorated'
        : 'is essentially unchanged';
  lines.push(
    `Comparing ${args.prior.versionLabel} → ${args.current.versionLabel}: the deal ${directionPhrase}. Smart score moved ${signNumber(args.scoreDelta)} (${args.prior.smartScore.toFixed(0)} → ${args.current.smartScore.toFixed(0)}).`,
  );

  if (args.bandTransition) {
    lines.push(
      `Band transition: ${args.bandTransition.from} → ${args.bandTransition.to}.`,
    );
  }

  if (args.resolvedCriticalIssues.length > 0) {
    lines.push(
      `Resolved (${args.resolvedCriticalIssues.length}): ${args.resolvedCriticalIssues
        .map((c) => formatClauseType(c.clauseType))
        .join(', ')}.`,
    );
  }
  if (args.newCriticalIssues.length > 0) {
    lines.push(
      `NEW critical concerns (${args.newCriticalIssues.length}): ${args.newCriticalIssues
        .map((c) => formatClauseType(c.clauseType))
        .join(', ')}.`,
    );
  }

  if (args.newCriticalIssues.length === 0 && args.resolvedCriticalIssues.length === 0) {
    if (args.overallDirection === 'unchanged') {
      lines.push('No critical clauses added or resolved between versions.');
    }
  }

  return lines.join(' ');
}

function signNumber(n: number): string {
  if (n > 0) return `+${n.toFixed(1)}`;
  if (n < 0) return n.toFixed(1);
  return '0';
}

function formatClauseType(t: string): string {
  return t
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
