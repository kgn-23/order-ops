import type { Prisma } from "@/app/generated/prisma/client";
import { STOREFRONT_ORDER_SOURCE } from "@/lib/orders/source";
import { isCodExportAddressComplete } from "@/lib/orders/cod-export";

/** Storefront orders confirmed by callers and not yet exported to carrier COD file. */
export function codExportQueueWhere(): Prisma.OrderWhereInput {
  return {
    deletedAt: null,
    sourceSystem: STOREFRONT_ORDER_SOURCE,
    orderStatus: "CONFIRMED",
    exportedAt: null,
    customerName: { not: "" },
    customerPhone: { not: "" },
    addressLine1: { not: "" },
    city: { not: "" },
    state: { not: "" },
    postalCode: { not: "" },
  };
}

export const codExportOrderSelect = {
  id: true,
  customerName: true,
  customerPhone: true,
  addressLine1: true,
  addressLine2: true,
  addressLine3: true,
  city: true,
  state: true,
  postalCode: true,
  totalAmount: true,
  merchantOrderDisplayName: true,
  sourceOrderId: true,
  orderStatus: true,
  exportedAt: true,
  sourceSystem: true,
} satisfies Prisma.OrderSelect;

export type CodExportOrderDbRow = Prisma.OrderGetPayload<{ select: typeof codExportOrderSelect }>;

export function assertCodExportEligible(order: CodExportOrderDbRow): void {
  if (order.sourceSystem !== STOREFRONT_ORDER_SOURCE) {
    throw new Error("Only storefront orders can be exported.");
  }
  if (order.orderStatus !== "CONFIRMED") {
    throw new Error("Only confirmed orders can be exported.");
  }
  if (order.exportedAt) {
    throw new Error("Order was already exported.");
  }
  if (!isCodExportAddressComplete(order)) {
    throw new Error("Order is missing required shipping address fields.");
  }
}
