/**
 * NOAA API Adapter
 *
 * FREE government API - no API key required
 * Docs: https://www.weather.gov/documentation/services-web-api
 *
 * Used for: Storm risk, tornado frequency, sea level data, severe weather alerts
 * Coverage: United States
 *
 * Endpoints used:
 * - /alerts - Active weather alerts
 * - /points/{lat},{lon} - Metadata for a point
 * - /gridpoints/{office}/{x},{y}/forecast - 7-day forecast
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const NOAA_API_BASE = "https://api.weather.gov";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlertSeverity = "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
export type AlertCertainty = "Observed" | "Likely" | "Possible" | "Unlikely" | "Unknown";
export type AlertUrgency = "Immediate" | "Expected" | "Future" | "Past" | "Unknown";

export interface WeatherAlert {
  id: string;
  areaDesc: string;
  geocode: {
    SAME?: string[];
    UGC?: string[];
  };
  affectedZones: string[];
  sent: string;
  effective: string;
  onset?: string;
  expires: string;
  ends?: string;
  status: string;
  messageType: string;
  category: string;
  severity: AlertSeverity;
  certainty: AlertCertainty;
  urgency: AlertUrgency;
  event: string;
  sender: string;
  senderName: string;
  headline?: string;
  description: string;
  instruction?: string;
  response: string;
}

export interface AlertsResponse {
  type: string;
  features: {
    id: string;
    type: string;
    properties: WeatherAlert;
  }[];
  title: string;
  updated: string;
}

export interface PointMetadata {
  id: string;
  type: string;
  properties: {
    cwa: string;
    forecastOffice: string;
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    forecastGridData: string;
    observationStations: string;
    relativeLocation: {
      type: string;
      properties: {
        city: string;
        state: string;
        distance: { unitCode: string; value: number };
        bearing: { unitCode: string; value: number };
      };
    };
    forecastZone: string;
    county: string;
    fireWeatherZone: string;
    timeZone: string;
    radarStation: string;
  };
}

export interface ForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  temperatureTrend?: string;
  probabilityOfPrecipitation: {
    unitCode: string;
    value: number | null;
  };
  dewpoint: {
    unitCode: string;
    value: number;
  };
  relativeHumidity: {
    unitCode: string;
    value: number;
  };
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
}

export interface ForecastResponse {
  type: string;
  properties: {
    updated: string;
    units: string;
    forecastGenerator: string;
    generatedAt: string;
    updateTime: string;
    validTimes: string;
    elevation: { unitCode: string; value: number };
    periods: ForecastPeriod[];
  };
}

export interface ObservationStation {
  id: string;
  type: string;
  properties: {
    stationIdentifier: string;
    name: string;
    timeZone: string;
    elevation: { unitCode: string; value: number };
  };
}

export interface CurrentObservation {
  id: string;
  type: string;
  properties: {
    station: string;
    timestamp: string;
    rawMessage: string;
    textDescription: string;
    temperature: { unitCode: string; value: number | null };
    dewpoint: { unitCode: string; value: number | null };
    windDirection: { unitCode: string; value: number | null };
    windSpeed: { unitCode: string; value: number | null };
    windGust: { unitCode: string; value: number | null };
    barometricPressure: { unitCode: string; value: number | null };
    seaLevelPressure: { unitCode: string; value: number | null };
    visibility: { unitCode: string; value: number | null };
    relativeHumidity: { unitCode: string; value: number | null };
    windChill: { unitCode: string; value: number | null };
    heatIndex: { unitCode: string; value: number | null };
  };
}

export class NOAAAdapterError extends Error {
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
    this.name = "NOAAAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

// NOAA API is free and doesn't require an API key
export function isNOAAConfigured(): boolean {
  return true; // Always configured - no API key needed
}

// ─── Core Request Function ───────────────────────────────────────────────────

interface RequestOptions {
  timeoutMs?: number;
}

async function requestNOAA<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${NOAA_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/geo+json",
      "User-Agent": "(olivia-brain, contact@clues.com)",
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new NOAAAdapterError({
      code: "NOAA_REQUEST_FAILED",
      message: `NOAA API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 503,
    });
  }

  return response.json() as Promise<T>;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Get all active weather alerts (nationwide)
 */
