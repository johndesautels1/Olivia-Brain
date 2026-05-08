/**
 * entityModes — Entity type configurations for the Preparation Studio.
 *
 * Defines how the studio adapts when preparing documents for different
 * entity types: VC, Accelerator, Acquirer, Angel, Corporate, or a
 * generic fallback.
 *
 * Each EntityMode specifies:
 * - Display metadata (label, color, icon)
 * - Priority block types (highlighted as high-impact for that entity)
 * - Supplementary block types (collapsed/de-emphasised)
 * - Olivia persona hint (tone instruction injected into the chat)
 * - Key questions the entity cares about most
 */

// ── Entity Type ─────────────────────────────────────────────────────────

export type EntityType =
  | "vc"
  | "accelerator"
  | "acquirer"
  | "angel"
  | "corporate"
  | "general";

// ── Entity Mode Configuration ───────────────────────────────────────────

export interface EntityMode {
  /** Machine key */
  type: EntityType;
  /** Human-readable label for UI chips */
  label: string;
  /** Hex color for the entity chip/badge */
  color: string;
  /** Short description shown in mode selector */
  description: string;
  /** Block types that are high-priority for this entity */
  priorityBlockTypes: string[];
  /** Block types that are supplementary (collapsed by default) */
  supplementaryBlockTypes: string[];
  /** Field keys that are high-priority for this entity */
  priorityFieldKeys: string[];
  /** Olivia persona instruction — injected into system prompt */
  oliviaPersonaHint: string;
  /** What this entity type looks for (shown in EntityBriefCard) */
  keyQuestions: string[];
  /** Tone descriptor for Pitch Polish rewrite context */
  toneLabel: string;
}

// ── Mode Definitions ────────────────────────────────────────────────────

const VC_MODE: EntityMode = {
  type: "vc",
  label: "VC",
  color: "#3b82f6",
  description: "Venture capital — metrics-focused, growth-oriented",
  priorityBlockTypes: ["metrics", "stat_card", "hero", "paragraph"],
  supplementaryBlockTypes: ["footer", "logo_banner", "timeline"],
  priorityFieldKeys: [
    "content", "revenue", "arr", "mrr", "growth_rate",
    "tam", "sam", "som", "burn_rate", "runway",
  ],
  oliviaPersonaHint:
    "The user is preparing for a VC. Be crisp and metrics-focused. " +
    "Emphasise traction, unit economics, TAM/SAM/SOM, ARR growth, " +
    "burn rate, and defensible moat. Use investor-grade language. " +
    "Challenge weak claims with specific data requests.",
  keyQuestions: [
    "What is your ARR and month-over-month growth?",
    "How large is your addressable market (TAM/SAM/SOM)?",
    "What are your unit economics and path to profitability?",
  ],
  toneLabel: "Investor-ready",
};

const ACCELERATOR_MODE: EntityMode = {
  type: "accelerator",
  label: "Accelerator",
  color: "#f59e0b",
  description: "Accelerator/incubator — team-focused, developmental",
  priorityBlockTypes: ["team_card", "hero", "paragraph", "timeline"],
  supplementaryBlockTypes: ["footer", "logo_banner", "comparison_table"],
  priorityFieldKeys: [
    "bio", "content", "role", "team_size", "milestones",
    "vision", "product_stage", "demo",
  ],
  oliviaPersonaHint:
    "The user is preparing for an accelerator. Be warm and developmental. " +
    "Focus on team strength, coachability, vision clarity, product stage, " +
    "and milestone readiness. Encourage storytelling about the founding " +
    "journey and what they would do with structured support.",
  keyQuestions: [
    "Who is on your founding team and what is their background?",
    "What stage is your product and what milestones have you hit?",
    "What do you hope to achieve during the programme?",
  ],
  toneLabel: "Compelling narrative",
};

const ACQUIRER_MODE: EntityMode = {
  type: "acquirer",
  label: "Acquirer",
  color: "#10b981",
  description: "Strategic acquirer — IP, synergy, and integration focus",
  priorityBlockTypes: ["metrics", "stat_card", "comparison_table", "paragraph"],
  supplementaryBlockTypes: ["team_card", "timeline", "logo_banner"],
  priorityFieldKeys: [
    "content", "revenue", "ip", "patents", "tech_stack",
    "retention", "churn", "customers", "contracts",
  ],
  oliviaPersonaHint:
    "The user is preparing for an acquirer. Frame everything through " +
    "exit and integration readiness. Emphasise IP portfolio, revenue " +
    "quality, customer retention, technology differentiation, and " +
    "synergy potential. Use M&A terminology: defensive moat, earnout " +
    "readiness, clean cap table, integration risk.",
  keyQuestions: [
    "What proprietary IP or technology do you own?",
    "What is your customer retention rate and contract structure?",
    "How would your technology integrate with an acquirer's stack?",
  ],
  toneLabel: "M&A-ready",
};

