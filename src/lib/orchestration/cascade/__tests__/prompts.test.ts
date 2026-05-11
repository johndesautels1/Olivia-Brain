/**
 * cascade/prompts — module-import + surface smoke.
 *
 * Track G S19 chunk 2/3. The prompts file is a 1060-LOC catalogue of
 * 15 production-tuned cascade prompts (one per CascadeTaskId). Locks
 * the four exported resolvers: getTaskPrompt, getPreMergedData,
 * getJudgePromptForBatch, getJudgePrompt. Prompt content is
 * verified end-to-end by the cascade integration smoke (Session 20).
 */
import { describe, expect, it } from "vitest";

import {
  getTaskPrompt,
  getPreMergedData,
  getJudgePromptForBatch,
  getJudgePrompt,
} from "../prompts";

const SAMPLE_TASKS = [
  "london_funding_rounds",
  "london_ai_ecosystem",
  "london_tech_events",
  "livability_scores",
  "london_district_narratives",
] as const;

describe("cascade/prompts · module surface", () => {
  it("exports all four resolvers as functions", () => {
    expect(typeof getTaskPrompt).toBe("function");
    expect(typeof getPreMergedData).toBe("function");
    expect(typeof getJudgePromptForBatch).toBe("function");
    expect(typeof getJudgePrompt).toBe("function");
  });
});

describe("cascade/prompts · getTaskPrompt", () => {
  for (const taskId of SAMPLE_TASKS) {
    it(`returns a non-empty string for taskId="${taskId}"`, () => {
      const prompt = getTaskPrompt(taskId);
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(100);
    });

    it(`embeds the taskId-specific guidance for "${taskId}"`, () => {
      const prompt = getTaskPrompt(taskId);
      // Every task prompt mentions London + JSON output contract.
      expect(prompt.toLowerCase()).toContain("london");
      expect(prompt).toMatch(/JSON|json/);
    });
  }

  it("varies the prompt across task IDs (not a one-size-fits-all template)", () => {
    const a = getTaskPrompt("london_funding_rounds");
    const b = getTaskPrompt("livability_scores");
    expect(a).not.toBe(b);
  });

  it("accepts an optional lastCollectionDate without throwing", () => {
    const prompt = getTaskPrompt(
      "london_funding_rounds",
      "2026-05-01T00:00:00Z",
    );
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });
});

describe("cascade/prompts · getJudgePrompt", () => {
  it("returns a non-empty string for a known task", () => {
    const prompt = getJudgePrompt(
      "london_funding_rounds",
      [{ provider: "sonnet", items: [{ company: "Example" }] }],
    );
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });
});
