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

import prisma from "@/lib/db/client";

interface CreateAlertOptions {
  source: string;
  severity?: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a system alert in the database.
 * Closes W-016: transition from console-only stub to persistent storage.
 *
 * Never throws — alerting must not break the caller.
 */
export async function createSystemAlert(opts: CreateAlertOptions): Promise<void> {
  const severity = opts.severity ?? "error";

  // Still log to console for immediate visibility in logs
  console.log(
    `[SystemAlert ${severity.toUpperCase()}] ${opts.source}: ${opts.title} — ${opts.message}`
  );

  try {
    await prisma.system_alerts.create({
      data: {
        source: opts.source,
        severity: severity,
        title: opts.title,
        message: opts.message,
        metadata: opts.metadata ?? {},
      },
    });
  } catch (err) {
    // If DB write fails, at least the console log above already happened.
    // We don't throw here to ensure the primary workflow continues.
    const raw = err instanceof Error ? err.message : String(err);
    console.error(`[SystemAlert FAILED TO PERSIST] ${raw}`);
  }
}
