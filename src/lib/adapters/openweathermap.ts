/**
 * OpenWeatherMap API Adapter
 *
 * Free tier: 1,000 calls/day, 60 calls/min
 * Paid: Pay-as-you-go starting at $0.0015/call
 * Docs: https://openweathermap.org/api
 *
 * Used for: Weather data and air quality for relocation assessment
 * Coverage: GLOBAL (200,000+ cities worldwide)
 *
 * APIs used:
 * - Current Weather
 * - 5-Day Forecast
 * - Air Pollution (global alternative to AirNow)
 * - Weather Alerts (global alternative to NOAA)
 * - Geocoding
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 10_000;
const OWM_API_BASE = "https://api.openweathermap.org";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Units = "metric" | "imperial" | "standard";

export interface CurrentWeather {
  coord: { lon: number; lat: number };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    sea_level?: number;
    grnd_level?: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: { all: number };
  rain?: { "1h"?: number; "3h"?: number };
  snow?: { "1h"?: number; "3h"?: number };
  dt: number;
  sys: {
    type?: number;
    id?: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

export interface ForecastItem {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  clouds: { all: number };
  wind: { speed: number; deg: number; gust?: number };
  visibility: number;
  pop: number; // Probability of precipitation
  rain?: { "3h": number };
  snow?: { "3h": number };
  dt_txt: string;
}

export interface ForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: ForecastItem[];
  city: {
    id: number;
    name: string;
    coord: { lat: number; lon: number };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

export interface AirPollution {
  coord: { lon: number; lat: number };
  list: {
    dt: number;
    main: {
      aqi: 1 | 2 | 3 | 4 | 5; // 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
    };
    components: {
      co: number;      // Carbon monoxide (μg/m³)
      no: number;      // Nitrogen monoxide (μg/m³)
      no2: number;     // Nitrogen dioxide (μg/m³)
      o3: number;      // Ozone (μg/m³)
      so2: number;     // Sulphur dioxide (μg/m³)
      pm2_5: number;   // Fine particles (μg/m³)
      pm10: number;    // Coarse particles (μg/m³)
      nh3: number;     // Ammonia (μg/m³)
    };
  }[];
}

export interface WeatherAlert {
  sender_name: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
}

export interface OneCallResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: CurrentWeather & {
    uvi: number;
    dew_point: number;
  };
  minutely?: { dt: number; precipitation: number }[];
  hourly?: (ForecastItem & { uvi: number; dew_point: number })[];
  daily?: {
    dt: number;
    sunrise: number;
    sunset: number;
    temp: { day: number; min: number; max: number; night: number; eve: number; morn: number };
    feels_like: { day: number; night: number; eve: number; morn: number };
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility?: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: { id: number; main: string; description: string; icon: string }[];
    pop: number;
    rain?: number;
    snow?: number;
  }[];
  alerts?: WeatherAlert[];
}

export interface GeocodingResult {
  name: string;
  local_names?: Record<string, string>;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export type AQILevel = "Good" | "Fair" | "Moderate" | "Poor" | "Very Poor";

export class OpenWeatherMapAdapterError extends Error {
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
    this.name = "OpenWeatherMapAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getOWMConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.OPENWEATHERMAP_API_KEY,
  };
}

export function isOpenWeatherMapConfigured(): boolean {
  const { apiKey } = getOWMConfig();
  return Boolean(apiKey);
}

function assertConfigured() {
  const { apiKey } = getOWMConfig();
  if (!apiKey) {
    throw new OpenWeatherMapAdapterError({
      code: "OWM_NOT_CONFIGURED",
      message: "OpenWeatherMap API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ───────────────────────────────────────────────────

interface RequestOptions {
  params?: Record<string, string | number | undefined>;
  timeoutMs?: number;
}

async function requestOWM<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = new URL(`${OWM_API_BASE}${path}`);
  url.searchParams.set("appid", apiKey);

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
    throw new OpenWeatherMapAdapterError({
      code: "OWM_REQUEST_FAILED",
      message: `OpenWeatherMap API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return response.json() as Promise<T>;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Get current weather for a location
 */
