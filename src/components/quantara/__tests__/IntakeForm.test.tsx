// @vitest-environment jsdom

/**
 * `IntakeForm` — top-level orchestrator smoke tests.
 *
 * Coverage:
 * - Mounts the workspace shell with header, rail, center, inspector.
 * - Hero shows the company-name input and the 56-field summary chips.
 * - Editing a field updates the header completeness chip.
 * - Save with no company name surfaces an inline error.
 * - Save POSTs to /api/founder-intake and shows the "Saved ✓" state.
 *
 * `fetch` is stubbed via `vi.stubGlobal` per test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { IntakeForm } from "../IntakeForm";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          subjectId: "subj-123",
          completenessScore: 5,
          fieldsFilled: 1,
          fieldsTotal: 56,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("IntakeForm (smoke)", () => {
  it("mounts the workspace shell with all four regions", () => {
    render(<IntakeForm />);
    expect(screen.getByRole("banner")).toBeTruthy(); // Header
    expect(screen.getByLabelText("Founder intake sections")).toBeTruthy(); // RailLeft
    expect(screen.getByRole("main")).toBeTruthy(); // Center
    expect(screen.getByRole("tab", { name: "Olivia" })).toBeTruthy(); // Inspector
  });

  it("renders the hero with title + company-name input", () => {
    render(<IntakeForm />);
    expect(screen.getByRole("heading", { name: /Valuation Data Profile/i })).toBeTruthy();
    expect(screen.getByLabelText(/Company name/i)).toBeTruthy();
  });

  it("starts at 0/56 fields filled and 0% complete", () => {
    render(<IntakeForm />);
    expect(screen.getAllByText(/0\s*\/\s*56/).length).toBeGreaterThan(0);
    /* Several "0%" badges exist (one per section + the overall card). */
    expect(screen.getAllByText(/0%/).length).toBeGreaterThan(0);
  });

  it("blocks save when company name is empty and surfaces an alert", async () => {
    render(<IntakeForm />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent ?? "").toMatch(/Company name is required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("POSTs the values + companyName to /api/founder-intake on save", async () => {
    render(<IntakeForm />);
    fireEvent.change(screen.getByLabelText(/Company name/i), {
      target: { value: "Quantara Ltd" },
    });
    fireEvent.change(
      screen.getByLabelText("Annual Recurring Revenue (ARR)"),
      { target: { value: "2450000" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/founder-intake");
    expect((init as RequestInit).method).toBe("POST");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.companyName).toBe("Quantara Ltd");
    expect(body.values.f1).toBe(2_450_000);

    /* Saved state surfaces the success label. */
    expect(
      await screen.findByRole("button", { name: /Saved/ }),
    ).toBeTruthy();
  });

  it("switches to the Verdict tab and surfaces the preview math", async () => {
    render(<IntakeForm />);
    fireEvent.change(
      screen.getByLabelText("Annual Recurring Revenue (ARR)"),
      { target: { value: "2450000" } },
    );
    fireEvent.click(screen.getByRole("tab", { name: "Verdict" }));
    expect(await screen.findByText(/Live Valuation Preview/i)).toBeTruthy();
    /* Compact GBP formatting renders the base + estimated-ARR + low/high
       values. Just assert at least one £ + M render is on screen. */
    const gbpMatches = screen.getAllByText(/£.*M/);
    expect(gbpMatches.length).toBeGreaterThan(0);
  });
});
