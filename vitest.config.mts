import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest configuration for Olivia Brain.
 *
 * Notes:
 *
 * - The `vite-tsconfig-paths` plugin mirrors the `@` alias from
 *   tsconfig.json so test files import production code with the same
 *   paths the rest of the codebase uses.
 * - Default environment is "node" because every provider and server
 *   module under test runs server-side. Future component tests under
 *   src/components opt into jsdom per-file via the
 *   `@vitest-environment jsdom` magic comment.
 * - Include is scoped to src so accidental top-level test files do not
 *   get picked up.
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
