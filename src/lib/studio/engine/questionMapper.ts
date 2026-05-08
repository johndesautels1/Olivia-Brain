/**
 * questionMapper — Converts WorkspaceBlock[] into a flat QuestionState[] array.
 *
 * Each editable field within each block becomes its own QuestionState entry,
 * enabling the one-question-at-a-time sequencer in the Preparation Studio.
 *
 * Also provides helpers:
 * - mapBlocksToQuestions()  — full conversion
 * - getFieldValue()         — extract current answer from userData
 * - computeFieldStatus()    — per-field completion check
 * - recomputeBlockFromQuestions() — write answers back into blocks
 */

import type { WorkspaceBlock, EditableField } from "@/components/documents/DocumentWorkspace";
import { getEditableFields, computeBlockStatus } from "@/components/documents/DocumentWorkspace";
import type { QuestionState, FieldValue } from "./types";
import { type EntityMode, isBlockPriority, isBlockSupplementary, isFieldPriority } from "./entityModes";

// ── Placeholder pattern (matches [Bracketed Placeholders]) ──────────

// **Divergence from LTM source:** LTM's original `hasPlaceholders` calls
// `.test()` on a module-level `/.../g` regex, whose `lastIndex` carries
// over between calls. Across many fields in `mapBlocksToQuestions`, a
// stale `lastIndex` past the next string's length makes `.test()`
// falsely return `false` and the field is mis-classified as "complete".
// Caught by `questionMapper.test.ts` partial-completion case in Track B
// Session 8. Local regex literal removes the shared state; the bracket
// charset is preserved verbatim. LTM source file remains read-only.

