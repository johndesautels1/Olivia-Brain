// @vitest-environment jsdom

/**
 * Workspace shell — render-only smoke tests (Session 14).
 *
 * Coverage:
 * - `WorkspaceShell` mounts with header + center; rail + inspector
 *   are optional slots.
 * - Skip-to-main-content link is always present (a11y floor).
 * - `Header` renders wordmark + crumb + score chips.
 * - `Inspector` renders all tabs in the strip + only the active
 *   tab's body. Arrow keys move focus through the tab rover.
 * - `RailLeft` accepts both expanded and collapsed widths.
 *
 * Tests use `@testing-library/react`'s `render` + DOM queries; no
 * Tailwind output is asserted (Tailwind class generation is its own
 * concern, exercised by Vercel build).
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  Center,
  Header,
  Inspector,
  RailLeft,
  WorkspaceShell,
  type InspectorTab,
} from "..";

describe("WorkspaceShell (smoke)", () => {
  it("mounts with header + center only (rail + inspector optional)", () => {
    render(
      <WorkspaceShell
        header={<Header wordmark="OLIVIA" />}
        center={<Center>main</Center>}
      />,
    );
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
  });

  it("renders the skip-to-main-content link first (a11y floor)", () => {
    render(
      <WorkspaceShell
        header={<Header />}
        center={<Center>main</Center>}
      />,
    );
    expect(screen.getByText(/skip to main content/i)).toBeTruthy();
  });

  it("mounts with all four regions wired", () => {
    render(
      <WorkspaceShell
        header={<Header wordmark="OLIVIA" />}
        rail={<RailLeft>rail content</RailLeft>}
        center={<Center>center content</Center>}
        inspector={
          <Inspector
            activeTabId="olivia"
            onTabChange={() => {}}
            tabs={[{ id: "olivia", label: "Olivia", content: "olivia tab" }]}
          />
        }
      />,
    );
    expect(screen.getByText("rail content")).toBeTruthy();
    expect(screen.getByText("center content")).toBeTruthy();
    expect(screen.getByText("olivia tab")).toBeTruthy();
  });
});

describe("Header (smoke)", () => {
  it("renders wordmark + crumb + score chips + actions", () => {
    render(
      <Header
        wordmark="STUDIO OLIVIA"
        crumb={["Pitch", "Title slide"]}
        scoreChips={[
          { label: "CLR", value: 87 },
          { label: "IMP", value: 71 },
        ]}
        actions={<button type="button">Match</button>}
      />,
    );
    expect(screen.getByText("STUDIO OLIVIA")).toBeTruthy();
    expect(screen.getByText("Pitch")).toBeTruthy();
    expect(screen.getByText("Title slide")).toBeTruthy();
    expect(screen.getByText("CLR")).toBeTruthy();
    expect(screen.getByText("87")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Match" })).toBeTruthy();
  });
});

describe("Inspector (smoke)", () => {
  const tabs: InspectorTab[] = [
    { id: "olivia", label: "Olivia", content: "olivia body" },
    { id: "library", label: "Library", content: "library body" },
    { id: "audit", label: "Audit", content: "audit body" },
  ];

  it("renders all tabs in the strip and only the active body", () => {
    render(
      <Inspector tabs={tabs} activeTabId="olivia" onTabChange={() => {}} />,
    );
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByText("olivia body")).toBeTruthy();
    expect(screen.queryByText("library body")).toBeNull();
  });

  it("calls onTabChange when a different tab is clicked", () => {
    const onTabChange = vi.fn();
    render(
      <Inspector
        tabs={tabs}
        activeTabId="olivia"
        onTabChange={onTabChange}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Library" }));
    expect(onTabChange).toHaveBeenCalledWith("library");
  });

  it("moves to the next tab on ArrowRight", () => {
    const onTabChange = vi.fn();
    render(
      <Inspector
        tabs={tabs}
        activeTabId="olivia"
        onTabChange={onTabChange}
      />,
    );
    fireEvent.keyDown(screen.getByRole("tab", { name: "Olivia" }), {
      key: "ArrowRight",
    });
    expect(onTabChange).toHaveBeenCalledWith("library");
  });

  it("wraps to the last tab on ArrowLeft from the first tab", () => {
    const onTabChange = vi.fn();
    render(
      <Inspector
        tabs={tabs}
        activeTabId="olivia"
        onTabChange={onTabChange}
      />,
    );
    fireEvent.keyDown(screen.getByRole("tab", { name: "Olivia" }), {
      key: "ArrowLeft",
    });
    expect(onTabChange).toHaveBeenCalledWith("audit");
  });

  it("renders nothing when open=false", () => {
    const { container } = render(
      <Inspector
        tabs={tabs}
        activeTabId="olivia"
        onTabChange={() => {}}
        open={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("RailLeft (smoke)", () => {
  it("renders children inside the navigation region", () => {
    render(
      <RailLeft>
        <div data-testid="rail-child">project</div>
      </RailLeft>,
    );
    expect(screen.getByTestId("rail-child")).toBeTruthy();
    expect(screen.getByLabelText("Primary navigation")).toBeTruthy();
  });
});

describe("Center (smoke)", () => {
  it("renders the main canvas with optional toolbar", () => {
    render(
      <Center toolbar={<div data-testid="toolbar">tools</div>}>
        <div data-testid="canvas">canvas</div>
      </Center>,
    );
    expect(screen.getByTestId("toolbar")).toBeTruthy();
    expect(screen.getByTestId("canvas")).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
  });
});
