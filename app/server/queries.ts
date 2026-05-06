import type { ActivityLogSort } from "@/app/lib/activity-params";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";

import { db } from "@/app/lib/db";

export type TeamUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  /** Manager/caller codes only (excludes ADMIN in UI badges). */
  operationalRoles: ("MANAGER" | "CALLER")[];
  callerTeam: { id: string; name: string } | null;
};

export type CallerTeamRow = {
  id: string;
  name: string;
  leader: { id: string; name: string; email: string };
  callerCount: number;
};

export type WebhookInboxEventRow = {
  id: string;
  endpoint: string;
  method: string;
  payload: unknown;
  rawBody: string | null;
  receivedAt: Date;
};

export type OrdersSearchKey = "customerName" | "customerPhone" | "trackingNumber" | "city" | "state";
export type OrdersStageFilter =
  | "ALL"
  | "BOOKED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RTO"
  | "OTHER";
export type OrdersSortBy = "createdAt" | "currentStage" | "customerName";
export type OrdersSortDir = "asc" | "desc";
export type OrdersAttemptFilter = "ALL" | "CALLED" | "NOT_CALLED";
export type OrdersFollowUpFilter = "ALL" | "WITH_FOLLOW_UP" | "WITHOUT_FOLLOW_UP";

export type OrdersPageRow = {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  city: string;
  state: string;
  trackingNumber: string | null;
  currentStage: string;
  assignedTo: string | null;
  lastAttemptOutcome?: string | null;
  lastAttemptAt?: string | null;
};

export type OrdersPageResult = {
  rows: OrdersPageRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: {
    total: number;
    assigned: number;
    unassigned: number;
    delivered: number;
    inTransit: number;
    rto: number;
    calledOrders: number;
    notCalledOrders: number;
    withFollowUpOrders: number;
    withoutFollowUpOrders: number;
    totalFollowUps: number;
  };
};

type OrdersPageInput = {
  page: number;
  pageSize: number;
  stage: OrdersStageFilter;
  searchKey: OrdersSearchKey;
  q?: string;
  sortBy: OrdersSortBy;
  sortDir: OrdersSortDir;
  attemptFilter: OrdersAttemptFilter;
  followUpFilter: OrdersFollowUpFilter;
};

export type ManagerOrdersPageInput = OrdersPageInput;
export type CallerOrdersPageInput = OrdersPageInput & { userId: string; focusMode?: boolean };

