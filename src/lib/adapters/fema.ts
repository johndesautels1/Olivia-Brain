/**
 * FEMA API Adapter
 *
 * FREE government API - no API key required
 * Docs: https://www.fema.gov/about/openfema/api
 *       https://hazards.fema.gov/gis/nfhl/rest/services
 *
 * Used for: Flood zone data, disaster declarations, risk assessment
 * Coverage: United States
 *
 * Endpoints:
 * - OpenFEMA: Disaster declarations, hazard mitigation grants
 * - NFHL: National Flood Hazard Layer (ArcGIS services)
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const OPENFEMA_API_BASE = "https://www.fema.gov/api/open/v2";
const NFHL_API_BASE = "https://hazards.fema.gov/gis/nfhl/rest/services";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DisasterType =
  | "DR" // Major Disaster
  | "EM" // Emergency
  | "FM" // Fire Management
  | "FS"; // Fire Suppression

export type IncidentType =
  | "Flood"
  | "Severe Storm"
  | "Hurricane"
  | "Tornado"
  | "Fire"
  | "Earthquake"
  | "Coastal Storm"
  | "Severe Ice Storm"
  | "Snow"
  | "Drought"
  | "Volcano"
  | "Mudslide"
  | "Other";

export interface DisasterDeclaration {
  disasterNumber: number;
  declarationDate: string;
  fyDeclared: number;
  incidentType: IncidentType;
  declarationType: DisasterType;
  declarationTitle: string;
  state: string;
  designatedArea: string;
  ihProgramDeclared: boolean;
  iaProgramDeclared: boolean;
  paProgramDeclared: boolean;
  hmProgramDeclared: boolean;
  incidentBeginDate: string;
  incidentEndDate?: string;
  closeoutDate?: string;
  hash: string;
  lastRefresh: string;
}

export interface DisasterDeclarationsResponse {
  DisasterDeclarationsSummaries: DisasterDeclaration[];
  metadata: {
    skip: number;
    top: number;
    count: number;
  };
}

export interface FloodZone {
  floodZone: string;
  zoneSubtype?: string;
  sfha: boolean; // Special Flood Hazard Area
  arFloodZone?: boolean;
  description: string;
  annualFloodChance?: string;
}

export interface FloodRiskData {
  latitude: number;
  longitude: number;
  address?: string;
  floodZone: FloodZone | null;
  panelNumber?: string;
  communityName?: string;
  countyFips?: string;
  effectiveDate?: string;
  inSFHA: boolean;
  requiresFloodInsurance: boolean;
}

export interface DisasterSummary {
  state: string;
  totalDisasters: number;
  majorDisasters: number;
  emergencies: number;
  fireManagement: number;
  byType: Record<string, number>;
  recentDisasters: {
    title: string;
    type: IncidentType;
    date: string;
    area: string;
  }[];
}

export class FEMAAdapterError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor({
    code,
    message,
    status,
    retryable = false,
  }: {
    code: string;
    message: string;
    status: number;
    retryable?: boolean;
  }) {
    super(message);
    this.name = "FEMAAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

// FEMA API is free and doesn't require an API key
export function isFEMAConfigured(): boolean {
  return true; // Always configured - no API key needed
}

// ─── Core Request Functions ──────────────────────────────────────────────────

interface RequestOptions {
  params?: Record<string, string | number | undefined>;
  timeoutMs?: number;
}

async function requestOpenFEMA<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = new URL(`${OPENFEMA_API_BASE}${endpoint}`);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new FEMAAdapterError({
      code: "FEMA_REQUEST_FAILED",
      message: `FEMA API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500,
    });
  }

  return response.json() as Promise<T>;
}

async function requestNFHL<T>(
  service: string,
  layer: number,
  params: Record<string, string | number>,
  options: RequestOptions = {}
): Promise<T> {
  const url = new URL(`${NFHL_API_BASE}/${service}/MapServer/${layer}/query`);

  url.searchParams.set("f", "json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new FEMAAdapterError({
      code: "NFHL_REQUEST_FAILED",
      message: `NFHL API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500,
    });
  }

  return response.json() as Promise<T>;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Get disaster declarations for a state
 */
export async function getDisasterDeclarations(
  stateCode: string,
  options?: {
    startYear?: number;
    endYear?: number;
    incidentType?: IncidentType;
    limit?: number;
  }
): Promise<DisasterDeclaration[]> {
  const currentYear = new Date().getFullYear();
  const startYear = options?.startYear ?? currentYear - 10;
  const endYear = options?.endYear ?? currentYear;

  let filter = `state eq '${stateCode.toUpperCase()}' and fyDeclared ge ${startYear} and fyDeclared le ${endYear}`;

  if (options?.incidentType) {
    filter += ` and incidentType eq '${options.incidentType}'`;
  }

  const data = await requestOpenFEMA<DisasterDeclarationsResponse>(
    "/DisasterDeclarationsSummaries",
    {
      params: {
        $filter: filter,
        $orderby: "declarationDate desc",
        $top: options?.limit ?? 100,
      },
    }
  );

  return data.DisasterDeclarationsSummaries;
}

