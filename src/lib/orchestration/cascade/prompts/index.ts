/* ═══════════════════════════════════════════════════════════════════════════
   Cascade Prompt Templates
   Each task gets a prompt that all websearch providers receive.
   Opus gets a different judge prompt with all collected results.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { CascadeTaskId } from "../types";

const SYSTEM_CONTEXT = `You are a research evaluator for London Tech Map, an intelligence platform mapping London's tech ecosystem.

CRITICAL RULES:
- ALL data must be London-headquartered or London-based. No exceptions.
- Every data point MUST include a source URL.
- If you cannot verify a fact, return null — do NOT guess.
- Return your response as a valid JSON array matching the schema specified.
- Current date: ${new Date().toISOString().split("T")[0]}`;

const DISTRICT_LIST = [
  "kings-cross", "shoreditch", "old-street", "hoxton", "clerkenwell",
  "farringdon", "bloomsbury", "soho", "covent-garden", "mayfair",
  "marylebone", "city-of-london", "bank", "liverpool-street",
  "london-bridge", "canary-wharf", "white-city", "notting-hill",
  "paddington", "chelsea", "islington", "angel", "hampstead",
  "bermondsey", "peckham", "deptford", "stratford", "richmond",
].join(", ");

/** Get the websearch prompt for a given task.
 *  @param lastCollectionDate — ISO date of the most recent prior data collection.
 *    When provided, the prompt tells providers to focus on data from that date onward.
 */
