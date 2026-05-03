// src/lib/olivia/voice-prompts.ts
// LLM prompts for Olivia's bi-directional voice conversations
// These prompts are used during live calls for response generation
// and post-call for data extraction

/**
 * Main conversation prompt - used during live calls
 * Returns JSON with response text + extracted entities
 */
export function buildConversationPrompt(params: {
  transcript: string;
  extractedSoFar: Record<string, unknown>;
  callerInfo?: { phone: string; name?: string; company?: string };
  conversationType?: string;
  previousCallsContext?: string;
}): string {
  const { transcript, extractedSoFar, callerInfo, conversationType, previousCallsContext } = params;

  const callerSection = callerInfo
    ? `
CALLER INFO (if known):
- Phone: ${callerInfo.phone}
${callerInfo.name ? `- Name: ${callerInfo.name}` : ""}
${callerInfo.company ? `- Company: ${callerInfo.company}` : ""}
`
    : "";

  const previousCallsSection = previousCallsContext || "";

  return `You are Olivia, Chief of Staff at London Tech Map. You're on a live phone call.
${previousCallsSection}

CONVERSATION TYPE: ${conversationType || "general"}

CURRENT CONVERSATION:
${transcript || "[Call just started - no speech yet]"}

EXTRACTED SO FAR:
${JSON.stringify(extractedSoFar, null, 2)}
${callerSection}
YOUR TASKS:
1. Respond naturally and professionally (British English, London voice)
2. Extract any new information mentioned (names, emails, dates, companies, needs)
3. Detect the caller's intent
4. Guide toward collecting needed information without being pushy
5. Keep responses concise (this is a phone conversation - 1-3 sentences max)

INFORMATION TO COLLECT (when appropriate):
- Contact: name, email, phone, company, role
- Demographics: location, industry
- Psychographics: needs, goals, pain points
- If scheduling: date, time, location/Zoom, purpose

RESPONSE GUIDELINES:
- If this is the start of the call, greet warmly: "Hello, this is Olivia from London Tech Map. How can I help you today?"
- If they mention scheduling, confirm details
- If they're dictating, acknowledge and prompt for more if they pause
- If it's a quick action, confirm the action item clearly
- Always maintain a helpful, professional tone

Respond in this exact JSON format:
{
  "response": "What Olivia should say next (1-3 sentences, natural speech)",
  "entities": {
    "name": "extracted name or null",
    "email": "extracted email or null",
    "company": "extracted company or null",
    "role": "extracted role or null",
    "location": "extracted location or null",
    "industry": "extracted industry or null",
    "needs": ["any mentioned needs"],
    "goals": ["any mentioned goals"],
    "painPoints": ["any mentioned pain points"],
    "appointmentDate": "mentioned date or null",
    "appointmentTime": "mentioned time or null",
    "appointmentPurpose": "purpose if scheduling"
  },
  "intent": "intake|dictation|quick_action|scheduling|question|follow_up|general|goodbye",
  "shouldEndCall": false,
  "actionItems": [
    { "action": "what needs to be done", "assignedTo": "olivia|user|name", "dueDate": "if mentioned", "priority": "low|medium|high|urgent" }
  ]
}`;
}

/**
 * Post-call extraction prompt - comprehensive data extraction from full transcript
 */
export function buildExtractionPrompt(transcript: string): string {
  return `Extract ALL structured data from this voice conversation transcript between Olivia (London Tech Map Chief of Staff) and a caller.

FULL TRANSCRIPT:
${transcript}

Extract everything into this exact JSON structure. Use null for fields not mentioned, empty arrays [] for lists with no items:

{
  "contact": {
    "firstName": "string or null",
    "lastName": "string or null",
    "fullName": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "company": "string or null",
    "role": "string or null",
    "location": "string or null",
    "industry": "string or null",
    "companySize": "1-10|11-50|51-200|201-500|500+ or null"
  },
  "psychographics": {
    "needs": ["list of mentioned needs/requirements"],
    "interests": ["topics they showed interest in"],
    "goals": ["what they want to achieve"],
    "painPoints": ["challenges or problems mentioned"],
    "communicationStyle": "formal|casual|technical|concise or null"
  },
  "appointment": {
    "requested": true/false,
    "dateTime": "ISO format or null",
    "dateDescription": "natural language date if unclear, e.g. 'next Tuesday at 2pm'",
    "location": "physical location or null",
    "isZoom": true/false,
    "zoomLink": "if provided",
    "purpose": "meeting purpose"
  },
  "actionItems": [
    {
      "action": "what needs to be done",
      "assignedTo": "olivia|user|specific name",
      "dueDate": "ISO format or null",
      "dueDateDescription": "natural language if unclear",
      "priority": "low|medium|high|urgent"
    }
  ],
  "conversationType": "intake|dictation|quick_action|follow_up|scheduling|question|general",
  "summary": "2-3 sentence summary of the call",
  "keyTopics": ["main topics discussed"],
  "sentiment": "positive|neutral|negative|mixed",
  "followUpNeeded": true/false,
  "followUpReason": "why follow-up is needed, or null",
  "nextBestAction": "recommended next step"
}

Be thorough - capture everything mentioned. If a date/time is mentioned in natural language (e.g., "next Tuesday"), include it in the description fields even if you can't convert to ISO format.`;
}

/**
 * Quick action detection prompt - for 30-second bullet calls
 */
