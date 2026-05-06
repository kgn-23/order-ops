"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";

import { requireRole } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import {
  addressValidationSchema,
  assignOrdersSchema,
  bulkSetOrderStageSchema,
  followUpSchema,
  indiaPostTrackingSyncSchema,
  logCallSchema,
  orderUploadRowSchema,
  trackingSyncSchema,
} from "@/app/server/contracts";
import { z } from "zod";
import { parseOrderUpload } from "@/app/server/upload";
import { IndiaPostAdapter } from "@/app/domain/carrier-adapter";

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function mapStage(externalStatus: string) {
  const normalized = externalStatus.toUpperCase();
  if (normalized.includes("DELIVER")) return "DELIVERED";
  if (normalized.includes("RTO")) return "RTO";
  if (normalized.includes("TRANSIT")) return "IN_TRANSIT";
  if (normalized.includes("BOOK")) return "BOOKED";
  return "OTHER";
}

async function logActivity(input: {
  actorUserId?: string;
  orderId?: string;
  entityType: string;
  entityId: string;
  action: string;
  details?: Record<string, unknown>;
}) {
  const { actorUserId, orderId, details, ...rest } = input;

  await db.activityLog.create({
    data: {
      ...rest,
      details: details as Prisma.InputJsonValue | undefined,
      actor: actorUserId ? { connect: { id: actorUserId } } : undefined,
      order: orderId ? { connect: { id: orderId } } : undefined,
    },
  });
}

export async function createOrdersFromUpload(rows: unknown[]) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  const parsedRows = rows.map((row) => orderUploadRowSchema.parse(row));

  const created = await db.$transaction(async (tx) => {
    const orderIds: string[] = [];
    for (const row of parsedRows) {
      const customerPhone = normalizePhone(row.customerPhone);
      const customer = await tx.customer.upsert({
        where: { normalizedKey: customerPhone },
        create: {
          fullName: row.customerName,
          primaryPhone: customerPhone,
          normalizedKey: customerPhone,
        },
        update: { fullName: row.customerName, primaryPhone: customerPhone },
      });

      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          externalOrderId: row.externalOrderId,
          sourceOrderId: row.externalOrderId,
          customerName: row.customerName,
          customerPhone,
          addressLine1: row.addressLine1,
          addressLine2: row.addressLine2,
          city: row.city,
          state: row.state,
          postalCode: row.postalCode,
          trackingNumber: row.trackingNumber,
        },
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          stage: "BOOKED",
          provider: "SYSTEM",
          externalStatus: "BOOKED",
        },
      });

      orderIds.push(order.id);
    }
    return orderIds;
  });

  await Promise.all(
    created.map((orderId) =>
      logActivity({
        actorUserId: session.userId,
        orderId,
        entityType: "Order",
        entityId: orderId,
        action: "ORDER_CREATED_FROM_UPLOAD",
      }),
    ),
  );

  revalidatePath("/");
  revalidatePath("/admin/orders");
  updateTag("orders-page");
  return { createdCount: created.length, orderIds: created };
}

export async function createOrdersFromUploadFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Upload file is required");
  }
  const rows = await parseOrderUpload(file);
  await createOrdersFromUpload(rows);
}

export async function createOrdersAndAssignFromRowsForm(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const rowsJson = String(formData.get("rowsJson") ?? "[]");
  const assigneeId = String(formData.get("assigneeId") ?? "");

  const parsedRows = JSON.parse(rowsJson) as unknown[];
  if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
    throw new Error("No valid rows found in upload.");
  }
  if (!assigneeId) {
    throw new Error("Assignee is required.");
  }

  const { orderIds } = await createOrdersFromUpload(parsedRows);

  await db.$transaction(async (tx) => {
    for (const orderId of orderIds) {
      await tx.orderAssignment.create({
        data: {
          orderId,
          assigneeId,
          assignedByUserId: session.userId,
          assignmentType: "MANUAL",
          reason: "Bulk sheet upload assignment",
        },
      });
      await tx.activityLog.create({
        data: {
          actorUserId: session.userId,
          orderId,
          entityType: "OrderAssignment",
          entityId: orderId,
          action: "ORDER_ASSIGNED_FROM_UPLOAD",
          details: { assigneeId },
        },
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/admin/orders");
  updateTag("orders-page");
}

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

  revalidatePath("/");
  revalidatePath("/admin/orders");
  revalidatePath("/manager/orders");
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

  revalidatePath("/");
  revalidatePath("/admin/orders");
  revalidatePath("/manager/orders");
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

export async function logCall(input: unknown) {
  const session = await requireRole(["CALLER", "MANAGER", "ADMIN"]);
  const payload = logCallSchema.parse(input);

  const call = await db.callLog.create({
    data: {
      orderId: payload.orderId,
      callerId: session.userId,
      outcome: payload.outcome,
      notes: payload.notes,
      callDurationS: payload.callDurationS,
    },
  });

  await logActivity({
    actorUserId: session.userId,
    orderId: payload.orderId,
    entityType: "CallLog",
    entityId: call.id,
    action: "CALL_LOGGED",
    details: { outcome: payload.outcome },
  });

  revalidatePath("/");
}

export async function logCallFromForm(formData: FormData) {
  await logCall({
    orderId: String(formData.get("orderId") ?? ""),
    outcome: String(formData.get("outcome") ?? "OTHER"),
    notes: String(formData.get("notes") ?? "") || undefined,
  });
}

export async function addFollowUp(input: unknown) {
  const session = await requireRole(["CALLER", "MANAGER", "ADMIN"]);
  const payload = followUpSchema.parse(input);
  const followUp = await db.followUp.create({
    data: {
      orderId: payload.orderId,
      createdById: session.userId,
      notes: payload.notes,
      dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
    },
  });

  await logActivity({
    actorUserId: session.userId,
    orderId: payload.orderId,
    entityType: "FollowUp",
    entityId: followUp.id,
    action: "FOLLOW_UP_ADDED",
  });

  revalidatePath("/");
}

export async function addFollowUpFromForm(formData: FormData) {
  await addFollowUp({
    orderId: String(formData.get("orderId") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    dueAt: String(formData.get("dueAt") ?? "") || undefined,
  });
}

export async function syncTrackingStatus(input: unknown) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  const payload = trackingSyncSchema.parse(input);

  const stage = mapStage(payload.externalStatus);
  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: payload.orderId },
      data: { currentStage: stage },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: payload.orderId,
        stage,
        provider: payload.provider,
        externalStatus: payload.externalStatus,
        idempotencyKey: payload.idempotencyKey,
        rawPayload: payload.payload as Prisma.InputJsonValue | undefined,
      },
    });
  });

  await logActivity({
    actorUserId: session.userId,
    orderId: payload.orderId,
    entityType: "OrderStatusEvent",
    entityId: payload.orderId,
    action: "TRACKING_SYNCED",
    details: { provider: payload.provider, externalStatus: payload.externalStatus },
  });

  revalidatePath("/");
}

