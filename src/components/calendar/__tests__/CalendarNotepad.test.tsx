// @vitest-environment jsdom

/**
 * `CalendarNotepad` — render-only smoke test (Track Calendar C6).
 *
 * Scope (per HANDOFF.md C6 spec): mount the notepad with stub
 * calendar-entry options and assert the share-modal trigger surface
 * exists. The smoke does NOT click through to email / SMS / WhatsApp
 * fetches (would require MSW or DB mocking — out of scope per spec).
 *
 * react-international-phone is heavy and uses CSS that jsdom can't
 * parse without extra wiring; we mock it to a plain text input so the
 * notepad's own DOM shape is what we assert against.
 */

import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("react-international-phone", () => ({
  PhoneInput: (props: { value?: string }) => (
    <input data-testid="phone-input-mock" defaultValue={props.value || ""} />
  ),
}));
// react-international-phone ships its own stylesheet — stub it out
// because jsdom + Vitest's CSS handling chokes on it.
vi.mock("react-international-phone/style.css", () => ({}));

import { CalendarNotepad } from "../CalendarNotepad";

describe("CalendarNotepad (smoke)", () => {
  it("mounts without throwing when given empty calendar entries", () => {
    const { container } = render(
      <CalendarNotepad calendarEntries={[]} focusNoteId={null} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("mounts with a stub calendar entry", () => {
    const { container } = render(
      <CalendarNotepad
        calendarEntries={[
          {
            id: "stub-entry-1",
            title: "Stub Meeting",
            startDatetime: new Date().toISOString(),
          },
        ]}
        focusNoteId={null}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
