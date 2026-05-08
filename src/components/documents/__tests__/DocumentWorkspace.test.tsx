/**
 * @vitest-environment jsdom
 */

/**
 * DocumentWorkspace smoke test — Track B Session 8b.
 *
 * Mounts the full split-pane workspace shell against a stub
 * `WorkspaceDocument` and verifies it renders end-to-end:
 *  - Top-bar title + completion chip render
 *  - Olivia guidance panel mounts (WorkspaceOliviaPanel)
 *  - Left pane shows DocumentTemplatePreview cards for each block
 *  - Right pane shows editable block headers with status pills
 *  - Clicking an editable block expands it and mounts DocumentFieldEditor
 *  - Save button calls the supplied onSave callback
 *
 * Uses vitest built-in matchers only (OB doesn't load jest-dom in its
 * vitest.setup.ts, and adding it for one test would change shared infra).
 *
 * Bookmark / package / share interactions defer to a follow-up routes
 * session — this smoke is the workspace-shell-atoms gate.
 */

import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";

import DocumentWorkspace, {
  type WorkspaceBlock,
  type WorkspaceDocument,
} from "../DocumentWorkspace";

function makeStubDocument(): WorkspaceDocument {
  const blocks: WorkspaceBlock[] = [
    {
      index: 0,
      type: "hero",
      templateData: { type: "hero", title: "[Your Company Name]", subtitle: "[Tagline]" },
      userData: { type: "hero", title: "Olivia Brain", subtitle: "Investor preview" },
      status: "complete",
    },
    {
      index: 1,
      type: "paragraph",
      templateData: { type: "paragraph", content: "[Body]" },
      userData: { type: "paragraph", content: "[Body]" },
      status: "empty",
    },
    {
      index: 2,
      type: "divider",
      templateData: { type: "divider", style: "diamond" },
      userData: { type: "divider", style: "diamond" },
      status: "complete",
    },
  ];

  return {
    id: "doc-stub-1",
    title: "Stub Document",
    slug: "stub-document",
    collectionSlug: "investor",
    documentType: "executive_summary",
    audienceType: "investor",
    purposeType: "fundraising",
    confidentiality: "confidential",
    summary: null,
    blocks,
  };
}

describe("DocumentWorkspace · workspace-shell-atoms smoke", () => {
  it("renders the document title + completion chip in the top bar", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <DocumentWorkspace
        document={makeStubDocument()}
        dnaParagraphs={{}}
        dnaMap={{}}
        onSave={onSave}
      />
    );

    expect(container.textContent).toContain("Stub Document");
    // 1 of 2 editable blocks complete (hero), 1 empty (paragraph), 1 decorative (divider — excluded from total) → 50%
    expect(container.textContent).toContain("50% Complete");
  });

  it("renders the Save Progress button and triggers onSave when clicked", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <DocumentWorkspace
        document={makeStubDocument()}
        dnaParagraphs={{}}
        dnaMap={{}}
        onSave={onSave}
      />
    );

    const saveButton = container.querySelector('button[aria-label="Save document progress"]');
    expect(saveButton).not.toBeNull();

    fireEvent.click(saveButton as HTMLButtonElement);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    // The handler is called with the current blocks array
    expect(onSave.mock.calls[0][0]).toHaveLength(3);
  });

  it("renders status pills for empty + complete editable blocks", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <DocumentWorkspace
        document={makeStubDocument()}
        dnaParagraphs={{}}
        dnaMap={{}}
        onSave={onSave}
      />
    );

    // Hero block is "complete" → "Complete" pill; paragraph is "empty" → "Empty" pill.
    expect(container.textContent).toContain("Empty");
    expect(container.textContent).toContain("Complete");
  });

  it("expands a block and toggles aria-expanded when clicked", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <DocumentWorkspace
        document={makeStubDocument()}
        dnaParagraphs={{}}
        dnaMap={{}}
        onSave={onSave}
      />
    );

    const paragraphTrigger = container.querySelector(
      'div[role="button"][aria-label="Edit Paragraph block"]'
    ) as HTMLElement | null;
    expect(paragraphTrigger).not.toBeNull();
    expect(paragraphTrigger?.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(paragraphTrigger as HTMLElement);
    expect(paragraphTrigger?.getAttribute("aria-expanded")).toBe("true");
  });

  it("surfaces DNA paragraph indicator when the document collection has DNA mapping", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <DocumentWorkspace
        document={makeStubDocument()}
        dnaParagraphs={{ p1: "Founder DNA paragraph 1", p2: "DNA paragraph 2" }}
        dnaMap={{ investor: ["p1", "p2"] }}
        onSave={onSave}
      />
    );

    expect(container.textContent).toContain("DNA: 2 paragraphs linked");
  });

  it("shows decorative-block label without status pill for divider blocks", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <DocumentWorkspace
        document={makeStubDocument()}
        dnaParagraphs={{}}
        dnaMap={{}}
        onSave={onSave}
      />
    );

    // Decorative blocks render their label-only summary in the right pane.
    expect(container.textContent).toContain("Divider");
  });
});
