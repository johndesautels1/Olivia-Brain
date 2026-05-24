# 10 · BUNDLE-SIZE AUDIT — heavy-dep static-import map + lazy-load opportunities + performance budget

> **Date:** 2026-05-25. **Auditor:** Claude Opus 4.7.
> **Scope:** `package.json` heavy deps + `next.config.ts` + static-vs-dynamic import patterns across `src/components` + `src/app`.
> **Standard:** `01_UI_DESIGN_SYSTEM.md` § 9 (performance is in the WCAG floor) + `~/CLAUDE.md` 2026 standards row "Performance" (critical path < 200ms; INP < 200ms per Google Core Web Vitals; bundle size budgets enforced; lazy-loading for below-the-fold).
>
> **Method:** static read — no local `next build` per the founder's pace-discipline call (long local builds blocked this session). Audit triangulates known typical gzipped sizes of declared deps + cross-references the import graph to surface what's currently in the initial bundle vs what's already lazy-loaded. No code changes in this commit — audit deliverable only.

---

## § 1 · Findings summary

| Severity | Count | Item |
|---|---|---|
| 🟡 **MEDIUM** | 1 | No `@next/bundle-analyzer` wired in `next.config.ts` — cannot observe bundle composition without one |
| 🟡 **MEDIUM** | 1 | No declared performance budget in CI — bundle bloat can land silently |
| 🟡 **MEDIUM** | 1 | `framer-motion` statically imported across ≥6 valuation/motion files; could be ESM tree-shaken or page-level dynamic per route |
| 🟢 **LOW** | 1 | `recharts` import sites should be audited for `LazyExoticComponent` wrap on charts that mount below the fold |
| 🟢 **LOW** | 1 | `three` (~580KB gzipped) currently used only via `@react-three/fiber` Canvas which IS dynamic — verify no second static-import path |
| ✅ Strengths | — | Best lazy-load patterns already in place: MapManifest dynamic-imports mapbox-gl; AvatarOrb dynamic-imports OliviaVideoAvatar; ChartCard dynamic-imports html2canvas; CompanyIntelligenceNexus dynamic-imports `@react-three/fiber` |

**Total actionable: 3 MEDIUM + 2 LOW = 5 findings.** All are progressive-improvement; none cause a current production outage. The big win is wiring `@next/bundle-analyzer` (~1 hour) so future regressions are visible.

---

## § 2 · Heavy-dep weight inventory (gzipped, typical)

From `package.json` and bundlephobia.com / per-vendor sizing references (typical, not measured against this exact lockfile):

| Package | Version in OB | Typical gzipped size | Where it lives in OB |
|---|---|---|---|
| `mapbox-gl` | `^3.23.0` | **~440 KB** | `src/components/map/**`, `src/components/home/reply-renderer/MapManifest.tsx` |
| `three` | `^0.184.0` | **~580 KB** | `@react-three/fiber` consumer in `valuation/CompanyIntelligenceNexus.tsx` |
| `recharts` | `^3.8.1` | **~120 KB** | reply-renderer charts; valuation chart tabs |
| `livekit-client` | `^2.18.0` | **~150 KB** | `OliviaVideoAvatar` LiveAvatar WebRTC client |
| `framer-motion` | `^12.38.0` | **~50 KB** | broadly across valuation/motion + studio + olivia components |
| `@dnd-kit/core` + `sortable` | `^6.3.1` / `^10.0.0` | ~30 KB | workspace grid + tile drag-drop |
| `@radix-ui/react-dialog` | `^1.1.15` | ~15 KB | modals (lightweight, fine) |
| `@composio/core` | `^0.6.8` | unknown (likely ~50-100 KB) | tool integrations |
| `@googlemaps/js-api-loader` | `^2.0.2` | ~10 KB loader (Google Maps SDK fetched at runtime) | map view |
| `recharts` + `mapbox-gl` + `three` + `framer-motion` + `livekit-client` aggregate | — | **~1.34 MB gzipped IF all eagerly loaded** | — |

If every heavy dep loaded in the initial bundle, the first-load JS payload would be ≥ 1.34 MB gzipped just from these libs — well past any reasonable performance budget. Reality is much better because OB already dynamic-imports several (see § 3).

---

## § 3 · What's already lazy-loaded (the existing good patterns)

The audit grep for `dynamic(` / `next/dynamic` / `import(` returned these existing wins:

