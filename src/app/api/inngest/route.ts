/**
 * Inngest Serve Endpoint
 * Sprint 4.4 — Durable Execution
 *
 * This route registers all Inngest functions and serves them.
 * Inngest calls this endpoint to discover and invoke functions.
 *
 * In production, set INNGEST_SIGNING_KEY and INNGEST_EVENT_KEY
 * in Vercel environment variables.
 */

import { serve } from "inngest/next";

import { inngest } from "@/lib/execution/inngest-client";
import { allFunctions } from "@/lib/execution/inngest-functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
