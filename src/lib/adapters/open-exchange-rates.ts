/**
 * Open Exchange Rates API Adapter
 *
 * Free tier: 1,000 requests/month, hourly updates, USD base only
 * Paid tiers: More requests, any base currency, minute updates
 * Docs: https://docs.openexchangerates.org/
 *
 * Used for: Currency conversion for relocation cost comparisons
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 10_000;
const OXR_API_BASE = "https://openexchangerates.org/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExchangeRatesResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}

export interface HistoricalRatesResponse extends ExchangeRatesResponse {
  // Same structure, just for a specific date
}

export interface CurrencyInfo {
  code: string;
  name: string;
}

export interface CurrenciesResponse {
  [code: string]: string;
}

export interface ConvertResponse {
  disclaimer: string;
  license: string;
  request: {
    query: string;
    amount: number;
    from: string;
    to: string;
  };
  meta: {
    timestamp: number;
    rate: number;
  };
  response: number;
}

export interface TimeSeriesResponse {
  disclaimer: string;
  license: string;
  start_date: string;
  end_date: string;
  base: string;
  rates: {
    [date: string]: Record<string, number>;
  };
}

export interface UsageResponse {
  status: number;
  data: {
    app_id: string;
    status: string;
    plan: {
      name: string;
      quota: string;
      update_frequency: string;
      features: {
        base: boolean;
        symbols: boolean;
        experimental: boolean;
        "time-series": boolean;
        convert: boolean;
      };
    };
    usage: {
      requests: number;
      requests_quota: number;
      requests_remaining: number;
      days_elapsed: number;
      days_remaining: number;
      daily_average: number;
    };
  };
}

export class OpenExchangeRatesAdapterError extends Error {
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
    this.name = "OpenExchangeRatesAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getOXRConfig() {
  const env = getServerEnv();
  return {
    appId: env.OPEN_EXCHANGE_RATES_APP_ID,
  };
}

export function isOpenExchangeRatesConfigured(): boolean {
  const { appId } = getOXRConfig();
  return Boolean(appId);
}

function assertConfigured() {
  const { appId } = getOXRConfig();
  if (!appId) {
    throw new OpenExchangeRatesAdapterError({
      code: "OXR_NOT_CONFIGURED",
      message: "Open Exchange Rates App ID must be configured.",
      status: 503,
    });
  }
  return { appId };
}

// ─── Core Request Function ───────────────────────────────────────────────────

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

async function requestOXR<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { appId } = assertConfigured();

  const params = new URLSearchParams({
    app_id: appId,
  });

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
  }

  const url = `${OXR_API_BASE}${endpoint}?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  const payload = await response.json();

  if (!response.ok) {
    const errorMessage = payload?.message || payload?.description || `Open Exchange Rates API request failed with HTTP ${response.status}`;
    const errorCode = payload?.error ? "true" : "OXR_REQUEST_FAILED";

    throw new OpenExchangeRatesAdapterError({
      code: errorCode,
      message: errorMessage,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return payload as T;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Get latest exchange rates
 * Free tier: USD base only, hourly updates
 */
export async function getLatestRates(options?: {
  base?: string;        // Base currency (paid plans only, default: USD)
  symbols?: string[];   // Limit to specific currencies
}): Promise<ExchangeRatesResponse> {
  return requestOXR<ExchangeRatesResponse>("/latest.json", {
    params: {
      base: options?.base,
      symbols: options?.symbols?.join(","),
    },
  });
}

/**
 * Get historical exchange rates for a specific date
 * Format: YYYY-MM-DD
 */
export async function getHistoricalRates(
  date: string,
  options?: {
    base?: string;
    symbols?: string[];
  }
): Promise<HistoricalRatesResponse> {
  return requestOXR<HistoricalRatesResponse>(`/historical/${date}.json`, {
    params: {
      base: options?.base,
      symbols: options?.symbols?.join(","),
    },
  });
}

/**
 * Get list of all available currencies
 */
export async function getCurrencies(): Promise<CurrenciesResponse> {
  return requestOXR<CurrenciesResponse>("/currencies.json");
}

/**
 * Convert amount between currencies (paid plans only)
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<ConvertResponse> {
  return requestOXR<ConvertResponse>("/convert/{value}/{from}/{to}".replace("{value}", amount.toString()).replace("{from}", from).replace("{to}", to));
}

/**
 * Get API usage stats
 */
