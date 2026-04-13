/**
 * Cleanlab Data Quality Scoring
 * Sprint 4.5 — Evaluation & Observability (Item 6)
 *
 * Scores training data, conversation logs, and knowledge base entries
 * for quality issues using the Cleanlab Studio API. Detects:
 *
 * 1. **Label errors** — Mislabeled data (e.g., a "positive" sentiment
 *    conversation flagged as negative, or a city categorized wrong)
 * 2. **Outliers** — Data points that don't fit the distribution
 *    (e.g., a conversation with bizarre token patterns)
 * 3. **Near-duplicates** — Redundant entries that inflate dataset size
 *    without adding value (e.g., near-identical knowledge base articles)
 * 4. **Low-quality text** — Entries with poor grammar, incoherent
 *    structure, or insufficient information density
 *
 * This matters for Olivia because her knowledge base, conversation
 * history, and city evaluation data all feed into her responses.
 * Bad data → bad recommendations.
 *
 * Uses Cleanlab Studio REST API via HTTP client (no SDK package needed).
 * All functions are NoOp-safe when CLEANLAB_API_KEY is missing.
 *
 * Usage:
 *   const service = getCleanlabService();
 *   const report = await service.scoreDataQuality({
 *     entries: [...],
 *     dataType: "knowledge-base",
 *   });
 *   console.log(`Issues found: ${report.issueCount}`);
 */

import { getServerEnv } from "@/lib/config/env";

// ─── Constants ──────────────────────────────────────────────────────────────

const CLEANLAB_API_BASE = "https://api.cleanlab.ai/api/v1";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Types of data that Olivia's system produces and consumes. */
export type DataType =
  | "knowledge-base"
  | "conversation-log"
  | "city-evaluation"
  | "client-profile"
  | "training-example"
  | "rag-document";

/** Issue severity levels. */
export type IssueSeverity = "critical" | "high" | "medium" | "low";

/** Types of quality issues Cleanlab can detect. */
export type IssueType =
  | "label-error"
  | "outlier"
  | "near-duplicate"
  | "low-quality"
  | "ambiguous"
  | "inconsistent";

/** A single data entry to evaluate for quality. */
export interface DataEntry {
  /** Unique entry ID */
  id: string;
  /** The text content to evaluate */
  text: string;
  /** Label/category assigned to this entry (if applicable) */
  label?: string;
  /** Additional metadata */
  metadata?: Record<string, string | number | boolean>;
}

/** A quality issue detected in a data entry. */
export interface DataQualityIssue {
  /** Which entry has the issue */
  entryId: string;
  /** What type of issue */
  issueType: IssueType;
  /** How severe */
  severity: IssueSeverity;
  /** Confidence that this is a real issue (0-1) */
  confidence: number;
  /** Human-readable description of the issue */
  description: string;
  /** Suggested fix (if applicable) */
  suggestedFix?: string;
  /** ID of the duplicate entry (for near-duplicate issues) */
  duplicateOfId?: string;
  /** Suggested correct label (for label error issues) */
  suggestedLabel?: string;
}

/** Input for scoring data quality. */
export interface DataQualityInput {
  /** The data entries to evaluate */
  entries: DataEntry[];
  /** What type of data this is */
  dataType: DataType;
  /** Which issue types to check for (default: all) */
  issueTypes?: IssueType[];
  /** Minimum confidence threshold for reporting issues (default: 0.5) */
  confidenceThreshold?: number;
}

/** Full data quality report. */
export interface DataQualityReport {
  /** Unique report identifier */
  reportId: string;
  /** When the report was generated */
  timestamp: string;
  /** What type of data was evaluated */
  dataType: DataType;
  /** Total entries evaluated */
  totalEntries: number;
  /** Total issues found */
  issueCount: number;
  /** Issues by type */
  issuesByType: Record<IssueType, number>;
  /** Issues by severity */
  issuesBySeverity: Record<IssueSeverity, number>;
  /** All detected issues */
  issues: DataQualityIssue[];
  /** Overall quality score 0-100 (100 = no issues) */
  qualityScore: number;
  /** Entries that are clean (no issues detected) */
  cleanEntryCount: number;
  /** Percentage of clean entries */
  cleanPercentage: number;
  /** Whether Cleanlab API was available */
  cleanlabAvailable: boolean;
  /** Total processing duration in ms */
  durationMs: number;
}

