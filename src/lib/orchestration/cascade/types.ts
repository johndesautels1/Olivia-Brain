/* ═══════════════════════════════════════════════════════════════════════════
   Cascade Data Intelligence Pipeline — Core Types
   Last updated: 2026-03-14
   ═══════════════════════════════════════════════════════════════════════════ */

/** The 7 LLM providers (Sonnet, Opus, GPT, Gemini, Grok, Perplexity, Kimi) + Tavily search API + Companies House registry = 9 total */
export type ProviderId =
  | "sonnet"
  | "gpt"
  | "gemini"
  | "grok"
  | "perplexity"
  | "kimi"
  | "opus"
  | "tavily"
  | "companies_house";

/** Providers that perform websearch (Opus excluded) */
export type WebSearchProviderId = Exclude<ProviderId, "opus">;

/** Providers that are LLMs (Tavily excluded) */
export type LLMProviderId = Exclude<ProviderId, "tavily">;

/** Task types the cascade can execute */
export type CascadeTaskId =
  | "livability_scores"
  | "london_funding_rounds"
  | "london_founder_profiles"
  | "london_ai_ecosystem"
  | "london_ecosystem_insights"
  | "london_research_reports"
  | "london_tech_events"
  | "london_org_updates"
  | "london_programs_update"
  | "london_market_data"
  | "london_toolkit_data"
  | "london_resource_links"
  | "london_insights_articles"
  | "london_success_stories"
  | "london_district_narratives"
  | "london_city_comparison"
  | "london_competitive_advantages"
  | "london_leadership_categories"
  | "video_source_discovery"
  | "eventbrite_meetup_polling"
  | "feature_catalog_sync";

/** Status of a cascade run */
export type CascadeStatus =
  | "idle"
  | "searching"      // Phase 1: LLM websearch in parallel
  | "gap_filling"    // Phase 2: Tavily fills gaps
  | "judging"        // Phase 3: Opus cross-references
  | "injecting"      // Phase 4: Writing to DB/files
  | "complete"
  | "error";

/* ── Provider Configuration ── */

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  modelId: string;
  hasWebsearch: boolean;
  apiKeyEnvVar: string;
  /** Base URL for the API (if different from default SDK) */
  baseUrl?: string;
}

export const PROVIDER_CONFIGS: Record<ProviderId, ProviderConfig> = {
  sonnet: {
    id: "sonnet",
    name: "Claude Sonnet",
    modelId: "claude-sonnet-4-6",
    hasWebsearch: true,
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
  },
  gpt: {
    id: "gpt",
    name: "GPT-4o",
    modelId: "gpt-4o",
    hasWebsearch: true,
    apiKeyEnvVar: "OPENAI_API_KEY",
  },
  gemini: {
    id: "gemini",
    name: "Gemini 3.1 Pro",
    modelId: "gemini-3.1-pro-preview",
    hasWebsearch: true,
    apiKeyEnvVar: "GOOGLE_AI_API_KEY",
  },
  grok: {
    id: "grok",
    name: "Grok 4.20",
    modelId: "grok-4.20-beta-0309-reasoning",
    hasWebsearch: true,
    apiKeyEnvVar: "XAI_API_KEY",
    baseUrl: "https://api.x.ai/v1",
  },
  perplexity: {
    id: "perplexity",
    name: "Perplexity Sonar Pro",
    modelId: "sonar-pro",
    hasWebsearch: true,
    apiKeyEnvVar: "PERPLEXITY_API_KEY",
    baseUrl: "https://api.perplexity.ai",
  },
  opus: {
    id: "opus",
    name: "Claude Opus",
    modelId: "claude-opus-4-7",
    hasWebsearch: false,
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
  },
  tavily: {
    id: "tavily",
    name: "Tavily Search",
    modelId: "tavily-search",
    hasWebsearch: true,
    apiKeyEnvVar: "TAVILY_API_KEY",
    baseUrl: "https://api.tavily.com",
  },
  kimi: {
    id: "kimi",
    name: "Kimi K2.6",
    modelId: "kimi-k2.6",
    hasWebsearch: true,
    apiKeyEnvVar: "MOONSHOT_API_KEY",
    baseUrl: "https://api.moonshot.cn/v1",
  },
  companies_house: {
    id: "companies_house",
    name: "Companies House",
    modelId: "companies-house-api",
    hasWebsearch: false,
    apiKeyEnvVar: "COMPANIES_HOUSE_API_KEY",
    baseUrl: "https://api.company-information.service.gov.uk",
  },
};

