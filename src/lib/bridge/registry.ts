/**
 * KNOWLEDGE REGISTRY — Provider Management
 *
 * Manages registration, lookup, and lifecycle of knowledge providers.
 * Implements caching, fallback, and health monitoring.
 */

import type {
  UniversalKnowledgeProvider,
  ProviderMetadata,
  QueryResult,
  NaturalLanguageQuery,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// CACHE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  /** Default TTL in milliseconds */
  defaultTtl: number;
  /** Maximum cache entries */
  maxEntries: number;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  maxEntries: 1000,
};

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRATION OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type ProviderMode = 'embedded' | 'live' | 'hybrid';

export interface RegistrationOptions {
  /** How this provider operates */
  mode: ProviderMode;
  /** Pre-loaded embedded knowledge (for embedded/hybrid modes) */
  embeddedKnowledge?: unknown;
  /** Live endpoint URL (for live/hybrid modes) */
  liveEndpoint?: string;
  /** Priority when multiple providers cover same domain (lower = higher priority) */
  priority?: number;
  /** Cache configuration overrides */
  cacheConfig?: Partial<CacheConfig>;
}

interface RegisteredProvider {
  provider: UniversalKnowledgeProvider;
  options: Required<RegistrationOptions>;
  isInitialized: boolean;
  lastHealthCheck: Date | null;
  isHealthy: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// KNOWLEDGE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

export class KnowledgeRegistry {
  private providers: Map<string, RegisteredProvider> = new Map();
  private domainIndex: Map<string, string[]> = new Map(); // domain -> appIds[]
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private eventSubscriptions: Map<string, Set<(event: unknown) => void>> = new Map();

  // ─── REGISTRATION ─────────────────────────────────────────────────────────

  /**
   * Register a knowledge provider.
   */
  async register(
    provider: UniversalKnowledgeProvider,
    options: RegistrationOptions
  ): Promise<void> {
    const appId = provider.metadata.appId;

    // Fill in defaults
    const fullOptions: Required<RegistrationOptions> = {
      mode: options.mode,
      embeddedKnowledge: options.embeddedKnowledge ?? null,
      liveEndpoint: options.liveEndpoint ?? '',
      priority: options.priority ?? 100,
      cacheConfig: { ...DEFAULT_CACHE_CONFIG, ...options.cacheConfig },
    };

    // Store provider
    this.providers.set(appId, {
      provider,
      options: fullOptions,
      isInitialized: false,
      lastHealthCheck: null,
      isHealthy: false,
    });

    // Index by domain
    const domain = provider.metadata.domain;
    const domainProviders = this.domainIndex.get(domain) ?? [];
    if (!domainProviders.includes(appId)) {
      domainProviders.push(appId);
      this.domainIndex.set(domain, domainProviders);
    }

    // Initialize if provider has init method
    await this.initializeProvider(appId);
  }

  /**
   * Unregister a provider.
   */
  async unregister(appId: string): Promise<void> {
    const registered = this.providers.get(appId);
    if (!registered) return;

    // Shutdown if provider has shutdown method
    if (registered.provider.shutdown) {
      await registered.provider.shutdown();
    }

    // Remove from domain index
    const domain = registered.provider.metadata.domain;
    const domainProviders = this.domainIndex.get(domain) ?? [];
    const filtered = domainProviders.filter((id) => id !== appId);
    if (filtered.length > 0) {
      this.domainIndex.set(domain, filtered);
    } else {
      this.domainIndex.delete(domain);
    }

    // Remove provider
    this.providers.delete(appId);

    // Clear related cache entries
    this.clearCacheForApp(appId);
  }

  // ─── LOOKUP ───────────────────────────────────────────────────────────────

  /**
   * Get a provider by app ID.
   */
  getProvider(appId: string): UniversalKnowledgeProvider | null {
    return this.providers.get(appId)?.provider ?? null;
  }

  /**
   * Get all providers for a domain, sorted by priority.
   */
  getProvidersForDomain(domain: string): UniversalKnowledgeProvider[] {
    const appIds = this.domainIndex.get(domain) ?? [];
    return appIds
      .map((id) => this.providers.get(id))
      .filter((p): p is RegisteredProvider => p !== undefined && p.isHealthy)
      .sort((a, b) => a.options.priority - b.options.priority)
      .map((p) => p.provider);
  }

  /**
   * Get the primary (highest priority) provider for a domain.
   */
  getPrimaryProvider(domain: string): UniversalKnowledgeProvider | null {
    const providers = this.getProvidersForDomain(domain);
    return providers[0] ?? null;
  }

