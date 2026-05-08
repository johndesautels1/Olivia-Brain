import React from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   Auto-Linker — Detects company/org names and entity references in text
   and turns them into clickable links.

   Two link sources:
   1. Internal org map (name → /directory/{slug}) from our database
   2. Well-known external entities (government bodies, regulators, etc.)
   ═══════════════════════════════════════════════════════════════════════════ */

export interface OrgLink {
  name: string;
  slug: string;
  website?: string | null;
}

/* ── Well-known external entities ── */
const EXTERNAL_ENTITIES: Record<string, string> = {
  // UK Government & Regulators
  "Companies House": "https://www.gov.uk/government/organisations/companies-house",
  "FCA": "https://www.fca.org.uk",
  "Financial Conduct Authority": "https://www.fca.org.uk",
  "PRA": "https://www.bankofengland.co.uk/prudential-regulation",
  "Prudential Regulation Authority": "https://www.bankofengland.co.uk/prudential-regulation",
  "Bank of England": "https://www.bankofengland.co.uk",
  "HM Treasury": "https://www.gov.uk/government/organisations/hm-treasury",
  "HMRC": "https://www.gov.uk/government/organisations/hm-revenue-customs",
  "ICO": "https://ico.org.uk",
  "Information Commissioner's Office": "https://ico.org.uk",
  "Ofcom": "https://www.ofcom.org.uk",
  "CMA": "https://www.gov.uk/government/organisations/competition-and-markets-authority",
  "Competition and Markets Authority": "https://www.gov.uk/government/organisations/competition-and-markets-authority",
  "DSIT": "https://www.gov.uk/government/organisations/department-for-science-innovation-and-technology",
  "UK IPO": "https://www.gov.uk/government/organisations/intellectual-property-office",
  "Innovate UK": "https://www.ukri.org/councils/innovate-uk",
  "UKRI": "https://www.ukri.org",
  "British Business Bank": "https://www.british-business-bank.co.uk",
  "Tech Nation": "https://technation.io",
  "London & Partners": "https://www.londonandpartners.com",
  "Mayor of London": "https://www.london.gov.uk",
  "Greater London Authority": "https://www.london.gov.uk",
  "GLA": "https://www.london.gov.uk",
  "Transport for London": "https://tfl.gov.uk",
  "TfL": "https://tfl.gov.uk",
  "AISI": "https://www.aisi.gov.uk",
  "AI Safety Institute": "https://www.aisi.gov.uk",

  // London Institutions
  "Imperial College London": "https://www.imperial.ac.uk",
  "Imperial College": "https://www.imperial.ac.uk",
  "UCL": "https://www.ucl.ac.uk",
  "University College London": "https://www.ucl.ac.uk",
  "King's College London": "https://www.kcl.ac.uk",
  "London School of Economics": "https://www.lse.ac.uk",
  "LSE": "https://www.lse.ac.uk",
  "London Business School": "https://www.london.edu",
  "City, University of London": "https://www.city.ac.uk",
  "Queen Mary University": "https://www.qmul.ac.uk",
  "Alan Turing Institute": "https://www.turing.ac.uk",
  "Francis Crick Institute": "https://www.crick.ac.uk",
  "Royal Society": "https://royalsociety.org",
  "Royal Academy of Engineering": "https://raeng.org.uk",
  "Catapult": "https://catapult.org.uk",

  // Major Tech Companies
  "Google": "https://about.google",
  "Google DeepMind": "https://deepmind.google",
  "DeepMind": "https://deepmind.google",
  "Meta": "https://about.meta.com",
  "Microsoft": "https://www.microsoft.com",
  "Amazon": "https://www.aboutamazon.co.uk",
  "AWS": "https://aws.amazon.com",
  "Apple": "https://www.apple.com",
  "OpenAI": "https://openai.com",
  "Anthropic": "https://www.anthropic.com",
  "Palantir": "https://www.palantir.com",
  "Revolut": "https://www.revolut.com",
  "Monzo": "https://monzo.com",
  "Starling Bank": "https://www.starlingbank.com",
  "Wise": "https://wise.com",
  "Checkout.com": "https://www.checkout.com",
  "Deliveroo": "https://deliveroo.co.uk",
  "Darktrace": "https://darktrace.com",
  "Arm": "https://www.arm.com",
  "Graphcore": "https://www.graphcore.ai",
  "Stability AI": "https://stability.ai",
  "BenevolentAI": "https://www.benevolent.com",
  "Exscientia": "https://www.exscientia.ai",
  "Wayve": "https://wayve.ai",
  "Intercom": "https://www.intercom.com",
  "Snyk": "https://snyk.io",
  "Thought Machine": "https://thoughtmachine.net",
  "10x Banking": "https://www.10xbanking.com",

  // Industry Bodies
  "techUK": "https://www.techuk.org",
  "Tech London Advocates": "https://www.techlondonadvocates.org.uk",
  "London Tech Week": "https://londontechweek.com",
  "Silicon Roundabout": "https://www.siliconroundabout.tech",
  "Plexal": "https://plexal.com",
  "Level39": "https://www.level39.co",
  "Seedcamp": "https://seedcamp.com",
  "Entrepreneur First": "https://www.joinef.com",

  // Data & Standards
  "GDPR": "https://gdpr-info.eu",
  "ISO 27001": "https://www.iso.org/standard/27001",
  "SOC 2": "https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/socforserviceorganizations",
  "PCI DSS": "https://www.pcisecuritystandards.org",
  "Open Banking": "https://www.openbanking.org.uk",
};

