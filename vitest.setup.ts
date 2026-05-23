/**
 * Vitest global setup.
 *
 * Loaded before every test file via `setupFiles` in `vitest.config.mts`.
 * Currently:
 *
 * - Runs `@testing-library/react`'s `cleanup` after each test so DOM
 *   nodes from one test case don't leak into the next.  Without this,
 *   `screen.getByRole(...)` / `getByLabelText(...)` queries return
 *   "Found multiple elements" errors when sibling tests render
 *   structurally similar trees.
 *
 *   `cleanup` is a no-op in node-environment tests (no jsdom DOM to
 *   tear down), so registering it globally is safe even though many
 *   tests run with `environment: "node"`.
 *
 * - No-ops the `server-only` guard so tests can transitively import
 *   server-only modules (require-tier, auth/session, etc.). The guard
 *   exists to prevent client components from importing server code at
 *   build time; in vitest's node environment that boundary doesn't
 *   apply, and the default export of `server-only/index.js` throws
 *   unconditionally on load.
 *
 * - Provides a no-op `ResizeObserver` shim because jsdom does not
 *   implement it. Recharts (and any library that resizes responsively)
 *   throws `ReferenceError: ResizeObserver is not defined` on mount
 *   without this. The shim is intentionally inert — render-time chart
 *   sizing isn't exercised in tests; we test dispatch + accessibility,
 *   not pixel layout.
 */

import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

vi.mock("server-only", () => ({}));

class NoopResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis !== "undefined" && !("ResizeObserver" in globalThis)) {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  (globalThis as any).ResizeObserver = NoopResizeObserver;
}

afterEach(() => {
  cleanup();
});
