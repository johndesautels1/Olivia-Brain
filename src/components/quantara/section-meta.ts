/**
 * Quantara — Q2 section UI metadata.
 *
 * Display chrome (lucide icon + concise short-label) for each of the 12
 * sections shipped in Q1 (`src/lib/quantara/sections.ts`). The schema
 * itself stays in `src/lib/quantara/`; only Q2's render surface lives
 * here.
 *
 * The LTM mockup (`D:\London-Tech-Map\public\assets\founder-valuation-form.html`)
 * uses 12 distinct accent colours per section (emerald, violet, amber,
 * sky, teal, orange, indigo, rose, red, lime, fuchsia, purple). Per
 * `docs/01_UI_DESIGN_SYSTEM.md` § 1.3 — "Aurum and Aether never appear
 * together in the same component. Aurum = decisions, value, finance,
 * verdict." — the rebuild standardises section icons on Aurum gold so
 * the brand reads cohesively. Per-section state colour comes from the
 * tier-coloured `Badge` / `CompletionRing` primitives instead.
 */
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Crown,
  Globe,
  Handshake,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Users,
  UserCircle2,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { QuantaraSectionId } from "@/lib/quantara";

/**
 * Per-section UI metadata. `iconLabel` is a short uppercase eyebrow
 * label that surfaces in the rail nav alongside the section title.
 */
export interface QuantaraSectionUiMeta {
  readonly icon: LucideIcon;
  readonly iconLabel: string;
}

export const QUANTARA_SECTION_UI_META: Readonly<
  Record<QuantaraSectionId, QuantaraSectionUiMeta>
> = Object.freeze({
  core_financials: { icon: TrendingUp, iconLabel: "FIN" },
  capital_structure: { icon: Building2, iconLabel: "CAP" },
  funding_history: { icon: Handshake, iconLabel: "FND" },
  current_round: { icon: Rocket, iconLabel: "CRR" },
  traction: { icon: Users, iconLabel: "TRC" },
  market: { icon: Globe, iconLabel: "MKT" },
  ip_moat: { icon: ShieldCheck, iconLabel: "IPM" },
  team: { icon: UserCircle2, iconLabel: "TEM" },
  risk: { icon: AlertTriangle, iconLabel: "RSK" },
  growth_levers: { icon: Zap, iconLabel: "GRW" },
  projections: { icon: BarChart3, iconLabel: "PRJ" },
  strategic: { icon: Crown, iconLabel: "STR" },
});
