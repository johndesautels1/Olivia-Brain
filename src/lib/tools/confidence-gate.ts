import { getApprovalGateService, RiskLevel, ApprovalGateConfig } from "./approval-gate";

// Confidence assessment result
export interface ConfidenceAssessment {
  score: number; // 0.0 to 1.0
  reasoning: string;
  factors: ConfidenceFactor[];
  recommendation: "proceed" | "review" | "block";
  riskLevel: RiskLevel;
}

// Individual confidence factor
export interface ConfidenceFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

// HITL gate decision
export interface HITLDecision {
  requiresHumanReview: boolean;
  autoApproved: boolean;
  pendingApprovalId?: string;
  confidence: ConfidenceAssessment;
  message: string;
}

// Configuration for confidence calculation
export interface ConfidenceConfig {
  // Weights for different factors (must sum to 1.0)
  weights: {
    intentClarity: number;
    parameterCompleteness: number;
    contextRelevance: number;
    historicalSuccess: number;
    userTrust: number;
  };
  // Thresholds for recommendations
  thresholds: {
    proceed: number; // >= this = proceed
    review: number;  // >= this = review, below = block
  };
}

const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  weights: {
    intentClarity: 0.25,
    parameterCompleteness: 0.20,
    contextRelevance: 0.20,
    historicalSuccess: 0.15,
    userTrust: 0.20,
  },
  thresholds: {
    proceed: 0.85,
    review: 0.50,
  },
};

// Calculate confidence score for a tool action
export function calculateConfidence(
  factors: {
    intentClarity?: number;      // How clear is the user's intent (0-1)
    parameterCompleteness?: number; // Are all required params provided (0-1)
    contextRelevance?: number;   // Is this action relevant to context (0-1)
    historicalSuccess?: number;  // Past success rate for this action (0-1)
    userTrust?: number;          // Trust level of the user/client (0-1)
  },
  config: ConfidenceConfig = DEFAULT_CONFIDENCE_CONFIG
): ConfidenceAssessment {
  const factorList: ConfidenceFactor[] = [];
  let totalScore = 0;

  // Intent clarity
  const intentClarity = factors.intentClarity ?? 0.7;
  factorList.push({
    name: "Intent Clarity",
    score: intentClarity,
    weight: config.weights.intentClarity,
    description: "How clearly the user's intent was understood",
  });
  totalScore += intentClarity * config.weights.intentClarity;

  // Parameter completeness
  const paramCompleteness = factors.parameterCompleteness ?? 0.8;
  factorList.push({
    name: "Parameter Completeness",
    score: paramCompleteness,
    weight: config.weights.parameterCompleteness,
    description: "Whether all required parameters are provided",
  });
  totalScore += paramCompleteness * config.weights.parameterCompleteness;

  // Context relevance
  const contextRelevance = factors.contextRelevance ?? 0.7;
  factorList.push({
    name: "Context Relevance",
    score: contextRelevance,
    weight: config.weights.contextRelevance,
    description: "How relevant this action is to the current context",
  });
  totalScore += contextRelevance * config.weights.contextRelevance;

  // Historical success
  const historicalSuccess = factors.historicalSuccess ?? 0.8;
  factorList.push({
    name: "Historical Success",
    score: historicalSuccess,
    weight: config.weights.historicalSuccess,
    description: "Past success rate for similar actions",
  });
  totalScore += historicalSuccess * config.weights.historicalSuccess;

  // User trust
  const userTrust = factors.userTrust ?? 0.7;
  factorList.push({
    name: "User Trust Level",
    score: userTrust,
    weight: config.weights.userTrust,
    description: "Trust level based on user history and permissions",
  });
  totalScore += userTrust * config.weights.userTrust;

  // Determine recommendation
  let recommendation: "proceed" | "review" | "block";
  if (totalScore >= config.thresholds.proceed) {
    recommendation = "proceed";
  } else if (totalScore >= config.thresholds.review) {
    recommendation = "review";
  } else {
    recommendation = "block";
  }

  // Determine risk level based on score
  let riskLevel: RiskLevel;
  if (totalScore >= 0.9) {
    riskLevel = "low";
  } else if (totalScore >= 0.7) {
    riskLevel = "medium";
  } else if (totalScore >= 0.5) {
    riskLevel = "high";
  } else {
    riskLevel = "critical";
  }

  // Generate reasoning
  const lowFactors = factorList.filter((f) => f.score < 0.6);
  let reasoning = `Overall confidence: ${(totalScore * 100).toFixed(1)}%.`;
  if (lowFactors.length > 0) {
    reasoning += ` Low confidence in: ${lowFactors.map((f) => f.name).join(", ")}.`;
  }

  return {
    score: totalScore,
    reasoning,
    factors: factorList,
    recommendation,
    riskLevel,
  };
}

