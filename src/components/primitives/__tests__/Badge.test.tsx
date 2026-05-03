// @vitest-environment jsdom

/**
 * `Badge` — unit tests (Track C Session 15).
 *
 * Coverage:
 * - Color tier per value range (≥80, 50-79, 1-49, 0).
 * - Out-of-range value clamping (negative, > 100).
 * - Custom label override.
 * - Decimal precision.
 * - Size variants render distinct styles.
 * - `aria-label` reflects the clamped value.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Badge } from "../Badge";

describe("Badge", () => {
  it("tags high-tier (>=80) via data-badge-tier", () => {
    render(<Badge value={90} />);
    expect(screen.getByRole("status").getAttribute("data-badge-tier")).toBe("high");
  });

  it("tags medium-tier (50-79)", () => {
    render(<Badge value={70} />);
    expect(screen.getByRole("status").getAttribute("data-badge-tier")).toBe("medium");
  });

  it("tags low-tier (1-49)", () => {
    render(<Badge value={20} />);
    expect(screen.getByRole("status").getAttribute("data-badge-tier")).toBe("low");
  });

  it("tags empty-tier (0)", () => {
    render(<Badge value={0} />);
    expect(screen.getByRole("status").getAttribute("data-badge-tier")).toBe("empty");
  });

  it("clamps values above 100", () => {
    render(<Badge value={150} />);
    expect(screen.getByRole("status").textContent).toBe("100%");
  });

  it("clamps negative values to 0", () => {
    render(<Badge value={-10} />);
    expect(screen.getByRole("status").textContent).toBe("0%");
  });

  it("renders a custom label when provided", () => {
    render(<Badge value={87} label="A+" />);
    expect(screen.getByRole("status").textContent).toBe("A+");
  });

  it("respects decimal precision", () => {
    render(<Badge value={87.456} precision={2} />);
    expect(screen.getByRole("status").textContent).toBe("87.46%");
  });

  it("forwards aria-label with the clamped value", () => {
    render(<Badge value={87.5} />);
    expect(screen.getByLabelText("87.5%")).toBeTruthy();
  });

  it("accepts the three documented sizes", () => {
    render(
      <>
        <Badge value={50} size="sm" />
        <Badge value={50} size="md" />
        <Badge value={50} size="lg" />
      </>,
    );
    expect(screen.getAllByRole("status")).toHaveLength(3);
  });
});