export async function getCurrentWeather(
  lat: number,
  lon: number,
  units: Units = "metric"
): Promise<CurrentWeather> {
  return requestOWM<CurrentWeather>("/data/2.5/weather", {
    params: { lat, lon, units },
  });
}

/**
 * Get current weather by city name
 */
export async function getCurrentWeatherByCity(
  city: string,
  countryCode?: string,
  units: Units = "metric"
): Promise<CurrentWeather> {
  const q = countryCode ? `${city},${countryCode}` : city;
  return requestOWM<CurrentWeather>("/data/2.5/weather", {
    params: { q, units },
  });
}

/**
 * Get 5-day forecast (3-hour intervals)
 */
export async function getForecast(
  lat: number,
  lon: number,
  units: Units = "metric"
): Promise<ForecastResponse> {
  return requestOWM<ForecastResponse>("/data/2.5/forecast", {
    params: { lat, lon, units },
  });
}

/**
 * Get current air pollution data (GLOBAL coverage)
 */
export async function getAirPollution(
  lat: number,
  lon: number
): Promise<AirPollution> {
  return requestOWM<AirPollution>("/data/2.5/air_pollution", {
    params: { lat, lon },
  });
}

/**
 * Get air pollution forecast (GLOBAL coverage)
 */
export async function getAirPollutionForecast(
  lat: number,
  lon: number
): Promise<AirPollution> {
  return requestOWM<AirPollution>("/data/2.5/air_pollution/forecast", {
    params: { lat, lon },
  });
}

/**
 * Get historical air pollution (GLOBAL coverage)
 */
export async function getAirPollutionHistory(
  lat: number,
  lon: number,
  start: number,
  end: number
): Promise<AirPollution> {
  return requestOWM<AirPollution>("/data/2.5/air_pollution/history", {
    params: { lat, lon, start, end },
  });
}

/**
 * Geocode a city/location name to coordinates
 */
export async function geocode(
  query: string,
  limit: number = 5
): Promise<GeocodingResult[]> {
  return requestOWM<GeocodingResult[]>("/geo/1.0/direct", {
    params: { q: query, limit },
  });
}

/**
 * Reverse geocode coordinates to location name
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  limit: number = 1
): Promise<GeocodingResult[]> {
  return requestOWM<GeocodingResult[]>("/geo/1.0/reverse", {
    params: { lat, lon, limit },
  });
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Get comprehensive weather summary for relocation analysis
 */
export async function getWeatherSummary(
  lat: number,
  lon: number,
  units: Units = "metric"
): Promise<{
  location: { name: string; country: string; lat: number; lon: number };
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    description: string;
    windSpeed: number;
  };
  forecast: {
    avgTemp: number;
    minTemp: number;
    maxTemp: number;
    rainDays: number;
    avgHumidity: number;
  };
  units: Units;
}> {
  const [current, forecast] = await Promise.all([
    getCurrentWeather(lat, lon, units),
    getForecast(lat, lon, units),
  ]);

  // Calculate forecast averages
  const temps = forecast.list.map((f) => f.main.temp);
  const humidities = forecast.list.map((f) => f.main.humidity);
  const rainDays = new Set(
    forecast.list
      .filter((f) => f.pop > 0.3 || f.rain)
      .map((f) => f.dt_txt.split(" ")[0])
  ).size;

  return {
    location: {
      name: current.name,
      country: current.sys.country,
      lat: current.coord.lat,
      lon: current.coord.lon,
    },
    current: {
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      humidity: current.main.humidity,
      description: current.weather[0]?.description ?? "Unknown",
      windSpeed: Math.round(current.wind.speed),
    },
    forecast: {
      avgTemp: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length),
      minTemp: Math.round(Math.min(...temps)),
      maxTemp: Math.round(Math.max(...temps)),
      rainDays,
      avgHumidity: Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length),
    },
    units,
  };
}

/**
 * Get GLOBAL air quality score (0-100, higher = better)
 * Works in US, Europe, Asia, everywhere
 */
