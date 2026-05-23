"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCodFile4Buffer, codExportFileName } from "@/lib/orders/cod-export";
import { assertCodExportEligible } from "@/lib/orders/export-queue";
import {
  findCodExportQueueOrders,
  getCodExportQueueCount,
  previewCodExportQueue,
} from "@/lib/orders/queries/cod-export";
import { logActivity, revalidateOrderListViews } from "@/lib/orders/actions/shared";
import { exportCodOrdersSchema } from "@/lib/validators/contracts";

export type CodExportPreview = {
  readyCount: number;
  preview: Awaited<ReturnType<typeof previewCodExportQueue>>;
};

export async function getCodExportPreview(): Promise<CodExportPreview> {
  await requireRole(["ADMIN", "MANAGER"]);
  const [readyCount, preview] = await Promise.all([
    getCodExportQueueCount(),
    previewCodExportQueue(5),
  ]);
  return { readyCount, preview };
}

export type CodExportResult = {
  fileName: string;
  fileBase64: string;
  orderCount: number;
  batchId: string;
  skippedCount: number;
};

export async function exportCodOrders(input: unknown): Promise<CodExportResult> {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  const payload = exportCodOrdersSchema.parse(input);

  const candidates = await findCodExportQueueOrders(payload.orderIds);
  if (candidates.length === 0) {
    throw new Error("No confirmed storefront orders are ready to export.");
  }

  const eligible = candidates.filter((order) => {
    try {
      assertCodExportEligible(order);
      return true;
    } catch {
      return false;
    }
  });

  if (eligible.length === 0) {
    throw new Error("Selected orders are not eligible for COD export.");
  }

  const fileName = codExportFileName();
  const buffer = buildCodFile4Buffer(eligible);
  const exportedAt = new Date();

  const batch = await db.$transaction(async (tx) => {
    const createdBatch = await tx.codExportBatch.create({
      data: {
        createdById: session.userId,
        format: "COD_FILE_4",
        orderCount: eligible.length,
        fileName,
      },
    });

    await tx.order.updateMany({
      where: { id: { in: eligible.map((o) => o.id) } },
      data: {
        exportedAt,
        codExportBatchId: createdBatch.id,
      },
    });

    return createdBatch;
  });

  await logActivity({
    actorUserId: session.userId,
    entityType: "CodExportBatch",
    entityId: batch.id,
    action: "COD_EXPORTED",
    details: {
      orderCount: eligible.length,
      fileName,
      orderIds: eligible.map((o) => o.id),
    },
  });

  revalidateOrderListViews();
  revalidatePath("/admin/dashboard");
  revalidatePath("/manager/dashboard");
  updateTag("orders-page");

  return {
    fileName,
    fileBase64: buffer.toString("base64"),
    orderCount: eligible.length,
    batchId: batch.id,
    skippedCount: candidates.length - eligible.length,
  };
}