/**
 * Get recent disasters nationwide
 */
export async function getRecentDisasters(
  days: number = 90
): Promise<DisasterDeclaration[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const dateStr = startDate.toISOString().split("T")[0];

  const data = await requestOpenFEMA<DisasterDeclarationsResponse>(
    "/DisasterDeclarationsSummaries",
    {
      params: {
        $filter: `declarationDate ge '${dateStr}'`,
        $orderby: "declarationDate desc",
        $top: 100,
      },
    }
  );

  return data.DisasterDeclarationsSummaries;
}

/**
 * Get flood zone for a specific location
 */
export async function getFloodZone(
  lat: number,
  lon: number
): Promise<FloodRiskData> {
  try {
    // Query the NFHL Flood Hazard Zones layer (layer 28)
    const data = await requestNFHL<{
      features: {
        attributes: {
          FLD_ZONE: string;
          ZONE_SUBTY?: string;
          SFHA_TF: string;
          AR_ZONE?: string;
        };
      }[];
    }>(
      "public/NFHL",
      28, // Flood Hazard Zones layer
      {
        geometry: `${lon},${lat}`,
        geometryType: "esriGeometryPoint",
        spatialRel: "esriSpatialRelIntersects",
        outFields: "FLD_ZONE,ZONE_SUBTY,SFHA_TF,AR_ZONE",
        returnGeometry: "false",
      }
    );

    if (data.features.length === 0) {
      return {
        latitude: lat,
        longitude: lon,
        floodZone: null,
        inSFHA: false,
        requiresFloodInsurance: false,
      };
    }

    const attrs = data.features[0].attributes;
    const floodZone = interpretFloodZone(attrs.FLD_ZONE);

    return {
      latitude: lat,
      longitude: lon,
      floodZone: {
        floodZone: attrs.FLD_ZONE,
        zoneSubtype: attrs.ZONE_SUBTY,
        sfha: attrs.SFHA_TF === "T",
        arFloodZone: attrs.AR_ZONE === "T",
        description: floodZone.description,
        annualFloodChance: floodZone.annualChance,
      },
      inSFHA: attrs.SFHA_TF === "T",
      requiresFloodInsurance: attrs.SFHA_TF === "T",
    };
  } catch {
    // NFHL may not have coverage for all areas
    return {
      latitude: lat,
      longitude: lon,
      floodZone: null,
      inSFHA: false,
      requiresFloodInsurance: false,
    };
  }
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Get disaster summary for a state
 */
export async function getDisasterSummary(
  stateCode: string,
  years: number = 10
): Promise<DisasterSummary> {
  const declarations = await getDisasterDeclarations(stateCode, {
    startYear: new Date().getFullYear() - years,
    limit: 500,
  });

  const byType: Record<string, number> = {};
  let majorDisasters = 0;
  let emergencies = 0;
  let fireManagement = 0;

  for (const d of declarations) {
    byType[d.incidentType] = (byType[d.incidentType] || 0) + 1;

    switch (d.declarationType) {
      case "DR":
        majorDisasters++;
        break;
      case "EM":
        emergencies++;
        break;
      case "FM":
      case "FS":
        fireManagement++;
        break;
    }
  }

  return {
    state: stateCode.toUpperCase(),
    totalDisasters: declarations.length,
    majorDisasters,
    emergencies,
    fireManagement,
    byType,
    recentDisasters: declarations.slice(0, 5).map((d) => ({
      title: d.declarationTitle,
      type: d.incidentType,
      date: d.declarationDate,
      area: d.designatedArea,
    })),
  };
}

/**
 * Get disaster risk score for relocation analysis (0-100, higher = safer)
 */
export async function getDisasterRiskScore(
  stateCode: string
): Promise<{
  state: string;
  riskScore: number;
  disasterFrequency: "low" | "moderate" | "high" | "very_high";
  topRisks: string[];
  interpretation: string;
}> {
  const summary = await getDisasterSummary(stateCode, 20);

  // Calculate disasters per year
  const disastersPerYear = summary.totalDisasters / 20;

  // Risk score (inverse of frequency)
  let riskScore = 100;
  riskScore -= Math.min(disastersPerYear * 5, 50); // -5 per disaster/year, max -50
  riskScore -= summary.majorDisasters * 0.5; // -0.5 per major disaster
  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

  // Determine frequency level
  let disasterFrequency: "low" | "moderate" | "high" | "very_high";
  if (disastersPerYear < 1) disasterFrequency = "low";
  else if (disastersPerYear < 3) disasterFrequency = "moderate";
  else if (disastersPerYear < 5) disasterFrequency = "high";
  else disasterFrequency = "very_high";

  // Top risks
  const topRisks = Object.entries(summary.byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  let interpretation: string;
  if (riskScore >= 80) interpretation = "Low disaster risk - infrequent natural disasters";
  else if (riskScore >= 60) interpretation = "Moderate disaster risk - occasional events";
  else if (riskScore >= 40) interpretation = "Elevated disaster risk - regular events";
  else interpretation = "High disaster risk - frequent natural disasters";

  return {
    state: stateCode.toUpperCase(),
    riskScore,
    disasterFrequency,
    topRisks,
    interpretation,
  };
}

/**
 * Get flood risk score for a location (0-100, higher = safer)
 */
export async function getFloodRiskScore(
  lat: number,
  lon: number
): Promise<{
  latitude: number;
  longitude: number;
  riskScore: number;
  floodZone: string | null;
  requiresInsurance: boolean;
  interpretation: string;
}> {
  const floodData = await getFloodZone(lat, lon);

  let riskScore: number;
  let interpretation: string;

  if (!floodData.floodZone) {
    riskScore = 85;
    interpretation = "No flood zone data available - likely low risk";
  } else {
    const zone = floodData.floodZone.floodZone;

    if (zone.startsWith("X") || zone === "D") {
      riskScore = 90;
      interpretation = "Minimal flood risk - outside high-risk zones";
    } else if (zone.startsWith("A") || zone.startsWith("V")) {
      riskScore = floodData.floodZone.sfha ? 20 : 40;
      interpretation = floodData.floodZone.sfha
        ? "High flood risk - in Special Flood Hazard Area, insurance required"
        : "Moderate flood risk - some flood potential";
    } else {
      riskScore = 70;
      interpretation = "Low-moderate flood risk";
    }
  }

  return {
    latitude: lat,
    longitude: lon,
    riskScore,
    floodZone: floodData.floodZone?.floodZone ?? null,
    requiresInsurance: floodData.requiresFloodInsurance,
    interpretation,
  };
}

// ─── Flood Zone Interpretation ───────────────────────────────────────────────

export function interpretFloodZone(zone: string): {
  description: string;
  annualChance: string;
  riskLevel: "high" | "moderate" | "low" | "minimal";
} {
  const zoneUpper = zone.toUpperCase();

  // High-risk coastal zones
  if (zoneUpper.startsWith("V")) {
    return {
      description: "Coastal high hazard area with wave action",
      annualChance: "1% (100-year flood)",
      riskLevel: "high",
    };
  }

  // High-risk zones
  if (zoneUpper.startsWith("A")) {
    if (zoneUpper === "AE" || zoneUpper === "A") {
      return {
        description: "High-risk flood zone - 1% annual chance",
        annualChance: "1% (100-year flood)",
        riskLevel: "high",
      };
    }
    if (zoneUpper === "AH") {
      return {
        description: "Shallow flooding area (1-3 feet)",
        annualChance: "1% (100-year flood)",
        riskLevel: "high",
      };
    }
    if (zoneUpper === "AO") {
      return {
        description: "Sheet flow flooding area",
        annualChance: "1% (100-year flood)",
        riskLevel: "high",
      };
    }
    return {
      description: "Special Flood Hazard Area",
      annualChance: "1% (100-year flood)",
      riskLevel: "high",
    };
  }

  // Moderate-risk zones
  if (zoneUpper === "X" || zoneUpper.includes("SHADED")) {
    return {
      description: "Moderate flood hazard area",
      annualChance: "0.2% (500-year flood)",
      riskLevel: "moderate",
    };
  }

  // Minimal risk zones
  if (zoneUpper.startsWith("X") || zoneUpper === "C") {
    return {
      description: "Minimal flood hazard area",
      annualChance: "< 0.2%",
      riskLevel: "minimal",
    };
  }

  // Undetermined
  if (zoneUpper === "D") {
    return {
      description: "Undetermined flood hazard - study not complete",
      annualChance: "Unknown",
      riskLevel: "low",
    };
  }

  return {
    description: `Flood zone ${zone}`,
    annualChance: "Unknown",
    riskLevel: "low",
  };
}

// ─── State Codes ─────────────────────────────────────────────────────────────

export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
  PR: "Puerto Rico", VI: "Virgin Islands", GU: "Guam",
  AS: "American Samoa", MP: "Northern Mariana Islands",
};
