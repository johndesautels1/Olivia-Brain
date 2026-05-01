/**
 * Custom Prompt Packs
 * Sprint 5.2 — White-Label System (Item 3)
 *
 * Allows tenants to customize system prompts for different scenarios:
 * - Onboarding flows
 * - Report generation
 * - Specific domain expertise
 * - Compliance-specific language
 */

import { getTenantContext } from "@/lib/tenant";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromptPack {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  /** Category for organization */
  category: PromptCategory;
  /** Individual prompts in this pack */
  prompts: Record<string, PromptTemplate>;
  /** Variables available across all prompts */
  globalVariables: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export type PromptCategory =
  | "onboarding"
  | "questionnaire"
  | "analysis"
  | "reports"
  | "communication"
  | "compliance"
  | "custom";

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  /** The actual prompt text with {{variables}} */
  template: string;
  /** Required variables for this prompt */
  requiredVariables: string[];
  /** Optional variables */
  optionalVariables: string[];
  /** Default values for optional variables */
  defaults: Record<string, string>;
  /** Example output */
  exampleOutput: string | null;
  /** Token estimate */
  estimatedTokens: number;
}

// ─── Default Prompt Packs ─────────────────────────────────────────────────────

export const DEFAULT_ONBOARDING_PACK: Omit<PromptPack, "id" | "tenantId" | "createdAt" | "updatedAt"> = {
  name: "Standard Onboarding",
  description: "Default prompts for client onboarding flow",
  version: "1.0.0",
  isActive: true,
  category: "onboarding",
  globalVariables: {
    agentName: "Olivia",
    companyName: "CLUES Intelligence",
  },
  prompts: {
    welcome: {
      id: "onboarding_welcome",
      name: "Welcome Message",
      description: "First interaction with a new client",
      template: `Hello! I'm {{agentName}}, your AI relocation advisor from {{companyName}}.

I'm here to help you find your perfect place to live, work, and thrive. Whether you're considering a move across town or across the world, I'll guide you through the process with personalized insights and recommendations.

To get started, could you tell me a bit about what's prompting your interest in relocating? There's no wrong answer - I'm here to understand your unique situation.`,
      requiredVariables: [],
      optionalVariables: ["agentName", "companyName"],
      defaults: {},
      exampleOutput: null,
      estimatedTokens: 100,
    },
    paragraphIntro: {
      id: "onboarding_paragraph_intro",
      name: "Paragraph Writing Introduction",
      description: "Introduces the biographical paragraph section",
      template: `Great! Now I'd like to learn more about you through a series of brief writing exercises.

I'll ask you to write short paragraphs (2-4 sentences each) about different aspects of your life. This helps me understand your priorities, preferences, and what truly matters to you.

There are {{paragraphCount}} topics to cover. Take your time - there's no rush, and your thoughtful responses will help me give you better recommendations.

Ready to begin with the first topic?`,
      requiredVariables: ["paragraphCount"],
      optionalVariables: [],
      defaults: { paragraphCount: "30" },
      exampleOutput: null,
      estimatedTokens: 80,
    },
    moduleTransition: {
      id: "onboarding_module_transition",
      name: "Module Transition",
      description: "Transition between questionnaire modules",
      template: `Excellent work on completing the {{completedModule}} section!

Based on your responses, I've identified that {{nextModule}} is particularly relevant to your situation. This section will help us understand {{moduleReason}}.

You're {{progress}}% through the assessment. Ready to continue?`,
      requiredVariables: ["completedModule", "nextModule", "moduleReason", "progress"],
      optionalVariables: [],
      defaults: {},
      exampleOutput: null,
      estimatedTokens: 60,
    },
  },
};

