// @vitest-environment jsdom

/**
 * `CalendarView` — render-only smoke test (Track Calendar C6).
 *
 * Scope (per HANDOFF.md C6 spec): mount the component with stub entries
 * + a stub onRefresh and assert the FullCalendar wrapper region renders.
 * The full FullCalendar library + React portal sub-tree is mocked so the
 * test stays in jsdom and never touches the calendar grid layout engine.
 *
 * NOT covered here (out of scope for smoke):
 * - real entry rendering / event-click → modal flow
 * - sync panel toggling
 * - sticky toolbar layout
 * - portal-based EventStatusWidget instantiation
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock FullCalendar — the real component does heavy DOM measurement that
// jsdom doesn't support. Render a lightweight placeholder and surface the
// passed-in events count so the smoke test can verify the wrapper got
// invoked with the stub data.
vi.mock("@fullcalendar/react", () => ({
  default: ({ events }: { events?: unknown[] }) => (
    <div data-testid="fullcalendar-mock" data-events-count={events?.length ?? 0}>
      [FullCalendar mock]
    </div>
  ),
}));
vi.mock("@fullcalendar/daygrid", () => ({ default: {} }));
vi.mock("@fullcalendar/timegrid", () => ({ default: {} }));
vi.mock("@fullcalendar/interaction", () => ({ default: {} }));
vi.mock("@fullcalendar/list", () => ({ default: {} }));

// Subcomponents that pull in heavy deps — kept as no-op shells so this
// test only asserts that the CalendarView outer chrome mounts.
vi.mock("../CalendarEntryModal", () => ({
  CalendarEntryModal: () => null,
}));
vi.mock("../SyncPanel", () => ({
  SyncPanel: () => <div data-testid="sync-panel-mock" />,
}));
vi.mock("../TabbedAgendaView", () => ({
  TabbedAgendaView: () => <div data-testid="tabbed-agenda-mock" />,
}));
vi.mock("../EventStatusWidget", () => ({
  EventStatusWidget: () => null,
}));

import { CalendarView } from "../CalendarView";

describe("CalendarView (smoke)", () => {
  it("mounts and renders the FullCalendar wrapper with the supplied entries", () => {
    const onRefresh = vi.fn();
    render(
      <CalendarView
        personalEntries={[]}
        ecosystemEvents={[]}
        defaultView="timeGridWeek"
        onRefresh={onRefresh}
      />,
    );

    const cal = screen.getByTestId("fullcalendar-mock");
    expect(cal).toBeTruthy();
    // Empty input → 0 events forwarded into the FullCalendar wrapper.
    expect(cal.getAttribute("data-events-count")).toBe("0");
  });

  it("renders the optional todayHighlight slot when provided", () => {
    render(
      <CalendarView
        personalEntries={[]}
        ecosystemEvents={[]}
        defaultView="dayGridMonth"
        onRefresh={vi.fn()}
        todayHighlight={
          <div data-testid="today-highlight-slot">today</div>
        }
      />,
    );
    expect(screen.getByTestId("today-highlight-slot")).toBeTruthy();
  });
});