export function buildQuickActionPrompt(transcript: string): string {
  return `This is a quick action call. Extract the action item(s) from this brief transcript.

TRANSCRIPT:
${transcript}

Return JSON:
{
  "actions": [
    {
      "action": "what needs to be done - be specific",
      "assignedTo": "olivia|user|specific name",
      "dueDate": "ISO format or null",
      "dueDateNatural": "natural language date",
      "priority": "low|medium|high|urgent",
      "context": "any relevant context"
    }
  ],
  "confirmationMessage": "What Olivia should say to confirm (1 sentence)",
  "needsClarification": false,
  "clarificationQuestion": "question to ask if unclear"
}`;
}

/**
 * Intent classification prompt - fast classification for routing
 */
export function buildIntentPrompt(latestUtterance: string): string {
  return `Classify the intent of this phone utterance in one word.

UTTERANCE: "${latestUtterance}"

Choose exactly one: intake | dictation | quick_action | scheduling | question | goodbye | unclear

Just respond with the single word, nothing else.`;
}

/**
 * Greeting variations for Olivia
 */
export const OLIVIA_GREETINGS = {
  inbound: "Hello, this is Olivia from London Tech Map. How can I help you today?",
  outbound: "Hello, this is Olivia calling from London Tech Map.",
  quickAction: "Hi, this is Olivia. What can I help you with?",
  followUp: "Hello, this is Olivia from London Tech Map. I'm calling to follow up on our previous conversation.",
};

/**
 * Error/fallback responses
 */
export const OLIVIA_FALLBACKS = {
  didNotHear: "I'm sorry, I didn't quite catch that. Could you repeat that please?",
  technicalIssue: "I apologise, we're having a slight technical difficulty. Let me try that again.",
  goodbye: "Thank you for calling London Tech Map. Have a wonderful day!",
  holdOn: "Let me just make a note of that.",
  confirm: "Got it, I've noted that down.",
};

// ═══════════════════════════════════════════════════════════════════════════
// Quick Action Detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect if utterance is a quick action request (30-second bullet)
 * Returns classification and extracted parts if applicable
 */
export function buildQuickActionDetectionPrompt(utterance: string): string {
  return `Analyze this phone utterance and determine if it's a quick action request.

UTTERANCE: "${utterance}"

Quick actions are brief requests like:
- "Remind [person] to [task] by [date]"
- "Schedule a call with [person] for [date/time]"
- "Send [person] a message about [topic]"
- "Note that [fact or reminder]"
- "Add [task] to my to-do list"
- "Check if we have info on [company/person]"

Respond with this exact JSON:
{
  "isQuickAction": true/false,
  "confidence": 0.0-1.0,
  "actionType": "reminder|schedule|message|note|todo|query|other",
  "extracted": {
    "targetPerson": "who the action is for (or null)",
    "task": "what needs to be done (or null)",
    "dueDate": "when (natural language or null)",
    "subject": "topic/subject if applicable (or null)"
  },
  "needsClarification": true/false,
  "missingInfo": ["list of what's unclear or missing"]
}`;
}

/**
 * Quick action patterns for fast detection (regex-based, no LLM needed)
 */
export const QUICK_ACTION_PATTERNS = [
  /^remind\s+/i,
  /^schedule\s+/i,
  /^book\s+/i,
  /^send\s+/i,
  /^note\s+that/i,
  /^add\s+.+\s+to\s+(my\s+)?(to-?do|list)/i,
  /^check\s+if/i,
  /^do\s+we\s+have/i,
  /^can\s+you\s+remind/i,
  /^please\s+remind/i,
  /^make\s+a\s+note/i,
  /^set\s+a\s+reminder/i,
];

/**
 * Fast check if utterance matches quick action pattern (no LLM call)
 */
export function isLikelyQuickAction(utterance: string): boolean {
  const trimmed = utterance.trim();
  return QUICK_ACTION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Quick action confirmation templates
 */
export const QUICK_ACTION_CONFIRMATIONS = {
  reminder: "Got it. I'll remind {target} to {task}{duePhrase}. Is that correct?",
  reminderConfirmed: "Perfect, that reminder is set. Anything else?",
  schedule: "I'll schedule that for {date}. Is that correct?",
  scheduleConfirmed: "Done, it's in the calendar. Anything else?",
  note: "I've noted that down. Anything else?",
  todo: "Added to your to-do list. Anything else?",
  query: "Let me check on that for you.",
  done: "All done! Have a great day.",
  clarify: "Just to make sure I got that right - {question}",
};

// ═══════════════════════════════════════════════════════════════════════════
// Dictation Mode
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect if caller wants to enter dictation mode
 */
export function buildDictationDetectionPrompt(utterance: string): string {
  return `Analyze if the caller wants to dictate a long-form message or document.

UTTERANCE: "${utterance}"

Dictation triggers include:
- "I want to dictate something"
- "Take this down"
- "I have a long message"
- "Let me dictate a proposal/email/note"
- "Record this" (followed by content)
- Long, continuous speech that sounds like a message or document

Respond with this exact JSON:
{
  "wantsDictation": true/false,
  "confidence": 0.0-1.0,
  "contentType": "proposal|email|notes|memo|idea|general|unknown",
  "hasStartedDictating": true/false,
  "initialContent": "any dictated content so far, or null"
}`;
}

/**
 * Dictation mode prompts
 */
export const DICTATION_PROMPTS = {
  ready: "I'm ready to take your dictation. Go ahead whenever you're ready.",
  continue: "Got it. Please continue when you're ready.",
  pause: "Take your time. Let me know when you'd like to continue.",
  clarify: "Would you like me to read that back to you?",
  done: "I've got all of that recorded. Would you like me to summarise it?",
  summarise: "Here's a summary: {summary}. Shall I save this?",
  saved: "Your dictation has been saved. I'll process it for you. Anything else?",
};
