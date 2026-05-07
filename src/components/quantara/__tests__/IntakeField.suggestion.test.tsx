// @vitest-environment jsdom

/**
 * `IntakeField` — Q3 suggestion-row tests.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { IntakeField } from "../IntakeField";
import type { QuantaraSuggestion } from "@/lib/quantara/auto-fill";

const SAMPLE_SUGGESTION: QuantaraSuggestion = {
  fieldId: "f1",
  value: 2_400_000,
  confidence: 0.85,
  source: {
    integration: "stripe",
    label: "Stripe-derived",
    fetchedAt: new Date().toISOString(),
    note: "ARR derived from MRR × 12",
    mockMode: false,
  },
};

describe("IntakeField — suggestion row", () => {
  it("renders the source label, value, and confidence", () => {
    render(
      <IntakeField
        fieldId="f1"
        value={undefined}
        onChange={() => {}}
        suggestion={SAMPLE_SUGGESTION}
      />,
    );
    expect(screen.getByText("Stripe-derived")).toBeTruthy();
    expect(screen.getByText("85% conf")).toBeTruthy();
    /* Compact GBP formatter renders "2.4M" — assert the digits land. */
    expect(screen.getByText(/2\.4M/)).toBeTruthy();
  });

  it("calls onAcceptSuggestion when ✓ Accept is clicked", () => {
    const onAccept = vi.fn();
    render(
      <IntakeField
        fieldId="f1"
        value={undefined}
        onChange={() => {}}
        suggestion={SAMPLE_SUGGESTION}
        onAcceptSuggestion={onAccept}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Accept/i }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("calls onRejectSuggestion when ✗ Reject is clicked", () => {
    const onReject = vi.fn();
    render(
      <IntakeField
        fieldId="f1"
        value={undefined}
        onChange={() => {}}
        suggestion={SAMPLE_SUGGESTION}
        onRejectSuggestion={onReject}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Reject/i }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("hides the suggestion row once the field has a value (manual override)", () => {
    render(
      <IntakeField
        fieldId="f1"
        value={1_000_000}
        onChange={() => {}}
        suggestion={SAMPLE_SUGGESTION}
      />,
    );
    expect(screen.queryByText("Stripe-derived")).toBeNull();
  });

  it("shows mock-mode in the note when the suggestion was mock-sourced", () => {
    const mockSuggestion: QuantaraSuggestion = {
      ...SAMPLE_SUGGESTION,
      source: { ...SAMPLE_SUGGESTION.source, mockMode: true },
    };
    render(
      <IntakeField
        fieldId="f1"
        value={undefined}
        onChange={() => {}}
        suggestion={mockSuggestion}
      />,
    );
    expect(screen.getByText(/mock-mode/)).toBeTruthy();
  });
});