export async function getAdminSummary() {
  const [orderCount, deliveredCount, rtoCount, openFollowUps, todayCalls, activeAssignments] =
    await Promise.all([
      db.order.count({ where: { deletedAt: null } }),
      db.order.count({ where: { deletedAt: null, currentStage: "DELIVERED" } }),
      db.order.count({ where: { deletedAt: null, currentStage: "RTO" } }),
      db.followUp.count({ where: { deletedAt: null, isClosed: false } }),
      db.callLog.count({
        where: {
          deletedAt: null,
          calledAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      db.orderAssignment.count({ where: { deletedAt: null, isActive: true } }),
    ]);

  return {
    orderCount,
    deliveredCount,
    rtoCount,
    openFollowUps,
    todayCalls,
    activeAssignments,
    successRate: orderCount === 0 ? 0 : Number(((deliveredCount / orderCount) * 100).toFixed(2)),
  };
}

export async function getCallerQueue(userId: string) {
  return db.orderAssignment.findMany({
    where: { assigneeId: userId, isActive: true, deletedAt: null, order: { deletedAt: null } },
    select: {
      order: {
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          currentStage: true,
          trackingNumber: true,
          city: true,
          state: true,
        },
      },
    },
    orderBy: { assignedAt: "desc" },
    take: 50,
  });
}

export async function getCallerDashboardSummary(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const assignedWhere: Prisma.OrderWhereInput = {
    deletedAt: null,
    assignments: {
      some: {
        deletedAt: null,
        isActive: true,
        assigneeId: userId,
        assignee: { deletedAt: null, isActive: true },
      },
    },
  };

  const [assignedOrders, notCalledOrders, callsToday, overdueFollowUps, dueTodayFollowUps, upcomingFollowUps] =
    await Promise.all([
      db.order.count({ where: assignedWhere }),
      db.order.count({
        where: {
          ...assignedWhere,
          callLogs: { none: { deletedAt: null } },
        },
      }),
      db.callLog.count({
        where: { deletedAt: null, callerId: userId, calledAt: { gte: startOfDay, lte: endOfDay } },
      }),
      db.followUp.count({
        where: {
          deletedAt: null,
          isClosed: false,
          dueAt: { lt: now },
          order: assignedWhere,
        },
      }),
      db.followUp.count({
        where: {
          deletedAt: null,
          isClosed: false,
          dueAt: { gte: startOfDay, lte: endOfDay },
          order: assignedWhere,
        },
      }),
      db.followUp.findMany({
        where: {
          deletedAt: null,
          isClosed: false,
          dueAt: { gte: now },
          order: assignedWhere,
        },
        orderBy: { dueAt: "asc" },
        take: 5,
        select: {
          id: true,
          dueAt: true,
          notes: true,
          order: { select: { id: true, customerName: true, customerPhone: true } },
        },
      }),
    ]);

  return {
    assignedOrders,
    notCalledOrders,
    callsToday,
    overdueFollowUps,
    dueTodayFollowUps,
    upcomingFollowUps: upcomingFollowUps.map((item) => ({
      id: item.id,
      dueAt: item.dueAt ? item.dueAt.toISOString() : null,
      notes: item.notes,
      orderId: item.order.id,
      customerName: item.order.customerName,
      customerPhone: item.order.customerPhone,
    })),
  };
}

export async function getActivityLogsPage(input: {
  page: number;
  pageSize: number;
  sort: ActivityLogSort;
  actionContains?: string;
  entityTypeContains?: string;
}) {
  const { page, pageSize, sort, actionContains, entityTypeContains } = input;
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(100, Math.max(10, Math.floor(pageSize)));

  const where = {
    deletedAt: null,
    ...(actionContains?.trim()
      ? { action: { contains: actionContains.trim(), mode: "insensitive" as const } }
      : {}),
    ...(entityTypeContains?.trim()
      ? {
          entityType: { contains: entityTypeContains.trim(), mode: "insensitive" as const },
        }
      : {}),
  };

  const orderBy =
    sort === "createdAt_desc"
      ? { createdAt: "desc" as const }
      : sort === "createdAt_asc"
        ? { createdAt: "asc" as const }
        : sort === "action_asc"
          ? { action: "asc" as const }
          : sort === "action_desc"
            ? { action: "desc" as const }
            : sort === "entityType_asc"
              ? { entityType: "asc" as const }
              : { entityType: "desc" as const };

  const [total, rows] = await Promise.all([
    db.activityLog.count({ where }),
    db.activityLog.findMany({
      where,
      orderBy,
      skip: (safePage - 1) * safeSize,
      take: safeSize,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actor: { select: { name: true } },
        order: { select: { customerName: true, trackingNumber: true } },
      },
    }),
  ]);

  return { rows, total, page: safePage, pageSize: safeSize };
}

export async function getFormOptions() {
  const [orders, callers] = await Promise.all([
    db.order.findMany({
      where: { deletedAt: null },
      select: { id: true, customerName: true, currentStage: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        roles: {
          some: {
            deletedAt: null,
            role: { deletedAt: null, code: "CALLER" },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        roles: {
          where: { deletedAt: null, role: { deletedAt: null } },
          select: { role: { select: { code: true } } },
        },
      },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);

  return { orders, callers };
}

export async function getCallerPerformance() {
  return db.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      roles: { some: { deletedAt: null, role: { code: "CALLER", deletedAt: null } } },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          callLogs: { where: { deletedAt: null } },
          assignments: { where: { deletedAt: null, isActive: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getTeamUsers(): Promise<TeamUserRow[]> {
  const rows = await db.user.findMany({
    where: {
      deletedAt: null,
      roles: {
        some: {
          deletedAt: null,
          role: { deletedAt: null, code: { in: ["MANAGER", "CALLER"] } },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      roles: {
        where: { deletedAt: null, role: { deletedAt: null } },
        select: { role: { select: { code: true } } },
      },
      callerTeam: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => {
    const codes = row.roles
      .map((r) => r.role.code)
      .filter((c): c is "MANAGER" | "CALLER" => c === "MANAGER" || c === "CALLER");
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      isActive: row.isActive,
      operationalRoles: codes,
      callerTeam: row.callerTeam,
    };
  });
}

export async function getCallerTeams(): Promise<CallerTeamRow[]> {
  const teams = await db.callerTeam.findMany({
    where: { deletedAt: null, leader: { deletedAt: null, isActive: true } },
    select: {
      id: true,
      name: true,
      leader: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          callers: {
            where: {
              deletedAt: null,
              isActive: true,
              roles: { some: { deletedAt: null, role: { code: "CALLER", deletedAt: null } } },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    leader: t.leader,
    callerCount: t._count.callers,
  }));
}

export async function getManagerOptions() {
  return db.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      roles: { some: { deletedAt: null, role: { code: "MANAGER", deletedAt: null } } },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 100,
  });
}

export async function getOrdersTable(limit = 100) {
  const rows = await db.order.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      customerName: true,
      customerPhone: true,
      city: true,
      state: true,
      trackingNumber: true,
      currentStage: true,
      assignments: {
        where: { deletedAt: null, isActive: true, assignee: { deletedAt: null } },
        orderBy: { assignedAt: "desc" },
        take: 1,
        select: {
          assignee: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    city: row.city,
    state: row.state,
    trackingNumber: row.trackingNumber,
    currentStage: row.currentStage,
    assignedTo: row.assignments[0]?.assignee.name ?? null,
  }));
}

function buildOrdersWhere(input: OrdersPageInput): Prisma.OrderWhereInput {
  const term = input.q?.trim() ?? "";
  const searchCondition =
    term.length === 0
      ? {}
      : input.searchKey === "trackingNumber"
        ? {
            trackingNumber: {
              startsWith: term,
              mode: "insensitive" as const,
            },
          }
        : input.searchKey === "customerPhone"
          ? {
              customerPhone: {
                startsWith: term,
                mode: "insensitive" as const,
              },
            }
          : {
              [input.searchKey]: {
                contains: term,
                mode: "insensitive" as const,
              },
            };

  return {
    deletedAt: null,
    ...(input.stage !== "ALL" ? { currentStage: input.stage } : {}),
    ...(input.attemptFilter === "CALLED"
      ? { callLogs: { some: { deletedAt: null } } }
      : input.attemptFilter === "NOT_CALLED"
        ? { callLogs: { none: { deletedAt: null } } }
        : {}),
    ...(input.followUpFilter === "WITH_FOLLOW_UP"
      ? { followUps: { some: { deletedAt: null } } }
      : input.followUpFilter === "WITHOUT_FOLLOW_UP"
        ? { followUps: { none: { deletedAt: null } } }
        : {}),
    ...searchCondition,
  };
}

function buildOrdersOrderBy(input: OrdersPageInput): Prisma.OrderOrderByWithRelationInput {
  if (input.sortBy === "createdAt") {
    return { createdAt: input.sortDir };
  }
  if (input.sortBy === "currentStage") {
    return { currentStage: input.sortDir };
  }
  return { customerName: input.sortDir };
}

const getOrdersPageCached = unstable_cache(
  async (normalizedInput: OrdersPageInput): Promise<OrdersPageResult> => {
    const safePage = Math.max(1, Math.floor(normalizedInput.page));
    const allowedSizes = [50, 100, 200, 300];
    const safeSize = allowedSizes.includes(normalizedInput.pageSize) ? normalizedInput.pageSize : 50;
    const where = buildOrdersWhere({ ...normalizedInput, page: safePage, pageSize: safeSize });
    const orderBy = buildOrdersOrderBy(normalizedInput);

    const [total, rows, assigned, calledOrders, withFollowUpOrders, totalFollowUps] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          customerName: true,
          customerPhone: true,
          city: true,
          state: true,
          trackingNumber: true,
          currentStage: true,
          assignments: {
            where: { deletedAt: null, isActive: true, assignee: { deletedAt: null } },
            orderBy: { assignedAt: "desc" },
            take: 1,
            select: { assignee: { select: { name: true } } },
          },
          callLogs: {
            where: { deletedAt: null },
            orderBy: { calledAt: "desc" },
            take: 1,
            select: { outcome: true, calledAt: true },
          },
        },
        orderBy,
        skip: (safePage - 1) * safeSize,
        take: safeSize,
      }),
      db.order.count({
        where: {
          ...where,
          assignments: {
            some: { deletedAt: null, isActive: true, assignee: { deletedAt: null } },
          },
        },
      }),
      db.order.count({ where: { ...where, callLogs: { some: { deletedAt: null } } } }),
      db.order.count({ where: { ...where, followUps: { some: { deletedAt: null } } } }),
      db.followUp.count({ where: { deletedAt: null, order: where } }),
    ]);

    const [delivered, inTransit, rto] = await Promise.all([
      db.order.count({ where: { ...where, currentStage: "DELIVERED" } }),
      db.order.count({ where: { ...where, currentStage: "IN_TRANSIT" } }),
      db.order.count({ where: { ...where, currentStage: "RTO" } }),
    ]);

    return {
      rows: rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        city: row.city,
        state: row.state,
        trackingNumber: row.trackingNumber,
        currentStage: row.currentStage,
        assignedTo: row.assignments[0]?.assignee.name ?? null,
        lastAttemptOutcome: row.callLogs[0]?.outcome ?? null,
        lastAttemptAt: row.callLogs[0]?.calledAt ? row.callLogs[0].calledAt.toISOString() : null,
      })),
      total,
      page: safePage,
      pageSize: safeSize,
      totalPages: Math.max(1, Math.ceil(total / safeSize)),
      counts: {
        total,
        assigned,
        unassigned: Math.max(0, total - assigned),
        delivered,
        inTransit,
        rto,
        calledOrders,
        notCalledOrders: Math.max(0, total - calledOrders),
        withFollowUpOrders,
        withoutFollowUpOrders: Math.max(0, total - withFollowUpOrders),
        totalFollowUps,
      },
    };
  },
  ["orders-page-v2"],
  { revalidate: 15, tags: ["orders-page"] }
);

export async function getOrdersPage(input: OrdersPageInput): Promise<OrdersPageResult> {
  const safePage = Math.max(1, Math.floor(input.page));
  const allowedSizes = [50, 100, 200, 300];
  const safeSize = allowedSizes.includes(input.pageSize) ? input.pageSize : 50;
  const safeSortBy: OrdersSortBy = ["createdAt", "currentStage", "customerName"].includes(input.sortBy)
    ? input.sortBy
    : "createdAt";
  const safeSortDir: OrdersSortDir = input.sortDir === "asc" || input.sortDir === "desc" ? input.sortDir : "desc";
  const safeAttemptFilter: OrdersAttemptFilter = ["ALL", "CALLED", "NOT_CALLED"].includes(input.attemptFilter)
    ? input.attemptFilter
    : "ALL";
  const safeFollowUpFilter: OrdersFollowUpFilter = ["ALL", "WITH_FOLLOW_UP", "WITHOUT_FOLLOW_UP"].includes(
    input.followUpFilter,
  )
    ? input.followUpFilter
    : "ALL";
  return getOrdersPageCached({
    ...input,
    page: safePage,
    pageSize: safeSize,
    sortBy: safeSortBy,
    sortDir: safeSortDir,
    attemptFilter: safeAttemptFilter,
    followUpFilter: safeFollowUpFilter,
  });
}

const getManagerOrdersPageCached = unstable_cache(
  async (normalizedInput: ManagerOrdersPageInput): Promise<OrdersPageResult> => {
    return getOrdersPage(normalizedInput);
  },
  ["manager-orders-page-v1"],
  { revalidate: 15, tags: ["orders-page"] }
);

export async function getManagerOrdersPage(input: ManagerOrdersPageInput): Promise<OrdersPageResult> {
  return getManagerOrdersPageCached(input);
}

const getCallerOrdersPageCached = unstable_cache(
  async (normalizedInput: CallerOrdersPageInput): Promise<OrdersPageResult> => {
    const safePage = Math.max(1, Math.floor(normalizedInput.page));
    const allowedSizes = [50, 100, 200, 300];
    const safeSize = allowedSizes.includes(normalizedInput.pageSize) ? normalizedInput.pageSize : 50;
    const safeSortBy: OrdersSortBy = ["createdAt", "currentStage", "customerName"].includes(normalizedInput.sortBy)
      ? normalizedInput.sortBy
      : "createdAt";
    const safeSortDir: OrdersSortDir =
      normalizedInput.sortDir === "asc" || normalizedInput.sortDir === "desc" ? normalizedInput.sortDir : "desc";
    const safeAttemptFilter: OrdersAttemptFilter = ["ALL", "CALLED", "NOT_CALLED"].includes(normalizedInput.attemptFilter)
      ? normalizedInput.attemptFilter
      : "ALL";
    const safeFollowUpFilter: OrdersFollowUpFilter = ["ALL", "WITH_FOLLOW_UP", "WITHOUT_FOLLOW_UP"].includes(
      normalizedInput.followUpFilter,
    )
      ? normalizedInput.followUpFilter
      : "ALL";
    const focusMode = normalizedInput.focusMode === true;

    const baseWhere = buildOrdersWhere({
      ...normalizedInput,
      page: safePage,
      pageSize: safeSize,
      sortBy: safeSortBy,
      sortDir: safeSortDir,
      attemptFilter: safeAttemptFilter,
      followUpFilter: safeFollowUpFilter,
    });
    const where: Prisma.OrderWhereInput = {
      ...baseWhere,
      assignments: {
        some: {
          deletedAt: null,
          isActive: true,
          assigneeId: normalizedInput.userId,
          assignee: { deletedAt: null, isActive: true },
        },
      },
    };
    const focusWhere: Prisma.OrderWhereInput = focusMode
      ? {
          ...where,
          OR: [
            { callLogs: { none: { deletedAt: null } } },
            {
              followUps: {
                some: {
                  deletedAt: null,
                  isClosed: false,
                  dueAt: { not: null },
                },
              },
            },
          ],
        }
      : where;
    const orderBy = buildOrdersOrderBy({
      ...normalizedInput,
      page: safePage,
      pageSize: safeSize,
      sortBy: safeSortBy,
      sortDir: safeSortDir,
      attemptFilter: safeAttemptFilter,
      followUpFilter: safeFollowUpFilter,
    });

    const [total, delivered, inTransit, rto, calledOrders, withFollowUpOrders, totalFollowUps] = await Promise.all([
      db.order.count({ where: focusWhere }),
      db.order.count({ where: { ...focusWhere, currentStage: "DELIVERED" } }),
      db.order.count({ where: { ...focusWhere, currentStage: "IN_TRANSIT" } }),
      db.order.count({ where: { ...focusWhere, currentStage: "RTO" } }),
      db.order.count({ where: { ...focusWhere, callLogs: { some: { deletedAt: null } } } }),
      db.order.count({ where: { ...focusWhere, followUps: { some: { deletedAt: null } } } }),
      db.followUp.count({ where: { deletedAt: null, order: focusWhere } }),
    ]);

    const baseSelect = {
      id: true,
      createdAt: true,
      customerName: true,
      customerPhone: true,
      city: true,
      state: true,
      trackingNumber: true,
      currentStage: true,
      assignments: {
        where: { deletedAt: null, isActive: true, assignee: { deletedAt: null } },
        orderBy: { assignedAt: "desc" },
        take: 1,
        select: { assignee: { select: { name: true } } },
      },
      callLogs: {
        where: { deletedAt: null },
        orderBy: { calledAt: "desc" },
        take: 1,
        select: { outcome: true, calledAt: true },
      },
      followUps: {
        where: { deletedAt: null, isClosed: false, dueAt: { not: null } },
        orderBy: { dueAt: "asc" },
        take: 1,
        select: { dueAt: true },
      },
    } satisfies Prisma.OrderSelect;

    const rows = await (focusMode
      ? (() => {
          const nowTs = Date.now();
          const focusPriority: Array<"OVERDUE_FOLLOW_UP" | "UPCOMING_FOLLOW_UP" | "NOT_CALLED"> = [
            "OVERDUE_FOLLOW_UP",
            "UPCOMING_FOLLOW_UP",
            "NOT_CALLED",
          ];
          const getRank = (row: {
            callLogs: Array<{ outcome: string; calledAt: Date }>;
            followUps: Array<{ dueAt: Date | null }>;
          }) => {
            const dueAt = row.followUps[0]?.dueAt ? row.followUps[0].dueAt.getTime() : null;
            if (dueAt !== null && dueAt < nowTs) return focusPriority.indexOf("OVERDUE_FOLLOW_UP");
            if (dueAt !== null) return focusPriority.indexOf("UPCOMING_FOLLOW_UP");
            if (row.callLogs.length === 0) return focusPriority.indexOf("NOT_CALLED");
            return Number.MAX_SAFE_INTEGER;
          };
          return db.order
            .findMany({
              where: focusWhere,
              select: baseSelect,
              orderBy: { createdAt: "desc" },
              take: 5000,
            })
            .then((allRows) =>
              allRows
                .sort((a, b) => {
                  const rankDiff = getRank(a) - getRank(b);
                  if (rankDiff !== 0) return rankDiff;
                  const aDue = a.followUps[0]?.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
                  const bDue = b.followUps[0]?.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
                  if (aDue !== bDue) return aDue - bDue;
                  return b.createdAt.getTime() - a.createdAt.getTime();
                })
                .slice((safePage - 1) * safeSize, safePage * safeSize),
            );
        })()
      : db.order.findMany({
          where: focusWhere,
          select: baseSelect,
          orderBy,
          skip: (safePage - 1) * safeSize,
          take: safeSize,
        }));

    return {
      rows: rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        city: row.city,
        state: row.state,
        trackingNumber: row.trackingNumber,
        currentStage: row.currentStage,
        assignedTo: row.assignments[0]?.assignee.name ?? null,
        lastAttemptOutcome: row.callLogs[0]?.outcome ?? null,
        lastAttemptAt: row.callLogs[0]?.calledAt ? row.callLogs[0].calledAt.toISOString() : null,
      })),
      total,
      page: safePage,
      pageSize: safeSize,
      totalPages: Math.max(1, Math.ceil(total / safeSize)),
      counts: {
        total,
        assigned: total,
        unassigned: 0,
        delivered,
        inTransit,
        rto,
        calledOrders,
        notCalledOrders: Math.max(0, total - calledOrders),
        withFollowUpOrders,
        withoutFollowUpOrders: Math.max(0, total - withFollowUpOrders),
        totalFollowUps,
      },
    };
  },
  ["caller-orders-page-v1"],
  { revalidate: 15, tags: ["orders-page"] }
);