export async function getUsage(): Promise<UsageResponse> {
  return requestOXR<UsageResponse>("/usage.json");
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Convert amount from one currency to another using latest rates
 * Works on free tier by calculating from USD rates
 */
export async function convert(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{
  amount: number;
  from: string;
  to: string;
  result: number;
  rate: number;
  timestamp: number;
}> {
  const rates = await getLatestRates({
    symbols: [fromCurrency, toCurrency],
  });

  const fromRate = rates.rates[fromCurrency];
  const toRate = rates.rates[toCurrency];

  if (!fromRate || !toRate) {
    throw new OpenExchangeRatesAdapterError({
      code: "OXR_INVALID_CURRENCY",
      message: `Invalid currency code: ${!fromRate ? fromCurrency : toCurrency}`,
      status: 400,
    });
  }

  // Convert: amount in fromCurrency -> USD -> toCurrency
  const amountInUsd = amount / fromRate;
  const result = amountInUsd * toRate;
  const rate = toRate / fromRate;

  return {
    amount,
    from: fromCurrency,
    to: toCurrency,
    result: Math.round(result * 100) / 100,
    rate: Math.round(rate * 1000000) / 1000000,
    timestamp: rates.timestamp,
  };
}

/**
 * Get exchange rate between two currencies
 */
export async function getRate(
  fromCurrency: string,
  toCurrency: string
): Promise<{
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}> {
  const rates = await getLatestRates({
    symbols: [fromCurrency, toCurrency],
  });

  const fromRate = rates.rates[fromCurrency];
  const toRate = rates.rates[toCurrency];

  if (!fromRate || !toRate) {
    throw new OpenExchangeRatesAdapterError({
      code: "OXR_INVALID_CURRENCY",
      message: `Invalid currency code: ${!fromRate ? fromCurrency : toCurrency}`,
      status: 400,
    });
  }

  return {
    from: fromCurrency,
    to: toCurrency,
    rate: toRate / fromRate,
    timestamp: rates.timestamp,
  };
}

/**
 * Get rates for common relocation currencies
 */
export async function getRelocationCurrencyRates(baseCurrency: string = "USD"): Promise<{
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}> {
  // Common currencies for relocation scenarios
  const relocationCurrencies = [
    "USD", "EUR", "GBP", "CAD", "AUD", "NZD", // English-speaking + EU
    "CHF", "SEK", "NOK", "DKK",               // Nordic + Swiss
    "JPY", "SGD", "HKD", "THB", "MYR",        // Asia
    "MXN", "BRL", "COP", "CRC", "ARS",        // Latin America
    "AED", "ILS", "ZAR",                       // Middle East + Africa
    "PLN", "CZK", "HUF", "RON",               // Eastern Europe
    "INR", "PHP", "IDR", "VND",               // South/Southeast Asia
  ];

  const rates = await getLatestRates({
    symbols: relocationCurrencies,
  });

  // If base is not USD, recalculate rates
  if (baseCurrency !== "USD" && rates.rates[baseCurrency]) {
    const baseRate = rates.rates[baseCurrency];
    const adjustedRates: Record<string, number> = {};

    for (const [currency, rate] of Object.entries(rates.rates)) {
      adjustedRates[currency] = rate / baseRate;
    }

    return {
      base: baseCurrency,
      rates: adjustedRates,
      timestamp: rates.timestamp,
    };
  }

  return {
    base: "USD",
    rates: rates.rates,
    timestamp: rates.timestamp,
  };
}

// ─── Currency Metadata ───────────────────────────────────────────────────────

export const MAJOR_CURRENCIES = {
  USD: { name: "US Dollar", symbol: "$", locale: "en-US" },
  EUR: { name: "Euro", symbol: "€", locale: "de-DE" },
  GBP: { name: "British Pound", symbol: "£", locale: "en-GB" },
  JPY: { name: "Japanese Yen", symbol: "¥", locale: "ja-JP" },
  CAD: { name: "Canadian Dollar", symbol: "CA$", locale: "en-CA" },
  AUD: { name: "Australian Dollar", symbol: "A$", locale: "en-AU" },
  CHF: { name: "Swiss Franc", symbol: "CHF", locale: "de-CH" },
  CNY: { name: "Chinese Yuan", symbol: "¥", locale: "zh-CN" },
  SGD: { name: "Singapore Dollar", symbol: "S$", locale: "en-SG" },
  NZD: { name: "New Zealand Dollar", symbol: "NZ$", locale: "en-NZ" },
} as const;

/**
 * Format currency amount with proper locale
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale?: string
): string {
  const currencyInfo = MAJOR_CURRENCIES[currencyCode as keyof typeof MAJOR_CURRENCIES];
  const useLocale = locale || currencyInfo?.locale || "en-US";

  return new Intl.NumberFormat(useLocale, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}
