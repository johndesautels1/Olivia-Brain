/**
 * Deterministic Compliance Subflows
 * Sprint 5.3 — Compliance & Security (Item 4)
 *
 * Rule-based subflows for regulatory compliance that MUST be deterministic.
 * These are NOT LLM-generated — they follow hardcoded legal rules.
 *
 * Domains:
 * - Immigration/Visa (work permits, visa requirements)
 * - Tax (residency rules, treaty implications)
 * - Real Estate (licensing, disclosure requirements)
 * - Employment (labor laws, contract requirements)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ComplianceDomain = "immigration" | "tax" | "real_estate" | "employment";

export interface ComplianceCheckInput {
  domain: ComplianceDomain;
  /** ISO 3166-1 alpha-2 country code */
  sourceCountry: string;
  /** ISO 3166-1 alpha-2 country code */
  destinationCountry: string;
  /** User's citizenship(s) */
  citizenships: string[];
  /** Purpose of relocation */
  purpose: RelocationPurpose;
  /** Duration in months (0 = permanent) */
  durationMonths: number;
  /** Additional context */
  context?: Record<string, unknown>;
}

export type RelocationPurpose =
  | "employment"
  | "self_employment"
  | "study"
  | "retirement"
  | "family_reunification"
  | "investment"
  | "digital_nomad"
  | "tourism";

export interface ComplianceCheckResult {
  domain: ComplianceDomain;
  compliant: boolean;
  requirements: ComplianceRequirement[];
  warnings: string[];
  blockers: string[];
  nextSteps: string[];
  disclaimer: string;
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  mandatory: boolean;
  estimatedTimeDays: number;
  estimatedCostUSD: number | null;
  documentationNeeded: string[];
  authority: string;
  url: string | null;
}

// ─── Immigration/Visa Subflow ─────────────────────────────────────────────────

/**
 * Deterministic visa requirement checker.
 * Uses hardcoded rules — NOT LLM-generated.
 */
export function checkImmigrationCompliance(input: ComplianceCheckInput): ComplianceCheckResult {
  const { sourceCountry, destinationCountry, citizenships, purpose, durationMonths } = input;

  const requirements: ComplianceRequirement[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];
  const nextSteps: string[] = [];

  // Check if visa-free travel applies
  const visaFree = checkVisaFreeAccess(citizenships, destinationCountry, durationMonths);

  if (!visaFree.allowed) {
    // Visa required
    const visaType = determineVisaType(destinationCountry, purpose, durationMonths);

    requirements.push({
      id: `visa_${destinationCountry.toLowerCase()}_${visaType.id}`,
      name: visaType.name,
      description: visaType.description,
      mandatory: true,
      estimatedTimeDays: visaType.processingDays,
      estimatedCostUSD: visaType.costUSD,
      documentationNeeded: visaType.documents,
      authority: visaType.authority,
      url: visaType.url,
    });

    nextSteps.push(`Apply for ${visaType.name} at ${visaType.authority}`);
  } else {
    // Visa-free but may have restrictions
    if (visaFree.maxDays && durationMonths * 30 > visaFree.maxDays) {
      warnings.push(`Visa-free stay limited to ${visaFree.maxDays} days. Longer stays require a visa.`);
    }

    if (purpose === "employment" || purpose === "self_employment") {
      blockers.push("Visa-free entry does NOT permit work. Work visa required for employment.");
    }
  }

  // Work permit requirements
  if (purpose === "employment" || purpose === "self_employment") {
    const workPermit = getWorkPermitRequirements(destinationCountry, purpose);
    if (workPermit) {
      requirements.push(workPermit);
      nextSteps.push(`Obtain work authorization: ${workPermit.name}`);
    }
  }

  // Right to work verification
  if (purpose === "employment") {
    requirements.push({
      id: "right_to_work_check",
      name: "Right to Work Verification",
      description: "Employer must verify your right to work before employment starts",
      mandatory: true,
      estimatedTimeDays: 1,
      estimatedCostUSD: 0,
      documentationNeeded: ["Passport", "Visa/Work Permit", "National ID (if applicable)"],
      authority: "Employer",
      url: null,
    });
  }

  return {
    domain: "immigration",
    compliant: blockers.length === 0,
    requirements,
    warnings,
    blockers,
    nextSteps,
    disclaimer: IMMIGRATION_DISCLAIMER,
  };
}