export async function getGlobalAirQualityScore(
  lat: number,
  lon: number
): Promise<{
  latitude: number;
  longitude: number;
  score: number;
  aqi: 1 | 2 | 3 | 4 | 5;
  level: AQILevel;
  components: {
    pm2_5: number;
    pm10: number;
    o3: number;
    no2: number;
    so2: number;
    co: number;
  };
  interpretation: string;
  healthAdvice: string;
}> {
  const data = await getAirPollution(lat, lon);
  const current = data.list[0];

  // Convert OWM AQI (1-5) to 0-100 score
  // 1 (Good) = 80-100, 2 (Fair) = 60-79, 3 (Moderate) = 40-59, 4 (Poor) = 20-39, 5 (Very Poor) = 0-19
  const aqiToScore: Record<number, number> = {
    1: 90,
    2: 70,
    3: 50,
    4: 30,
    5: 10,
  };

  const score = aqiToScore[current.main.aqi] ?? 50;
  const level = interpretAQI(current.main.aqi);

  let interpretation: string;
  let healthAdvice: string;

  switch (current.main.aqi) {
    case 1:
      interpretation = "Excellent air quality";
      healthAdvice = "Air quality is ideal for outdoor activities.";
      break;
    case 2:
      interpretation = "Fair air quality";
      healthAdvice = "Acceptable for most people. Sensitive individuals should limit prolonged outdoor exertion.";
      break;
    case 3:
      interpretation = "Moderate air quality";
      healthAdvice = "Sensitive groups may experience health effects. Consider reducing outdoor activities.";
      break;
    case 4:
      interpretation = "Poor air quality";
      healthAdvice = "Everyone may experience health effects. Limit outdoor activities.";
      break;
    case 5:
      interpretation = "Very poor air quality";
      healthAdvice = "Health alert - avoid outdoor activities. Use air purifiers indoors.";
      break;
    default:
      interpretation = "Unknown air quality";
      healthAdvice = "Unable to provide health advice.";
  }

  return {
    latitude: lat,
    longitude: lon,
    score,
    aqi: current.main.aqi,
    level,
    components: {
      pm2_5: current.components.pm2_5,
      pm10: current.components.pm10,
      o3: current.components.o3,
      no2: current.components.no2,
      so2: current.components.so2,
      co: current.components.co,
    },
    interpretation,
    healthAdvice,
  };
}

/**
 * Compare weather between multiple locations (GLOBAL)
 */
export async function compareWeather(
  locations: { lat: number; lon: number; name?: string }[],
  units: Units = "metric"
): Promise<
  {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
    currentTemp: number;
    humidity: number;
    description: string;
    airQualityScore: number;
    rank: number;
  }[]
