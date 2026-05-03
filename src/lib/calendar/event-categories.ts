// =============================================================================
// AGENTIC CALENDAR — Event Category Configuration
// Maps CalendarCategory enum → display config, defaults, and Olivia settings.
// =============================================================================

export interface CategoryConfig {
  label: string;
  color: string;        // Tailwind-compatible text color class
  glowColor: string;    // rgba for glassmorphic glow
  icon: string;         // emoji or icon key
  defaultDurationMins: number;
  defaultPriority: "critical" | "high" | "medium" | "low";
  oliviaPrepEnabled: boolean;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  // ── Meetings ──
  vc_meeting:           { label: "VC Meeting",          color: "text-indigo-400",  glowColor: "rgba(99,102,241,0.15)",  icon: "briefcase",     defaultDurationMins: 60,  defaultPriority: "high",     oliviaPrepEnabled: true  },
  angel_meeting:        { label: "Angel Meeting",       color: "text-violet-400",  glowColor: "rgba(139,92,246,0.15)",  icon: "handshake",     defaultDurationMins: 45,  defaultPriority: "high",     oliviaPrepEnabled: true  },
  board_meeting:        { label: "Board Meeting",       color: "text-blue-400",    glowColor: "rgba(59,130,246,0.15)",  icon: "users",         defaultDurationMins: 90,  defaultPriority: "critical", oliviaPrepEnabled: true  },
  advisory_call:        { label: "Advisory Call",       color: "text-sky-400",     glowColor: "rgba(14,165,233,0.15)",  icon: "phone",         defaultDurationMins: 30,  defaultPriority: "medium",   oliviaPrepEnabled: true  },
  investor_update:      { label: "Investor Update",     color: "text-indigo-400",  glowColor: "rgba(99,102,241,0.15)",  icon: "mail",          defaultDurationMins: 60,  defaultPriority: "high",     oliviaPrepEnabled: true  },
  founder_meeting:      { label: "Founder Meeting",     color: "text-emerald-400", glowColor: "rgba(34,197,94,0.15)",   icon: "coffee",        defaultDurationMins: 60,  defaultPriority: "medium",   oliviaPrepEnabled: false },
  team_standup:         { label: "Team Standup",        color: "text-cyan-400",    glowColor: "rgba(6,182,212,0.15)",   icon: "clock",         defaultDurationMins: 15,  defaultPriority: "medium",   oliviaPrepEnabled: false },
  one_on_one:           { label: "One-on-One",          color: "text-teal-400",    glowColor: "rgba(20,184,166,0.15)",  icon: "user",          defaultDurationMins: 30,  defaultPriority: "medium",   oliviaPrepEnabled: false },
  // ── Events ──
  conference_attend:    { label: "Conference",          color: "text-blue-400",    glowColor: "rgba(59,130,246,0.15)",  icon: "building",      defaultDurationMins: 480, defaultPriority: "high",     oliviaPrepEnabled: true  },
  meetup_attend:        { label: "Meetup",              color: "text-emerald-400", glowColor: "rgba(16,185,129,0.15)",  icon: "map-pin",       defaultDurationMins: 120, defaultPriority: "medium",   oliviaPrepEnabled: false },
  pitch_event:          { label: "Pitch Event",         color: "text-amber-400",   glowColor: "rgba(245,158,11,0.15)", icon: "mic",           defaultDurationMins: 180, defaultPriority: "critical", oliviaPrepEnabled: true  },
  demo_day_attend:      { label: "Demo Day",            color: "text-purple-400",  glowColor: "rgba(168,85,247,0.15)", icon: "monitor",       defaultDurationMins: 240, defaultPriority: "high",     oliviaPrepEnabled: true  },
  hackathon_attend:     { label: "Hackathon",           color: "text-orange-400",  glowColor: "rgba(249,115,22,0.15)", icon: "code",          defaultDurationMins: 480, defaultPriority: "medium",   oliviaPrepEnabled: false },
  workshop_attend:      { label: "Workshop",            color: "text-teal-400",    glowColor: "rgba(20,184,166,0.15)", icon: "tool",          defaultDurationMins: 180, defaultPriority: "medium",   oliviaPrepEnabled: false },
  networking_event:     { label: "Networking",          color: "text-rose-400",    glowColor: "rgba(244,63,94,0.15)",  icon: "users",         defaultDurationMins: 120, defaultPriority: "medium",   oliviaPrepEnabled: false },
  gala_awards:          { label: "Gala / Awards",       color: "text-yellow-400",  glowColor: "rgba(234,179,8,0.15)",  icon: "award",         defaultDurationMins: 240, defaultPriority: "high",     oliviaPrepEnabled: true  },
  // ── Work Blocks ──
  focus_time:           { label: "Focus Time",          color: "text-sky-400",     glowColor: "rgba(2,132,199,0.15)",  icon: "target",        defaultDurationMins: 120, defaultPriority: "high",     oliviaPrepEnabled: false },
  deep_work:            { label: "Deep Work",           color: "text-sky-400",     glowColor: "rgba(3,105,161,0.15)",  icon: "zap",           defaultDurationMins: 180, defaultPriority: "high",     oliviaPrepEnabled: false },
  admin_block:          { label: "Admin Block",         color: "text-slate-400",   glowColor: "rgba(100,116,139,0.15)", icon: "clipboard",    defaultDurationMins: 60,  defaultPriority: "low",      oliviaPrepEnabled: false },
  email_block:          { label: "Email Block",         color: "text-slate-400",   glowColor: "rgba(100,116,139,0.15)", icon: "mail",         defaultDurationMins: 30,  defaultPriority: "low",      oliviaPrepEnabled: false },
  // ── Milestones ──
  funding_deadline:     { label: "Funding Deadline",    color: "text-red-400",     glowColor: "rgba(239,68,68,0.15)",  icon: "alert-circle",  defaultDurationMins: 60,  defaultPriority: "critical", oliviaPrepEnabled: true  },
  product_launch:       { label: "Product Launch",      color: "text-green-400",   glowColor: "rgba(34,197,94,0.15)",  icon: "rocket",        defaultDurationMins: 60,  defaultPriority: "critical", oliviaPrepEnabled: true  },
  hiring_milestone:     { label: "Hiring Milestone",    color: "text-cyan-400",    glowColor: "rgba(6,182,212,0.15)",  icon: "user-plus",     defaultDurationMins: 60,  defaultPriority: "high",     oliviaPrepEnabled: false },
  legal_deadline:       { label: "Legal Deadline",      color: "text-red-400",     glowColor: "rgba(220,38,38,0.15)",  icon: "file-text",     defaultDurationMins: 60,  defaultPriority: "critical", oliviaPrepEnabled: true  },
  // ── Rituals ──
  weekly_review:        { label: "Weekly Review",       color: "text-sky-400",     glowColor: "rgba(14,165,233,0.15)", icon: "refresh",       defaultDurationMins: 45,  defaultPriority: "medium",   oliviaPrepEnabled: false },
  monthly_retrospective:{ label: "Monthly Retro",       color: "text-sky-400",     glowColor: "rgba(2,132,199,0.15)",  icon: "calendar",      defaultDurationMins: 60,  defaultPriority: "medium",   oliviaPrepEnabled: false },
  quarterly_planning:   { label: "Quarterly Planning",  color: "text-blue-400",    glowColor: "rgba(37,99,235,0.15)",  icon: "layout",        defaultDurationMins: 120, defaultPriority: "high",     oliviaPrepEnabled: true  },
  annual_planning:      { label: "Annual Planning",     color: "text-blue-400",    glowColor: "rgba(29,78,216,0.15)",  icon: "compass",       defaultDurationMins: 240, defaultPriority: "high",     oliviaPrepEnabled: true  },
  // ── Personal ──
  personal_event:       { label: "Personal",            color: "text-slate-300",   glowColor: "rgba(148,163,184,0.15)", icon: "star",         defaultDurationMins: 60,  defaultPriority: "low",      oliviaPrepEnabled: false },
  travel:               { label: "Travel",              color: "text-stone-400",   glowColor: "rgba(120,113,108,0.15)", icon: "map",          defaultDurationMins: 120, defaultPriority: "medium",   oliviaPrepEnabled: false },
  lunch_meeting:        { label: "Lunch Meeting",       color: "text-amber-400",   glowColor: "rgba(217,119,6,0.15)",  icon: "utensils",      defaultDurationMins: 60,  defaultPriority: "medium",   oliviaPrepEnabled: false },
  coffee_chat:          { label: "Coffee Chat",         color: "text-amber-400",   glowColor: "rgba(180,83,9,0.15)",   icon: "coffee",        defaultDurationMins: 30,  defaultPriority: "low",      oliviaPrepEnabled: false },
  // ── Ecosystem ──
  ecosystem_event:      { label: "Ecosystem Event",     color: "text-brand-400",   glowColor: "rgba(196,169,106,0.15)", icon: "globe",        defaultDurationMins: 120, defaultPriority: "medium",   oliviaPrepEnabled: false },
  community_event:      { label: "Community Event",     color: "text-emerald-400", glowColor: "rgba(5,150,105,0.15)",  icon: "heart",         defaultDurationMins: 120, defaultPriority: "medium",   oliviaPrepEnabled: false },
  // ── Signal ──
  olivia_suggestion:    { label: "Olivia Suggestion",   color: "text-violet-400",  glowColor: "rgba(124,58,237,0.15)", icon: "sparkles",      defaultDurationMins: 60,  defaultPriority: "medium",   oliviaPrepEnabled: false },
};

/**
 * Get category config with fallback.
 */
export function getCategoryConfig(category: string): CategoryConfig {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.personal_event;
}

/**
 * Get default duration in minutes for a category.
 */
export function getDefaultDuration(category: string): number {
  return getCategoryConfig(category).defaultDurationMins;
}

/**
 * Check if Olivia prep is enabled for a category.
 */
export function isOliviaPrepEnabled(category: string): boolean {
  return getCategoryConfig(category).oliviaPrepEnabled;
}
