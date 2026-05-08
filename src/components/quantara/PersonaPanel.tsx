"use client";

/**
 * `PersonaPanel` — Q7 persona display.
 *
 * Renders the founder + company persona pair after a successful
 * synthesis (or hydration from the GET /api/founder-intake/personas
 * endpoint). Pure presentation — no API calls, no state management.
 *
 * Surfaces the two personas in a coherent two-column layout that
 * reads cleanly on desktop and stacks on narrow viewports. Mock-mode
 * runs are explicitly labelled so the founder doesn't mistake a
 * placeholder for live synthesis.
 */

import { Sparkles, Building2, User } from "lucide-react";

import type {
  CompanyPersonaPayload,
  FounderPersonaPayload,
} from "@/lib/quantara";

export interface PersonaPanelProps {
  founder: FounderPersonaPayload;
  company: CompanyPersonaPayload;
  runtimeMode: "live" | "mock";
  /** ISO timestamp when the synthesis ran. */
  generatedAt?: string;
}

export function PersonaPanel({
  founder,
  company,
  runtimeMode,
  generatedAt,
}: PersonaPanelProps) {
  return (
    <section
      aria-label="Persona synthesis"
      style={{
        marginTop: 32,
        padding: 32,
        background: "var(--surface-1)",
        border: "1px solid var(--border-aurum)",
        borderRadius: "var(--radius-2xl)",
        backgroundImage:
          "linear-gradient(135deg, var(--aurum-mute) 0%, transparent 70%)",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-lg)",
              background: "var(--aurum-mute)",
              border: "1px solid var(--border-aurum)",
              color: "var(--aurum-primary)",
            }}
          >
            <Sparkles size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                fontWeight: 600,
                color: "var(--fg-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Olivia&apos;s persona synthesis
            </h2>
            <div
              style={{
                marginTop: 2,
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--fg-tertiary)",
              }}
            >
              Pitch decks, business plans, and marketing read these to
              anchor narrative.
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {runtimeMode === "mock" ? (
            <span
              style={{
                padding: "3px 9px",
                background: "var(--amber-warn-mute)",
                border: "1px solid var(--amber-warn)",
                borderRadius: "var(--radius-full)",
                color: "var(--amber-warn)",
                textTransform: "uppercase",
              }}
            >
              Mock-mode placeholder
            </span>
          ) : (
            <span
              style={{
                padding: "3px 9px",
                background: "var(--mint-up-mute)",
                border: "1px solid var(--mint-up)",
                borderRadius: "var(--radius-full)",
                color: "var(--mint-up)",
                textTransform: "uppercase",
              }}
            >
              Live cascade
            </span>
          )}
          {generatedAt && (
            <span style={{ color: "var(--fg-tertiary)" }}>
              {new Date(generatedAt).toLocaleString()}
            </span>
          )}
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        <PersonaColumn
          icon={<User size={18} strokeWidth={1.75} />}
          title="Founder persona"
          summary={founder.summary}
          lead={founder.narrativeAngle}
          chips={[
            { label: "Archetype", value: humaniseEnum(founder.archetype) },
            {
              label: "Risk tolerance",
              value: humaniseEnum(founder.riskTolerance),
            },
          ]}
          lists={[
            { title: "Strengths", items: founder.strengths },
            { title: "Working style", items: [founder.workingStyle] },
            ...(founder.gaps.length
              ? [{ title: "Gaps", items: founder.gaps as string[] }]
              : []),
            ...(founder.openQuestions.length
              ? [
                  {
                    title: "Open questions",
                    items: founder.openQuestions as string[],
                  },
                ]
              : []),
          ]}
        />
        <PersonaColumn
          icon={<Building2 size={18} strokeWidth={1.75} />}
          title="Company persona"
          summary={company.summary}
          lead={company.positioning}
          chips={[
            { label: "Ideal customer", value: company.idealCustomer },
          ]}
          lists={[
            { title: "Differentiators", items: company.differentiators },
            { title: "Defensibility", items: [company.defensibility] },
            { title: "Traction story", items: [company.tractionStory] },
            ...(company.watchOuts.length
              ? [{ title: "Watch-outs", items: company.watchOuts as string[] }]
              : []),
            ...(company.openQuestions.length
              ? [
                  {
                    title: "Open questions",
                    items: company.openQuestions as string[],
                  },
                ]
              : []),
          ]}
        />
      </div>
    </section>
  );
}

interface PersonaColumnProps {
  icon: React.ReactNode;
  title: string;
  summary: string;
  lead: string;
  chips: Array<{ label: string; value: string }>;
  lists: Array<{ title: string; items: string[] }>;
}

function PersonaColumn({
  icon,
  title,
  summary,
  lead,
  chips,
  lists,
}: PersonaColumnProps) {
  return (
    <article
      style={{
        padding: 20,
        background: "var(--surface-2)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{ color: "var(--aurum-primary)", display: "inline-flex" }}
        >
          {icon}
        </span>
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            fontWeight: 600,
            color: "var(--fg-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h3>
      </header>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--fg-secondary)",
          lineHeight: 1.55,
        }}
      >
        {summary}
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-base)",
          color: "var(--aurum-primary)",
          fontStyle: "italic",
          lineHeight: 1.45,
        }}
      >
        “{lead}”
      </p>
      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {chips.map((c) => (
            <span
              key={c.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
                background: "var(--aurum-mute)",
                border: "1px solid var(--border-aurum)",
                borderRadius: "var(--radius-full)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                color: "var(--aurum-primary)",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              <span style={{ color: "var(--fg-tertiary)" }}>{c.label}:</span>{" "}
              {c.value}
            </span>
          ))}
        </div>
      )}
      {lists.map((list) => (
        <div key={list.title}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              fontWeight: 600,
              color: "var(--fg-tertiary)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {list.title}
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--fg-secondary)",
              lineHeight: 1.5,
            }}
          >
            {list.items.map((item, i) => (
              <li key={`${list.title}-${i}`}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </article>
  );
}

function humaniseEnum(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