export async function getCallerOrdersPage(input: CallerOrdersPageInput): Promise<OrdersPageResult> {
  return getCallerOrdersPageCached(input);
}

export type CallLogsSearchKey = "orderId" | "customerName" | "customerPhone" | "callerName";
export type CallLogsSortBy = "calledAt" | "callerName" | "outcome";
export type CallLogsSortDir = "asc" | "desc";
export type CallLogsOutcomeFilter =
  | "ALL"
  | "NO_ANSWER"
  | "CALLBACK_REQUESTED"
  | "CONFIRMED"
  | "DELAYED"
  | "CANCELLED"
  | "INVALID_NUMBER"
  | "OTHER";
export type CallLogsStageFilter = "ALL" | "BOOKED" | "IN_TRANSIT" | "DELIVERED" | "RTO" | "OTHER";

export type CallLogPageRow = {
  id: string;
  calledAt: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  callerName: string;
  outcome: string;
  orderStage: string | null;
  callDurationS: number | null;
  notes: string | null;
};

export type CallLogsPageResult = {
  rows: CallLogPageRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  counts: {
    total: number;
    today: number;
    noAnswer: number;
    callbackRequested: number;
    confirmed: number;
    cancelled: number;
    avgDurationS: number;
  };
  topCallers: Array<{ callerId: string; callerName: string; callCount: number }>;
};

