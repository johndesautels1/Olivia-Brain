/**
 * DocumentWorkspace — Data spine for the document workspace shell.
 *
 * **Track B Session 8 partial port** (Atoms-Only scope). This file ports ONLY
 * the type definitions and pure helper functions that the studio engine
 * (`lib/studio/engine/*`), DocumentRenderer, and the 18 block components
 * depend on. The React component shell (split-pane book-style editor with
 * template preview + field editor + Olivia panel) is deferred to a
 * follow-up session that can also port DocumentFieldEditor +
 * DocumentTemplatePreview + WorkspaceOliviaPanel — the 3 sibling
 * components the shell renders.
 *
 * Until that follow-up lands, no caller mounts `<DocumentWorkspace />`; the
 * type + helper exports here are consumed by the engine layer and
 * downstream callers (Track C UI rebuild) only.
 *
 * Source: `D:\London-Tech-Map\src\components\documents\DocumentWorkspace.tsx`
 *         (lines 1–208 of the LTM canonical implementation, byte-for-byte
 *          for the type + helper portion). LTM file remains read-only.
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface WorkspaceBlock {
  /** Index in the original blocks array */
  index: number;
  /** Block type from the block_json schema */
  type: string;
  /** The raw block data (template version with placeholders) */
  templateData: Record<string, unknown>;
  /** The user's editable version (starts as copy of template, user fills placeholders) */
  userData: Record<string, unknown>;
  /** Field completion status */
  status: "empty" | "partial" | "complete";
}

export interface WorkspaceDocument {
  id: string;
  title: string;
  slug: string;
  collectionSlug: string;
  documentType: string;
  audienceType: string;
  purposeType: string;
  confidentiality: string;
  summary: string | null;
  blocks: WorkspaceBlock[];
}

// ── Placeholder detection ──────────────────────────────────────────────

// **Divergence from LTM source:** LTM's original `hasPlaceholders` calls
// `.test()` on a module-level `/.../g` regex, whose `lastIndex` carries
// over between calls. When `computeBlockStatus` is invoked for many blocks
// in sequence, a stale `lastIndex` past the next string's length makes
// `.test()` falsely return `false` and the block is mis-classified as
// "complete". Caught by the `questionMapper.test.ts` partial-completion
// case in Track B Session 8. Local regex literal in `hasPlaceholders`
// removes the shared state; `countPlaceholders` keeps a fresh `g` regex
// per call for the same reason. LTM source file remains read-only.

/** Check if a string value contains unfilled template placeholders */
function hasPlaceholders(value: string): boolean {
  return /\[([^\]]+)\]/.test(value);
}

/** Count remaining placeholders in a string */
function countPlaceholders(value: string): number {
  const matches = value.match(/\[([^\]]+)\]/g);
  return matches ? matches.length : 0;
}

/** Determine if a block's user data is empty, partial, or complete */
export function computeBlockStatus(
  templateData: Record<string, unknown>,
  userData: Record<string, unknown>,
): "empty" | "partial" | "complete" {
  const editableFields = getEditableFields(templateData);
  if (editableFields.length === 0) return "complete"; // Decorative blocks (divider, etc.)

  let filledCount = 0;
  let totalCount = 0;

  for (const field of editableFields) {
    totalCount++;
    const userValue = userData[field.key];
    const templateValue = templateData[field.key];

    if (typeof userValue === "string" && typeof templateValue === "string") {
      // If user value differs from template AND has no remaining placeholders → filled
      if (userValue !== templateValue && !hasPlaceholders(userValue)) {
        filledCount++;
      } else if (!hasPlaceholders(templateValue)) {
        // Template has no placeholders — it's pre-filled content, count as filled
        filledCount++;
      }
    } else if (userValue !== undefined && userValue !== null && userValue !== templateValue) {
      filledCount++;
    } else if (templateValue !== undefined && templateValue !== null) {
      // Check if template value itself has no placeholders (pre-filled)
      if (typeof templateValue === "string" && !hasPlaceholders(templateValue)) {
        filledCount++;
      }
    }
  }

  if (filledCount === 0) return "empty";
  if (filledCount >= totalCount) return "complete";
  return "partial";
}

