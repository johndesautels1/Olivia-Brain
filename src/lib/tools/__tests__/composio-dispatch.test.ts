/**
 * Track O Session O1 — Composio dispatch wrapper smoke tests.
 *
 * Exercises the catalog, the unknown-tool rejection path, the not-configured
 * fallback (no `COMPOSIO_API_KEY` in the test env), and the Vercel AI SDK
 * tool registry adapter. The full e2e path (cascade → tool call → narration)
 * is covered separately in `src/lib/orchestration/__tests__/tool-dispatch.test.ts`.
 */

import { describe, expect, it } from "vitest";

import {
  buildCascadeTools,
  dispatchTool,
  lookupCatalogEntry,
  TOOL_CATALOG,
} from "../composio";

describe("Track O Session O1 — Composio dispatch wrapper", () => {
  it("exposes a non-empty TOOL_CATALOG", () => {
    expect(TOOL_CATALOG.length).toBeGreaterThan(0);
    for (const entry of TOOL_CATALOG) {
      expect(entry.id).toMatch(/^[a-z]+\.[a-z_]+$/);
      expect(entry.composioAction).toMatch(/^[A-Z_]+$/);
      expect(entry.approvalGate.tool).toBeTruthy();
      expect(entry.approvalGate.action).toBeTruthy();
    }
  });

  it("ships at least the gmail.send tool (O1 exit criterion)", () => {
    const entry = lookupCatalogEntry("gmail.send");
    expect(entry).not.toBeNull();
    expect(entry?.composioAction).toBe("GMAIL_SEND_EMAIL");
    expect(entry?.defaultRisk).toBe("medium");
  });

  it("returns null from lookupCatalogEntry for unknown tools", () => {
    expect(lookupCatalogEntry("nonexistent.tool")).toBeNull();
  });

  it("dispatchTool rejects unknown tools with a populated trace", async () => {
    const outcome = await dispatchTool(
      { toolName: "nonexistent.tool", params: {} },
      { userId: "test-user", conversationId: "test-conv" },
    );
    expect(outcome.decision).toBe("rejected");
    if (outcome.decision === "rejected") {
      expect(outcome.message).toContain("Unknown tool");
    }
    expect(outcome.trace.toolName).toBe("nonexistent.tool");
    expect(outcome.trace.decision).toBe("rejected");
    expect(outcome.trace.error).toBe("unknown_tool");
    expect(outcome.trace.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("dispatchTool returns not_configured when COMPOSIO_API_KEY is absent", async () => {
    // Test environment doesn't set COMPOSIO_API_KEY → NoOpComposioService is used.
    const outcome = await dispatchTool(
      {
        toolName: "gmail.send",
        params: { to: "test@example.com", subject: "Hi", body: "Test" },
      },
      { userId: "test-user", conversationId: "test-conv" },
    );
    expect(outcome.decision).toBe("not_configured");
    expect(outcome.trace.decision).toBe("not_configured");
    expect(outcome.trace.error).toBe("composio_not_configured");
    expect(outcome.trace.toolName).toBe("gmail.send");
    expect(outcome.trace.riskLevel).toBe("medium");
  });

  it("buildCascadeTools returns a tool registry plus a getTraces side-channel", () => {
    const bundle = buildCascadeTools({
      userId: "test-user",
      conversationId: "test-conv",
    });
    expect(typeof bundle.tools).toBe("object");
    expect(Object.keys(bundle.tools).length).toBe(TOOL_CATALOG.length);
    for (const entry of TOOL_CATALOG) {
      expect(bundle.tools[entry.id]).toBeDefined();
    }
    // Trace collector starts empty.
    expect(bundle.getTraces()).toEqual([]);
  });

  it("buildCascadeTools traces are captured when execute is invoked", async () => {
    const bundle = buildCascadeTools({
      userId: "test-user",
      conversationId: "test-conv",
    });
    const gmailTool = bundle.tools["gmail.send"];
    expect(gmailTool).toBeDefined();
    expect(typeof gmailTool.execute).toBe("function");
    // Invoke execute as the AI SDK would — pass parsed params.
    // execute() requires a ToolExecutionOptions arg in newer SDK versions;
    // we cast loosely because this test only verifies trace capture.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (gmailTool.execute as any)({
      to: "test@example.com",
      subject: "Hi",
      body: "Test",
    });
    expect(result).toBeDefined();
    expect(bundle.getTraces().length).toBe(1);
    expect(bundle.getTraces()[0].toolName).toBe("gmail.send");
    expect(bundle.getTraces()[0].decision).toBe("not_configured");
  });
});
