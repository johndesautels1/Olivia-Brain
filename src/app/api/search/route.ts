/**
 * TAVILY SEARCH API
 * =================
 *
 * Web research endpoint using Tavily (position ⑦ in 9-model cascade).
 * Provides real-time search with agent-friendly structured output.
 *
 * POST /api/search
 * Body: { query: string, options?: TavilySearchOptions }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  searchWeb,
  searchRealEstateMarket,
  searchRelocationInfo,
  searchVisaInfo,
  searchNews,
  getQuickAnswer,
  isTavilyConfigured,
  type TavilySearchOptions,
} from "@/lib/services/tavily";

interface SearchRequest {
  query: string;
  type?: "general" | "realEstate" | "relocation" | "visa" | "news" | "quickAnswer";
  options?: TavilySearchOptions;
  // For specialized searches
  location?: string;
  fromCity?: string;
  toCity?: string;
  nationality?: string;
  destination?: string;
  topic?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check if Tavily is configured
    if (!isTavilyConfigured()) {
      return NextResponse.json(
        {
          error: "Tavily is not configured",
          message: "TAVILY_API_KEY environment variable is not set",
          configured: false,
        },
        { status: 503 }
      );
    }

    const body: SearchRequest = await request.json();
    const { query, type = "general", options = {} } = body;

    if (!query && type === "general") {
      return NextResponse.json(
        { error: "Query is required for general search" },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case "realEstate":
        if (!body.location || !body.topic) {
          return NextResponse.json(
            { error: "location and topic are required for real estate search" },
            { status: 400 }
          );
        }
        result = await searchRealEstateMarket(body.location, body.topic);
        break;

      case "relocation":
        if (!body.fromCity || !body.toCity) {
          return NextResponse.json(
            { error: "fromCity and toCity are required for relocation search" },
            { status: 400 }
          );
        }
        result = await searchRelocationInfo(body.fromCity, body.toCity);
        break;

      case "visa":
        if (!body.nationality || !body.destination) {
          return NextResponse.json(
            { error: "nationality and destination are required for visa search" },
            { status: 400 }
          );
        }
        result = await searchVisaInfo(body.nationality, body.destination);
        break;

      case "news":
        if (!body.topic) {
          return NextResponse.json(
            { error: "topic is required for news search" },
            { status: 400 }
          );
        }
        result = await searchNews(body.topic, body.location);
        break;

      case "quickAnswer":
        result = await getQuickAnswer(query);
        break;

      default:
        result = await searchWeb(query, options);
    }

    return NextResponse.json({
      success: true,
      type,
      ...result,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const configured = isTavilyConfigured();

  return NextResponse.json({
    service: "Tavily Web Search",
    position: "⑦ in 9-model cascade",
    purpose: "Web research MCP - real-time search with agent-friendly structured output",
    configured,
    endpoints: {
      general: "POST with { query, options? }",
      realEstate: "POST with { type: 'realEstate', location, topic }",
      relocation: "POST with { type: 'relocation', fromCity, toCity }",
      visa: "POST with { type: 'visa', nationality, destination }",
      news: "POST with { type: 'news', topic, location? }",
      quickAnswer: "POST with { type: 'quickAnswer', query }",
    },
  });
}
