/**
 * FBI Crime Data API Adapter
 *
 * FREE government API - no API key required
 * Docs: https://crime-data-explorer.fr.cloud.gov/pages/docApi
 * GitHub: https://github.com/fbi-cde/crime-data-api
 *
 * Used for: US crime statistics for neighborhood safety evaluation
 * Coverage: United States (UCR data)
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const FBI_API_BASE = "https://api.usa.gov/crime/fbi/cde";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CrimeType =
  | "aggravated-assault"
  | "burglary"
  | "larceny"
  | "motor-vehicle-theft"
  | "homicide"
  | "rape"
  | "robbery"
  | "arson"
  | "violent-crime"
  | "property-crime";

export interface AgencySummary {
  ori: string;
  agency_name: string;
  agency_type_name: string;
  state_abbr: string;
  state_name: string;
  city_name?: string;
  county_name?: string;
  population?: number;
  latitude?: number;
  longitude?: number;
}

export interface CrimeSummary {
  year: number;
  actual: number;
  cleared: number;
  population?: number;
  rate_per_100k?: number;
}

export interface StateCrimeData {
  state_abbr: string;
  state_name: string;
  year: number;
  population: number;
  violent_crime: number;
  homicide: number;
  rape_legacy?: number;
  rape_revised?: number;
  robbery: number;
  aggravated_assault: number;
  property_crime: number;
  burglary: number;
  larceny: number;
  motor_vehicle_theft: number;
  arson?: number;
}

export interface NationalCrimeData {
  year: number;
  population: number;
  violent_crime: number;
  violent_crime_rate: number;
  homicide: number;
  homicide_rate: number;
  rape_legacy?: number;
  rape_revised?: number;
  robbery: number;
  robbery_rate: number;
  aggravated_assault: number;
  aggravated_assault_rate: number;
  property_crime: number;
  property_crime_rate: number;
  burglary: number;
  burglary_rate: number;
  larceny: number;
  larceny_rate: number;
  motor_vehicle_theft: number;
  motor_vehicle_theft_rate: number;
}

export interface AgencyParticipation {
  year: number;
  total_agencies: number;
  reporting_agencies: number;
  participation_rate: number;
  population_covered: number;
}

export class FBICrimeDataAdapterError extends Error {
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
    this.name = "FBICrimeDataAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

// FBI Crime Data API is free and doesn't require an API key
export function isFBICrimeDataConfigured(): boolean {
  return true; // Always configured - no API key needed
}

// ─── Core Request Function ───────────────────────────────────────────────────

interface RequestOptions {
  params?: Record<string, string | number | undefined>;
  timeoutMs?: number;
}

async function requestFBICrimeData<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = new URL(`${FBI_API_BASE}${endpoint}`);

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
    throw new FBICrimeDataAdapterError({
      code: "FBI_CRIME_DATA_REQUEST_FAILED",
      message: `FBI Crime Data API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500,
    });
  }

  const payload = await response.json();
  return payload as T;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Get national crime estimates for a year range
 */
export async function getNationalCrimeData(
  startYear: number,
  endYear: number
): Promise<NationalCrimeData[]> {
  const results: NationalCrimeData[] = [];

  for (let year = startYear; year <= endYear; year++) {
    try {
      const data = await requestFBICrimeData<{ results: NationalCrimeData[] }>(
        `/estimate/national/${year}/${year}`
      );
      if (data.results?.length > 0) {
        results.push(...data.results);
      }
    } catch {
      // Skip years with no data
    }
  }

  return results;
}

/**
 * Get state crime data for a specific state and year range
 */
export async function getStateCrimeData(
  stateAbbr: string,
  startYear: number,
  endYear: number
): Promise<StateCrimeData[]> {
  const data = await requestFBICrimeData<{ results: StateCrimeData[] }>(
    `/estimate/state/${stateAbbr}/${startYear}/${endYear}`
  );
  return data.results || [];
}

/**
 * Search for law enforcement agencies
 */
export async function searchAgencies(
  query: string
): Promise<AgencySummary[]> {
  const data = await requestFBICrimeData<{ results: AgencySummary[] }>(
    "/agency/search",
    { params: { name: query } }
  );
  return data.results || [];
}

/**
 * Get agencies by state
 */
export async function getAgenciesByState(
  stateAbbr: string
): Promise<AgencySummary[]> {
  const data = await requestFBICrimeData<{ results: AgencySummary[] }>(
    `/agency/byStateAbbr/${stateAbbr}`
  );
  return data.results || [];
}

/**
 * Get crime data for a specific agency (by ORI code)
 */
export async function getAgencyCrimeData(
  ori: string,
  startYear: number,
  endYear: number
): Promise<CrimeSummary[]> {
  const data = await requestFBICrimeData<{ results: CrimeSummary[] }>(
    `/summarized/agency/${ori}/offenses/${startYear}/${endYear}`
  );
  return data.results || [];
}

