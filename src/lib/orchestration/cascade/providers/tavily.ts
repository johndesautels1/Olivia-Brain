/* ═══════════════════════════════════════════════════════════════════════════
   Tavily Provider — Structured search API (not an LLM)
   API: https://docs.tavily.com/documentation/api-reference/endpoint/search
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  CascadeProvider,
  CascadeResult,
  CascadeTaskId,
  TaskResultMap,
} from "../types";
import { PROVIDER_CONFIGS } from "../types";

const TRUSTED_DOMAINS = [
  "techcrunch.com",
  "sifted.eu",
  "uktech.news",
  "gov.uk",
  "companieshouse.gov.uk",
  "crunchbase.com",
  "ft.com",
  "bloomberg.com",
  "reuters.com",
  "tfl.gov.uk",
  "ons.gov.uk",
  "ofcom.org.uk",
  "rightmove.co.uk",
  "zoopla.co.uk",
  "londonandpartners.com",
  "technation.io",
  "ukri.org",
  "innovatefinance.com",
];

const TASK_QUERIES: Record<CascadeTaskId, string[]> = {
  livability_scores: [
    "London district average broadband speed Ofcom 2025 2026",
    "London district average rent 1 bedroom ONS 2025 2026",
    "London tube stations per district TfL",
    "London coworking spaces by area 2025 2026",
    "London parks green space acres by borough",
    "London GP surgeries NHS by postcode",
  ],
  london_funding_rounds: [
    "London startup funding round 2025 2026",
    "London tech company raises Series A B C 2025 2026",
    "London AI startup funding announcement 2025 2026",
    "London fintech funding round 2025 2026",
    "Sifted London funding rounds 2025 2026",
  ],
  london_founder_profiles: [
    "London tech founder CEO raised funding 2025 2026",
    "London AI startup founder profile",
    "London fintech founder Series A",
    "London climate tech founder funding",
  ],
  london_ai_ecosystem: [
    "London AI companies generative AI 2025 2026",
    "London computer vision startup",
    "London NLP chatbot company",
    "London AI infrastructure MLOps company",
    "London AI healthcare drug discovery",
    "London AI safety alignment company",
    "DeepMind London AI research",
  ],
  london_ecosystem_insights: [
    "London AI district ranking Shoreditch Kings Cross 2025 2026",
    "London fintech corridor Revolut Monzo Starling 2025 2026",
    "London climate tech companies funding 2025 2026",
    "Kings Cross Knowledge Quarter tech companies 2025 2026",
    "London AI Safety Institute AISI 2025 2026",
  ],
  london_research_reports: [
    "London tech ecosystem report 2025 2026 PDF free",
    "UK tech investment report London 2025 2026",
    "Innovate UK London grants data 2025 2026",
    "London AI talent report 2025 2026",
    "British Business Bank startup finance report 2025 2026",
  ],
  london_tech_events: [
    "London tech events conferences 2026 upcoming",
    "London startup meetup networking event 2026",
    "London AI summit conference 2026",
    "London fintech conference 2026",
    "Eventbrite London tech events upcoming",
    "London hackathon 2026",
  ],
  london_org_updates: [
    "London tech company closed shut down 2025 2026",
    "London startup acquired 2025 2026",
    "London tech company relocated moved office 2025 2026",
    "London AI startup news update 2026",
    "London fintech company update pivot 2025 2026",
    "Companies House London tech dissolution 2025 2026",
  ],
  london_programs_update: [
    "London startup accelerator program 2025 2026",
    "London tech incubator applications open 2026",
    "London government startup grant scheme 2025 2026",
    "London coding bootcamp AI data science 2026",
    "Innovate UK grant London startup 2025 2026",
    "London venture studio fellowship 2026",
  ],
  london_market_data: [
    "London tech sector statistics 2025 2026",
    "London venture capital investment total 2025 2026",
    "London tech jobs employment statistics 2025 2026",
    "London startup ecosystem ranking global 2025 2026",
    "London unicorn companies total valuation 2025 2026",
    "London AI sector economic contribution 2025 2026",
  ],
  london_toolkit_data: [
    "London startup founder tools resources 2025 2026",
    "UK startup incorporation Companies House guide",
    "London coworking space comparison startups 2026",
    "UK startup visa global talent visa guide 2026",
    "SEIS EIS tax relief startup investor guide UK",
    "London startup legal accounting services 2026",
  ],
  london_resource_links: [
    "London tech community resources founders 2026",
    "UK startup government support resources",
    "London tech networking communities Slack Discord 2026",
    "London startup funding databases directories",
    "UK tech policy regulation resources startups",
    "London AI safety governance resources 2026",
  ],
  london_insights_articles: [
    "London tech ecosystem analysis trends 2025 2026",
    "London AI investment landscape 2025 2026",
    "London fintech regulation innovation 2025 2026",
    "London climate tech green innovation 2025 2026",
    "London deep tech biotech quantum 2025 2026",
  ],
  london_success_stories: [
    "London startup success story growth 2025 2026",
    "London AI company success raised funding 2025 2026",
    "London fintech founder success story",
    "London climate tech startup impact story",
    "London unicorn company origin story founder",
  ],
  london_district_narratives: [
    "Kings Cross tech hub companies Google DeepMind 2026",
    "Shoreditch startup scene Silicon Roundabout 2026",
    "Canary Wharf fintech hub companies 2026",
    "London Bridge Bermondsey tech companies 2026",
    "White City innovation district Imperial College 2026",
    "City of London financial technology 2026",
  ],
  london_city_comparison: [
    "top 10 global tech ecosystems ranking 2025 2026 Startup Genome",
    "London vs San Francisco Bay Area venture capital tech investment 2025 2026",
    "London vs New York tech ecosystem comparison VC funding unicorns 2025 2026",
    "Singapore Tel Aviv Berlin tech startup ecosystem comparison 2025 2026",
    "global tech talent pool comparison cities 2025 2026 Dealroom",
    "London tech visa Global Talent route vs US H-1B comparison 2026",
    "Bangalore Toronto tech startup ecosystem statistics 2025 2026",
  ],
  london_competitive_advantages: [
    "London tech competitive advantages over other cities 2025 2026",
    "London SEIS EIS tax relief startup investor benefits UK 2026",
    "London tech talent pool universities Imperial UCL Kings 2026",
    "London time zone advantage global business finance tech",
    "London AI Safety Institute global leadership regulation 2025 2026",
    "London green finance climate tech leadership 2025 2026",
    "London quantum computing biotech deep tech investment 2025 2026",
  ],
  london_leadership_categories: [
    "London fintech global leadership Revolut Monzo Wise market share 2025 2026",
    "London AI safety alignment companies global ranking 2025 2026",
    "London legaltech regtech companies global market 2025 2026",
    "London edtech companies global ranking 2025 2026",
    "London insurtech wealthtech companies 2025 2026",
    "London cybersecurity digital health companies global 2025 2026",
  ],
  video_source_discovery: [
    "London tech YouTube channels startup ecosystem 2025 2026",
    "London venture capital VC YouTube channel fintech AI 2025 2026",
    "London tech events conference recordings YouTube 2025 2026",
    "London accelerator incubator YouTube Seedcamp EF Techstars 2025 2026",
    "London university tech entrepreneurship YouTube Imperial UCL LBS 2025 2026",
    "UK tech podcast video London startup scene 2025 2026",
  ],
  eventbrite_meetup_polling: [
    "Eventbrite London tech startup events upcoming 2026",
    "Meetup.com London tech meetups upcoming events 2026",
    "Lu.ma London tech events calendar 2026",
    "London AI meetup community events upcoming 2026",
    "London fintech networking event upcoming 2026",
    "London startup pitch night demo day 2026",
  ],
  feature_catalog_sync: [],
};

export function createTavilyProvider(): CascadeProvider {
  const config = PROVIDER_CONFIGS.tavily;

  return {
    id: "tavily",

    isConfigured(): boolean {
      return !!process.env[config.apiKeyEnvVar];
    },

    async execute<K extends CascadeTaskId>(
      taskId: K,
      prompt: string,
    ): Promise<CascadeResult<TaskResultMap[K]>> {
      const apiKey = process.env[config.apiKeyEnvVar];
      if (!apiKey) {
        return emptyResult(taskId, [
          `${config.apiKeyEnvVar} not configured`,
        ]);
      }

      const startTime = Date.now();
      const queries = TASK_QUERIES[taskId] ?? [prompt];

      try {
        const searchResults = await Promise.all(
          queries.map((query) => tavilySearch(apiKey, query)),
        );

        const allResults = searchResults.flat();
        const executionTimeMs = Date.now() - startTime;

        return {
          taskId,
          provider: "tavily",
          modelId: "tavily-search",
          timestamp: new Date().toISOString(),
          executionTimeMs,
          data: allResults as unknown as TaskResultMap[K][],
          metadata: {
            totalResults: allResults.length,
            sourcesCited: new Set(allResults.map((r) => r.url)).size,
            avgConfidence: 0.7,
            geographicScope: "london",
            dateRange: "2025-03 to 2026-03",
          },
          errors: [],
        };
      } catch (err) {
        return emptyResult(taskId, [
          `Tavily request failed: ${err instanceof Error ? err.message : String(err)}`,
        ]);
      }
    },
  };
}

interface TavilyResult {
  title: string;
  content: string;
  url: string;
  score?: number;
}

async function tavilySearch(
  apiKey: string,
  query: string,
): Promise<TavilyResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      include_answer: true,
      include_raw_content: false,
      max_results: 10,
      include_domains: TRUSTED_DOMAINS,
      topic: "general",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Tavily ${res.status}: ${errText}`);
  }

  const json = await res.json();
  return (json.results ?? []) as TavilyResult[];
}

function emptyResult<K extends CascadeTaskId>(
  taskId: K,
  errors: string[],
): CascadeResult<TaskResultMap[K]> {
  return {
    taskId,
    provider: "tavily",
    modelId: "tavily-search",
    timestamp: new Date().toISOString(),
    executionTimeMs: 0,
    data: [],
    metadata: {
      totalResults: 0,
      sourcesCited: 0,
      avgConfidence: 0,
      geographicScope: "london",
      dateRange: "",
    },
    errors,
  };
}
