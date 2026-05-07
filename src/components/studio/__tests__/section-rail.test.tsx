/**
 * @vitest-environment jsdom
 *
 * Smoke + interaction tests for the four S17 left-rail components:
 * `SectionNav`, `FrameworksPanel`, `PlanSectionNav`, `DocumentTree`.
 *
 * Pattern matches the calendar smoke tests (CalendarView.test.tsx etc.) —
 * jsdom magic comment + render + a few assertions about ARIA + click
 * behaviour. Pure-function logic is unit-tested elsewhere
 * (`scoring.test.ts`); UI tests cover the interaction contract.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { SectionNav } from "../SectionNav";
import { FrameworksPanel } from "../FrameworksPanel";
import { PlanSectionNav } from "../PlanSectionNav";
import { DocumentTree } from "../DocumentTree";

describe("SectionNav", () => {
  it("renders 4 sections with their counts", () => {
    render(
      <SectionNav
        active="pitch"
        onChange={() => {}}
        counts={{ pitch: 5, plan: 16, documents: 65 }}
      />,
    );
    expect(screen.getByRole("navigation", { name: /Section navigation/i })).toBeInTheDocument();
    expect(screen.getByText("Pitch Decks")).toBeInTheDocument();
    expect(screen.getByText("Business Plans")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getByText("65")).toBeInTheDocument();
  });

  it("marks the active section with aria-current and fires onChange on click", () => {
    const onChange = vi.fn();
    render(
      <SectionNav
        active="plan"
        onChange={onChange}
        counts={{ pitch: 0, plan: 16, documents: 65 }}
      />,
    );
    /* aria-current attaches to the active button. */
    const activeButton = screen.getByRole("button", { name: /Business Plans/i });
    expect(activeButton).toHaveAttribute("aria-current", "page");

    /* Click another section. */
    const documentsButton = screen.getByRole("button", { name: /^Documents/i });
    fireEvent.click(documentsButton);
    expect(onChange).toHaveBeenCalledWith("documents");
  });
});

describe("FrameworksPanel", () => {
  it("renders 14 frameworks", () => {
    render(<FrameworksPanel active={new Set()} onToggle={() => {}} />);
    /* Spot-check three names from the static FRAMEWORKS data. */
    expect(screen.getByText("Airbnb")).toBeInTheDocument();
    expect(screen.getByText("Sequoia")).toBeInTheDocument();
    expect(screen.getByText("London AI Doc Engine")).toBeInTheDocument();
    /* All 14 button rows. */
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(14);
  });

  it("fires onToggle with the framework id when clicked", () => {
    const onToggle = vi.fn();
    render(<FrameworksPanel active={new Set([5])} onToggle={onToggle} />);
    /* `Sequoia` is id 5 — already active per the prop. Click should emit
     * the same id (caller decides whether to add or remove). */
    const sequoia = screen.getByText("Sequoia").closest("button")!;
    expect(sequoia).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(sequoia);
    expect(onToggle).toHaveBeenCalledWith(5);
  });

  it("does not show confidence numbers for inactive frameworks", () => {
    render(<FrameworksPanel active={new Set([1])} onToggle={() => {}} />);
    /* Airbnb (id 1) active → conf 97 visible. Sequoia inactive → no 99. */
    expect(screen.getByText("97")).toBeInTheDocument();
    expect(screen.queryByText("99")).not.toBeInTheDocument();
  });
});

describe("PlanSectionNav", () => {
  it("renders 16 plan sections", () => {
    render(<PlanSectionNav active={0} onSelect={() => {}} />);
    expect(screen.getByText("Executive Summary")).toBeInTheDocument();
    expect(screen.getByText("London Ecosystem Fit")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(16);
  });

  it("fires onSelect with the index when a section is clicked", () => {
    const onSelect = vi.fn();
    render(<PlanSectionNav active={0} onSelect={onSelect} />);
    /* Click "Solution" — index 3 in PLAN_SECTIONS. */
    fireEvent.click(screen.getByText("Solution").closest("button")!);
    expect(onSelect).toHaveBeenCalledWith(3);
  });
});

describe("DocumentTree", () => {
  it("renders 10 categories with their doc counts", () => {
    render(
      <DocumentTree
        expanded={new Set()}
        onToggleCategory={() => {}}
        activeDoc={null}
        onSelectDoc={() => {}}
      />,
    );
    expect(screen.getByRole("tree", { name: /Document categories/i })).toBeInTheDocument();
    expect(screen.getByText("Investor & Fundraising")).toBeInTheDocument();
    expect(screen.getByText("Strategic & Exit")).toBeInTheDocument();
    /* 10 category buttons, all closed → no doc rows visible. */
    const categoryButtons = screen.getAllByRole("button");
    expect(categoryButtons).toHaveLength(10);
  });

  it("expands a category to show docs and fires onSelectDoc on click", () => {
    const onSelectDoc = vi.fn();
    render(
      <DocumentTree
        expanded={new Set(["investor"])}
        onToggleCategory={() => {}}
        activeDoc={null}
        onSelectDoc={onSelectDoc}
      />,
    );
    /* Investor category expanded → 9 doc names visible. */
    expect(screen.getByText("Investor Pitch Deck")).toBeInTheDocument();
    expect(screen.getByText("Cap Table")).toBeInTheDocument();

    /* Click a doc — fires with category + doc name. */
    fireEvent.click(screen.getByText("Cap Table").closest("button")!);
    expect(onSelectDoc).toHaveBeenCalledWith("investor", "Cap Table");
  });

  it("toggles a category via onToggleCategory when its row is clicked", () => {
    const onToggle = vi.fn();
    render(
      <DocumentTree
        expanded={new Set()}
        onToggleCategory={onToggle}
        activeDoc={null}
        onSelectDoc={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Legal & Governance").closest("button")!);
    expect(onToggle).toHaveBeenCalledWith("legal");
  });
});
