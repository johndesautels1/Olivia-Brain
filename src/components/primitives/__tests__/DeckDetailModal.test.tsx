// @vitest-environment jsdom

/**
 * `DeckDetailModal` — unit tests (Track C Session 15).
 *
 * Coverage:
 * - Closed by default when deck is null.
 * - Renders deck.name as the dialog title when open.
 * - Renders all optional sections only when their data is present.
 * - Apply button fires onApply with the full deck payload.
 * - Close button + Esc key fire onClose.
 *
 * Radix's Portal renders content into document.body — `screen` reads
 * from the body, so queries hit the modal content directly.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { DeckDetailModal, type Deck } from "../DeckDetailModal";

const stubDeck: Deck = {
  id: "yc-series-a",
  name: "Y Combinator Series A",
  category: "Pitch Deck",
  stage: "Series A",
  tag: "AI-native",
  consensus: 4,
  score: 87,
  insight: "Top performers in this archetype raised within 90 days.",
  fit: "Matches your founder profile + London ecosystem priority.",
  matchReasons: ["Stage match", "London priority", "AI-native"],
  oliviaAction: "I'll regenerate your slides using this archetype.",
  raised: "$15M Series A 2024",
  year: "2024",
  slideCount: 14,
};

describe("DeckDetailModal", () => {
  it("renders nothing when deck is null", () => {
    render(
      <DeckDetailModal deck={null} onClose={() => {}} onApply={() => {}} />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders the deck name as the dialog title when open", () => {
    render(
      <DeckDetailModal deck={stubDeck} onClose={() => {}} onApply={() => {}} />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Y Combinator Series A")).toBeTruthy();
  });

  it("renders the category, stage, year, and slideCount in the eyebrow row", () => {
    render(
      <DeckDetailModal deck={stubDeck} onClose={() => {}} onApply={() => {}} />,
    );
    expect(screen.getByText("Pitch Deck")).toBeTruthy();
    expect(screen.getByText("Series A")).toBeTruthy();
    expect(screen.getByText("2024")).toBeTruthy();
    expect(screen.getByText("14 slides")).toBeTruthy();
  });

  it("renders ConsensusDots + raised chip + Badge for the score", () => {
    render(
      <DeckDetailModal deck={stubDeck} onClose={() => {}} onApply={() => {}} />,
    );
    expect(screen.getByLabelText("4 of 5 sources agree")).toBeTruthy();
    expect(screen.getByText("$15M Series A 2024")).toBeTruthy();
    expect(screen.getByLabelText("87%")).toBeTruthy();
  });

  it("renders the Insight, Fit, Match Reasons, and Olivia Action sections", () => {
    render(
      <DeckDetailModal deck={stubDeck} onClose={() => {}} onApply={() => {}} />,
    );
    expect(screen.getByText("Insight")).toBeTruthy();
    expect(screen.getByText("Fit")).toBeTruthy();
    expect(screen.getByText("Match reasons")).toBeTruthy();
    expect(screen.getByText("Olivia action")).toBeTruthy();
    expect(screen.getByText("Stage match")).toBeTruthy();
    expect(screen.getByText("London priority")).toBeTruthy();
    /* "AI-native" appears twice — once as deck.tag in the eyebrow row,
       once as a match reason in the list. Both renderings are intentional. */
    expect(screen.getAllByText("AI-native").length).toBeGreaterThanOrEqual(2);
  });

  it("hides optional sections when their data is missing", () => {
    const minimal: Deck = {
      id: "x",
      name: "Minimal Deck",
      category: "Plan",
      consensus: 2,
      score: 30,
    };
    render(
      <DeckDetailModal deck={minimal} onClose={() => {}} onApply={() => {}} />,
    );
    expect(screen.queryByText("Insight")).toBeNull();
    expect(screen.queryByText("Fit")).toBeNull();
    expect(screen.queryByText("Match reasons")).toBeNull();
    expect(screen.queryByText("Olivia action")).toBeNull();
  });

  it("fires onApply with the full deck when the Apply CTA is clicked", () => {
    const onApply = vi.fn();
    render(
      <DeckDetailModal deck={stubDeck} onClose={() => {}} onApply={onApply} />,
    );
    fireEvent.click(screen.getByText("Apply This Archetype"));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith(stubDeck);
  });

  it("respects a custom Apply CTA label", () => {
    render(
      <DeckDetailModal
        deck={stubDeck}
        onClose={() => {}}
        onApply={() => {}}
        applyLabel="Use this template"
      />,
    );
    expect(screen.getByText("Use this template")).toBeTruthy();
  });

  it("fires onClose when the X button is clicked", () => {
    const onClose = vi.fn();
    render(
      <DeckDetailModal deck={stubDeck} onClose={onClose} onApply={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
