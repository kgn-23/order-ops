"use server";

import { updateTag } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignOrdersSchema, bulkSetOrderStageSchema } from "@/lib/validators/contracts";
import { revalidateOrderListViews } from "@/lib/orders/actions/shared";

export async function assignOrders(input: unknown) {
  const session = await requireRole(["ADMIN"]);
  const payload = assignOrdersSchema.parse(input);

  await db.$transaction(async (tx) => {
    for (const orderId of payload.orderIds) {
      await tx.orderAssignment.updateMany({
        where: { orderId, isActive: true },
        data: { isActive: false, unassignedAt: new Date() },
      });
      await tx.orderAssignment.create({
        data: {
          orderId,
          assigneeId: payload.assigneeId,
          assignedByUserId: session.userId,
          reason: payload.reason,
          assignmentType: payload.assignmentType,
        },
      });
      await tx.activityLog.create({
        data: {
          actorUserId: session.userId,
          orderId,
          entityType: "OrderAssignment",
          entityId: orderId,
          action: "ORDER_ASSIGNED",
          details: {
            assigneeId: payload.assigneeId,
            assignmentType: payload.assignmentType,
          },
        },
      });
    }
  });

  revalidateOrderListViews();
  updateTag("orders-page");
}

/** Manual stage override (admin). Does not pull carrier status — use sync flows for India Post truth. */
export async function bulkSetOrderStage(input: unknown) {
  const session = await requireRole(["ADMIN"]);
  const payload = bulkSetOrderStageSchema.parse(input);

  await db.$transaction(async (tx) => {
    for (const orderId of payload.orderIds) {
      await tx.order.updateMany({
        where: { id: orderId, deletedAt: null },
        data: { currentStage: payload.stage },
      });
      await tx.activityLog.create({
        data: {
          actorUserId: session.userId,
          orderId,
          entityType: "Order",
          entityId: orderId,
          action: "ORDER_STAGE_SET_MANUAL",
          details: { stage: payload.stage },
        },
      });
    }
  });

  revalidateOrderListViews();
  updateTag("orders-page");
}

export async function assignOrdersFromForm(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const assigneeId = String(formData.get("assigneeId") ?? "");
  const reason = String(formData.get("reason") ?? "");

  await assignOrders({
    orderIds: [orderId],
    assigneeId,
    reason: reason || undefined,
    assignmentType: "MANUAL",
  });
}

export async function reassignOrder(input: unknown) {
  return assignOrders(input);
}
