// @vitest-environment jsdom

/**
 * `IntakeForm` — Q5 metamorphic UI integration tests.
 *
 * Proves the wiring between `IntakeForm` and the metamorphic primitives
 * in `src/lib/quantara/metamorphic/`:
 *
 *   1. Supplementary block hides when no target round type is set.
 *   2. Supplementary block mounts when the founder selects a round type
 *      and surfaces that round's 3 supplementary fields.
 *   3. Switching round types swaps the supplementary block contents.
 *   4. Section render order changes with round type (Strategic surfaces
 *      a different first section than Seed).
 *   5. Save flow includes the supplementary values map in the POST body.
 *
 * Tests stub `fetch` per case via `vi.stubGlobal`. They render the full
 * form (no shortcuts) so any breakage in the metamorphic wiring shows up
 * here even when unit tests still pass.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import { IntakeForm } from "../IntakeForm";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          subjectId: "subj-q5",
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

/** Helper — set f23 (Target Round Type) via the actual select control. */
function selectTargetRound(roundType: string) {
  const select = screen.getByLabelText("Target Round Type") as HTMLSelectElement;
  fireEvent.change(select, { target: { value: roundType } });
}

describe("IntakeForm — Q5 metamorphic", () => {
  it("hides the supplementary block when no round type is set", () => {
    render(<IntakeForm />);
    expect(screen.queryByText(/signal$/i)).toBeNull();
  });

  it("renders the Seed supplementary block when f23 = Seed", () => {
    render(<IntakeForm />);
    selectTargetRound("Seed");
    /* Block heading reads "Seed signal" per IntakeSupplementaryBlock. */
    expect(screen.getByRole("heading", { name: /Seed signal/i })).toBeTruthy();
    /* Each Seed supplementary field surfaces its label + an enum option /
       a numeric input. We assert presence via the visible field labels —
       getAllByText handles select-enum's <legend> + visible label dupes. */
    expect(screen.getAllByText(/Lead Investor Status/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Convertible \/ SAFE Terms/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Founder Personal Capital Runway/i).length,
    ).toBeGreaterThan(0);
  });

  it("swaps supplementary fields when the founder switches round types", () => {
    render(<IntakeForm />);
    selectTargetRound("Seed");
    expect(screen.getAllByText(/Lead Investor Status/i).length).toBeGreaterThan(0);

    selectTargetRound("Strategic");
    /* Strategic-only fields surface; Seed-only ones disappear. */
    expect(
      screen.getByRole("heading", { name: /Strategic signal/i }),
    ).toBeTruthy();
    expect(
      screen.getAllByText(/Acquirer Interest Level/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Strategic Synergy Areas/i).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/Convertible \/ SAFE Terms/i)).toBeNull();
  });

  it("reorders sections when round type changes", () => {
    render(<IntakeForm />);

    /* Take the first canonical section heading visible at start (no round
       type — canonical order ⇒ Core Financials first). */
    const main = screen.getByRole("main");
    const headingsNoRound = within(main).getAllByRole("heading", { level: 2 });
    expect(headingsNoRound[0].textContent).toMatch(/Core Financials/i);

    /* Strategic round prioritises late-stage / control-relevant sections.
       Different first heading — purely an order check, not a fixed name
       so the section-order algorithm can evolve without test churn. */
    selectTargetRound("Strategic");
    const headingsStrategic = within(main).getAllByRole("heading", { level: 2 });
    /* Filter out the "Strategic signal" supplementary heading so we're
       comparing canonical-section heads only. */
    const canonicalHeads = headingsStrategic.filter(
      (h) => !/signal$/i.test(h.textContent ?? ""),
    );
    /* Strategic ordering puts late-stage sections (e.g. Funding History,
       Strategic, IP & Moat) before Core Financials. Concrete assertion:
       the first canonical section is NOT Core Financials. */
    expect(canonicalHeads[0].textContent).not.toMatch(/^Core Financials/i);
  });

  it("includes supplementaryValues in the POST body when saving", async () => {
    render(<IntakeForm />);

    fireEvent.change(screen.getByLabelText(/Company name/i), {
      target: { value: "Quantara Ltd" },
    });
    selectTargetRound("Seed");
    /* Choose the first lead-investor-status radio option. */
    fireEvent.click(screen.getByLabelText(/No commits yet/i));
    /* Set the Founder Personal Capital Runway field. */
    fireEvent.change(
      screen.getByLabelText(/Founder Personal Capital Runway/i),
      { target: { value: "6" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.values.f23).toBe("Seed");
    expect(body.supplementaryValues).toBeDefined();
    expect(body.supplementaryValues.Seed).toBeDefined();
    expect(body.supplementaryValues.Seed.s1).toBe("no_commits");
    expect(body.supplementaryValues.Seed.s3).toBe(6);
  });

  it("preserves a prior round's supplementary entries when switching back", () => {
    render(<IntakeForm />);
    selectTargetRound("Seed");
    fireEvent.click(screen.getByLabelText(/Soft commits in conversation/i));

    selectTargetRound("Series A");
    /* Series A block surfaces; Seed entries are out of view. */
    expect(
      screen.getByRole("heading", { name: /Series A signal/i }),
    ).toBeTruthy();

    selectTargetRound("Seed");
    /* Round-trip — Soft commits radio still selected. */
    const softRadio = screen.getByLabelText(
      /Soft commits in conversation/i,
    ) as HTMLInputElement;
    expect(softRadio.checked).toBe(true);
  });
});
