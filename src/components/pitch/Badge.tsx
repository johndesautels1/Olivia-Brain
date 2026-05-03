/**
 * `Badge` (legacy import path).
 *
 * Re-exports the canonical `Badge` from
 * `@/components/primitives/Badge`. The canonical version uses
 * Aurum / Aether design tokens (no raw hex codes) and adds the
 * `data-badge-tier` attribute. Existing imports of
 * `@/components/pitch/Badge` keep working without change.
 */

export { Badge, type BadgeProps } from "@/components/primitives/Badge";
export { Badge as default } from "@/components/primitives/Badge";
