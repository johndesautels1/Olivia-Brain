// @vitest-environment jsdom

/**
 * `IntakeField` — Q4 discrepancy-row tests.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { IntakeField } from "../IntakeField";
import type { QuantaraDiscrepancyGap } from "@/lib/quantara/discrepancy";

const SAMPLE_DISCREPANCY: QuantaraDiscrepancyGap = {
  fieldId: "f1",
  manualValue: 2_500_000,
  referenceValue: 2_000_000,
  gapPct: 25,
  direction: "optimistic",
  source: "stripe",
  sourceLabel: "Stripe-derived",
};

describe("IntakeField — discrepancy row", () => {
  it("does NOT render the discrepancy row when value is empty", () => {
    render(
      <IntakeField
        fieldId="f1"
        value={undefined}
        onChange={() => {}}
        discrepancy={SAMPLE_DISCREPANCY}
      />,
    );
    /* Only renders after the founder has typed something — empty value
       gates the chip. */
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the discrepancy row once a value is present", () => {
    render(
      <IntakeField
        fieldId="f1"
        value={2_500_000}
        onChange={() => {}}
        discrepancy={SAMPLE_DISCREPANCY}
      />,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Stripe-derived/)).toBeTruthy();
    expect(screen.getByText(/25% gap/)).toBeTruthy();
  });

  it("surfaces both the manual value and the reference value", () => {
    render(
      <IntakeField
        fieldId="f1"
        value={2_500_000}
        onChange={() => {}}
        discrepancy={SAMPLE_DISCREPANCY}
      />,
    );
    /* Compact GBP — "2.5M" + "2M" should both appear in the chip. */
    expect(screen.getByText(/you:.*2\.5M/)).toBeTruthy();
    expect(screen.getByText(/api:.*2M/)).toBeTruthy();
  });

  it("calls onTrustReference when 'Trust API' is clicked", () => {
    const onTrust = vi.fn();
    render(
      <IntakeField
        fieldId="f1"
        value={2_500_000}
        onChange={() => {}}
        discrepancy={SAMPLE_DISCREPANCY}
        onTrustReference={onTrust}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Trust the API value/i }));
    expect(onTrust).toHaveBeenCalledTimes(1);
  });

  it("calls onDismissDiscrepancy when 'Keep mine' is clicked", () => {
    const onDismiss = vi.fn();
    render(
      <IntakeField
        fieldId="f1"
        value={2_500_000}
        onChange={() => {}}
        discrepancy={SAMPLE_DISCREPANCY}
        onDismissDiscrepancy={onDismiss}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Keep my value/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("uses different copy for optimistic vs pessimistic gaps", () => {
    const { rerender } = render(
      <IntakeField
        fieldId="f1"
        value={2_500_000}
        onChange={() => {}}
        discrepancy={SAMPLE_DISCREPANCY}
      />,
    );
    expect(screen.getByText(/rosier than the API/i)).toBeTruthy();

    rerender(
      <IntakeField
        fieldId="f1"
        value={1_500_000}
        onChange={() => {}}
        discrepancy={{
          ...SAMPLE_DISCREPANCY,
          manualValue: 1_500_000,
          direction: "pessimistic",
        }}
      />,
    );
    expect(screen.getByText(/harsher than the API/i)).toBeTruthy();
  });
});
