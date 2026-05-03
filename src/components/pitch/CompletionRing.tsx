/**
 * `CompletionRing` (legacy import path).
 *
 * Re-exports the canonical `CompletionRing` from
 * `@/components/primitives/CompletionRing`. The canonical version uses
 * Aurum / Aether design tokens (no raw hex codes) and adds the
 * `data-ring-tier` attribute. Existing imports of
 * `@/components/pitch/CompletionRing` keep working without change.
 */

export {
  CompletionRing,
  type CompletionRingProps,
} from "@/components/primitives/CompletionRing";
export { CompletionRing as default } from "@/components/primitives/CompletionRing";