> {
  const results = await Promise.all(
    locations.map(async (loc, index) => {
      const [weather, airQuality] = await Promise.all([
        getCurrentWeather(loc.lat, loc.lon, units),
        getGlobalAirQualityScore(loc.lat, loc.lon),
      ]);

      return {
        name: loc.name ?? weather.name,
        country: weather.sys.country,
        latitude: loc.lat,
        longitude: loc.lon,
        currentTemp: Math.round(weather.main.temp),
        humidity: weather.main.humidity,
        description: weather.weather[0]?.description ?? "Unknown",
        airQualityScore: airQuality.score,
      };
    })
  );

  // Sort by air quality score (higher = better) and add ranks
  return results
    .sort((a, b) => b.airQualityScore - a.airQualityScore)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * Get climate suitability score for relocation (0-100)
 */
export async function getClimateSuitabilityScore(
  lat: number,
  lon: number,
  preferences?: {
    idealTempMin?: number; // Celsius
    idealTempMax?: number;
    maxHumidity?: number;
    avoidRain?: boolean;
  }
): Promise<{
  latitude: number;
  longitude: number;
  score: number;
  factors: {
    temperature: number;
    humidity: number;
    precipitation: number;
    airQuality: number;
  };
  interpretation: string;
}> {
  const [weather, forecast, airQuality] = await Promise.all([
    getCurrentWeather(lat, lon, "metric"),
    getForecast(lat, lon, "metric"),
    getGlobalAirQualityScore(lat, lon),
  ]);

  const prefs = {
    idealTempMin: preferences?.idealTempMin ?? 15,
    idealTempMax: preferences?.idealTempMax ?? 28,
    maxHumidity: preferences?.maxHumidity ?? 70,
    avoidRain: preferences?.avoidRain ?? false,
  };

  // Temperature score (0-100)
  const avgTemp = weather.main.temp;
  let tempScore = 100;
  if (avgTemp < prefs.idealTempMin) {
    tempScore = Math.max(0, 100 - (prefs.idealTempMin - avgTemp) * 5);
  } else if (avgTemp > prefs.idealTempMax) {
    tempScore = Math.max(0, 100 - (avgTemp - prefs.idealTempMax) * 5);
  }

  // Humidity score (0-100)
  const humidity = weather.main.humidity;
  let humidityScore = 100;
  if (humidity > prefs.maxHumidity) {
    humidityScore = Math.max(0, 100 - (humidity - prefs.maxHumidity) * 2);
  }

  // Precipitation score (0-100)
  const rainDays = forecast.list.filter((f) => f.pop > 0.3 || f.rain).length;
  const rainRatio = rainDays / forecast.list.length;
  let precipScore = Math.round((1 - rainRatio) * 100);
  if (!prefs.avoidRain) {
    precipScore = Math.min(100, precipScore + 30); // Less penalty if rain is OK
  }

  // Overall score (weighted average)
  const score = Math.round(
    tempScore * 0.35 +
    humidityScore * 0.2 +
    precipScore * 0.2 +
    airQuality.score * 0.25
  );

  let interpretation: string;
  if (score >= 80) interpretation = "Excellent climate match for your preferences";
  else if (score >= 60) interpretation = "Good climate - minor adjustments from ideal";
  else if (score >= 40) interpretation = "Moderate climate match - some compromises needed";
  else interpretation = "Climate may not match your preferences well";

  return {
    latitude: lat,
    longitude: lon,
    score,
    factors: {
      temperature: Math.round(tempScore),
      humidity: Math.round(humidityScore),
      precipitation: Math.round(precipScore),
      airQuality: airQuality.score,
    },
    interpretation,
  };
}

// ─── Interpretation Helpers ──────────────────────────────────────────────────

function interpretAQI(aqi: 1 | 2 | 3 | 4 | 5): AQILevel {
  const levels: Record<number, AQILevel> = {
    1: "Good",
    2: "Fair",
    3: "Moderate",
    4: "Poor",
    5: "Very Poor",
  };
  return levels[aqi] ?? "Moderate";
}

export function getAQIColor(aqi: 1 | 2 | 3 | 4 | 5): string {
  const colors: Record<number, string> = {
    1: "green",
    2: "yellow",
    3: "orange",
    4: "red",
    5: "purple",
  };
  return colors[aqi] ?? "gray";
}

export function getWeatherIcon(iconCode: string): string {
  // Map OpenWeatherMap icon codes to emoji
  const iconMap: Record<string, string> = {
    "01d": "☀️", "01n": "🌙",
    "02d": "⛅", "02n": "☁️",
    "03d": "☁️", "03n": "☁️",
    "04d": "☁️", "04n": "☁️",
    "09d": "🌧️", "09n": "🌧️",
    "10d": "🌦️", "10n": "🌧️",
    "11d": "⛈️", "11n": "⛈️",
    "13d": "❄️", "13n": "❄️",
    "50d": "🌫️", "50n": "🌫️",
  };
  return iconMap[iconCode] ?? "🌡️";
}

// ─── Region Coverage Note ────────────────────────────────────────────────────

export const COVERAGE_NOTE = {
  weather: "Global coverage - 200,000+ cities worldwide",
  airPollution: "Global coverage - works in US, Europe, Asia, and all regions",
  alerts: "Global coverage via One Call API (requires subscription)",
  geocoding: "Global - supports all countries and languages",
};