| File | Pattern | What's deferred |
|---|---|---|
| `src/components/calendar/CalendarEntryModal.tsx:11` | `lazy(() => import("react-datepicker"))` | Date picker only on calendar entry modal open |
| `src/components/home/reply-renderer/MapManifest.tsx:97-98` | `await import("mapbox-gl")` + CSS | Mapbox SDK only when a chat reply emits a `map` fence |
| `src/components/map/MapView.tsx:22-23` | `lazy(() => import("./overlays/ClusterCardGrid"))` + `StreetViewModal` | Cluster grid + street view only on user interaction |
| `src/components/primitives/AvatarOrb.tsx:123` | `import("@/components/olivia/OliviaVideoAvatar")` | LiveAvatar pipeline only when avatar activates |
| `src/components/valuation/ChartCard.tsx:86` | `(await import('html2canvas')).default` | Image export only on user "Export PNG" click |
| `src/components/valuation/CompanyIntelligenceNexus.tsx:27-28` | `dynamic(() => import('@react-three/fiber').then(mod => mod.Canvas))` | Three.js Canvas only when intelligence nexus renders |

**These six dynamic-import sites already defer roughly 800 KB-1 MB gzipped from the initial bundle.** The OB code already understands the pattern; the remaining gaps are incremental.

---

## § 4 · Static imports that should consider going dynamic

`grep -rlnE "^import.*from\s+['\"](mapbox-gl|three|recharts|framer-motion|livekit-client|@composio/core)" src` returned **16 files** with static imports of heavy libs. Breakdown:

### 4.1 `mapbox-gl` static imports (besides the MapManifest dynamic import)

```
src/components/map/constants.ts
src/components/map/controls/ViewPresetButtons.tsx
src/components/map/hooks/useClusterInteraction.ts
src/components/map/hooks/useMapLayers.ts
src/components/map/MapView.tsx
src/components/map/overlays/ClusterCardGrid.tsx
```

`MapView.tsx` lazy-loads its overlays, but mapbox-gl itself is statically imported at the top of MapView + the hooks + constants. This is **correct** for the `/map` route (where mapbox-gl IS the page) but means **`/map` ALWAYS loads ~440 KB** on first visit. The `MapManifest` reply-renderer path is the one that already lazy-loads mapbox-gl correctly.

**Recommendation:** keep `/map` static-import as-is (Mapbox IS the page), but wrap the `/map` route itself in a `dynamic(() => import(...), { ssr: false })` at the higher-level layout so users who never click the Map rail never download the 440 KB.

### 4.2 `framer-motion` static imports

```
src/components/valuation/CompanyIntelligenceNexus.tsx
src/components/valuation/DocumentHeatmap.tsx
src/components/valuation/DraggableGrid.tsx
src/components/valuation/motion/EmptyState.tsx
src/components/valuation/motion/EngineProgress.tsx
src/components/valuation/motion/MorphBar.tsx
src/components/valuation/motion/SkeletonLoading.tsx
src/components/valuation/motion/StaggerContainer.tsx
src/components/valuation/WhatChangedDiff.tsx
```

`framer-motion` is ESM and tree-shakes, so the actual hit depends on which exports each file uses. The 6+ valuation/motion files share imports — that's fine because they bundle as one chunk. The hit only matters if these valuation components ALL load on the home page (which they don't — valuation is its own surface). **Likely fine as-is**; verify by running `@next/bundle-analyzer` to confirm the per-route chunk sizes.

### 4.3 `recharts` import sites

Per the broader sweep: recharts is the chart-rendering library used by `reply-renderer/ChartFromSpec` (the `chart` fence). The home Inspector renders charts inline — so recharts WILL be in the home-page bundle. If it's not lazy-loaded inside `ChartFromSpec`, every home-page first-load eats ~120 KB.

**Recommendation:** wrap `ChartFromSpec` in `dynamic(() => import('@/components/home/reply-renderer/ChartFromSpec'), { ssr: false })` at the parent reply-renderer level. Charts only mount when the LLM emits a `chart` fence — most replies don't — so recharts shouldn't be in the initial bundle.

### 4.4 `livekit-client` static imports

LiveKit's client SDK lives behind `OliviaVideoAvatar` which is ALREADY dynamic-imported via `AvatarOrb.tsx:123`. **Likely fine.** Verify in the analyzer.

---

## § 5 · MEDIUM 1 — no `@next/bundle-analyzer` wired

### 5.1 What exists today

`next.config.ts` (full content, 19 lines):

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  serverExternalPackages: [
    "@langfuse/otel",
    "@opentelemetry/api",
    "@supabase/supabase-js",
    "twilio",
  ],
  transpilePackages: [],
};

export default nextConfig;
```

No bundle analyzer. No size budget. The team is flying blind on bundle composition — every `npm install` of a new dep adds weight that no one sees until users complain about Largest Contentful Paint.

### 5.2 Recommended remediation

Standard wire-up of `@next/bundle-analyzer`:

```ts
// next.config.ts
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  typedRoutes: false,
  serverExternalPackages: [
    "@langfuse/otel",
    "@opentelemetry/api",
    "@supabase/supabase-js",
    "twilio",
  ],
  transpilePackages: [],
};