interface VisaFreeResult {
  allowed: boolean;
  maxDays: number | null;
  conditions: string[];
}

function checkVisaFreeAccess(citizenships: string[], destination: string, durationMonths: number): VisaFreeResult {
  // Simplified visa-free rules (in production, use comprehensive database)
  const visaFreeZones: Record<string, { countries: string[]; maxDays: number }> = {
    // Schengen Area
    SCHENGEN: {
      countries: ["AT", "BE", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IT", "LV", "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "SK", "SI", "ES", "SE", "CH"],
      maxDays: 90,
    },
    // UK for certain nationalities
    UK: {
      countries: ["GB"],
      maxDays: 180,
    },
    // US ESTA eligible
    US_ESTA: {
      countries: ["US"],
      maxDays: 90,
    },
  };

  // Check citizenship-based access
  const privilegedCitizenships = ["US", "GB", "CA", "AU", "NZ", "JP", "KR", "SG"];
  const hasPrivilegedCitizenship = citizenships.some(c => privilegedCitizenships.includes(c));

  // Check Schengen
  if (visaFreeZones.SCHENGEN.countries.includes(destination)) {
    if (hasPrivilegedCitizenship || citizenships.some(c => visaFreeZones.SCHENGEN.countries.includes(c))) {
      return { allowed: true, maxDays: 90, conditions: ["90 days within 180-day period"] };
    }
  }

  // Check UK
  if (destination === "GB") {
    if (hasPrivilegedCitizenship) {
      return { allowed: true, maxDays: 180, conditions: ["No work permitted without visa"] };
    }
  }

  // Check US
  if (destination === "US") {
    const estaEligible = ["GB", "DE", "FR", "JP", "KR", "AU", "NZ", "IT", "ES", "NL", "BE", "AT", "CH", "SE", "NO", "DK", "FI", "IE", "PT", "SG", "TW"];
    if (citizenships.some(c => estaEligible.includes(c))) {
      return { allowed: true, maxDays: 90, conditions: ["ESTA authorization required", "No work permitted"] };
    }
  }

  return { allowed: false, maxDays: null, conditions: [] };
}

interface VisaType {
  id: string;
  name: string;
  description: string;
  processingDays: number;
  costUSD: number;
  documents: string[];
  authority: string;
  url: string | null;
}