/**
 * Build a sorted list of entity names for matching (longest first to avoid
 * partial matches — e.g., "Google DeepMind" before "Google").
 * Cached per orgMap reference to avoid rebuilding on every paragraph.
 */
let _cachedOrgMap: OrgLink[] | null = null;
let _cachedEntities: { name: string; href: string; external: boolean }[] = [];

function buildEntityList(orgMap: OrgLink[]): { name: string; href: string; external: boolean }[] {
  // Return cached if same orgMap reference
  if (orgMap === _cachedOrgMap) return _cachedEntities;

  const entities: { name: string; href: string; external: boolean }[] = [];

  // Internal orgs (link to directory)
  for (const org of orgMap) {
    if (org.slug) {
      entities.push({ name: org.name, href: `/directory/${org.slug}`, external: false });
    }
  }

  // External well-known entities (skip if already covered by internal org)
  const internalNames = new Set(orgMap.map((o) => o.name.toLowerCase()));
  for (const [name, url] of Object.entries(EXTERNAL_ENTITIES)) {
    if (!internalNames.has(name.toLowerCase())) {
      entities.push({ name, href: url, external: true });
    }
  }

  // Sort longest name first for greedy matching
  entities.sort((a, b) => b.name.length - a.name.length);

  _cachedOrgMap = orgMap;
  _cachedEntities = entities;
  return entities;
}

/**
 * Auto-link text: replaces recognized entity names with clickable links.
 * Also handles **bold** and *italic* inline markdown.
 */
export function autoLinkText(
  text: string,
  orgMap: OrgLink[]
): React.ReactNode[] {
  const entities = buildEntityList(orgMap);

  // First pass: find all entity matches (non-overlapping, longest first)
  const matches: { start: number; end: number; name: string; href: string; external: boolean }[] = [];
  const used = new Set<number>(); // character positions already claimed

  for (const entity of entities) {
    // Skip very short names (3 chars or less) to avoid false positives like "AI", "UK"
    if (entity.name.length <= 3) continue;

    // Word-boundary match — case-sensitive for acronyms, case-insensitive for names > 5 chars
    const escaped = entity.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flags = entity.name.length > 5 && !/^[A-Z]{2,}$/.test(entity.name) ? "gi" : "g";
    const regex = new RegExp(`(?<![\\w/])${escaped}(?![\\w/])`, flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Check no overlap with existing matches
      let overlaps = false;
      for (let i = start; i < end; i++) {
        if (used.has(i)) { overlaps = true; break; }
      }
      if (overlaps) continue;

      // Claim these positions
      for (let i = start; i < end; i++) used.add(i);
      matches.push({ start, end, name: match[0], href: entity.href, external: entity.external });

      // Only link the first occurrence per entity
      break;
    }
  }

  if (matches.length === 0) {
    return renderInlineMarkdown(text);
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Build output nodes
  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const m of matches) {
    // Text before this match
    if (m.start > lastIndex) {
      result.push(...renderInlineMarkdown(text.slice(lastIndex, m.start), result.length));
    }

    // The linked entity
    if (m.external) {
      result.push(
        <a
          key={`link-${m.start}`}
          href={m.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2 decoration-blue-400/30 hover:decoration-blue-300/50 transition-colors"
        >
          {m.name}
        </a>
      );
    } else {
      result.push(
        <a
          key={`link-${m.start}`}
          href={m.href}
          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 decoration-indigo-400/30 hover:decoration-indigo-300/50 transition-colors"
        >
          {m.name}
        </a>
      );
    }

    lastIndex = m.end;
  }

  // Remaining text
  if (lastIndex < text.length) {
    result.push(...renderInlineMarkdown(text.slice(lastIndex), result.length));
  }

  return result;
}

/**
 * Auto-link a raw markdown string — replaces entity names with markdown
 * links [Name](url) before the markdown parser runs.
 * Skips text that is already inside a markdown link.
 */
export function autoLinkMarkdown(
  markdown: string,
  orgMap: OrgLink[]
): string {
  const entities = buildEntityList(orgMap);
  let result = markdown;

  for (const entity of entities) {
    if (entity.name.length <= 3) continue;

    const escaped = entity.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flags = entity.name.length > 5 && !/^[A-Z]{2,}$/.test(entity.name) ? "i" : "";

    // Match entity name that is NOT already inside a markdown link
    // Negative lookbehind for [  and negative lookahead for ](
    const regex = new RegExp(
      `(?<!\\[)(?<![\\w/])${escaped}(?![\\w/])(?!\\]\\()`,
      flags
    );

    const match = regex.exec(result);
    if (match) {
      const replacement = `[${match[0]}](${entity.href})`;
      result = result.slice(0, match.index) + replacement + result.slice(match.index + match[0].length);
    }
  }

  return result;
}

/**
 * Inline markdown renderer (**bold**, *italic*).
 */
function renderInlineMarkdown(text: string, keyOffset = 0): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(
        <strong key={`b-${keyOffset}-${match.index}`} className="text-[var(--foreground)] font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <em key={`i-${keyOffset}-${match.index}`} className="italic">
          {match[3]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