type CallLogsPageInput = {
  page: number;
  pageSize: number;
  searchKey: CallLogsSearchKey;
  q?: string;
  outcome: CallLogsOutcomeFilter;
  stage: CallLogsStageFilter;
  sortBy: CallLogsSortBy;
  sortDir: CallLogsSortDir;
};

type CallerCallLogsPageInput = CallLogsPageInput & { userId: string };

function buildCallLogsWhere(input: CallLogsPageInput): Prisma.CallLogWhereInput {
  const term = input.q?.trim() ?? "";
  const searchCondition =
    term.length === 0
      ? {}
      : input.searchKey === "orderId"
        ? { orderId: { contains: term, mode: "insensitive" as const } }
        : input.searchKey === "customerName"
          ? { order: { customerName: { contains: term, mode: "insensitive" as const } } }
          : input.searchKey === "customerPhone"
            ? { order: { customerPhone: { startsWith: term, mode: "insensitive" as const } } }
            : { caller: { name: { contains: term, mode: "insensitive" as const } } };

  return {
    deletedAt: null,
    order: { deletedAt: null },
    ...(input.outcome !== "ALL" ? { outcome: input.outcome } : {}),
    ...(input.stage !== "ALL" ? { orderStage: input.stage } : {}),
    ...searchCondition,
  };
}

