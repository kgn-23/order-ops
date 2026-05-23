import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { getIstDayRangeUtc } from "@/lib/ist-time";
import { CALL_OUTCOME_VALUES, type CallOutcome } from "@/lib/orders/call-outcomes";

export type CallLogsSearchKey = "orderId" | "customerName" | "customerPhone" | "callerName";
export type CallLogsSortBy = "calledAt" | "callerName" | "outcome";
export type CallLogsSortDir = "asc" | "desc";
export type CallLogsOutcomeFilter = "ALL" | CallOutcome;
export type CallLogsStageFilter = "ALL" | "BOOKED" | "IN_TRANSIT" | "DELIVERED" | "RTO" | "OTHER";

export const CALL_LOGS_OUTCOME_FILTERS: CallLogsOutcomeFilter[] = ["ALL", ...CALL_OUTCOME_VALUES];

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
    called: number;
    noAnswer: number;
    busy: number;
    failed: number;
    invalidNumber: number;
    other: number;
    avgDurationS: number;
  };
  topCallers: Array<{ callerId: string; callerName: string; callCount: number }>;
};

export type CallLogsPageInput = {
  page: number;
  pageSize: number;
  searchKey: CallLogsSearchKey;
  q?: string;
  outcome: CallLogsOutcomeFilter;
  stage: CallLogsStageFilter;
  sortBy: CallLogsSortBy;
  sortDir: CallLogsSortDir;
};

export type CallerCallLogsPageInput = CallLogsPageInput & { userId: string };

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

async function getCallLogsPageBase(
  where: Prisma.CallLogWhereInput,
  input: CallLogsPageInput,
): Promise<CallLogsPageResult> {
  const safePage = Math.max(1, Math.floor(input.page));
  const allowedSizes = [50, 100, 200, 300];
  const safeSize = allowedSizes.includes(input.pageSize) ? input.pageSize : 50;
  const orderBy = buildCallLogsOrderBy(input);
  const { start: istTodayStart, endExclusive: istTodayEnd } = getIstDayRangeUtc();

  const [total, rows, today, called, noAnswer, busy, failed, invalidNumber, other, durationStats, topCallersRaw] =
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
      db.callLog.count({
        where: { ...where, calledAt: { gte: istTodayStart, lt: istTodayEnd } },
      }),
      db.callLog.count({ where: { ...where, outcome: "CALLED" } }),
      db.callLog.count({ where: { ...where, outcome: "NO_ANSWER" } }),
      db.callLog.count({ where: { ...where, outcome: "BUSY" } }),
      db.callLog.count({ where: { ...where, outcome: "FAILED" } }),
      db.callLog.count({ where: { ...where, outcome: "INVALID_NUMBER" } }),
      db.callLog.count({ where: { ...where, outcome: "OTHER" } }),
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
      called,
      noAnswer,
      busy,
      failed,
      invalidNumber,
      other,
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
