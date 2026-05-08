// @vitest-environment jsdom

/**
 * `IntakeForm` — Q6 vertical-axis integration tests.
 *
 * Proves the wiring between `IntakeForm` + `IntakeVerticalBlock` and
 * the metamorphic vertical primitives:
 *
 *   1. Vertical block hides when no vertical is selected.
 *   2. Vertical block hides when `generic` is selected (by design).
 *   3. AI/SaaS schedule mounts when AI/SaaS is selected, surfacing
 *      the right field labels.
 *   4. Switching verticals swaps the schedule contents.
 *   5. Save flow includes both `vertical` and `verticalValues` in the
 *      POST body, distinct from supplementaryValues.
 *   6. Switching vertical away then back preserves prior entries.
 *
 * Tests stub `fetch` per case via `vi.stubGlobal`.
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
          subjectId: "subj-q6",
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

function selectVertical(value: string) {
  const select = screen.getByLabelText("Vertical") as HTMLSelectElement;
  fireEvent.change(select, { target: { value } });
}

describe("IntakeForm — Q6 vertical metamorphism", () => {
  it("hides the vertical block when no vertical is selected", () => {
    render(<IntakeForm />);
    expect(screen.queryByText(/schedule$/i)).toBeNull();
  });

  it("hides the vertical block when 'generic' is selected", () => {
    render(<IntakeForm />);
    selectVertical("generic");
    expect(screen.queryByText(/schedule$/i)).toBeNull();
  });

  it("mounts the AI/SaaS schedule when AI/SaaS is selected", () => {
    render(<IntakeForm />);
    selectVertical("ai_saas");
    expect(
      screen.getByRole("heading", { name: /AI \/ SaaS schedule/i }),
    ).toBeTruthy();
    expect(screen.getAllByText(/Model Provenance/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Training Data Provenance/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hallucination Rate/i).length).toBeGreaterThan(0);
  });

  it("swaps schedules when switching verticals", () => {
    render(<IntakeForm />);
    selectVertical("ai_saas");
    expect(screen.getAllByText(/Model Provenance/i).length).toBeGreaterThan(0);

    selectVertical("healthtech");
    expect(
      screen.getByRole("heading", { name: /HealthTech schedule/i }),
    ).toBeTruthy();
    expect(
      screen.getAllByText(/Regulatory Pathway/i).length,
    ).toBeGreaterThan(0);
    /* AI/SaaS-only labels are gone. */
    expect(screen.queryByText(/Model Provenance/i)).toBeNull();
  });

  it("includes vertical + verticalValues in the POST body when saving", async () => {
    render(<IntakeForm />);
    fireEvent.change(screen.getByLabelText(/Company name/i), {
      target: { value: "AcmeAI Ltd" },
    });
    selectVertical("ai_saas");
    /* Pick the first model-provenance radio option ("Proprietary"). */
    fireEvent.click(screen.getByLabelText(/Proprietary — trained from scratch/i));
    /* Set hallucination rate. */
    fireEvent.change(screen.getByLabelText(/Hallucination Rate/i), {
      target: { value: "1.5" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.vertical).toBe("ai_saas");
    expect(body.verticalValues).toBeDefined();
    expect(body.verticalValues.ai_saas).toBeDefined();
    expect(body.verticalValues.ai_saas.v1).toBe("proprietary_trained");
    expect(body.verticalValues.ai_saas.v4).toBe(1.5);
    /* And it's distinct from supplementaryValues — separate axis. */
    expect(body.supplementaryValues).toBeDefined();
  });

  it("preserves a prior vertical's entries when switching back", () => {
    render(<IntakeForm />);
    selectVertical("ai_saas");
    fireEvent.click(screen.getByLabelText(/API wrapper \(no model training\)/i));

    selectVertical("climatetech");
    expect(
      screen.getByRole("heading", { name: /ClimateTech schedule/i }),
    ).toBeTruthy();

    selectVertical("ai_saas");
    const radio = screen.getByLabelText(
      /API wrapper \(no model training\)/i,
    ) as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });
});