/* ── Cascade Result Types ── */

/** Single result from any provider */
export interface CascadeResult<T = unknown> {
  taskId: CascadeTaskId;
  provider: ProviderId;
  modelId: string;
  timestamp: string;
  executionTimeMs: number;
  data: T[];
  metadata: {
    totalResults: number;
    sourcesCited: number;
    avgConfidence: number;
    geographicScope: "london";
    dateRange: string;
  };
  errors: string[];
}

/** Conflict resolution entry from Opus judge */
export interface ConflictResolution {
  dataPoint: string;
  valuesBySource: Partial<Record<ProviderId, string>>;
  resolvedValue: string;
  resolutionReason: string;
}

/** Final validated dataset after Opus judging */
export interface ValidatedDataset<T = unknown> {
  taskId: CascadeTaskId;
  judge: "opus";
  timestamp: string;
  data: T[];
  confidenceReport: {
    totalPoints: number;
    highConfidence: number;   // >= 0.85
    mediumConfidence: number; // 0.5 - 0.84
    lowConfidence: number;    // < 0.5
    manualReview: number;     // contradictory across all sources
  };
  conflicts: ConflictResolution[];
  readyForInjection: boolean;
}

/** Progress update sent via streaming/SSE */
export interface CascadeProgress {
  status: CascadeStatus;
  taskId: CascadeTaskId;
  completedProviders: ProviderId[];
  totalProviders: number;
  currentPhase: 1 | 2 | 3 | 4;
  message: string;
  timestamp: string;
}

/* ── Task-Specific Data Schemas ── */

/** Livability score for a single district */
export interface LivabilityScoreResult {
  districtSlug: string;
  scores: (number | null)[];       // 10 scores, null if unknown
  sources: (string | null)[];      // 1 citation per factor
  confidence: (number | null)[];   // 0.0-1.0 per score
  lastVerified: string;
}

/** Single funding round */
export interface FundingRoundResult {
  companyName: string;
  companySlug: string;
  companySector: string;
  companyDistrict: string | null;
  roundType: string;
  amountGbp: number | null;
  originalAmount: string | null;
  announcedDate: string;
  leadInvestor: string | null;
  otherInvestors: string[];
  sourceUrl: string;
  companyWebsite: string | null;
}

/** Real founder profile */
export interface FounderProfileResult {
  fullName: string;
  companyName: string;
  companyWebsite: string | null;
  companyLinkedinUrl: string | null;
  role: string;
  sector: string;
  district: string | null;
  foundedYear: number | null;
  fundingRaisedTotal: string | null;
  latestRound: string | null;
  linkedinUrl: string | null;
  bioSummary: string;
  sourceUrls: string[];
  notableFacts: string[];
}

/** AI ecosystem company entry */
export interface AICompanyResult {
  companyName: string;
  aiSubsector: string;
  companyType: string;
  district: string | null;
  foundedYear: number | null;
  employeeRange: string | null;
  totalFunding: string | null;
  description: string;
  website: string | null;
  linkedinUrl: string | null;
  sourceUrl: string;
}

/** Ecosystem insight article */
export interface InsightArticleResult {
  title: string;
  slug: string;
  summary: string;
  bodyMarkdown: string;
  publishDate: string;
  author: string;
  tags: string[];
  sourceUrls: string[];
  heroStat: string | null;
}

/** Upcoming tech event */
export interface TechEventResult {
  name: string;
  eventType: string;
  districtSlug: string | null;
  startDate: string | null;
  endDate: string | null;
  recurrenceType: string | null;
  audienceType: string | null;
  estimatedAttendance: number | null;
  investorPresenceScore: number | null;
  founderRelevanceScore: number | null;
  applicationRequired: boolean;
  priceFree: boolean;
  website: string | null;
  sectorFocus: string[];
  notes: string | null;
  sourceUrl: string;
}

