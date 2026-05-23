import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { getIstDayRangeUtc } from "@/lib/ist-time";
import { STOREFRONT_ORDER_SOURCE } from "@/lib/orders/source";

export type CallerCommerceConfirmStat = {
  callerId: string;
  callerName: string;
  confirmedCount: number;
};

/** Distinct storefront orders marked CONFIRMED per caller in an IST calendar day (from status history). */
export async function getCallerConfirmStatsForIstDay(
  day: Date = new Date(),
): Promise<CallerCommerceConfirmStat[]> {
  const { start, endExclusive } = getIstDayRangeUtc(day);

  const events = await db.orderCommerceStatusEvent.findMany({
    where: {
      deletedAt: null,
      toStatus: "CONFIRMED",
      createdAt: { gte: start, lt: endExclusive },
      order: {
        deletedAt: null,
        sourceSystem: STOREFRONT_ORDER_SOURCE,
      },
      changedById: { not: null },
    },
    select: {
      orderId: true,
      changedById: true,
      changedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const byCaller = new Map<string, { name: string; orderIds: Set<string> }>();
  for (const event of events) {
    const callerId = event.changedById;
    if (!callerId) continue;
    const entry = byCaller.get(callerId) ?? {
      name: event.changedBy?.name ?? "Unknown",
      orderIds: new Set<string>(),
    };
    entry.orderIds.add(event.orderId);
    byCaller.set(callerId, entry);
  }

  return Array.from(byCaller.entries())
    .map(([callerId, { name, orderIds }]) => ({
      callerId,
      callerName: name,
      confirmedCount: orderIds.size,
    }))
    .sort((a, b) => b.confirmedCount - a.confirmedCount || a.callerName.localeCompare(b.callerName));
}

/** Count storefront status transitions to a given status in an IST day. */
export async function countCommerceStatusTransitions(
  toStatus: "PENDING" | "CONFIRMED" | "CANCELLED",
  day: Date = new Date(),
): Promise<number> {
  const { start, endExclusive } = getIstDayRangeUtc(day);
  return db.orderCommerceStatusEvent.count({
    where: {
      deletedAt: null,
      toStatus,
      createdAt: { gte: start, lt: endExclusive },
      order: {
        deletedAt: null,
        sourceSystem: STOREFRONT_ORDER_SOURCE,
      },
    },
  });
}

export type CommerceStatusFunnelRow = {
  toStatus: string;
  count: number;
};

/** Daily funnel: transitions grouped by target status (IST day). */
export async function getCommerceStatusFunnelForIstDay(
  day: Date = new Date(),
): Promise<CommerceStatusFunnelRow[]> {
  const { start, endExclusive } = getIstDayRangeUtc(day);

  const grouped = await db.orderCommerceStatusEvent.groupBy({
    by: ["toStatus"],
    where: {
      deletedAt: null,
      createdAt: { gte: start, lt: endExclusive },
      order: {
        deletedAt: null,
        sourceSystem: STOREFRONT_ORDER_SOURCE,
      },
    },
    _count: { _all: true },
  });

  return grouped
    .map((row) => ({
      toStatus: row.toStatus,
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);
}

export type CommerceStatusHistoryRow = {
  id: string;
  createdAt: Date;
  fromStatus: string | null;
  toStatus: string;
  source: string;
  changedByName: string | null;
};

export function commerceStatusHistorySelect(): Prisma.OrderCommerceStatusEventSelect {
  return {
    id: true,
    createdAt: true,
    fromStatus: true,
    toStatus: true,
    source: true,
    changedBy: { select: { name: true } },
  };
}
