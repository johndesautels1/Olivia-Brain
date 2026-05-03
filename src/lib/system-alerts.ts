/**
 * System Alert Utility
 *
 * Logs infrastructure errors/warnings. In LTM this writes to a `system_alerts`
 * Prisma model; that model is not in Olivia Brain's schema yet, so this stub
 * logs to console only. When SystemAlert lands in OB schema, restore the
 * `prisma.systemAlert.create` call from LTM's `lib/system-alerts.ts`.
 *
 * Tracked as W-016 in README weakness backlog.
 */

interface CreateAlertOptions {
  source: string;
  severity?: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/** Console-only stub. Never throws — alerting must not break the caller. */
export async function createSystemAlert(opts: CreateAlertOptions): Promise<void> {
  const severity = opts.severity ?? "error";
  console.error(
    `[SystemAlert ${severity.toUpperCase()}] ${opts.source}: ${opts.title} — ${opts.message}`,
    opts.metadata ?? {}
  );
}
