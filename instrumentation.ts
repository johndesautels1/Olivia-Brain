/**
 * Next.js instrumentation entry point.
 *
 * Next 15 runs this file in BOTH Node and Edge runtimes. The
 * OpenTelemetry SDK + Langfuse processor are Node-only — bundling
 * them for the Edge runtime emits `__import_unsupported` markers that
 * crash middleware at request time with `ReferenceError:
 * __import_unsupported is not defined`.
 *
 * Two-part guard:
 *   1. Top-level imports are gone — defer to dynamic `await import()`
 *      inside register() so Edge runtime never resolves the modules.
 *   2. Hard-gate on `NEXT_RUNTIME === "nodejs"` so even if Next routes
 *      register() to Edge, we bail before loading anything.
 *
 * The Langfuse / OTel keys are also still required, so without them
 * register() short-circuits to a no-op (preserves the prior behavior).
 */

let sdkStarted = false;

export async function register() {
  if (sdkStarted) return;
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    return;
  }

  const { NodeSDK } = await import("@opentelemetry/sdk-node");
  const { LangfuseSpanProcessor } = await import("@langfuse/otel");

  const sdk = new NodeSDK({
    spanProcessors: [new LangfuseSpanProcessor()],
  });

  sdk.start();
  sdkStarted = true;
}
