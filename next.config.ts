import type { NextConfig } from "next";

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

export default nextConfig;
