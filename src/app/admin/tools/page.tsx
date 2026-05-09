/**
 * `/admin/tools` — operator landing page.
 *
 * Index of every admin / operator surface so a fresh browser tab can
 * navigate to the right tool without grep-ing the repo. Mirrors the
 * /admin/eval card style (dark, mono labels, aurum accent) and reads
 * vendor wiring at request time so the avatar tools card surfaces a
 * live "X/Y vendors configured" hint.
 *
 * Read-only. No POSTs, no client state. Server component on
 * force-dynamic so the vendor-health snapshot is always fresh.
 */

import Link from "next/link";
import { getAllVendorHealth } from "@/lib/avatar/status";

export const dynamic = "force-dynamic";

interface ToolCard {
  href: string;
  group: string;
  title: string;
  blurb: string;
  status?: { ok: boolean; label: string };
}

function buildToolCards(): ToolCard[] {
  const vendorHealth = getAllVendorHealth();
  const configuredCount = vendorHealth.filter((v) => v.configured).length;

  return [
    {
      href: "/admin",
      group: "Agents",
      title: "Agent command center",
      blurb:
        "Status, configuration, and per-agent run controls for every Olivia / Cristiano / Emelia agent. Run-all, briefings, system alerts.",
    },
    {
      href: "/admin/avatar-eval",
      group: "Avatar A/B",
      title: "Vendor MOS harness",
      blurb:
        "30-script suite × 6 vendors. Capture latency + MOS + cost per run. Live TTFM trigger for LiveAvatar.",
      status: {
        ok: configuredCount > 0,
        label: `${configuredCount}/${vendorHealth.length} vendors wired`,
      },
    },
    {
      href: "/admin/avatar-eval/decision",
      group: "Avatar A/B",
      title: "Decision rubric",
      blurb:
        "Vendor ranking via latency × 0.4 + MOS × 0.4 + cost × 0.2. Per-component breakdown shows why a vendor ranked where it did.",
    },
    {
      href: "/admin/eval",
      group: "Quality",
      title: "Golden eval suite",
      blurb:
        "Hand-picked golden cases that gate cascade quality. Run sparingly — each case costs ~500 tokens.",
    },
    {
      href: "/admin/traces",
      group: "Quality",
      title: "Cascade traces",
      blurb:
        "Live recording of every /api/olivia/chat and /chat/stream call. Per-provider latency, model id, spoke routing, fallback path.",
    },
    {
      href: "/admin/investors",
      group: "Deal protection",
      title: "Investor reputations",
      blurb:
        "Admin CRUD for the InvestorReputation table. Backs the deal-protection cascade's investor-tilt math.",
    },
    {
      href: "/admin/integrations",
      group: "Integrations",
      title: "Composio + cascade providers",
      blurb:
        "Health checks for the Q3 read-only Composio integrations and the multi-provider LLM cascade.",
    },
    {
      href: "/admin/phase1",
      group: "Legacy",
      title: "Phase 1 dashboard",
      blurb:
        "Pre-Track-U surface. Kept for reference; Track U + the agent command center supersede it.",
    },
  ];
}

export default function AdminToolsPage() {
  const cards = buildToolCards();

  // Group cards by their `group` field so the page reads as
  // capability sections, not one flat list.
  const groups: { name: string; cards: ToolCard[] }[] = [];
  for (const card of cards) {
    const existing = groups.find((g) => g.name === card.group);
    if (existing) existing.cards.push(card);
    else groups.push({ name: card.group, cards: [card] });
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--canvas-base)",
        color: "var(--fg-primary)",
        padding: "32px 32px 64px",
        display: "grid",
        gap: 24,
        maxWidth: 1280,
        marginInline: "auto",
      }}
    >
      <header style={{ display: "grid", gap: 6 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--aurum-primary)",
          }}
        >
          /admin/tools
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-3xl)",
            fontWeight: 500,
          }}
        >
          Operator surfaces
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--fg-tertiary)",
            fontSize: "var(--text-sm)",
            maxWidth: 720,
          }}
        >
          Every admin / operator surface in one place. Vendor wiring status
          is read at request time so the avatar tools card always reflects
          the current Vercel env.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.name} style={{ display: "grid", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--fg-tertiary)",
            }}
          >
            {group.name}
          </span>
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            }}
          >
            {group.cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  padding: 16,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface-1)",
                  border: "1px solid var(--border-default)",
                  display: "grid",
                  gap: 8,
                  transition: "border-color 120ms",
                }}
              >
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-md)",
                      fontWeight: 500,
                      color: "var(--fg-primary)",
                    }}
                  >
                    {card.title}
                  </span>
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-2xs)",
                      color: "var(--aurum-primary)",
                    }}
                  >
                    {card.href}
                  </code>
                </header>
                <p
                  style={{
                    margin: 0,
                    color: "var(--fg-secondary)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  {card.blurb}
                </p>
                {card.status && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-2xs)",
                      letterSpacing: "0.06em",
                      color: card.status.ok
                        ? "var(--mint-up)"
                        : "var(--coral-down)",
                    }}
                  >
                    {card.status.ok ? "✓" : "✗"} {card.status.label}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