function determineVisaType(country: string, purpose: RelocationPurpose, durationMonths: number): VisaType {
  // Common visa types by country (simplified)
  const visaTypes: Record<string, Record<RelocationPurpose, VisaType>> = {
    US: {
      employment: {
        id: "h1b",
        name: "H-1B Specialty Occupation Visa",
        description: "For workers in specialty occupations requiring at least a bachelor's degree",
        processingDays: 180,
        costUSD: 2500,
        documents: ["Labor Condition Application", "Employer Petition", "Degree Certificates", "Resume"],
        authority: "USCIS",
        url: "https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations",
      },
      self_employment: {
        id: "e2",
        name: "E-2 Treaty Investor Visa",
        description: "For investors from treaty countries making substantial investment",
        processingDays: 90,
        costUSD: 1500,
        documents: ["Business Plan", "Proof of Investment", "Treaty Country Passport"],
        authority: "US Embassy/Consulate",
        url: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/all-visa-categories.html",
      },
      study: {
        id: "f1",
        name: "F-1 Student Visa",
        description: "For academic students at accredited institutions",
        processingDays: 60,
        costUSD: 350,
        documents: ["I-20 Form", "Proof of Funds", "SEVIS Fee Receipt"],
        authority: "US Embassy/Consulate",
        url: "https://studyinthestates.dhs.gov/students",
      },
      digital_nomad: {
        id: "b1b2",
        name: "B-1/B-2 Visitor Visa",
        description: "For temporary business/tourism visits (remote work for foreign employer is gray area)",
        processingDays: 30,
        costUSD: 185,
        documents: ["Proof of Employment Abroad", "Proof of Ties to Home Country"],
        authority: "US Embassy/Consulate",
        url: null,
      },
      retirement: {
        id: "b2",
        name: "B-2 Tourist Visa",
        description: "No specific retirement visa. Tourist visa with extensions possible.",
        processingDays: 30,
        costUSD: 185,
        documents: ["Proof of Funds", "Proof of Ties to Home Country"],
        authority: "US Embassy/Consulate",
        url: null,
      },
      family_reunification: {
        id: "ir",
        name: "Immediate Relative Visa",
        description: "For immediate relatives of US citizens",
        processingDays: 365,
        costUSD: 1200,
        documents: ["Relationship Proof", "Affidavit of Support", "Medical Exam"],
        authority: "USCIS",
        url: null,
      },
      investment: {
        id: "eb5",
        name: "EB-5 Immigrant Investor Visa",
        description: "For investors making $800K+ investment creating 10+ jobs",
        processingDays: 730,
        costUSD: 15000,
        documents: ["Source of Funds", "Business Plan", "Investment Proof"],
        authority: "USCIS",
        url: "https://www.uscis.gov/working-in-the-united-states/permanent-workers/eb-5-immigrant-investor-program",
      },
      tourism: {
        id: "b2",
        name: "B-2 Tourist Visa",
        description: "For tourism, vacation, visits",
        processingDays: 30,
        costUSD: 185,
        documents: ["Itinerary", "Proof of Funds", "Proof of Ties to Home Country"],
        authority: "US Embassy/Consulate",
        url: null,
      },
    },
    GB: {
      employment: {
        id: "skilled_worker",
        name: "Skilled Worker Visa",
        description: "For skilled workers with job offer from licensed sponsor",
        processingDays: 21,
        costUSD: 1500,
        documents: ["Certificate of Sponsorship", "English Language Proof", "Financial Evidence"],
        authority: "UK Visas and Immigration",
        url: "https://www.gov.uk/skilled-worker-visa",
      },
      self_employment: {
        id: "innovator_founder",
        name: "Innovator Founder Visa",
        description: "For experienced business founders with innovative idea",
        processingDays: 21,
        costUSD: 1500,
        documents: ["Endorsement Letter", "Business Plan", "Funds Proof"],
        authority: "UK Visas and Immigration",
        url: "https://www.gov.uk/innovator-founder-visa",
      },
      study: {
        id: "student",
        name: "Student Visa",
        description: "For students at licensed institutions",
        processingDays: 21,
        costUSD: 500,
        documents: ["CAS Number", "English Language Proof", "Funds Proof"],
        authority: "UK Visas and Immigration",
        url: "https://www.gov.uk/student-visa",
      },
      digital_nomad: {
        id: "standard_visitor",
        name: "Standard Visitor Visa",
        description: "UK has no digital nomad visa. Visitor visa for short stays only.",
        processingDays: 21,
        costUSD: 150,
        documents: ["Proof of Employment Abroad", "Return Ticket"],
        authority: "UK Visas and Immigration",
        url: null,
      },
      retirement: {
        id: "standard_visitor",
        name: "Standard Visitor Visa",
        description: "UK has no retirement visa. Consider Global Talent or Investor routes.",
        processingDays: 21,
        costUSD: 150,
        documents: ["Funds Proof", "Accommodation Details"],
        authority: "UK Visas and Immigration",
        url: null,
      },
      family_reunification: {
        id: "family",
        name: "Family Visa",
        description: "For partners, children, and other family members of UK residents",
        processingDays: 60,
        costUSD: 2000,
        documents: ["Relationship Proof", "English Language Proof", "Financial Requirement"],
        authority: "UK Visas and Immigration",
        url: "https://www.gov.uk/uk-family-visa",
      },
      investment: {
        id: "investor",
        name: "Investor Visa (Closed)",
        description: "Tier 1 Investor route closed. Consider Innovator Founder route.",
        processingDays: 0,
        costUSD: 0,
        documents: [],
        authority: "UK Visas and Immigration",
        url: null,
      },
      tourism: {
        id: "standard_visitor",
        name: "Standard Visitor Visa",
        description: "For tourism, visiting family, short business trips",
        processingDays: 21,
        costUSD: 150,
        documents: ["Itinerary", "Funds Proof", "Accommodation"],
        authority: "UK Visas and Immigration",
        url: "https://www.gov.uk/standard-visitor",
      },
    },
  };

  // Get visa type for country/purpose
  const countryVisas = visaTypes[country];
  if (countryVisas?.[purpose]) {
    return countryVisas[purpose];
  }

  // Default generic visa
  return {
    id: "generic",
    name: "Entry Visa",
    description: "Contact the embassy for specific visa requirements",
    processingDays: 30,
    costUSD: 200,
    documents: ["Passport", "Application Form", "Photo", "Itinerary"],
    authority: `${country} Embassy/Consulate`,
    url: null,
  };
}

