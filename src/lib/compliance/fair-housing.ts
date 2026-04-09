/**
 * Fair Housing Compliance Validators
 * Ensures AI responses comply with Fair Housing Act regulations
 */

export type ProtectedClass =
  | "RACE"
  | "COLOR"
  | "RELIGION"
  | "NATIONAL_ORIGIN"
  | "SEX"
  | "FAMILIAL_STATUS"
  | "DISABILITY";

export interface FairHousingViolation {
  type: "DISCRIMINATORY_LANGUAGE" | "STEERING" | "PREFERENCE_INDICATION" | "EXCLUSIONARY";
  protectedClass: ProtectedClass;
  phrase: string;
  position: number;
  severity: "low" | "medium" | "high" | "critical";
  suggestion: string;
}

export interface FairHousingCheckResult {
  compliant: boolean;
  violations: FairHousingViolation[];
  riskScore: number; // 0-100
  recommendation: string;
}

// Patterns that may indicate Fair Housing violations
const DISCRIMINATORY_PATTERNS: Record<ProtectedClass, RegExp[]> = {
  RACE: [
    /\b(white|black|african|asian|hispanic|latino|caucasian)\s*(only|preferred|neighborhood|area|community)\b/gi,
    /\b(ethnic|racial)\s*(background|composition|demographics)\b/gi,
  ],
  COLOR: [
    /\b(skin\s*color|complexion)\b/gi,
  ],
  RELIGION: [
    /\b(christian|jewish|muslim|catholic|protestant|hindu|buddhist)\s*(only|preferred|community|neighborhood)\b/gi,
    /\b(near|close\s*to)\s*(church|mosque|synagogue|temple)\b/gi,
  ],
  NATIONAL_ORIGIN: [
    /\b(no\s*(immigrants|foreigners))\b/gi,
    /\b(english\s*only|speak\s*english|american\s*born)\b/gi,
    /\b(citizenship|immigration\s*status)\s*(required|verified)\b/gi,
  ],
  SEX: [
    /\b(male|female|men|women)\s*(only|preferred)\b/gi,
    /\b(bachelor|bachelorette|single\s*(men|women))\s*pad\b/gi,
  ],
  FAMILIAL_STATUS: [
    /\b(no\s*(children|kids|families))\b/gi,
    /\b(adult\s*(only|community|living))\b/gi,
    /\b(perfect\s*for\s*(singles|couples\s*without\s*children))\b/gi,
    /\b(quiet|mature)\s*(community|adults|residents)\b/gi,
  ],
  DISABILITY: [
    /\b(no\s*(disabled|handicapped|wheelchairs))\b/gi,
    /\b(able[\s-]?bodied)\s*(only|required|preferred)\b/gi,
    /\b(mental\s*(illness|disability|health)\s*(history|issues))\b/gi,
  ],
};

// Steering patterns (directing based on protected class)
const STEERING_PATTERNS = [
  /\b(you\s*would\s*(like|prefer|fit\s*in|be\s*comfortable))\s*(that|this)\s*(neighborhood|area|community)\b/gi,
  /\b(people\s*like\s*you)\s*(usually|typically|often)\s*(live|prefer|choose)\b/gi,
  /\b(this\s*(area|neighborhood)\s*(is|has)\s*(mostly|primarily|predominantly))\b/gi,
];

// Allowed exceptions (legitimate descriptions)
const ALLOWED_PATTERNS = [
  /\b(senior\s*housing|55\+|age\s*restricted)\b/gi, // Legal senior housing
  /\b(wheelchair\s*accessible|ada\s*compliant|handicap\s*accessible)\b/gi, // Accessibility features
  /\b(family[\s-]?friendly|kid[\s-]?friendly)\b/gi, // Positive family features
];

function getSeverity(type: FairHousingViolation["type"]): FairHousingViolation["severity"] {
  switch (type) {
    case "DISCRIMINATORY_LANGUAGE":
      return "critical";
    case "STEERING":
      return "high";
    case "EXCLUSIONARY":
      return "high";
    case "PREFERENCE_INDICATION":
      return "medium";
    default:
      return "medium";
  }
}

