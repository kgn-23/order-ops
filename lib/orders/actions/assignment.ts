"use server";

import { updateTag } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyManualOrderStage } from "@/lib/orders/apply-manual-stage";
import { assertAssigneeAllowedForSession } from "@/lib/team/caller-assign";
import { assignOrdersSchema, bulkSetOrderStageSchema, setOrderStageSchema } from "@/lib/validators/contracts";
import { revalidateOrderListViews } from "@/lib/orders/actions/shared";

const STAGE_EDITOR_ROLES = ["ADMIN", "MANAGER", "CALLER"] as const;

export async function assignOrders(input: unknown) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  const payload = assignOrdersSchema.parse(input);
  await assertAssigneeAllowedForSession(session, payload.assigneeId);

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

/** Manual stage override (admin/manager/caller). Does not pull carrier status. */
export async function bulkSetOrderStage(input: unknown) {
  const session = await requireRole([...STAGE_EDITOR_ROLES]);
  const payload = bulkSetOrderStageSchema.parse(input);

  await db.$transaction(async (tx) => {
    for (const orderId of payload.orderIds) {
      const result = await applyManualOrderStage(tx, { orderId, stage: payload.stage });
      if (result.changed) {
        await tx.activityLog.create({
          data: {
            actorUserId: session.userId,
            orderId,
            entityType: "Order",
            entityId: orderId,
            action: "ORDER_STAGE_SET_MANUAL",
            details: { stage: payload.stage, previousStage: result.previousStage },
          },
        });
      }
    }
  });

  revalidateOrderListViews();
  updateTag("orders-page");
}

export async function setOrderStage(input: unknown) {
  const session = await requireRole([...STAGE_EDITOR_ROLES]);
  const payload = setOrderStageSchema.parse(input);

  await db.$transaction(async (tx) => {
    const result = await applyManualOrderStage(tx, {
      orderId: payload.orderId,
      stage: payload.stage,
    });
    if (result.changed) {
      await tx.activityLog.create({
        data: {
          actorUserId: session.userId,
          orderId: payload.orderId,
          entityType: "Order",
          entityId: payload.orderId,
          action: "ORDER_STAGE_SET_MANUAL",
          details: { stage: payload.stage, previousStage: result.previousStage },
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
