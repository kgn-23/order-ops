"use server";

import { requireRole } from "@/app/lib/auth";
import { db } from "@/app/lib/db";

export type OrderDetailPayload = {
  id: string;
  createdAt: string;
  updatedAt: string;
  externalOrderId: string | null;
  sourceSystem: string;
  sourceOrderId: string | null;
  trackingNumber: string | null;
  currentStage: string;
  customerName: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  customer: {
    id: string;
    fullName: string;
    primaryPhone: string;
    secondaryPhone: string | null;
    email: string | null;
  };
  attempts: Array<{
    id: string;
    calledAt: string;
    outcome: string;
    notes: string | null;
    callDurationS: number | null;
    callerName: string;
  }>;
  statusTimeline: Array<{
    id: string;
    eventAt: string;
    stage: string;
    provider: string;
    externalStatus: string;
    notes: string | null;
  }>;
  followUps: Array<{
    id: string;
    createdAt: string;
    dueAt: string | null;
    isClosed: boolean;
    notes: string;
    createdByName: string;
  }>;
  assignmentHistory: Array<{
    id: string;
    assignedAt: string;
    unassignedAt: string | null;
    isActive: boolean;
    assignmentType: string;
    reason: string | null;
    assigneeName: string;
    assignedByName: string;
  }>;
};

export async function getOrderDetails(orderId: string): Promise<OrderDetailPayload> {
  await requireRole(["ADMIN", "MANAGER", "CALLER"]);

  const row = await db.order.findFirst({
    where: { id: orderId, deletedAt: null },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      externalOrderId: true,
      sourceSystem: true,
      sourceOrderId: true,
      trackingNumber: true,
      currentStage: true,
      customerName: true,
      customerPhone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      customer: {
        select: {
          id: true,
          fullName: true,
          primaryPhone: true,
          secondaryPhone: true,
          email: true,
        },
      },
      callLogs: {
        where: { deletedAt: null },
        orderBy: { calledAt: "desc" },
        take: 20,
        select: {
          id: true,
          calledAt: true,
          outcome: true,
          notes: true,
          callDurationS: true,
          caller: { select: { name: true } },
        },
      },
      statusEvents: {
        where: { deletedAt: null },
        orderBy: { eventAt: "desc" },
        take: 20,
        select: {
          id: true,
          eventAt: true,
          stage: true,
          provider: true,
          externalStatus: true,
          notes: true,
        },
      },
      followUps: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          dueAt: true,
          isClosed: true,
          notes: true,
          createdBy: { select: { name: true } },
        },
      },
      assignments: {
        where: { deletedAt: null },
        orderBy: { assignedAt: "desc" },
        take: 20,
        select: {
          id: true,
          assignedAt: true,
          unassignedAt: true,
          isActive: true,
          assignmentType: true,
          reason: true,
          assignee: { select: { name: true } },
          assignedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!row) {
    throw new Error("Order not found.");
  }

  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    externalOrderId: row.externalOrderId,
    sourceSystem: row.sourceSystem,
    sourceOrderId: row.sourceOrderId,
    trackingNumber: row.trackingNumber,
    currentStage: row.currentStage,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
    customer: row.customer,
    attempts: row.callLogs.map((item) => ({
      id: item.id,
      calledAt: item.calledAt.toISOString(),
      outcome: item.outcome,
      notes: item.notes,
      callDurationS: item.callDurationS,
      callerName: item.caller.name,
    })),
    statusTimeline: row.statusEvents.map((item) => ({
      id: item.id,
      eventAt: item.eventAt.toISOString(),
      stage: item.stage,
      provider: item.provider,
      externalStatus: item.externalStatus,
      notes: item.notes,
    })),
    followUps: row.followUps.map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      dueAt: item.dueAt ? item.dueAt.toISOString() : null,
      isClosed: item.isClosed,
      notes: item.notes,
      createdByName: item.createdBy.name,
    })),
    assignmentHistory: row.assignments.map((item) => ({
      id: item.id,
      assignedAt: item.assignedAt.toISOString(),
      unassignedAt: item.unassignedAt ? item.unassignedAt.toISOString() : null,
      isActive: item.isActive,
      assignmentType: item.assignmentType,
      reason: item.reason,
      assigneeName: item.assignee.name,
      assignedByName: item.assignedBy.name,
    })),
  };
}