export async function getActiveAlerts(): Promise<WeatherAlert[]> {
  const data = await requestNOAA<AlertsResponse>("/alerts/active");
  return data.features.map((f) => f.properties);
}

/**
 * Get active alerts for a specific state
 */
export async function getAlertsByState(stateCode: string): Promise<WeatherAlert[]> {
  const data = await requestNOAA<AlertsResponse>(
    `/alerts/active?area=${stateCode.toUpperCase()}`
  );
  return data.features.map((f) => f.properties);
}

/**
 * Get active alerts for a specific point (lat/lon)
 */
export async function getAlertsForPoint(
  lat: number,
  lon: number
): Promise<WeatherAlert[]> {
  const data = await requestNOAA<AlertsResponse>(
    `/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`
  );
  return data.features.map((f) => f.properties);
}

/**
 * Get point metadata (forecast office, grid coordinates, etc.)
 */
export async function getPointMetadata(
  lat: number,
  lon: number
): Promise<PointMetadata["properties"]> {
  const data = await requestNOAA<PointMetadata>(
    `/points/${lat.toFixed(4)},${lon.toFixed(4)}`
  );
  return data.properties;
}

/**
 * Get 7-day forecast for a location
 */
export async function getForecast(
  lat: number,
  lon: number
): Promise<ForecastPeriod[]> {
  // First get the point metadata to find the forecast URL
  const point = await getPointMetadata(lat, lon);

  // Then fetch the forecast
  const forecastUrl = point.forecast.replace(NOAA_API_BASE, "");
  const data = await requestNOAA<ForecastResponse>(forecastUrl);

  return data.properties.periods;
}

/**
 * Get hourly forecast for a location
 */
export async function getHourlyForecast(
  lat: number,
  lon: number
): Promise<ForecastPeriod[]> {
  const point = await getPointMetadata(lat, lon);
  const forecastUrl = point.forecastHourly.replace(NOAA_API_BASE, "");
  const data = await requestNOAA<ForecastResponse>(forecastUrl);

  return data.properties.periods;
}

/**
 * Get current conditions from the nearest observation station
 */
