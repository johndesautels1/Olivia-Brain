export type OliviaDomainAppId =
  | "clues_intelligence"
  | "clues_london"
  | "clues_lifescore"
  | "heart_recovery"
  | "transit_environment"
  | "brokerage";

export type OliviaDomainCapability =
  | "analytics"
  | "calendar"
  | "communications"
  | "crm"
  | "documents"
  | "health"
  | "travel";

export interface OliviaDomainAppRegistryEntry {
  id: OliviaDomainAppId;
  label: string;
  systemOfRecord: string;
  baseUrlEnv: string;
  sharedSecretEnv: string;
  capabilities: OliviaDomainCapability[];
  notes: string;
}

export const DOMAIN_APP_REGISTRY: OliviaDomainAppRegistryEntry[] = [
  {
    id: "clues_intelligence",
    label: "CLUES Intelligence",
    systemOfRecord: "Relocation analytics, client workflow state, and deliverables.",
    baseUrlEnv: "CLUES_INTELLIGENCE_BASE_URL",
    sharedSecretEnv: "CLUES_INTELLIGENCE_INTERNAL_API_KEY",
    capabilities: ["analytics", "crm", "documents"],
    notes: "Predictive relocation and client-strategy platform.",
  },
  {
    id: "clues_london",
    label: "CLUES London",
    systemOfRecord: "London ecosystem graph, events, and in-house calendar subsystem.",
    baseUrlEnv: "CLUES_LONDON_BASE_URL",
    sharedSecretEnv: "CLUES_LONDON_INTERNAL_API_KEY",
    capabilities: ["analytics", "calendar", "documents"],
    notes: "Ecosystem intelligence hub and the current calendar authority.",
  },
  {
    id: "clues_lifescore",
    label: "CLUES LifeScore",
    systemOfRecord: "Metric engines, city comparison models, and comparison outputs.",
    baseUrlEnv: "CLUES_LIFESCORE_BASE_URL",
    sharedSecretEnv: "CLUES_LIFESCORE_INTERNAL_API_KEY",
    capabilities: ["analytics"],
    notes: "Modular metric comparison platform.",
  },
  {
    id: "heart_recovery",
    label: "Heart Recovery",
    systemOfRecord: "Provider-patient workflow state and recovery journey data.",
    baseUrlEnv: "HEART_RECOVERY_BASE_URL",
    sharedSecretEnv: "HEART_RECOVERY_INTERNAL_API_KEY",
    capabilities: ["communications", "documents", "health"],
    notes: "Post-surgery recovery coordination platform.",
  },
  {
    id: "transit_environment",
    label: "Transit and Environment",
    systemOfRecord: "Point-to-point travel logic, environmental overlays, and rider metrics.",
    baseUrlEnv: "TRANSIT_ENVIRONMENT_BASE_URL",
    sharedSecretEnv: "TRANSIT_ENVIRONMENT_INTERNAL_API_KEY",
    capabilities: ["analytics", "travel"],
    notes: "Transit and environmental route intelligence.",
  },
  {
    id: "brokerage",
    label: "John E. Desautels & Associates",
    systemOfRecord: "Brokerage client lifecycle, transaction state, and operational CRM.",
    baseUrlEnv: "BROKERAGE_BASE_URL",
    sharedSecretEnv: "BROKERAGE_INTERNAL_API_KEY",
    capabilities: ["communications", "crm", "documents"],
    notes: "Florida Tampa Bay brokerage operations.",
  },
];
