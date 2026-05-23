import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { getIstDayRangeUtc } from "@/lib/ist-time";

export async function getAdminSummary() {
  const { start: istTodayStart, endExclusive: istTodayEnd } = getIstDayRangeUtc();
  const [orderCount, deliveredCount, rtoCount, openFollowUps, todayCalls, activeAssignments] =
    await Promise.all([
      db.order.count({ where: { deletedAt: null } }),
      db.order.count({ where: { deletedAt: null, currentStage: "DELIVERED" } }),
      db.order.count({ where: { deletedAt: null, currentStage: "RTO" } }),
      db.followUp.count({ where: { deletedAt: null, isClosed: false } }),
      db.callLog.count({
        where: {
          deletedAt: null,
          calledAt: { gte: istTodayStart, lt: istTodayEnd },
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
  const { start: startOfDay, endExclusive: endOfDay } = getIstDayRangeUtc();

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
        where: { deletedAt: null, callerId: userId, calledAt: { gte: startOfDay, lt: endOfDay } },
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
          dueAt: { gte: startOfDay, lt: endOfDay },
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
