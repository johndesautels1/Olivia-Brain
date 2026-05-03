// @vitest-environment jsdom

/**
 * `CompletionRing` — unit tests (Track C Session 15).
 *
 * Coverage:
 * - Tier classification matches Badge (high/medium/low/empty).
 * - Renders an SVG with two circles (track + progress arc).
 * - Out-of-range value clamping.
 * - `aria-valuenow` / `aria-valuemin` / `aria-valuemax` set correctly.
 * - `showLabel` renders a centred label; default hides it.
 * - Custom label override.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { CompletionRing } from "../CompletionRing";

describe("CompletionRing", () => {
  it("tags high-tier via data-ring-tier", () => {
    render(<CompletionRing value={92} />);
    expect(
      screen.getByRole("progressbar").getAttribute("data-ring-tier"),
    ).toBe("high");
  });

  it("tags medium-tier", () => {
    render(<CompletionRing value={60} />);
    expect(
      screen.getByRole("progressbar").getAttribute("data-ring-tier"),
    ).toBe("medium");
  });

  it("tags low-tier", () => {
    render(<CompletionRing value={10} />);
    expect(
      screen.getByRole("progressbar").getAttribute("data-ring-tier"),
    ).toBe("low");
  });

  it("tags empty-tier when value is 0", () => {
    render(<CompletionRing value={0} />);
    expect(
      screen.getByRole("progressbar").getAttribute("data-ring-tier"),
    ).toBe("empty");
  });

  it("renders a track + progress SVG circle pair", () => {
    const { container } = render(<CompletionRing value={50} size={48} />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(2);
  });

  it("clamps values above 100", () => {
    render(<CompletionRing value={150} />);
    expect(
      Number(screen.getByRole("progressbar").getAttribute("aria-valuenow")),
    ).toBe(100);
  });

  it("clamps negative values to 0", () => {
    render(<CompletionRing value={-10} />);
    expect(
      Number(screen.getByRole("progressbar").getAttribute("aria-valuenow")),
    ).toBe(0);
  });

  it("has aria-valuemin=0 + aria-valuemax=100", () => {
    render(<CompletionRing value={50} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("hides the centre label by default", () => {
    const { container } = render(<CompletionRing value={50} size={48} />);
    expect(container.textContent?.trim()).toBe("");
  });

  it("renders the centre label when showLabel is true", () => {
    render(<CompletionRing value={73} size={48} showLabel />);
    expect(screen.getByText("73")).toBeTruthy();
  });

  it("renders a custom centre label override", () => {
    render(<CompletionRing value={73} size={48} showLabel label="A" />);
    expect(screen.getByText("A")).toBeTruthy();
  });
});
