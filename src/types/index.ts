// =============================================================================
// Shared types for London Tech Map
// =============================================================================

export interface TechGravityInput {
  organizationCount: number;
  investorCount: number;
  acceleratorCount: number;
  eventCount: number;
  coworkingCount: number;
  researchInstitutionCount: number;
  fundingActivityCount: number;
}

export interface TechGravityResult {
  score: number;
  components: Record<keyof TechGravityInput, number>;
  methodologyVersion: string;
}

export interface DistrictWithStats {
  id: string;
  name: string;
  slug: string;
  borough: string | null;
  latitude: number | null;
  longitude: number | null;
  transportScore: number | null;
  healthcareScore: number | null;
  walkabilityScore: number | null;
  notes: string | null;
  region: string | null;
  organizationCount: number;
  investorCount: number;
  acceleratorCount: number;
  eventCount: number;
  coworkingCount: number;
  researchInstitutionCount: number;
  techGravityScore: number;
  scoreTrend: "up" | "down" | "stable";
  topSectors: string[];
}
