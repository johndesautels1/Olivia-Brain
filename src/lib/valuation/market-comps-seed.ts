// ═══════════════════════════════════════════════════════════════════════
// MARKET COMPS — Static Seed Data
// 6 London tech companies used to populate the MarketComp table.
// Also importable in tests without a DB connection.
// ═══════════════════════════════════════════════════════════════════════

export interface MarketCompSeed {
  companyName: string;
  industry: string;
  description: string;
  latestARR: number | null;
  valuation: number | null;
  revenueMultiple: number | null;
  ebitdaMultiple: number | null;
  fundingStage: string;
  source: string;
}

export const LONDON_MARKET_COMPS: MarketCompSeed[] = [
  {
    companyName: 'Revolut',
    industry: 'Fintech',
    description:
      'London-based digital banking and financial super-app offering currency exchange, stock trading, crypto, budgeting tools, and business accounts. Series E valued at $33B. One of the highest-valued UK fintechs.',
    latestARR: 1_800_000_000,
    valuation: 33_000_000_000,
    revenueMultiple: 18.3,
    ebitdaMultiple: null,
    fundingStage: 'scaleup',
    source: 'Crunchbase / press reports 2024',
  },
  {
    companyName: 'Darktrace',
    industry: 'AI',
    description:
      'London-headquartered AI cybersecurity company using self-learning AI to detect and respond to cyber threats in real time. Listed on LSE before going private via Thoma Bravo acquisition at $5.3B.',
    latestARR: 600_000_000,
    valuation: 5_300_000_000,
    revenueMultiple: 8.8,
    ebitdaMultiple: 35,
    fundingStage: 'mature',
    source: 'Thoma Bravo acquisition 2024',
  },
  {
    companyName: 'Monzo',
    industry: 'Fintech',
    description:
      'London challenger bank with 9M+ UK customers offering current accounts, savings, loans, and business banking through a mobile-first experience. Recently turned profitable.',
    latestARR: 880_000_000,
    valuation: 5_000_000_000,
    revenueMultiple: 5.7,
    ebitdaMultiple: null,
    fundingStage: 'scaleup',
    source: 'Series I round 2024',
  },
  {
    companyName: 'Tractable',
    industry: 'AI',
    description:
      'London AI company applying computer vision to accident and disaster recovery for the insurance industry. Uses deep learning to assess vehicle damage from photos, reducing claims processing time.',
    latestARR: 50_000_000,
    valuation: 1_000_000_000,
    revenueMultiple: 20.0,
    ebitdaMultiple: null,
    fundingStage: 'growth',
    source: 'Series E 2022',
  },
  {
    companyName: 'Babylon Health',
    industry: 'HealthTech',
    description:
      'London digital health company offering AI-powered triage and virtual GP consultations. Pioneered remote clinical care in the UK NHS and private sectors. Provides subscription health services.',
    latestARR: 120_000_000,
    valuation: 400_000_000,
    revenueMultiple: 3.3,
    ebitdaMultiple: null,
    fundingStage: 'growth',
    source: 'Last known valuation (restructured)',
  },
  {
    companyName: 'Depop',
    industry: 'Marketplace',
    description:
      'London-founded social e-commerce marketplace for fashion and vintage clothing, popular with Gen Z. Acquired by Etsy for $1.6B. Peer-to-peer model with seller tools and discovery features.',
    latestARR: 70_000_000,
    valuation: 1_625_000_000,
    revenueMultiple: 23.2,
    ebitdaMultiple: null,
    fundingStage: 'scaleup',
    source: 'Etsy acquisition 2021',
  },
];

/** Quick lookup: average revenue multiple across all seeded comps */
export function averageSeedRevenueMultiple(): number {
  const multiples = LONDON_MARKET_COMPS
    .map((c) => c.revenueMultiple)
    .filter((m): m is number => m !== null);
  return multiples.reduce((a, b) => a + b, 0) / multiples.length;
}

/** Filter comps by industry */
export function seedCompsByIndustry(industry: string): MarketCompSeed[] {
  return LONDON_MARKET_COMPS.filter(
    (c) => c.industry.toLowerCase() === industry.toLowerCase(),
  );
}