export function getTaskPrompt(taskId: CascadeTaskId, lastCollectionDate?: string): string {
  const today = new Date().toISOString().split("T")[0];
  const dateWindow = lastCollectionDate
    ? `Focus on NEW data from ${lastCollectionDate} to ${today}. Exclude anything already known before ${lastCollectionDate}.`
    : `Data freshness: last 12 months unless explicitly historical.`;

  const prompts: Record<CascadeTaskId, string> = {

    livability_scores: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Research livability data for London districts and return scored results.

For each of these districts: ${DISTRICT_LIST}

Score these 10 factors (0-100 scale) with citations:

[0] Proximity to Tech Jobs — Count major tech employers (100+ staff) HQ'd in district.
    0-5 companies=20, 6-15=40, 16-30=60, 31-50=80, 50+=90+
[1] Digital Infrastructure — Average broadband Mbps from Ofcom data.
    <50=30, 50-100=50, 100-300=70, 300-900=85, 900+=95
[2] Housing Affordability — Median 1-bed rent from ONS/Rightmove.
    £2500+=10, £2000-2499=25, £1500-1999=40, £1200-1499=55, £900-1199=70, <£900=85
[3] Transport Access — Tube/rail stations within 10-min walk.
    0=30, 1=50, 2-3=70, 4-5=85, 6+ or major interchange=90+
[4] Co-Working Density — Count coworking spaces in district.
    0-2=30, 3-5=50, 6-10=70, 11-20=85, 20+=95
[5] Education Access — Universities/bootcamps within 15-min commute.
    Russell Group=3pts, bootcamp=1pt, research institute=2pts. 0=20, 1-3=40, 4-6=60, 7-10=75, 11+=90+
[6] Innovation Ecosystem — Accelerators/incubators/innovation centres in district.
    0=20, 1-2=40, 3-5=60, 6-10=80, 10+=95
[7] Green Space — Public green space acres within 10-min walk.
    0-5=15, 5-20=30, 20-50=50, 50-100=65, 100-200=75, 200-500=85, 500+=95
[8] Convenience — Density of shops/restaurants/gyms/pharmacies.
    Sparse=40, moderate=60, dense=75, very dense=85, exceptional=95
[9] Healthcare — GP surgeries within 1 mile + A&E proximity.
    0 GPs=20, 1-2 GPs=40, 3-5=60, 5+ with nearby A&E=75, private cluster (Harley St)=90+

Return JSON array:
[{ "districtSlug": "kings-cross", "scores": [95,92,35,98,90,92,88,75,85,78], "sources": ["source per factor..."], "confidence": [0.9, 0.8, ...], "lastVerified": "2026-03-14" }]`,

    london_funding_rounds: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Find all publicly announced funding rounds for London-headquartered tech companies.${lastCollectionDate ? ` Focus on rounds announced since ${lastCollectionDate}.` : ` Cover the last 12 months.`}

LONDON HEADQUARTERED ONLY — verify HQ location before including.
Must have a source URL — no unsourced claims.
If amount is undisclosed, set amountGbp to null but still include the round.
Convert all amounts to GBP.

Search TechCrunch, Sifted, UKTN, Companies House, press releases.

Return JSON array:
[{
  "companyName": "Synthesia",
  "companySlug": "synthesia",
  "companySector": "AI",
  "companyDistrict": "kings-cross",
  "roundType": "series_d_plus",
  "amountGbp": 170000000,
  "originalAmount": "$200M",
  "announcedDate": "2025-06-15",
  "leadInvestor": "NEA",
  "otherInvestors": ["Accel", "GV"],
  "sourceUrl": "https://...",
  "companyWebsite": "https://www.synthesia.io"
}]`,

    london_founder_profiles: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Find 10 real London-based tech founders with publicly available information. These replace fictional profiles on the platform.

Selection criteria:
- Must be London-headquartered company
- Must have raised at least seed funding (publicly announced)
- Diverse mix: AI, fintech, climate tech, health tech, SaaS, deep tech
- Mix of stages: seed through Series C+
- All information must be publicly verifiable

Return JSON array:
[{
  "fullName": "string",
  "companyName": "string",
  "companyWebsite": "url or null",
  "companyLinkedinUrl": "https://www.linkedin.com/company/... or null",
  "role": "Co-founder & CEO",
  "sector": "AI",
  "district": "kings-cross",
  "foundedYear": 2020,
  "fundingRaisedTotal": "£25M",
  "latestRound": "Series A, £8M, led by Index Ventures",
  "linkedinUrl": "url or null (founder's personal LinkedIn profile)",
  "bioSummary": "2-3 sentences, factual only",
  "sourceUrls": ["urls verifying this info"],
  "notableFacts": ["2-3 notable achievements"]
}]

IMPORTANT: "companyLinkedinUrl" must be the COMPANY LinkedIn page (linkedin.com/company/...). "linkedinUrl" is the founder's PERSONAL LinkedIn (linkedin.com/in/...). Do NOT confuse the two.`,

    london_ai_ecosystem: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Map the London AI ecosystem across these sub-sectors. For each, identify London-headquartered companies, research labs, and notable projects.

Sub-sectors:
1. Generative AI — foundation models, LLM apps, text/image/video generation
2. Computer Vision — image recognition, video analytics
3. NLP & Conversational AI — chatbots, language understanding
4. AI Infrastructure — ML platforms, MLOps, data labelling
5. AI for Healthcare — drug discovery, diagnostics
6. AI for Finance — trading, risk, compliance, fraud
7. AI Safety & Alignment — AISI, safety research, evaluation
8. Robotics & Autonomous Systems — autonomous vehicles, drones, warehouse robots

Minimum 5 companies per sub-sector. Include DeepMind, university labs, government bodies.

Return JSON array:
[{
  "companyName": "string",
  "aiSubsector": "Generative AI",
  "companyType": "startup | scaleup | research_lab | corporate_ai_division | university_spinout",
  "district": "kings-cross",
  "foundedYear": 2020,
  "employeeRange": "50-100",
  "totalFunding": "£25M",
  "description": "1-2 sentences",
  "website": "url",
  "linkedinUrl": "https://www.linkedin.com/company/... or null",
  "sourceUrl": "url"
}]

IMPORTANT: "linkedinUrl" must be the COMPANY LinkedIn page (linkedin.com/company/...), NOT a founder or employee personal profile (linkedin.com/in/...). If no company LinkedIn page exists, use null.`,

    london_ecosystem_insights: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Generate 5 fact-checked analytical articles about London's tech ecosystem. Each must cite real data with source URLs.

Articles:
1. "London AI District Rankings 2026" — rank top 5 districts by AI company density with real company names
2. "London FinTech Corridor: Current State" — active fintech companies, recent rounds, FCA developments
3. "London Climate Tech: Who's Building What" — climate tech companies, funding, Innovate UK grants
4. "The King's Cross Knowledge Quarter Effect" — Google, DeepMind, Meta, Crick, Turing; startup density
5. "London's AI Safety Ecosystem" — AISI, DeepMind safety, academic groups, alignment startups

Return JSON array:
[{
  "title": "string",
  "slug": "url-friendly-string",
  "summary": "2-3 sentences",
  "bodyMarkdown": "800-1200 words in Markdown with inline citations",
  "publishDate": "${new Date().toISOString().split("T")[0]}",
  "author": "London Tech Map Intelligence",
  "tags": ["AI", "Districts"],
  "sourceUrls": ["all cited URLs"],
  "heroStat": "£2.4B raised by London AI companies in 2025"
}]`,

    london_research_reports: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Find 30-50 current (2025-2026) publicly available research reports about London's tech ecosystem. Must be freely accessible or have a free executive summary. London/UK tech focus ONLY.

Categories:
1. Government & Policy — DSIT, Innovate UK, London & Partners, GLA
2. VC & Investment — Atomico, BBB, BVCA
3. AI-Specific — AISI, Turing Institute, Tech Nation
4. Sector Analysis — Innovate Finance, BioIndustry Association
5. Talent & Labour — Hired, Tech Nation Jobs & Skills

Return JSON array:
[{
  "title": "exact report title",
  "publisher": "organisation name",
  "publishDate": "October 2025",
  "url": "direct URL to report",
  "format": "pdf | webpage | interactive | video",
  "isFree": true,
  "summary": "2-3 sentence summary of key findings",
  "relevance": "why this matters for London tech",
  "category": "Government & Policy"
}]`,
    london_tech_events: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Find ALL upcoming London-based tech events, conferences, meetups, summits, hackathons, and networking events for the next 60 days. Also include major recurring annual events if their next occurrence is within 6 months.

LONDON-BASED ONLY — the event must take place in London or be primarily aimed at the London tech community.
Must have a source URL — no unsourced claims.

Search Eventbrite, Meetup.com, Lu.ma, LinkedIn Events, TechCrunch events, Sifted, UKTN, London Tech Week, official conference websites.

For each event provide:
- Exact event name
- Event type: conference, meetup, summit, networking_dinner, workshop, hackathon, pitch_competition, demo_day, expo, founder_salon, pitch_night
- District slug if known (e.g. "shoreditch", "kings-cross", "canary-wharf") — use this list: ${DISTRICT_LIST}
- Start and end dates in ISO format (YYYY-MM-DD)
- Recurrence: one_off, weekly, monthly, quarterly, annual
- Audience: founders, investors, mixed, technical, enterprise, public
- Estimated attendance (number or null)
- Investor presence score (0-100, null if unknown) — how likely investors attend
- Founder relevance score (0-100, null if unknown) — how useful for founders
- Whether application is required (true/false)
- Whether it is free (true/false)
- Website/registration URL
- Sector focus tags (e.g. ["AI", "Fintech", "Climate Tech"])
- Brief notes (1 sentence description)
- Source URL where you found this event

Return JSON array:
[{
  "name": "London Tech Week 2026",
  "eventType": "conference",
  "districtSlug": "kings-cross",
  "startDate": "2026-06-09",
  "endDate": "2026-06-13",
  "recurrenceType": "annual",
  "audienceType": "mixed",
  "estimatedAttendance": 55000,
  "investorPresenceScore": 90,
  "founderRelevanceScore": 92,
  "applicationRequired": false,
  "priceFree": false,
  "website": "https://londontechweek.com/",
  "sectorFocus": ["AI", "Fintech", "Deep Tech", "SaaS", "Climate Tech"],
  "notes": "Europe's largest technology festival spanning 5 days across London.",
  "sourceUrl": "https://londontechweek.com/"
}]`,

    london_org_updates: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Verify and update information about London-headquartered tech companies. Check for closures, acquisitions, relocations, pivots, employee count changes, and new funding stages.

Focus on companies in these districts: ${DISTRICT_LIST}

For EACH company you find updates on:
1. Search Companies House, Crunchbase, PitchBook, Dealroom, TechCrunch, Sifted, LinkedIn for current status
2. Verify if the company is still active, has been acquired, closed, or relocated
3. Update sector classification if the company has pivoted
4. Check current employee range (1-10, 11-50, 51-200, 201-500, 500+)
5. Verify current website URL
6. Note any significant changes (new CEO, rebrand, merger, office move)

Prioritise:
- Companies that have raised funding in the last 12 months
- Companies reported in tech news recently
- Companies with visible changes on LinkedIn or Companies House
- AI, FinTech, Climate Tech, SaaS, HealthTech, DeepTech sectors

Return JSON array:
[{
  "companyName": "Synthesia",
  "companySlug": "synthesia",
  "status": "active",
  "primarySector": "AI",
  "districtSlug": "kings-cross",
  "employeeRange": "201-500",
  "website": "https://www.synthesia.io",
  "linkedinUrl": "https://www.linkedin.com/company/synthesia-technologies/",
  "fundingStage": "series_d_plus",
  "description": "AI video generation platform for enterprise content creation.",
  "updateNotes": "Raised $200M Series D in June 2025. Expanded Kings Cross office.",
  "sourceUrl": "https://sifted.eu/articles/synthesia-series-d"
}]

IMPORTANT: "linkedinUrl" must be the COMPANY LinkedIn page (linkedin.com/company/...), NOT a founder or employee personal profile (linkedin.com/in/...). If no company LinkedIn page exists, use null.`,

    london_programs_update: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Find all current London-based startup support programs — accelerators, incubators, grants, fellowships, bootcamps, government schemes, and venture studios.

Include:
1. Accelerators — Techstars London, Entrepreneur First, Antler, Seedcamp, etc.
2. Incubators — Kings Cross incubators, Imperial White City, UCL, etc.
3. Government Grants — Innovate UK Smart Grants, UKRI, British Business Bank
4. Fellowships & Studios — Zinc, Deep Science Ventures, etc.
5. Bootcamps — Le Wagon, General Assembly, Makers, CodeYourFuture, etc.
6. University Programs — ICL, UCL, Oxford/Cambridge London programs

For each program verify it is currently active, get program type, host organization, sector focus, cost, duration, application URL and deadline. Use district slugs: ${DISTRICT_LIST}

Return JSON array:
[{
  "programName": "Entrepreneur First",
  "programType": "accelerator",
  "hostOrganization": "Entrepreneur First",
  "districtSlug": "kings-cross",
  "sectorFocus": ["AI", "Deep Tech", "SaaS"],
  "format": "in_person",
  "costGbp": null,
  "isFree": true,
  "durationWeeks": 12,
  "applicationUrl": "https://www.joinef.com/apply",
  "applicationDeadline": "2026-06-01",
  "description": "Pre-team, pre-idea accelerator helping technical founders find co-founders.",
  "website": "https://www.joinef.com",
  "sourceUrl": "https://www.joinef.com"
}]`,

    london_market_data: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Collect key market statistics about London's tech ecosystem for the "Why London" page. Categories: Investment & Funding, Talent & Jobs, Companies, Infrastructure, Global Rankings, Economic Impact, AI Specific. Include source, year, and trend vs previous year.

Return JSON array:
[{
  "category": "Investment & Funding",
  "metricName": "Total VC Investment in London Tech",
  "value": "£13.5 billion",
  "numericValue": 13500000000,
  "unit": "GBP",
  "year": 2025,
  "sourceUrl": "https://technation.io/report2025",
  "sourceName": "Tech Nation",
  "trend": "up",
  "comparison": "12% increase from £12.1B in 2024"
}]`,

    london_toolkit_data: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Curate a comprehensive founder toolkit for London startups. Categories: Legal & Incorporation, Banking & Finance, Workspace, Talent & Hiring, Funding, Technology, Networking, Immigration. Verify URLs work and resources are current.

Return JSON array:
[{
  "name": "Companies House Web Filing",
  "category": "Legal & Incorporation",
  "subcategory": "Company Registration",
  "description": "Free online company registration and filing service for UK limited companies.",
  "url": "https://www.gov.uk/limited-company-formation",
  "isFree": true,
  "pricingModel": "free",
  "targetAudience": "first-time founder",
  "londonSpecific": false,
  "sourceUrl": "https://www.gov.uk/limited-company-formation"
}]`,

    london_resource_links: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Curate a resource directory for London tech founders. Categories: Government & Policy, Industry Bodies, Community & Networks, Data & Research, Media & News, Learning & Education, Events & Conferences, Support Services. Verify URLs and categorize by type.

Return JSON array:
[{
  "title": "Tech Nation",
  "category": "Industry Bodies",
  "subcategory": "Ecosystem Support",
  "description": "UK network for tech entrepreneurs providing growth programs, visa support, and ecosystem data.",
  "url": "https://technation.io",
  "resourceType": "community",
  "provider": "Tech Nation",
  "isFree": true,
  "londonSpecific": false,
  "sourceUrl": "https://technation.io"
}]`,

    london_insights_articles: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Generate 8 fact-checked analytical insight articles about London's tech ecosystem with REAL data and source URLs.

Topics: 1) State of London AI 2) London FinTech 2026 3) Climate Tech London 4) London Office Rebalancing 5) London vs The World Rankings 6) Deep Tech London 7) London Startup Funding Flows 8) London AI Safety Ecosystem

Each 600-1000 words, factual, with inline citations.

Return JSON array:
[{
  "title": "State of London AI: Investment, Talent & Infrastructure",
  "slug": "state-of-london-ai-2026",
  "summary": "2-3 sentence summary",
  "bodyMarkdown": "600-1000 words in Markdown with inline citations",
  "category": "AI & Machine Learning",
  "tags": ["AI", "Investment", "Talent"],
  "publishDate": "${new Date().toISOString().split("T")[0]}",
  "author": "London Tech Map Intelligence",
  "heroStat": "£4.1B",
  "heroStatLabel": "invested in London AI companies in 2025",
  "sourceUrls": ["all cited URLs"]
}]`,

    london_success_stories: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Research and write 10 real London tech success stories profiling REAL London-HQ companies and founders with verified facts. Mix sectors (AI, fintech, climate, health, SaaS, deep tech) and stages (seed to unicorn). 400-800 words each.

Return JSON array:
[{
  "companyName": "Synthesia",
  "companySlug": "synthesia",
  "founderName": "Victor Riparbelli",
  "sector": "AI",
  "districtSlug": "kings-cross",
  "headline": "From PhD Research to $2.1B AI Video Platform",
  "summary": "2-3 sentence summary",
  "bodyMarkdown": "400-800 words in Markdown with inline citations",
  "fundingRaised": "£450M total",
  "employeeCount": "300+",
  "foundedYear": 2017,
  "milestones": ["First AI avatar platform", "Series D at $2.1B valuation"],
  "website": "https://www.synthesia.io",
  "sourceUrls": ["https://..."]
}]`,

    london_district_narratives: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Write rich narrative descriptions for London's key tech districts. For each: research current companies, identify key investors, note transport links and coworking, capture the "vibe". 200-400 words each.

Districts: ${DISTRICT_LIST}

Return JSON array:
[{
  "districtSlug": "kings-cross",
  "districtName": "King's Cross",
  "narrative": "200-400 words describing the district's tech ecosystem...",
  "keyCompanies": ["Google DeepMind", "Meta", "Synthesia", "Faculty AI"],
  "keyInvestors": ["LocalGlobe", "Mosaic Ventures"],
  "notableFeatures": ["Knowledge Quarter", "Francis Crick Institute", "Google HQ"],
  "transportLinks": ["King's Cross St Pancras (6 lines)", "Euston (3 lines)"],
  "vibeDescription": "Innovation-dense, corporate-meets-startup energy, knowledge-driven.",
  "sourceUrls": ["https://..."]
}]`,

    london_city_comparison: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Research and compare the top 10 global tech startup ecosystems against London. This data is for a Fortune 500 audience evaluating London as a tech hub.

CITIES TO COMPARE (rank 1-10 by overall tech ecosystem strength):
London, San Francisco / Bay Area, New York, Berlin, Paris, Singapore, Tel Aviv, Beijing, Bangalore, Toronto

For EACH city, research and return:
- Overall global ranking (1-10)
- Total VC funding in most recent full year (USD equivalent for comparability)
- Tech talent pool size (total tech professionals)
- Number of unicorns headquartered there
- Number of active tech startups
- Top 3 sectors the city is known for
- Primary visa route for tech founders (name + brief note)
- Cost of living index (Very High / High / Medium / Low)
- Average 1-bed rent in tech district (USD/month)
- Quality of life score (0-100) with 1-sentence note
- English proficiency level (Native / Near-Native / High / Moderate / Low)
- Timezone and overlap advantage description
- 1-sentence key strength
- 1-sentence key weakness vs London

CRITICAL: Only include data you can cite from Startup Genome, Dealroom, Crunchbase, PitchBook, OECD, World Bank, Savills, or official government sources. No guessing. No unsourced claims. London MUST be rank 1 in Europe, verify its global position accurately.

Return JSON array:
[{
  "city": "London",
  "country": "United Kingdom",
  "rank": 2,
  "vcFundingUsd": "$15.2B",
  "vcFundingNumeric": 15200000000,
  "techTalentPool": "2.1M+",
  "unicornCount": 45,
  "startupCount": "7,000+",
  "topSectors": ["Fintech", "AI", "CleanTech"],
  "visaRoute": "Global Talent Visa",
  "visaNote": "No job offer needed, 5-year visa, fast-track for exceptional talent",
  "costIndex": "Very High",
  "avgRent1Bed": "$2,400/mo",
  "qualityOfLifeScore": 82,
  "qualityOfLifeNote": "World-class culture, NHS healthcare, excellent transit, 8 Royal Parks",
  "englishProficiency": "Native",
  "timezone": "GMT/BST (UTC+0/+1)",
  "timezoneAdvantage": "Overlaps US East Coast afternoon and Asian morning — widest trading window",
  "keyStrength": "Europe's deepest funding pool with 40+ unicorns and unmatched fintech ecosystem",
  "keyWeakness": "N/A — this is the benchmark city",
  "sourceUrl": "https://startupgenome.com/...",
  "sourceName": "Startup Genome Global Startup Ecosystem Report",
  "year": ${new Date().getFullYear()}
}]`,

    london_competitive_advantages: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Research London's competitive advantages for tech companies and founders. This is for a Fortune 500 audience — focus EXCLUSIVELY on tech, business, and innovation advantages. NO tourism, culture, museums, or lifestyle content.

Return 15-20 current advantages PLUS 5-8 future/emerging advantages (set isFutureAdvantage=true).

CATEGORIES TO COVER:
Current advantages — Funding (SEIS/EIS, VC density, angel networks), Talent (universities, Global Talent Visa, diverse workforce), Infrastructure (6 airports, Crossrail, 5G, subsea cables, data centres), Legal (English common law, IP protection, FCA sandbox), Education (4 top-20 universities, coding bootcamps, research institutes), Tax (SEIS 50% relief, EIS 30% relief, R&D tax credits), Connectivity (time zone, flight routes, language), Language (English as global business language)

Future niches — AI Safety (AISI, DeepMind safety, alignment startups), Quantum Computing (NPL, Oxford instruments, PsiQuantum London), Green Finance (LSEG green bonds, City climate finance), Digital Health (NHS data, genomics, BioBank), Autonomous Systems (Oxbotica, Wayve London R&D), Space Tech (OneWeb, Inmarsat, satellite data), LegalTech (London's legal market × AI)

For EACH advantage, explain specifically why a Fortune 500 technology company or well-funded startup would care.

Return JSON array:
[{
  "category": "Funding",
  "title": "SEIS/EIS Tax Relief for Investors",
  "description": "The UK's Seed Enterprise Investment Scheme (SEIS) offers investors 50% income tax relief on investments up to £200,000, while the Enterprise Investment Scheme (EIS) provides 30% relief on up to £1M. This makes London one of the most tax-efficient places in the world to raise early-stage capital.",
  "keyMetric": "50%",
  "keyMetricLabel": "SEIS income tax relief for angel investors",
  "isFutureAdvantage": false,
  "nicheArea": null,
  "relevanceToF500": "Enables rapid early-stage fundraising from UK angels and HNWIs, reducing dilution pressure on founding teams",
  "sourceUrl": "https://www.gov.uk/guidance/venture-capital-schemes-raise-money",
  "sourceName": "HMRC",
  "sortOrder": 1
}]`,

    london_leadership_categories: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Identify 10-12 technology sectors where London is ranked in the global top 3. For each sector, provide evidence of London's position including real company names, market data, and growth metrics.

SECTORS TO INVESTIGATE:
Fintech, AI Safety & Ethics, LegalTech, InsurTech, EdTech, GreenTech/CleanTech, DeepTech, Cybersecurity, RegTech, Digital Health, Creative AI, PropTech, Quantum Computing (if London qualifies)

For each sector where London IS genuinely top-3 globally:
- Verify the global ranking with evidence (cite Startup Genome, Dealroom, specialist industry reports)
- Name 5-8 real London-headquartered companies in that sector
- Provide a key metric (market size, funding total, company count)
- Include growth rate if available
- Do NOT include sectors where London is NOT genuinely top-3

Return JSON array:
[{
  "category": "Fintech",
  "globalRank": 1,
  "description": "London is the world's leading fintech hub, home to more fintech unicorns than any other city. The FCA's regulatory sandbox, deep banking talent pool, and proximity to the City of London financial centre create an unmatched ecosystem for financial innovation.",
  "keyCompanies": ["Revolut", "Wise", "Monzo", "Starling Bank", "Checkout.com", "GoCardless", "OakNorth", "Thought Machine"],
  "keyMetric": "Home to 8 of the world's top 50 fintech companies by valuation",
  "marketSize": "$11.6B total fintech funding in London",
  "growthRate": "18% YoY growth in London fintech investment",
  "sourceUrl": "https://innovatefinance.com/...",
  "sourceName": "Innovate Finance"
}]`,

    video_source_discovery: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Discover YouTube channels, playlists, and video sources that regularly produce content about London's technology ecosystem, startup scene, venture capital, and innovation districts.

CATEGORIES TO SEARCH:
1. London VC firms with YouTube channels (Balderton, Atomico, EF, Seedcamp, LocalGlobe, etc.)
2. London tech events that publish recordings (London Tech Week, CogX, Silicon Roundabout, etc.)
3. London tech media channels (Sifted, UKTN, TechRound, etc.)
4. London innovation hubs / accelerators (Plexal, Level39, Techstars London, etc.)
5. London universities with tech/entrepreneurship content (Imperial, UCL, LBS, KCL, etc.)
6. London-HQ tech companies publishing engineering/culture content (Wise, Revolut, Monzo, etc.)
7. Podcasts about London tech that also publish video (The London Tech Podcast, etc.)
8. London borough / council innovation channels

For each channel found:
- Verify it exists on YouTube and get the real channel ID (starts with UC)
- Only include channels with at least 10 videos and some activity in the last 12 months
- Explain WHY this channel is relevant to the Greater London tech ecosphere
- Classify into one of these source categories: university, vc, accelerator, conference, media, civic, co_op, lab, borough
- Identify the London borough and district where the organisation is based
- Tag with relevant sector keywords

Return JSON array:
[{
  "channelName": "Seedcamp",
  "platformChannelId": "UClrbGYeQMI4dYvYKOae02Lg",
  "description": "Europe's seed fund based in London — publishes founder interviews, portfolio company talks, and European tech ecosystem insights",
  "subscriberCount": 5000,
  "websiteUrl": "https://seedcamp.com",
  "relevanceReason": "Tier 1 London VC that directly funds and supports London tech startups, providing insider perspective on deal flow and ecosystem trends",
  "suggestedTier": "tier_1",
  "sourceUrl": "https://www.youtube.com/@seedcamp",
  "sourceCategory": "vc",
  "londonBorough": "City of London",
  "londonDistrict": "City of London",
  "sectorTags": ["fintech", "AI", "SaaS", "deeptech"]
}]`,

    eventbrite_meetup_polling: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Poll Eventbrite, Meetup.com, Lu.ma, and LinkedIn Events for UPCOMING London tech events. Focus on events happening in the next 60 days that are NOT already well-known conferences (those are covered by the london_tech_events task).

TARGET: Community-level events — smaller meetups, workshops, networking socials, pitch nights, hack nights, demo days, and local tech community gatherings.

CRITICAL: Real, verified events only. Every event must have a live registration/listing URL.

Search strategies:
1. Eventbrite: "London tech" + "London startup" + "London AI" + "London fintech" — filter upcoming, in-person
2. Meetup.com: Tech groups in London with upcoming events (Silicon Roundabout, London Tech Meetups, etc.)
3. Lu.ma: London-based tech event calendars
4. LinkedIn Events: London tech community events
5. Luma calendar pages for London accelerators (Entrepreneur First, Seedcamp, Techstars London)

For each event:
- Event name and exact registration URL
- Source platform (eventbrite, meetup, luma, linkedin)
- Start and end times in ISO format
- Physical location (venue name + address or district)
- District slug if identifiable: ${DISTRICT_LIST}
- Category: meetup, workshop, networking, pitch_night, demo_day, hack_night, social, panel, fireside_chat
- Estimated attendee count from RSVP/ticket data
- Whether it's free
- Organizer name (group/company running it)
- Sector tags (AI, Fintech, SaaS, Climate Tech, Web3, DevOps, etc.)
- Brief description (1 sentence)

Return JSON array:
[{
  "eventName": "AI Builders London #42",
  "eventSource": "meetup",
  "eventUrl": "https://www.meetup.com/ai-builders-london/events/...",
  "startDateTime": "2026-04-15T18:30:00Z",
  "endDateTime": "2026-04-15T21:00:00Z",
  "location": "Plexal, Here East, Queen Elizabeth Olympic Park",
  "districtSlug": "stratford",
  "eventCategory": "meetup",
  "estimatedAttendance": 120,
  "isFree": true,
  "organizerName": "AI Builders London",
  "sectorTags": ["AI", "Machine Learning"],
  "description": "Monthly community meetup for AI practitioners building products in London.",
  "sourceUrl": "https://www.meetup.com/ai-builders-london/"
}]`,

    feature_catalog_sync: `${SYSTEM_CONTEXT}

${dateWindow}

TASK: Detect drift between the live pricing catalog and the actual product
surface area inferred from this codebase's docs/code/commits, and propose
catalog changes for a human reviewer to approve.

You are auditing the CLUES London product (clueslondon.com). The pricing
catalog defines four tiers (free / developer / executive / enterprise) and
~50+ features grouped into ~8 categories. Real product capabilities live in
the codebase under D:/London-Tech-Map/src and the design plan under
D:/London-Tech-Map/docs/PRICING_BUILD_PLAN.md §1.5 (locked tier scope).

Return an array of proposal objects. Each proposal MUST be one of these
six \`proposalType\` values, with a payload matching that type:

  ADD_FEATURE
    A capability exists in code/docs that has no Feature row.
    payload: {
      slug: kebab-or-dotted slug,
      categorySlug: existing category slug,
      label: marketing-friendly name,
      shortLabel?: optional shorter form,
      description: 1–2 sentence customer-facing description,
      rank?: number,
      isHeadline?: boolean (surfaces on tier card),
      isInternal?: boolean (gate-only),
      isBeta?: boolean,
      isComingSoon?: boolean,
      parentFeatureSlug?: slug of parent feature
    }

  DEPRECATE_FEATURE
    A Feature row references a capability that no longer exists in code/docs.
    payload: { slug: feature slug to deprecate }

  MODIFY_TIER_MAPPING
    A feature should be added to / removed from a tier, or its limit changed.
    payload: {
      tierSlug, featureSlug, isIncluded: boolean,
      isHeadline?: boolean, isLimited?: boolean,
      limitNote?: e.g. "5/month" | null,
      notes?: string | null,
      rank?: number
    }

  MODIFY_LIMIT
    A tier's usage cap (analyses/mo, documents stored, etc.) should change.
    payload: {
      tierSlug, key: camelCase identifier,
      remove?: true to delete the limit, OR
      label?, shortLabel?, value? (display string), numericValue? (number|null
      for unlimited), unit?, rank?
    }

  MODIFY_TIER
    A tier's marketing copy or price should change.
    payload: {
      slug: tier slug,
      ...any of: rank, displayName, emotionalName, badge, tagline,
      description, audience, monthlyPriceMinor (pence), annualPriceMinor,
      currency, perSeat, ctaText, upgradeText, trialCopy, accentPrimary
      (#RRGGBB), accentSecondary, accentTertiary, hallmarkSvgKey, isActive
    }

  MODIFY_CATEGORY
    A category should change rank/name/description/iconKey.
    payload: { slug, ...any of rank, name, description, iconKey }

CRITICAL RULES:
- Slugs are IMMUTABLE — never propose renaming a slug. To rename, deprecate
  the old and add a new.
- Never propose touching tier slugs (free/developer/executive/enterprise).
- Be conservative. A code symbol named "dnaBuilder" is NOT proof of a
  customer-visible feature unless you can also cite a UI surface (route,
  page component, or marketing doc) that exposes it.
- Each proposal must include 1–4 evidence citations: file paths, doc
  sections, commit SHAs, or URLs. Do NOT propose without evidence.
- Prefer batches of related proposals over single mega-proposals (one row
  per discrete change so admins can approve/reject independently).

Return strictly: array of objects with these top-level fields:

  proposalType: one of the six values above (UPPER_SNAKE_CASE)
  payload:      object matching the rules for that proposalType
  rationale:    1–3 sentence explanation of why this change
  evidence:     array of { kind: "code"|"doc"|"commit"|"url", ref: string, note?: string }

EXAMPLE (informational only — do NOT echo this):

[{
  "proposalType": "ADD_FEATURE",
  "payload": {
    "slug": "studio-olivia-hub",
    "categorySlug": "intelligence",
    "label": "Studio Olivia hub",
    "description": "Hub-and-spoke workspace where Studio Olivia coordinates 200+ specialised agents on the executive intelligence suite.",
    "isHeadline": true
  },
  "rationale": "The hub-and-spoke topology is locked in PRICING_BUILD_PLAN.md §1.5 and shipped under /studio, but no Feature row exists for it.",
  "evidence": [
    { "kind": "doc", "ref": "docs/PRICING_BUILD_PLAN.md §1.5.1", "note": "topology diagram" },
    { "kind": "code", "ref": "src/app/studio/page.tsx", "note": "live route" }
  ]
}]

If no drift is detected, return an empty array.`,
  };

  return prompts[taskId];
}

