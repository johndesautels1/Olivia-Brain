/**
 * RAG Accuracy Scoring (Ragas-style)
 * Evaluates retrieval-augmented generation quality
 */

export interface RAGContext {
  id: string;
  content: string;
  source?: string;
  score?: number;
}

export interface RAGEvaluationInput {
  question: string;
  answer: string;
  contexts: RAGContext[];
  groundTruth?: string;
}

export interface RAGMetric {
  name: string;
  score: number; // 0-1
  explanation: string;
}

export interface RAGEvaluationResult {
  overallScore: number;
  metrics: RAGMetric[];
  recommendation: string;
  qualityLevel: "poor" | "fair" | "good" | "excellent";
}

// Calculate context relevance - how relevant are retrieved contexts to the question
function calculateContextRelevance(question: string, contexts: RAGContext[]): RAGMetric {
  if (contexts.length === 0) {
    return {
      name: "Context Relevance",
      score: 0,
      explanation: "No contexts provided for evaluation",
    };
  }

  const questionWords = new Set(
    question.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );

  let totalRelevance = 0;
  for (const context of contexts) {
    const contextWords = new Set(
      context.content.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    );

    const overlap = [...questionWords].filter((w) => contextWords.has(w)).length;
    const relevance = questionWords.size > 0 ? overlap / questionWords.size : 0;
    totalRelevance += relevance;
  }

  const avgRelevance = totalRelevance / contexts.length;

  return {
    name: "Context Relevance",
    score: Math.min(1, avgRelevance * 1.5), // Scale up slightly
    explanation: `Average word overlap between question and contexts: ${(avgRelevance * 100).toFixed(1)}%`,
  };
}

// Calculate faithfulness - is the answer grounded in the contexts
function calculateFaithfulness(answer: string, contexts: RAGContext[]): RAGMetric {
  if (contexts.length === 0) {
    return {
      name: "Faithfulness",
      score: 0,
      explanation: "No contexts to verify answer against",
    };
  }

  const answerSentences = answer.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  if (answerSentences.length === 0) {
    return {
      name: "Faithfulness",
      score: 0.5,
      explanation: "Answer too short for detailed faithfulness analysis",
    };
  }

  const allContextText = contexts.map((c) => c.content.toLowerCase()).join(" ");
  let groundedSentences = 0;

  for (const sentence of answerSentences) {
    const sentenceWords = sentence.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const matchCount = sentenceWords.filter((w) => allContextText.includes(w)).length;
    const matchRatio = sentenceWords.length > 0 ? matchCount / sentenceWords.length : 0;

    if (matchRatio > 0.3) {
      groundedSentences++;
    }
  }

  const faithfulnessScore = groundedSentences / answerSentences.length;

  return {
    name: "Faithfulness",
    score: faithfulnessScore,
    explanation: `${groundedSentences}/${answerSentences.length} sentences appear grounded in context`,
  };
}

// Calculate answer relevance - does the answer address the question
function calculateAnswerRelevance(question: string, answer: string): RAGMetric {
  const questionWords = new Set(
    question.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );
  const answerWords = new Set(
    answer.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );

  const overlap = [...questionWords].filter((w) => answerWords.has(w)).length;
  const relevance = questionWords.size > 0 ? overlap / questionWords.size : 0;

  // Bonus for answer length (longer answers tend to be more complete)
  const lengthBonus = Math.min(0.2, answer.length / 1000);

  const finalScore = Math.min(1, relevance + lengthBonus);

  return {
    name: "Answer Relevance",
    score: finalScore,
    explanation: `Answer addresses ${(relevance * 100).toFixed(1)}% of question terms`,
  };
}

