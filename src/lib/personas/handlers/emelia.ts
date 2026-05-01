/**
 * Emelia™ Handler
 * Sprint 4.1 — Persona Orchestration Layer
 *
 * Specialized handler for Emelia™ - Back-End Support Beast.
 * Customer service, tech support, full architecture knowledge.
 * NO VIDEO - voice and text only.
 */

import type { PersonaInvocation, PersonaResponse, ConversationTurn } from "../types";
import { getActivePersona, invokePersona } from "../orchestrator";

/**
 * Support categories Emelia handles.
 */
export type SupportCategory =
  | "technical_issue"
  | "account_management"
  | "billing"
  | "feature_request"
  | "bug_report"
  | "how_to"
  | "data_request"
  | "escalation"
  | "general";

/**
 * Support ticket priority levels.
 */
export type TicketPriority = "low" | "normal" | "high" | "urgent";

/**
 * Support ticket structure.
 */
export interface SupportTicket {
  id: string;
  category: SupportCategory;
  priority: TicketPriority;
  subject: string;
  description: string;
  clientId: string;
  tenantId: string | null;
  status: "open" | "in_progress" | "pending_customer" | "resolved" | "escalated";
  assignee: "emelia" | "human" | null;
  createdAt: Date;
  updatedAt: Date;
  resolution: string | null;
  conversationHistory: ConversationTurn[];
}

/**
 * Classify the support category from user input.
 */
export function classifySupportCategory(input: string): SupportCategory {
  const lower = input.toLowerCase();

  // Technical issues
  if (
    lower.includes("error") ||
    lower.includes("bug") ||
    lower.includes("broken") ||
    lower.includes("not working") ||
    lower.includes("crash") ||
    lower.includes("fail")
  ) {
    return "technical_issue";
  }

  // Account management
  if (
    lower.includes("account") ||
    lower.includes("password") ||
    lower.includes("login") ||
    lower.includes("access") ||
    lower.includes("permission") ||
    lower.includes("user")
  ) {
    return "account_management";
  }

  // Billing
  if (
    lower.includes("bill") ||
    lower.includes("payment") ||
    lower.includes("invoice") ||
    lower.includes("charge") ||
    lower.includes("subscription") ||
    lower.includes("price") ||
    lower.includes("cost")
  ) {
    return "billing";
  }

  // Feature requests
  if (
    lower.includes("feature") ||
    lower.includes("add") ||
    lower.includes("would be nice") ||
    lower.includes("suggestion") ||
    lower.includes("improve") ||
    lower.includes("enhancement")
  ) {
    return "feature_request";
  }

  // Bug reports
  if (lower.includes("bug") || lower.includes("issue") || lower.includes("report")) {
    return "bug_report";
  }

  // How-to
  if (
    lower.includes("how do i") ||
    lower.includes("how to") ||
    lower.includes("can i") ||
    lower.includes("help me") ||
    lower.includes("guide") ||
    lower.includes("tutorial")
  ) {
    return "how_to";
  }

  // Data requests (GDPR, export, etc.)
  if (
    lower.includes("data") ||
    lower.includes("export") ||
    lower.includes("download") ||
    lower.includes("gdpr") ||
    lower.includes("delete my") ||
    lower.includes("privacy")
  ) {
    return "data_request";
  }

  // Escalation triggers
  if (
    lower.includes("manager") ||
    lower.includes("supervisor") ||
    lower.includes("escalate") ||
    lower.includes("human") ||
    lower.includes("real person") ||
    lower.includes("speak to")
  ) {
    return "escalation";
  }

  return "general";
}

/**
 * Determine ticket priority based on content and context.
 */
export function determinePriority(
  category: SupportCategory,
  input: string,
  _context: ConversationTurn[]
): TicketPriority {
  const lower = input.toLowerCase();

  // Urgent keywords
  if (
    lower.includes("urgent") ||
    lower.includes("emergency") ||
    lower.includes("asap") ||
    lower.includes("immediately") ||
    lower.includes("critical")
  ) {
    return "urgent";
  }

  // High priority categories
  if (category === "billing" && lower.includes("wrong")) {
    return "high";
  }
  if (category === "technical_issue" && lower.includes("can't access")) {
    return "high";
  }
  if (category === "escalation") {
    return "high";
  }

  // Normal by default
  return "normal";
}

/**
 * Check if the issue should be escalated to a human.
 */
export function shouldEscalate(category: SupportCategory, sentiment: number, turnCount: number): boolean {
  // Always escalate explicit escalation requests
  if (category === "escalation") {
    return true;
  }

  // Escalate if sentiment is very negative
  if (sentiment < -0.7) {
    return true;
  }

  // Escalate long conversations that seem stuck
  if (turnCount > 10) {
    return true;
  }

  // Escalate sensitive data requests
  if (category === "data_request") {
    return true; // GDPR requests often need human verification
  }

  return false;
}

/**
 * Get the appropriate initial response for a support category.
 */
