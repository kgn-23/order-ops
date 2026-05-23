import {
  istCalendarDateToUtcEndExclusive,
  istCalendarDateToUtcStart,
  normalizeIstCreatedDateParams,
} from "@/lib/ist-time";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { codExportQueueWhere } from "@/lib/orders/export-queue";
import { db } from "@/lib/db";
import type {
  CallerOrdersPageInput,
  ManagerOrdersPageInput,
  OrdersPageInput,
  OrdersPageResult,
  OrdersPageRow,
  OrdersSortBy,
  OrdersSortDir,
  OrdersAttemptFilter,
  OrdersExportFilter,
  OrdersFollowUpFilter,
  OrdersOrderStatusFilter,
} from "@/lib/orders/types";
import { CALL_OUTCOME_VALUES, type CallOutcome } from "@/lib/orders/call-outcomes";
import { formatTotalAmountDisplay } from "@/lib/orders/format";
import { STOREFRONT_ORDER_STATUS_VALUES } from "@/lib/orders/storefront-order-status";

const ordersListSelect = {
  id: true,
  createdAt: true,
  customerName: true,
  customerPhone: true,
  city: true,
  state: true,
  trackingNumber: true,
  currentStage: true,
  merchantOrderDisplayName: true,
  financialStatus: true,
  paymentMethod: true,
  currencyCode: true,
  totalAmount: true,
  assignments: {
    where: { deletedAt: null, isActive: true, assignee: { deletedAt: null } },
    orderBy: { assignedAt: "desc" as const },
    take: 1,
    select: { assignee: { select: { name: true } } },
  },
  callLogs: {
    where: { deletedAt: null },
    orderBy: { calledAt: "desc" as const },
    take: 1,
    select: { outcome: true, calledAt: true },
  },
  refinedAddress: true,
  orderStatus: true,
  lineItems: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" as const },
    take: 1,
    select: { title: true },
  },
  _count: {
    select: {
      callLogs: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.OrderSelect;

type OrdersListDbRow = Prisma.OrderGetPayload<{ select: typeof ordersListSelect }>;

function mapOrdersPageRow(row: OrdersListDbRow): OrdersPageRow {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    city: row.city,
    state: row.state,
    trackingNumber: row.trackingNumber,
    currentStage: row.currentStage,
    assignedTo: row.assignments[0]?.assignee.name ?? null,
    attemptCount: row._count.callLogs,
    lastAttemptOutcome: row.callLogs[0]?.outcome ?? null,
    lastAttemptAt: row.callLogs[0]?.calledAt ? row.callLogs[0].calledAt.toISOString() : null,
    orderStatus: row.orderStatus,
    merchantOrderDisplayName: row.merchantOrderDisplayName,
    totalAmountDisplay: formatTotalAmountDisplay(row.totalAmount, row.currencyCode),
    financialStatus: row.financialStatus,
    paymentMethod: row.paymentMethod,
    primaryLineTitle: row.lineItems[0]?.title ?? null,
  };
}

function buildOrderCreatedAtWhere(input: OrdersPageInput): Prisma.OrderWhereInput {
  const { from, to } = normalizeIstCreatedDateParams(input.createdFrom, input.createdTo);
  if (!from && !to) return {};
  const createdAt: Prisma.DateTimeFilter = {};
  if (from) {
    const start = istCalendarDateToUtcStart(from);
    if (start) createdAt.gte = start;
  }
  if (to) {
    const end = istCalendarDateToUtcEndExclusive(to);
    if (end) createdAt.lt = end;
  }
  return Object.keys(createdAt).length > 0 ? { createdAt } : {};
}

/** Orders whose most recent call log has the given outcome. */
async function orderIdsWithLatestCallOutcome(outcome: CallOutcome): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT o.id
    FROM "Order" o
    WHERE EXISTS (
      SELECT 1
      FROM "CallLog" c
      WHERE c."orderId" = o.id
        AND c."deletedAt" IS NULL
        AND c.outcome = ${outcome}::"CallOutcomeType"
        AND NOT EXISTS (
          SELECT 1
          FROM "CallLog" c2
          WHERE c2."orderId" = o.id
            AND c2."deletedAt" IS NULL
            AND c2."calledAt" > c."calledAt"
        )
    )
  `;
  return rows.map((r) => r.id);
}

function buildOrdersWhere(
  input: OrdersPageInput,
  attemptFilterIds?: string[] | null,
): Prisma.OrderWhereInput {
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
          : input.searchKey === "merchantOrderDisplayName"
            ? {
                merchantOrderDisplayName: {
                  contains: term,
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
    ...(input.sourceSystemFilter ? { sourceSystem: input.sourceSystemFilter } : {}),
    ...(input.excludeSourceSystem
      ? { sourceSystem: { not: input.excludeSourceSystem } }
      : {}),
    ...buildOrderCreatedAtWhere(input),
    ...(input.stage !== "ALL" ? { currentStage: input.stage } : {}),
    ...(input.orderStatusFilter !== "ALL" ? { orderStatus: input.orderStatusFilter } : {}),
    ...(input.exportFilter === "READY" ? codExportQueueWhere() : {}),
    ...(input.exportFilter === "EXPORTED" ? { exportedAt: { not: null } } : {}),
    ...(input.attemptFilter === "NOT_CALLED"
      ? { callLogs: { none: { deletedAt: null } } }
      : attemptFilterIds
        ? { id: { in: attemptFilterIds.length > 0 ? attemptFilterIds : ["__no_match__"] } }
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
    const attemptFilterIds =
      normalizedInput.attemptFilter !== "ALL" &&
      normalizedInput.attemptFilter !== "NOT_CALLED"
        ? await orderIdsWithLatestCallOutcome(normalizedInput.attemptFilter)
        : null;
    const where = buildOrdersWhere(
      { ...normalizedInput, page: safePage, pageSize: safeSize },
      attemptFilterIds,
    );
    const orderBy = buildOrdersOrderBy(normalizedInput);

    const [total, rows, assigned, calledOrders, withFollowUpOrders, totalFollowUps] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        select: ordersListSelect,
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
      rows: rows.map(mapOrdersPageRow),
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
  ["orders-page-v5"],
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
  const safeAttemptFilter: OrdersAttemptFilter =
    input.attemptFilter === "ALL" ||
    input.attemptFilter === "NOT_CALLED" ||
    CALL_OUTCOME_VALUES.includes(input.attemptFilter as CallOutcome)
      ? input.attemptFilter
      : "ALL";
  const safeOrderStatusFilter =
    input.orderStatusFilter === "ALL" ||
    STOREFRONT_ORDER_STATUS_VALUES.includes(
      input.orderStatusFilter as (typeof STOREFRONT_ORDER_STATUS_VALUES)[number],
    )
      ? input.orderStatusFilter
      : "ALL";
  const safeExportFilter: OrdersExportFilter =
    input.exportFilter === "ALL" ||
    input.exportFilter === "READY" ||
    input.exportFilter === "EXPORTED"
      ? input.exportFilter
      : "ALL";
  const safeFollowUpFilter: OrdersFollowUpFilter = ["ALL", "WITH_FOLLOW_UP", "WITHOUT_FOLLOW_UP"].includes(
    input.followUpFilter,
  )
    ? input.followUpFilter
    : "ALL";
  const { from, to } = normalizeIstCreatedDateParams(input.createdFrom, input.createdTo);
  return getOrdersPageCached({
    ...input,
    page: safePage,
    pageSize: safeSize,
    sortBy: safeSortBy,
    sortDir: safeSortDir,
    attemptFilter: safeAttemptFilter,
    orderStatusFilter: safeOrderStatusFilter,
    exportFilter: safeExportFilter,
    followUpFilter: safeFollowUpFilter,
    createdFrom: from,
    createdTo: to,
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
    const safeAttemptFilter: OrdersAttemptFilter =
      normalizedInput.attemptFilter === "ALL" ||
      normalizedInput.attemptFilter === "NOT_CALLED" ||
      CALL_OUTCOME_VALUES.includes(normalizedInput.attemptFilter as CallOutcome)
        ? normalizedInput.attemptFilter
        : "ALL";
    const safeOrderStatusFilter =
      normalizedInput.orderStatusFilter === "ALL" ||
      STOREFRONT_ORDER_STATUS_VALUES.includes(
        normalizedInput.orderStatusFilter as (typeof STOREFRONT_ORDER_STATUS_VALUES)[number],
      )
        ? normalizedInput.orderStatusFilter
        : "ALL";
    const safeFollowUpFilter: OrdersFollowUpFilter = ["ALL", "WITH_FOLLOW_UP", "WITHOUT_FOLLOW_UP"].includes(
      normalizedInput.followUpFilter,
    )
      ? normalizedInput.followUpFilter
      : "ALL";
    const safeExportFilter: OrdersExportFilter =
      normalizedInput.exportFilter === "ALL" ||
      normalizedInput.exportFilter === "READY" ||
      normalizedInput.exportFilter === "EXPORTED"
        ? normalizedInput.exportFilter
        : "ALL";
    const focusMode = normalizedInput.focusMode === true;

    const attemptFilterIds =
      safeAttemptFilter !== "ALL" && safeAttemptFilter !== "NOT_CALLED"
        ? await orderIdsWithLatestCallOutcome(safeAttemptFilter)
        : null;

    const baseWhere = buildOrdersWhere(
      {
        ...normalizedInput,
        page: safePage,
        pageSize: safeSize,
        sortBy: safeSortBy,
        sortDir: safeSortDir,
        attemptFilter: safeAttemptFilter,
        orderStatusFilter: safeOrderStatusFilter,
        exportFilter: safeExportFilter,
        followUpFilter: safeFollowUpFilter,
      },
      attemptFilterIds,
    );
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

    const callerListSelect = {
      ...ordersListSelect,
      followUps: {
        where: { deletedAt: null, isClosed: false, dueAt: { not: null } },
        orderBy: { dueAt: "asc" as const },
        take: 1,
        select: { dueAt: true },
      },
    } satisfies Prisma.OrderSelect;

    type CallerListDbRow = Prisma.OrderGetPayload<{ select: typeof callerListSelect }>;

    const rows = await (focusMode
      ? (() => {
          const nowTs = Date.now();
          const focusPriority: Array<"OVERDUE_FOLLOW_UP" | "UPCOMING_FOLLOW_UP" | "NOT_CALLED"> = [
            "OVERDUE_FOLLOW_UP",
            "UPCOMING_FOLLOW_UP",
            "NOT_CALLED",
          ];
          const getRank = (row: CallerListDbRow) => {
            const dueAt = row.followUps[0]?.dueAt ? row.followUps[0].dueAt.getTime() : null;
            if (dueAt !== null && dueAt < nowTs) return focusPriority.indexOf("OVERDUE_FOLLOW_UP");
            if (dueAt !== null) return focusPriority.indexOf("UPCOMING_FOLLOW_UP");
            if (row.callLogs.length === 0) return focusPriority.indexOf("NOT_CALLED");
            return Number.MAX_SAFE_INTEGER;
          };
          return db.order
            .findMany({
              where: focusWhere,
              select: callerListSelect,
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
          select: callerListSelect,
          orderBy,
          skip: (safePage - 1) * safeSize,
          take: safeSize,
        }));

    return {
      rows: rows.map(mapOrdersPageRow),
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
  ["caller-orders-page-v2"],
  { revalidate: 15, tags: ["orders-page"] }
);

export async function getCallerOrdersPage(input: CallerOrdersPageInput): Promise<OrdersPageResult> {
  const { from, to } = normalizeIstCreatedDateParams(input.createdFrom, input.createdTo);
  return getCallerOrdersPageCached({ ...input, createdFrom: from, createdTo: to });
}