/**
 * Dedup key extractors for each task type.
 * Returns a string key that uniquely identifies an item across providers.
 */
const DEDUP_KEYS: Record<CascadeTaskId, (item: Record<string, unknown>) => string> = {
  livability_scores: (i) => String(i.districtSlug ?? ""),
  london_funding_rounds: (i) => `${norm(i.companyName)}|${norm(i.roundType)}|${String(i.announcedDate ?? "")}`,
  london_founder_profiles: (i) => norm(i.fullName),
  london_ai_ecosystem: (i) => norm(i.companyName),
  london_ecosystem_insights: (i) => norm(i.title),
  london_research_reports: (i) => `${norm(i.title)}|${String(i.url ?? "")}`,
  london_tech_events: (i) => `${norm(i.name)}|${String(i.startDate ?? "")}`,
  london_org_updates: (i) => norm(i.companyName) || String(i.companySlug ?? ""),
  london_programs_update: (i) => norm(i.programName),
  london_market_data: (i) => `${norm(i.metricName)}|${String(i.year ?? "")}`,
  london_toolkit_data: (i) => `${norm(i.name)}|${norm(i.category)}`,
  london_resource_links: (i) => `${norm(i.title)}|${String(i.url ?? "")}`,
  london_insights_articles: (i) => norm(i.title),
  london_success_stories: (i) => norm(i.companyName),
  london_district_narratives: (i) => String(i.districtSlug ?? ""),
  london_city_comparison: (i) => norm(i.city),
  london_competitive_advantages: (i) => `${norm(i.category)}|${norm(i.title)}`,
  london_leadership_categories: (i) => norm(i.category),
  video_source_discovery: (i) => String(i.platformChannelId ?? "") || norm(i.channelName),
  eventbrite_meetup_polling: (i) => `${norm(i.eventName)}|${String(i.startDateTime ?? "")}`,
  feature_catalog_sync: (i) => {
    const payload = (i.payload as Record<string, unknown> | undefined) ?? {};
    const t = String(i.proposalType ?? "");
    const slug = String(payload.slug ?? payload.featureSlug ?? "");
    const tierSlug = String(payload.tierSlug ?? "");
    const key = String(payload.key ?? "");
    return `${t}|${slug}|${tierSlug}|${key}`;
  },
};

