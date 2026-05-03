import { RRule } from "rrule";

interface ExpandableEntry {
  id: string;
  rrule: string | null;
  startDatetime: string;
  endDatetime: string;
  [key: string]: unknown;
}

/**
 * Expand recurring calendar entries into virtual instances within a date range.
 *
 * For each entry that has an rrule string, this generates virtual copies
 * at each occurrence date. Virtual instances get IDs like
 * "personal-{parentId}-{isoDate}" and carry all parent fields except
 * shifted start/end times.
 *
 * Non-recurring entries are passed through unchanged.
 * Max 200 instances per entry for safety.
 */
export function expandRecurringEntries<T extends ExpandableEntry>(
  entries: T[],
  rangeStart: Date,
  rangeEnd: Date,
): T[] {
  const result: T[] = [];

  for (const entry of entries) {
    if (!entry.rrule) {
      result.push(entry);
      continue;
    }

    // Parse the original entry's duration
    const originalStart = new Date(entry.startDatetime);
    const originalEnd = new Date(entry.endDatetime);
    const durationMs = originalEnd.getTime() - originalStart.getTime();

    try {
      // Parse rrule — the library expects dtstart to anchor the recurrence
      const rule = RRule.fromString(
        `DTSTART:${toRRuleDateString(originalStart)}\n${normalizeRRule(entry.rrule)}`,
      );

      // Get occurrences within the queried range (max 200)
      const occurrences = rule.between(rangeStart, rangeEnd, true).slice(0, 200);

      for (const occDate of occurrences) {
        const occEnd = new Date(occDate.getTime() + durationMs);
        const isoDate = occDate.toISOString().slice(0, 10);

        result.push({
          ...entry,
          id: `${entry.id}-${isoDate}`,
          startDatetime: occDate.toISOString(),
          endDatetime: occEnd.toISOString(),
          recurrenceParentId: entry.id,
        } as T);
      }
    } catch (err) {
      // If rrule parsing fails, include the original entry as-is
      console.error(`Failed to expand rrule for entry ${entry.id}:`, err);
      result.push(entry);
    }
  }

  return result;
}

/**
 * Ensure the rrule string starts with "RRULE:" prefix as required by the library.
 */
function normalizeRRule(rrule: string): string {
  const trimmed = rrule.trim();
  if (trimmed.startsWith("RRULE:")) return trimmed;
  return `RRULE:${trimmed}`;
}

/**
 * Convert a Date to the rrule DTSTART format (UTC): "YYYYMMDDTHHMMSSZ"
 */
function toRRuleDateString(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
