import { Phase1Studio } from "@/components/phase1-studio";

/**
 * `/admin/phase1` — Phase-1 readiness dashboard.
 *
 * Was the root `/` route until Session 14 (Track C three-region shell).
 * Preserved here so existing readiness telemetry, integration probes,
 * and admin gates remain accessible.
 */
export default function Phase1AdminPage() {
  return <Phase1Studio />;
}