function getWorkPermitRequirements(country: string, purpose: RelocationPurpose): ComplianceRequirement | null {
  if (purpose !== "employment" && purpose !== "self_employment") {
    return null;
  }

  const workPermits: Record<string, ComplianceRequirement> = {
    US: {
      id: "us_work_authorization",
      name: "Employment Authorization Document (EAD)",
      description: "Work authorization required before starting employment",
      mandatory: true,
      estimatedTimeDays: 90,
      estimatedCostUSD: 410,
      documentationNeeded: ["I-765 Form", "Supporting Documents based on category"],
      authority: "USCIS",
      url: "https://www.uscis.gov/i-765",
    },
    GB: {
      id: "uk_right_to_work",
      name: "Right to Work Documentation",
      description: "Employer must verify right to work before employment",
      mandatory: true,
      estimatedTimeDays: 1,
      estimatedCostUSD: 0,
      documentationNeeded: ["Visa with Work Permission", "BRP Card", "Share Code"],
      authority: "UK Visas and Immigration",
      url: "https://www.gov.uk/prove-right-to-work",
    },
  };

  return workPermits[country] ?? null;
}

const IMMIGRATION_DISCLAIMER = `
DISCLAIMER: This information is for general guidance only and does not constitute legal advice.
Immigration laws change frequently. Always consult with a licensed immigration attorney
or the relevant government authority before making decisions based on this information.
CLUES Intelligence is not a law firm and cannot provide legal advice.
`.trim();

// ─── Tax Compliance Subflow ───────────────────────────────────────────────────

/**
 * Deterministic tax residency checker.
 */
export function checkTaxCompliance(input: ComplianceCheckInput): ComplianceCheckResult {
  const { sourceCountry, destinationCountry, durationMonths, purpose, context } = input;

  const requirements: ComplianceRequirement[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];
  const nextSteps: string[] = [];

  // Check tax residency implications
  const residencyThreshold = getTaxResidencyThreshold(destinationCountry);

  if (durationMonths * 30 >= residencyThreshold.days) {
    warnings.push(`Stay of ${durationMonths} months may trigger tax residency in ${destinationCountry} (threshold: ${residencyThreshold.days} days).`);

    requirements.push({
      id: `tax_registration_${destinationCountry.toLowerCase()}`,
      name: `Tax Registration in ${destinationCountry}`,
      description: residencyThreshold.description,
      mandatory: true,
      estimatedTimeDays: 30,
      estimatedCostUSD: null,
      documentationNeeded: ["Proof of Address", "Identification", "Income Documentation"],
      authority: residencyThreshold.authority,
      url: residencyThreshold.url,
    });

    nextSteps.push(`Consult a tax advisor about ${destinationCountry} tax obligations`);
  }

  // Check double taxation treaty
  const treaty = checkDoubleTaxationTreaty(sourceCountry, destinationCountry);
  if (treaty.exists) {
    warnings.push(`Double taxation treaty exists between ${sourceCountry} and ${destinationCountry}. You may be able to claim relief.`);
  } else {
    warnings.push(`No double taxation treaty between ${sourceCountry} and ${destinationCountry}. Risk of being taxed in both countries.`);
  }

  // Departure tax obligations
  if (durationMonths === 0) { // Permanent relocation
    requirements.push({
      id: `departure_tax_${sourceCountry.toLowerCase()}`,
      name: `${sourceCountry} Departure Tax Filing`,
      description: "Final tax return may be required when changing tax residency",
      mandatory: true,
      estimatedTimeDays: 90,
      estimatedCostUSD: null,
      documentationNeeded: ["All Income Records", "Asset Declarations"],
      authority: `${sourceCountry} Tax Authority`,
      url: null,
    });

    nextSteps.push(`File departure tax return in ${sourceCountry}`);
  }

  return {
    domain: "tax",
    compliant: blockers.length === 0,
    requirements,
    warnings,
    blockers,
    nextSteps,
    disclaimer: TAX_DISCLAIMER,
  };
}

interface TaxResidencyThreshold {
  days: number;
  description: string;
  authority: string;
  url: string | null;
}