  /**
   * Get all registered providers.
   */
  getAllProviders(): UniversalKnowledgeProvider[] {
    return Array.from(this.providers.values()).map((p) => p.provider);
  }

  /**
   * Get metadata for all providers.
   */
  getAllMetadata(): ProviderMetadata[] {
    return this.getAllProviders().map((p) => p.metadata);
  }

  /**
   * Get all registered domains.
   */
  getDomains(): string[] {
    return Array.from(this.domainIndex.keys());
  }

  // ─── QUERY ROUTING ────────────────────────────────────────────────────────

  /**
   * Route a query to the appropriate provider(s).
   * Tries primary provider first, falls back to others if needed.
   */
  async routeQuery(
    domain: string,
    query: NaturalLanguageQuery
  ): Promise<QueryResult> {
    const providers = this.getProvidersForDomain(domain);

    if (providers.length === 0) {
      return {
        success: false,
        data: null,
        summary: `No provider available for domain: ${domain}`,
      };
    }

    // Try each provider in priority order
    for (const provider of providers) {
      try {
        const result = await provider.data.query(query);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.error(
          `Provider ${provider.metadata.appId} failed for query:`,
          error
        );
        // Continue to next provider
      }
    }

    // All providers failed
    return {
      success: false,
      data: null,
      summary: `All providers failed for domain: ${domain}`,
    };
  }

  // ─── CACHING ──────────────────────────────────────────────────────────────

  /**
   * Get a cached value.
   */
  getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiry
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a cached value.
   */
  setCached<T>(key: string, value: T, ttl?: number): void {
    // Enforce max entries
    if (this.cache.size >= DEFAULT_CACHE_CONFIG.maxEntries) {
      // Remove oldest entry
      const oldest = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0];
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? DEFAULT_CACHE_CONFIG.defaultTtl,
    });
  }

  /**
   * Clear all cache entries for an app.
   */
  clearCacheForApp(appId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${appId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ─── HEALTH MONITORING ────────────────────────────────────────────────────

  /**
   * Run health checks on all providers.
   */
  async checkHealth(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [appId, registered] of this.providers.entries()) {
      try {
        let isHealthy = true;

        if (registered.provider.healthCheck) {
          isHealthy = await registered.provider.healthCheck();
        }

        registered.isHealthy = isHealthy;
        registered.lastHealthCheck = new Date();
        results.set(appId, isHealthy);
      } catch (error) {
        console.error(`Health check failed for ${appId}:`, error);
        registered.isHealthy = false;
        registered.lastHealthCheck = new Date();
        results.set(appId, false);
      }
    }

    return results;
  }

  /**
   * Get health status for a provider.
   */
  getHealthStatus(appId: string): { isHealthy: boolean; lastCheck: Date | null } {
    const registered = this.providers.get(appId);
    if (!registered) {
      return { isHealthy: false, lastCheck: null };
    }
    return {
      isHealthy: registered.isHealthy,
      lastCheck: registered.lastHealthCheck,
    };
  }

  // ─── EVENT AGGREGATION ────────────────────────────────────────────────────

  /**
   * Subscribe to events from all providers.
   */
  subscribeToEvents(
    eventType: string,
    callback: (event: unknown) => void
  ): void {
    const subs = this.eventSubscriptions.get(eventType) ?? new Set();
    subs.add(callback);
    this.eventSubscriptions.set(eventType, subs);

    // Subscribe to each provider
    for (const registered of this.providers.values()) {
      registered.provider.events.subscribe(eventType, callback);
    }
  }

  /**
   * Unsubscribe from events.
   */
  unsubscribeFromEvents(
    eventType: string,
    callback: (event: unknown) => void
  ): void {
    const subs = this.eventSubscriptions.get(eventType);
    if (subs) {
      subs.delete(callback);
    }

    // Unsubscribe from each provider
    for (const registered of this.providers.values()) {
      registered.provider.events.unsubscribe(eventType);
    }
  }

  // ─── INTERNAL HELPERS ─────────────────────────────────────────────────────

  private async initializeProvider(appId: string): Promise<void> {
    const registered = this.providers.get(appId);
    if (!registered || registered.isInitialized) return;

    try {
      if (registered.provider.initialize) {
        await registered.provider.initialize();
      }

      // Run initial health check
      if (registered.provider.healthCheck) {
        registered.isHealthy = await registered.provider.healthCheck();
      } else {
        registered.isHealthy = true;
      }

      registered.isInitialized = true;
      registered.lastHealthCheck = new Date();
    } catch (error) {
      console.error(`Failed to initialize provider ${appId}:`, error);
      registered.isHealthy = false;
      registered.isInitialized = false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

/** Global knowledge registry instance */
export const knowledgeRegistry = new KnowledgeRegistry();
