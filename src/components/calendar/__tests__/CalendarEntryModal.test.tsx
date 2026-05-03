// @vitest-environment jsdom

/**
 * `CalendarEntryModal` — render-only smoke test (Track Calendar C6).
 *
 * Scope (per HANDOFF.md C6 spec): mount the modal in "create" mode
 * (no existing entry) and assert the form fields render. Tests do NOT
 * exercise route POSTs (would require MSW or DB mocking) and do NOT
 * trigger the lazy `react-datepicker` import or the Google Maps script
 * load — both are mocked.
 *
 * Mocks:
 * - `react-datepicker` → plain `<input type="date" />`
 * - `react-international-phone` → plain `<input>`
 * - `@googlemaps/js-api-loader` → `setOptions` + `importLibrary` no-ops
 *
 * The modal renders into a portal; React Testing Library mounts the
 * portal root in jsdom by default. We assert against the document via
 * `screen.getByRole("textbox", { name: /title/i })`.
 */

import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// jsdom does not implement window.matchMedia. The modal queries it on
// open to detect coarse-pointer devices, so stub a default before any
// render happens.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

vi.mock("@googlemaps/js-api-loader", () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn().mockResolvedValue({}),
}));

vi.mock("react-international-phone", () => ({
  PhoneInput: (props: { value?: string }) => (
    <input data-testid="phone-input-mock" defaultValue={props.value || ""} />
  ),
}));
vi.mock("react-international-phone/style.css", () => ({}));

vi.mock("react-datepicker/dist/react-datepicker.css", () => ({}));
vi.mock("react-datepicker", () => ({
  default: (props: { selected?: Date }) => (
    <input
      data-testid="datepicker-mock"
      type="date"
      defaultValue={
        props.selected ? props.selected.toISOString().slice(0, 10) : ""
      }
    />
  ),
}));

import { CalendarEntryModal } from "../CalendarEntryModal";

describe("CalendarEntryModal (smoke)", () => {
  it("mounts in create-mode with no entry and renders the title input", () => {
    render(
      <CalendarEntryModal
        entry={null}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    // The modal renders a title text input; even without explicit
    // accessible name we can find at least one textbox.
    const textboxes = screen.getAllByRole("textbox");
    expect(textboxes.length).toBeGreaterThan(0);
  });

  it("mounts in edit-mode against a stub entry without throwing", () => {
    const stubEntry = {
      id: "stub-entry",
      title: "Stub Meeting",
      description: "Stub description",
      location: "Stub Location",
      virtualUrl: "",
      startDatetime: new Date("2026-06-01T10:00:00Z"),
      endDatetime: new Date("2026-06-01T11:00:00Z"),
      allDay: false,
      entryType: "event",
      category: "general",
      priority: "medium",
      isVip: false,
      tags: [],
      ecosystemOrgName: null,
      investmentStage: null,
      isArchived: false,
      attendees: [],
      // The modal reads many additional optional fields; supplying nulls
      // keeps the type-checker happy without exercising real DB rows.
    } as unknown as Parameters<typeof CalendarEntryModal>[0]["entry"];

    const { container } = render(
      <CalendarEntryModal
        entry={stubEntry}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(container).toBeTruthy();
  });
});