export async function getCurrentConditions(
  lat: number,
  lon: number
): Promise<CurrentObservation["properties"] | null> {
  try {
    const point = await getPointMetadata(lat, lon);
    const stationsUrl = point.observationStations.replace(NOAA_API_BASE, "");

    // Get list of stations
    const stationsData = await requestNOAA<{
      features: ObservationStation[];
    }>(stationsUrl);

    if (stationsData.features.length === 0) return null;

    // Get latest observation from first (nearest) station
    const stationId = stationsData.features[0].properties.stationIdentifier;
    const observation = await requestNOAA<CurrentObservation>(
      `/stations/${stationId}/observations/latest`
    );

    return observation.properties;
  } catch {
    return null;
  }
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Get severe weather risk summary for a location
 */
export async function getSevereWeatherRisk(
  lat: number,
  lon: number
): Promise<{
  hasActiveAlerts: boolean;
  alertCount: number;
  severestAlert: AlertSeverity | null;
  alerts: {
    event: string;
    severity: AlertSeverity;
    headline?: string;
    expires: string;
  }[];
  currentConditions: {
    temperature?: number;
    windSpeed?: number;
    description?: string;
  } | null;
}> {
  const [alerts, conditions] = await Promise.all([
    getAlertsForPoint(lat, lon),
    getCurrentConditions(lat, lon),
  ]);

  // Sort alerts by severity
  const severityOrder: Record<AlertSeverity, number> = {
    Extreme: 4,
    Severe: 3,
    Moderate: 2,
    Minor: 1,
    Unknown: 0,
  };

  const sortedAlerts = alerts.sort(
    (a, b) => severityOrder[b.severity] - severityOrder[a.severity]
  );

  return {
    hasActiveAlerts: alerts.length > 0,
    alertCount: alerts.length,
    severestAlert: sortedAlerts[0]?.severity ?? null,
    alerts: sortedAlerts.map((a) => ({
      event: a.event,
      severity: a.severity,
      headline: a.headline,
      expires: a.expires,
    })),
    currentConditions: conditions
      ? {
          temperature: conditions.temperature.value
            ? celsiusToFahrenheit(conditions.temperature.value)
            : undefined,
          windSpeed: conditions.windSpeed.value
            ? Math.round(conditions.windSpeed.value * 2.237) // m/s to mph
            : undefined,
          description: conditions.textDescription,
        }
      : null,
  };
}

/**
 * Get weather risk score for relocation analysis (0-100, higher = safer)
 */
export async function getWeatherSafetyScore(
  stateCode: string
): Promise<{
  state: string;
  safetyScore: number;
  activeAlertCount: number;
  severeAlertCount: number;
  interpretation: string;
}> {
  const alerts = await getAlertsByState(stateCode);

  // Count severe alerts
  const severeCount = alerts.filter(
    (a) => a.severity === "Extreme" || a.severity === "Severe"
  ).length;

  // Calculate score (baseline 100, deduct for alerts)
  let score = 100;
  score -= alerts.length * 2; // -2 per alert
  score -= severeCount * 10; // additional -10 per severe alert
  score = Math.max(0, Math.min(100, score));

  let interpretation: string;
  if (score >= 90) interpretation = "Excellent - minimal weather concerns";
  else if (score >= 70) interpretation = "Good - minor weather activity";
  else if (score >= 50) interpretation = "Moderate - active weather in region";
  else if (score >= 30) interpretation = "Elevated - multiple weather alerts";
  else interpretation = "High risk - severe weather activity";

  return {
    state: stateCode.toUpperCase(),
    safetyScore: score,
    activeAlertCount: alerts.length,
    severeAlertCount: severeCount,
    interpretation,
  };
}

// ─── Storm Event Types ───────────────────────────────────────────────────────

export const SEVERE_WEATHER_EVENTS = [
  "Tornado Warning",
  "Tornado Watch",
  "Severe Thunderstorm Warning",
  "Severe Thunderstorm Watch",
  "Flash Flood Warning",
  "Flash Flood Watch",
  "Hurricane Warning",
  "Hurricane Watch",
  "Tropical Storm Warning",
  "Tropical Storm Watch",
  "Blizzard Warning",
  "Winter Storm Warning",
  "Ice Storm Warning",
  "Excessive Heat Warning",
  "Extreme Cold Warning",
  "Tsunami Warning",
  "Storm Surge Warning",
] as const;

export type SevereWeatherEvent = typeof SEVERE_WEATHER_EVENTS[number];

/**
 * Check if any severe weather events are active for a state
 */
export async function hasSevereWeather(
  stateCode: string
): Promise<{
  hasSevere: boolean;
  events: string[];
}> {
  const alerts = await getAlertsByState(stateCode);

  const severeEvents = alerts
    .filter((a) =>
      SEVERE_WEATHER_EVENTS.some((e) =>
        a.event.toLowerCase().includes(e.toLowerCase().replace(" warning", "").replace(" watch", ""))
      )
    )
    .map((a) => a.event);

  return {
    hasSevere: severeEvents.length > 0,
    events: [...new Set(severeEvents)],
  };
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

export function interpretAlertSeverity(severity: AlertSeverity): {
  level: "critical" | "high" | "medium" | "low" | "info";
  color: string;
  description: string;
} {
  switch (severity) {
    case "Extreme":
      return {
        level: "critical",
        color: "red",
        description: "Extraordinary threat to life or property",
      };
    case "Severe":
      return {
        level: "high",
        color: "orange",
        description: "Significant threat to life or property",
      };
    case "Moderate":
      return {
        level: "medium",
        color: "yellow",
        description: "Possible threat to life or property",
      };
    case "Minor":
      return {
        level: "low",
        color: "blue",
        description: "Minimal threat",
      };
    default:
      return {
        level: "info",
        color: "gray",
        description: "Severity unknown",
      };
  }
}
