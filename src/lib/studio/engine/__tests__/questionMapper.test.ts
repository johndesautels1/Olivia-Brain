/**
 * lib/studio/engine — questionMapper round-trip tests (Track B Session 8).
 *
 * Verifies the `WorkspaceBlock[] ↔ QuestionState[]` mapping is consistent
 * end-to-end: blocks → questions, applying an answer back into blocks,
 * remapping, and recomputing completion. Exercises:
 *  - mapBlocksToQuestions(): editable-field discovery + per-field state
 *  - applyAnswerToBlocks():  writes to userData + recomputes block status
 *  - computeCompletionFromQuestions(): aggregate completion %
 *  - entity emphasis: VC-mode boosts metrics priority and de-prioritises footer
 *  - decorative blocks (divider) emit zero questions
 *  - applyAnswerToBlocks(null) reverts a field to its template value
 */

import { describe, it, expect } from "vitest";

import {
  mapBlocksToQuestions,
  applyAnswerToBlocks,
  computeCompletionFromQuestions,
} from "../questionMapper";
import { ENTITY_MODES } from "../entityModes";
import type { WorkspaceBlock } from "@/components/documents/DocumentWorkspace";

function makeBlock(
  index: number,
  type: string,
  templateData: Record<string, unknown>,
  userData?: Record<string, unknown>,
): WorkspaceBlock {
  return {
    index,
    type,
    templateData: { type, ...templateData },
    userData: userData ? { type, ...userData } : { type, ...templateData },
    status: "empty",
  };
}

describe("lib/studio/engine · questionMapper round-trip", () => {
  it("maps a paragraph block to one question, applies an answer, and reaches 100% completion", () => {
    const blocks: WorkspaceBlock[] = [
      makeBlock(0, "paragraph", { content: "[Your story here]" }),
    ];

    const questions = mapBlocksToQuestions(blocks);
    expect(questions).toHaveLength(1);
    expect(questions[0].field.key).toBe("content");
    expect(questions[0].status).toBe("empty");
    expect(questions[0].blockType).toBe("paragraph");

    const updated = applyAnswerToBlocks(blocks, questions[0], "London tech is the world's most diverse ecosystem.");
    expect(updated[0].userData.content).toBe("London tech is the world's most diverse ecosystem.");
    expect(updated[0].status).toBe("complete");

    const remapped = mapBlocksToQuestions(updated);
    expect(remapped[0].status).toBe("complete");
    expect(remapped[0].reviewed).toBe(true);

    const completion = computeCompletionFromQuestions(remapped);
    expect(completion).toBe(100);
  });

  it("skips decorative blocks (divider has no editable fields)", () => {
    const blocks: WorkspaceBlock[] = [
      makeBlock(0, "divider", { style: "diamond" }),
      makeBlock(1, "paragraph", { content: "[Body]" }),
    ];

    const questions = mapBlocksToQuestions(blocks);
    // Divider is decorative → zero questions; paragraph contributes one.
    expect(questions).toHaveLength(1);
    expect(questions[0].blockIndex).toBe(1);
  });

  it("derives multi-field questions for team_card with bio + role + name", () => {
    const blocks: WorkspaceBlock[] = [
      makeBlock(0, "team_card", {
        name: "[Founder Name]",
        role: "[Role]",
        bio: "[Bio]",
      }),
    ];

    const questions = mapBlocksToQuestions(blocks);
    expect(questions).toHaveLength(3);
    const keys = questions.map((q) => q.field.key).sort();
    expect(keys).toEqual(["bio", "name", "role"]);
  });

  it("VC entity mode boosts metrics-block emphasis to priority and de-emphasises footer", () => {
    const blocks: WorkspaceBlock[] = [
      makeBlock(0, "metrics", { items: [{ label: "ARR", value: "$2.4M" }] }),
      makeBlock(1, "footer", { company: "Olivia Brain Ltd" }),
    ];

    const vcMode = ENTITY_MODES.vc;
    const questions = mapBlocksToQuestions(blocks, vcMode);

    const metricsQ = questions.find((q) => q.blockType === "metrics");
    const footerQ = questions.find((q) => q.blockType === "footer");

    expect(metricsQ?.entityEmphasis).toBe("priority");
    expect(footerQ?.entityEmphasis).toBe("supplementary");
    // priority +15 boost; supplementary -20 penalty (clamped to ≥ 0)
    expect((metricsQ?.impactScore ?? 0)).toBeGreaterThan(80);
    expect((footerQ?.impactScore ?? 0)).toBeLessThan(20);
  });

  it("applyAnswerToBlocks(null) reverts the field back to the template value", () => {
    const blocks: WorkspaceBlock[] = [
      makeBlock(0, "paragraph", { content: "[Original]" }, { content: "User-typed answer" }),
    ];

    const questions = mapBlocksToQuestions(blocks);
    const reverted = applyAnswerToBlocks(blocks, questions[0], null);
    expect(reverted[0].userData.content).toBe("[Original]");
  });

  it("partial completion across mixed blocks yields a fractional percentage", () => {
    const blocks: WorkspaceBlock[] = [
      makeBlock(0, "paragraph", { content: "[Body]" }, { content: "Filled body content" }),
      makeBlock(1, "section", { heading: "[Section heading]" }), // unfilled
      makeBlock(2, "paragraph", { content: "[Body 2]" }), // unfilled
    ];

    const questions = mapBlocksToQuestions(blocks);
    const completion = computeCompletionFromQuestions(questions);
    // 1 of 3 questions complete → 33%; spec rounds to whole percent.
    expect(completion).toBeGreaterThanOrEqual(30);
    expect(completion).toBeLessThanOrEqual(40);
  });
});
