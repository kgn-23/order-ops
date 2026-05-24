"use server";

import { updateTag } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertAssigneeAllowedForSession } from "@/lib/team/caller-assign";
import { STOREFRONT_ORDER_SOURCE } from "@/lib/orders/source";
import {
  parseBulkUploadListContext,
  resolveOrderSourceForUpload,
  type BulkUploadListContext,
} from "@/lib/orders/upload-source";
import { enrichOrderRowFromMerchantNotes } from "@/lib/orders/parse-merchant-notes";
import { parseOrderUpload } from "@/lib/orders/parse-upload";
import { orderUploadRowSchema } from "@/lib/validators/contracts";
import {
  logActivity,
  normalizePhone,
  parseMerchantOrderCreatedAt,
  revalidateOrderListViews,
} from "@/lib/orders/actions/shared";
import { recordCommerceStatusChange } from "@/lib/orders/record-commerce-status";

export async function createOrdersFromUpload(
  rows: unknown[],
  options?: { listContext?: BulkUploadListContext | null },
) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  const parsedRows = rows.map((row) =>
    orderUploadRowSchema.parse(enrichOrderRowFromMerchantNotes(row as Record<string, unknown>)),
  );
  const listContext = options?.listContext ?? null;

  const created = await db.$transaction(async (tx) => {
    const orderIds: string[] = [];
    const sourceByOrderId = new Map<string, string>();
    for (const row of parsedRows) {
      const sourceSystem = resolveOrderSourceForUpload(row, listContext);
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

      const displayRef = row.merchantOrderDisplayName ?? row.externalOrderId ?? undefined;

      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          externalOrderId: row.externalOrderId,
          sourceOrderId: row.externalOrderId ?? displayRef,
          sourceSystem,
          orderStatus: sourceSystem === STOREFRONT_ORDER_SOURCE ? "PENDING" : undefined,
          customerName: row.customerName,
          customerPhone,
          addressLine1: row.addressLine1,
          addressLine2: row.addressLine2,
          addressLine3: row.addressLine3,
          city: row.city,
          state: row.state,
          postalCode: row.postalCode,
          trackingNumber: row.trackingNumber,
          merchantOrderDisplayName: row.merchantOrderDisplayName,
          merchantOrderCreatedAt: parseMerchantOrderCreatedAt(row.merchantOrderCreatedAt),
          financialStatus: row.financialStatus,
          fulfillmentStatus: row.fulfillmentStatus,
          currencyCode: row.currencyCode,
          subtotalAmount: row.subtotalAmount,
          shippingAmount: row.shippingAmount,
          taxesAmount: row.taxesAmount,
          totalAmount: row.totalAmount,
          discountAmount: row.discountAmount,
          paymentMethod: row.paymentMethod,
          paymentReference: row.paymentReference,
          shippingMethodLabel: row.shippingMethodLabel,
          merchantOrderNotes: row.merchantOrderNotes,
          orderTags: row.orderTags,
          primaryVendor: row.primaryVendor,
          orderChannel: row.orderChannel,
          riskLevel: row.riskLevel,
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

      if (sourceSystem === STOREFRONT_ORDER_SOURCE) {
        await recordCommerceStatusChange(tx, {
          orderId: order.id,
          fromStatus: null,
          toStatus: "PENDING",
          changedById: session.userId,
          source: "UPLOAD",
        });
      }

      if (
        row.lineItemTitle ||
        row.lineItemSku ||
        row.lineItemQuantity != null ||
        row.lineItemUnitPrice != null
      ) {
        await tx.orderLineItem.create({
          data: {
            orderId: order.id,
            title: row.lineItemTitle ?? null,
            sku: row.lineItemSku ?? null,
            quantity: row.lineItemQuantity ?? null,
            unitPrice: row.lineItemUnitPrice ?? null,
          },
        });
      }

      orderIds.push(order.id);
      sourceByOrderId.set(order.id, sourceSystem);
    }
    return { orderIds, sourceByOrderId };
  });

  await Promise.all(
    created.orderIds.map((orderId) =>
      logActivity({
        actorUserId: session.userId,
        orderId,
        entityType: "Order",
        entityId: orderId,
        action: "ORDER_CREATED_FROM_UPLOAD",
        details: { sourceSystem: created.sourceByOrderId.get(orderId) ?? "MANUAL" },
      }),
    ),
  );

  return { createdCount: created.orderIds.length, orderIds: created.orderIds };
}

export async function createOrdersFromUploadFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Upload file is required");
  }
  const rows = await parseOrderUpload(file);
  await createOrdersFromUpload(rows);
  revalidateOrderListViews();
  updateTag("orders-page");
}

export async function createOrdersAndAssignFromRowsForm(formData: FormData) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  const rowsJson = String(formData.get("rowsJson") ?? "[]");
  const assigneeId = String(formData.get("assigneeId") ?? "");

  const parsedRows = JSON.parse(rowsJson) as unknown[];
  if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
    throw new Error("No valid rows found in upload.");
  }
  if (!assigneeId) {
    throw new Error("Assignee is required.");
  }

  await assertAssigneeAllowedForSession(session, assigneeId);

  const listContext = parseBulkUploadListContext(String(formData.get("uploadListContext") ?? ""));
  if (!listContext) {
    throw new Error("Upload list context is required.");
  }

  const { orderIds } = await createOrdersFromUpload(parsedRows, { listContext });

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

  revalidateOrderListViews();
  updateTag("orders-page");
}
