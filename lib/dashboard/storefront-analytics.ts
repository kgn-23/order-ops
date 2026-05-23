import type { OrderStatus, Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import type { StorefrontDashboardScope } from "@/lib/dashboard/storefront-scope";
import {
  callerInScopeWhere,
  storefrontOrderWhere,
} from "@/lib/dashboard/storefront-scope";
import {
  formatIstCalendarDateString,
  formatIstLongDate,
  getIstRangeUtc,
} from "@/lib/ist-time";
import { codExportQueueWhere } from "@/lib/orders/export-queue";
import { STOREFRONT_ORDER_SOURCE } from "@/lib/orders/source";

export type StorefrontDashboardFilters = {
  from: string;
  to: string;
  teamId?: string;
};

export type CallerPerformanceRow = {
  callerId: string;
  callerName: string;
  calls: number;
  confirmed: number;
  cancelled: number;
  noAnswer: number;
  confirmRate: number;
};

export type TeamPerformanceSection = {
  teamId: string;
  teamName: string;
  callers: CallerPerformanceRow[];
  totals: Omit<CallerPerformanceRow, "callerId" | "callerName"> & { label: string };
};

export type StorefrontDashboardPayload = {
  range: { from: string; to: string; label: string };
  kpis: {
    newOrders: number;
    confirmed: number;
    cancelled: number;
    calls: number;
    noAnswer: number;
    codExported: number;
    codReadyNow: number;
    confirmRate: number;
  };
  statusFunnel: Array<{ status: OrderStatus; count: number }>;
  dailyTrend: Array<{ date: string; confirmed: number; calls: number }>;
  teamSections: TeamPerformanceSection[];
  teamFilterOptions: Array<{ id: string; name: string }>;
  scopeLabel: string;
  isEmptyTeam: boolean;
};

function orderWhereForScope(callerIds: string[] | null): Prisma.OrderWhereInput {
  return storefrontOrderWhere(callerIds);
}

function distinctConfirmCount(
  events: Array<{ orderId: string; changedById: string | null }>,
  callerIds: string[] | null,
): Map<string, number> {
  const byCaller = new Map<string, Set<string>>();
  for (const event of events) {
    const callerId = event.changedById;
    if (!callerId) continue;
    if (callerIds && !callerIds.includes(callerId)) continue;
    const set = byCaller.get(callerId) ?? new Set<string>();
    set.add(event.orderId);
    byCaller.set(callerId, set);
  }
  const counts = new Map<string, number>();
  for (const [callerId, set] of byCaller) {
    counts.set(callerId, set.size);
  }
  return counts;
}

function buildCallerRows(
  callers: Array<{ id: string; name: string }>,
  callStats: Map<string, { calls: number; noAnswer: number; cancelled: number }>,
  confirmStats: Map<string, number>,
): CallerPerformanceRow[] {
  return callers
    .map((caller) => {
      const stats = callStats.get(caller.id) ?? { calls: 0, noAnswer: 0, cancelled: 0 };
      const confirmed = confirmStats.get(caller.id) ?? 0;
      const confirmRate =
        stats.calls > 0 ? Number(((confirmed / stats.calls) * 100).toFixed(1)) : 0;
      return {
        callerId: caller.id,
        callerName: caller.name,
        calls: stats.calls,
        confirmed,
        cancelled: stats.cancelled,
        noAnswer: stats.noAnswer,
        confirmRate,
      };
    })
    .sort((a, b) => b.confirmed - a.confirmed || b.calls - a.calls || a.callerName.localeCompare(b.callerName));
}

function sumTeamTotals(rows: CallerPerformanceRow[]): TeamPerformanceSection["totals"] {
  const calls = rows.reduce((s, r) => s + r.calls, 0);
  const confirmed = rows.reduce((s, r) => s + r.confirmed, 0);
  const cancelled = rows.reduce((s, r) => s + r.cancelled, 0);
  const noAnswer = rows.reduce((s, r) => s + r.noAnswer, 0);
  const confirmRate = calls > 0 ? Number(((confirmed / calls) * 100).toFixed(1)) : 0;
  return { label: "Team total", calls, confirmed, cancelled, noAnswer, confirmRate };
}

async function fetchTeamSections(
  scope: StorefrontDashboardScope,
  range: { start: Date; endExclusive: Date },
): Promise<TeamPerformanceSection[]> {
  const callerFilter = callerInScopeWhere(
    scope.role === "admin" ? scope.callerIds : scope.callerIds,
  );

  const teams =
    scope.role === "manager"
      ? scope.teamId
        ? [{ id: scope.teamId, name: scope.teamName }]
        : []
      : scope.role === "admin" && scope.teamId
        ? [{ id: scope.teamId, name: scope.teamName ?? "Team" }]
        : (
            await db.callerTeam.findMany({
              where: { deletedAt: null },
              select: { id: true, name: true },
              orderBy: { name: "asc" },
            })
          );

  const teamIds = teams.map((t) => t.id);
  if (teamIds.length === 0) return [];

  const teamCallers = await db.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      callerTeamId: { in: teamIds },
      roles: { some: { deletedAt: null, role: { code: "CALLER", deletedAt: null } } },
    },
    select: { id: true, name: true, callerTeamId: true },
    orderBy: { name: "asc" },
  });

  const [callGroups, confirmEvents, cancelEvents] = await Promise.all([
    db.callLog.groupBy({
      by: ["callerId", "outcome"],
      where: {
        deletedAt: null,
        calledAt: { gte: range.start, lt: range.endExclusive },
        ...(callerFilter ? { callerId: callerFilter } : {}),
        order: { deletedAt: null, sourceSystem: STOREFRONT_ORDER_SOURCE },
      },
      _count: { _all: true },
    }),
    db.orderCommerceStatusEvent.findMany({
      where: {
        deletedAt: null,
        toStatus: "CONFIRMED",
        createdAt: { gte: range.start, lt: range.endExclusive },
        ...(callerFilter ? { changedById: callerFilter } : {}),
        order: { deletedAt: null, sourceSystem: STOREFRONT_ORDER_SOURCE },
      },
      select: { orderId: true, changedById: true },
    }),
    db.orderCommerceStatusEvent.findMany({
      where: {
        deletedAt: null,
        toStatus: "CANCELLED",
        createdAt: { gte: range.start, lt: range.endExclusive },
        ...(callerFilter ? { changedById: callerFilter } : {}),
        order: { deletedAt: null, sourceSystem: STOREFRONT_ORDER_SOURCE },
      },
      select: { orderId: true, changedById: true },
    }),
  ]);

  const callStats = new Map<string, { calls: number; noAnswer: number; cancelled: number }>();
  for (const row of callGroups) {
    const entry = callStats.get(row.callerId) ?? { calls: 0, noAnswer: 0, cancelled: 0 };
    entry.calls += row._count._all;
    if (row.outcome === "NO_ANSWER") entry.noAnswer += row._count._all;
    callStats.set(row.callerId, entry);
  }

  const confirmStats = distinctConfirmCount(
    confirmEvents,
    scope.role === "admin" ? scope.callerIds : scope.callerIds,
  );
  const cancelStats = distinctConfirmCount(
    cancelEvents,
    scope.role === "admin" ? scope.callerIds : scope.callerIds,
  );

  for (const [callerId, count] of cancelStats) {
    const entry = callStats.get(callerId) ?? { calls: 0, noAnswer: 0, cancelled: 0 };
    entry.cancelled = count;
    callStats.set(callerId, entry);
  }

  return teams.map((team) => {
    const callers = teamCallers.filter((c) => c.callerTeamId === team.id);
    const rows = buildCallerRows(callers, callStats, confirmStats);
    return {
      teamId: team.id,
      teamName: team.name,
      callers: rows,
      totals: sumTeamTotals(rows),
    };
  });
}