export function getInitialResponse(category: SupportCategory): string {
  switch (category) {
    case "technical_issue":
      return `I understand you're experiencing a technical issue. I'm here to help troubleshoot and resolve this as quickly as possible.

Could you please provide:
1. What specifically isn't working as expected?
2. When did this issue start?
3. Any error messages you're seeing?

This will help me diagnose the problem accurately.`;

    case "account_management":
      return `I can help you with your account. For security, I may need to verify some details.

What would you like to do with your account today?
- Reset password
- Update profile information
- Manage permissions
- Something else?`;

    case "billing":
      return `I understand you have a billing question. I'm happy to help clarify any charges or assist with your subscription.

What specific billing matter can I help you with?`;

    case "feature_request":
      return `Thank you for your feedback! I appreciate you taking the time to share your suggestions.

Could you tell me more about:
1. What feature you'd like to see
2. How it would help you
3. Any specific use case

I'll make sure this gets logged for our product team.`;

    case "bug_report":
      return `Thank you for reporting this issue. Bug reports help us improve the platform.

To investigate properly, I'll need:
1. Steps to reproduce the issue
2. What you expected to happen
3. What actually happened
4. Your browser/device if relevant

Let's start with step 1 - what were you trying to do when this occurred?`;

    case "how_to":
      return `I'd be happy to help you learn how to use our platform.

What would you like to know how to do? I can provide step-by-step guidance.`;

    case "data_request":
      return `I understand you have a data-related request. We take data privacy seriously and I'm here to help.

Please note: For certain data requests (exports, deletions, GDPR requests), I may need to verify your identity and involve a human team member for security.

What data action would you like to take?`;

    case "escalation":
      return `I understand you'd like to speak with a human team member. I'll arrange that for you.

Before I do, is there anything specific you'd like me to note about your concern so they have full context?`;

    default:
      return `Hello! I'm Emelia, your technical support specialist. I'm here to help with any questions or issues you have.

How can I assist you today?`;
  }
}

/**
 * Invoke Emelia for support interaction.
 */
export async function invokeEmelia(
  input: string,
  context: ConversationTurn[],
  options: {
    sessionId: string;
    clientId: string;
    tenantId: string | null;
    outputModalities: ("text" | "audio")[];
    metadata?: Record<string, unknown>;
  }
): Promise<PersonaResponse> {
  const category = classifySupportCategory(input);
  const priority = determinePriority(category, input, context);

  // Check for escalation
  const needsEscalation = shouldEscalate(category, 0, context.length);

  const enhancedContext = {
    recentTurns: context,
    memories: [],
    knowledgeContext: null,
    emotionalContext: needsEscalation ? "concerned" : "helpful",
    metadata: {
      category,
      priority,
      needsEscalation,
      ...options.metadata,
    },
  };

  const invocation: PersonaInvocation = {
    personaId: "emelia",
    input,
    context: enhancedContext,
    outputModalities: options.outputModalities,
    sessionId: options.sessionId,
    clientId: options.clientId,
    tenantId: options.tenantId,
  };

  return invokePersona(invocation);
}

/**
 * Create a support ticket from conversation.
 */
export function createSupportTicket(
  subject: string,
  description: string,
  category: SupportCategory,
  context: ConversationTurn[],
  session: { clientId: string; tenantId: string | null }
): SupportTicket {
  const priority = determinePriority(category, description, context);

  return {
    id: crypto.randomUUID(),
    category,
    priority,
    subject,
    description,
    clientId: session.clientId,
    tenantId: session.tenantId,
    status: "open",
    assignee: "emelia",
    createdAt: new Date(),
    updatedAt: new Date(),
    resolution: null,
    conversationHistory: context,
  };
}

/**
 * Knowledge base search for Emelia.
 */
export async function searchKnowledgeBase(
  query: string,
  _category: SupportCategory
): Promise<
  Array<{
    title: string;
    content: string;
    relevance: number;
    articleId: string;
  }>
> {
  // In production, this would search a knowledge base
  // For now, return placeholder
  console.log(`[Emelia] Searching knowledge base for: ${query}`);

  return [
    {
      title: "Getting Started Guide",
      content: "This guide covers the basics of using the platform...",
      relevance: 0.85,
      articleId: "kb-001",
    },
  ];
}

/**
 * Generate troubleshooting steps for a technical issue.
 */
export async function generateTroubleshootingSteps(
  issueDescription: string,
  _context: ConversationTurn[]
): Promise<string[]> {
  // In production, this would use LLM to generate contextual steps
  // For now, return generic steps
  console.log(`[Emelia] Generating troubleshooting steps for: ${issueDescription}`);

  return [
    "Clear your browser cache and cookies",
    "Try using an incognito/private browsing window",
    "Check if the issue occurs on a different browser",
    "Ensure your browser is up to date",
    "If the issue persists, please share a screenshot or error message",
  ];
}

/**
 * Check system status for support context.
 */
export async function checkSystemStatus(): Promise<{
  overall: "operational" | "degraded" | "outage";
  components: Array<{
    name: string;
    status: "operational" | "degraded" | "outage";
    message: string | null;
  }>;
  lastChecked: Date;
}> {
  // In production, this would check actual system status
  return {
    overall: "operational",
    components: [
      { name: "API", status: "operational", message: null },
      { name: "Database", status: "operational", message: null },
      { name: "Avatar Service", status: "operational", message: null },
      { name: "Voice Service", status: "operational", message: null },
    ],
    lastChecked: new Date(),
  };
}
