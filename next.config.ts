import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

/**
 * `@next/bundle-analyzer` -- wired per Bundle audit
 * `docs/10_BUNDLE_SIZE_AUDIT.md` section 5 (MEDIUM-1 remediation).
 * Off by default (zero production-bundle impact). Developer opt-in
 * via `ANALYZE=true npm run build` (also exposed as `npm run analyze`
 * in package.json). Produces an interactive treemap at
 * `.next/analyze/` showing per-chunk weights so future bundle
 * regressions are visible at PR review time.
 */
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Disable typedRoutes to speed up builds (adds ~30s overhead)
  typedRoutes: false,

  // External packages that don't need to be bundled for server
  serverExternalPackages: [
    "@langfuse/otel",
    "@opentelemetry/api",
    "@supabase/supabase-js",
    "twilio",
  ],

  // Transpile only what's needed
  transpilePackages: [],
};

export default withBundleAnalyzer(nextConfig);
