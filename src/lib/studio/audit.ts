/**
 * Studio audit log — persistent, replayable record of state-changing
 * actions in the workspace.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 2.5 (Audit tab) +
 * § 8 #9 ("Audit trail as a first-class citizen — almost every state
 * change pushes a `{ time, text }` entry; the right Audit tab is where
 * the user replays their entire session.").
 *
 * Capped at `AUDIT_LOG_CAP` (default 50) entries, newest-first. The
 * cap matches the prototype.
 */

export interface AuditEntry {
  /** Localised time string (e.g., `"15:42:08"`). */
  time: string;
  /** Human-readable description of what happened. */
  text: string;
}

export const AUDIT_LOG_CAP = 50;

/** Format the current time as `HH:MM:SS` for display in audit rows. */
export function formatAuditTime(now: Date = new Date()): string {
  return now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Push an entry to the front of the log and cap to `AUDIT_LOG_CAP`.
 * Pure — returns a new array; never mutates the input.
 */
export function pushAuditEntry(
  log: readonly AuditEntry[],
  text: string,
  now: Date = new Date(),
): AuditEntry[] {
  const entry: AuditEntry = { time: formatAuditTime(now), text };
  return [entry, ...log].slice(0, AUDIT_LOG_CAP);
}