// HITL gate - determines if human review is needed
export async function evaluateHITLGate(
  toolName: string,
  actionName: string,
  params: Record<string, unknown>,
  confidenceFactors: Parameters<typeof calculateConfidence>[0],
  context: {
    requestedBy: string;
    clientId?: string;
    conversationId?: string;
    amount?: number; // For financial actions
  }
): Promise<HITLDecision> {
  const approvalService = getApprovalGateService();
  const confidence = calculateConfidence(confidenceFactors);

  // Get gate configuration for this tool/action
  const gateConfig = approvalService.getGateConfig(toolName, actionName);

  // If no gate configured, use default behavior based on confidence
  if (!gateConfig) {
    if (confidence.recommendation === "proceed") {
      return {
        requiresHumanReview: false,
        autoApproved: true,
        confidence,
        message: "No approval gate configured. Auto-approved based on high confidence.",
      };
    } else if (confidence.recommendation === "review") {
      return {
        requiresHumanReview: true,
        autoApproved: false,
        confidence,
        message: "Medium confidence. Human review recommended.",
      };
    } else {
      return {
        requiresHumanReview: true,
        autoApproved: false,
        confidence,
        message: "Low confidence. Action blocked pending human review.",
      };
    }
  }

  // Check if auto-approval is possible
  const canAutoApprove = approvalService.shouldAutoApprove(
    gateConfig,
    confidence.score,
    context.amount
  );

  if (canAutoApprove) {
    return {
      requiresHumanReview: false,
      autoApproved: true,
      confidence,
      message: `Auto-approved. Confidence (${(confidence.score * 100).toFixed(1)}%) meets threshold.`,
    };
  }

  // Create pending approval request
  const pendingApproval = await approvalService.createPendingApproval({
    toolName,
    actionName,
    params,
    riskLevel: gateConfig.riskLevel,
    confidenceScore: confidence.score,
    reasoning: confidence.reasoning,
    requestedBy: context.requestedBy,
    clientId: context.clientId,
    conversationId: context.conversationId,
  });

  return {
    requiresHumanReview: true,
    autoApproved: false,
    pendingApprovalId: pendingApproval.id,
    confidence,
    message: `Requires approval. Risk level: ${gateConfig.riskLevel}. Approval ID: ${pendingApproval.id}`,
  };
}

// Wait for approval with timeout
export async function waitForApproval(
  approvalId: string,
  timeoutMs: number = 30000
): Promise<{ approved: boolean; message: string }> {
  const approvalService = getApprovalGateService();
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const approval = await approvalService.checkApproval(approvalId);

    if (!approval) {
      return { approved: false, message: "Approval not found" };
    }

    if (approval.status === "approved") {
      return {
        approved: true,
        message: approval.resolutionNote ?? "Approved",
      };
    }

    if (approval.status === "rejected") {
      return {
        approved: false,
        message: approval.resolutionNote ?? "Rejected",
      };
    }

    if (approval.status === "expired") {
      return { approved: false, message: "Approval request expired" };
    }

    // Wait before checking again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { approved: false, message: "Approval timeout" };
}