export const DEFAULT_ANALYSIS_PACK: Omit<PromptPack, "id" | "tenantId" | "createdAt" | "updatedAt"> = {
  name: "Standard Analysis",
  description: "Default prompts for data analysis and evaluation",
  version: "1.0.0",
  isActive: true,
  category: "analysis",
  globalVariables: {},
  prompts: {
    cityEvaluation: {
      id: "analysis_city_eval",
      name: "City Evaluation",
      description: "Evaluate a city against client criteria",
      template: `Evaluate {{cityName}}, {{countryName}} as a potential relocation destination for this client.

Client Profile:
{{clientProfile}}

Evaluation Criteria (weighted):
{{criteria}}

Available Data:
{{cityData}}

Provide a structured evaluation covering:
1. Overall Match Score (0-100)
2. Category Scores (for each criterion)
3. Key Strengths (top 3)
4. Key Concerns (top 3)
5. Lifestyle Fit Analysis
6. Financial Feasibility
7. Recommendation Summary

Be specific and cite data points. Acknowledge uncertainty where data is limited.`,
      requiredVariables: ["cityName", "countryName", "clientProfile", "criteria", "cityData"],
      optionalVariables: [],
      defaults: {},
      exampleOutput: null,
      estimatedTokens: 500,
    },
    comparativeAnalysis: {
      id: "analysis_comparative",
      name: "Comparative Analysis",
      description: "Compare multiple cities",
      template: `Compare the following cities for this client:

Cities: {{cities}}

Client Profile:
{{clientProfile}}

For each city, you have already evaluated:
{{evaluations}}

Now provide a comparative analysis:
1. Ranked Recommendation (best to worst)
2. Side-by-side comparison table for key factors
3. Trade-offs between top 2 options
4. Scenario-based recommendations (e.g., "If career growth is priority... If family is priority...")
5. Final Verdict with confidence level`,
      requiredVariables: ["cities", "clientProfile", "evaluations"],
      optionalVariables: [],
      defaults: {},
      exampleOutput: null,
      estimatedTokens: 600,
    },
  },
};

export const DEFAULT_REPORTS_PACK: Omit<PromptPack, "id" | "tenantId" | "createdAt" | "updatedAt"> = {
  name: "Standard Reports",
  description: "Default prompts for report generation",
  version: "1.0.0",
  isActive: true,
  category: "reports",
  globalVariables: {},
  prompts: {
    executiveSummary: {
      id: "reports_exec_summary",
      name: "Executive Summary",
      description: "Generate executive summary for relocation report",
      template: `Generate an executive summary for {{clientName}}'s relocation report.

Assessment Summary:
{{assessmentSummary}}

Top Recommendation: {{topCity}}
Match Score: {{matchScore}}%

Key Findings:
{{keyFindings}}

Write a 2-3 paragraph executive summary that:
- Opens with the key recommendation
- Summarizes why this destination is ideal for the client
- Notes any important considerations or next steps
- Maintains a confident but balanced tone

Target length: 200-300 words.`,
      requiredVariables: ["clientName", "assessmentSummary", "topCity", "matchScore", "keyFindings"],
      optionalVariables: [],
      defaults: {},
      exampleOutput: null,
      estimatedTokens: 400,
    },
    neighborhoodProfile: {
      id: "reports_neighborhood",
      name: "Neighborhood Profile",
      description: "Generate detailed neighborhood profile",
      template: `Create a detailed neighborhood profile for {{neighborhoodName}} in {{cityName}}.

Available Data:
{{neighborhoodData}}

Client Preferences:
{{preferences}}

Generate a comprehensive profile covering:
1. Overview & Character (2-3 sentences)
2. Demographics & Community
3. Housing Market Summary
4. Walkability & Transit
5. Amenities & Lifestyle
6. Safety & Environment
7. Schools (if applicable)
8. Cost of Living Snapshot
9. Best For / Not Ideal For
10. Local Tips & Insights

Use specific data points. Be honest about limitations.`,
      requiredVariables: ["neighborhoodName", "cityName", "neighborhoodData", "preferences"],
      optionalVariables: [],
      defaults: {},
      exampleOutput: null,
      estimatedTokens: 600,
    },
  },
};