/** Normalise a string for dedup: lowercase, trimmed */
function norm(val: unknown): string {
  return typeof val === "string" ? val.toLowerCase().trim() : "";
}

/**
 * Universal pre-merge: deduplicates items across all providers BEFORE
 * sending to Opus. Instead of Opus seeing N×providers items, it sees
 * only the unique items with a providerCount and the most complete version.
 *
 * For livability_scores, uses median aggregation for numeric scores.
 * For all others, keeps the most complete version of each unique item
 * (the one with the most non-null fields).
 */
function preMergeForJudge(
  allResults: Record<string, unknown>,
  taskId: CascadeTaskId,
): Record<string, unknown> {
  const getKey = DEDUP_KEYS[taskId];
  const providerCount = Object.keys(allResults).length;

  // ── Special case: livability_scores needs median aggregation ──
  if (taskId === "livability_scores") {
    return preMergeLivabilityScores(allResults, providerCount);
  }

  // ── General case: dedup by key, keep most complete version ──
  const seen = new Map<string, { item: Record<string, unknown>; count: number; providers: Set<string>; fieldCount: number }>();

  for (const [providerId, providerData] of Object.entries(allResults)) {
    const pd = providerData as { data?: unknown[] };
    const data = pd.data ?? [];
    for (const raw of data as Record<string, unknown>[]) {
      const key = getKey(raw);
      if (!key) continue;

      // Count non-null, non-empty fields as a quality signal
      const fieldCount = Object.values(raw).filter((v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length;

      const existing = seen.get(key);
      if (!existing || fieldCount > existing.fieldCount) {
        // Keep this version — it has more data
        seen.set(key, {
          item: trimItem(raw),
          count: existing ? existing.count + 1 : 1,
          providers: existing ? new Set([...existing.providers, providerId]) : new Set([providerId]),
          fieldCount,
        });
      } else {
        existing.count++;
        existing.providers.add(providerId);
      }
    }
  }

  const merged = Array.from(seen.values()).map(({ item, count, providers }) => ({
    ...item,
    _providerCount: count,
    _providers: [...providers],
  }));

  return {
    pre_merged: {
      data: merged,
      errors: [],
      note: `Pre-merged ${merged.length} unique items from ${providerCount} providers. Each item is the most complete version found. Validate and return.`,
    },
  };
}

/** Trim bulky fields from a single item to keep the judge prompt compact */
function trimItem(item: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...item };
  // Truncate long text fields
  for (const field of ["bodyMarkdown", "narrative"]) {
    if (typeof clean[field] === "string" && (clean[field] as string).length > 200) {
      clean[field] = (clean[field] as string).slice(0, 200) + "...";
    }
  }
  for (const field of ["description", "bioSummary", "summary", "updateNotes", "notes", "relevance", "comparison"]) {
    if (typeof clean[field] === "string" && (clean[field] as string).length > 150) {
      clean[field] = (clean[field] as string).slice(0, 150) + "...";
    }
  }
  // Trim arrays of URLs — keep max 2
  for (const field of ["sourceUrls", "sources", "notableFacts", "milestones", "keyCompanies", "keyInvestors", "notableFeatures", "transportLinks"]) {
    if (Array.isArray(clean[field]) && (clean[field] as unknown[]).length > 2) {
      clean[field] = (clean[field] as unknown[]).slice(0, 2);
    }
  }
  // Trim sectorFocus / tags — keep max 3
  for (const field of ["sectorFocus", "tags"]) {
    if (Array.isArray(clean[field]) && (clean[field] as unknown[]).length > 3) {
      clean[field] = (clean[field] as unknown[]).slice(0, 3);
    }
  }
  return clean;
}

/**
 * Pre-merge livability scores using median aggregation.
 */
function preMergeLivabilityScores(
  allResults: Record<string, unknown>,
  providerCount: number,
): Record<string, unknown> {
  const byDistrict: Record<string, { scores: number[][]; sources: string[]; providers: string[] }> = {};

  for (const [providerId, providerData] of Object.entries(allResults)) {
    const pd = providerData as { data?: unknown[] };
    const data = pd.data ?? [];
    for (const item of data as Record<string, unknown>[]) {
      const slug = (item.districtSlug as string) ?? "";
      if (!slug) continue;
      const scores = (item.scores as number[]) ?? [];
      if (scores.length < 10) continue;

      if (!byDistrict[slug]) {
        byDistrict[slug] = { scores: [], sources: [], providers: [] };
      }
      byDistrict[slug].scores.push(scores);
      byDistrict[slug].providers.push(providerId);
      const itemSources = (item.sources as string[]) ?? [];
      if (itemSources.length > 0) {
        byDistrict[slug].sources.push(itemSources[0]);
      }
    }
  }

  const merged = Object.entries(byDistrict).map(([slug, info]) => {
    const medianScores: number[] = [];
    for (let i = 0; i < 10; i++) {
      const vals = info.scores.map((s) => s[i]).filter((v) => v != null).sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      medianScores.push(
        vals.length === 0 ? 0 : vals.length % 2 === 1 ? vals[mid] : Math.round((vals[mid - 1] + vals[mid]) / 2),
      );
    }
    return {
      districtSlug: slug,
      scores: medianScores,
      providerCount: info.providers.length,
      providers: [...new Set(info.providers)],
      sampleSources: info.sources.slice(0, 3),
    };
  });

  return {
    pre_merged: {
      data: merged,
      errors: [],
      note: `Pre-merged from ${providerCount} providers. Each score is the median across providers. Validate and adjust if any look wrong.`,
    },
  };
}

/**
 * Pre-merge all provider results and return the merged items array + metadata.
 * Exported so the orchestrator can access items for batching before judge calls.
 */
export function getPreMergedData(
  taskId: CascadeTaskId,
  allResults: Record<string, unknown>,
): { items: Record<string, unknown>[]; providerCount: number } {
  const trimmed = preMergeForJudge(allResults, taskId);
  const preMerged = (trimmed as Record<string, unknown>).pre_merged as { data?: unknown[] } | undefined;
  const items = (preMerged?.data ?? []) as Record<string, unknown>[];
  const providerCount = Object.keys(allResults).length;
  return { items, providerCount };
}

/** Build the Opus judge prompt for a batch of pre-merged items */
export function getJudgePromptForBatch(
  taskId: CascadeTaskId,
  batchItems: Record<string, unknown>[],
  batchIndex: number,
  totalBatches: number,
  providerContext?: {
    totalAttempted: number;
    successfulProviders: string[];
    failedProviders: string[];
  },
): string {
  const resultsJson = JSON.stringify({
    pre_merged: {
      data: batchItems,
      errors: [],
      note: `Batch ${batchIndex + 1} of ${totalBatches}: ${batchItems.length} items to validate.`,
    },
  });

  const failureNote = providerContext && providerContext.failedProviders.length > 0
    ? `\nIMPORTANT CONTEXT: ${providerContext.failedProviders.length} out of ${providerContext.totalAttempted} providers FAILED (${providerContext.failedProviders.join(", ")}). Only ${providerContext.successfulProviders.length} returned data (${providerContext.successfulProviders.join(", ")}). Do NOT penalise data for having fewer provider confirmations when providers failed — judge by SOURCE QUALITY instead.\n`
    : "";

  const batchNote = totalBatches > 1
    ? `\nThis is batch ${batchIndex + 1} of ${totalBatches} (${batchItems.length} items). Validate ONLY these items.\n`
    : "";

  return `${SYSTEM_CONTEXT}

You are the JUDGE in a multi-LLM data cascade. Multiple providers searched for the same data independently.
${failureNote}${batchNote}
TASK: Validate the pre-merged results below for task "${taskId}". Items have already been deduplicated across providers — your job is to verify quality, flag any issues, and return the clean dataset.

RULES:
1. Items are ALREADY deduplicated. Do NOT re-merge. Just validate and return.
2. Do NOT invent data. Only use what is provided.
3. Be fast. Return compact JSON only — no explanations.
4. _providerCount shows how many providers agreed on each item. Higher = more reliable.

CONFIDENCE SCORING (0.0 to 1.0) — based on SOURCE QUALITY, not LLM headcount:
- HIGH (0.85-1.0): Data comes from a reputable primary source (Crunchbase, Companies House, Gov.uk, TechCrunch, Sifted, FT, Reuters, Bloomberg, PitchBook, Dealroom, official company websites, regulatory filings). One solid primary source IS high confidence.
- MEDIUM (0.5-0.84): Data from a credible secondary source (news articles, blog posts, press releases, LinkedIn) or 2+ LLMs agree but without primary source verification.
- LOW (0.2-0.49): Single unverified claim, no URL, data from aggregator with no primary citation, or conflicting information.
- MANUAL REVIEW: Multiple providers returned CONTRADICTING values for the same data point (e.g. different funding amounts for the same round). List each conflict.

KEY PRINCIPLE: A single data point sourced from Crunchbase or Companies House is MORE reliable than 3 LLMs repeating an unverified blog post. Judge the SOURCE, not the number of LLMs that found it.

PROVIDER RESULTS:
${resultsJson}

Return ONLY this JSON (no markdown, no backticks):
{"data":[...merged items with per-item "confidence" field...],"confidenceReport":{"totalPoints":N,"highConfidence":N,"mediumConfidence":N,"lowConfidence":N,"manualReview":N},"conflicts":[{"dataPoint":"company X funding amount","valuesBySource":{"sonnet":"£5M","gpt":"£3M"},"resolvedValue":"£5M","resolutionReason":"Crunchbase confirms £5M"}]}`;
}

/** Build the Opus judge prompt with all collected results (legacy single-call) */
export function getJudgePrompt(
  taskId: CascadeTaskId,
  allResults: Record<string, unknown>,
  providerContext?: {
    totalAttempted: number;
    successfulProviders: string[];
    failedProviders: string[];
  },
): string {
  const { items } = getPreMergedData(taskId, allResults);
  return getJudgePromptForBatch(taskId, items, 0, 1, providerContext);
}
