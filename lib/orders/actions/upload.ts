"use server";

import { updateTag } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import type { z } from "zod";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertAssigneeAllowedForSession } from "@/lib/team/caller-assign";
import { STOREFRONT_ORDER_SOURCE } from "@/lib/orders/source";
import {
  parseBulkUploadListContext,
  resolveOrderSourceForUpload,
  type BulkUploadListContext,
} from "@/lib/orders/upload-source";
import {
  ASSIGN_BATCH_SIZE,
  chunk,
  UPLOAD_BATCH_SIZE,
  UPLOAD_TX_OPTIONS,
} from "@/lib/orders/upload-batch";
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
import {
  analyzeUploadDuplicates,
  type UploadDuplicateAnalysis,
  type UploadDuplicateReason,
} from "@/lib/orders/upload-duplicate-check";

type ParsedUploadRow = z.infer<typeof orderUploadRowSchema>;

async function insertUploadRow(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  row: ParsedUploadRow,
  listContext: BulkUploadListContext | null,
): Promise<{ orderId: string; sourceSystem: string }> {
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
      changedById: actorUserId,
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

  return { orderId: order.id, sourceSystem };
}

function parseUploadRows(rows: unknown[]): ParsedUploadRow[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No valid rows found in upload.");
  }
  return rows.map((row) =>
    orderUploadRowSchema.parse(enrichOrderRowFromMerchantNotes(row as Record<string, unknown>)),
  );
}

type UploadRowWithOverride = ParsedUploadRow & { duplicateOverride?: boolean };

type CreatedUploadRow = {
  orderId: string;
  sourceSystem: string;
  duplicateOverride?: boolean;
  duplicateReasons?: UploadDuplicateReason[];
};

async function createOrdersBatch(
  parsedRows: UploadRowWithOverride[],
  listContext: BulkUploadListContext | null,
  actorUserId: string,
): Promise<{ created: CreatedUploadRow[]; skippedCount: number }> {
  const duplicateAnalysis = await analyzeUploadDuplicates(parsedRows);
  const duplicateByIndex = new Map(
    duplicateAnalysis.rows.map((row) => [row.rowIndex, row] as const),
  );

  const rowsToInsert: Array<{
    row: ParsedUploadRow;
    duplicateOverride?: boolean;
    duplicateReasons?: UploadDuplicateReason[];
  }> = [];
  let skippedCount = 0;

  parsedRows.forEach((row, rowIndex) => {
    const duplicate = duplicateByIndex.get(rowIndex);
    if (duplicate?.isDuplicate && !row.duplicateOverride) {
      skippedCount += 1;
      return;
    }
    const { duplicateOverride, ...orderRow } = row;
    rowsToInsert.push({
      row: orderRow,
      duplicateOverride,
      duplicateReasons: duplicate?.reasons,
    });
  });

  const batchResult = await db.$transaction(
    async (tx) => {
      const created: CreatedUploadRow[] = [];
      for (const item of rowsToInsert) {
        const { orderId, sourceSystem } = await insertUploadRow(
          tx,
          actorUserId,
          item.row,
          listContext,
        );
        created.push({
          orderId,
          sourceSystem,
          duplicateOverride: item.duplicateOverride,
          duplicateReasons: item.duplicateReasons,
        });
      }
      return created;
    },
    UPLOAD_TX_OPTIONS,
  );

  return { created: batchResult, skippedCount };
}

async function assignOrderIds(
  orderIds: string[],
  assigneeId: string,
  actorUserId: string,
): Promise<void> {
  for (const batch of chunk(orderIds, ASSIGN_BATCH_SIZE)) {
    await db.$transaction(
      async (tx) => {
        for (const orderId of batch) {
          await tx.orderAssignment.create({
            data: {
              orderId,
              assigneeId,
              assignedByUserId: actorUserId,
              assignmentType: "MANUAL",
              reason: "Bulk sheet upload assignment",
            },
          });
          await tx.activityLog.create({
            data: {
              actorUserId,
              orderId,
              entityType: "OrderAssignment",
              entityId: orderId,
              action: "ORDER_ASSIGNED_FROM_UPLOAD",
              details: { assigneeId },
            },
          });
        }
      },
      UPLOAD_TX_OPTIONS,
    );
  }
}

async function logOrdersCreated(
  created: CreatedUploadRow[],
  actorUserId: string,
): Promise<void> {
  await Promise.all(
    created.map((item) =>
      logActivity({
        actorUserId,
        orderId: item.orderId,
        entityType: "Order",
        entityId: item.orderId,
        action: "ORDER_CREATED_FROM_UPLOAD",
        details: {
          sourceSystem: item.sourceSystem,
          ...(item.duplicateOverride
            ? { duplicateOverride: true, reasons: item.duplicateReasons ?? [] }
            : {}),
        },
      }),
    ),
  );
}

/** Scan parsed upload rows for possible duplicates (30-day window + within-file). */
export async function checkBulkUploadDuplicates(rows: unknown[]): Promise<UploadDuplicateAnalysis> {
  await requireRole(["ADMIN", "MANAGER"]);
  const parsedRows = parseUploadRows(rows);
  return analyzeUploadDuplicates(parsedRows);
}

/** Create + assign one upload batch (≤ UPLOAD_BATCH_SIZE rows). Used by the client for progress updates. */
export async function processBulkUploadBatch(input: {
  rows: unknown[];
  assigneeId: string;
  listContext: BulkUploadListContext;
}): Promise<{ createdCount: number; skippedCount: number }> {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  if (!input.assigneeId) {
    throw new Error("Assignee is required.");
  }
  await assertAssigneeAllowedForSession(session, input.assigneeId);

  const parsedRows = parseUploadRows(input.rows);
  if (parsedRows.length > UPLOAD_BATCH_SIZE) {
    throw new Error(`Each batch may contain at most ${UPLOAD_BATCH_SIZE} rows.`);
  }

  const { created, skippedCount } = await createOrdersBatch(
    parsedRows,
    input.listContext,
    session.userId,
  );
  const orderIds = created.map((item) => item.orderId);
  await assignOrderIds(orderIds, input.assigneeId, session.userId);
  await logOrdersCreated(created, session.userId);

  return { createdCount: orderIds.length, skippedCount };
}

/** Revalidate order lists after all client-side batches complete. */
export async function finishBulkUpload(): Promise<void> {
  await requireRole(["ADMIN", "MANAGER"]);
  revalidateOrderListViews();
  updateTag("orders-page");
}

export async function createOrdersFromUpload(
  rows: unknown[],
  options?: { listContext?: BulkUploadListContext | null },
) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  const parsedRows = parseUploadRows(rows);
  const listContext = options?.listContext ?? null;

  const createdRows: CreatedUploadRow[] = [];
  let skippedCount = 0;

  for (const batch of chunk(parsedRows, UPLOAD_BATCH_SIZE)) {
    const result = await createOrdersBatch(batch, listContext, session.userId);
    createdRows.push(...result.created);
    skippedCount += result.skippedCount;
  }

  await logOrdersCreated(createdRows, session.userId);

  return {
    createdCount: createdRows.length,
    skippedCount,
    orderIds: createdRows.map((item) => item.orderId),
  };
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

  for (const batch of chunk(parsedRows, UPLOAD_BATCH_SIZE)) {
    await processBulkUploadBatch({
      rows: batch,
      assigneeId,
      listContext,
    });
  }

  await finishBulkUpload();
}
