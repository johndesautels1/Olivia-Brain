/**
 * SchoolDigger API Adapter
 *
 * Free trial available, then tiered pricing
 * Docs: https://developer.schooldigger.com/
 *
 * Used for: School ratings and data for family relocation
 * Coverage: 120,000+ US schools
 *
 * Alternative to GreatSchools ($97.50/month)
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 10_000;
const SCHOOLDIGGER_API_BASE = "https://api.schooldigger.com/v2.0";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SchoolLevel = "Elementary" | "Middle" | "High" | "Private";
export type SchoolType = "public" | "private" | "charter";

export interface SchoolSummary {
  schoolid: string;
  schoolName: string;
  address: {
    street: string;
    city: string;
    state: string;
    stateFull: string;
    zip: string;
    zip4?: string;
    cityURL?: string;
    html: string;
  };
  phone?: string;
  url?: string;
  lowGrade: string;
  highGrade: string;
  schoolLevel: SchoolLevel;
  isCharter: boolean;
  isMagnet: boolean;
  isVirtual: boolean;
  isTitleI: boolean;
  isTitleISchoolwide: boolean;
  rankHistory?: RankHistory[];
  rankMovement?: number;
  schoolYearlyDetails?: SchoolYearlyDetails[];
  district?: DistrictSummary;
  locationIsApproximate: boolean;
  latitude: number;
  longitude: number;
  isPrivate: boolean;
}

export interface RankHistory {
  year: number;
  rank: number;
  rankOf: number;
  rankStars: number;
  rankStatewidePercentage: number;
  rankLevel: SchoolLevel;
  averageStandardScore?: number;
}

export interface SchoolYearlyDetails {
  year: number;
  numberOfStudents?: number;
  percentFreeDiscLunch?: number;
  percentOfAfricanAmericanStudents?: number;
  percentOfAsianStudents?: number;
  percentOfHispanicStudents?: number;
  percentOfIndianStudents?: number;
  percentOfPacificIslanderStudents?: number;
  percentOfWhiteStudents?: number;
  percentOfTwoOrMoreRaceStudents?: number;
  teachersFulltime?: number;
  pupilTeacherRatio?: number;
  numberEnglishLanguageLearners?: number;
}

export interface DistrictSummary {
  districtID: string;
  districtName: string;
  url?: string;
  address: {
    city: string;
    state: string;
  };
  rankURL?: string;
}

export interface SchoolSearchParams {
  st: string;           // State abbreviation (required)
  city?: string;
  zip?: string;
  districtid?: string;
  level?: SchoolLevel;
  isCharter?: boolean;
  isMagnet?: boolean;
  isVirtual?: boolean;
  isTitleI?: boolean;
  q?: string;           // Search query
  nearLatitude?: number;
  nearLongitude?: number;
  boundaryAddress?: string;
  distanceMiles?: number;
  page?: number;
  perPage?: number;     // Max 50
  sortBy?: "schoolName" | "rank" | "distance";
}

export interface SchoolSearchResponse {
  numberOfSchools: number;
  numberOfPages: number;
  schoolList: SchoolSummary[];
}

export interface DistrictSearchParams {
  st: string;
  city?: string;
  zip?: string;
  q?: string;
  page?: number;
  perPage?: number;
}

export interface DistrictSearchResponse {
  numberOfDistricts: number;
  numberOfPages: number;
  districtList: DistrictDetail[];
}

export interface DistrictDetail {
  districtID: string;
  districtName: string;
  address: {
    street: string;
    city: string;
    state: string;
    stateFull: string;
    zip: string;
  };
  phone?: string;
  url?: string;
  lowGrade: string;
  highGrade: string;
  numberTotalSchools: number;
  numberPrimarySchools: number;
  numberMiddleSchools: number;
  numberHighSchools: number;
  numberAlternativeSchools: number;
  rankURL?: string;
  rankHistory?: RankHistory[];
  districtYearlyDetails?: DistrictYearlyDetails[];
  county?: CountySummary;
  boundaryURL?: string;
  isWithinBoundary?: boolean;
}

export interface DistrictYearlyDetails {
  year: number;
  numberOfStudents?: number;
  numberOfTeachers?: number;
  districtSpendingPerPupilInstruction?: number;
  districtSpendingPerPupilTotal?: number;
}

export interface CountySummary {
  countyName: string;
  countyURL?: string;
}

export class SchoolDiggerAdapterError extends Error {
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
    this.name = "SchoolDiggerAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getSchoolDiggerConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.SCHOOLDIGGER_API_KEY,
    appId: env.SCHOOLDIGGER_APP_ID,
  };
}

export function isSchoolDiggerConfigured(): boolean {
  const { apiKey, appId } = getSchoolDiggerConfig();
  return Boolean(apiKey && appId);
}

function assertConfigured() {
  const { apiKey, appId } = getSchoolDiggerConfig();
  if (!apiKey || !appId) {
    throw new SchoolDiggerAdapterError({
      code: "SCHOOLDIGGER_NOT_CONFIGURED",
      message: "SchoolDigger API key and App ID must be configured.",
      status: 503,
    });
  }
  return { apiKey, appId };
}

// ─── Core Request Function ───────────────────────────────────────────────────

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

// Helper to convert typed params to Record
function toParams<T extends object>(obj: T): Record<string, string | number | boolean | undefined> {
  return obj as Record<string, string | number | boolean | undefined>;
}

async function requestSchoolDigger<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { apiKey, appId } = assertConfigured();

  const url = new URL(`${SCHOOLDIGGER_API_BASE}${endpoint}`);
  url.searchParams.set("appID", appId);
  url.searchParams.set("appKey", apiKey);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new SchoolDiggerAdapterError({
      code: "SCHOOLDIGGER_REQUEST_FAILED",
      message: `SchoolDigger API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return response.json() as Promise<T>;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Search for schools by criteria
 */