export const DEFAULT_COMPLIANCE_PACK: Omit<PromptPack, "id" | "tenantId" | "createdAt" | "updatedAt"> = {
  name: "Standard Compliance",
  description: "Compliance-specific prompts and disclosures",
  version: "1.0.0",
  isActive: true,
  category: "compliance",
  globalVariables: {},
  prompts: {
    fairHousingDisclosure: {
      id: "compliance_fair_housing",
      name: "Fair Housing Disclosure",
      description: "Required Fair Housing Act disclosure",
      template: `{{companyName}} is committed to fair housing principles. We do not discriminate based on race, color, religion, national origin, sex, familial status, or disability in accordance with the Fair Housing Act.

All neighborhood and community descriptions are based on publicly available data and are provided for informational purposes only. We encourage you to visit areas in person before making any decisions.`,
      requiredVariables: [],
      optionalVariables: ["companyName"],
      defaults: { companyName: "CLUES Intelligence" },
      exampleOutput: null,
      estimatedTokens: 80,
    },
    dataPrivacyNotice: {
      id: "compliance_privacy",
      name: "Data Privacy Notice",
      description: "GDPR/privacy disclosure for data collection",
      template: `Your privacy matters to us. The information you provide will be:
- Used solely for generating your personalized relocation assessment
- Stored securely with encryption
- Not shared with third parties without your consent
- Deletable upon request (Right to be Forgotten)

For full details, see our Privacy Policy at {{privacyUrl}}.

By continuing, you consent to this data collection. You can withdraw consent at any time.`,
      requiredVariables: [],
      optionalVariables: ["privacyUrl"],
      defaults: { privacyUrl: "[Privacy Policy URL]" },
      exampleOutput: null,
      estimatedTokens: 100,
    },
    investmentDisclaimer: {
      id: "compliance_investment",
      name: "Investment Disclaimer",
      description: "Disclaimer for financial/investment content",
      template: `IMPORTANT: The financial projections and property valuations provided are estimates based on current market data and historical trends. They are not guarantees of future performance.

This information does not constitute financial, investment, or legal advice. Real estate values can fluctuate, and past performance does not predict future results.

We recommend consulting with licensed professionals (real estate agents, financial advisors, attorneys) before making significant financial decisions.`,
      requiredVariables: [],
      optionalVariables: [],
      defaults: {},
      exampleOutput: null,
      estimatedTokens: 90,
    },
  },
};

// ─── Prompt Resolution ────────────────────────────────────────────────────────

/**
 * Get a prompt template by ID.
 */
export function getPromptTemplate(
  promptId: string,
  category?: PromptCategory
): PromptTemplate | null {
  const ctx = getTenantContext();

  // Check tenant-specific packs
  if (ctx) {
    for (const [key, pack] of promptPackRegistry.entries()) {
      if (!key.startsWith(ctx.tenant.id)) continue;
      if (category && pack.category !== category) continue;
      if (!pack.isActive) continue;

      const prompt = pack.prompts[promptId];
      if (prompt) return prompt;
    }
  }

  // Check default packs
  const defaultPacks = [DEFAULT_ONBOARDING_PACK, DEFAULT_ANALYSIS_PACK, DEFAULT_REPORTS_PACK, DEFAULT_COMPLIANCE_PACK];
  for (const pack of defaultPacks) {
    if (category && pack.category !== category) continue;
    const prompt = pack.prompts[promptId];
    if (prompt) return prompt;
  }

  return null;
}

/**
 * Get all prompts in a category.
 */
export function getPromptsByCategory(category: PromptCategory): PromptTemplate[] {
  const prompts: PromptTemplate[] = [];
  const seen = new Set<string>();

  const ctx = getTenantContext();

  // Tenant-specific first
  if (ctx) {
    for (const [key, pack] of promptPackRegistry.entries()) {
      if (!key.startsWith(ctx.tenant.id)) continue;
      if (pack.category !== category) continue;
      if (!pack.isActive) continue;

      for (const prompt of Object.values(pack.prompts)) {
        if (!seen.has(prompt.id)) {
          prompts.push(prompt);
          seen.add(prompt.id);
        }
      }
    }
  }

  // Then defaults
  const defaultPacks = [DEFAULT_ONBOARDING_PACK, DEFAULT_ANALYSIS_PACK, DEFAULT_REPORTS_PACK, DEFAULT_COMPLIANCE_PACK];
  for (const pack of defaultPacks) {
    if (pack.category !== category) continue;
    for (const prompt of Object.values(pack.prompts)) {
      if (!seen.has(prompt.id)) {
        prompts.push(prompt);
        seen.add(prompt.id);
      }
    }
  }

  return prompts;
}

