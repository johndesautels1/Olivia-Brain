/**
 * Meeting Prep Packet Generator
 *
 * Generates concise briefing documents for client meetings.
 * These are short (5-15 page) packets that summarize the client's
 * profile, current status, agenda items, talking points, and
 * action items — everything an advisor needs before a call.
 */

import {
  ReportBuilder,
  CLUES_BRAND,
  type ReportDefinition,
  type ReportBrand,
  type KeyMetricsContent,
} from "./engine";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MeetingPrepInput {
  /** Meeting details */
  meeting: {
    title: string;
    date: string;
    time: string;
    type: "initial_consultation" | "progress_review" | "property_tour" | "closing" | "general";
    location?: string;
    videoLink?: string;
    duration?: string;
  };
  /** Client profile */
  client: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    currentCity: string;
    currentState: string;
    familySize?: number;
    budget?: { min: number; max: number };
    priorities?: string[];
    notes?: string;
  };
  /** Advisor name */
  advisorName?: string;
  /** Client journey status */
  journeyStatus?: {
    phase: string;
    completedSteps: string[];
    nextSteps: string[];
    daysInPipeline: number;
  };
  /** Agenda items for the meeting */
  agenda?: string[];
  /** Talking points to cover */
  talkingPoints?: string[];
  /** Key data points to reference */
  keyData?: Array<{
    label: string;
    value: string | number;
    unit?: string;
  }>;
  /** Properties to discuss (if property tour or review) */
  properties?: Array<{
    address: string;
    listPrice: number;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    notes: string;
  }>;
  /** Previous meeting notes */
  previousMeetingNotes?: string;
  /** Action items from last meeting */
  outstandingActions?: Array<{
    action: string;
    owner: string;
    status: "complete" | "in_progress" | "pending";
  }>;
  /** Custom brand */
  brand?: ReportBrand;
}

// ─── Generator ──────────────────────────────────────────────────────────────

/**
 * Generate a Meeting Prep Packet.
 */
export function generateMeetingPrep(
  input: MeetingPrepInput
): ReportDefinition {
  const brand = input.brand ?? CLUES_BRAND;
  const { meeting, client } = input;

  const builder = new ReportBuilder(
    `Meeting Prep — ${client.name}`,
    "meeting_prep",
    "pdf",
    brand
  );

  builder.setClient(client.id, client.name);

  // ── Cover ──
  builder.addCover({
    title: "Meeting Prep Packet",
    subtitle: meeting.title,
    clientName: client.name,
    preparedBy: input.advisorName ?? "Olivia — CLUES Intelligence",
    date: meeting.date,
  });

  // ── Meeting Details ──
  const meetingMetrics: KeyMetricsContent["metrics"] = [
    { label: "Date", value: meeting.date },
    { label: "Time", value: meeting.time },
    { label: "Type", value: meeting.type.replace(/_/g, " ") },
  ];
  if (meeting.duration) meetingMetrics.push({ label: "Duration", value: meeting.duration });
  if (meeting.location) meetingMetrics.push({ label: "Location", value: meeting.location });

  builder.addKeyMetrics("meeting_details", "Meeting Details", meetingMetrics);

  // ── Client Profile ──
  const profileLines: string[] = [
    `**Name:** ${client.name}`,
    `**Current Location:** ${client.currentCity}, ${client.currentState}`,
  ];
  if (client.email) profileLines.push(`**Email:** ${client.email}`);
  if (client.phone) profileLines.push(`**Phone:** ${client.phone}`);
  if (client.familySize) profileLines.push(`**Family Size:** ${client.familySize}`);
  if (client.budget) {
    profileLines.push(
      `**Budget:** $${client.budget.min.toLocaleString()} — $${client.budget.max.toLocaleString()}`
    );
  }
  if (client.priorities && client.priorities.length > 0) {
    profileLines.push(`**Priorities:** ${client.priorities.join(", ")}`);
  }
  if (client.notes) {
    profileLines.push(`\n**Notes:** ${client.notes}`);
  }

  builder.addText("client_profile", "Client Profile", profileLines.join("\n\n"));

  // ── Journey Status ──
  if (input.journeyStatus) {
    const js = input.journeyStatus;
    const journeyText = [
      `**Current Phase:** ${js.phase}`,
      `**Days in Pipeline:** ${js.daysInPipeline}`,
      "",
      "**Completed:**",
      ...js.completedSteps.map((s) => `- ${s}`),
      "",
      "**Next Steps:**",
      ...js.nextSteps.map((s) => `- ${s}`),
    ].join("\n");

    builder.addText("journey_status", "Client Journey Status", journeyText);
  }

  // ── Previous Meeting / Outstanding Actions ──
  if (input.previousMeetingNotes) {
    builder.addText(
      "previous_notes",
      "Previous Meeting Notes",
      input.previousMeetingNotes
    );
  }

  if (input.outstandingActions && input.outstandingActions.length > 0) {
    builder.addDataTable(
      "outstanding_actions",
      "Outstanding Action Items",
      ["Action", "Owner", "Status"],
      input.outstandingActions.map((a) => [a.action, a.owner, a.status])
    );
  }

  // ── Agenda ──
  if (input.agenda && input.agenda.length > 0) {
    const agendaText = input.agenda
      .map((item, i) => `${i + 1}. ${item}`)
      .join("\n");
    builder.addText("agenda", "Agenda", agendaText);
  }

  // ── Talking Points ──
  if (input.talkingPoints && input.talkingPoints.length > 0) {
    const tpText = input.talkingPoints.map((tp) => `- ${tp}`).join("\n");
    builder.addText("talking_points", "Talking Points", tpText);
  }

  // ── Key Data ──
  if (input.keyData && input.keyData.length > 0) {
    builder.addKeyMetrics(
      "key_data",
      "Key Data Points",
      input.keyData.map((d) => ({
        label: d.label,
        value: d.value,
        unit: d.unit,
      }))
    );
  }

  // ── Properties to Discuss ──
  if (input.properties && input.properties.length > 0) {
    builder.addDataTable(
      "properties",
      "Properties to Discuss",
      ["Address", "List Price", "Beds", "Baths", "Sqft", "Notes"],
      input.properties.map((p) => [
        p.address,
        `$${p.listPrice.toLocaleString()}`,
        String(p.bedrooms),
        String(p.bathrooms),
        p.sqft.toLocaleString(),
        p.notes,
      ])
    );
  }

  return builder.build();
}