/**
 * Get participation data (how many agencies reported)
 */
export async function getParticipationData(
  stateAbbr: string,
  startYear: number,
  endYear: number
): Promise<AgencyParticipation[]> {
  const data = await requestFBICrimeData<{ results: AgencyParticipation[] }>(
    `/participation/state/${stateAbbr}/${startYear}/${endYear}`
  );
  return data.results || [];
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Get crime rate comparison between states
 */
export async function compareStateCrimeRates(
  stateAbbrs: string[],
  year: number
): Promise<{
  state: string;
  violentCrimeRate: number;
  propertyCrimeRate: number;
  homicideRate: number;
  population: number;
}[]> {
  const results = await Promise.all(
    stateAbbrs.map(async (state) => {
      const data = await getStateCrimeData(state, year, year);
      if (data.length === 0) return null;

      const d = data[0];
      const pop = d.population || 1;

      return {
        state: d.state_abbr,
        violentCrimeRate: Math.round((d.violent_crime / pop) * 100000),
        propertyCrimeRate: Math.round((d.property_crime / pop) * 100000),
        homicideRate: Math.round((d.homicide / pop) * 100000 * 10) / 10,
        population: d.population,
      };
    })
  );

  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

/**
 * Get 5-year crime trend for a state
 */
export async function getStateCrimeTrend(
  stateAbbr: string
): Promise<{
  state: string;
  years: number[];
  violentCrimeRates: number[];
  propertyCrimeRates: number[];
  trend: "increasing" | "decreasing" | "stable";
}> {
  const currentYear = new Date().getFullYear() - 1; // Most recent complete year
  const startYear = currentYear - 4;

  const data = await getStateCrimeData(stateAbbr, startYear, currentYear);

  const years: number[] = [];
  const violentRates: number[] = [];
  const propertyRates: number[] = [];

  for (const d of data) {
    const pop = d.population || 1;
    years.push(d.year);
    violentRates.push(Math.round((d.violent_crime / pop) * 100000));
    propertyRates.push(Math.round((d.property_crime / pop) * 100000));
  }

  // Calculate trend (simple linear comparison of first vs last)
  let trend: "increasing" | "decreasing" | "stable" = "stable";
  if (violentRates.length >= 2) {
    const first = violentRates[0];
    const last = violentRates[violentRates.length - 1];
    const change = ((last - first) / first) * 100;

    if (change > 5) trend = "increasing";
    else if (change < -5) trend = "decreasing";
  }

  return {
    state: stateAbbr,
    years,
    violentCrimeRates: violentRates,
    propertyCrimeRates: propertyRates,
    trend,
  };
}

/**
 * Get safety score for a state (normalized 0-100, higher = safer)
 */
export async function getStateSafetyScore(
  stateAbbr: string,
  year?: number
): Promise<{
  state: string;
  year: number;
  safetyScore: number;
  violentCrimeRate: number;
  propertyCrimeRate: number;
  interpretation: string;
}> {
  const targetYear = year || new Date().getFullYear() - 1;
  const data = await getStateCrimeData(stateAbbr, targetYear, targetYear);

  if (data.length === 0) {
    throw new FBICrimeDataAdapterError({
      code: "FBI_NO_DATA",
      message: `No crime data available for ${stateAbbr} in ${targetYear}`,
      status: 404,
    });
  }

  const d = data[0];
  const pop = d.population || 1;
  const violentRate = (d.violent_crime / pop) * 100000;
  const propertyRate = (d.property_crime / pop) * 100000;

  // National averages (approximate) for normalization
  const nationalViolentAvg = 380; // per 100k
  const nationalPropertyAvg = 2000; // per 100k

  // Calculate safety score (inverse of crime rate, normalized)
  // Lower crime = higher score
  const violentScore = Math.max(0, Math.min(100, 100 - (violentRate / nationalViolentAvg) * 50));
  const propertyScore = Math.max(0, Math.min(100, 100 - (propertyRate / nationalPropertyAvg) * 50));

  // Weighted average (violent crime weighted more heavily)
  const safetyScore = Math.round(violentScore * 0.7 + propertyScore * 0.3);

  let interpretation: string;
  if (safetyScore >= 80) interpretation = "Very safe - well below national averages";
  else if (safetyScore >= 60) interpretation = "Safe - below national averages";
  else if (safetyScore >= 40) interpretation = "Average - near national averages";
  else if (safetyScore >= 20) interpretation = "Below average - above national averages";
  else interpretation = "Higher crime area - significantly above national averages";

  return {
    state: stateAbbr,
    year: targetYear,
    safetyScore,
    violentCrimeRate: Math.round(violentRate),
    propertyCrimeRate: Math.round(propertyRate),
    interpretation,
  };
}

// ─── US State Codes ──────────────────────────────────────────────────────────

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
};