function getTaxResidencyThreshold(country: string): TaxResidencyThreshold {
  const thresholds: Record<string, TaxResidencyThreshold> = {
    US: {
      days: 183,
      description: "Substantial Presence Test: 183 days over 3-year period (weighted)",
      authority: "Internal Revenue Service (IRS)",
      url: "https://www.irs.gov/individuals/international-taxpayers/substantial-presence-test",
    },
    GB: {
      days: 183,
      description: "Statutory Residence Test: Complex rules based on days, ties, and work",
      authority: "HM Revenue & Customs (HMRC)",
      url: "https://www.gov.uk/tax-foreign-income/residence",
    },
    DE: {
      days: 183,
      description: "183-day rule or habitual abode determines tax residency",
      authority: "Bundeszentralamt für Steuern",
      url: null,
    },
    FR: {
      days: 183,
      description: "183-day rule, principal residence, or professional activity",
      authority: "Direction Générale des Finances Publiques",
      url: null,
    },
    ES: {
      days: 183,
      description: "183-day rule or center of economic interests",
      authority: "Agencia Tributaria",
      url: null,
    },
    PT: {
      days: 183,
      description: "183-day rule. NHR regime available for new residents",
      authority: "Autoridade Tributária e Aduaneira",
      url: null,
    },
  };

  return thresholds[country] ?? {
    days: 183,
    description: "Standard 183-day rule applies in most jurisdictions",
    authority: `${country} Tax Authority`,
    url: null,
  };
}

interface DoubleTaxationTreaty {
  exists: boolean;
  name: string | null;
  url: string | null;
}

function checkDoubleTaxationTreaty(country1: string, country2: string): DoubleTaxationTreaty {
  // Simplified check — in production, use comprehensive treaty database
  const usaTreaties = ["GB", "CA", "DE", "FR", "JP", "AU", "NL", "CH", "IE", "IT", "ES", "SE", "DK", "NO", "FI", "BE", "AT", "NZ", "KR", "MX", "IN", "CN", "IL", "ZA", "PL", "CZ", "HU", "PT"];
  const ukTreaties = ["US", "CA", "DE", "FR", "JP", "AU", "NL", "CH", "IE", "IT", "ES", "SE", "DK", "NO", "FI", "BE", "AT", "NZ", "KR", "MX", "IN", "CN", "IL", "ZA", "PL", "CZ", "HU", "PT", "AE", "SG", "HK"];

  if ((country1 === "US" && usaTreaties.includes(country2)) || (country2 === "US" && usaTreaties.includes(country1))) {
    return { exists: true, name: "US Double Taxation Treaty", url: "https://www.irs.gov/businesses/international-businesses/united-states-income-tax-treaties-a-to-z" };
  }

  if ((country1 === "GB" && ukTreaties.includes(country2)) || (country2 === "GB" && ukTreaties.includes(country1))) {
    return { exists: true, name: "UK Double Taxation Treaty", url: "https://www.gov.uk/government/collections/tax-treaties" };
  }

  return { exists: false, name: null, url: null };
}

const TAX_DISCLAIMER = `
DISCLAIMER: This information is for general guidance only and does not constitute tax advice.
Tax laws are complex and change frequently. Always consult with a qualified tax professional
or accountant before making decisions based on this information.
CLUES Intelligence is not a tax advisory firm and cannot provide tax advice.
`.trim();

// ─── Unified Compliance Check ─────────────────────────────────────────────────

/**
 * Run all relevant compliance checks for a relocation scenario.
 */
export function runComplianceChecks(input: ComplianceCheckInput): ComplianceCheckResult[] {
  const results: ComplianceCheckResult[] = [];

  // Always run immigration check for international moves
  if (input.sourceCountry !== input.destinationCountry) {
    results.push(checkImmigrationCompliance(input));
    results.push(checkTaxCompliance(input));
  }

  // Real estate checks would go here if buying property
  // Employment checks would go here if working

  return results;
}

// ─── Service Interface ────────────────────────────────────────────────────────

export interface ComplianceSubflowService {
  checkImmigration(input: ComplianceCheckInput): ComplianceCheckResult;
  checkTax(input: ComplianceCheckInput): ComplianceCheckResult;
  runAllChecks(input: ComplianceCheckInput): ComplianceCheckResult[];
}

export function getComplianceSubflowService(): ComplianceSubflowService {
  return {
    checkImmigration: checkImmigrationCompliance,
    checkTax: checkTaxCompliance,
    runAllChecks: runComplianceChecks,
  };
}