export async function searchSchools(
  params: SchoolSearchParams
): Promise<SchoolSearchResponse> {
  return requestSchoolDigger<SchoolSearchResponse>("/schools", { params: toParams(params) });
}

/**
 * Get details for a specific school
 */
export async function getSchool(schoolId: string): Promise<SchoolSummary> {
  return requestSchoolDigger<SchoolSummary>(`/schools/${schoolId}`);
}

/**
 * Search for school districts
 */
export async function searchDistricts(
  params: DistrictSearchParams
): Promise<DistrictSearchResponse> {
  return requestSchoolDigger<DistrictSearchResponse>("/districts", { params: toParams(params) });
}

/**
 * Get details for a specific district
 */
export async function getDistrict(districtId: string): Promise<DistrictDetail> {
  return requestSchoolDigger<DistrictDetail>(`/districts/${districtId}`);
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Find top-rated schools near a location
 */
export async function findTopSchoolsNearby(
  lat: number,
  lng: number,
  state: string,
  options?: {
    level?: SchoolLevel;
    distanceMiles?: number;
    limit?: number;
  }
): Promise<SchoolSummary[]> {
  const response = await searchSchools({
    st: state,
    nearLatitude: lat,
    nearLongitude: lng,
    distanceMiles: options?.distanceMiles ?? 10,
    level: options?.level,
    sortBy: "rank",
    perPage: options?.limit ?? 20,
  });

  return response.schoolList;
}

/**
 * Find schools by city
 */
export async function findSchoolsByCity(
  city: string,
  state: string,
  level?: SchoolLevel
): Promise<SchoolSummary[]> {
  const response = await searchSchools({
    st: state,
    city,
    level,
    sortBy: "rank",
    perPage: 50,
  });

  return response.schoolList;
}

/**
 * Find schools by ZIP code
 */
export async function findSchoolsByZip(
  zip: string,
  state: string,
  level?: SchoolLevel
): Promise<SchoolSummary[]> {
  const response = await searchSchools({
    st: state,
    zip,
    level,
    sortBy: "rank",
    perPage: 50,
  });

  return response.schoolList;
}

/**
 * Get school district for an address
 */
export async function getDistrictForAddress(
  address: string,
  state: string
): Promise<DistrictDetail | null> {
  const response = await searchDistricts({
    st: state,
    q: address,
    perPage: 1,
  });

  return response.districtList[0] || null;
}

/**
 * Get education summary for a location
 */
export async function getEducationSummary(
  city: string,
  state: string
): Promise<{
  totalSchools: number;
  elementarySchools: { count: number; topRated: SchoolSummary[] };
  middleSchools: { count: number; topRated: SchoolSummary[] };
  highSchools: { count: number; topRated: SchoolSummary[] };
  averageRating: number;
}> {
  const [elementary, middle, high] = await Promise.all([
    searchSchools({ st: state, city, level: "Elementary", sortBy: "rank", perPage: 10 }),
    searchSchools({ st: state, city, level: "Middle", sortBy: "rank", perPage: 10 }),
    searchSchools({ st: state, city, level: "High", sortBy: "rank", perPage: 10 }),
  ]);

  const allSchools = [
    ...elementary.schoolList,
    ...middle.schoolList,
    ...high.schoolList,
  ];

  const schoolsWithRank = allSchools.filter((s) => s.rankHistory?.length);
  const avgRating = schoolsWithRank.length > 0
    ? schoolsWithRank.reduce((sum, s) => sum + (s.rankHistory?.[0]?.rankStars ?? 0), 0) / schoolsWithRank.length
    : 0;

  return {
    totalSchools: elementary.numberOfSchools + middle.numberOfSchools + high.numberOfSchools,
    elementarySchools: {
      count: elementary.numberOfSchools,
      topRated: elementary.schoolList.slice(0, 5),
    },
    middleSchools: {
      count: middle.numberOfSchools,
      topRated: middle.schoolList.slice(0, 5),
    },
    highSchools: {
      count: high.numberOfSchools,
      topRated: high.schoolList.slice(0, 5),
    },
    averageRating: Math.round(avgRating * 10) / 10,
  };
}

// ─── Rating Interpretation ───────────────────────────────────────────────────

export function interpretSchoolRating(stars: number): {
  level: "excellent" | "above_average" | "average" | "below_average" | "poor";
  description: string;
  emoji: string;
} {
  if (stars >= 4.5) {
    return { level: "excellent", description: "Excellent - Top tier school", emoji: "⭐⭐⭐⭐⭐" };
  }
  if (stars >= 3.5) {
    return { level: "above_average", description: "Above Average - Strong academics", emoji: "⭐⭐⭐⭐" };
  }
  if (stars >= 2.5) {
    return { level: "average", description: "Average - Meets expectations", emoji: "⭐⭐⭐" };
  }
  if (stars >= 1.5) {
    return { level: "below_average", description: "Below Average - Room for improvement", emoji: "⭐⭐" };
  }
  return { level: "poor", description: "Needs Improvement", emoji: "⭐" };
}

export function formatGradeRange(lowGrade: string, highGrade: string): string {
  const format = (g: string) => {
    if (g === "PK") return "Pre-K";
    if (g === "KG") return "Kindergarten";
    return `Grade ${g}`;
  };

  if (lowGrade === highGrade) return format(lowGrade);
  return `${format(lowGrade)} - ${format(highGrade)}`;
}
