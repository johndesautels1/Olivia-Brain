/**
 * Trigger.dev Configuration
 * Sprint 4.4 — Durable Execution (Item 4: Long-Running Jobs)
 *
 * Configures the Trigger.dev SDK for dispatching long-running tasks
 * that exceed Vercel's serverless timeout limits.
 *
 * Trigger.dev v4 auto-reads TRIGGER_SECRET_KEY from environment.
 * This module provides an explicit configure() call for cases where
 * env vars aren't available at import time (e.g., edge functions).
 *
 * Architecture note: Task DEFINITIONS live in trigger-tasks.ts and run
 * on Trigger.dev infrastructure. This app only TRIGGERS tasks and
 * polls their status — it does not execute the task code itself.
 *
 * Environment: TRIGGER_SECRET_KEY, TRIGGER_API_URL (set in Vercel env vars)
 */

import { configure } from "@trigger.dev/sdk/v3";

import { getServerEnv } from "@/lib/config/env";

// ─── Configuration ───────────────────────────────────────────────────────────

let configured = false;

/**
 * Ensure Trigger.dev SDK is configured with our credentials.
 * The SDK auto-reads TRIGGER_SECRET_KEY from env, but this
 * guarantees configuration in edge/serverless contexts.
 *
 * Returns true if a valid key is available, false otherwise.
 */
export function ensureTriggerConfigured(): boolean {
  if (configured) return true;

  const env = getServerEnv();
  const secretKey = env.TRIGGER_SECRET_KEY;

  if (!secretKey) {
    console.warn(
      "[Trigger] No TRIGGER_SECRET_KEY configured — long-running jobs disabled"
    );
    return false;
  }

  configure({
    accessToken: secretKey,
    ...(env.TRIGGER_API_URL ? { baseURL: env.TRIGGER_API_URL } : {}),
  });

  configured = true;
  return true;
}

/**
 * Check whether Trigger.dev is available (key is configured).
 */
export function isTriggerAvailable(): boolean {
  const env = getServerEnv();
  return !!env.TRIGGER_SECRET_KEY;
}