function getSuggestion(type: FairHousingViolation["type"], protectedClass: ProtectedClass): string {
  const suggestions: Record<FairHousingViolation["type"], string> = {
    DISCRIMINATORY_LANGUAGE: `Remove reference to ${protectedClass.toLowerCase().replace("_", " ")}. Focus on property features instead.`,
    STEERING: "Avoid suggesting neighborhoods based on demographics. Present all options equally.",
    PREFERENCE_INDICATION: "Do not express preferences regarding tenant characteristics. Focus on qualifications.",
    EXCLUSIONARY: `Remove exclusionary language. Cannot exclude based on ${protectedClass.toLowerCase().replace("_", " ")}.`,
  };
  return suggestions[type];
}

export function checkFairHousingCompliance(text: string): FairHousingCheckResult {
  const violations: FairHousingViolation[] = [];

  // Check for allowed patterns first
  let cleanedText = text;
  for (const pattern of ALLOWED_PATTERNS) {
    cleanedText = cleanedText.replace(pattern, "");
  }

  // Check discriminatory patterns for each protected class
  for (const [protectedClass, patterns] of Object.entries(DISCRIMINATORY_PATTERNS)) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(cleanedText)) !== null) {
        violations.push({
          type: "DISCRIMINATORY_LANGUAGE",
          protectedClass: protectedClass as ProtectedClass,
          phrase: match[0],
          position: match.index,
          severity: getSeverity("DISCRIMINATORY_LANGUAGE"),
          suggestion: getSuggestion("DISCRIMINATORY_LANGUAGE", protectedClass as ProtectedClass),
        });
      }
    }
  }

  // Check steering patterns
  for (const pattern of STEERING_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(cleanedText)) !== null) {
      violations.push({
        type: "STEERING",
        protectedClass: "NATIONAL_ORIGIN", // Default, steering can affect multiple classes
        phrase: match[0],
        position: match.index,
        severity: getSeverity("STEERING"),
        suggestion: getSuggestion("STEERING", "NATIONAL_ORIGIN"),
      });
    }
  }

  // Calculate risk score
  const riskScore = Math.min(100, violations.reduce((sum, v) => {
    const severityScores = { low: 10, medium: 25, high: 50, critical: 100 };
    return sum + severityScores[v.severity];
  }, 0));

  // Generate recommendation
  let recommendation = "Content appears compliant with Fair Housing regulations.";
  if (violations.length > 0) {
    const criticalCount = violations.filter((v) => v.severity === "critical").length;
    if (criticalCount > 0) {
      recommendation = `CRITICAL: ${criticalCount} critical Fair Housing violation(s) detected. Content must be revised before use.`;
    } else {
      recommendation = `WARNING: ${violations.length} potential Fair Housing issue(s) detected. Review and revise recommended.`;
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
    riskScore,
    recommendation,
  };
}

export interface FairHousingService {
  check(text: string): FairHousingCheckResult;
  isCompliant(text: string): boolean;
  sanitize(text: string): string;
}

class FairHousingServiceImpl implements FairHousingService {
  check(text: string): FairHousingCheckResult {
    return checkFairHousingCompliance(text);
  }

  isCompliant(text: string): boolean {
    return this.check(text).compliant;
  }

  sanitize(text: string): string {
    const result = this.check(text);
    if (result.compliant) {
      return text;
    }

    // Replace violations with generic text
    let sanitized = text;
    const sortedViolations = [...result.violations].sort((a, b) => b.position - a.position);

    for (const violation of sortedViolations) {
      const replacement = "[CONTENT REMOVED FOR COMPLIANCE]";
      sanitized = sanitized.slice(0, violation.position) +
                  replacement +
                  sanitized.slice(violation.position + violation.phrase.length);
    }

    return sanitized;
  }
}

let fairHousingService: FairHousingService | undefined;

export function getFairHousingService(): FairHousingService {
  if (!fairHousingService) {
    fairHousingService = new FairHousingServiceImpl();
  }
  return fairHousingService;
}
