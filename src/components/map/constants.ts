import type mapboxgl from "mapbox-gl";

// ─── Sector color palette ────────────────────────────────────────────────────
export const SECTOR_COLORS: Record<string, string> = {
  AI: "#8b5cf6",
  "Machine Learning": "#7c3aed",
  Fintech: "#10b981",
  "Prop-Tech": "#f97316",
  "Deep Tech": "#3b82f6",
  SaaS: "#ec4899",
  Biotech: "#22c55e",
  "Climate Tech": "#4ade80",
  "Cyber Security": "#ef4444",
  "Health Tech": "#14b8a6",
  "Creative Tech": "#f59e0b",
  "Enterprise Software": "#6366f1",
};
export const DEFAULT_SECTOR_COLOR = "#64748b";
export const ALL_SECTORS = Object.keys(SECTOR_COLORS);

export function sectorColor(sector: string): string {
  return SECTOR_COLORS[sector] || DEFAULT_SECTOR_COLOR;
}

// ─── Org type labels ─────────────────────────────────────────────────────────
export const ORG_TYPE_LABELS: Record<string, string> = {
  startup: "Startup", scaleup: "Scaleup", unicorn: "Unicorn",
  public_tech_company: "Public", vc_firm: "VC", angel_network: "Angel",
  family_office: "Family Office", accelerator: "Accelerator",
  incubator: "Incubator", university: "University", research_lab: "Research",
  coworking_operator: "Coworking", founder_club: "Founder Club",
  event_organizer: "Events", government_funding_body: "Government",
  service_provider: "Services", corporate_venture: "CVC",
  media_platform: "Media", proptech_fund: "PropTech Fund",
  fintech_fund: "Fintech Fund", ai_lab: "AI Lab",
};

// ─── Build Mapbox color expression from sectors ──────────────────────────────
export function buildSectorColorExpr(): mapboxgl.Expression {
  const cases: (string | mapboxgl.Expression)[] = ["match", ["get", "sector"]];
  for (const [sector, color] of Object.entries(SECTOR_COLORS)) {
    cases.push(sector, color);
  }
  cases.push(DEFAULT_SECTOR_COLOR);
  return cases as unknown as mapboxgl.Expression;
}

// ─── Layer IDs ───────────────────────────────────────────────────────────────
export const LAYER_IDS = {
  heat: "org-heat",
  clustersGlow: "org-clusters-glow",
  clusters: "org-clusters",
  clusterCount: "org-cluster-count",
  pins: "org-pins",
  districtLabels: "district-labels",
  buildings: "3d-buildings",
  districtFill: "district-fill",
  districtOutline: "district-outline",
  eventPins: "event-pins",
  coworkingPins: "coworking-pins",
  networkingPins: "networking-pins",
} as const;

// ─── Score-based blob colors (5-tier by Tech Gravity Score) ──────────────────
// White text + dark halo ensures WCAG AA on every color.
export const SCORE_BLOB_COLORS = {
  red:    "#F87171",  //  0–20  Emerging
  orange: "#FB923C",  // 21–40  Growing
  yellow: "#FACC15",  // 41–60  Moderate
  blue:   "#60A5FA",  // 61–80  Strong
  green:  "#4ADE80",  // 81–100 Leading
} as const;

// ─── View presets ────────────────────────────────────────────────────────────
export interface ViewPreset {
  label: string;
  pitch: number;
  bearing: number;
}

export const VIEW_PRESETS: ViewPreset[] = [
  { label: "Top Down", pitch: 0, bearing: 0 },
  { label: "3D View", pitch: 60, bearing: -20 },
  { label: "Street Level", pitch: 75, bearing: 0 },
];

// ─── Default map state ───────────────────────────────────────────────────────
export const MAP_DEFAULTS = {
  center: [-0.1180, 51.5150] as [number, number],
  zoom: 11.5,
  pitch: 45,
  bearing: -15,
  minZoom: 9,
  maxZoom: 17,
};
