/**
 * Guardrails for LLM Output Validation
 * Implements NeMo Guardrails-style checks for hallucination prevention
 */

export type GuardrailType =
  | "FACTUAL_CONSISTENCY"
  | "TOPIC_RELEVANCE"
  | "SAFETY"
  | "HALLUCINATION"
  | "PROMPT_INJECTION"
  | "JAILBREAK"
  | "TOXICITY"
  | "BIAS";

export interface GuardrailViolation {
  type: GuardrailType;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  details?: string;
  confidence: number;
}

export interface GuardrailCheckResult {
  passed: boolean;
  violations: GuardrailViolation[];
  overallRisk: "low" | "medium" | "high" | "critical";
  shouldBlock: boolean;
  recommendation: string;
}

// Patterns for detecting potential issues
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s*(all|previous|above)\s*(instructions|prompts|rules)/gi,
  /disregard\s*(all|previous|above)/gi,
  /forget\s*(everything|all|your)\s*(instructions|training|rules)/gi,
  /you\s*are\s*now\s*(a|an|in)\s*(different|new|DAN|jailbreak)/gi,
  /pretend\s*(you\s*are|to\s*be)\s*(a|an|not)/gi,
  /roleplay\s*as/gi,
  /\[system\]|\[instruction\]|\[admin\]/gi,
];

const JAILBREAK_PATTERNS = [
  /DAN\s*(mode|enabled|activated)/gi,
  /developer\s*mode\s*(enabled|on|activated)/gi,
  /unrestricted\s*mode/gi,
  /bypass\s*(restrictions|filters|safety)/gi,
  /disable\s*(safety|filters|guardrails)/gi,
];

const TOXICITY_PATTERNS = [
  /\b(kill|murder|harm|hurt|attack)\s*(yourself|themselves|someone|people)\b/gi,
  /\b(hate|despise|loathe)\s*(all|every)\s*(men|women|race|religion)\b/gi,
];

const HALLUCINATION_INDICATORS = [
  /(?:as\s*(?:of|per)\s*(?:my|the)\s*(?:last\s*)?(?:training|knowledge|update))/gi,
  /(?:i\s*(?:don't|cannot)\s*(?:have|access)\s*(?:real-?time|current|live)\s*(?:data|information))/gi,
  /(?:i\s*(?:am|'m)\s*not\s*(?:able|capable)\s*(?:to|of)\s*(?:browse|search|access))/gi,
];

const CLAIM_PATTERNS = [
  // Specific claims that should be verifiable
  /(?:according\s*to\s*(?:a|the)\s*(?:study|research|report))/gi,
  /(?:statistics\s*show|data\s*shows|research\s*indicates)/gi,
  /(?:it\s*(?:is|has\s*been)\s*(?:proven|confirmed|established))/gi,
];

export interface GuardrailConfig {
  enabledChecks: GuardrailType[];
  blockOnCritical: boolean;
  toxicityThreshold: number;
  hallucinationThreshold: number;
}

const DEFAULT_CONFIG: GuardrailConfig = {
  enabledChecks: [
    "PROMPT_INJECTION",
    "JAILBREAK",
    "TOXICITY",
    "HALLUCINATION",
    "SAFETY",
  ],
  blockOnCritical: true,
  toxicityThreshold: 0.7,
  hallucinationThreshold: 0.6,
};

function checkPromptInjection(text: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      violations.push({
        type: "PROMPT_INJECTION",
        severity: "critical",
        message: "Potential prompt injection detected",
        details: "Input contains patterns that may attempt to override system instructions",
        confidence: 0.85,
      });
      break;
    }
  }

  return violations;
}

function checkJailbreak(text: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  for (const pattern of JAILBREAK_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      violations.push({
        type: "JAILBREAK",
        severity: "critical",
        message: "Potential jailbreak attempt detected",
        details: "Input contains patterns associated with jailbreak attempts",
        confidence: 0.9,
      });
      break;
    }
  }

  return violations;
}

function checkToxicity(text: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  for (const pattern of TOXICITY_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      violations.push({
        type: "TOXICITY",
        severity: "high",
        message: "Potentially toxic content detected",
        details: "Content may contain harmful or inappropriate language",
        confidence: 0.75,
      });
      break;
    }
  }

  return violations;
}

