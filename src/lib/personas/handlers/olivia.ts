/**
 * Olivia™ Handler
 * Sprint 4.1 — Persona Orchestration Layer
 *
 * Specialized handler for Olivia™ - Client-Facing Executive Avatar.
 * Manages bilateral communication, assessments, and client interactions.
 */

import type { PersonaInvocation, PersonaResponse, ConversationTurn } from "../types";
import { getActivePersona, invokePersona } from "../orchestrator";

/**
 * Intent categories for Olivia interactions.
 */
export type OliviaIntent =
  | "greeting"
  | "assessment"
  | "city_inquiry"
  | "report_request"
  | "clarification"
  | "general_question"
  | "scheduling"
  | "follow_up";

/**
 * Classify the intent of a user message for Olivia.
 */
export function classifyOliviaIntent(input: string, context: ConversationTurn[]): OliviaIntent {
  const lower = input.toLowerCase();

  // Check for greeting
  if (context.length === 0 || isGreeting(lower)) {
    return "greeting";
  }

  // Assessment-related
  if (
    lower.includes("assessment") ||
    lower.includes("questionnaire") ||
    lower.includes("profile") ||
    lower.includes("start") ||
    lower.includes("begin")
  ) {
    return "assessment";
  }

  // City inquiries
  if (
    lower.includes("city") ||
    lower.includes("location") ||
    lower.includes("where should i") ||
    lower.includes("best place") ||
    lower.includes("recommend") ||
    lower.includes("compare")
  ) {
    return "city_inquiry";
  }

  // Report requests
  if (
    lower.includes("report") ||
    lower.includes("pdf") ||
    lower.includes("document") ||
    lower.includes("send me") ||
    lower.includes("email me")
  ) {
    return "report_request";
  }

  // Scheduling
  if (
    lower.includes("schedule") ||
    lower.includes("calendar") ||
    lower.includes("meeting") ||
    lower.includes("appointment") ||
    lower.includes("call")
  ) {
    return "scheduling";
  }

  // Follow-up to previous interaction
  if (
    lower.includes("what about") ||
    lower.includes("also") ||
    lower.includes("and") ||
    lower.includes("more")
  ) {
    return "follow_up";
  }

  // Default to general question
  return "general_question";
}

function isGreeting(text: string): boolean {
  const greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "greetings"];
  return greetings.some((g) => text.startsWith(g) || text === g);
}

/**
 * Get a contextual greeting based on time of day and user history.
 */
export function getOliviaGreeting(
  isReturningUser: boolean,
  userName?: string,
  timeOfDay?: "morning" | "afternoon" | "evening"
): string {
  const timeGreeting =
    timeOfDay === "morning"
      ? "Good morning"
      : timeOfDay === "evening"
        ? "Good evening"
        : timeOfDay === "afternoon"
          ? "Good afternoon"
          : "Hello";

  if (isReturningUser && userName) {
    return `${timeGreeting}, ${userName}! Welcome back. How can I help you today?`;
  }

  if (isReturningUser) {
    return `${timeGreeting}! Good to see you again. What would you like to explore today?`;
  }

  return `${timeGreeting}! I'm Olivia, your AI relocation advisor. I'm here to help you find your perfect place to live, work, and thrive. How can I assist you today?`;
}

/**
 * Enhance Olivia's response with appropriate emotional cues.
 */
export function selectOliviaEmotion(
  intent: OliviaIntent,
  sentiment: "positive" | "neutral" | "negative"
): string {
  switch (intent) {
    case "greeting":
      return "welcoming";
    case "assessment":
      return sentiment === "negative" ? "empathetic" : "confident";
    case "city_inquiry":
      return "thoughtful";
    case "report_request":
      return "confident";
    case "scheduling":
      return "helpful";
    case "follow_up":
      return sentiment === "positive" ? "happy" : "thoughtful";
    default:
      return "neutral";
  }
}

/**
 * Invoke Olivia with intent-aware processing.
 */
export async function invokeOlivia(
  input: string,
  context: ConversationTurn[],
  options: {
    sessionId: string;
    clientId: string;
    tenantId: string | null;
    outputModalities: ("text" | "audio" | "video" | "avatar_session")[];
    metadata?: Record<string, unknown>;
  }
): Promise<PersonaResponse> {
  const intent = classifyOliviaIntent(input, context);
  const persona = getActivePersona("olivia");

  // Build enhanced context with intent
  const enhancedContext = {
    recentTurns: context,
    memories: [],
    knowledgeContext: null,
    emotionalContext: selectOliviaEmotion(intent, "neutral"),
    metadata: {
      intent,
      ...options.metadata,
    },
  };

  const invocation: PersonaInvocation = {
    personaId: "olivia",
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
 * Handle assessment flow with Olivia.
 */
export async function handleOliviaAssessment(
  stage: "intro" | "module" | "transition" | "complete",
  data: {
    moduleName?: string;
    progress?: number;
    sessionId: string;
    clientId: string;
    tenantId: string | null;
  }
): Promise<string> {
  switch (stage) {
    case "intro":
      return `I'd like to learn more about you through a personalized assessment. This will help me understand your priorities, preferences, and what truly matters to you when it comes to finding your ideal location.

The assessment covers several areas including your lifestyle, career, family considerations, and more. It takes about 15-20 minutes, and you can save your progress at any time.

Ready to get started?`;

    case "module":
      return `Let's explore ${data.moduleName}. I'll ask you a series of questions to understand your preferences in this area. Take your time with each response - your thoughtful answers help me provide better recommendations.`;

    case "transition":
      return `Excellent work! You've completed ${data.progress}% of the assessment. Based on what you've shared so far, I'm already identifying some interesting patterns. Let's continue to the next section.`;

    case "complete":
      return `Congratulations! You've completed the full assessment. I now have a comprehensive understanding of your preferences and priorities.

I'm analyzing your responses against our database of cities and neighborhoods to find your best matches. This typically takes a few minutes.

Would you like me to send you a preliminary report while I prepare the full analysis, or would you prefer to wait for the complete results?`;

    default:
      return "Let's continue with your assessment.";
  }
}
