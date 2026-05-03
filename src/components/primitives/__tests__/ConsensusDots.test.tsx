// @vitest-environment jsdom

/**
 * `ConsensusDots` — unit tests (Track C Session 15).
 *
 * Coverage:
 * - Renders the requested total of dots.
 * - Out-of-range `n` clamps to [0, total].
 * - Floats round down (3.7 → 3).
 * - Default total is 5 per the design contract.
 * - Custom `label` override.
 * - `data-consensus` attribute reflects the clamped state.
 * - `role="img"` with `aria-label` for screen readers (no per-dot
 *   ARIA noise).
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ConsensusDots } from "../ConsensusDots";

describe("ConsensusDots", () => {
  it("renders 5 dots by default", () => {
    const { container } = render(<ConsensusDots n={3} />);
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(5);
  });

  it("renders the requested total when overridden", () => {
    const { container } = render(<ConsensusDots n={2} total={7} />);
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(7);
  });

  it("reflects the filled count via data-consensus", () => {
    render(<ConsensusDots n={3} />);
    expect(
      screen.getByRole("img").getAttribute("data-consensus"),
    ).toBe("3/5");
  });

  it("clamps n above total", () => {
    render(<ConsensusDots n={10} total={5} />);
    expect(
      screen.getByRole("img").getAttribute("data-consensus"),
    ).toBe("5/5");
  });

  it("clamps negative n to 0", () => {
    render(<ConsensusDots n={-2} />);
    expect(
      screen.getByRole("img").getAttribute("data-consensus"),
    ).toBe("0/5");
  });

  it("rounds floats down via floor", () => {
    render(<ConsensusDots n={3.9} />);
    expect(
      screen.getByRole("img").getAttribute("data-consensus"),
    ).toBe("3/5");
  });

  it("uses a default accessible label", () => {
    render(<ConsensusDots n={2} />);
    expect(screen.getByLabelText("2 of 5 sources agree")).toBeTruthy();
  });

  it("respects a custom label override", () => {
    render(<ConsensusDots n={4} label="four reviewers signed off" />);
    expect(screen.getByLabelText("four reviewers signed off")).toBeTruthy();
  });
});
