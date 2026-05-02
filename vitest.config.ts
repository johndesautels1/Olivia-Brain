import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest configuration for Olivia Brain.
 *
 * - `tsconfigPaths` mirrors the `@/*` alias from `tsconfig.json` so test
 *   files can import production code with the same paths the rest of the
 *   codebase uses.
 * - `pool: "forks"` runs each test file in its own Node process. We keep
 *   this off by default at first (Vitest's default `threads` is faster)
 *   and switch only if we see flaky shared-state issues with the
 *   knowledgeRegistry singleton.
 * - `environment: "node"` because every provider/server module under test
 *   runs server-side. Component tests, when added, will live under
 *   `src/components/**/__tests__/` and will configure `environment:
 *   "jsdom"` per-file via `// @vitest-environment jsdom`.
 * - `include` is scoped to `src/**` so accidental top-level test files
 *   don't get picked up.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "dist"],
    globals: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/__tests__/**",
        "src/**/*.d.ts",
      ],
    },
  },
});
