"use server";

import { updateTag } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { IndiaPostAdapter } from "@/lib/domain/carrier-adapter";
import { indiaPostTrackingSyncSchema, trackingSyncSchema } from "@/lib/validators/contracts";
import { logActivity, mapStage, revalidateOrderListViews } from "@/lib/orders/actions/shared";

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

  revalidateOrderListViews();
  updateTag("orders-page");
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

  revalidateOrderListViews();
  updateTag("orders-page");
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
    const result = await syncTrackingFromIndiaPost({ orderId });
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
          ? { name: e.name, message: e.message, stack: e.stack, cause: e.cause }
          : e,
    });
    if (e instanceof z.ZodError) {
      return { status: "error", error: e.issues.map((i) => i.message).join("; ") };
    }
    const message = e instanceof Error ? e.message : "Tracking sync failed.";
    return { status: "error", error: message };
  }
}