/**
 * Render a prompt template with variables.
 */
export function renderPrompt(
  promptId: string,
  variables: Record<string, string>,
  category?: PromptCategory
): string {
  const template = getPromptTemplate(promptId, category);
  if (!template) {
    throw new Error(`Prompt template not found: ${promptId}`);
  }

  // Check required variables
  for (const required of template.requiredVariables) {
    if (!(required in variables)) {
      throw new Error(`Missing required variable: ${required}`);
    }
  }

  // Merge with defaults
  const allVars = { ...template.defaults, ...variables };

  // Get global variables from active packs
  const globalVars = getGlobalVariables();
  const mergedVars = { ...globalVars, ...allVars };

  // Render template
  let rendered = template.template;
  for (const [key, value] of Object.entries(mergedVars)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  return rendered;
}

function getGlobalVariables(): Record<string, string> {
  const ctx = getTenantContext();
  const vars: Record<string, string> = {};

  // Add tenant-specific globals
  if (ctx) {
    for (const [key, pack] of promptPackRegistry.entries()) {
      if (key.startsWith(ctx.tenant.id) && pack.isActive) {
        Object.assign(vars, pack.globalVariables);
      }
    }
  }

  // Add defaults
  Object.assign(vars, DEFAULT_ONBOARDING_PACK.globalVariables);

  return vars;
}

// ─── Prompt Pack CRUD ─────────────────────────────────────────────────────────

/**
 * Save a prompt pack.
 */
export async function savePromptPack(
  tenantId: string,
  input: Partial<Omit<PromptPack, "id" | "tenantId" | "createdAt" | "updatedAt">> & { name: string; category: PromptCategory }
): Promise<PromptPack> {
  const key = `${tenantId}:${input.category}:${input.name}`;
  const existing = promptPackRegistry.get(key);

  const pack: PromptPack = {
    id: existing?.id ?? crypto.randomUUID(),
    tenantId,
    name: input.name,
    description: input.description ?? existing?.description ?? "",
    version: input.version ?? existing?.version ?? "1.0.0",
    isActive: input.isActive ?? existing?.isActive ?? true,
    category: input.category,
    prompts: input.prompts ?? existing?.prompts ?? {},
    globalVariables: input.globalVariables ?? existing?.globalVariables ?? {},
    createdAt: existing?.createdAt ?? new Date(),
    updatedAt: new Date(),
  };

  promptPackRegistry.set(key, pack);
  return pack;
}

/**
 * Get all prompt packs for a tenant.
 */
export async function getPromptPacks(tenantId: string): Promise<PromptPack[]> {
  const packs: PromptPack[] = [];

  for (const [key, pack] of promptPackRegistry.entries()) {
    if (key.startsWith(`${tenantId}:`)) {
      packs.push(pack);
    }
  }

  return packs;
}

/**
 * Delete a prompt pack.
 */
export async function deletePromptPack(tenantId: string, category: PromptCategory, name: string): Promise<void> {
  const key = `${tenantId}:${category}:${name}`;
  promptPackRegistry.delete(key);
}

// In-memory registry (production: database)
const promptPackRegistry = new Map<string, PromptPack>();

// ─── Service Interface ────────────────────────────────────────────────────────

export interface PromptService {
  getTemplate(id: string, category?: PromptCategory): PromptTemplate | null;
  getByCategory(category: PromptCategory): PromptTemplate[];
  render(id: string, variables: Record<string, string>, category?: PromptCategory): string;
  savePack(tenantId: string, input: Partial<PromptPack> & { name: string; category: PromptCategory }): Promise<PromptPack>;
  getPacks(tenantId: string): Promise<PromptPack[]>;
  deletePack(tenantId: string, category: PromptCategory, name: string): Promise<void>;
}

export function getPromptService(): PromptService {
  return {
    getTemplate: getPromptTemplate,
    getByCategory: getPromptsByCategory,
    render: renderPrompt,
    savePack: savePromptPack,
    getPacks: getPromptPacks,
    deletePack: deletePromptPack,
  };
}