// ── Editable field extraction ──────────────────────────────────────────

export interface EditableField {
  key: string;
  label: string;
  type: "text" | "textarea" | "items" | "metrics" | "table" | "timeline";
  placeholder?: string;
}

/** Extract editable fields from a block based on its type */
export function getEditableFields(block: Record<string, unknown>): EditableField[] {
  const blockType = block.type as string;
  const fields: EditableField[] = [];

  switch (blockType) {
    case "hero":
      fields.push({ key: "title", label: "Title", type: "text", placeholder: "[Your Company Name]" });
      if (block.subtitle !== undefined) fields.push({ key: "subtitle", label: "Subtitle", type: "text" });
      if (block.date !== undefined) fields.push({ key: "date", label: "Date", type: "text", placeholder: "[Month Year]" });
      if (block.preparedFor !== undefined) fields.push({ key: "preparedFor", label: "Prepared For", type: "text", placeholder: "[Recipient Name / Entity]" });
      break;

    case "paragraph":
      fields.push({ key: "content", label: "Content", type: "textarea" });
      break;

    case "section":
      fields.push({ key: "heading", label: "Heading", type: "text" });
      break;

    case "callout":
      if (block.title !== undefined) fields.push({ key: "title", label: "Title", type: "text" });
      fields.push({ key: "content", label: "Content", type: "textarea" });
      break;

    case "quote":
      fields.push({ key: "text", label: "Quote Text", type: "textarea" });
      if (block.attribution !== undefined) fields.push({ key: "attribution", label: "Attribution", type: "text" });
      break;

    case "metrics":
      fields.push({ key: "items", label: "Metrics", type: "metrics" });
      break;

    case "table":
    case "comparison_table":
      if (block.title !== undefined) fields.push({ key: "title", label: "Table Title", type: "text" });
      fields.push({ key: "rows", label: "Table Data", type: "table" });
      break;

    case "list":
      fields.push({ key: "items", label: "List Items", type: "items" });
      break;

    case "timeline":
      if (block.title !== undefined) fields.push({ key: "title", label: "Timeline Title", type: "text" });
      fields.push({ key: "items", label: "Timeline Items", type: "timeline" });
      break;

    case "team_card":
      fields.push({ key: "name", label: "Name", type: "text" });
      fields.push({ key: "role", label: "Role", type: "text" });
      fields.push({ key: "bio", label: "Biography", type: "textarea" });
      if (block.highlights !== undefined) fields.push({ key: "highlights", label: "Highlights", type: "items" });
      break;

    case "product_card":
      fields.push({ key: "items", label: "Products", type: "items" });
      break;

    case "bar_chart":
      if (block.title !== undefined) fields.push({ key: "title", label: "Chart Title", type: "text" });
      break;

    case "pie_chart":
      if (block.title !== undefined) fields.push({ key: "title", label: "Chart Title", type: "text" });
      break;

    case "stat_card":
      fields.push({ key: "label", label: "Label", type: "text" });
      fields.push({ key: "value", label: "Value", type: "text" });
      break;

    case "footer":
      if (block.company !== undefined) fields.push({ key: "company", label: "Company", type: "text" });
      if (block.address !== undefined) fields.push({ key: "address", label: "Address", type: "text" });
      if (block.classification !== undefined) fields.push({ key: "classification", label: "Classification", type: "text" });
      if (block.companyNumber !== undefined) fields.push({ key: "companyNumber", label: "Company Number", type: "text" });
      break;

    case "logo_banner":
      if (block.title !== undefined) fields.push({ key: "title", label: "Banner Title", type: "text" });
      break;

    // Decorative blocks with no editable fields
    case "divider":
      break;
  }

  return fields;
}

// `countPlaceholders` is currently unused by the engine path; preserved
// here for parity with the LTM source so future ports of the React
// component portion don't need to re-derive it.
void countPlaceholders;