/** Result of finding specific issues across a dataset. */
export interface FindIssuesResult {
  /** Which issue type was searched */
  issueType: IssueType;
  /** Matching issues found */
  issues: DataQualityIssue[];
  /** Total count */
  count: number;
}

// ─── Cleanlab Client ────────────────────────────────────────────────────────

/** Whether Cleanlab is available (API key present). */
function isCleanlabAvailable(): boolean {
  const env = getServerEnv();
  return (
    typeof env.CLEANLAB_API_KEY === "string" &&
    env.CLEANLAB_API_KEY.length > 0
  );
}

/**
 * Make an authenticated request to the Cleanlab Studio API.
 */
async function cleanlabFetch(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): Promise<unknown> {
  const env = getServerEnv();
  const { method = "POST", body } = options;

  const response = await fetch(`${CLEANLAB_API_BASE}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.CLEANLAB_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown");
    throw new Error(
      `Cleanlab API error ${response.status}: ${errorText}`
    );
  }

  return response.json();
}

// ─── Heuristic Quality Scoring ──────────────────────────────────────────────

/**
 * Score data quality using local heuristics when the Cleanlab API
 * is unavailable. Provides basic detection for:
 * - Near-duplicates (Jaccard similarity on word sets)
 * - Low-quality text (short length, low info density)
 * - Outliers (text length far from median)
 * - Inconsistent labels (same text, different labels)
 */
function scoreWithHeuristics(
  entries: DataEntry[],
  issueTypes: IssueType[],
  confidenceThreshold: number
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  // ── Near-Duplicate Detection ────────────────────────────────────────
  if (issueTypes.includes("near-duplicate")) {
    const wordSets = entries.map((e) => new Set(e.text.toLowerCase().split(/\s+/)));

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const intersection = new Set(
          [...wordSets[i]].filter((w) => wordSets[j].has(w))
        );
        const union = new Set([...wordSets[i], ...wordSets[j]]);
        const jaccard = union.size > 0 ? intersection.size / union.size : 0;

        if (jaccard >= 0.85 && jaccard >= confidenceThreshold) {
          issues.push({
            entryId: entries[j].id,
            issueType: "near-duplicate",
            severity: jaccard >= 0.95 ? "high" : "medium",
            confidence: jaccard,
            description: `Near-duplicate of entry "${entries[i].id}" (${Math.round(jaccard * 100)}% similarity)`,
            duplicateOfId: entries[i].id,
          });
        }
      }
    }
  }

  // ── Low-Quality Text Detection ──────────────────────────────────────
  if (issueTypes.includes("low-quality")) {
    for (const entry of entries) {
      const wordCount = entry.text.split(/\s+/).length;
      const uniqueWords = new Set(entry.text.toLowerCase().split(/\s+/));
      const uniqueRatio = wordCount > 0 ? uniqueWords.size / wordCount : 0;

      // Very short text
      if (wordCount < 10) {
        const confidence = 1 - wordCount / 10;
        if (confidence >= confidenceThreshold) {
          issues.push({
            entryId: entry.id,
            issueType: "low-quality",
            severity: wordCount < 3 ? "high" : "medium",
            confidence,
            description: `Very short text (${wordCount} words) — may lack sufficient information`,
            suggestedFix: "Expand with more detail or merge with related entries",
          });
        }
      }

      // Low vocabulary diversity (repetitive text)
      if (wordCount > 20 && uniqueRatio < 0.4) {
        const confidence = 1 - uniqueRatio;
        if (confidence >= confidenceThreshold) {
          issues.push({
            entryId: entry.id,
            issueType: "low-quality",
            severity: "medium",
            confidence,
            description: `Low vocabulary diversity (${Math.round(uniqueRatio * 100)}% unique words) — may be repetitive`,
            suggestedFix: "Review for redundant phrasing",
          });
        }
      }
    }
  }

  // ── Outlier Detection (text length) ─────────────────────────────────
  if (issueTypes.includes("outlier") && entries.length >= 5) {
    const lengths = entries.map((e) => e.text.length).sort((a, b) => a - b);
    const median = lengths[Math.floor(lengths.length / 2)];
    const mad =
      lengths
        .map((l) => Math.abs(l - median))
        .sort((a, b) => a - b)[Math.floor(lengths.length / 2)] || 1;

    for (const entry of entries) {
      const zScore = mad > 0 ? Math.abs(entry.text.length - median) / (mad * 1.4826) : 0;

      if (zScore > 3) {
        const confidence = Math.min(1, zScore / 5);
        if (confidence >= confidenceThreshold) {
          issues.push({
            entryId: entry.id,
            issueType: "outlier",
            severity: zScore > 5 ? "high" : "medium",
            confidence,
            description: `Text length outlier (${entry.text.length} chars, median: ${median}) — modified Z-score: ${zScore.toFixed(1)}`,
            suggestedFix: "Review for data entry errors or misclassification",
          });
        }
      }
    }
  }

  // ── Label Inconsistency Detection ───────────────────────────────────
  if (issueTypes.includes("label-error")) {
    const labeledEntries = entries.filter((e) => e.label);
    const textToLabels = new Map<string, Set<string>>();

    for (const entry of labeledEntries) {
      const normalized = entry.text.toLowerCase().trim().substring(0, 200);
      const existing = textToLabels.get(normalized) ?? new Set();
      existing.add(entry.label!);
      textToLabels.set(normalized, existing);
    }

    for (const entry of labeledEntries) {
      const normalized = entry.text.toLowerCase().trim().substring(0, 200);
      const labels = textToLabels.get(normalized);

      if (labels && labels.size > 1) {
        issues.push({
          entryId: entry.id,
          issueType: "label-error",
          severity: "high",
          confidence: 0.8,
          description: `Same text has multiple labels: [${[...labels].join(", ")}] — likely a labeling error`,
          suggestedLabel: [...labels][0],
        });
      }
    }
  }

  // ── Ambiguous Content Detection ─────────────────────────────────────
  if (issueTypes.includes("ambiguous")) {
    const ambiguityMarkers = [
      /\b(maybe|perhaps|possibly|might|could be|not sure|unclear)\b/i,
      /\?{2,}/,
      /\b(TODO|TBD|FIXME|placeholder)\b/i,
      /\b(lorem ipsum)\b/i,
    ];

    for (const entry of entries) {
      const matchCount = ambiguityMarkers.filter((r) =>
        r.test(entry.text)
      ).length;

      if (matchCount >= 2) {
        const confidence = Math.min(1, matchCount / 3);
        if (confidence >= confidenceThreshold) {
          issues.push({
            entryId: entry.id,
            issueType: "ambiguous",
            severity: "low",
            confidence,
            description: `Contains ${matchCount} ambiguity markers — may be incomplete or placeholder content`,
            suggestedFix: "Review and finalize content",
          });
        }
      }
    }
  }

  return issues;
}

// ─── Core: Score Data Quality ───────────────────────────────────────────────

/**
 * Score a set of data entries for quality issues.
 *
 * Process:
 * 1. If Cleanlab API is available, send data for professional evaluation
 * 2. If not, fall back to heuristic scoring (still useful)
 * 3. Aggregate issues into a quality report
 *
 * The heuristic fallback ensures this function always returns useful
 * results, even without a Cleanlab subscription.
 */
async function scoreDataQuality(
  input: DataQualityInput
): Promise<DataQualityReport> {
  const start = Date.now();
  const reportId = `clab-${Date.now()}`;
  const {
    entries,
    dataType,
    issueTypes = [
      "label-error",
      "outlier",
      "near-duplicate",
      "low-quality",
      "ambiguous",
      "inconsistent",
    ],
    confidenceThreshold = 0.5,
  } = input;

  console.log(
    `[Cleanlab] Scoring ${entries.length} ${dataType} entries for quality issues`
  );

  let issues: DataQualityIssue[] = [];
  let cleanlabAvailable = false;

  if (isCleanlabAvailable()) {
    try {
      // Attempt Cleanlab API call
      const apiResponse = (await cleanlabFetch("/tlm/score", {
        body: {
          entries: entries.map((e) => ({
            id: e.id,
            text: e.text,
            label: e.label,
            metadata: e.metadata,
          })),
          data_type: dataType,
          issue_types: issueTypes,
          confidence_threshold: confidenceThreshold,
        },
      })) as {
        issues?: Array<{
          entry_id: string;
          issue_type: string;
          severity: string;
          confidence: number;
          description: string;
          suggested_fix?: string;
          duplicate_of_id?: string;
          suggested_label?: string;
        }>;
      };

      cleanlabAvailable = true;

      if (apiResponse.issues && Array.isArray(apiResponse.issues)) {
        issues = apiResponse.issues.map((i) => ({
          entryId: i.entry_id,
          issueType: i.issue_type as IssueType,
          severity: i.severity as IssueSeverity,
          confidence: i.confidence,
          description: i.description,
          suggestedFix: i.suggested_fix,
          duplicateOfId: i.duplicate_of_id,
          suggestedLabel: i.suggested_label,
        }));
      }

      console.log(
        `[Cleanlab] API returned ${issues.length} issues`
      );
    } catch (error) {
      console.warn(
        `[Cleanlab] API call failed, falling back to heuristics: ${error instanceof Error ? error.message : "unknown"}`
      );
      // Fall through to heuristic scoring
      issues = scoreWithHeuristics(entries, issueTypes, confidenceThreshold);
    }
  } else {
    console.log(
      "[Cleanlab] API key not configured — using heuristic scoring"
    );
    issues = scoreWithHeuristics(entries, issueTypes, confidenceThreshold);
  }

  // ── Aggregate Results ───────────────────────────────────────────────

  const issuesByType: Record<IssueType, number> = {
    "label-error": 0,
    outlier: 0,
    "near-duplicate": 0,
    "low-quality": 0,
    ambiguous: 0,
    inconsistent: 0,
  };

  const issuesBySeverity: Record<IssueSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const issue of issues) {
    issuesByType[issue.issueType] =
      (issuesByType[issue.issueType] ?? 0) + 1;
    issuesBySeverity[issue.severity] =
      (issuesBySeverity[issue.severity] ?? 0) + 1;
  }

  // Entries with issues
  const entryIdsWithIssues = new Set(issues.map((i) => i.entryId));
  const cleanEntryCount = entries.length - entryIdsWithIssues.size;
  const cleanPercentage =
    entries.length > 0
      ? Math.round((cleanEntryCount / entries.length) * 100)
      : 100;

  // Quality score: weighted penalty per issue severity
  const severityPenalty: Record<IssueSeverity, number> = {
    critical: 10,
    high: 5,
    medium: 2,
    low: 1,
  };

  let totalPenalty = 0;
  for (const issue of issues) {
    totalPenalty += severityPenalty[issue.severity] * issue.confidence;
  }

  const maxPenalty = entries.length * 10; // worst case: every entry critical
  const qualityScore =
    maxPenalty > 0
      ? Math.max(0, Math.round(100 - (totalPenalty / maxPenalty) * 100))
      : 100;

  const report: DataQualityReport = {
    reportId,
    timestamp: new Date().toISOString(),
    dataType,
    totalEntries: entries.length,
    issueCount: issues.length,
    issuesByType,
    issuesBySeverity,
    issues,
    qualityScore,
    cleanEntryCount,
    cleanPercentage,
    cleanlabAvailable,
    durationMs: Date.now() - start,
  };

  console.log(
    `[Cleanlab] Quality report: ${qualityScore}/100, ${issues.length} issues found (${cleanPercentage}% clean) in ${report.durationMs}ms`
  );

  return report;
}

// ─── Find Specific Issues ───────────────────────────────────────────────────

/**
 * Find all issues of a specific type in a dataset.
 *
 * Convenience wrapper that runs scoreDataQuality() and filters
 * results to the requested issue type.
 */
async function findIssues(
  entries: DataEntry[],
  issueType: IssueType,
  dataType: DataType = "knowledge-base"
): Promise<FindIssuesResult> {
  const report = await scoreDataQuality({
    entries,
    dataType,
    issueTypes: [issueType],
    confidenceThreshold: 0.3, // Lower threshold for targeted searches
  });

  const matchingIssues = report.issues.filter(
    (i) => i.issueType === issueType
  );

  return {
    issueType,
    issues: matchingIssues,
    count: matchingIssues.length,
  };
}

// ─── Specialized Finders ────────────────────────────────────────────────────

/**
 * Find near-duplicate entries in a dataset.
 * Returns pairs of entries that are suspiciously similar.
 */
async function findDuplicates(
  entries: DataEntry[],
  dataType: DataType = "knowledge-base"
): Promise<{
  duplicatePairs: Array<{
    entryId: string;
    duplicateOfId: string;
    similarity: number;
  }>;
  count: number;
}> {
  const result = await findIssues(entries, "near-duplicate", dataType);

  const duplicatePairs = result.issues
    .filter((i) => i.duplicateOfId)
    .map((i) => ({
      entryId: i.entryId,
      duplicateOfId: i.duplicateOfId!,
      similarity: i.confidence,
    }));

  return { duplicatePairs, count: duplicatePairs.length };
}

/**
 * Find potential label errors in a labeled dataset.
 * Returns entries where the assigned label may be wrong.
 */
async function findLabelErrors(
  entries: DataEntry[],
  dataType: DataType = "training-example"
): Promise<{
  errors: Array<{
    entryId: string;
    currentLabel: string;
    suggestedLabel: string | undefined;
    confidence: number;
  }>;
  count: number;
}> {
  const result = await findIssues(entries, "label-error", dataType);

  const errors = result.issues.map((i) => ({
    entryId: i.entryId,
    currentLabel:
      entries.find((e) => e.id === i.entryId)?.label ?? "unknown",
    suggestedLabel: i.suggestedLabel,
    confidence: i.confidence,
  }));

  return { errors, count: errors.length };
}

/**
 * Find outlier entries that don't fit the dataset distribution.
 */
async function findOutliers(
  entries: DataEntry[],
  dataType: DataType = "knowledge-base"
): Promise<{
  outliers: Array<{
    entryId: string;
    description: string;
    confidence: number;
  }>;
  count: number;
}> {
  const result = await findIssues(entries, "outlier", dataType);

  const outliers = result.issues.map((i) => ({
    entryId: i.entryId,
    description: i.description,
    confidence: i.confidence,
  }));

  return { outliers, count: outliers.length };
}

// ─── Service Interface ──────────────────────────────────────────────────────

export interface CleanlabService {
  /** Score a dataset for all quality issues */
  scoreDataQuality(input: DataQualityInput): Promise<DataQualityReport>;
  /** Find issues of a specific type */
  findIssues(
    entries: DataEntry[],
    issueType: IssueType,
    dataType?: DataType
  ): Promise<FindIssuesResult>;
  /** Find near-duplicate entries */
  findDuplicates(
    entries: DataEntry[],
    dataType?: DataType
  ): Promise<{
    duplicatePairs: Array<{
      entryId: string;
      duplicateOfId: string;
      similarity: number;
    }>;
    count: number;
  }>;
  /** Find potential label errors */
  findLabelErrors(
    entries: DataEntry[],
    dataType?: DataType
  ): Promise<{
    errors: Array<{
      entryId: string;
      currentLabel: string;
      suggestedLabel: string | undefined;
      confidence: number;
    }>;
    count: number;
  }>;
  /** Find outlier entries */
  findOutliers(
    entries: DataEntry[],
    dataType?: DataType
  ): Promise<{
    outliers: Array<{
      entryId: string;
      description: string;
      confidence: number;
    }>;
    count: number;
  }>;
  /** Check if Cleanlab API is available */
  isAvailable(): boolean;
}

// ─── Singleton Factory ──────────────────────────────────────────────────────

let cleanlabService: CleanlabService | undefined;

/**
 * Get the Cleanlab data quality scoring service singleton.
 */
export function getCleanlabService(): CleanlabService {
  if (!cleanlabService) {
    cleanlabService = {
      scoreDataQuality,
      findIssues,
      findDuplicates,
      findLabelErrors,
      findOutliers,
      isAvailable: isCleanlabAvailable,
    };
  }

  return cleanlabService;
}