/** Research report link */
export interface ResearchReportResult {
  title: string;
  publisher: string;
  publishDate: string;
  url: string;
  format: "pdf" | "webpage" | "interactive" | "video";
  isFree: boolean;
  summary: string;
  relevance: string;
  category: string;
}

/** Organization update/verification result */
export interface OrgUpdateResult {
  companyName: string;
  companySlug: string;
  status: "active" | "closed" | "acquired" | "relocated" | "pivoted" | "unknown";
  primarySector: string | null;
  districtSlug: string | null;
  employeeRange: string | null;
  website: string | null;
  linkedinUrl: string | null;
  fundingStage: string | null;
  description: string | null;
  updateNotes: string | null;
  sourceUrl: string;
}

/** Program (accelerator, grant, bootcamp, etc.) update */
export interface ProgramUpdateResult {
  programName: string;
  programType: string;
  hostOrganization: string | null;
  districtSlug: string | null;
  sectorFocus: string[];
  format: string | null;
  costGbp: number | null;
  isFree: boolean;
  durationWeeks: number | null;
  applicationUrl: string | null;
  applicationDeadline: string | null;
  description: string;
  website: string | null;
  sourceUrl: string;
}

/** Market data point for /why-london page */
export interface MarketDataResult {
  category: string;
  metricName: string;
  value: string;
  numericValue: number | null;
  unit: string | null;
  year: number;
  sourceUrl: string;
  sourceName: string;
  trend: "up" | "down" | "stable" | null;
  comparison: string | null;
}

/** Toolkit item (tool, resource, service) for /toolkit page */
export interface ToolkitItemResult {
  name: string;
  category: string;
  subcategory: string | null;
  description: string;
  url: string;
  isFree: boolean;
  pricingModel: string | null;
  targetAudience: string;
  londonSpecific: boolean;
  sourceUrl: string;
}

/** Resource link for /resources page */
export interface ResourceLinkResult {
  title: string;
  category: string;
  subcategory: string | null;
  description: string;
  url: string;
  resourceType: string;
  provider: string;
  isFree: boolean;
  londonSpecific: boolean;
  sourceUrl: string;
}

/** Insights article for /insights page */
export interface InsightsArticleResult {
  title: string;
  slug: string;
  summary: string;
  bodyMarkdown: string;
  category: string;
  tags: string[];
  publishDate: string;
  author: string;
  heroStat: string | null;
  heroStatLabel: string | null;
  sourceUrls: string[];
}

/** Success story for /stories page */
export interface SuccessStoryResult {
  companyName: string;
  companySlug: string;
  founderName: string;
  sector: string;
  districtSlug: string | null;
  headline: string;
  summary: string;
  bodyMarkdown: string;
  fundingRaised: string | null;
  employeeCount: string | null;
  foundedYear: number | null;
  milestones: string[];
  website: string | null;
  sourceUrls: string[];
}

/** District narrative for district detail pages */
export interface DistrictNarrativeResult {
  districtSlug: string;
  districtName: string;
  narrative: string;
  keyCompanies: string[];
  keyInvestors: string[];
  notableFeatures: string[];
  transportLinks: string[];
  vibeDescription: string;
  sourceUrls: string[];
}

/** City comparison data for top 10 global tech markets */
export interface CityComparisonResult {
  city: string;
  country: string;
  rank: number;
  vcFundingUsd: string;
  vcFundingNumeric: number | null;
  techTalentPool: string;
  unicornCount: number | null;
  startupCount: string | null;
  topSectors: string[];
  visaRoute: string;
  visaNote: string;
  costIndex: string;
  avgRent1Bed: string;
  qualityOfLifeScore: number | null;
  qualityOfLifeNote: string;
  englishProficiency: string;
  timezone: string;
  timezoneAdvantage: string;
  keyStrength: string;
  keyWeakness: string;
  sourceUrl: string;
  sourceName: string;
  year: number;
}

/** London competitive advantage entry */
export interface CompetitiveAdvantageResult {
  category: string;
  title: string;
  description: string;
  keyMetric: string | null;
  keyMetricLabel: string | null;
  isFutureAdvantage: boolean;
  nicheArea: string | null;
  relevanceToF500: string;
  sourceUrl: string;
  sourceName: string;
  sortOrder: number;
}