const ANGEL_MODE: EntityMode = {
  type: "angel",
  label: "Angel",
  color: "#a855f7",
  description: "Angel investor — founder story, early traction",
  priorityBlockTypes: ["hero", "team_card", "paragraph", "callout"],
  supplementaryBlockTypes: ["comparison_table", "footer", "logo_banner"],
  priorityFieldKeys: [
    "content", "bio", "vision", "problem", "solution",
    "early_traction", "prototype",
  ],
  oliviaPersonaHint:
    "The user is preparing for an angel investor. Focus on the founder " +
    "story, problem-solution fit, early traction signals, and personal " +
    "conviction. Angels invest in people — help the user communicate " +
    "passion, domain expertise, and why they are the right person to " +
    "solve this problem.",
  keyQuestions: [
    "What problem are you solving and why does it matter to you?",
    "What early traction or validation have you achieved?",
    "How will you use the angel investment in the next 12 months?",
  ],
  toneLabel: "Founder-authentic",
};

const CORPORATE_MODE: EntityMode = {
  type: "corporate",
  label: "Corporate",
  color: "#6366f1",
  description: "Corporate partner — enterprise readiness, compliance",
  priorityBlockTypes: ["metrics", "comparison_table", "paragraph", "list"],
  supplementaryBlockTypes: ["team_card", "timeline", "logo_banner"],
  priorityFieldKeys: [
    "content", "compliance", "security", "sla", "enterprise",
    "integration", "support", "pricing",
  ],
  oliviaPersonaHint:
    "The user is preparing for a corporate partner. Emphasise enterprise " +
    "readiness: security certifications, compliance (GDPR, SOC 2), SLA " +
    "commitments, integration capabilities, and scalability. Use " +
    "professional, risk-aware language that procurement teams expect.",
  keyQuestions: [
    "What security certifications and compliance standards do you meet?",
    "How does your solution integrate with enterprise systems?",
    "What SLA and support tiers do you offer?",
  ],
  toneLabel: "Enterprise-grade",
};

const GENERAL_MODE: EntityMode = {
  type: "general",
  label: "General",
  color: "#C4A96A",
  description: "No specific target — balanced preparation",
  priorityBlockTypes: [],
  supplementaryBlockTypes: [],
  priorityFieldKeys: [],
  oliviaPersonaHint:
    "No specific entity target is selected. Provide balanced guidance " +
    "covering all aspects of the document equally.",
  keyQuestions: [
    "Complete all sections with clear, accurate information.",
    "Ensure consistency across all documents in the package.",
    "Review for completeness before submitting.",
  ],
  toneLabel: "Professional",
};

// ── Mode Registry ───────────────────────────────────────────────────────

export const ENTITY_MODES: Record<EntityType, EntityMode> = {
  vc: VC_MODE,
  accelerator: ACCELERATOR_MODE,
  acquirer: ACQUIRER_MODE,
  angel: ANGEL_MODE,
  corporate: CORPORATE_MODE,
  general: GENERAL_MODE,
};

// ── Helpers ─────────────────────────────────────────────────────────────

/** Get the entity mode config for a given type, falling back to general */
export function getEntityMode(type: EntityType | string | null): EntityMode {
  if (!type) return GENERAL_MODE;
  return ENTITY_MODES[type as EntityType] ?? GENERAL_MODE;
}

/** Derive an EntityType from an organisation's orgType field */
export function deriveEntityType(orgType: string | null | undefined): EntityType {
  if (!orgType) return "general";

  const lower = orgType.toLowerCase();

  if (lower.includes("vc") || lower.includes("venture capital") || lower.includes("venture_capital")) {
    return "vc";
  }
  if (lower.includes("accelerator") || lower.includes("incubator")) {
    return "accelerator";
  }
  if (lower.includes("acquirer") || lower.includes("corporate_acquirer")) {
    return "acquirer";
  }
  if (lower.includes("angel")) {
    return "angel";
  }
  if (lower.includes("corporate") || lower.includes("enterprise")) {
    return "corporate";
  }

  return "general";
}

/** All selectable entity types (for the mode picker UI) */
export const SELECTABLE_ENTITY_TYPES: EntityType[] = [
  "vc",
  "accelerator",
  "acquirer",
  "angel",
  "corporate",
];

/** Check if a block type is priority for the given entity mode */
export function isBlockPriority(blockType: string, mode: EntityMode): boolean {
  return mode.priorityBlockTypes.includes(blockType);
}

/** Check if a block type is supplementary (should be collapsed) */
export function isBlockSupplementary(blockType: string, mode: EntityMode): boolean {
  return mode.supplementaryBlockTypes.includes(blockType);
}

/** Check if a field key is priority for the given entity mode */
export function isFieldPriority(fieldKey: string, mode: EntityMode): boolean {
  return mode.priorityFieldKeys.includes(fieldKey);
}