// Calculate context precision - are the top contexts most relevant
function calculateContextPrecision(question: string, contexts: RAGContext[]): RAGMetric {
  if (contexts.length < 2) {
    return {
      name: "Context Precision",
      score: 1,
      explanation: "Not enough contexts to evaluate precision ranking",
    };
  }

  const questionWords = new Set(
    question.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );

  const relevanceScores = contexts.map((context) => {
    const contextWords = new Set(
      context.content.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    );
    const overlap = [...questionWords].filter((w) => contextWords.has(w)).length;
    return questionWords.size > 0 ? overlap / questionWords.size : 0;
  });

  // Check if more relevant contexts are ranked higher
  let inversions = 0;
  let comparisons = 0;
  for (let i = 0; i < relevanceScores.length - 1; i++) {
    for (let j = i + 1; j < relevanceScores.length; j++) {
      comparisons++;
      if (relevanceScores[i] < relevanceScores[j]) {
        inversions++;
      }
    }
  }

  const precision = comparisons > 0 ? 1 - (inversions / comparisons) : 1;

  return {
    name: "Context Precision",
    score: precision,
    explanation: `Context ranking quality: ${(precision * 100).toFixed(1)}%`,
  };
}

// Calculate answer correctness if ground truth provided
function calculateAnswerCorrectness(answer: string, groundTruth: string): RAGMetric {
  const answerWords = new Set(
    answer.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );
  const truthWords = new Set(
    groundTruth.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );

  const intersection = [...answerWords].filter((w) => truthWords.has(w)).length;
  const union = new Set([...answerWords, ...truthWords]).size;

  const jaccardSimilarity = union > 0 ? intersection / union : 0;

  return {
    name: "Answer Correctness",
    score: jaccardSimilarity,
    explanation: `Jaccard similarity with ground truth: ${(jaccardSimilarity * 100).toFixed(1)}%`,
  };
}

export function evaluateRAG(input: RAGEvaluationInput): RAGEvaluationResult {
  const metrics: RAGMetric[] = [];

  // Core Ragas metrics
  metrics.push(calculateContextRelevance(input.question, input.contexts));
  metrics.push(calculateFaithfulness(input.answer, input.contexts));
  metrics.push(calculateAnswerRelevance(input.question, input.answer));
  metrics.push(calculateContextPrecision(input.question, input.contexts));

  // Optional ground truth comparison
  if (input.groundTruth) {
    metrics.push(calculateAnswerCorrectness(input.answer, input.groundTruth));
  }

  // Calculate overall score (weighted average)
  const weights = {
    "Context Relevance": 0.2,
    "Faithfulness": 0.3,
    "Answer Relevance": 0.25,
    "Context Precision": 0.15,
    "Answer Correctness": 0.1,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const metric of metrics) {
    const weight = weights[metric.name as keyof typeof weights] ?? 0.1;
    weightedSum += metric.score * weight;
    totalWeight += weight;
  }

  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Determine quality level
  let qualityLevel: RAGEvaluationResult["qualityLevel"];
  if (overallScore >= 0.8) {
    qualityLevel = "excellent";
  } else if (overallScore >= 0.6) {
    qualityLevel = "good";
  } else if (overallScore >= 0.4) {
    qualityLevel = "fair";
  } else {
    qualityLevel = "poor";
  }

  // Generate recommendation
  const lowMetrics = metrics.filter((m) => m.score < 0.5);
  let recommendation = "RAG response quality is acceptable.";

  if (lowMetrics.length > 0) {
    const issues = lowMetrics.map((m) => m.name).join(", ");
    recommendation = `Improvement needed in: ${issues}. Consider refining retrieval or response generation.`;
  }

  if (overallScore >= 0.8) {
    recommendation = "Excellent RAG response quality. No immediate improvements needed.";
  }

  return {
    overallScore,
    metrics,
    recommendation,
    qualityLevel,
  };
}

export interface RAGScoringService {
  evaluate(input: RAGEvaluationInput): RAGEvaluationResult;
  getQualityLevel(score: number): RAGEvaluationResult["qualityLevel"];
}

class RAGScoringServiceImpl implements RAGScoringService {
  evaluate(input: RAGEvaluationInput): RAGEvaluationResult {
    return evaluateRAG(input);
  }

  getQualityLevel(score: number): RAGEvaluationResult["qualityLevel"] {
    if (score >= 0.8) return "excellent";
    if (score >= 0.6) return "good";
    if (score >= 0.4) return "fair";
    return "poor";
  }
}

let ragScoringService: RAGScoringService | undefined;

export function getRAGScoringService(): RAGScoringService {
  if (!ragScoringService) {
    ragScoringService = new RAGScoringServiceImpl();
  }
  return ragScoringService;
}