function buildCallLogsOrderBy(input: CallLogsPageInput): Prisma.CallLogOrderByWithRelationInput {
  if (input.sortBy === "callerName") return { caller: { name: input.sortDir } };
  if (input.sortBy === "outcome") return { outcome: input.sortDir };
  return { calledAt: input.sortDir };
}

async function getCallLogsPageBase(where: Prisma.CallLogWhereInput, input: CallLogsPageInput): Promise<CallLogsPageResult> {
  const safePage = Math.max(1, Math.floor(input.page));
  const allowedSizes = [50, 100, 200, 300];
  const safeSize = allowedSizes.includes(input.pageSize) ? input.pageSize : 50;
  const orderBy = buildCallLogsOrderBy(input);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [total, rows, today, noAnswer, callbackRequested, confirmed, cancelled, durationStats, topCallersRaw] =
    await Promise.all([
      db.callLog.count({ where }),
      db.callLog.findMany({
        where,
        select: {
          id: true,
          calledAt: true,
          outcome: true,
          orderStage: true,
          callDurationS: true,
          notes: true,
          callerId: true,
          caller: { select: { name: true } },
          order: { select: { id: true, customerName: true, customerPhone: true } },
        },
        orderBy,
        skip: (safePage - 1) * safeSize,
        take: safeSize,
      }),
      db.callLog.count({ where: { ...where, calledAt: { gte: todayStart } } }),
      db.callLog.count({ where: { ...where, outcome: "NO_ANSWER" } }),
      db.callLog.count({ where: { ...where, outcome: "CALLBACK_REQUESTED" } }),
      db.callLog.count({ where: { ...where, outcome: "CONFIRMED" } }),
      db.callLog.count({ where: { ...where, outcome: "CANCELLED" } }),
      db.callLog.aggregate({ where, _avg: { callDurationS: true } }),
      db.callLog.groupBy({
        by: ["callerId"],
        where,
        _count: { callerId: true },
        orderBy: { _count: { callerId: "desc" } },
      }),
    ]);

  const topCallerIds = topCallersRaw.map((row) => row.callerId);
  const topCallerUsers =
    topCallerIds.length === 0
      ? []
      : await db.user.findMany({
          where: { id: { in: topCallerIds }, deletedAt: null },
          select: { id: true, name: true },
        });
  const nameMap = new Map(topCallerUsers.map((u) => [u.id, u.name]));

  return {
    rows: rows.map((row) => ({
      id: row.id,
      calledAt: row.calledAt.toISOString(),
      orderId: row.order.id,
      customerName: row.order.customerName,
      customerPhone: row.order.customerPhone,
      callerName: row.caller.name,
      outcome: row.outcome,
      orderStage: row.orderStage,
      callDurationS: row.callDurationS,
      notes: row.notes,
    })),
    page: safePage,
    pageSize: safeSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
    counts: {
      total,
      today,
      noAnswer,
      callbackRequested,
      confirmed,
      cancelled,
      avgDurationS: Math.round(durationStats._avg.callDurationS ?? 0),
    },
    topCallers: topCallersRaw.map((row) => ({
      callerId: row.callerId,
      callerName: nameMap.get(row.callerId) ?? "Unknown",
      callCount: row._count.callerId ?? 0,
    })),
  };
}

export async function getCallLogsPage(input: CallLogsPageInput): Promise<CallLogsPageResult> {
  const where = buildCallLogsWhere(input);
  return getCallLogsPageBase(where, input);
}

export async function getCallerCallLogsPage(input: CallerCallLogsPageInput): Promise<CallLogsPageResult> {
  const where: Prisma.CallLogWhereInput = {
    ...buildCallLogsWhere(input),
    callerId: input.userId,
  };
  return getCallLogsPageBase(where, input);
}

export async function getWebhookInboxEvents(limit = 100): Promise<WebhookInboxEventRow[]> {
  return db.webhookInboxEvent.findMany({
    orderBy: { receivedAt: "desc" },
    take: limit,
    select: {
      id: true,
      endpoint: true,
      method: true,
      payload: true,
      rawBody: true,
      receivedAt: true,
    },
  });
}
