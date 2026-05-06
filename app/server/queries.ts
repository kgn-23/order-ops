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
};

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

    const [total, rows, assigned] = await Promise.all([
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
  return getOrdersPageCached({ ...input, page: safePage, pageSize: safeSize, sortBy: safeSortBy, sortDir: safeSortDir });
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
