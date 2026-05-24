"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStorefrontConfirmOutcome } from "@/lib/orders/call-outcomes";
import { formatOrderAddressSummary } from "@/lib/orders/parse-merchant-notes";
import { STOREFRONT_ORDER_SOURCE } from "@/lib/orders/source";
import { isStorefrontOrderConfirmed } from "@/lib/orders/storefront-order-status";
import { logActivity, normalizePhone, revalidateOrderListViews } from "@/lib/orders/actions/shared";
import { recordCommerceStatusChange } from "@/lib/orders/record-commerce-status";
import { followUpSchema, logCallSchema } from "@/lib/validators/contracts";

export async function logCall(input: unknown) {
  const session = await requireRole(["CALLER", "ADMIN", "MANAGER"]);
  const payload = logCallSchema.parse(input);
  const order = await db.order.findFirst({
    where: { id: payload.orderId, deletedAt: null },
    select: { currentStage: true, sourceSystem: true, orderStatus: true },
  });
  if (!order) {
    throw new Error("Order not found.");
  }

  const isStorefront = order.sourceSystem === STOREFRONT_ORDER_SOURCE;

  if (
    isStorefrontConfirmOutcome(payload.outcome) &&
    isStorefront &&
    !payload.confirmedAddress
  ) {
    throw new Error("Shipping address is required when logging a Called outcome on a storefront order.");
  }

  if (payload.confirmedAddress && !isStorefront) {
    throw new Error("Structured address updates apply to storefront orders only.");
  }

  if (payload.orderStatus && !isStorefront) {
    throw new Error("Order status updates apply to storefront orders only.");
  }

  const call = await db.$transaction(async (tx) => {
    const created = await tx.callLog.create({
      data: {
        orderId: payload.orderId,
        callerId: session.userId,
        orderStage: order.currentStage,
        outcome: payload.outcome,
        notes: payload.notes,
        callDurationS: payload.callDurationS,
      },
    });

    const orderPatch: {
      customerName?: string;
      customerPhone?: string;
      addressLine1?: string;
      addressLine2?: string | null;
      addressLine3?: string | null;
      city?: string;
      state?: string;
      postalCode?: string;
      refinedAddress?: string;
    } = {};

    if (payload.confirmedAddress) {
      const phone = normalizePhone(payload.confirmedAddress.customerPhone);
      orderPatch.customerName = payload.confirmedAddress.customerName.trim();
      orderPatch.customerPhone = phone;
      orderPatch.addressLine1 = payload.confirmedAddress.addressLine1.trim();
      orderPatch.addressLine2 = payload.confirmedAddress.addressLine2?.trim() || null;
      orderPatch.addressLine3 = payload.confirmedAddress.addressLine3?.trim() || null;
      orderPatch.city = payload.confirmedAddress.city.trim();
      orderPatch.state = payload.confirmedAddress.state.trim();
      orderPatch.postalCode = payload.confirmedAddress.postalCode.trim();
      orderPatch.refinedAddress = formatOrderAddressSummary({
        addressLine1: payload.confirmedAddress.addressLine1.trim(),
        addressLine2: payload.confirmedAddress.addressLine2,
        addressLine3: payload.confirmedAddress.addressLine3,
        city: payload.confirmedAddress.city.trim(),
        state: payload.confirmedAddress.state.trim(),
        postalCode: payload.confirmedAddress.postalCode.trim(),
      });
    }

    if (isStorefront && payload.orderStatus) {
      await recordCommerceStatusChange(tx, {
        orderId: payload.orderId,
        fromStatus: order.orderStatus ?? "PENDING",
        toStatus: payload.orderStatus,
        changedById: session.userId,
        source: "CALL_LOG",
        callLogId: created.id,
      });
    }

    if (Object.keys(orderPatch).length > 0) {
      await tx.order.update({
        where: { id: payload.orderId },
        data: orderPatch,
      });
    } else if (payload.refinedAddress) {
      await tx.order.update({
        where: { id: payload.orderId },
        data: { refinedAddress: payload.refinedAddress },
      });
    }

    return created;
  });

  await logActivity({
    actorUserId: session.userId,
    orderId: payload.orderId,
    entityType: "CallLog",
    entityId: call.id,
    action: "CALL_LOGGED",
    details: {
      outcome: payload.outcome,
      ...(payload.confirmedAddress ? { addressUpdated: true } : {}),
      ...(payload.orderStatus ? { orderStatus: payload.orderStatus } : {}),
      ...(payload.refinedAddress ? { refinedAddressSaved: true } : {}),
    },
  });

  revalidateOrderListViews();
  revalidatePath("/admin/call-logs");
  revalidatePath("/manager/call-logs");
  revalidatePath("/caller/call-logs");
  updateTag("orders-page");
}

export async function logCallFromForm(formData: FormData) {
  await logCall({
    orderId: String(formData.get("orderId") ?? ""),
    outcome: String(formData.get("outcome") ?? "OTHER"),
    notes: String(formData.get("notes") ?? "") || undefined,
    refinedAddress: String(formData.get("refinedAddress") ?? "").trim() || undefined,
  });
}

export async function addFollowUp(input: unknown) {
  const session = await requireRole(["CALLER", "ADMIN", "MANAGER"]);
  const payload = followUpSchema.parse(input);

  const order = await db.order.findFirst({
    where: { id: payload.orderId, deletedAt: null },
    select: { sourceSystem: true, orderStatus: true },
  });
  if (!order) {
    throw new Error("Order not found.");
  }

  if (
    order.sourceSystem === STOREFRONT_ORDER_SOURCE &&
    isStorefrontOrderConfirmed(order.orderStatus)
  ) {
    throw new Error("Follow-ups are not needed for confirmed storefront orders.");
  }

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

  revalidateOrderListViews();
  updateTag("orders-page");
}

export async function addFollowUpFromForm(formData: FormData) {
  await addFollowUp({
    orderId: String(formData.get("orderId") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    dueAt: String(formData.get("dueAt") ?? "") || undefined,
  });
}