function checkHallucination(text: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  // Check for self-aware AI limitation statements (potential hallucination markers)
  for (const pattern of HALLUCINATION_INDICATORS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      violations.push({
        type: "HALLUCINATION",
        severity: "medium",
        message: "Response contains AI limitation disclaimers",
        details: "Consider providing more specific, actionable information",
        confidence: 0.6,
      });
    }
  }

  // Check for unverified claims
  let claimCount = 0;
  for (const pattern of CLAIM_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) {
      claimCount += matches.length;
    }
  }

  if (claimCount > 3) {
    violations.push({
      type: "HALLUCINATION",
      severity: "medium",
      message: "Multiple unverified claims detected",
      details: `Found ${claimCount} claims that may need verification or citations`,
      confidence: 0.5,
    });
  }

  return violations;
}

function checkSafety(text: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  // Check for potentially dangerous instructions
  const dangerousPatterns = [
    /\b(how\s*to\s*(?:make|build|create)\s*(?:a\s*)?(?:bomb|weapon|explosive))/gi,
    /\b(instructions\s*for\s*(?:illegal|criminal)\s*(?:activity|activities))/gi,
  ];

  for (const pattern of dangerousPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      violations.push({
        type: "SAFETY",
        severity: "critical",
        message: "Potentially dangerous content detected",
        details: "Content may relate to harmful or illegal activities",
        confidence: 0.85,
      });
      break;
    }
  }

  return violations;
}

export function runGuardrails(
  text: string,
  config: GuardrailConfig = DEFAULT_CONFIG
): GuardrailCheckResult {
  const violations: GuardrailViolation[] = [];

  if (config.enabledChecks.includes("PROMPT_INJECTION")) {
    violations.push(...checkPromptInjection(text));
  }

  if (config.enabledChecks.includes("JAILBREAK")) {
    violations.push(...checkJailbreak(text));
  }

  if (config.enabledChecks.includes("TOXICITY")) {
    violations.push(...checkToxicity(text));
  }

  if (config.enabledChecks.includes("HALLUCINATION")) {
    violations.push(...checkHallucination(text));
  }

  if (config.enabledChecks.includes("SAFETY")) {
    violations.push(...checkSafety(text));
  }

  // Determine overall risk
  let overallRisk: GuardrailCheckResult["overallRisk"] = "low";
  const hasCritical = violations.some((v) => v.severity === "critical");
  const hasHigh = violations.some((v) => v.severity === "high");
  const hasMedium = violations.some((v) => v.severity === "medium");

  if (hasCritical) {
    overallRisk = "critical";
  } else if (hasHigh) {
    overallRisk = "high";
  } else if (hasMedium) {
    overallRisk = "medium";
  }

  // Determine if should block
  const shouldBlock = config.blockOnCritical && hasCritical;

  // Generate recommendation
  let recommendation = "Content passed all guardrail checks.";
  if (shouldBlock) {
    recommendation = "BLOCKED: Critical safety violation detected. Content should not be processed.";
  } else if (violations.length > 0) {
    recommendation = `REVIEW: ${violations.length} potential issue(s) detected. Manual review recommended.`;
  }

  return {
    passed: violations.length === 0,
    violations,
    overallRisk,
    shouldBlock,
    recommendation,
  };
}

export interface GuardrailsService {
  check(text: string): GuardrailCheckResult;
  checkInput(input: string): GuardrailCheckResult;
  checkOutput(output: string): GuardrailCheckResult;
  isBlocked(text: string): boolean;
}

class GuardrailsServiceImpl implements GuardrailsService {
  private config: GuardrailConfig;

  constructor(config?: Partial<GuardrailConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  check(text: string): GuardrailCheckResult {
    return runGuardrails(text, this.config);
  }

  checkInput(input: string): GuardrailCheckResult {
    // For input, focus on injection and jailbreak
    const inputConfig: GuardrailConfig = {
      ...this.config,
      enabledChecks: ["PROMPT_INJECTION", "JAILBREAK", "TOXICITY"],
    };
    return runGuardrails(input, inputConfig);
  }

  checkOutput(output: string): GuardrailCheckResult {
    // For output, focus on safety, toxicity, and hallucination
    const outputConfig: GuardrailConfig = {
      ...this.config,
      enabledChecks: ["SAFETY", "TOXICITY", "HALLUCINATION"],
    };
    return runGuardrails(output, outputConfig);
  }

  isBlocked(text: string): boolean {
    return this.check(text).shouldBlock;
  }
}

let guardrailsService: GuardrailsService | undefined;

export function getGuardrailsService(config?: Partial<GuardrailConfig>): GuardrailsService {
  if (!guardrailsService) {
    guardrailsService = new GuardrailsServiceImpl(config);
  }
  return guardrailsService;
}
