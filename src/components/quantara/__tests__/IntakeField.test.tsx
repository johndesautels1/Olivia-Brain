// @vitest-environment jsdom

/**
 * `IntakeField` — control-dispatch tests.
 *
 * Coverage:
 * - Currency control renders a `£` prefix and emits a Number.
 * - Percent / integer / number controls coerce string → number.
 * - Empty string clears the value (callers never persist `""`).
 * - Score-1-10 control renders a slider with the value badge.
 * - Text control passes raw string through.
 * - Select controls render the documented option list.
 * - Critical-weight fields surface the `*` indicator.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { IntakeField } from "../IntakeField";

describe("IntakeField — currency-gbp", () => {
  it("renders the £ prefix and emits a number on change", () => {
    const onChange = vi.fn();
    render(<IntakeField fieldId="f1" value={undefined} onChange={onChange} />);
    expect(screen.getByText("£")).toBeTruthy();
    const input = screen.getByLabelText("Annual Recurring Revenue (ARR)") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2450000" } });
    expect(onChange).toHaveBeenCalledWith(2_450_000);
  });

  it("emits undefined when cleared (does not persist empty string)", () => {
    const onChange = vi.fn();
    render(<IntakeField fieldId="f1" value={2_450_000} onChange={onChange} />);
    const input = screen.getByLabelText("Annual Recurring Revenue (ARR)") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});

describe("IntakeField — percent / number / integer", () => {
  it("percent control coerces string → number", () => {
    const onChange = vi.fn();
    render(<IntakeField fieldId="f3" value={undefined} onChange={onChange} />);
    const input = screen.getByLabelText("Revenue Growth Rate YoY") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "127" } });
    expect(onChange).toHaveBeenCalledWith(127);
  });

  it("integer control truncates a decimal entry", () => {
    const onChange = vi.fn();
    render(<IntakeField fieldId="f17" value={undefined} onChange={onChange} />);
    const input = screen.getByLabelText("Shares Outstanding (fully diluted)") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12450000.7" } });
    expect(onChange).toHaveBeenCalledWith(12_450_000);
  });
});

describe("IntakeField — score-1-10", () => {
  it("renders a slider and its value badge", () => {
    const onChange = vi.fn();
    render(<IntakeField fieldId="f39" value={8} onChange={onChange} />);
    const slider = screen.getByLabelText("Network Effects Score (self-assessed)") as HTMLInputElement;
    expect(slider.type).toBe("range");
    expect(slider.value).toBe("8");
    expect(screen.getByText("8")).toBeTruthy();
  });

  it("emits the new score on slider change", () => {
    const onChange = vi.fn();
    render(<IntakeField fieldId="f39" value={8} onChange={onChange} />);
    const slider = screen.getByLabelText("Network Effects Score (self-assessed)") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "10" } });
    expect(onChange).toHaveBeenCalledWith(10);
  });
});

describe("IntakeField — text", () => {
  it("passes raw string through on change", () => {
    const onChange = vi.fn();
    render(<IntakeField fieldId="f36" value="" onChange={onChange} />);
    const input = screen.getByLabelText("Proprietary Dataset Size") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2.8M records" } });
    expect(onChange).toHaveBeenCalledWith("2.8M records");
  });

  it("clears to undefined when emptied (does not persist empty string)", () => {
    const onChange = vi.fn();
    /* Mount with a populated value so React's controlled-input behavior
       fires the onChange when the user clears the field. */
    render(
      <IntakeField
        fieldId="f36"
        value="2.8M records"
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Proprietary Dataset Size") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});

describe("IntakeField — selects", () => {
  it("Last Round Type lists every documented option", () => {
    render(<IntakeField fieldId="f21" value="" onChange={() => {}} />);
    /* Select element renders <option> children. The select itself
       carries the field label. */
    const select = screen.getByLabelText("Last Round Type") as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll("option")).map(
      (o) => o.value,
    );
    expect(options).toEqual([
      "",
      "Pre-Seed",
      "Seed",
      "Series A",
      "Series B",
      "Series C+",
      "Bridge",
    ]);
  });

  it("Target Round Type lists every documented option", () => {
    render(<IntakeField fieldId="f23" value="" onChange={() => {}} />);
    const select = screen.getByLabelText("Target Round Type") as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll("option")).map(
      (o) => o.value,
    );
    expect(options).toEqual([
      "",
      "Seed",
      "Series A",
      "Series B",
      "Series C",
      "Growth",
      "Strategic",
    ]);
  });
});

describe("IntakeField — critical weight indicator", () => {
  it("shows the critical hint only when the field has weight 3", () => {
    render(<IntakeField fieldId="f1" value={undefined} onChange={() => {}} />);
    /* f1 ARR is weight 3 (critical) */
    expect(screen.getByText(/Critical for valuation/)).toBeTruthy();
  });

  it("does not show the critical hint for non-critical fields", () => {
    render(<IntakeField fieldId="f34" value={undefined} onChange={() => {}} />);
    /* f34 patentsFiled is weight 1 (helper) */
    expect(screen.queryByText(/Critical for valuation/)).toBeNull();
  });
});
