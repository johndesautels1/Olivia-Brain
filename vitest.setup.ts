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
 */

import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

vi.mock("server-only", () => ({}));

afterEach(() => {
  cleanup();
});