function hasPlaceholders(value: string): boolean {
  return /\[[\w\s/&,.'()-]+\]/.test(value);
}

// ── Extract a human-readable question from a block + field ──────────

function deriveQuestionText(
  block: WorkspaceBlock,
  field: EditableField,
): string {
  // If the block has a heading/title and the field IS the heading, use it directly
  const heading =
    (block.templateData.heading as string) ||
    (block.templateData.title as string) ||
    (block.templateData.label as string);

  // For single-field blocks, use the heading if available
  const fields = getEditableFields(block.templateData);
  if (fields.length === 1 && heading) {
    return heading;
  }

  // For multi-field blocks, combine block heading + field label
  if (heading && field.label !== heading) {
    return `${heading} — ${field.label}`;
  }

  // Fallback to field label or formatted block type
  return field.label || formatBlockType(block.type);
}

// ── Extract help text for a specific field ──────────────────────────

function deriveHelpText(block: WorkspaceBlock, field: EditableField): string | null {
  const description = block.templateData.description as string | undefined;
  const helpText = block.templateData.helpText as string | undefined;
  const subtitle = block.templateData.subtitle as string | undefined;

  // Use placeholder text from the field if it contains instructive content
  if (field.placeholder && field.placeholder.length > 10) {
    return field.placeholder;
  }

  return description || helpText || subtitle || null;
}

// ── Format block type for display ───────────────────────────────────

function formatBlockType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Get the current value of a field from userData ──────────────────

export function getFieldValue(
  userData: Record<string, unknown>,
  field: EditableField,
): FieldValue {
  const raw = userData[field.key];
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return String(raw);
}

// ── Per-field completion status ──────────────────────────────────────

export function computeFieldStatus(
  templateData: Record<string, unknown>,
  userData: Record<string, unknown>,
  field: EditableField,
): "empty" | "partial" | "complete" {
  const userValue = userData[field.key];
  const templateValue = templateData[field.key];

  if (typeof userValue === "string" && typeof templateValue === "string") {
    if (userValue !== templateValue && !hasPlaceholders(userValue)) {
      return "complete";
    }
    if (!hasPlaceholders(templateValue)) {
      return "complete"; // Pre-filled, no placeholders
    }
    // Has placeholders still remaining
    if (userValue !== templateValue) return "partial";
    return "empty";
  }

  if (userValue !== undefined && userValue !== null && userValue !== templateValue) {
    // Non-string value that differs from template
    if (Array.isArray(userValue) && (userValue as unknown[]).length > 0) return "complete";
    return "complete";
  }

  if (templateValue !== undefined && templateValue !== null) {
    if (typeof templateValue === "string" && !hasPlaceholders(templateValue)) {
      return "complete"; // Pre-filled content
    }
  }

  return "empty";
}

// ── Impact score heuristic ──────────────────────────────────────────
// Higher impact = more important for investor readiness.
// This is a stub; Conversation 5 will add Bayesian weighting.

function computeImpactScore(block: WorkspaceBlock, field: EditableField): number {
  const blockType = block.type;
  const fieldKey = field.key;

  // High-impact: hero fields, core content, metrics
  if (blockType === "hero") return 90;
  if (blockType === "metrics") return 85;
  if (blockType === "stat_card") return 80;
  if (fieldKey === "content" && blockType === "paragraph") return 70;
  if (fieldKey === "content" && blockType === "callout") return 75;
  if (blockType === "team_card" && fieldKey === "bio") return 72;
  if (blockType === "table" || blockType === "comparison_table") return 65;
  if (blockType === "timeline") return 60;
  if (blockType === "list") return 55;

  // Medium-impact: titles, headings
  if (fieldKey === "title" || fieldKey === "heading") return 50;

  // Lower-impact: footer, banners, attributions
  if (blockType === "footer") return 20;
  if (blockType === "logo_banner") return 15;
  if (fieldKey === "attribution") return 25;

  return 50; // Default medium
}

// ── Entity emphasis classification ──────────────────────────────────
// Determines whether a question is priority, supplementary, or normal
// for the active entity mode.

function computeEntityEmphasis(
  block: WorkspaceBlock,
  field: EditableField,
  entityMode: EntityMode | null,
): "priority" | "supplementary" | "normal" {
  if (!entityMode || entityMode.type === "general") return "normal";

  // Field-level priority takes precedence
  if (isFieldPriority(field.key, entityMode)) return "priority";

  // Block-level priority
  if (isBlockPriority(block.type, entityMode)) return "priority";

  // Block-level supplementary (collapsed)
  if (isBlockSupplementary(block.type, entityMode)) return "supplementary";

  return "normal";
}

// ── Entity-adjusted impact score ────────────────────────────────────
// Boosts priority questions and reduces supplementary ones so that
// smart-jump ordering reflects entity relevance.

function adjustImpactForEntity(
  baseScore: number,
  emphasis: "priority" | "supplementary" | "normal",
): number {
  if (emphasis === "priority") return Math.min(100, baseScore + 15);
  if (emphasis === "supplementary") return Math.max(0, baseScore - 20);
  return baseScore;
}

// ── Main mapper: WorkspaceBlock[] -> QuestionState[] ────────────────

export function mapBlocksToQuestions(
  blocks: WorkspaceBlock[],
  entityMode?: EntityMode | null,
): QuestionState[] {
  const questions: QuestionState[] = [];
  let questionIndex = 0;

  for (const block of blocks) {
    const fields = getEditableFields(block.templateData);

    // Skip decorative blocks with no editable fields
    if (fields.length === 0) continue;

    for (const field of fields) {
      const currentValue = getFieldValue(block.userData, field);
      const status = computeFieldStatus(block.templateData, block.userData, field);
      const baseImpact = computeImpactScore(block, field);
      const emphasis = computeEntityEmphasis(block, field, entityMode ?? null);
      const adjustedImpact = adjustImpactForEntity(baseImpact, emphasis);

      questions.push({
        questionIndex,
        blockIndex: block.index,
        field,
        questionText: deriveQuestionText(block, field),
        helpText: deriveHelpText(block, field),
        blockType: block.type,
        currentValue,
        status,
        impactScore: adjustedImpact,
        suggestions: [],    // Populated in Conversation 5
        priors: [],          // Populated in Conversation 5
        skipped: false,
        reviewed: status === "complete",
        consistencyFlags: [],
        entityEmphasis: emphasis,
      });

      questionIndex++;
    }
  }

  return questions;
}

// ── Write answers back into blocks ──────────────────────────────────

export function applyAnswerToBlocks(
  blocks: WorkspaceBlock[],
  question: QuestionState,
  newValue: FieldValue,
): WorkspaceBlock[] {
  return blocks.map((block) => {
    if (block.index !== question.blockIndex) return block;

    const updatedUserData = { ...block.userData };

    if (newValue === null) {
      // Clear the field — revert to template value
      updatedUserData[question.field.key] = block.templateData[question.field.key];
    } else {
      updatedUserData[question.field.key] = newValue;
    }

    const updatedStatus = computeBlockStatus(block.templateData, updatedUserData);

    return {
      ...block,
      userData: updatedUserData,
      status: updatedStatus,
    };
  });
}

// ── Recompute completion percentage from blocks ─────────────────────

export function computeCompletionFromQuestions(questions: QuestionState[]): number {
  if (questions.length === 0) return 0;
  const completed = questions.filter((q) => q.status === "complete").length;
  const partial = questions.filter((q) => q.status === "partial").length;
  return Math.round(((completed + partial * 0.5) / questions.length) * 100);
}
