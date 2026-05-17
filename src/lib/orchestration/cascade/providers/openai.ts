/* ═══════════════════════════════════════════════════════════════════════════
   OpenAI Provider — GPT-4o with web search + Structured Outputs
   API: https://platform.openai.com/docs/guides/tools-web-search
        https://platform.openai.com/docs/guides/structured-outputs
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  CascadeProvider,
  CascadeResult,
  CascadeTaskId,
  TaskResultMap,
} from "../types";
import { PROVIDER_CONFIGS } from "../types";

const TASK_SCHEMAS: Record<CascadeTaskId, { name: string; schema: Record<string, unknown> }> = {
  london_ai_ecosystem: {
    name: "london_ai_ecosystem",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              companyName: { type: "string" },
              aiSubsector: { type: "string" },
              companyType: { type: "string" },
              district: { type: ["string", "null"] },
              foundedYear: { type: ["integer", "null"] },
              employeeRange: { type: ["string", "null"] },
              totalFunding: { type: ["string", "null"] },
              description: { type: "string" },
              website: { type: ["string", "null"] },
              sourceUrl: { type: "string" },
            },
            required: [
              "companyName", "aiSubsector", "companyType", "district",
              "foundedYear", "employeeRange", "totalFunding", "description",
              "website", "sourceUrl",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  london_founder_profiles: {
    name: "london_founder_profiles",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              fullName: { type: "string" },
              companyName: { type: "string" },
              companyWebsite: { type: ["string", "null"] },
              companyLinkedinUrl: { type: ["string", "null"] },
              role: { type: "string" },
              sector: { type: "string" },
              district: { type: ["string", "null"] },
              foundedYear: { type: ["integer", "null"] },
              fundingRaisedTotal: { type: ["string", "null"] },
              latestRound: { type: ["string", "null"] },
              linkedinUrl: { type: ["string", "null"] },
              bioSummary: { type: "string" },
              sourceUrls: { type: "array", items: { type: "string" } },
              notableFacts: { type: "array", items: { type: "string" } },
            },
            required: [
              "fullName", "companyName", "companyWebsite", "companyLinkedinUrl", "role", "sector",
              "district", "foundedYear", "fundingRaisedTotal", "latestRound",
              "linkedinUrl", "bioSummary", "sourceUrls", "notableFacts",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  london_funding_rounds: {
    name: "london_funding_rounds",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              companyName: { type: "string" },
              companySlug: { type: "string" },
              companySector: { type: "string" },
              companyDistrict: { type: ["string", "null"] },
              roundType: { type: "string" },
              amountGbp: { type: ["number", "null"] },
              originalAmount: { type: ["string", "null"] },
              announcedDate: { type: "string" },
              leadInvestor: { type: ["string", "null"] },
              otherInvestors: { type: "array", items: { type: "string" } },
              sourceUrl: { type: "string" },
              companyWebsite: { type: ["string", "null"] },
            },
            required: [
              "companyName", "companySlug", "companySector", "companyDistrict",
              "roundType", "amountGbp", "originalAmount", "announcedDate",
              "leadInvestor", "otherInvestors", "sourceUrl", "companyWebsite",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  livability_scores: {
    name: "livability_scores",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              districtSlug: { type: "string" },
              scores: { type: "array", items: { type: ["number", "null"] } },
              sources: { type: "array", items: { type: ["string", "null"] } },
              confidence: { type: "array", items: { type: ["number", "null"] } },
              lastVerified: { type: "string" },
            },
            required: ["districtSlug", "scores", "sources", "confidence", "lastVerified"],
          },
        },
      },
      required: ["results"],
    },
  },

  london_ecosystem_insights: {
    name: "london_ecosystem_insights",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              slug: { type: "string" },
              summary: { type: "string" },
              bodyMarkdown: { type: "string" },
              publishDate: { type: "string" },
              author: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              sourceUrls: { type: "array", items: { type: "string" } },
              heroStat: { type: ["string", "null"] },
            },
            required: [
              "title", "slug", "summary", "bodyMarkdown", "publishDate",
              "author", "tags", "sourceUrls", "heroStat",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  london_research_reports: {
    name: "london_research_reports",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              publisher: { type: "string" },
              publishDate: { type: "string" },
              url: { type: "string" },
              format: { type: "string" },
              isFree: { type: "boolean" },
              summary: { type: "string" },
              relevance: { type: "string" },
              category: { type: "string" },
            },
            required: [
              "title", "publisher", "publishDate", "url", "format",
              "isFree", "summary", "relevance", "category",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  london_tech_events: {
    name: "london_tech_events",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              eventType: { type: "string" },
              districtSlug: { type: ["string", "null"] },
              startDate: { type: ["string", "null"] },
              endDate: { type: ["string", "null"] },
              recurrenceType: { type: ["string", "null"] },
              audienceType: { type: ["string", "null"] },
              estimatedAttendance: { type: ["integer", "null"] },
              investorPresenceScore: { type: ["number", "null"] },
              founderRelevanceScore: { type: ["number", "null"] },
              applicationRequired: { type: "boolean" },
              priceFree: { type: "boolean" },
              website: { type: ["string", "null"] },
              sectorFocus: { type: "array", items: { type: "string" } },
              notes: { type: ["string", "null"] },
              sourceUrl: { type: "string" },
            },
            required: [
              "name", "eventType", "districtSlug", "startDate", "endDate",
              "recurrenceType", "audienceType", "estimatedAttendance",
              "investorPresenceScore", "founderRelevanceScore",
              "applicationRequired", "priceFree", "website", "sectorFocus",
              "notes", "sourceUrl",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  london_org_updates: {
    name: "london_org_updates",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              companyName: { type: "string" },
              companySlug: { type: "string" },
              status: { type: "string" },
              primarySector: { type: ["string", "null"] },
              districtSlug: { type: ["string", "null"] },
              employeeRange: { type: ["string", "null"] },
              website: { type: ["string", "null"] },
              fundingStage: { type: ["string", "null"] },
              description: { type: ["string", "null"] },
              updateNotes: { type: ["string", "null"] },
              sourceUrl: { type: "string" },
            },
            required: [
              "companyName", "companySlug", "status", "primarySector",
              "districtSlug", "employeeRange", "website", "fundingStage",
              "description", "updateNotes", "sourceUrl",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  london_programs_update: {
    name: "london_programs_update",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              programName: { type: "string" },
              programType: { type: "string" },
              hostOrganization: { type: ["string", "null"] },
              districtSlug: { type: ["string", "null"] },
              sectorFocus: { type: "array", items: { type: "string" } },
              format: { type: ["string", "null"] },
              costGbp: { type: ["number", "null"] },
              isFree: { type: "boolean" },
              durationWeeks: { type: ["integer", "null"] },
              applicationUrl: { type: ["string", "null"] },
              applicationDeadline: { type: ["string", "null"] },
              description: { type: "string" },
              website: { type: ["string", "null"] },
              sourceUrl: { type: "string" },
            },
            required: [
              "programName", "programType", "hostOrganization", "districtSlug",
              "sectorFocus", "format", "costGbp", "isFree", "durationWeeks",
              "applicationUrl", "applicationDeadline", "description",
              "website", "sourceUrl",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  london_market_data: {
    name: "london_market_data",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              category: { type: "string" },
              metricName: { type: "string" },
              value: { type: "string" },
              numericValue: { type: ["number", "null"] },
              unit: { type: ["string", "null"] },
              year: { type: "integer" },
              sourceUrl: { type: "string" },
              sourceName: { type: "string" },
              trend: { type: ["string", "null"] },
              comparison: { type: ["string", "null"] },
            },
            required: [
              "category", "metricName", "value", "numericValue", "unit",
              "year", "sourceUrl", "sourceName", "trend", "comparison",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  london_toolkit_data: {
    name: "london_toolkit_data",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              category: { type: "string" },
              subcategory: { type: ["string", "null"] },
              description: { type: "string" },
              url: { type: "string" },
              isFree: { type: "boolean" },
              pricingModel: { type: ["string", "null"] },
              targetAudience: { type: "string" },
              londonSpecific: { type: "boolean" },
              sourceUrl: { type: "string" },
            },
            required: [
              "name", "category", "subcategory", "description", "url",
              "isFree", "pricingModel", "targetAudience", "londonSpecific",
              "sourceUrl",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  london_resource_links: {
    name: "london_resource_links",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              category: { type: "string" },
              subcategory: { type: ["string", "null"] },
              description: { type: "string" },
              url: { type: "string" },
              resourceType: { type: "string" },
              provider: { type: "string" },
              isFree: { type: "boolean" },
              londonSpecific: { type: "boolean" },
              sourceUrl: { type: "string" },
            },
            required: [
              "title", "category", "subcategory", "description", "url",
              "resourceType", "provider", "isFree", "londonSpecific",
              "sourceUrl",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  london_insights_articles: {
    name: "london_insights_articles",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              slug: { type: "string" },
              summary: { type: "string" },
              bodyMarkdown: { type: "string" },
              category: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              publishDate: { type: "string" },
              author: { type: "string" },
              heroStat: { type: ["string", "null"] },
              heroStatLabel: { type: ["string", "null"] },
              sourceUrls: { type: "array", items: { type: "string" } },
            },
            required: [
              "title", "slug", "summary", "bodyMarkdown", "category",
              "tags", "publishDate", "author", "heroStat", "heroStatLabel",
              "sourceUrls",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  london_success_stories: {
    name: "london_success_stories",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              companyName: { type: "string" },
              companySlug: { type: "string" },
              founderName: { type: "string" },
              sector: { type: "string" },
              districtSlug: { type: ["string", "null"] },
              headline: { type: "string" },
              summary: { type: "string" },
              bodyMarkdown: { type: "string" },
              fundingRaised: { type: ["string", "null"] },
              employeeCount: { type: ["string", "null"] },
              foundedYear: { type: ["integer", "null"] },
              milestones: { type: "array", items: { type: "string" } },
              website: { type: ["string", "null"] },
              sourceUrls: { type: "array", items: { type: "string" } },
            },
            required: [
              "companyName", "companySlug", "founderName", "sector",
              "districtSlug", "headline", "summary", "bodyMarkdown",
              "fundingRaised", "employeeCount", "foundedYear", "milestones",
              "website", "sourceUrls",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  london_district_narratives: {
    name: "london_district_narratives",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              districtSlug: { type: "string" },
              districtName: { type: "string" },
              narrative: { type: "string" },
              keyCompanies: { type: "array", items: { type: "string" } },
              keyInvestors: { type: "array", items: { type: "string" } },
              notableFeatures: { type: "array", items: { type: "string" } },
              transportLinks: { type: "array", items: { type: "string" } },
              vibeDescription: { type: "string" },
              sourceUrls: { type: "array", items: { type: "string" } },
            },
            required: [
              "districtSlug", "districtName", "narrative", "keyCompanies",
              "keyInvestors", "notableFeatures", "transportLinks",
              "vibeDescription", "sourceUrls",
            ],
          },
        },
      },
      required: ["results"],
    },
  },
  london_city_comparison: {
    name: "london_city_comparison",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              city: { type: "string" },
              country: { type: "string" },
              rank: { type: "integer" },
              vcFundingUsd: { type: "string" },
              vcFundingNumeric: { type: ["number", "null"] },
              techTalentPool: { type: "string" },
              unicornCount: { type: ["integer", "null"] },
              startupCount: { type: ["string", "null"] },
              topSectors: { type: "array", items: { type: "string" } },
              visaRoute: { type: "string" },
              visaNote: { type: "string" },
              costIndex: { type: "string" },
              avgRent1Bed: { type: "string" },
              qualityOfLifeScore: { type: ["integer", "null"] },
              qualityOfLifeNote: { type: "string" },
              englishProficiency: { type: "string" },
              timezone: { type: "string" },
              timezoneAdvantage: { type: "string" },
              keyStrength: { type: "string" },
              keyWeakness: { type: "string" },
              sourceUrl: { type: "string" },
              sourceName: { type: "string" },
              year: { type: "integer" },
            },
            required: [
              "city", "country", "rank", "vcFundingUsd", "vcFundingNumeric",
              "techTalentPool", "unicornCount", "startupCount", "topSectors",
              "visaRoute", "visaNote", "costIndex", "avgRent1Bed",
              "qualityOfLifeScore", "qualityOfLifeNote", "englishProficiency",
              "timezone", "timezoneAdvantage", "keyStrength", "keyWeakness",
              "sourceUrl", "sourceName", "year",
            ],
          },
        },
      },
      required: ["results"],
    },
  },
  london_competitive_advantages: {
    name: "london_competitive_advantages",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              category: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              keyMetric: { type: ["string", "null"] },
              keyMetricLabel: { type: ["string", "null"] },
              isFutureAdvantage: { type: "boolean" },
              nicheArea: { type: ["string", "null"] },
              relevanceToF500: { type: "string" },
              sourceUrl: { type: "string" },
              sourceName: { type: "string" },
              sortOrder: { type: "integer" },
            },
            required: [
              "category", "title", "description", "keyMetric",
              "keyMetricLabel", "isFutureAdvantage", "nicheArea",
              "relevanceToF500", "sourceUrl", "sourceName", "sortOrder",
            ],
          },
        },
      },
      required: ["results"],
    },
  },
  london_leadership_categories: {
    name: "london_leadership_categories",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              category: { type: "string" },
              globalRank: { type: "integer" },
              description: { type: "string" },
              keyCompanies: { type: "array", items: { type: "string" } },
              keyMetric: { type: "string" },
              marketSize: { type: ["string", "null"] },
              growthRate: { type: ["string", "null"] },
              sourceUrl: { type: "string" },
              sourceName: { type: "string" },
            },
            required: [
              "category", "globalRank", "description", "keyCompanies",
              "keyMetric", "marketSize", "growthRate", "sourceUrl", "sourceName",
            ],
          },
        },
      },
      required: ["results"],
    },
  },
  video_source_discovery: {
    name: "video_source_discovery",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              channelName: { type: "string" },
              platformChannelId: { type: "string" },
              description: { type: "string" },
              subscriberCount: { type: ["integer", "null"] },
              websiteUrl: { type: ["string", "null"] },
              relevanceReason: { type: "string" },
              suggestedTier: { type: "string", enum: ["tier_1", "tier_2", "tier_3"] },
              sourceUrl: { type: "string" },
            },
            required: [
              "channelName", "platformChannelId", "description",
              "subscriberCount", "websiteUrl",
              "relevanceReason", "suggestedTier", "sourceUrl",
            ],
          },
        },
      },
      required: ["results"],
    },
  },
  eventbrite_meetup_polling: {
    name: "eventbrite_meetup_polling",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              eventName: { type: "string" },
              eventSource: { type: "string", enum: ["eventbrite", "meetup", "luma", "linkedin"] },
              eventUrl: { type: "string" },
              startDateTime: { type: "string" },
              endDateTime: { type: ["string", "null"] },
              location: { type: ["string", "null"] },
              districtSlug: { type: ["string", "null"] },
              eventCategory: { type: "string" },
              estimatedAttendance: { type: ["integer", "null"] },
              isFree: { type: ["boolean", "null"] },
              organizerName: { type: ["string", "null"] },
              sectorTags: { type: "array", items: { type: "string" } },
              description: { type: ["string", "null"] },
              sourceUrl: { type: "string" },
            },
            required: [
              "eventName", "eventSource", "eventUrl", "startDateTime",
              "endDateTime", "location", "districtSlug", "eventCategory",
              "estimatedAttendance", "isFree", "organizerName", "sectorTags",
              "description", "sourceUrl",
            ],
          },
        },
      },
      required: ["results"],
    },
  },

  feature_catalog_sync: {
    name: "feature_catalog_sync",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              proposalType: {
                type: "string",
                enum: [
                  "ADD_FEATURE",
                  "DEPRECATE_FEATURE",
                  "MODIFY_TIER_MAPPING",
                  "MODIFY_LIMIT",
                  "MODIFY_TIER",
                  "MODIFY_CATEGORY",
                ],
              },
              payload: { type: "object", additionalProperties: true, properties: {} },
              rationale: { type: "string" },
              evidence: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    kind: { type: "string", enum: ["code", "doc", "commit", "url"] },
                    ref: { type: "string" },
                    note: { type: ["string", "null"] },
                  },
                  required: ["kind", "ref", "note"],
                },
              },
            },
            required: ["proposalType", "payload", "rationale", "evidence"],
          },
        },
      },
      required: ["results"],
    },
  },
};

export function createOpenAIProvider(): CascadeProvider {
  const config = PROVIDER_CONFIGS.gpt;

  return {
    id: "gpt",

    isConfigured(): boolean {
      return !!process.env[config.apiKeyEnvVar];
    },

    async execute<K extends CascadeTaskId>(
      taskId: K,
      prompt: string,
    ): Promise<CascadeResult<TaskResultMap[K]>> {
      const apiKey = process.env[config.apiKeyEnvVar];
      if (!apiKey) {
        return emptyResult(taskId, config.modelId, [
          `${config.apiKeyEnvVar} not configured`,
        ]);
      }

      const startTime = Date.now();
      const taskSchema = TASK_SCHEMAS[taskId];

      try {
        const res = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.modelId,
            tools: [{ type: "web_search" }],
            tool_choice: "auto",
            include: ["web_search_call.action.sources"],
            max_output_tokens: 12000,
            text: {
              format: {
                type: "json_schema",
                name: taskSchema.name,
                strict: true,
                schema: taskSchema.schema,
              },
            },
            instructions:
              "You are a research evaluator for London Tech Map. " +
              "All entities must be London-headquartered or London-based. " +
              "If a field cannot be verified, return null. " +
              "Return only valid JSON matching the schema. " +
              "Do not include markdown, explanatory text, or citations outside the JSON.",
            input: [{ role: "user", content: prompt }],
          }),
          signal: AbortSignal.timeout(180_000),
        });

        if (!res.ok) {
          const errText = await res.text();
          return emptyResult(taskId, config.modelId, [
            `OpenAI API error ${res.status}: ${errText}`,
          ]);
        }

        const json = await res.json();

        if (json.status && json.status !== "completed") {
          console.warn(`[openai] Response status: ${json.status}`);
        }
        if (json.error) {
          console.error(`[openai] Response error:`, json.error);
          return emptyResult(taskId, config.modelId, [
            `OpenAI response error: ${JSON.stringify(json.error)}`,
          ]);
        }
        if (json.incomplete_details) {
          console.warn(`[openai] Incomplete response:`, json.incomplete_details);
        }

        const rawText = (json.output ?? [])
          .flatMap((item: { type: string; content?: { type: string; text?: string }[] }) =>
            item.type === "message" ? (item.content ?? []) : [],
          )
          .filter((part: { type: string }) => part.type === "output_text")
          .map((part: { text?: string }) => part.text ?? "")
          .join("\n");

        let parsed = parseStructuredOutput<TaskResultMap[K]>(rawText);
        if (parsed.length === 0) {
          parsed = extractJsonFromText<TaskResultMap[K]>(rawText);
        }

        const executionTimeMs = Date.now() - startTime;

        if (parsed.length === 0) {
          console.warn(`[openai] Zero results parsed for ${taskId}. Response status: ${json.status ?? "unknown"}. Raw content (first 500 chars): ${rawText.slice(0, 500)}`);
        } else {
          console.log(`[openai] Parsed ${parsed.length} results for ${taskId} in ${executionTimeMs}ms`);
        }

        return {
          taskId,
          provider: "gpt",
          modelId: config.modelId,
          timestamp: new Date().toISOString(),
          executionTimeMs,
          data: parsed,
          metadata: {
            totalResults: parsed.length,
            sourcesCited: countCitations(rawText),
            avgConfidence: 0.7,
            geographicScope: "london",
            dateRange: "2025-03 to 2026-03",
          },
          errors: [],
        };
      } catch (err) {
        return emptyResult(taskId, config.modelId, [
          `OpenAI request failed: ${err instanceof Error ? err.message : String(err)}`,
        ]);
      }
    },
  };
}

function emptyResult<K extends CascadeTaskId>(
  taskId: K,
  modelId: string,
  errors: string[],
): CascadeResult<TaskResultMap[K]> {
  return {
    taskId,
    provider: "gpt",
    modelId,
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

function parseStructuredOutput<T>(text: string): T[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    if (Array.isArray(obj.results)) {
      return obj.results as T[];
    }
    if (Array.isArray(obj)) {
      return obj as unknown as T[];
    }
    return [];
  } catch {
    return [];
  }
}

function extractJsonFromText<T>(text: string): T[] {
  const cleaned = text.split(/\nCitations:\n/i)[0].trim();
  const noFences = cleaned.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();

  const arrayMatch = noFences.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T[];
    } catch (e) {
      console.error(`[openai] JSON array parse failed: ${e instanceof Error ? e.message : String(e)}. First 200 chars: ${arrayMatch[0].slice(0, 200)}`);
    }
  }

  const objMatch = noFences.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]) as Record<string, unknown>;
      for (const key of ["data", "results", "items", "companies", "reports", "founders", "scores"]) {
        if (Array.isArray(obj[key])) {
          return obj[key] as T[];
        }
      }
      return [obj as unknown as T];
    } catch (e) {
      console.error(`[openai] JSON object parse failed: ${e instanceof Error ? e.message : String(e)}. First 200 chars: ${objMatch[0].slice(0, 200)}`);
    }
  }

  return [];
}

function countCitations(text: string): number {
  const matches = text.match(/https?:\/\/[^\s"',)}\]]+/g);
  return matches ? new Set(matches).size : 0;
}
