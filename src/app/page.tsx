"use client";

/**
 * `/` — Olivia Brain root surface.
 *
 * Session 14 lands the **three-region workspace shell** per
 * `docs/01_UI_DESIGN_SYSTEM.md` § 5.1 and `docs/STUDIO_OLIVIA_DESIGN.md`
 * § 1. The shell is product-agnostic: clueslondon, cluesintelligence,
 * cluesxscore, white-label tenants, and standalone Olivia all mount
 * the same shell with different region content
 * (`docs/01_UI_DESIGN_SYSTEM.md` § 10).
 *
 * Region content here is intentionally **scaffolding** — the rail, the
 * inspector tab bodies, and the center canvas all show "coming in
 * Session N…" placeholders. Subsequent Track C sessions populate them:
 *
 *   - Session 15: 5 reusable primitives (`AvatarOrb` full impl,
 *     `ConsensusDots`, `Badge`, `CompletionRing`, `DeckDetailModal`).
 *   - Session 16: Library tab + DeckDetailModal interaction.
 *   - Session 17: Section nav (Pitch / Plan / Documents / General),
 *     document tree, frameworks panel.
 *   - Session 18: Right-pane tabs (Olivia / Library / Preview /
 *     Themes / Audit) wired to the chat brain + audit log.
 *   - Session 19: J/K keyboard nav, focus-trap modal, debounced
 *     autosave, theme switching.
 *
 * Existing routes (`/map`, `/calendar`, `/test-avatar`, `/admin`,
 * `/admin/phase1`) survive untouched. The Phase-1 readiness UI
 * relocated to `/admin/phase1` to make the root surface available
 * for the Studio shell.
 */

import { useState } from "react";
import {
  Center,
  Header,
  Inspector,
  RailLeft,
  WorkspaceShell,
  type InspectorTab,
} from "@/components/workspace";

const INSPECTOR_TABS: InspectorTab[] = [
  {
    id: "olivia",
    label: "Olivia",
    content: (
      <div style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, color: "var(--fg-secondary)" }}>
          Real-time intelligence — wires to <code>/api/olivia/chat</code> in
          Session 18.
        </p>
        <p
          style={{
            margin: 0,
            color: "var(--fg-tertiary)",
            fontSize: "var(--text-xs)",
          }}
        >
          For the live avatar smoke flow today, visit{" "}
          <a href="/test-avatar" style={{ color: "var(--aurum-primary)" }}>
            /test-avatar
          </a>
          .
        </p>
      </div>
    ),
  },
  {
    id: "library",
    label: "Library",
    content: (
      <p style={{ margin: 0, color: "var(--fg-secondary)" }}>
        75 deck archetypes + 12 plan templates land in Session 16.
      </p>
    ),
  },
  {
    id: "audit",
    label: "Audit",
    content: (
      <p style={{ margin: 0, color: "var(--fg-secondary)" }}>
        Cascade trace + agent-decision log lands in Session 18.
      </p>
    ),
  },
];

const RAIL_LINKS: { href: string; label: string; description: string }[] = [
  {
    href: "/calendar",
    label: "Calendar",
    description: "Personal calendar + voice scheduling",
  },
  {
    href: "/map",
    label: "Map",
    description: "London tech districts (3D Google Maps + Mapbox)",
  },
  {
    href: "/test-avatar",
    label: "Live Avatar",
    description: "End-to-end LiveAvatar + cascade smoke flow",
  },
  {
    href: "/admin",
    label: "Admin",
    description: "Internal admin surfaces",
  },
  {
    href: "/admin/phase1",
    label: "Phase-1 Status",
    description: "Phase-1 readiness dashboard",
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("olivia");
  const [avatarPulse, setAvatarPulse] = useState(false);

  return (
    <WorkspaceShell
      header={
        <Header
          wordmark="STUDIO OLIVIA"
          crumb={["Workspace"]}
          avatarState={avatarPulse ? "thinking" : "idle"}
          onAvatarClick={() => setAvatarPulse((v) => !v)}
        />
      }
      rail={
        <RailLeft>
          <div
            style={{
              padding: "8px 4px",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: "var(--fg-tertiary)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Surfaces
          </div>
          {RAIL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-1)",
                color: "var(--fg-primary)",
                textDecoration: "none",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                transition:
                  "background var(--duration-micro) var(--ease-out-quart), border-color var(--duration-micro) var(--ease-out-quart)",
              }}
            >
              <div>{link.label}</div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: "var(--text-xs)",
                  color: "var(--fg-tertiary)",
                  fontWeight: 400,
                }}
              >
                {link.description}
              </div>
            </a>
          ))}
        </RailLeft>
      }
      center={
        <Center
          toolbar={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--fg-tertiary)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <span>Workspace · Session 14 chrome</span>
              <span>⌨ J/K navigate · Esc close — wired Session 19</span>
            </div>
          }
        >
          <div
            style={{
              maxWidth: 720,
              display: "grid",
              gap: 16,
            }}
          >
            <h1
              className="font-display"
              style={{
                fontSize: "var(--text-3xl)",
                color: "var(--fg-primary)",
                margin: 0,
              }}
            >
              Welcome to Studio Olivia
            </h1>
            <p
              style={{
                color: "var(--fg-secondary)",
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              The three-region workspace shell. Header above, rail to the
              left, inspector to the right. The center canvas (this region) is
              where Pitch, Plan, Documents, and General views live. Session 15
              ships the five reusable primitives; Sessions 16–19 fill in the
              widget grid, navigation, and chat brain.
            </p>
            <div
              role="note"
              style={{
                padding: 16,
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-aurum)",
                background: "var(--aurum-mute)",
                color: "var(--fg-primary)",
                fontSize: "var(--text-sm)",
              }}
            >
              <strong style={{ color: "var(--aurum-primary)" }}>
                Design-system note —
              </strong>{" "}
              Every paint on this surface references a canonical token
              (Aurum, Aether, canvas, foreground). No hex codes in
              components. White-label tenants override the token set; the
              shell reskins automatically. See{" "}
              <code>docs/01_UI_DESIGN_SYSTEM.md</code>.
            </div>
          </div>
        </Center>
      }
      inspector={
        <Inspector
          tabs={INSPECTOR_TABS}
          activeTabId={activeTab}
          onTabChange={setActiveTab}
        />
      }
    />
  );
}