export async function syncTrackingStatusFromForm(formData: FormData) {
  await syncTrackingStatus({
    orderId: String(formData.get("orderId") ?? ""),
    provider: String(formData.get("provider") ?? "INDIA_POST"),
    externalStatus: String(formData.get("externalStatus") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
  });
}

export async function syncTrackingFromIndiaPost(input: unknown) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  const payload = indiaPostTrackingSyncSchema.parse(input);

  const order = await db.order.findUniqueOrThrow({
    where: { id: payload.orderId },
    select: { id: true, trackingNumber: true },
  });
  if (!order.trackingNumber) {
    throw new Error("Order has no tracking number.");
  }

  const adapter = new IndiaPostAdapter();
  const tracked = await adapter.trackOrder({
    provider: "INDIA_POST",
    trackingNumber: order.trackingNumber,
  });
  const externalStatus = tracked.externalStatus ?? "UNKNOWN";
  const stage = tracked.normalizedStage ?? mapStage(externalStatus);

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { currentStage: stage },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        stage,
        provider: "INDIA_POST",
        externalStatus,
        rawPayload: tracked.rawPayload as Prisma.InputJsonValue | undefined,
      },
    });
  });

  await logActivity({
    actorUserId: session.userId,
    orderId: order.id,
    entityType: "OrderStatusEvent",
    entityId: order.id,
    action: "TRACKING_SYNCED_FROM_INDIA_POST_API",
    details: { externalStatus, trackingNumber: order.trackingNumber },
  });

  revalidatePath("/");
  revalidatePath("/admin/orders");
  revalidatePath("/manager/orders");
  revalidatePath("/caller/orders");
  return { stage, externalStatus };
}

export type IndiaPostSyncFormState =
  | { status: "idle" }
  | { status: "success"; stage: string; externalStatus: string }
  | { status: "error"; error: string };

export async function syncTrackingFromIndiaPostFormAction(
  _prev: IndiaPostSyncFormState,
  formData: FormData,
): Promise<IndiaPostSyncFormState> {
  const orderId = String(formData.get("orderId") ?? "");
  try {
    const result = await syncTrackingFromIndiaPost({
      orderId,
    });
    return {
      status: "success",
      stage: result.stage,
      externalStatus: result.externalStatus,
    };
  } catch (e) {
    console.error("[IndiaPostSync] syncTrackingFromIndiaPostFormAction failed", {
      orderId,
      error:
        e instanceof Error
          ? {
              name: e.name,
              message: e.message,
              stack: e.stack,
              cause: e.cause,
            }
          : e,
    });
    if (e instanceof z.ZodError) {
      return { status: "error", error: e.issues.map((i) => i.message).join("; ") };
    }
    const message = e instanceof Error ? e.message : "Tracking sync failed.";
    return { status: "error", error: message };
  }
}

export async function validateAddress(input: unknown) {
  const session = await requireRole(["CALLER", "MANAGER", "ADMIN"]);
  const payload = addressValidationSchema.parse(input);
  const order = await db.order.findUniqueOrThrow({
    where: { id: payload.orderId },
    select: {
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
    },
  });

  const originalAddress = [
    order.addressLine1,
    order.addressLine2,
    order.city,
    order.state,
    order.postalCode,
    order.country,
  ]
    .filter(Boolean)
    .join(", ");

  const result = await db.addressValidationResult.create({
    data: {
      orderId: payload.orderId,
      originalAddress,
      suggestedAddress: payload.suggestedAddress,
      confidence: payload.confidence,
      remarks: payload.remarks,
      validatedBy: "LLM_ASSIST",
    },
  });

  await logActivity({
    actorUserId: session.userId,
    orderId: payload.orderId,
    entityType: "AddressValidationResult",
    entityId: result.id,
    action: "ADDRESS_VALIDATED",
    details: { confidence: payload.confidence },
  });

  revalidatePath("/");
}

export async function validateAddressFromForm(formData: FormData) {
  const confidenceValue = String(formData.get("confidence") ?? "");

  await validateAddress({
    orderId: String(formData.get("orderId") ?? ""),
    suggestedAddress: String(formData.get("suggestedAddress") ?? "") || undefined,
    confidence: confidenceValue ? Number(confidenceValue) : undefined,
    remarks: String(formData.get("remarks") ?? "") || undefined,
  });
}
