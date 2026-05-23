import { db } from "@/lib/db";
import {
  codExportOrderSelect,
  codExportQueueWhere,
  type CodExportOrderDbRow,
} from "@/lib/orders/export-queue";

export async function getCodExportQueueCount(): Promise<number> {
  return db.order.count({ where: codExportQueueWhere() });
}

export async function findCodExportQueueOrders(orderIds?: string[]): Promise<CodExportOrderDbRow[]> {
  return db.order.findMany({
    where: {
      ...codExportQueueWhere(),
      ...(orderIds?.length ? { id: { in: orderIds } } : {}),
    },
    select: codExportOrderSelect,
    orderBy: { createdAt: "asc" },
  });
}

export async function previewCodExportQueue(limit = 5) {
  const rows = await db.order.findMany({
    where: codExportQueueWhere(),
    select: {
      id: true,
      customerName: true,
      merchantOrderDisplayName: true,
      city: true,
      totalAmount: true,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  return rows;
}