/** London global leadership category */
export interface LeadershipCategoryResult {
  category: string;
  globalRank: number;
  description: string;
  keyCompanies: string[];
  keyMetric: string;
  marketSize: string | null;
  growthRate: string | null;
  sourceUrl: string;
  sourceName: string;
}

/** Discovered video source (YouTube channel) */
export interface VideoSourceDiscoveryResult {
  channelName: string;
  platformChannelId: string;
  description: string;
  subscriberCount: number | null;
  websiteUrl: string | null;
  relevanceReason: string;
  suggestedTier: "tier_1" | "tier_2" | "tier_3";
  sourceUrl: string;
  sourceCategory: "university" | "vc" | "accelerator" | "conference" | "media" | "civic" | "co_op" | "lab" | "borough" | null;
  londonBorough: string | null;
  londonDistrict: string | null;
  sectorTags: string[];
}

/** Eventbrite/Meetup community event */
export interface EventbriteMeetupPollingResult {
  eventName: string;
  eventSource: "eventbrite" | "meetup" | "luma" | "linkedin";
  eventUrl: string;
  startDateTime: string;
  endDateTime: string | null;
  location: string | null;
  districtSlug: string | null;
  eventCategory: string;
  estimatedAttendance: number | null;
  isFree: boolean | null;
  organizerName: string | null;
  sectorTags: string[];
  description: string | null;
  sourceUrl: string;
}

/** Phase 11 catalog-sync proposal shape — matches proposalPayloadSchema in
 *  src/lib/pricing/proposals.ts. Providers emit one of these per detected
 *  drift; the injector dedupes against existing PENDING proposals and writes
 *  surviving rows to FeatureCatalogProposal. */
export interface FeatureCatalogProposalResult {
  /** Discriminator — must match a ProposalType enum value. */
  proposalType:
    | "ADD_FEATURE"
    | "DEPRECATE_FEATURE"
    | "MODIFY_TIER_MAPPING"
    | "MODIFY_LIMIT"
    | "MODIFY_TIER"
    | "MODIFY_CATEGORY";
  /** Structured diff — shape depends on proposalType. Validated against
   *  proposalPayloadSchema before insert; invalid rows are skipped with a
   *  warning. */
  payload: Record<string, unknown>;
  /** Why this change is being proposed. Shown in /admin/pricing/proposals. */
  rationale: string;
  /** Citations: file paths, doc sections, commit SHAs, source URLs. */
  evidence: Array<{
    kind: "code" | "doc" | "commit" | "url";
    ref: string;
    note?: string;
  }>;
}

/** Maps task IDs to their result types */
export type TaskResultMap = {
  livability_scores: LivabilityScoreResult;
  london_funding_rounds: FundingRoundResult;
  london_founder_profiles: FounderProfileResult;
  london_ai_ecosystem: AICompanyResult;
  london_ecosystem_insights: InsightArticleResult;
  london_research_reports: ResearchReportResult;
  london_tech_events: TechEventResult;
  london_org_updates: OrgUpdateResult;
  london_programs_update: ProgramUpdateResult;
  london_market_data: MarketDataResult;
  london_toolkit_data: ToolkitItemResult;
  london_resource_links: ResourceLinkResult;
  london_insights_articles: InsightsArticleResult;
  london_success_stories: SuccessStoryResult;
  london_district_narratives: DistrictNarrativeResult;
  london_city_comparison: CityComparisonResult;
  london_competitive_advantages: CompetitiveAdvantageResult;
  london_leadership_categories: LeadershipCategoryResult;
  video_source_discovery: VideoSourceDiscoveryResult;
  eventbrite_meetup_polling: EventbriteMeetupPollingResult;
  feature_catalog_sync: FeatureCatalogProposalResult;
};

/* ── Provider Interface ── */

/** Every provider must implement this interface */
export interface CascadeProvider {
  id: ProviderId;
  isConfigured(): boolean;
  execute<K extends CascadeTaskId>(
    taskId: K,
    prompt: string,
  ): Promise<CascadeResult<TaskResultMap[K]>>;
}
