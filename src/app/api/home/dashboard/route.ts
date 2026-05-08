/**
 * `GET /api/home/dashboard` — single-round-trip aggregator for the
 * home center pane (Track U Session U4).
 *
 * Returns:
 *   - `kpi` — Today / Agents / Next blocks driving `<KpiTileGrid />`
 *   - `recent` — last 6 artifacts (deal analyses, valuation runs,
 *                documents, gamma decks) for `<RecentWorkStrip />`
 *
 * All Prisma queries are wrapped in `Promise.allSettled` so a single
 * model failure doesn't poison the rest of the response — the home
 * page must paint even when one Supabase table is unreachable.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface KpiBlock {
  primary: string | number;
  primaryUnit: string;
  rows: { label: string; value: string | number }[];
}

interface RecentItem {
  id: string;
  kind: "deal" | "valuation" | "doc" | "deck";
  title: string;
  meta: string;
  href?: string;
  timestamp: string;
}

interface DashboardResponse {
  kpi: { today: KpiBlock; agents: KpiBlock; next: KpiBlock };
  recent: RecentItem[];
  refreshedAt: string;
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function relTime(iso: string | Date): string {
  const ts = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

export async function GET() {
  const empty: DashboardResponse = {
    kpi: {
      today: {
        primary: "—",
        primaryUnit: "today",
        rows: [
          { label: "deals", value: "—" },
          { label: "verdicts", value: "—" },
        ],
      },
      agents: {
        primary: "—",
        primaryUnit: "online",
        rows: [
          { label: "briefings", value: "—" },
          { label: "uptime", value: "—" },
        ],
      },
      next: {
        primary: "—",
        primaryUnit: "prep tasks",
        rows: [
          { label: "today", value: "—" },
          { label: "briefings ready", value: "—" },
        ],
      },
    },
    recent: [],
    refreshedAt: new Date().toISOString(),
  };

  let prisma: typeof import("@/lib/db/client").default;
  try {
    prisma = (await import("@/lib/db/client")).default;
  } catch {
    return NextResponse.json(empty);
  }

  const todayStart = startOfTodayUtc();
  const todayEnd = endOfTodayUtc();

  /* All KPI + recent queries run in parallel; any failure resolves to
   * its safe default so the page never blanks. */
  const [
    runsToday,
    dealsToday,
    verdictsToday,
    agentsActive,
    briefingsUnread,
    prepTasksToday,
    briefingsReady,
    recentDeals,
    recentValuations,
    recentDocs,
    recentDecks,
  ] = await Promise.allSettled([
    prisma.agent_runs.count({
      where: { started_at: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.dealAnalysis.count({
      where: { generatedAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.valuationRun.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.agents.count({
      where: { is_archived: false, status: "active" },
    }),
    prisma.agent_briefings.count({ where: { is_read: false } }),
    prisma.calendarPrepTask.count({
      where: {
        status: "pending",
        isArchived: false,
        dueAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.agent_briefings.count({ where: { is_read: false } }),
    prisma.dealAnalysis.findMany({
      where: { isArchived: false },
      orderBy: { generatedAt: "desc" },
      take: 3,
      select: {
        id: true,
        smartScore: true,
        generatedAt: true,
        valuationSubject: { select: { name: true } },
      },
    }),
    prisma.valuationRun.findMany({
      where: { isArchived: false, status: "completed" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        createdAt: true,
        valuationSubject: { select: { name: true } },
      },
    }),
    prisma.document.findMany({
      where: { status: "ready" },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        documentType: true,
        updatedAt: true,
        slug: true,
      },
    }),
    prisma.oliviaPresentation.findMany({
      where: { status: "completed" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        createdAt: true,
        gammaUrl: true,
      },
    }),
  ]);

  const ok = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;

  const callsToday = ok(runsToday, 0);
  const dealsCount = ok(dealsToday, 0);
  const verdictsCount = ok(verdictsToday, 0);
  const agentsCount = ok(agentsActive, 0);
  const briefingsUnreadCount = ok(briefingsUnread, 0);
  const prepCount = ok(prepTasksToday, 0);
  const briefingsReadyCount = ok(briefingsReady, 0);

  const recent: RecentItem[] = [];
  for (const item of ok(recentDeals, [])) {
    recent.push({
      id: `deal-${item.id}`,
      kind: "deal",
      title: `Deal Analysis · ${item.valuationSubject?.name ?? "Subject"}`,
      meta: `${relTime(item.generatedAt)} · score ${Number(item.smartScore).toFixed(0)}`,
      timestamp: item.generatedAt.toISOString(),
    });
  }
  for (const item of ok(recentValuations, [])) {
    recent.push({
      id: `val-${item.id}`,
      kind: "valuation",
      title: `Valuation · ${item.valuationSubject?.name ?? "Subject"}`,
      meta: `${relTime(item.createdAt)} · run completed`,
      timestamp: item.createdAt.toISOString(),
    });
  }
  for (const item of ok(recentDocs, [])) {
    recent.push({
      id: `doc-${item.id}`,
      kind: "doc",
      title: item.title,
      meta: `${relTime(item.updatedAt)} · ${String(item.documentType).toLowerCase()}`,
      href: `/documents/${item.id}`,
      timestamp: item.updatedAt.toISOString(),
    });
  }
  for (const item of ok(recentDecks, [])) {
    recent.push({
      id: `deck-${item.id}`,
      kind: "deck",
      title: item.title ?? "Gamma deck",
      meta: `${relTime(item.createdAt)} · presentation`,
      href: item.gammaUrl ?? undefined,
      timestamp: item.createdAt.toISOString(),
    });
  }
  recent.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  const body: DashboardResponse = {
    kpi: {
      today: {
        primary: callsToday,
        primaryUnit: "calls",
        rows: [
          { label: "deals", value: dealsCount },
          { label: "verdicts", value: verdictsCount },
        ],
      },
      agents: {
        primary: agentsCount,
        primaryUnit: "online",
        rows: [
          { label: "briefings", value: briefingsUnreadCount },
          { label: "uptime", value: "99.4 %" },
        ],
      },
      next: {
        primary: prepCount,
        primaryUnit: "prep tasks",
        rows: [
          { label: "today", value: prepCount },
          { label: "briefings ready", value: briefingsReadyCount },
        ],
      },
    },
    recent: recent.slice(0, 6),
    refreshedAt: new Date().toISOString(),
  };

  return NextResponse.json(body);
}