export async function getStorefrontDashboardPayload(
  scope: StorefrontDashboardScope,
  filters: StorefrontDashboardFilters,
  teamFilterOptions: Array<{ id: string; name: string }>,
): Promise<StorefrontDashboardPayload> {
  const rangeUtc = getIstRangeUtc(filters.from, filters.to);
  const callerIds = scope.role === "admin" ? scope.callerIds : scope.callerIds;
  const isEmptyTeam = scope.role === "manager" && scope.callerIds.length === 0;

  const rangeLabel =
    rangeUtc.from === rangeUtc.to
      ? formatIstLongDate(new Date(`${rangeUtc.from}T12:00:00+05:30`))
      : `${rangeUtc.from} → ${rangeUtc.to}`;

  const scopeLabel =
    scope.role === "manager"
      ? scope.teamName || "No team assigned"
      : scope.teamName
        ? `Team: ${scope.teamName}`
        : "All teams";

  if (isEmptyTeam) {
    return {
      range: { from: rangeUtc.from, to: rangeUtc.to, label: rangeLabel },
      kpis: {
        newOrders: 0,
        confirmed: 0,
        cancelled: 0,
        calls: 0,
        noAnswer: 0,
        codExported: 0,
        codReadyNow: 0,
        confirmRate: 0,
      },
      statusFunnel: [],
      dailyTrend: [],
      teamSections: [],
      teamFilterOptions,
      scopeLabel,
      isEmptyTeam: true,
    };
  }

  const orderWhere = orderWhereForScope(callerIds);
  const callerFilter = callerInScopeWhere(callerIds);

  const [
    newOrders,
    confirmedEvents,
    cancelledEvents,
    calls,
    noAnswer,
    codExported,
    codReadyNow,
    funnelGrouped,
    trendCalls,
    trendConfirms,
    teamSections,
  ] = await Promise.all([
    db.order.count({
      where: {
        ...orderWhere,
        createdAt: { gte: rangeUtc.start, lt: rangeUtc.endExclusive },
      },
    }),
    db.orderCommerceStatusEvent.findMany({
      where: {
        deletedAt: null,
        toStatus: "CONFIRMED",
        createdAt: { gte: rangeUtc.start, lt: rangeUtc.endExclusive },
        ...(callerFilter ? { changedById: callerFilter } : {}),
        order: { deletedAt: null, sourceSystem: STOREFRONT_ORDER_SOURCE },
      },
      select: { orderId: true },
    }),
    db.orderCommerceStatusEvent.findMany({
      where: {
        deletedAt: null,
        toStatus: "CANCELLED",
        createdAt: { gte: rangeUtc.start, lt: rangeUtc.endExclusive },
        ...(callerFilter ? { changedById: callerFilter } : {}),
        order: { deletedAt: null, sourceSystem: STOREFRONT_ORDER_SOURCE },
      },
      select: { orderId: true },
    }),
    db.callLog.count({
      where: {
        deletedAt: null,
        calledAt: { gte: rangeUtc.start, lt: rangeUtc.endExclusive },
        ...(callerFilter ? { callerId: callerFilter } : {}),
        order: orderWhere,
      },
    }),
    db.callLog.count({
      where: {
        deletedAt: null,
        outcome: "NO_ANSWER",
        calledAt: { gte: rangeUtc.start, lt: rangeUtc.endExclusive },
        ...(callerFilter ? { callerId: callerFilter } : {}),
        order: orderWhere,
      },
    }),
    db.order.count({
      where: {
        ...orderWhere,
        exportedAt: { gte: rangeUtc.start, lt: rangeUtc.endExclusive },
      },
    }),
    db.order.count({
      where: {
        ...codExportQueueWhere(),
        ...orderWhere,
      },
    }),
    db.orderCommerceStatusEvent.groupBy({
      by: ["toStatus"],
      where: {
        deletedAt: null,
        createdAt: { gte: rangeUtc.start, lt: rangeUtc.endExclusive },
        toStatus: { in: ["PENDING", "CONFIRMED", "CANCELLED"] },
        ...(callerFilter ? { changedById: callerFilter } : {}),
        order: { deletedAt: null, sourceSystem: STOREFRONT_ORDER_SOURCE },
      },
      _count: { _all: true },
    }),
    db.callLog.findMany({
      where: {
        deletedAt: null,
        calledAt: { gte: rangeUtc.start, lt: rangeUtc.endExclusive },
        ...(callerFilter ? { callerId: callerFilter } : {}),
        order: orderWhere,
      },
      select: { calledAt: true },
    }),
    db.orderCommerceStatusEvent.findMany({
      where: {
        deletedAt: null,
        toStatus: "CONFIRMED",
        createdAt: { gte: rangeUtc.start, lt: rangeUtc.endExclusive },
        ...(callerFilter ? { changedById: callerFilter } : {}),
        order: { deletedAt: null, sourceSystem: STOREFRONT_ORDER_SOURCE },
      },
      select: { createdAt: true },
    }),
    fetchTeamSections(scope, rangeUtc),
  ]);

  const confirmed = new Set(confirmedEvents.map((e) => e.orderId)).size;
  const cancelled = new Set(cancelledEvents.map((e) => e.orderId)).size;
  const confirmRate = calls > 0 ? Number(((confirmed / calls) * 100).toFixed(1)) : 0;

  const statusOrder: OrderStatus[] = ["PENDING", "CONFIRMED", "CANCELLED"];
  const funnelMap = new Map(funnelGrouped.map((r) => [r.toStatus, r._count._all]));
  const statusFunnel = statusOrder.map((status) => ({
    status,
    count: funnelMap.get(status) ?? 0,
  }));

  const dailyMap = new Map<string, { confirmed: number; calls: number }>();
  const addDay = (d: Date, field: "confirmed" | "calls") => {
    const key = formatIstCalendarDateString(d);
    const entry = dailyMap.get(key) ?? { confirmed: 0, calls: 0 };
    entry[field] += 1;
    dailyMap.set(key, entry);
  };
  for (const c of trendCalls) addDay(c.calledAt, "calls");
  for (const c of trendConfirms) addDay(c.createdAt, "confirmed");

  const dailyTrend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  return {
    range: { from: rangeUtc.from, to: rangeUtc.to, label: rangeLabel },
    kpis: {
      newOrders,
      confirmed,
      cancelled,
      calls,
      noAnswer,
      codExported,
      codReadyNow,
      confirmRate,
    },
    statusFunnel,
    dailyTrend,
    teamSections,
    teamFilterOptions,
    scopeLabel,
    isEmptyTeam: false,
  };
}