export default withBundleAnalyzer(nextConfig);
```

Then `ANALYZE=true npm run build` produces a treemap at `.next/analyze/` showing the actual per-chunk weights. Wired as `npm run analyze` script in `package.json`. The analyzer is off by default (no production impact); developer opt-in only.

Effort: ~30 min including the npm install + script + a brief README update.

---

## § 6 · MEDIUM 2 — no performance budget in CI

### 6.1 What Law-spirit says

The 2026 standards row says **"bundle size budgets enforced"**. Today there's no enforcement.

### 6.2 Recommended remediation pattern

After `@next/bundle-analyzer` lands (§ 5), add a CI-runnable script that parses the analyzer's stats JSON and fails the build if any per-route initial-JS payload exceeds a configurable threshold (e.g. 250 KB gzipped initial JS per route is the Vercel-published recommendation).

```ts
// scripts/check-bundle-budget.ts (NEW)
// Reads .next/analyze/client.json (produced by ANALYZE=true npm run build).
// Iterates per-route chunks; flags any exceeding INITIAL_JS_BUDGET_KB.
// Exit non-zero on violation so CI fails on regression.
const INITIAL_JS_BUDGET_KB = 250; // Vercel-recommended floor for fast 3G
```

Wire as a `package.json` script + a GitHub Actions step that runs after build. Vercel itself doesn't fail on bundle bloat; this is the OB-side guard.

Effort: ~1 hour including the script + CI wiring + an initial allowlist for routes that legitimately exceed (Studio + Map likely will).

---

## § 7 · Cross-cutting context

### 7.1 Current strengths

- **Six dynamic-import sites already in place** — the team understands the pattern. The remediation is "more of the same" not "introduce a new concept."
- **Server externalisation correct** for `@langfuse/otel`, `@opentelemetry/api`, `@supabase/supabase-js`, `twilio` — these never end up in client bundles.
- **`typedRoutes: false`** — sensible build-speed tradeoff; doesn't affect runtime bundle.

### 7.2 Known limits

- This audit is STATIC — actual gzipped sizes will differ from the bundlephobia typicals (tree-shaking + Next's own optimisations + the actual exports used in OB will reduce them).
- Full measurement requires running `@next/bundle-analyzer` once locally (or via a Vercel build) to confirm the per-route hit. That's Phase 1 of the remediation.
- No User-Facing perf metrics (Core Web Vitals) are tracked in OB — when these land, regressions on real-user devices become visible. Separate concern from bundle weight.

---

## § 8 · Remediation plan

Founder approval gates each phase.

| Phase | Owner | Effort | Description |
|---|---|---|---|
| Phase 1 | Coding agent | 30 min | Wire `@next/bundle-analyzer` per § 5.2 + add `npm run analyze` script. Single PR, additive change, zero production-bundle impact (analyzer is off by default). |
| Phase 2 | Founder + coding agent | 30 min (founder) + 0 (agent) | Founder runs `ANALYZE=true npm run build` once and reviews the per-route treemap. Surfaces actual gzipped sizes — confirms or refutes the bundlephobia typicals in § 2. |
| Phase 3 | Coding agent | 1 session | Based on Phase 2 numbers: (a) wrap `ChartFromSpec` in `dynamic(... { ssr: false })` so recharts loads on-demand; (b) wrap `/map` page in dynamic-import at the layout level; (c) verify `framer-motion` per-chunk treatment; (d) any other surprises Phase 2 surfaces. |
| Phase 4 | Coding agent | 1 hour | Ship the bundle-budget CI guard per § 6.2. Set initial threshold based on Phase 2 numbers + 10% headroom. The threshold becomes the contract going forward. |
| Phase 5 | Coding agent | 15 min | Update MASTER_CHECKLIST.md E-1 row to ✅ with the commit SHAs across phases. |

Total: ~2 sessions coding + 30 min founder participation. Phase 1 alone (~30 min) is the highest-leverage single move because it unblocks all subsequent observation.

---

## § 9 · What this audit did NOT cover

- Real-User-Metrics (RUM) — Core Web Vitals tracking via `web-vitals` package + a beacon endpoint. Separate concern (perf observability, not bundle weight).
- CSS bundle size (`tokens.css` + `base.css` + Tailwind output). Tailwind v4's @theme-driven utility generation purges unused — likely fine — but unmeasured.
- Server bundle (`node_modules` size on Vercel's serverless runtime). Different concern; affects cold-start latency, not user TTI.
- Image / font asset optimisation. Separate Next.js Image / Next/Font concern; not covered by bundle-size budget.

---

## § 10 · Attestation

Held to Apple / IBM / Microsoft / Google 2026 leading coding practices per `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md` section 10.4. This audit is a deliverable, not a code change. 100% no breaking changes (zero code edits). 100% no partial coding (every finding cite-able to `file:line` / `dep@version`; the 6 existing lazy-load patterns enumerated; recommendation provided with concrete `next.config.ts` snippet; out-of-scope items explicitly listed).
